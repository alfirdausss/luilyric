/**
 * LuiLyric Live State Machine & Command Engine (Bagian 9, 12, 14)
 * - Memisahkan selectedCueId (Preview) dari liveCueId (Live Output)
 * - State machine: Ready -> Entering -> Holding -> Exiting -> Blank
 * - Menangani Next/Previous cepat tanpa antrean animasi menumpuk
 * - Deduplikasi command ID untuk mencegah double-trigger dari gesture/network
 * - Menolak expectedRevision usang dan mengembalikan state terbaru
 * - Mempertahankan liveSnapshot meskipun cue diedit/dihapus di editor sampai GO / Apply to Live
 */

import {
  ControlAck,
  ControlCommand,
  Cue,
  LiveCueSnapshot,
  LiveEngineState,
  ProjectFile,
  Song,
} from '../contracts';
import { resolveCueAnimation, resolveCueStyle } from './styleResolver';
import { calculateEffectiveInDuration } from '../renderer/alphaRenderer';

const MAX_RECENT_COMMAND_IDS = 64;

export class LiveEngine {
  private state: LiveEngineState;
  private recentCommandIds: string[] = [];
  private lastSyncedProject: ProjectFile | null = null;
  private lastSyncedCueId: string | null = null;

  constructor(
    project: ProjectFile,
    initialNowMs = 0,
    initialSongId?: string,
    initialCueId?: string
  ) {
    const songIdToUse = initialSongId || project.activeSongId;
    const targetSong =
      (songIdToUse ? project.songs.find((s) => s.id === songIdToUse) : null) ??
      project.songs[0];

    const cueIdToUse = initialCueId || project.selectedCueId;
    const targetCue =
      (cueIdToUse ? targetSong?.cues.find((c) => c.id === cueIdToUse) : null) ??
      targetSong?.cues[0] ??
      null;

    this.state = {
      revision: 1,
      activeSongId: targetSong?.id ?? '',
      selectedCueId: targetCue?.id ?? null,
      liveCueId: null,
      liveSnapshot: null,
      previousSnapshot: null,
      pendingTargetCueId: null,
      phase: 'Ready',
      phaseStartedAtMs: initialNowMs,
      blankedFromSnapshot: null,
      lastWarning: null,
      lastCommandId: null,
    };
  }

  public getState(): LiveEngineState {
    return { ...this.state };
  }

  public createSnapshot(
    project: ProjectFile,
    song: Song,
    cue: Cue
  ): LiveCueSnapshot {
    const index = song.cues.findIndex((c) => c.id === cue.id);
    return {
      cueId: cue.id,
      songId: song.id,
      index,
      text: cue.text,
      section: cue.section,
      isBlankCue: Boolean(cue.isBlankCue),
      resolvedStyle: resolveCueStyle(cue, song, project.presets),
      resolvedAnimation: resolveCueAnimation(cue, song, project.presets),
    };
  }

  /**
   * Dipanggil oleh loop waktu (monotonic clock) untuk memajukan transisi otomatis:
   * - Entering -> Holding setelah durasi IN selesai
   * - Exiting -> Entering (pada pendingTargetCueId) atau Blank setelah durasi OUT selesai
   */
  public tick(project: ProjectFile, nowMs: number): LiveEngineState {
    // Sinkronisasi interaktif realtime: hanya cek ulang jika referensi project atau liveCueId berubah
    if (this.state.liveCueId && this.state.liveSnapshot) {
      if (
        project !== this.lastSyncedProject ||
        this.state.liveCueId !== this.lastSyncedCueId
      ) {
        this.lastSyncedProject = project;
        this.lastSyncedCueId = this.state.liveCueId;
        const activeSong = this.getActiveSong(project);
        const liveCue = activeSong?.cues.find((c) => c.id === this.state.liveCueId);
        if (activeSong && liveCue) {
          const refreshed = this.createSnapshot(project, activeSong, liveCue);
          if (
            refreshed.text !== this.state.liveSnapshot.text ||
            JSON.stringify(refreshed.resolvedStyle) !==
              JSON.stringify(this.state.liveSnapshot.resolvedStyle) ||
            JSON.stringify(refreshed.resolvedAnimation) !==
              JSON.stringify(this.state.liveSnapshot.resolvedAnimation)
          ) {
            this.state = {
              ...this.state,
              liveSnapshot: refreshed,
              revision: this.state.revision + 1,
            };
          }
        }
      }
    } else {
      this.lastSyncedCueId = null;
    }

    const { phase, phaseStartedAtMs, liveSnapshot, pendingTargetCueId } = this.state;
    const elapsed = Math.max(0, nowMs - phaseStartedAtMs);

    if (phase === 'Entering' && liveSnapshot) {
      const inDuration =
        liveSnapshot.isBlankCue || liveSnapshot.resolvedAnimation.in.type === 'none'
          ? 0
          : calculateEffectiveInDuration(
              liveSnapshot.text,
              liveSnapshot.resolvedAnimation.in
            );

      if (elapsed >= inDuration) {
        this.state = {
          ...this.state,
          phase: 'Holding',
          phaseStartedAtMs: nowMs,
          previousSnapshot: null,
        };
      }
    } else if (phase === 'Exiting') {
      const outDuration =
        !liveSnapshot ||
        liveSnapshot.isBlankCue ||
        liveSnapshot.resolvedAnimation.out.type === 'cut'
          ? 0
          : liveSnapshot.resolvedAnimation.out.durationMs;

      if (elapsed >= outDuration) {
        if (pendingTargetCueId) {
          const song = this.getActiveSong(project);
          const targetCue = song?.cues.find((c) => c.id === pendingTargetCueId);
          if (song && targetCue) {
            const nextSnap = this.createSnapshot(project, song, targetCue);
            const shouldSkipIn =
              nextSnap.resolvedAnimation.in.inScope === 'from-blank';
            this.state = {
              ...this.state,
              liveCueId: targetCue.id,
              selectedCueId: targetCue.id,
              liveSnapshot: nextSnap,
              previousSnapshot: null,
              pendingTargetCueId: null,
              phase: nextSnap.isBlankCue
                ? 'Blank'
                : shouldSkipIn
                ? 'Holding'
                : 'Entering',
              phaseStartedAtMs: nowMs,
              revision: this.state.revision + 1,
            };
          } else {
            this.state = {
              ...this.state,
              pendingTargetCueId: null,
              phase: 'Blank',
              phaseStartedAtMs: nowMs,
            };
          }
        } else {
          // Exiting menuju Blank
          this.state = {
            ...this.state,
            liveCueId: null,
            liveSnapshot: null,
            previousSnapshot: null,
            phase: 'Blank',
            phaseStartedAtMs: nowMs,
            revision: this.state.revision + 1,
          };
        }
      }
    }

    return this.getState();
  }

  /**
   * Memproses satu command dari Desktop atau Remote HP secara atomik & berurutan.
   */
  public dispatch(
    project: ProjectFile,
    command: ControlCommand,
    nowMs: number
  ): { state: LiveEngineState; ack: ControlAck } {
    // 1. Deduplikasi command ID (Bagian 9 & 14)
    if (command.id && this.recentCommandIds.includes(command.id)) {
      return {
        state: this.getState(),
        ack: {
          type: 'ack',
          commandId: command.id,
          accepted: true,
          reason: 'Duplicate command ignored (idempotent ack)',
          revision: this.state.revision,
          liveCueId: this.state.liveCueId,
          phase: this.state.phase,
        },
      };
    }

    // 2. Validasi expectedRevision jika disertakan oleh klien remote
    if (
      typeof command.expectedRevision === 'number' &&
      command.expectedRevision !== this.state.revision
    ) {
      return {
        state: this.getState(),
        ack: {
          type: 'ack',
          commandId: command.id,
          accepted: false,
          reason: `Stale revision: expected ${command.expectedRevision}, current is ${this.state.revision}`,
          revision: this.state.revision,
          liveCueId: this.state.liveCueId,
          phase: this.state.phase,
        },
      };
    }

    this.recordCommandId(command.id);
    const song = this.getActiveSong(project);

    switch (command.action) {
      case 'SELECT_SONG': {
        const targetSong = project.songs.find((s) => s.id === command.payload?.songId);
        if (!targetSong) {
          return this.reject(command.id, 'Lagu tidak ditemukan');
        }
        // Bagian 12: Aktivasi lagu baru dimulai dalam keadaan Blank/Ready agar tidak menayangkan baris pertama tanpa sengaja
        this.state = {
          ...this.state,
          revision: this.state.revision + 1,
          activeSongId: targetSong.id,
          selectedCueId: targetSong.cues[0]?.id ?? null,
          liveCueId: null,
          liveSnapshot: null,
          previousSnapshot: null,
          pendingTargetCueId: null,
          phase: 'Ready',
          phaseStartedAtMs: nowMs,
          blankedFromSnapshot: null,
          lastWarning: null,
          lastCommandId: command.id,
        };
        break;
      }

      case 'SELECT_CUE': {
        if (!song) return this.reject(command.id, 'Tidak ada lagu aktif');
        const cue = song.cues.find((c) => c.id === command.payload?.cueId);
        if (!cue) return this.reject(command.id, 'Cue tidak ditemukan');
        // Bagian 5 & 6: Pemilihan cue dalam editor hanya mengubah preview, tidak mengubah live
        this.state = {
          ...this.state,
          selectedCueId: cue.id,
          lastWarning: null,
          lastCommandId: command.id,
        };
        break;
      }

      case 'GO_CUE': {
        if (!song || song.cues.length === 0) {
          return this.reject(command.id, 'Lagu belum memiliki cue');
        }
        const targetId =
          command.payload?.cueId ??
          this.state.selectedCueId ??
          song.cues[0].id;
        const targetCue = song.cues.find((c) => c.id === targetId);
        if (!targetCue) {
          return this.reject(command.id, 'Cue target tidak ditemukan');
        }
        this.transitionToCue(project, song, targetCue, nowMs, Boolean(command.payload?.immediate));
        this.state.lastCommandId = command.id;
        break;
      }

      case 'NEXT': {
        if (!song || song.cues.length === 0) {
          return this.reject(command.id, 'Lagu belum memiliki cue');
        }
        const anchorCueId =
          this.state.pendingTargetCueId ??
          this.state.liveCueId ??
          this.state.blankedFromSnapshot?.cueId ??
          this.state.selectedCueId;
        const currentIndex = song.cues.findIndex((c) => c.id === anchorCueId);

        if (currentIndex === -1) {
          // Jika belum ada cue live, mulai dari cue pertama
          this.transitionToCue(project, song, song.cues[0], nowMs, false);
        } else if (currentIndex >= song.cues.length - 1) {
          // Bagian 12: Next pada cue terakhir menjadi no-op dengan feedback, jangan wrap ke awal
          this.state = {
            ...this.state,
            lastWarning: 'Sudah berada di cue terakhir lagu ini (tidak otomatis berpindah lagu).',
            lastCommandId: command.id,
          };
          return {
            state: this.getState(),
            ack: {
              type: 'ack',
              commandId: command.id,
              accepted: true,
              reason: this.state.lastWarning ?? undefined,
              revision: this.state.revision,
              liveCueId: this.state.liveCueId,
              phase: this.state.phase,
            },
          };
        } else {
          const nextCue = song.cues[currentIndex + 1];
          this.transitionToCue(project, song, nextCue, nowMs, false);
        }
        this.state.lastCommandId = command.id;
        break;
      }

      case 'PREVIOUS': {
        if (!song || song.cues.length === 0) {
          return this.reject(command.id, 'Lagu belum memiliki cue');
        }
        const anchorCueId =
          this.state.pendingTargetCueId ??
          this.state.liveCueId ??
          this.state.blankedFromSnapshot?.cueId ??
          this.state.selectedCueId;
        const currentIndex = song.cues.findIndex((c) => c.id === anchorCueId);

        if (currentIndex <= 0) {
          // Bagian 12: Previous pada cue pertama menjadi no-op dengan feedback
          this.state = {
            ...this.state,
            lastWarning: 'Sudah berada di cue pertama lagu ini.',
            lastCommandId: command.id,
          };
          return {
            state: this.getState(),
            ack: {
              type: 'ack',
              commandId: command.id,
              accepted: true,
              reason: this.state.lastWarning ?? undefined,
              revision: this.state.revision,
              liveCueId: this.state.liveCueId,
              phase: this.state.phase,
            },
          };
        }
        const prevCue = song.cues[currentIndex - 1];
        this.transitionToCue(project, song, prevCue, nowMs, false);
        this.state.lastCommandId = command.id;
        break;
      }

      case 'REPLAY': {
        if (!this.state.liveSnapshot) {
          return this.reject(command.id, 'Tidak ada cue yang sedang tayang untuk di-replay');
        }
        // Replay mengulang animasi cue aktif tanpa mengubah indeks
        this.state = {
          ...this.state,
          revision: this.state.revision + 1,
          phase: this.state.liveSnapshot.isBlankCue ? 'Blank' : 'Entering',
          phaseStartedAtMs: nowMs,
          pendingTargetCueId: null,
          lastWarning: null,
          lastCommandId: command.id,
        };
        break;
      }

      case 'BLANK': {
        const immediate = command.payload?.immediate ?? false;
        const currentSnap = this.state.liveSnapshot;

        // Jika sudah Blank atau Ready, pastikan status bersih
        if (!currentSnap || this.state.phase === 'Blank' || this.state.phase === 'Ready') {
          this.state = {
            ...this.state,
            revision: this.state.revision + 1,
            phase: 'Blank',
            phaseStartedAtMs: nowMs,
            liveCueId: null,
            liveSnapshot: null,
            previousSnapshot: null,
            pendingTargetCueId: null,
            lastWarning: null,
            lastCommandId: command.id,
          };
          break;
        }

        // Jika sedang dalam fase Exiting dan tombol Blank ditekan lagi,
        // potong langsung seketika (panic hard cut)
        if (this.state.phase === 'Exiting') {
          this.state = {
            ...this.state,
            revision: this.state.revision + 1,
            blankedFromSnapshot: currentSnap,
            liveCueId: null,
            liveSnapshot: null,
            previousSnapshot: null,
            pendingTargetCueId: null,
            phase: 'Blank',
            phaseStartedAtMs: nowMs,
            lastWarning: null,
            lastCommandId: command.id,
          };
          break;
        }

        if (immediate) {
          // Hard cut langsung ke Blank
          this.state = {
            ...this.state,
            revision: this.state.revision + 1,
            blankedFromSnapshot: currentSnap,
            liveCueId: null,
            liveSnapshot: null,
            previousSnapshot: null,
            pendingTargetCueId: null,
            phase: 'Blank',
            phaseStartedAtMs: nowMs,
            lastWarning: null,
            lastCommandId: command.id,
          };
        } else {
          // Animasi OUT aktif sesuai cue aktif menuju Blank
          // Gunakan out animation cue (fade, slideDown, dropGravity, popScatter, dll.).
          // Jika out.type === 'cut' atau durasi <= 0, berikan out animation fade 200ms
          const effectiveOut =
            !currentSnap.resolvedAnimation.out ||
            currentSnap.resolvedAnimation.out.type === 'cut' ||
            (currentSnap.resolvedAnimation.out.durationMs || 0) <= 0
              ? {
                  type: 'fade' as const,
                  durationMs: 200,
                  easing: 'easeInOutCubic' as const,
                  distancePx: 24,
                }
              : currentSnap.resolvedAnimation.out;

          const animatedSnapshot: LiveCueSnapshot = {
            ...currentSnap,
            resolvedAnimation: {
              ...currentSnap.resolvedAnimation,
              out: effectiveOut,
            },
          };

          this.state = {
            ...this.state,
            revision: this.state.revision + 1,
            liveSnapshot: animatedSnapshot,
            blankedFromSnapshot: currentSnap,
            pendingTargetCueId: null,
            phase: 'Exiting',
            phaseStartedAtMs: nowMs,
            lastWarning: null,
            lastCommandId: command.id,
          };
        }
        break;
      }

      case 'RESTORE': {
        // Restore memulai kembali IN cue yang disembunyikan
        const restoreSnap = this.state.blankedFromSnapshot;
        if (!restoreSnap) {
          if (song && this.state.selectedCueId) {
            const cue = song.cues.find((c) => c.id === this.state.selectedCueId);
            if (cue) {
              this.transitionToCue(project, song, cue, nowMs, true);
              this.state.lastCommandId = command.id;
              break;
            }
          }
          return this.reject(command.id, 'Tidak ada cue tersimpan untuk di-restore');
        }
        // Perbarui snapshot jika cue masih ada di lagu aktif, atau gunakan snapshot lama
        const latestCue = song?.cues.find((c) => c.id === restoreSnap.cueId);
        const refreshedSnap =
          song && latestCue
            ? this.createSnapshot(project, song, latestCue)
            : restoreSnap;

        this.state = {
          ...this.state,
          revision: this.state.revision + 1,
          liveCueId: refreshedSnap.cueId,
          selectedCueId: refreshedSnap.cueId,
          liveSnapshot: refreshedSnap,
          previousSnapshot: null,
          pendingTargetCueId: null,
          phase: refreshedSnap.isBlankCue ? 'Blank' : 'Entering',
          phaseStartedAtMs: nowMs,
          lastWarning: null,
          lastCommandId: command.id,
        };
        break;
      }

      case 'APPLY_TO_LIVE': {
        // Bagian 6: Tombol Apply to Live eksplisit untuk menerapkan perubahan draft editor ke cue yang sedang tayang
        if (!song || !this.state.liveCueId) {
          return this.reject(command.id, 'Tidak ada cue live yang aktif');
        }
        const liveCue = song.cues.find((c) => c.id === this.state.liveCueId);
        if (!liveCue) {
          return this.reject(command.id, 'Cue live sudah dihapus dari daftar');
        }
        const updatedSnap = this.createSnapshot(project, song, liveCue);
        this.state = {
          ...this.state,
          revision: this.state.revision + 1,
          liveSnapshot: updatedSnap,
          lastWarning: null,
          lastCommandId: command.id,
        };
        break;
      }
    }

    return {
      state: this.getState(),
      ack: {
        type: 'ack',
        commandId: command.id,
        accepted: true,
        revision: this.state.revision,
        liveCueId: this.state.liveCueId,
        phase: this.state.phase,
      },
    };
  }

  private transitionToCue(
    project: ProjectFile,
    song: Song,
    targetCue: Cue,
    nowMs: number,
    forceImmediate: boolean
  ): void {
    const nextSnapshot = this.createSnapshot(project, song, targetCue);
    const currentSnap = this.state.liveSnapshot;
    const policy = song.transitionPolicy || 'strict-single';

    // Jika sedang Ready, Blank, tidak ada cue aktif, atau policy Cut / forceImmediate: langsung Entering
    const outDuration =
      currentSnap &&
      !currentSnap.isBlankCue &&
      currentSnap.resolvedAnimation.out.type !== 'cut'
        ? currentSnap.resolvedAnimation.out.durationMs
        : 0;

    const wasBlankOrInactive =
      !currentSnap ||
      this.state.phase === 'Ready' ||
      this.state.phase === 'Blank';

    const shouldSkipIn =
      !wasBlankOrInactive &&
      nextSnapshot.resolvedAnimation.in.inScope === 'from-blank';

    if (
      forceImmediate ||
      policy === 'cut' ||
      wasBlankOrInactive ||
      outDuration <= 0
    ) {
      this.state = {
        ...this.state,
        revision: this.state.revision + 1,
        selectedCueId: targetCue.id,
        liveCueId: targetCue.id,
        liveSnapshot: nextSnapshot,
        previousSnapshot: null,
        pendingTargetCueId: null,
        blankedFromSnapshot: nextSnapshot,
        phase: nextSnapshot.isBlankCue
          ? 'Blank'
          : shouldSkipIn
          ? 'Holding'
          : 'Entering',
        phaseStartedAtMs: nowMs,
        lastWarning: null,
      };
      return;
    }

    if (policy === 'crossfade') {
      // Crossfade menampilkan cue lama keluar bersamaan dengan cue baru masuk
      this.state = {
        ...this.state,
        revision: this.state.revision + 1,
        selectedCueId: targetCue.id,
        liveCueId: targetCue.id,
        previousSnapshot: currentSnap,
        liveSnapshot: nextSnapshot,
        pendingTargetCueId: null,
        blankedFromSnapshot: nextSnapshot,
        phase: nextSnapshot.isBlankCue
          ? 'Blank'
          : shouldSkipIn
          ? 'Holding'
          : 'Entering',
        phaseStartedAtMs: nowMs,
        lastWarning: null,
      };
      return;
    }

    // Mode default strict-single (Bagian 9):
    // Jika Next ditekan cepat saat sudah Exiting, langsung ganti target cue terbaru tanpa mengulang Exiting dari 0
    if (this.state.phase === 'Exiting') {
      this.state = {
        ...this.state,
        revision: this.state.revision + 1,
        selectedCueId: targetCue.id,
        pendingTargetCueId: targetCue.id,
        lastWarning: null,
      };
      return;
    }

    // Jika sedang Entering dan ditekan Next cepat, potong ke target baru agar responsif panggung
    if (this.state.phase === 'Entering') {
      this.state = {
        ...this.state,
        revision: this.state.revision + 1,
        selectedCueId: targetCue.id,
        liveCueId: targetCue.id,
        liveSnapshot: nextSnapshot,
        previousSnapshot: null,
        pendingTargetCueId: null,
        blankedFromSnapshot: nextSnapshot,
        phase: nextSnapshot.isBlankCue
          ? 'Blank'
          : shouldSkipIn
          ? 'Holding'
          : 'Entering',
        phaseStartedAtMs: nowMs,
        lastWarning: null,
      };
      return;
    }

    // Sedang Holding -> jalankan Exiting dulu, baru masuk ke targetCue
    this.state = {
      ...this.state,
      revision: this.state.revision + 1,
      selectedCueId: targetCue.id,
      pendingTargetCueId: targetCue.id,
      phase: 'Exiting',
      phaseStartedAtMs: nowMs,
      lastWarning: null,
    };
  }

  private getActiveSong(project: ProjectFile): Song | undefined {
    return (
      project.songs.find((s) => s.id === this.state.activeSongId) ??
      project.songs[0]
    );
  }

  private recordCommandId(id: string): void {
    if (!id) return;
    this.recentCommandIds.push(id);
    if (this.recentCommandIds.length > MAX_RECENT_COMMAND_IDS) {
      this.recentCommandIds.shift();
    }
  }

  private reject(
    commandId: string,
    reason: string
  ): { state: LiveEngineState; ack: ControlAck } {
    this.state = {
      ...this.state,
      lastWarning: reason,
    };
    return {
      state: this.getState(),
      ack: {
        type: 'ack',
        commandId,
        accepted: false,
        reason,
        revision: this.state.revision,
        liveCueId: this.state.liveCueId,
        phase: this.state.phase,
      },
    };
  }
}
