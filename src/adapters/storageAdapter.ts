/**
 * LuiLyric Storage Adapter & JSON Project Validator (Bagian 13, 16, 29)
 * - Validasi schemaVersion, enum, rentang koordinat 0..1, panjang teks, referensi preset
 * - Hapus field kredensial/token jika ada saat ekspor
 * - Autosave lokal (dibungkus try/catch agar aman di sandbox) + rotasi backup
 */

import {
  APP_VERSION,
  CURRENT_SCHEMA_VERSION,
  ProjectFile,
  StorageAdapter,
  StorageBackupEntry,
} from '../contracts';
import { BUILTIN_PRESETS, createDefaultProject } from '../core/defaults';

const STORAGE_KEY_ACTIVE = 'luilyric.stageA.activeProject.v1';
const STORAGE_KEY_BACKUPS = 'luilyric.stageA.backups.v1';
const MAX_BACKUPS = 8;

export function computeProjectChecksum(project: Omit<ProjectFile, 'checksum'>): string {
  const payload = JSON.stringify({
    name: project.name,
    output: project.output,
    songs: project.songs,
    presets: project.presets,
  });
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function sanitizeAndValidateProject(
  input: unknown
): { ok: true; project: ProjectFile; warnings: string[] } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Format file proyek bukan objek JSON yang valid.' };
  }

  const raw = input as Record<string, unknown>;
  const warnings: string[] = [];

  const schemaVersion =
    typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Versi schema proyek (${schemaVersion}) lebih baru dari versi aplikasi ini (${CURRENT_SCHEMA_VERSION}).`,
    };
  }

  if (!Array.isArray(raw.songs) || raw.songs.length === 0) {
    return { ok: false, error: 'Proyek harus memiliki minimal 1 lagu dalam daftar songs.' };
  }

  const rawOutput = (raw.output as Record<string, unknown>) || {};
  const width = clampInt(rawOutput.width, 256, 7680, 1920);
  const height = clampInt(rawOutput.height, 128, 4320, 1080);
  const fps = rawOutput.fps === 30 ? 30 : 60;

  const loadedPresets =
    Array.isArray(raw.presets) && raw.presets.length > 0
      ? (raw.presets as ProjectFile['presets'])
      : BUILTIN_PRESETS;

  const presetIds = new Set(loadedPresets.map((p) => p.id));
  const presets: ProjectFile['presets'] = [...loadedPresets];
  for (const bp of BUILTIN_PRESETS) {
    if (!presetIds.has(bp.id)) {
      presets.push(bp);
      presetIds.add(bp.id);
    }
  }

  const fallbackPresetId = presets[0]?.id || 'preset-clean';

  const validatedSongs: ProjectFile['songs'] = [];
  for (let sIdx = 0; sIdx < raw.songs.length; sIdx++) {
    const s = raw.songs[sIdx] as Record<string, unknown>;
    if (!s || typeof s !== 'object') continue;

    const songId =
      typeof s.id === 'string' && s.id.trim() ? s.id.trim() : `song-${sIdx + 1}`;
    const title =
      typeof s.title === 'string' && s.title.trim()
        ? s.title.trim()
        : `Lagu Tanpa Judul #${sIdx + 1}`;
    let defaultPresetId =
      typeof s.defaultPresetId === 'string' ? s.defaultPresetId : fallbackPresetId;

    if (!presetIds.has(defaultPresetId)) {
      warnings.push(
        `Lagu "${title}": preset "${defaultPresetId}" tidak ditemukan, dialihkan ke "${fallbackPresetId}".`
      );
      defaultPresetId = fallbackPresetId;
    }

    const rawCues = Array.isArray(s.cues) ? s.cues : [];
    const cues: ProjectFile['songs'][number]['cues'] = [];

    for (let cIdx = 0; cIdx < rawCues.length; cIdx++) {
      const c = rawCues[cIdx] as Record<string, unknown>;
      if (!c || typeof c !== 'object') continue;
      // Pastikan teks satu baris (hapus newline liar di dalam satu cue)
      const rawText = typeof c.text === 'string' ? c.text : '';
      const singleLineText = rawText.replace(/\r?\n/g, ' ').trim();

      let cuePresetId =
        typeof c.presetId === 'string' && presetIds.has(c.presetId)
          ? c.presetId
          : defaultPresetId;

      const overrides =
        c.styleOverrides && typeof c.styleOverrides === 'object'
          ? { ...(c.styleOverrides as Record<string, unknown>) }
          : {};

      // Validasi koordinat ternormalisasi 0..1 bila ada di override
      if (typeof overrides.x === 'number') {
        overrides.x = Math.max(0.02, Math.min(0.98, overrides.x));
      }
      if (typeof overrides.y === 'number') {
        overrides.y = Math.max(0.05, Math.min(0.95, overrides.y));
      }

      cues.push({
        id:
          typeof c.id === 'string' && c.id.trim()
            ? c.id.trim()
            : `${songId}-cue-${cIdx + 1}`,
        text: singleLineText,
        section: typeof c.section === 'string' ? c.section : undefined,
        notes: typeof c.notes === 'string' ? c.notes : undefined,
        isBlankCue: Boolean(c.isBlankCue),
        presetId: cuePresetId,
        styleOverrides: overrides as unknown as ProjectFile['presets'][number]['style'],
        animationOverrides:
          c.animationOverrides && typeof c.animationOverrides === 'object'
            ? (c.animationOverrides as ProjectFile['songs'][number]['cues'][number]['animationOverrides'])
            : undefined,
      });
    }

    validatedSongs.push({
      id: songId,
      title,
      artist: typeof s.artist === 'string' ? s.artist : undefined,
      bpm: typeof s.bpm === 'number' ? clampInt(s.bpm, 30, 300, 120) : undefined,
      defaultPresetId,
      transitionPolicy:
        s.transitionPolicy === 'cut' || s.transitionPolicy === 'crossfade'
          ? s.transitionPolicy
          : 'strict-single',
      cues,
    });
  }

  // Otomatis gabungkan dan sinkronkan lagu bawaan (Sanjaya & template) agar temanya selalu seragam
  const defaultSongs = createDefaultProject().songs;
  const defaultSongMap = new Map(defaultSongs.map((s) => [s.id, s]));

  // Pastikan lagu bawaan yang dimuat dari penyimpanan lokal tetap konsisten temanya
  for (const s of validatedSongs) {
    const def = defaultSongMap.get(s.id);
    if (def) {
      s.defaultPresetId = def.defaultPresetId;
      s.cues = s.cues.map((c) => ({
        ...c,
        presetId: def.defaultPresetId,
      }));
    }
  }

  const existingSongIds = new Set(validatedSongs.map((s) => s.id));
  for (const defSong of defaultSongs) {
    if (!existingSongIds.has(defSong.id)) {
      validatedSongs.push(defSong);
      existingSongIds.add(defSong.id);
    }
  }

  if (validatedSongs.length === 0) {
    return { ok: false, error: 'Tidak ada data lagu valid yang dapat dimuat.' };
  }

  const baseProject: Omit<ProjectFile, 'checksum'> = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    projectId:
      typeof raw.projectId === 'string' && raw.projectId.trim()
        ? raw.projectId.trim()
        : 'project-imported',
    name:
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim()
        : 'Proyek LuiLyric Impor',
    updatedAt: new Date().toISOString(),
    output: {
      senderName:
        typeof rawOutput.senderName === 'string' && rawOutput.senderName.trim()
          ? rawOutput.senderName.trim()
          : 'LuiLyric - Main',
      width,
      height,
      fps,
      alpha: true,
    },
    songs: validatedSongs,
    presets,
    activeSongId:
      typeof raw.activeSongId === 'string' &&
      validatedSongs.some((s) => s.id === raw.activeSongId)
        ? raw.activeSongId
        : undefined,
    selectedCueId:
      typeof raw.selectedCueId === 'string' ? raw.selectedCueId : undefined,
  };

  const project: ProjectFile = {
    ...baseProject,
    checksum: computeProjectChecksum(baseProject),
  };

  return { ok: true, project, warnings };
}

export class BrowserStorageAdapter implements StorageAdapter {
  private memoryActive: ProjectFile | null = null;
  private memoryBackups: StorageBackupEntry[] = [];

  public async loadActiveProject(): Promise<ProjectFile | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_ACTIVE);
        if (raw) {
          const parsed = JSON.parse(raw);
          const res = sanitizeAndValidateProject(parsed);
          if (res.ok) {
            this.memoryActive = res.project;
            return res.project;
          }
        }
      }
    } catch {
      // Fallback ke memoryActive bila localStorage diblokir iframe/sandbox
    }
    return this.memoryActive;
  }

  public async saveActiveProject(project: ProjectFile): Promise<void> {
    const clean: Omit<ProjectFile, 'checksum'> = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    const withChecksum: ProjectFile = {
      ...clean,
      checksum: computeProjectChecksum(clean),
    };
    this.memoryActive = withChecksum;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          STORAGE_KEY_ACTIVE,
          JSON.stringify(withChecksum)
        );
      }
    } catch {
      // Tetap tersimpan di memoryActive
    }
  }

  public async createBackup(
    project: ProjectFile,
    label?: string
  ): Promise<StorageBackupEntry> {
    const backups = await this.listBackups();
    const entry: StorageBackupEntry = {
      id: `backup-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      projectName: label ? `${project.name} (${label})` : project.name,
      songCount: project.songs.length,
      project: JSON.parse(this.exportProjectJson(project)),
    };

    const nextBackups = [entry, ...backups].slice(0, MAX_BACKUPS);
    this.memoryBackups = nextBackups;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          STORAGE_KEY_BACKUPS,
          JSON.stringify(nextBackups)
        );
      }
    } catch {
      // Tetap di memoryBackups
    }

    return entry;
  }

  public async listBackups(): Promise<StorageBackupEntry[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_BACKUPS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.memoryBackups = parsed;
            return parsed;
          }
        }
      }
    } catch {
      // Fallback
    }
    return this.memoryBackups;
  }

  public async restoreBackup(backupId: string): Promise<ProjectFile | null> {
    const backups = await this.listBackups();
    const found = backups.find((b) => b.id === backupId);
    if (!found) return null;
    await this.saveActiveProject(found.project);
    return found.project;
  }

  public exportProjectJson(project: ProjectFile): string {
    // Bagian 13: Jangan pernah menyimpan token pairing atau kredensial VPS dalam proyek ekspor
    const cleanBase: Omit<ProjectFile, 'checksum'> = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      projectId: project.projectId,
      name: project.name,
      updatedAt: new Date().toISOString(),
      output: {
        senderName: project.output.senderName || 'LuiLyric - Main',
        width: project.output.width,
        height: project.output.height,
        fps: project.output.fps,
        alpha: true,
      },
      songs: project.songs,
      presets: project.presets,
    };
    const exported: ProjectFile = {
      ...cleanBase,
      checksum: computeProjectChecksum(cleanBase),
    };
    return JSON.stringify(exported, null, 2);
  }

  public importProjectJson(
    rawJson: string
  ):
    | { ok: true; project: ProjectFile; warnings: string[] }
    | { ok: false; error: string } {
    try {
      const parsed = JSON.parse(rawJson);
      return sanitizeAndValidateProject(parsed);
    } catch (err) {
      return {
        ok: false,
        error: `Gagal membaca JSON: ${err instanceof Error ? err.message : 'Sintaks tidak valid'}`,
      };
    }
  }
}

function clampInt(
  val: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(min, Math.min(max, Math.round(val)));
}
