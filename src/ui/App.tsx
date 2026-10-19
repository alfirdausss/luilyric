import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  SkipForward,
  SkipBack,
  RotateCcw,
  EyeOff,
  Eye,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Scissors,
  Upload,
  Download,
  Save,
  Smartphone,
  Monitor,
  Columns,
  Sparkles,
  Type,
  Palette,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  FolderOpen,
  History,
  RefreshCw,
  ShieldAlert,
  Layers,
  Maximize2,
  Search,
  ChevronRight,
  Radio,
  WifiOff,
  Wifi,
  Activity,
  Edit3,
  Check,
  X,
  LayoutDashboard,
  Zap,
  Music,
  Crosshair,
  Crown,
  Gem,
  Flame,
  Leaf,
  Circle,
  ChevronsLeftRight,
  ZoomIn,
  Waves,
  Wind,
  Square,
  Lightbulb,
  HeartPulse,
  Gauge,
  Minimize2,
} from 'lucide-react';

import {
  AnimationHoldType,
  AnimationInType,
  AnimationOutType,
  CharBoxMode,
  CharStyleMode,
  ControlAction,
  ControlAck,
  Cue,
  CueAnimation,
  CueStyle,
  EasingType,
  FillMode,
  LiveCueSnapshot,
  LiveEngineState,
  ProjectFile,
  Song,
  StylePreset,
  TextAnchor,
  TextTransformMode,
  TransitionPolicy,
  StorageBackupEntry,
} from '../contracts';
import {
  AVAILABLE_STAGE_FONTS,
  createDefaultProject,
  SANJAYA_MUSIC_SETLIST,
} from '../core/defaults';
import {
  EmptyLineMode,
  evaluateSingleLineFit,
  generateStableCueId,
  parseLyricsToCues,
  splitCueIntoTwo,
} from '../core/lyricParser';
import {
  hasCueOverrides,
  resolveCueAnimation,
  resolveCueStyle,
} from '../core/styleResolver';
import { LiveEngine } from '../core/liveEngine';
import {
  PreviewBackdropMode,
  RenderDiagnostics,
  calculateEffectiveInDuration,
  drawPreviewBackdrop,
  renderLyricAlphaFrame,
} from '../renderer/alphaRenderer';
import { PreviewOutputAdapter } from '../adapters/outputAdapter';
import { NativeNdiOutputAdapter } from '../adapters/nativeNdiAdapter';
import {
  BrowserStorageAdapter,
  sanitizeAndValidateProject,
} from '../adapters/storageAdapter';

function loadInitialProjectFromStorage(): ProjectFile {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('luilyric.stageA.activeProject.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        const res = sanitizeAndValidateProject(parsed);
        if (res.ok) {
          return {
            ...res.project,
            output: {
              ...res.project.output,
              fps: res.project.output?.fps === 30 ? 30 : 60,
            },
          };
        }
      }
    }
  } catch {}
  return createDefaultProject();
}

type WorkspaceLayoutMode = 'desktop' | 'split' | 'mobile';
type InspectorTab = 'dashboard' | 'style' | 'animation' | 'output';
type PreviewTestPhase = 'auto' | 'Entering' | 'Holding' | 'Exiting';

export default function App() {
  const storageAdapter = useMemo(() => new BrowserStorageAdapter(), []);
  const outputAdapter = useMemo(
    () =>
      window.electronAPI?.isElectron
        ? new NativeNdiOutputAdapter()
        : new PreviewOutputAdapter(),
    []
  );

  const [project, setProject] = useState<ProjectFile>(() => loadInitialProjectFromStorage());
  const engineRef = useRef<LiveEngine | null>(null);
  if (!engineRef.current) {
    let initialSongId: string | undefined;
    let initialCueId: string | undefined;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedSongId = localStorage.getItem('luilyric.activeSongId');
        if (storedSongId && project.songs.some((s) => s.id === storedSongId)) {
          initialSongId = storedSongId;
        } else if (project.activeSongId && project.songs.some((s) => s.id === project.activeSongId)) {
          initialSongId = project.activeSongId;
        }
        const storedCueId = localStorage.getItem('luilyric.selectedCueId');
        if (storedCueId) {
          initialCueId = storedCueId;
        } else if (project.selectedCueId) {
          initialCueId = project.selectedCueId;
        }
      }
    } catch {}
    engineRef.current = new LiveEngine(project, performance.now(), initialSongId, initialCueId);
  }

  const [engineState, setEngineState] = useState<LiveEngineState>(() =>
    engineRef.current!.getState()
  );
  const [lastAck, setLastAck] = useState<ControlAck | null>(null);

  // UI & Workspace State
  const [showRemoteSidebar, setShowRemoteSidebar] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('luilyric.showRemoteSidebar');
        if (saved === 'false') return false;
        if (saved === 'true') return true;
      }
    } catch {}
    return true;
  });
  const [remoteCueSearch, setRemoteCueSearch] = useState<string>('');
  const [showRemoteQr, setShowRemoteQr] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('luilyric.showRemoteSidebar', String(showRemoteSidebar));
      }
    } catch {}
  }, [showRemoteSidebar]);

  const [inspectorTab, setInspectorTab] = useState<InspectorTab>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('luilyric.inspectorTab');
        if (
          saved === 'dashboard' ||
          saved === 'style' ||
          saved === 'animation' ||
          saved === 'output'
        ) {
          return saved;
        }
      }
    } catch {}
    return 'dashboard';
  });
  const [themeScope, setThemeScope] = useState<'song' | 'cue'>('song');

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('luilyric.inspectorTab', inspectorTab);
      }
    } catch {}
  }, [inspectorTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [previewBackdrop, setPreviewBackdrop] =
    useState<PreviewBackdropMode>('checkerboard');
  const [liveBackdrop, setLiveBackdrop] =
    useState<PreviewBackdropMode>('checkerboard');
  const [showSafeArea, setShowSafeArea] = useState<boolean>(true);
  const [blankImmediate, setBlankImmediate] = useState<boolean>(false);
  const [previewTestPhase, setPreviewTestPhase] =
    useState<PreviewTestPhase>('auto');
  const [previewResetKey, setPreviewResetKey] = useState<number>(0);
  const [monitorLayout, setMonitorLayout] = useState<'stacked' | 'side-by-side'>('stacked');
  const [liveSyncMode, setLiveSyncMode] = useState<boolean>(true);

  // Modal & Notification State
  const [showImportLyricsModal, setShowImportLyricsModal] = useState(false);
  const [importModalMode, setImportModalMode] = useState<
    'new-song' | 'append' | 'replace'
  >('new-song');
  const [newSongTitleInput, setNewSongTitleInput] = useState('');
  const [showJsonModal, setShowJsonModal] = useState<
    'none' | 'export' | 'import' | 'backups' | 'handoff'
  >('none');
  const [importLyricsText, setImportLyricsText] = useState('');
  const [importEmptyMode, setImportEmptyMode] =
    useState<EmptyLineMode>('blank-cue');
  const [importExtractHeaders, setImportExtractHeaders] = useState(true);
  const [importReplaceExisting, setImportReplaceExisting] = useState(false);
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [editingCueText, setEditingCueText] = useState<string>('');

  const [jsonModalText, setJsonModalText] = useState('');
  const [backups, setBackups] = useState<StorageBackupEntry[]>([]);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);
  const [customFonts, setCustomFonts] = useState<
    Array<{ label: string; value: string }>
  >([]);

  // NDI Native & Remote Server State (Tahap B: LL-B01 & LL-B02)
  const [ndiActive, setNdiActive] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('luilyric.ndiActive') === 'true';
      }
    } catch {}
    return false;
  });
  const [ndiStatusText, setNdiStatusText] = useState<string>(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage &&
        localStorage.getItem('luilyric.ndiActive') === 'true'
      ) {
        return 'NDI: Menghubungkan kembali...';
      }
    } catch {}
    return window.electronAPI?.isElectron
      ? 'NDI: Standby (Klik untuk Aktifkan)'
      : 'NDI: Unavailable in web preview';
  });
  const [pairingInfo, setPairingInfo] = useState<{
    ip: string;
    port: number;
    url: string;
    qrDataUrl: string;
    availableIps?: { ip: string; name: string }[];
  } | null>(null);

  // Simulasi Remote HP State (Bagian 7, 14, 19, 29)
  const [simulatedRemoteConnected, setSimulatedRemoteConnected] =
    useState<boolean>(true);

  // Canvas & Diagnostics Refs
  const previewBackdropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewAlphaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveBackdropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveAlphaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewPhaseStartRef = useRef<number>(performance.now());
  const lastNdiFrameTimeRef = useRef<number>(0);
  const isNdiFrameSendingRef = useRef<boolean>(false);

  const [previewDiag, setPreviewDiag] = useState<RenderDiagnostics | null>(null);
  const fpsElRef = useRef<HTMLSpanElement | null>(null);
  const ramElRef = useRef<HTMLSpanElement | null>(null);
  const vramElRef = useRef<HTMLSpanElement | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>(
    'saved'
  );

  const showToast = useCallback(
    (
      text: string,
      type: 'info' | 'success' | 'warning' | 'error' = 'info'
    ) => {
      setToastMessage({ text, type });
    },
    []
  );

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Load initial project from BrowserStorageAdapter
  useEffect(() => {
    let mounted = true;
    storageAdapter.loadActiveProject().then((loaded) => {
      if (mounted && loaded) {
        // Normalisasi preset & posisi lirik ke tengah (y: 0.5) dan rasio batas aman
        const normalizedPresets = loaded.presets.map((preset) => {
          const s = { ...preset.style };
          if (s.y === 0.82 || s.y === 0.8) s.y = 0.5;
          if (!s.maxWidthRatio || s.maxWidthRatio === 0.88) s.maxWidthRatio = 0.72;
          if (!s.lineHeight || s.lineHeight <= 1.25) s.lineHeight = 1.38;
          return { ...preset, style: s };
        });

        // Seragamkan tema cue per lagu agar tidak belang-belang & posisikan di tengah
        const sanjayaMap = new Map(SANJAYA_MUSIC_SETLIST.map((s) => [s.id, s]));
        const normalizedSongs = loaded.songs.map((song) => {
          const freshSanjaya = sanjayaMap.get(song.id);
          const targetPresetId = freshSanjaya
            ? freshSanjaya.defaultPresetId
            : (song.defaultPresetId || 'preset-clean');
          return {
            ...song,
            defaultPresetId: targetPresetId,
            cues: song.cues.map((c) => {
              const overrides = { ...(c.styleOverrides || {}) };
              if (overrides.y === 0.82 || overrides.y === 0.8) overrides.y = 0.5;
              if (overrides.maxWidthRatio === 0.88) overrides.maxWidthRatio = 0.72;
              return {
                ...c,
                presetId: targetPresetId,
                styleOverrides: overrides,
                ...(freshSanjaya ? { animationOverrides: undefined } : {}),
              };
            }),
          };
        });
        const normalizedProject = { ...loaded, presets: normalizedPresets, songs: normalizedSongs };
        setProject(normalizedProject);
        let savedSongId: string | undefined;
        let savedCueId: string | undefined;
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const storedSongId = localStorage.getItem('luilyric.activeSongId');
            if (storedSongId && loaded.songs.some((s) => s.id === storedSongId)) {
              savedSongId = storedSongId;
            } else if (loaded.activeSongId && loaded.songs.some((s) => s.id === loaded.activeSongId)) {
              savedSongId = loaded.activeSongId;
            }
            savedCueId =
              localStorage.getItem('luilyric.selectedCueId') ||
              loaded.selectedCueId ||
              undefined;
          }
        } catch {}
        engineRef.current = new LiveEngine(
          normalizedProject,
          performance.now(),
          savedSongId,
          savedCueId
        );
        setEngineState(engineRef.current.getState());
      }
    });
    storageAdapter.listBackups().then((list) => {
      if (mounted) setBackups(list);
    });
    return () => {
      mounted = false;
    };
  }, [storageAdapter]);

  // Simpan activeSongId & selectedCueId saat berganti agar tidak reset saat refresh
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (engineState.activeSongId && project.songs.some((s) => s.id === engineState.activeSongId)) {
        try {
          localStorage.setItem('luilyric.activeSongId', engineState.activeSongId);
        } catch {}
      }
      if (engineState.selectedCueId) {
        try {
          localStorage.setItem('luilyric.selectedCueId', engineState.selectedCueId);
        } catch {}
      }
    }
  }, [engineState.activeSongId, engineState.selectedCueId, project.songs]);

  // Debounced Autosave (Bagian 16: Autosave tidak mengubah liveSnapshot)
  useEffect(() => {
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      storageAdapter
        .saveActiveProject({
          ...project,
          activeSongId: engineState.activeSongId,
          selectedCueId: engineState.selectedCueId || undefined,
        })
        .then(() => {
          setSaveStatus('saved');
        });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [project, storageAdapter, engineState.activeSongId, engineState.selectedCueId]);

  const activeSong: Song = useMemo(() => {
    return (
      project.songs.find((s) => s.id === engineState.activeSongId) ??
      project.songs[0]
    );
  }, [project.songs, engineState.activeSongId]);

  const filteredSongs: Song[] = useMemo(() => {
    const q = songSearchQuery.trim().toLowerCase();
    if (!q) return project.songs;
    return project.songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist && s.artist.toLowerCase().includes(q)) ||
        s.cues.some((c) => c.text.toLowerCase().includes(q))
    );
  }, [project.songs, songSearchQuery]);

  const selectedCue: Cue | null = useMemo(() => {
    if (!activeSong) return null;
    return (
      activeSong.cues.find((c) => c.id === engineState.selectedCueId) ??
      activeSong.cues[0] ??
      null
    );
  }, [activeSong, engineState.selectedCueId]);

  const selectedPreviewSnapshot: LiveCueSnapshot | null = useMemo(() => {
    if (!activeSong || !selectedCue) return null;
    const idx = activeSong.cues.findIndex((c) => c.id === selectedCue.id);
    return {
      cueId: selectedCue.id,
      songId: activeSong.id,
      index: idx,
      text: selectedCue.text,
      section: selectedCue.section,
      isBlankCue: Boolean(selectedCue.isBlankCue),
      resolvedStyle: resolveCueStyle(selectedCue, activeSong, project.presets),
      resolvedAnimation: resolveCueAnimation(
        selectedCue,
        activeSong,
        project.presets
      ),
    };
  }, [activeSong, selectedCue, project.presets]);

  // Cek apakah cue yang sedang Live diedit di draft tetapi belum di-Apply to Live
  const isLiveCueOutOfSync = useMemo(() => {
    if (!engineState.liveCueId || !engineState.liveSnapshot || !activeSong) {
      return false;
    }
    const currentDraftCue = activeSong.cues.find(
      (c) => c.id === engineState.liveCueId
    );
    if (!currentDraftCue) return true;
    const draftStyle = resolveCueStyle(
      currentDraftCue,
      activeSong,
      project.presets
    );
    const draftAnim = resolveCueAnimation(
      currentDraftCue,
      activeSong,
      project.presets
    );
    return (
      currentDraftCue.text !== engineState.liveSnapshot.text ||
      JSON.stringify(draftStyle) !==
        JSON.stringify(engineState.liveSnapshot.resolvedStyle) ||
      JSON.stringify(draftAnim) !==
        JSON.stringify(engineState.liveSnapshot.resolvedAnimation)
    );
  }, [engineState.liveCueId, engineState.liveSnapshot, activeSong, project.presets]);

  // Dispatch command ke Core Engine (Bagian 12 & 14)
  const sendCommand = useCallback(
    (
      action: ControlAction,
      payload?: { cueId?: string; songId?: string; immediate?: boolean },
      source: 'desktop' | 'mobile-sim' = 'desktop'
    ) => {
      if (source === 'mobile-sim' && !simulatedRemoteConnected) {
        showToast(
          'Kontrol HP sedang terputus (simulasi Disconnected). Output laptop tetap berjalan.',
          'warning'
        );
        return;
      }
      if (!engineRef.current) return;
      const now = performance.now();
      const cmdId = `cmd-${source}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      let { state: nextState, ack } = engineRef.current.dispatch(
        project,
        {
          type: 'command',
          id: cmdId,
          sessionId:
            source === 'mobile-sim' ? 'sim-mobile-session' : 'desktop-local',
          expectedRevision: engineRef.current.getState().revision,
          action,
          payload,
        },
        now
      );
      setEngineState(nextState);
      setLastAck(ack);
      if (action === 'SELECT_CUE') {
        previewPhaseStartRef.current = now;
        setPreviewTestPhase('auto');
        if (liveSyncMode && payload?.cueId) {
          const goRes = engineRef.current.dispatch(
            project,
            {
              type: 'command',
              id: `cmd-sync-${now}`,
              sessionId: 'desktop-local',
              action: 'GO_CUE',
              payload: { cueId: payload.cueId, immediate: false },
            },
            now
          );
          nextState = goRes.state;
          setEngineState(nextState);
        }
      }
      if (!ack.accepted && ack.reason) {
        showToast(ack.reason, 'warning');
      } else if (nextState.lastWarning && (action === 'NEXT' || action === 'PREVIOUS')) {
        showToast(nextState.lastWarning, 'info');
      }

      // Broadcast state terbaru ke remote HP via WebSocket / Vite Server (Tahap B: LL-B02)
      const targetActiveSong =
        project.songs.find(
          (s) => s.id === (nextState.activeSongId || activeSong?.id)
        ) || activeSong;
      const currentCueId =
        nextState.liveCueId ||
        nextState.blankedFromSnapshot?.cueId ||
        null;
      const actTxt =
        nextState.liveSnapshot?.text ||
        (nextState.blankedFromSnapshot?.text
          ? `[TERSEMBUNYI] ${nextState.blankedFromSnapshot.text}`
          : '');
      const songCues = targetActiveSong?.cues || [];
      const liveIdx = songCues.findIndex((c) => c.id === currentCueId);
      const nxtTxt =
        liveIdx >= 0 && liveIdx + 1 < songCues.length
          ? songCues[liveIdx + 1].text
          : '';
      const payloadCues = songCues.map((c, i) => ({
        id: c.id,
        text: c.text,
        section: c.section || 'Verse',
        index: i + 1,
        isBlankCue: c.isBlankCue,
      }));
      const songsListPayload = project.songs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        cueCount: s.cues.length,
      }));

      if (window.electronAPI?.broadcastLiveState) {
        window.electronAPI.broadcastLiveState(
          nextState,
          actTxt,
          nxtTxt,
          payloadCues,
          targetActiveSong?.title,
          songsListPayload,
          targetActiveSong?.id
        );
      } else {
        fetch('/__luilyric/broadcast-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: nextState,
            activeText: actTxt,
            nextText: nxtTxt,
            cues: payloadCues,
            songTitle: targetActiveSong?.title,
            songsList: songsListPayload,
            activeSongId: targetActiveSong?.id,
          }),
        }).catch(() => {});
      }
    },
    [project, simulatedRemoteConnected, showToast, activeSong]
  );

  const sendCommandRef = useRef(sendCommand);
  sendCommandRef.current = sendCommand;

  const fetchPairingInfo = useCallback(async (targetIp?: string) => {
    if (window.electronAPI?.getPairingInfo) {
      const info =
        targetIp && window.electronAPI.selectRemoteIp
          ? await window.electronAPI.selectRemoteIp(targetIp)
          : await window.electronAPI.getPairingInfo(targetIp);
      if (info) {
        setPairingInfo(info);
        return info;
      }
    }
    try {
      const query = targetIp ? `?ip=${encodeURIComponent(targetIp)}` : '';
      const res = await fetch(`/__luilyric/pairing-info${query}`);
      if (res.ok) {
        const info = await res.json();
        if (info && info.ip) {
          setPairingInfo(info);
          return info;
        }
      }
    } catch {
      // Abaikan jika endpoint dev tidak tersedia
    }
    return null;
  }, []);

  // Sync state & daftar lirik lagu ke Remote HP saat lagu aktif berubah
  useEffect(() => {
    if (!activeSong) return;
    const currentCueId =
      engineState.liveCueId ||
      engineState.blankedFromSnapshot?.cueId ||
      null;
    const actTxt =
      engineState.liveSnapshot?.text ||
      (engineState.blankedFromSnapshot?.text
        ? `[TERSEMBUNYI] ${engineState.blankedFromSnapshot.text}`
        : '');
    const songCues = activeSong.cues || [];
    const liveIdx = songCues.findIndex((c) => c.id === currentCueId);
    const nxtTxt =
      liveIdx >= 0 && liveIdx + 1 < songCues.length
        ? songCues[liveIdx + 1].text
        : '';
    const payloadCues = songCues.map((c, i) => ({
      id: c.id,
      text: c.text,
      section: c.section || 'Verse',
      index: i + 1,
      isBlankCue: c.isBlankCue,
    }));
    const songsListPayload = project.songs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      cueCount: s.cues.length,
    }));

    if (window.electronAPI?.broadcastLiveState) {
      window.electronAPI.broadcastLiveState(
        engineState,
        actTxt,
        nxtTxt,
        payloadCues,
        activeSong.title,
        songsListPayload,
        activeSong.id
      );
    } else {
      fetch('/__luilyric/broadcast-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: engineState,
          activeText: actTxt,
          nextText: nxtTxt,
          cues: payloadCues,
          songTitle: activeSong.title,
          songsList: songsListPayload,
          activeSongId: activeSong.id,
        }),
      }).catch(() => {});
    }
  }, [
    activeSong?.id,
    activeSong?.cues,
    engineState.phase,
    engineState.liveCueId,
    engineState.blankedFromSnapshot,
    project.songs,
  ]);

  // Toggle Output NDI (Tahap B: LL-B01)
  const handleToggleNdi = useCallback(async () => {
    if (!window.electronAPI?.isElectron) {
      showToast(
        'NDI hanya tersedia pada Desktop Host Windows (Jalankan via npm run electron:start)',
        'warning'
      );
      return;
    }

    if (ndiActive) {
      await outputAdapter.stop();
      setNdiActive(false);
      try {
        localStorage.setItem('luilyric.ndiActive', 'false');
      } catch {}
      setNdiStatusText('NDI: Standby');
      showToast('NDI Sender dimatikan', 'info');
    } else {
      await outputAdapter.start(project.output);
      const isRunning = outputAdapter.getStatus() === 'running';
      setNdiActive(isRunning);
      try {
        localStorage.setItem('luilyric.ndiActive', isRunning ? 'true' : 'false');
      } catch {}
      setNdiStatusText(outputAdapter.getStatusMessage());
      if (isRunning) {
        showToast(
          `NDI Live Aktif: '${project.output.senderName}' sekarang tampil di Resolume Arena Sources!`,
          'success'
        );
      } else {
        showToast(outputAdapter.getStatusMessage(), 'warning');
      }
    }
  }, [ndiActive, outputAdapter, project.output, showToast]);

  const hasAutoRestoredNdiRef = useRef<boolean>(false);
  const projectOutputRef = useRef(project.output);
  projectOutputRef.current = project.output;

  // Auto-restore NDI status upon window refresh / reload (LL-B01 fix)
  useEffect(() => {
    if (!window.electronAPI?.isElectron) {
      if (ndiActive) {
        setNdiActive(false);
        setNdiStatusText('NDI: Standby');
      }
      return;
    }

    if (hasAutoRestoredNdiRef.current) return;
    hasAutoRestoredNdiRef.current = true;

    let isMounted = true;
    const restoreNdi = async () => {
      try {
        let savedNdiActive = false;
        try {
          savedNdiActive = localStorage.getItem('luilyric.ndiActive') === 'true';
        } catch {}

        // Query status background NDI sender di Electron
        const statusRes = window.electronAPI?.getNdiStatus
          ? await window.electronAPI.getNdiStatus()
          : null;

        if (statusRes?.isRunning || savedNdiActive) {
          await outputAdapter.start(projectOutputRef.current);
          if (isMounted) {
            const isRunning = outputAdapter.getStatus() === 'running';
            setNdiActive(isRunning);
            setNdiStatusText(outputAdapter.getStatusMessage());
            try {
              localStorage.setItem('luilyric.ndiActive', isRunning ? 'true' : 'false');
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[NDI] Gagal auto-restore NDI setelah refresh:', err);
      }
    };

    restoreNdi();

    return () => {
      isMounted = false;
    };
  }, [outputAdapter]);

  // Listen untuk command dari HP & ambil info pairing QR (Tahap B: LL-B02)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let pollTimer: number | undefined;

    if (window.electronAPI?.onRemoteCommand) {
      const res = window.electronAPI.onRemoteCommand((cmd: any) => {
        if (cmd && cmd.action) {
          sendCommandRef.current(cmd.action, cmd.payload, 'desktop');
        }
      });
      if (typeof res === 'function') {
        unsubscribe = res;
      }
    } else {
      pollTimer = window.setInterval(async () => {
        try {
          const res = await fetch('/__luilyric/poll-commands');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.commands)) {
              for (const cmd of data.commands) {
                if (cmd && cmd.action) {
                  sendCommandRef.current(cmd.action, cmd.payload, 'desktop');
                }
              }
            }
          }
        } catch {}
      }, 350);
    }

    fetchPairingInfo();

    return () => {
      if (unsubscribe) unsubscribe();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [fetchPairingInfo]);

  // Reset animasi preview ketika cue atau konfigurasi animasi berubah
  useEffect(() => {
    previewPhaseStartRef.current = performance.now();
  }, [
    selectedCue?.id,
    selectedCue?.presetId,
    selectedCue?.animationOverrides,
    previewTestPhase,
    previewResetKey,
  ]);

  // References to keep renderLoop 100% decoupled from React re-render cycles (Locks at 60 FPS)
  const projectRef = useRef(project);
  projectRef.current = project;
  const selectedPreviewSnapshotRef = useRef(selectedPreviewSnapshot);
  selectedPreviewSnapshotRef.current = selectedPreviewSnapshot;
  const previewBackdropRef = useRef(previewBackdrop);
  previewBackdropRef.current = previewBackdrop;
  const liveBackdropRef = useRef(liveBackdrop);
  liveBackdropRef.current = liveBackdrop;
  const showSafeAreaRef = useRef(showSafeArea);
  showSafeAreaRef.current = showSafeArea;
  const previewTestPhaseRef = useRef(previewTestPhase);
  previewTestPhaseRef.current = previewTestPhase;
  const ndiActiveRef = useRef(ndiActive);
  ndiActiveRef.current = ndiActive;
  const outputAdapterRef = useRef(outputAdapter);
  outputAdapterRef.current = outputAdapter;

  // Loop Render Real-Time (Monotonic Clock requestAnimationFrame) untuk Preview & Live
  useEffect(() => {
    let rafId = 0;
    let frameCount = 0;
    let lastFpsCheck = performance.now();
    let lastTickTime = performance.now();
    let lastDiagUpdate = 0;

    const renderLoop = (now: number) => {
      lastTickTime = now;
      frameCount++;
      if (now - lastFpsCheck >= 1000) {
        const fpsVal = Math.min(60, Math.round((frameCount * 1000) / (now - lastFpsCheck)));
        frameCount = 0;
        lastFpsCheck = now;

        const fpsEl = fpsElRef.current;
        if (fpsEl) {
          fpsEl.textContent = String(fpsVal);
          fpsEl.style.color = fpsVal >= 50 ? '#10b981' : fpsVal >= 30 ? '#fbbf24' : '#f87171';
        }

        const curProject = projectRef.current;
        const curPreviewSnap = selectedPreviewSnapshotRef.current;
        const curNdiActive = ndiActiveRef.current;

        const perfMem = (performance as any).memory;
        const ramVal =
          perfMem && typeof perfMem.usedJSHeapSize === 'number'
            ? Math.max(24, Math.round(perfMem.usedJSHeapSize / (1024 * 1024)))
            : 44 + Math.round(curProject.songs.length * 0.4);
        if (ramElRef.current) ramElRef.current.textContent = `${ramVal}MB`;

        const w = curProject.output.width || 1920;
        const h = curProject.output.height || 1080;
        const singleFrameMb = (w * h * 4) / (1024 * 1024);
        const activeLayers = 4 + (curNdiActive ? 2 : 0);
        const fxOverheadMb =
          ((curPreviewSnap?.resolvedStyle.glowRadius ?? 0) > 0
            ? singleFrameMb * 0.75
            : 0) +
          ((curPreviewSnap?.resolvedStyle.extrudeDepth ?? 0) > 0 ? 4 : 0) +
          6;
        if (vramElRef.current) {
          vramElRef.current.textContent = `${Math.round(singleFrameMb * activeLayers + fxOverheadMb)}MB`;
        }
      }

      if (engineRef.current) {
        const curProject = projectRef.current;
        const curPreviewSnap = selectedPreviewSnapshotRef.current;
        const curPreviewPhase = previewTestPhaseRef.current;
        const curShowSafeArea = showSafeAreaRef.current;
        const curPreviewBackdrop = previewBackdropRef.current;
        const curLiveBackdrop = liveBackdropRef.current;
        const curOutputAdapter = outputAdapterRef.current;

        const prevPhase = engineRef.current.getState().phase;
        const prevCueId = engineRef.current.getState().liveCueId;
        const prevRev = engineRef.current.getState().revision;
        const tickedState = engineRef.current.tick(curProject, now);
        if (
          tickedState.phase !== prevPhase ||
          tickedState.liveCueId !== prevCueId ||
          tickedState.revision !== prevRev
        ) {
          setEngineState(tickedState);
        }

        // 1. Render Preview Canvas
        const pBgCanvas = previewBackdropCanvasRef.current;
        const pAlphaCanvas = previewAlphaCanvasRef.current;
        if (pBgCanvas && pAlphaCanvas) {
          const bgCtx = pBgCanvas.getContext('2d');
          const alphaCtx = pAlphaCanvas.getContext('2d');
          if (bgCtx && alphaCtx) {
            drawPreviewBackdrop(
              bgCtx,
              pBgCanvas.width,
              pBgCanvas.height,
              curPreviewBackdrop
            );

            const pElapsed = Math.max(0, now - previewPhaseStartRef.current);
            let effectivePreviewPhase: 'Entering' | 'Holding' | 'Exiting' =
              'Holding';
            let phaseElapsed = pElapsed;

            if (curPreviewPhase !== 'auto') {
              effectivePreviewPhase = curPreviewPhase;
            } else if (curPreviewSnap) {
              const inDur = calculateEffectiveInDuration(
                curPreviewSnap.text,
                curPreviewSnap.resolvedAnimation.in
              );
              if (pElapsed < inDur) {
                effectivePreviewPhase = 'Entering';
                phaseElapsed = pElapsed;
              } else {
                effectivePreviewPhase = 'Holding';
                phaseElapsed = pElapsed - inDur;
              }
            }

            const diag = renderLyricAlphaFrame(alphaCtx, {
              width: pAlphaCanvas.width,
              height: pAlphaCanvas.height,
              phase: curPreviewSnap?.isBlankCue
                ? 'Blank'
                : effectivePreviewPhase,
              elapsedMs: phaseElapsed,
              snapshot: curPreviewSnap,
              showSafeArea: curShowSafeArea,
            });

            if (now - lastDiagUpdate > 250) {
              lastDiagUpdate = now;
              setPreviewDiag((prev) =>
                prev &&
                prev.actualFontSizePx === diag.actualFontSizePx &&
                prev.wasAutoShrunk === diag.wasAutoShrunk &&
                prev.isOverflowingMinSize === diag.isOverflowingMinSize
                  ? prev
                  : diag
              );
            }
          }
        }

        // 2. Render Live Alpha Output Canvas (Murni tanpa Safe Area / tanpa UI)
        const lBgCanvas = liveBackdropCanvasRef.current;
        const lAlphaCanvas = liveAlphaCanvasRef.current;
        if (lBgCanvas && lAlphaCanvas) {
          const lBgCtx = lBgCanvas.getContext('2d');
          const lAlphaCtx = lAlphaCanvas.getContext('2d');
          if (lBgCtx && lAlphaCtx) {
            drawPreviewBackdrop(
              lBgCtx,
              lBgCanvas.width,
              lBgCanvas.height,
              curLiveBackdrop
            );
            const liveElapsed = Math.max(
              0,
              now - tickedState.phaseStartedAtMs
            );
            renderLyricAlphaFrame(lAlphaCtx, {
              width: lAlphaCanvas.width,
              height: lAlphaCanvas.height,
              phase: tickedState.phase,
              elapsedMs: liveElapsed,
              snapshot: tickedState.liveSnapshot,
              previousSnapshot: tickedState.previousSnapshot,
              showSafeArea: false, // Wajib false pada output live
            });

            // Tahap B (LL-B01): Stream frame live alpha ke native NDI sender (Throttled & Backpressure Guarded)
            if (
              curOutputAdapter instanceof NativeNdiOutputAdapter &&
              curOutputAdapter.getStatus() === 'running'
            ) {
              const targetFps = Math.max(15, Math.min(60, curProject.output.fps || 30));
              const frameIntervalMs = 1000 / targetFps;
              if (
                !isNdiFrameSendingRef.current &&
                now - lastNdiFrameTimeRef.current >= frameIntervalMs
              ) {
                lastNdiFrameTimeRef.current = now;
                isNdiFrameSendingRef.current = true;
                const frameData = lAlphaCtx.getImageData(
                  0,
                  0,
                  lAlphaCanvas.width,
                  lAlphaCanvas.height
                );
                const sendResult = curOutputAdapter.sendFrame(
                  frameData.data.buffer,
                  lAlphaCanvas.width,
                  lAlphaCanvas.height,
                  targetFps
                );
                if (sendResult && typeof (sendResult as Promise<any>).then === 'function') {
                  (sendResult as Promise<any>).finally(() => {
                    isNdiFrameSendingRef.current = false;
                  });
                } else {
                  isNdiFrameSendingRef.current = false;
                }
              }
            }
          }
        }
      }

      rafId = window.requestAnimationFrame(renderLoop);
    };

    rafId = window.requestAnimationFrame(renderLoop);

    // Heartbeat Fallback (Anti-Occlusion Guard):
    // Jika window tertutup 100% di belakang Resolume Arena Fullscreen dan requestAnimationFrame
    // di-throttle oleh Chromium/Windows DWM, interval ini menjaga render loop & stream NDI tetap 60 FPS mulus.
    const heartbeatInterval = setInterval(() => {
      const currentTime = performance.now();
      if (currentTime - lastTickTime >= 28) {
        renderLoop(currentTime);
      }
    }, 16);

    return () => {
      window.cancelAnimationFrame(rafId);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Shortcut Keyboard Desktop (Bagian 6: Nonaktif saat fokus di input/textarea/select)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        storageAdapter.saveActiveProject(project).then(() => {
          setSaveStatus('saved');
          showToast('Proyek berhasil disimpan (Ctrl+S).', 'success');
        });
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        sendCommand('NEXT');
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        sendCommand('PREVIOUS');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        sendCommand('GO_CUE', { cueId: selectedCue?.id });
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        sendCommand('REPLAY');
      } else if (e.key.toLowerCase() === 'b' && e.shiftKey) {
        e.preventDefault();
        sendCommand('RESTORE');
      } else if (e.key.toLowerCase() === 'b' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        sendCommand('BLANK', { immediate: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, selectedCue?.id, blankImmediate, sendCommand, storageAdapter, showToast]);

  // Helper mutasi lagu & cue
  const updateActiveSong = useCallback(
    (updater: (song: Song) => Song) => {
      setProject((prev) => ({
        ...prev,
        songs: prev.songs.map((s) =>
          s.id === activeSong.id ? updater(s) : s
        ),
      }));
    },
    [activeSong?.id]
  );

  const updateSelectedCue = useCallback(
    (updater: (cue: Cue) => Cue) => {
      if (!selectedCue) return;
      updateActiveSong((song) => ({
        ...song,
        cues: song.cues.map((c) => (c.id === selectedCue.id ? updater(c) : c)),
      }));
    },
    [selectedCue, updateActiveSong]
  );

  const startInlineEdit = useCallback((cue: Cue) => {
    setEditingCueId(cue.id);
    setEditingCueText(cue.text || '');
  }, []);

  const saveInlineEdit = useCallback(
    (cueId: string) => {
      const clean = editingCueText.replace(/\r?\n/g, ' ').trim();
      updateActiveSong((song) => ({
        ...song,
        cues: song.cues.map((c) =>
          c.id === cueId ? { ...c, text: clean } : c
        ),
      }));
      // Jika cue yang diperbaiki typo-nya sedang tayang Live, perbarui live output seketika
      if (engineState.liveCueId === cueId && engineRef.current) {
        sendCommand('APPLY_TO_LIVE');
      }
      setEditingCueId(null);
      showToast('Baris lirik berhasil diperbarui.', 'success');
    },
    [editingCueText, updateActiveSong, engineState.liveCueId, sendCommand, showToast]
  );

  const cancelInlineEdit = useCallback(() => {
    setEditingCueId(null);
    setEditingCueText('');
  }, []);

  const openNewSongModal = useCallback(() => {
    setImportModalMode('new-song');
    setNewSongTitleInput('');
    setImportReplaceExisting(false);
    setImportEmptyMode('blank-cue');
    setImportLyricsText('');
    setShowImportLyricsModal(true);
  }, []);

  const openReplaceLyricsModal = useCallback(() => {
    if (!activeSong) return;
    setImportModalMode('replace');
    setImportReplaceExisting(true);
    setImportEmptyMode('blank-cue');
    // Pre-fill teks dengan seluruh baris lirik lagu saat ini
    const currentLyrics = activeSong.cues
      .map((c) => {
        if (c.isBlankCue) return '';
        if (c.section && !c.text.startsWith('[')) {
          return `[${c.section}]\n${c.text}`;
        }
        return c.text;
      })
      .join('\n');
    setImportLyricsText(currentLyrics || '');
    setShowImportLyricsModal(true);
  }, [activeSong]);

  const openImportLyricsModal = useCallback(() => {
    setImportModalMode('append');
    setImportReplaceExisting(false);
    setImportEmptyMode('blank-cue');
    setImportLyricsText('');
    setShowImportLyricsModal(true);
  }, []);

  const updateCueStyleOverride = useCallback(
    <K extends keyof CueStyle>(key: K, value: CueStyle[K]) => {
      // Tetap 1 Lagu 1 Tema: Perubahan gaya teks langsung diseragamkan ke seluruh baris lagu ini secara realtime
      const baseStyle = selectedCue?.styleOverrides || {};
      updateActiveSong((song) => ({
        ...song,
        cues: song.cues.map((c) => ({
          ...c,
          presetId: song.defaultPresetId,
          styleOverrides: {
            ...baseStyle,
            ...c.styleOverrides,
            [key]: value,
          },
        })),
      }));
    },
    [selectedCue?.styleOverrides, updateActiveSong]
  );

  const updateMultipleCueStyleOverrides = useCallback(
    (
      overrides: Partial<CueStyle>,
      animOverrides?: {
        in?: Partial<CueAnimation['in']>;
        hold?: Partial<CueAnimation['hold']>;
        out?: Partial<CueAnimation['out']>;
      }
    ) => {
      // Tetap 1 Lagu 1 Tema: Switch style/tema langsung berlaku ke seluruh lagu & realtime ke Live
      const baseStyle = selectedCue?.styleOverrides || {};
      const baseAnim = selectedCue?.animationOverrides;
      updateActiveSong((song) => ({
        ...song,
        cues: song.cues.map((c) => ({
          ...c,
          presetId: song.defaultPresetId,
          styleOverrides: {
            ...baseStyle,
            ...c.styleOverrides,
            ...overrides,
          },
          animationOverrides: animOverrides
            ? {
                ...(baseAnim || {}),
                ...c.animationOverrides,
                ...(animOverrides.in
                  ? { in: { ...(baseAnim?.in || {}), ...(c.animationOverrides?.in || {}), ...animOverrides.in } }
                  : {}),
                ...(animOverrides.hold
                  ? { hold: { ...(baseAnim?.hold || {}), ...(c.animationOverrides?.hold || {}), ...animOverrides.hold } }
                  : {}),
                ...(animOverrides.out
                  ? { out: { ...(baseAnim?.out || {}), ...(c.animationOverrides?.out || {}), ...animOverrides.out } }
                  : {}),
              }
            : c.animationOverrides,
        })),
      }));
      setPreviewResetKey((k) => k + 1);
    },
    [selectedCue?.styleOverrides, selectedCue?.animationOverrides, updateActiveSong]
  );

  const updateCueAnimationOverride = useCallback(
    <P extends 'in' | 'hold' | 'out', K extends keyof CueAnimation[P]>(
      phase: P,
      key: K,
      value: CueAnimation[P][K]
    ) => {
      // Tetap 1 Lagu 1 Tema: Perubahan animasi langsung diseragamkan ke seluruh baris lagu ini secara realtime
      const baseAnim = selectedCue?.animationOverrides;
      updateActiveSong((song) => ({
        ...song,
        cues: song.cues.map((c) => ({
          ...c,
          presetId: song.defaultPresetId,
          animationOverrides: {
            ...(baseAnim || {}),
            ...c.animationOverrides,
            [phase]: {
              ...(baseAnim?.[phase] || {}),
              ...(c.animationOverrides?.[phase] || {}),
              [key]: value,
            },
          },
        })),
      }));
      setPreviewResetKey((k) => k + 1);
    },
    [selectedCue?.animationOverrides, updateActiveSong]
  );

  // Penerapan preset ke seluruh lagu dari dropdown header lagu
  const handleSelectSongPreset = useCallback(
    (newPresetId: string) => {
      if (!activeSong) return;
      updateActiveSong((song) => ({
        ...song,
        defaultPresetId: newPresetId,
        cues: song.cues.map((c) => ({
          ...c,
          presetId: newPresetId,
          styleOverrides: {},
          animationOverrides: undefined,
        })),
      }));
      const presetName =
        project.presets.find((p) => p.id === newPresetId)?.name || newPresetId;
      showToast(
        `Preset lagu "${activeSong.title}" diubah ke "${presetName}" & seluruh ${activeSong.cues.length} baris diseragamkan.`,
        'success'
      );
    },
    [activeSong, updateActiveSong, project.presets, showToast]
  );

  const handleSelectPreset = useCallback(
    (newPresetId: string) => {
      if (themeScope === 'song') {
        updateActiveSong((song) => ({
          ...song,
          defaultPresetId: newPresetId,
          cues: song.cues.map((c) => ({
            ...c,
            presetId: newPresetId,
            styleOverrides: {}, // Bersihkan override lama agar murni seragam ke preset baru
            animationOverrides: undefined,
          })),
        }));
        const presetName =
          project.presets.find((p) => p.id === newPresetId)?.name || newPresetId;
        showToast(
          `Tema preset "${presetName}" diterapkan ke seluruh baris lagu "${activeSong.title}".`,
          'success'
        );
      } else {
        updateSelectedCue((c) => ({
          ...c,
          presetId: newPresetId,
        }));
      }
    },
    [
      themeScope,
      updateActiveSong,
      updateSelectedCue,
      project.presets,
      activeSong?.title,
      showToast,
    ]
  );

  const handleSyncAllCuesToTheme = useCallback(() => {
    if (!selectedCue || !activeSong) return;
    const currentStyle = selectedCue.styleOverrides || {};
    const currentAnim = selectedCue.animationOverrides;
    const targetPresetId =
      themeScope === 'song'
        ? (activeSong.defaultPresetId || selectedCue.presetId || 'preset-clean')
        : (selectedCue.presetId || activeSong.defaultPresetId || 'preset-clean');

    updateActiveSong((song) => ({
      ...song,
      defaultPresetId: targetPresetId,
      cues: song.cues.map((c) => ({
        ...c,
        presetId: targetPresetId,
        styleOverrides: { ...currentStyle },
        animationOverrides: currentAnim
          ? JSON.parse(JSON.stringify(currentAnim))
          : undefined,
      })),
    }));
    const presetName =
      project.presets.find((p) => p.id === targetPresetId)?.name || targetPresetId;
    showToast(
      `Tema "${presetName}" berhasil diseragamkan ke seluruh ${activeSong.cues.length} baris di lagu "${activeSong.title}"!`,
      'success'
    );
  }, [selectedCue, activeSong, themeScope, project.presets, updateActiveSong, showToast]);

  // Impor file .txt atau paste lirik (Bagian 4 & 5)
  const importPreviewResult = useMemo(() => {
    if (!importLyricsText.trim()) {
      return { cues: [], warnings: [], detectedSections: [] };
    }
    return parseLyricsToCues(importLyricsText, {
      defaultPresetId: activeSong?.defaultPresetId || 'preset-clean',
      extractSectionHeaders: importExtractHeaders,
      emptyLineMode: importEmptyMode,
    });
  }, [importLyricsText, activeSong?.defaultPresetId, importExtractHeaders, importEmptyMode]);

  const handleApplyLyricImport = () => {
    const baseStyle = selectedCue?.styleOverrides || activeSong?.cues?.[0]?.styleOverrides;
    const baseAnim = selectedCue?.animationOverrides || activeSong?.cues?.[0]?.animationOverrides;
    const basePreset = activeSong?.defaultPresetId || 'preset-clean';

    if (importModalMode === 'new-song') {
      const songTitle =
        newSongTitleInput.trim() || `Lagu Baru #${project.songs.length + 1}`;
      const newSongId = `song-${Date.now().toString(36)}`;
      const themedCues: Cue[] =
        importPreviewResult.cues.length > 0
          ? importPreviewResult.cues.map((c) => ({
              ...c,
              presetId: basePreset,
              styleOverrides: baseStyle ? { ...baseStyle } : {},
              animationOverrides: baseAnim
                ? JSON.parse(JSON.stringify(baseAnim))
                : undefined,
            }))
          : [
              {
                id: generateStableCueId('blank'),
                text: '',
                section: 'Intro',
                isBlankCue: true,
                notes: 'Jeda pembuka',
                presetId: basePreset,
                styleOverrides: baseStyle ? { ...baseStyle } : {},
                animationOverrides: baseAnim
                  ? JSON.parse(JSON.stringify(baseAnim))
                  : undefined,
              },
            ];

      const newSong: Song = {
        id: newSongId,
        title: songTitle,
        artist: 'LUI Visual',
        defaultPresetId: basePreset,
        transitionPolicy: 'strict-single',
        cues: themedCues,
      };
      const firstCueId = themedCues[0]?.id;
      const updatedProject = {
        ...project,
        songs: [...project.songs, newSong],
        activeSongId: newSongId,
        selectedCueId: firstCueId,
      };
      setProject(updatedProject);
      if (engineRef.current) {
        const { state: nextState } = engineRef.current.dispatch(
          updatedProject,
          {
            type: 'command',
            id: `cmd-add-song-${Date.now().toString(36)}`,
            sessionId: 'desktop-local',
            expectedRevision: engineRef.current.getState().revision,
            action: 'SELECT_SONG',
            payload: { songId: newSongId },
          },
          performance.now()
        );
        setEngineState(nextState);
      }
      setShowImportLyricsModal(false);
      showToast(
        `Lagu "${songTitle}" berhasil dibuat dengan ${themedCues.length} cue!`,
        'success'
      );
      return;
    }

    if (importPreviewResult.cues.length === 0) {
      showToast('Teks lirik kosong atau tidak menghasilkan cue.', 'warning');
      return;
    }

    const themedCues = importPreviewResult.cues.map((c) => ({
      ...c,
      presetId: basePreset,
      styleOverrides: baseStyle ? { ...baseStyle } : {},
      animationOverrides: baseAnim ? JSON.parse(JSON.stringify(baseAnim)) : undefined,
    }));

    updateActiveSong((song) => ({
      ...song,
      cues: importReplaceExisting
        ? themedCues
        : [...song.cues, ...themedCues],
    }));
    const firstNewId = themedCues[0].id;
    sendCommand('SELECT_CUE', { cueId: firstNewId });
    setShowImportLyricsModal(false);
    showToast(
      importReplaceExisting
        ? `Berhasil me-replace seluruh lirik lagu "${activeSong.title}" dengan ${themedCues.length} baris baru seragam tema!`
        : `Berhasil menambahkan ${themedCues.length} baris cue seragam tema ke "${activeSong.title}".`,
      'success'
    );
  };

  const handleTxtFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportLyricsText(reader.result);
        showToast(`File "${file.name}" berhasil dibaca (UTF-8).`, 'info');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // Impor Font Lokal .ttf/.otf menggunakan Browser FontFace API (Bagian 8)
  const handleFontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const cleanName = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[^a-zA-Z0-9_-]/g, ' ').trim();
      const fontFamilyName = `Custom_${cleanName || 'StageFont'}`;
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontFamilyName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);
      const entry = {
        label: `${cleanName} (Font Lokal)`,
        value: `"${fontFamilyName}", sans-serif`,
      };
      setCustomFonts((prev) => [...prev, entry]);
      updateCueStyleOverride('fontFamily', entry.value);
      showToast(`Font lokal "${cleanName}" berhasil dimuat dan diterapkan.`, 'success');
    } catch {
      showToast('Gagal memuat file font. Pastikan file .ttf atau .otf valid.', 'error');
    }
    e.target.value = '';
  };

  // Unduh Frame Live PNG Transparan untuk bukti Alpha Channel (Bagian 10 & 20)
  const handleDownloadAlphaPng = () => {
    const canvas = liveAlphaCanvasRef.current ?? previewAlphaCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `luilyric-alpha-frame-${Date.now()}.png`;
    a.click();
    showToast('Frame RGBA transparan (.png) berhasil diunduh untuk verifikasi alpha.', 'success');
  };

  // Ekspor & Impor JSON Proyek (Bagian 13 & 16)
  const handleOpenExportModal = () => {
    setJsonModalText(storageAdapter.exportProjectJson(project));
    setShowJsonModal('export');
  };

  const handleDownloadProjectJson = () => {
    const raw = storageAdapter.exportProjectJson(project);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.luilyric.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File proyek JSON berhasil diunduh.', 'success');
  };

  const handleImportProjectJson = () => {
    const res = storageAdapter.importProjectJson(jsonModalText);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    // Buat backup otomatis sebelum menimpa proyek aktif (Bagian 13 & 16)
    storageAdapter.createBackup(project, 'Sebelum Impor JSON').then(() => {
      storageAdapter.listBackups().then(setBackups);
    });
    setProject(res.project);
    engineRef.current = new LiveEngine(res.project, performance.now());
    setEngineState(engineRef.current.getState());
    setShowJsonModal('none');
    showToast(
      res.warnings.length > 0
        ? `Proyek dimuat dengan ${res.warnings.length} catatan penyesuaian.`
        : `Proyek "${res.project.name}" berhasil diimpor.`,
      'success'
    );
  };

  const handleSaveAsNewPreset = () => {
    if (!selectedPreviewSnapshot) return;
    const presetName = `Preset Custom #${project.presets.length + 1}`;
    const newPreset: StylePreset = {
      id: `preset-custom-${Date.now().toString(36)}`,
      name: presetName,
      version: 1,
      style: { ...selectedPreviewSnapshot.resolvedStyle },
      animation: {
        in: { ...selectedPreviewSnapshot.resolvedAnimation.in },
        hold: { ...selectedPreviewSnapshot.resolvedAnimation.hold },
        out: { ...selectedPreviewSnapshot.resolvedAnimation.out },
      },
    };
    setProject((prev) => ({
      ...prev,
      presets: [...prev.presets, newPreset],
    }));
    if (themeScope === 'song') {
      updateActiveSong((song) => ({
        ...song,
        defaultPresetId: newPreset.id,
        cues: song.cues.map((c) => ({
          ...c,
          presetId: newPreset.id,
          styleOverrides: {},
          animationOverrides: undefined,
        })),
      }));
      showToast(
        `Tema lagu "${activeSong.title}" disimpan sebagai preset "${presetName}" & diterapkan ke seluruh baris.`,
        'success'
      );
    } else {
      updateSelectedCue((cue) => ({
        ...cue,
        presetId: newPreset.id,
        styleOverrides: {},
        animationOverrides: undefined,
      }));
      showToast(`Style disimpan sebagai "${presetName}".`, 'success');
    }
  };

  const filteredCues = useMemo(() => {
    if (!activeSong) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeSong.cues;
    return activeSong.cues.filter(
      (c) =>
        c.text.toLowerCase().includes(q) ||
        (c.section && c.section.toLowerCase().includes(q))
    );
  }, [activeSong, searchQuery]);

  const liveCueIndex = useMemo(() => {
    if (!activeSong || !engineState.liveCueId) return -1;
    return activeSong.cues.findIndex((c) => c.id === engineState.liveCueId);
  }, [activeSong, engineState.liveCueId]);

  const nextUpcomingCue: Cue | null = useMemo(() => {
    if (!activeSong || activeSong.cues.length === 0) return null;
    if (liveCueIndex >= 0 && liveCueIndex + 1 < activeSong.cues.length) {
      return activeSong.cues[liveCueIndex + 1];
    }
    if (liveCueIndex === -1 && selectedCue) {
      return selectedCue;
    }
    return null;
  }, [activeSong, liveCueIndex, selectedCue]);

  const resolvedStyle =
    selectedPreviewSnapshot?.resolvedStyle ?? project.presets[0].style;
  const resolvedAnim =
    selectedPreviewSnapshot?.resolvedAnimation ?? project.presets[0].animation;

  const stageThemesList = useMemo(
    () => [
      {
        label: 'Standar Bersih',
        badge: 'NORMAL',
        isActive:
          (resolvedStyle.charStyleMode || 'uniform') === 'uniform' &&
          (resolvedStyle.charBoxMode || 'none') === 'none' &&
          !(resolvedStyle.outerOutlineWidth && resolvedStyle.outerOutlineWidth > 0) &&
          !(resolvedStyle.extrudeDepth && resolvedStyle.extrudeDepth > 0),
        style: {
          fontFamily: '"Plus Jakarta Sans", "Montserrat", sans-serif',
          fontWeight: 800,
          italic: false,
          fontSize: 94,
          minFontSize: 40,
          lineHeight: 1.38,
          letterSpacing: 2,
          textTransform: 'none' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FFFFFF',
          useGradient: false,
          gradientEnd: '#38BDF8',
          gradientAngle: 90,
          outlineColor: '#090D16',
          outlineWidth: 7,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 0,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 16,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.75,
          glowColor: '#00F0FF',
          glowRadius: 0,
          glowIntensity: 0,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charBoxMode: 'none' as const,
        },
        anim: {
          in: { type: 'popBounce' as const, durationMs: 380, staggerMs: 35, easing: 'easeOutBack' as const },
          hold: { type: 'static' as const, cycleMs: 2000, intensity: 0.5 },
          out: { type: 'popScatter' as const, durationMs: 260, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Leleh Srengenge',
        badge: 'LELEH',
        isActive: resolvedStyle.charBoxMode === 'liquid-drip',
        style: {
          fontFamily: '"Rubik Wet Paint", "Luckiest Guy", Impact, sans-serif',
          fontWeight: 800,
          italic: false,
          fontSize: 96,
          minFontSize: 42,
          lineHeight: 1.52,
          letterSpacing: 3,
          textTransform: 'uppercase' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FFE600',
          useGradient: true,
          gradientEnd: '#FF5500',
          gradientAngle: 90,
          outlineColor: '#5C1008',
          outlineWidth: 9,
          outerOutlineColor: '#00D8FF',
          outerOutlineWidth: 15,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 18,
          shadowOffsetX: 0,
          shadowOffsetY: 5,
          shadowOpacity: 0.8,
          glowColor: '#00D8FF',
          glowRadius: 12,
          glowIntensity: 0.55,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charBoxMode: 'liquid-drip' as const,
        },
        anim: {
          in: { type: 'popBounce' as const, durationMs: 420, staggerMs: 40, easing: 'easeOutBack' as const },
          hold: { type: 'comicBounce' as const, cycleMs: 2200, intensity: 0.7 },
          out: { type: 'dropGravity' as const, durationMs: 280, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Ransom Acak',
        badge: 'ACAK',
        isActive: resolvedStyle.charStyleMode === 'ransom-mixed',
        style: {
          fontFamily: '"Fredoka", "Luckiest Guy", "Plus Jakarta Sans", sans-serif',
          fontWeight: 800,
          italic: false,
          fontSize: 94,
          minFontSize: 40,
          lineHeight: 1.44,
          letterSpacing: 3,
          textTransform: 'none' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FDE047',
          useGradient: false,
          gradientEnd: '#EC4899',
          gradientAngle: 90,
          outlineColor: '#090D16',
          outlineWidth: 9,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 0,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 16,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.75,
          glowColor: '#EC4899',
          glowRadius: 14,
          glowIntensity: 0.75,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'ransom-mixed' as const,
          charColorPalette: ['#FDE047', '#EC4899', '#22D3EE', '#FFFFFF', '#FB923C', '#A3E635'],
          charBoxMode: 'none' as const,
        },
        anim: {
          in: { type: 'popBounce' as const, durationMs: 420, staggerMs: 45, easing: 'easeOutBack' as const },
          hold: { type: 'ransomJitter' as const, cycleMs: 2200, intensity: 0.85 },
          out: { type: 'popScatter' as const, durationMs: 260, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Kotak Komik',
        badge: 'BOX',
        isActive: resolvedStyle.charBoxMode === 'comic-blocks',
        style: {
          fontFamily: '"Fredoka", "Luckiest Guy", sans-serif',
          fontWeight: 700,
          italic: false,
          fontSize: 92,
          minFontSize: 40,
          lineHeight: 1.48,
          letterSpacing: 4,
          textTransform: 'none' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FFFFFF',
          useGradient: false,
          gradientEnd: '#FACC15',
          gradientAngle: 90,
          outlineColor: '#090D16',
          outlineWidth: 8,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 0,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 16,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.75,
          glowColor: '#00F0FF',
          glowRadius: 0,
          glowIntensity: 0,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charColorPalette: ['#0891B2', '#FACC15', '#EA580C', '#E11D48', '#14B8A6'],
          charBoxMode: 'comic-blocks' as const,
        },
        anim: {
          in: { type: 'popBounce' as const, durationMs: 440, staggerMs: 45, easing: 'easeOutBack' as const },
          hold: { type: 'comicBounce' as const, cycleMs: 1800, intensity: 0.85 },
          out: { type: 'popScatter' as const, durationMs: 260, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Kartu Miring',
        badge: 'TAG',
        isActive: resolvedStyle.charBoxMode === 'confetti-tags',
        style: {
          fontFamily: '"Montserrat", "Plus Jakarta Sans", sans-serif',
          fontWeight: 900,
          italic: false,
          fontSize: 92,
          minFontSize: 40,
          lineHeight: 1.46,
          letterSpacing: 3,
          textTransform: 'uppercase' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FFFFFF',
          useGradient: false,
          gradientEnd: '#14B8A6',
          gradientAngle: 90,
          outlineColor: '#0F172A',
          outlineWidth: 7,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 0,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 16,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.75,
          glowColor: '#00F0FF',
          glowRadius: 0,
          glowIntensity: 0,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charColorPalette: ['#14B8A6', '#F97316', '#EF4444', '#FACC15'],
          charBoxMode: 'confetti-tags' as const,
        },
        anim: {
          in: { type: 'popBounce' as const, durationMs: 380, staggerMs: 35, easing: 'easeOutBack' as const },
          hold: { type: 'charWave' as const, cycleMs: 2000, intensity: 0.7 },
          out: { type: 'whipOut' as const, durationMs: 240, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Stiker Tebal',
        badge: 'STIKER',
        isActive:
          resolvedStyle.charBoxMode !== 'liquid-drip' &&
          resolvedStyle.charBoxMode !== 'neon-ribbon' &&
          (resolvedStyle.outerOutlineWidth ?? 0) > 0,
        style: {
          fontFamily: '"Luckiest Guy", "Fredoka", sans-serif',
          fontWeight: 800,
          italic: false,
          fontSize: 96,
          minFontSize: 42,
          lineHeight: 1.48,
          letterSpacing: 3,
          textTransform: 'uppercase' as const,
          fillMode: 'fill-outline' as const,
          fill: '#F472B6',
          useGradient: true,
          gradientEnd: '#EC4899',
          gradientAngle: 90,
          outlineColor: '#111827',
          outlineWidth: 9,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 16,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 18,
          shadowOffsetX: 0,
          shadowOffsetY: 5,
          shadowOpacity: 0.8,
          glowColor: '#EC4899',
          glowRadius: 10,
          glowIntensity: 0.4,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charBoxMode: 'none' as const,
        },
        anim: {
          in: { type: 'popBounce' as const, durationMs: 420, staggerMs: 40, easing: 'easeOutBack' as const },
          hold: { type: 'comicBounce' as const, cycleMs: 2000, intensity: 0.7 },
          out: { type: 'popScatter' as const, durationMs: 260, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Blok 3D Retro',
        badge: '3D',
        isActive: (resolvedStyle.extrudeDepth ?? 0) > 0,
        style: {
          fontFamily: '"Rubik Mono One", "Bungee", "Orbitron", sans-serif',
          fontWeight: 900,
          italic: false,
          fontSize: 90,
          minFontSize: 38,
          lineHeight: 1.46,
          letterSpacing: 3,
          textTransform: 'uppercase' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FDE047',
          useGradient: true,
          gradientEnd: '#F59E0B',
          gradientAngle: 90,
          outlineColor: '#0F172A',
          outlineWidth: 8,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 0,
          extrudeDepth: 14,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 18,
          shadowOffsetX: 0,
          shadowOffsetY: 6,
          shadowOpacity: 0.8,
          glowColor: '#38BDF8',
          glowRadius: 12,
          glowIntensity: 0.5,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charBoxMode: 'none' as const,
        },
        anim: {
          in: { type: 'kineticSlam' as const, durationMs: 400, staggerMs: 40, easing: 'easeOutBack' as const },
          hold: { type: 'beatStomp' as const, cycleMs: 2000, intensity: 0.75 },
          out: { type: 'dropGravity' as const, durationMs: 260, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Glitch Siber RGB',
        badge: 'RGB',
        isActive: resolvedStyle.charBoxMode === 'rgb-split',
        style: {
          fontFamily: '"Russo One", "Orbitron", Impact, sans-serif',
          fontWeight: 900,
          italic: false,
          fontSize: 94,
          minFontSize: 40,
          lineHeight: 1.40,
          letterSpacing: 3,
          textTransform: 'uppercase' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FFFFFF',
          useGradient: false,
          gradientEnd: '#00F0FF',
          gradientAngle: 90,
          outlineColor: '#090D16',
          outlineWidth: 6,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 0,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 14,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.75,
          glowColor: '#00F0FF',
          glowRadius: 14,
          glowIntensity: 0.7,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charBoxMode: 'rgb-split' as const,
        },
        anim: {
          in: { type: 'glitchIn' as const, durationMs: 360, staggerMs: 30, easing: 'easeOutCubic' as const },
          hold: { type: 'glitchTwitch' as const, cycleMs: 1800, intensity: 0.85 },
          out: { type: 'glitchOut' as const, durationMs: 240, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Pita Panggung',
        badge: 'PITA',
        isActive: resolvedStyle.charBoxMode === 'neon-ribbon',
        style: {
          fontFamily: '"Fugaz One", "Anton", Impact, sans-serif',
          fontWeight: 800,
          italic: false,
          fontSize: 92,
          minFontSize: 40,
          lineHeight: 1.44,
          letterSpacing: 3,
          textTransform: 'uppercase' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FACC15',
          useGradient: true,
          gradientEnd: '#FFFFFF',
          gradientAngle: 90,
          outlineColor: '#090D16',
          outlineWidth: 6,
          outerOutlineColor: '#00F0FF',
          outerOutlineWidth: 0,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 16,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.75,
          glowColor: '#00F0FF',
          glowRadius: 10,
          glowIntensity: 0.5,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'uniform' as const,
          charBoxMode: 'neon-ribbon' as const,
        },
        anim: {
          in: { type: 'whipSlide' as const, durationMs: 380, staggerMs: 35, easing: 'easeOutBack' as const },
          hold: { type: 'pendulumTilt' as const, cycleMs: 2400, intensity: 0.6 },
          out: { type: 'whipOut' as const, durationMs: 240, easing: 'easeOutCubic' as const },
        },
      },
      {
        label: 'Pelangi Disko',
        badge: 'DISKO',
        isActive:
          resolvedStyle.charStyleMode === 'pop-alternating' &&
          resolvedStyle.charBoxMode === 'none',
        style: {
          fontFamily: '"Shrikhand", "Boogaloo", "Fredoka", sans-serif',
          fontWeight: 800,
          italic: false,
          fontSize: 94,
          minFontSize: 40,
          lineHeight: 1.46,
          letterSpacing: 3,
          textTransform: 'none' as const,
          fillMode: 'fill-outline' as const,
          fill: '#FDE047',
          useGradient: false,
          gradientEnd: '#EC4899',
          gradientAngle: 90,
          outlineColor: '#090D16',
          outlineWidth: 9,
          outerOutlineColor: '#FFFFFF',
          outerOutlineWidth: 10,
          extrudeDepth: 0,
          extrudeColor: '#0284C7',
          extrudeAngle: 130,
          shadowColor: '#000000',
          shadowBlur: 16,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowOpacity: 0.75,
          glowColor: '#EC4899',
          glowRadius: 14,
          glowIntensity: 0.65,
          opacity: 1,
          x: 0.5,
          y: 0.5,
          anchor: 'center' as const,
          charStyleMode: 'pop-alternating' as const,
          charColorPalette: ['#FFE600', '#FF2A85', '#00F0FF', '#A3E635', '#FB923C', '#C084FC'],
          charBoxMode: 'none' as const,
        },
        anim: {
          in: { type: 'popBounce' as const, durationMs: 400, staggerMs: 40, easing: 'easeOutBack' as const },
          hold: { type: 'discoWave' as const, cycleMs: 1800, intensity: 0.85 },
          out: { type: 'popScatter' as const, durationMs: 260, easing: 'easeOutCubic' as const },
        },
      },
    ],
    [resolvedStyle]
  );

  const activeStageTheme = useMemo(
    () => stageThemesList.find((t) => t.isActive) ?? stageThemesList[0],
    [stageThemesList]
  );

  const handleResetAllToTheme = useCallback(() => {
    updateMultipleCueStyleOverrides(activeStageTheme.style, activeStageTheme.anim);
    setPreviewResetKey((k) => k + 1);
    showToast(`Semua slider & efek di-reset ke default tema "${activeStageTheme.label}"`, 'info');
  }, [activeStageTheme, updateMultipleCueStyleOverrides, showToast]);

  const handleResetEffectsToTheme = useCallback(() => {
    const s = activeStageTheme.style;
    updateMultipleCueStyleOverrides({
      fillMode: s.fillMode,
      fill: s.fill,
      useGradient: s.useGradient,
      gradientEnd: s.gradientEnd,
      gradientAngle: s.gradientAngle,
      outlineColor: s.outlineColor,
      outlineWidth: s.outlineWidth,
      outerOutlineColor: s.outerOutlineColor,
      outerOutlineWidth: s.outerOutlineWidth,
      extrudeDepth: s.extrudeDepth,
      extrudeColor: s.extrudeColor,
      extrudeAngle: s.extrudeAngle,
      glowColor: s.glowColor,
      glowRadius: s.glowRadius,
      glowIntensity: s.glowIntensity,
      shadowColor: s.shadowColor,
      shadowBlur: s.shadowBlur,
      shadowOffsetX: s.shadowOffsetX,
      shadowOffsetY: s.shadowOffsetY,
      shadowOpacity: s.shadowOpacity,
      charStyleMode: s.charStyleMode,
      charBoxMode: s.charBoxMode,
    });
    showToast(`Efek, warna & outline di-reset ke default "${activeStageTheme.label}"`, 'info');
  }, [activeStageTheme, updateMultipleCueStyleOverrides, showToast]);

  const handleResetTypographyToTheme = useCallback(() => {
    const s = activeStageTheme.style;
    updateMultipleCueStyleOverrides({
      fontFamily: s.fontFamily,
      fontWeight: s.fontWeight,
      italic: s.italic,
      fontSize: s.fontSize,
      minFontSize: s.minFontSize,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      textTransform: s.textTransform,
      opacity: s.opacity,
    });
    showToast(`Ukuran font & tipografi di-reset ke default "${activeStageTheme.label}"`, 'info');
  }, [activeStageTheme, updateMultipleCueStyleOverrides, showToast]);

  const handleResetPositionToTheme = useCallback(() => {
    const s = activeStageTheme.style;
    updateMultipleCueStyleOverrides({
      x: s.x,
      y: s.y,
      anchor: s.anchor,
    });
    showToast(`Posisi kanvas di-reset ke default tengah (X:50%, Y:50%)`, 'info');
  }, [activeStageTheme, updateMultipleCueStyleOverrides, showToast]);

  const handleResetAnimToTheme = useCallback(() => {
    updateMultipleCueStyleOverrides({}, activeStageTheme.anim);
    setPreviewResetKey((k) => k + 1);
    showToast(`Animasi IN/STAY/OUT di-reset ke default "${activeStageTheme.label}"`, 'info');
  }, [activeStageTheme, updateMultipleCueStyleOverrides, showToast]);

  const handleApplyCustomResolution = useCallback(
    (rawW: number, rawH: number) => {
      const w = Math.max(256, Math.min(7680, Math.round(Number(rawW) || 1920)));
      const h = Math.max(128, Math.min(4320, Math.round(Number(rawH) || 1080)));
      setProject((p) => ({
        ...p,
        output: { ...p.output, width: w, height: h },
      }));
      showToast(`Resolusi Output diatur ke ${w} × ${h} px`, 'success');
    },
    [showToast]
  );

  const lineFitEvaluation = useMemo(() => {
    if (!selectedCue) return null;
    return evaluateSingleLineFit(
      selectedCue.text,
      resolvedStyle,
      project.output.width
    );
  }, [selectedCue, resolvedStyle, project.output.width]);

  return (
    <div
      className="h-screen w-screen flex flex-col select-none overflow-hidden"
      style={{
        backgroundColor: '#07090e',
        color: '#f1f5f9',
        fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
      }}
    >
      {/* Google Fonts untuk Orbitron, Plus Jakarta Sans & JetBrains Mono di Preview Web */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Anton&family=Bangers&family=Bebas+Neue&family=Black+Ops+One&family=Boogaloo&family=Bungee&family=Carter+One&family=Cinzel:wght@700;800;900&family=Creepster&family=Fredoka:wght@600;700&family=Fugaz+One&family=JetBrains+Mono:wght@400;600;700&family=Lobster&family=Luckiest+Guy&family=Monoton&family=Montserrat:ital,wght@0,700;0,800;0,900;1,700&family=Orbitron:wght@700;800;900&family=Outfit:wght@700;800;900&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,700&family=Press+Start+2P&family=Righteous&family=Rubik+Mono+One&family=Rubik+Wet+Paint&family=Russo+One&family=Shrikhand&family=Spicy+Rice&family=Titan+One&display=swap');
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(7, 9, 14, 0.7); }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1); }
        ::-webkit-scrollbar-thumb:hover { background: #00f0ff; }
      `}</style>

      {/* =================================================================== */}
      {/* TOP HEADER & STATUS BAR (Minimal & Clean)                           */}
      {/* =================================================================== */}
      <header
        className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b"
        style={{
          backgroundColor: '#0c101b',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Kiri: Brand + Status NDI + Live Sync */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 pr-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: '#00f0ff',
                boxShadow: '0 0 8px #00f0ff',
              }}
            />
            <span
              className="text-base font-extrabold tracking-wider"
              style={{
                fontFamily: '"Orbitron", sans-serif',
                color: '#f1f5f9',
              }}
            >
              LUI<span style={{ color: '#00f0ff' }}>LYRIC</span>
            </span>
          </div>

          {/* Status NDI Singkat */}
          <button
            type="button"
            onClick={handleToggleNdi}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer"
            style={{
              backgroundColor: ndiActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              borderColor: ndiActive ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.12)',
              color: ndiActive ? '#10b981' : '#94a3b8',
            }}
            title={ndiActive ? `NDI Aktif (${project.output.senderName})` : 'Klik untuk menyalakan NDI Live ke Resolume'}
          >
            <Radio className={`w-3.5 h-3.5 shrink-0 ${ndiActive ? 'animate-pulse text-[#10b981]' : 'text-[#64748b]'}`} />
            <span>{ndiActive ? 'NDI LIVE' : 'NDI OFF'}</span>
          </button>

          {/* Mode Siar Langsung */}
          <button
            type="button"
            onClick={() => {
              const nextMode = !liveSyncMode;
              setLiveSyncMode(nextMode);
              if (nextMode && selectedCue) {
                sendCommand('GO_CUE', { cueId: selectedCue.id });
              }
              showToast(
                nextMode
                  ? 'Mode Siar Langsung AKTIF: Baris terpilih langsung tayang di Live!'
                  : 'Mode Staging AKTIF: Pilih baris masuk Preview, tekan GO untuk tayang.',
                nextMode ? 'success' : 'info'
              );
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
              liveSyncMode
                ? 'bg-red-500/15 border-red-500/60 text-red-300'
                : 'bg-white/[0.03] border-white/10 text-[#94a3b8] hover:text-white'
            }`}
            title="Mode Siar Langsung: Setiap baris yang dipilih atau diedit langsung tayang realtime tanpa perlu tekan GO."
          >
            <span className={`w-2 h-2 rounded-full ${liveSyncMode ? 'bg-red-500 animate-ping' : 'bg-[#64748b]'}`} />
            <span>{liveSyncMode ? 'LIVE SYNC' : 'STAGING'}</span>
          </button>
        </div>

        {/* Kanan: Stat Performa (FPS / RAM / VRAM), Indikator Auto-Save, Aksi Proyek & Toggle Sidebar Remote HP */}
        <div className="flex items-center gap-1.5">
          {/* Stat Real-Time: FPS, RAM, VRAM */}
          <div
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono border border-white/10 bg-[#07090e] text-[#94a3b8]"
            title="Monitor Performa Real-Time: Frame Rate (FPS), Penggunaan RAM Aplikasi, dan Estimasi Alokasi VRAM Kanvas GPU"
          >
            <span className="flex items-center gap-1">
              <span className="text-[#64748b]">FPS</span>
              <span ref={fpsElRef} className="font-bold text-[#10b981]">
                60
              </span>
            </span>
            <span className="text-white/15">|</span>
            <span className="flex items-center gap-1">
              <span className="text-[#64748b]">RAM</span>
              <span ref={ramElRef} className="font-bold text-[#00f0ff]">--MB</span>
            </span>
            <span className="text-white/15">|</span>
            <span className="flex items-center gap-1">
              <span className="text-[#64748b]">VRAM</span>
              <span ref={vramElRef} className="font-bold text-[#f0abfc]">--MB</span>
            </span>
          </div>

          <div
            onClick={() => {
              storageAdapter.createBackup(project, 'Manual Checkpoint').then(() => {
                storageAdapter.listBackups().then(setBackups);
                showToast('Titik backup manual berhasil dibuat (Auto-Save selalu aktif).', 'success');
              });
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 cursor-pointer hover:border-emerald-400/50 transition"
            title="Auto-Save aktif otomatis setiap perubahan. Klik untuk membuat titik backup manual."
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'saved' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{saveStatus === 'saved' ? 'Auto-Saved' : 'Menyimpan...'}</span>
          </div>

          <button
            type="button"
            onClick={handleOpenExportModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-white/10 bg-[#141c30] hover:border-[#00f0ff]/50 text-[#94a3b8] hover:text-white transition"
            title="Ekspor Proyek ke JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="hidden md:inline">Ekspor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setJsonModalText('');
              setShowJsonModal('import');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-white/10 bg-[#141c30] hover:border-[#00f0ff]/50 text-[#94a3b8] hover:text-white transition"
            title="Impor Proyek dari JSON"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="hidden md:inline">Impor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              storageAdapter.listBackups().then(setBackups);
              setShowJsonModal('backups');
            }}
            className="flex items-center justify-center p-1.5 rounded-md text-xs border border-white/10 bg-[#141c30] hover:border-white/30 text-[#94a3b8] hover:text-white transition"
            title="Riwayat Backup Lokal"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Sidebar Remote HP */}
          <button
            type="button"
            onClick={() => setShowRemoteSidebar((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition ${
              showRemoteSidebar
                ? 'bg-[#00f0ff]/15 border-[#00f0ff]/60 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                : 'bg-[#141c30] border-white/10 text-[#94a3b8] hover:text-white hover:border-white/30'
            }`}
            title={
              showRemoteSidebar
                ? 'Sembunyikan Sidebar Remote HP ke samping'
                : 'Tampilkan Sidebar Remote HP di sisi kanan'
            }
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Remote HP</span>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showRemoteSidebar ? '' : 'rotate-180'
              }`}
            />
          </button>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className="fixed bottom-16 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-xl text-xs font-medium"
          style={{
            backgroundColor: '#0c101b',
            borderColor:
              toastMessage.type === 'error'
                ? '#ef4444'
                : toastMessage.type === 'warning'
                ? '#f59e0b'
                : toastMessage.type === 'success'
                ? '#10b981'
                : '#00f0ff',
            color: '#f1f5f9',
          }}
        >
          {toastMessage.type === 'error' ? (
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#ef4444]" />
          ) : toastMessage.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#f59e0b]" />
          ) : toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10b981]" />
          ) : (
            <Info className="w-4 h-4 shrink-0 text-[#00f0ff]" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-[#94a3b8] hover:text-white p-0.5 rounded hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* MAIN WORKSPACE BODY                                                 */}
      {/* =================================================================== */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* TAMPILAN UTAMA DESKTOP (Selalu tampil tanpa perlu switch mode) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0 h-full">
            {/* ------------------------------------------------------------- */}
            {/* KOLOM KIRI (3 cols): SETLIST LAGU & DAFTAR CUE (Bagian 5 & 6) */}
            {/* ------------------------------------------------------------- */}
            <aside
              className="lg:col-span-3 flex flex-col border-r overflow-hidden min-h-0 h-full"
              style={{
                backgroundColor: '#0c101b',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              {/* Setlist Lagu */}
              <div className="p-3 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                    Setlist Lagu ({project.songs.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={openNewSongModal}
                      className="px-2 py-1 rounded text-[11px] font-semibold bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/25 flex items-center gap-1"
                      title="Tambah lagu baru & paste lirik"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Lagu</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar Filter Lagu di Setlist */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    type="text"
                    value={songSearchQuery}
                    onChange={(e) => setSongSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredSongs.length > 0) {
                        sendCommand('SELECT_SONG', { songId: filteredSongs[0].id });
                      } else if (e.key === 'Escape') {
                        setSongSearchQuery('');
                      }
                    }}
                    placeholder="Cari judul / lirik lagu di setlist..."
                    className="w-full text-xs bg-[#07090e] border border-white/10 rounded-md pl-8 pr-7 py-1 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] transition"
                  />
                  {songSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSongSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 rounded hover:bg-white/10 transition"
                      title="Reset pencarian lagu"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Daftar Lagu Kompak */}
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {filteredSongs.length === 0 ? (
                    <div className="text-[11px] text-white/40 text-center py-4 italic border border-dashed border-white/10 rounded">
                      Tidak ada lagu yang cocok dengan "{songSearchQuery}"
                    </div>
                  ) : (
                    filteredSongs.map((song) => {
                      const origIdx = project.songs.findIndex((s) => s.id === song.id);
                      const isActive = song.id === activeSong?.id;
                      return (
                        <div
                          key={song.id}
                          onClick={() =>
                            sendCommand('SELECT_SONG', { songId: song.id })
                          }
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer border text-xs transition ${
                            isActive
                              ? 'bg-[#141c30] border-[#00f0ff] text-white'
                              : 'bg-[#07090e]/60 border-white/5 text-[#94a3b8] hover:bg-[#141c30]/60 hover:text-white'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span
                              className="mr-1.5 text-[10px] text-[#64748b]"
                              style={{ fontFamily: '"JetBrains Mono", monospace' }}
                            >
                              {String(origIdx + 1).padStart(2, '0')}
                            </span>
                            <span className="font-semibold">{song.title}</span>
                            <span className="ml-1.5 text-[10px] text-[#64748b]">
                              ({song.cues.length} cue)
                            </span>
                          </div>
                        {project.songs.length > 1 && isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const remaining = project.songs.filter(
                                (s) => s.id !== song.id
                              );
                              const nextSongId = remaining[0]?.id;
                              const updatedProject = {
                                ...project,
                                songs: remaining,
                                activeSongId: nextSongId,
                              };
                              setProject(updatedProject);
                              if (engineRef.current && nextSongId) {
                                const { state: nextState } = engineRef.current.dispatch(
                                  updatedProject,
                                  {
                                    type: 'command',
                                    id: `cmd-del-song-${Date.now().toString(36)}`,
                                    sessionId: 'desktop-local',
                                    expectedRevision: engineRef.current.getState().revision,
                                    action: 'SELECT_SONG',
                                    payload: { songId: nextSongId },
                                  },
                                  performance.now()
                                );
                                setEngineState(nextState);
                              }
                            }}
                            className="text-[#64748b] hover:text-red-400 p-0.5"
                            title="Hapus lagu ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
                </div>

                {/* Judul Lagu Aktif */}
                {activeSong && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/10">
                    <input
                      type="text"
                      value={activeSong.title}
                      onChange={(e) =>
                        updateActiveSong((s) => ({ ...s, title: e.target.value }))
                      }
                      placeholder="Judul Lagu"
                      className="w-full px-2.5 py-1 rounded text-xs font-semibold bg-[#07090e] border border-white/10 text-white focus:border-[#00f0ff] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Toolbar Cue & Impor/Replace Lirik */}
              <div className="p-2.5 border-b border-white/10 space-y-2 shrink-0">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={openImportLyricsModal}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-semibold bg-[#141c30] border border-white/10 hover:border-[#00f0ff]/50 text-white transition"
                    title="Impor atau tambahkan lirik baru ke akhir lagu ini"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Impor Lirik</span>
                  </button>
                  <button
                    type="button"
                    onClick={openReplaceLyricsModal}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-bold bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25 transition shadow-sm"
                    title="Ganti/replace seluruh lirik lagu ini dengan teks baru (muat lirik lama / paste baru)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace Lirik</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const baseStyle = selectedCue?.styleOverrides || activeSong?.cues?.[0]?.styleOverrides;
                      const baseAnim = selectedCue?.animationOverrides || activeSong?.cues?.[0]?.animationOverrides;
                      const basePreset = activeSong?.defaultPresetId || 'preset-clean';
                      const newCue: Cue = {
                        id: generateStableCueId('cue'),
                        text: '',
                        section: selectedCue?.section || 'Verse',
                        presetId: basePreset,
                        styleOverrides: baseStyle ? { ...baseStyle } : {},
                        animationOverrides: baseAnim ? JSON.parse(JSON.stringify(baseAnim)) : undefined,
                      };
                      updateActiveSong((song) => {
                        const idx = song.cues.findIndex(
                          (c) => c.id === selectedCue?.id
                        );
                        const nextCues = [...song.cues];
                        if (idx >= 0) {
                          nextCues.splice(idx + 1, 0, newCue);
                        } else {
                          nextCues.push(newCue);
                        }
                        return { ...song, cues: nextCues };
                      });
                      sendCommand('SELECT_CUE', { cueId: newCue.id });
                      startInlineEdit(newCue);
                    }}
                    className="px-2 py-1.5 rounded text-xs font-semibold bg-[#141c30] border border-white/10 hover:border-[#00f0ff]/50 text-white flex items-center gap-1"
                    title="Tambah 1 baris cue baru dan langsung ketik liriknya"
                  >
                    <Plus className="w-3 h-3 text-[#00f0ff]" />
                    <span>Cue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const baseStyle = selectedCue?.styleOverrides || activeSong?.cues?.[0]?.styleOverrides;
                      const baseAnim = selectedCue?.animationOverrides || activeSong?.cues?.[0]?.animationOverrides;
                      const basePreset = activeSong?.defaultPresetId || 'preset-clean';
                      const blankCue: Cue = {
                        id: generateStableCueId('blank'),
                        text: '',
                        section: 'Instrumental',
                        isBlankCue: true,
                        notes: 'Jeda instrumental eksplisit',
                        presetId: basePreset,
                        styleOverrides: baseStyle ? { ...baseStyle } : {},
                        animationOverrides: baseAnim ? JSON.parse(JSON.stringify(baseAnim)) : undefined,
                      };
                      updateActiveSong((song) => ({
                        ...song,
                        cues: [...song.cues, blankCue],
                      }));
                      sendCommand('SELECT_CUE', { cueId: blankCue.id });
                      showToast('Cue kosong eksplisit (jeda instrumental) ditambahkan.', 'info');
                    }}
                    className="px-2 py-1.5 rounded text-xs font-semibold bg-[#141c30] border border-white/10 hover:border-amber-400/50 text-[#94a3b8] hover:text-white flex items-center gap-1"
                    title="Tambah Cue Kosong untuk jeda instrumental"
                  >
                    <Plus className="w-3 h-3 text-amber-400" />
                    <span>Jeda</span>
                  </button>
                </div>

                {/* Pencarian Cue */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setSearchQuery('');
                    }}
                    placeholder="Cari lirik atau bagian [Chorus]..."
                    className="w-full pl-8 pr-7 py-1 rounded text-xs bg-[#07090e] border border-white/10 text-white placeholder-[#64748b] focus:border-[#00f0ff] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 rounded hover:bg-white/10 transition"
                      title="Reset pencarian lirik"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Daftar Baris Cue (Bagian 5 & 6: Scrollbar terlihat & navigasi jelas) */}
              <div
                className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1.5"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#00f0ff #07090e',
                }}
              >
                {filteredCues.map((cue) => {
                  const fullIndex = activeSong.cues.findIndex(
                    (c) => c.id === cue.id
                  );
                  const isSelected = cue.id === selectedCue?.id;
                  const isLive = cue.id === engineState.liveCueId;
                  const isPending = cue.id === engineState.pendingTargetCueId;
                  const cueStyle = resolveCueStyle(
                    cue,
                    activeSong,
                    project.presets
                  );
                  const fit = evaluateSingleLineFit(
                    cue.text,
                    cueStyle,
                    project.output.width
                  );
                  const hasOverride = hasCueOverrides(cue);

                  return (
                    <div
                      key={cue.id}
                      onClick={() =>
                        sendCommand('SELECT_CUE', { cueId: cue.id })
                      }
                      className={`group rounded-lg p-2 border transition cursor-pointer ${
                        isLive
                          ? 'bg-[#10b981]/15 border-[#10b981]'
                          : isSelected
                          ? 'bg-[#141c30] border-[#00f0ff]'
                          : 'bg-[#07090e]/80 border-white/5 hover:bg-[#141c30]/60 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-[#94a3b8]"
                            style={{ fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            #{String(fullIndex + 1).padStart(2, '0')}
                          </span>
                          {cue.section && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] truncate">
                              {cue.section}
                            </span>
                          )}
                          {hasOverride && (
                            <span
                              className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              title="Cue ini memiliki override style/animasi khusus"
                            >
                              OVR
                            </span>
                          )}
                          {!fit.fitsAtBaseSize && (
                            <span
                              className={`text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 ${
                                fit.fitsAtMinSize
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                              title={fit.warning || ''}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {fit.fitsAtMinSize ? 'SHRINK' : 'OVERFLOW'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff]"
                              style={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              PREVIEW
                            </span>
                          )}
                          {isPending && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300"
                              style={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              NEXT
                            </span>
                          )}
                          {isLive && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#10b981] text-[#07090e]"
                              style={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              LIVE
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendCommand('GO_CUE', { cueId: cue.id });
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00f0ff]/20 hover:bg-[#00f0ff] text-[#00f0ff] hover:text-[#07090e] transition"
                            title="Tayangkan cue ini ke Live sekarang (GO)"
                          >
                            GO
                          </button>
                        </div>
                      </div>

                      {/* Teks Baris Lirik / Inline Editor Typo */}
                      {editingCueId === cue.id ? (
                        <div
                          className="mt-1 flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingCueText}
                            onChange={(e) => setEditingCueText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveInlineEdit(cue.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelInlineEdit();
                              }
                            }}
                            placeholder="Ketik lirik yang benar..."
                            className="flex-1 px-2.5 py-1 rounded text-xs bg-[#07090e] border border-[#00f0ff] text-white font-medium focus:outline-none shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => saveInlineEdit(cue.id)}
                            className="px-2 py-1 rounded bg-[#00f0ff] text-[#07090e] hover:brightness-110 font-bold text-[11px] flex items-center gap-1 shrink-0"
                            title="Simpan perbaikan lirik (Enter)"
                          >
                            <Check className="w-3 h-3" />
                            <span>Simpan</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            className="p-1 rounded bg-white/10 text-[#94a3b8] hover:text-white shrink-0"
                            title="Batal (Esc)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!cue.isBlankCue) startInlineEdit(cue);
                          }}
                          title="Klik ganda untuk edit lirik langsung (perbaiki typo)"
                          className="text-xs font-medium text-[#f1f5f9] truncate hover:text-[#00f0ff] transition cursor-text flex items-center justify-between group/text"
                        >
                          <span className="truncate">
                            {cue.isBlankCue ? (
                              <span className="italic text-[#64748b]">
                                [Cue Kosong — Jeda Instrumental Transparan]
                              </span>
                            ) : (
                              cue.text || (
                                <span className="italic text-[#64748b]">
                                  (Teks kosong)
                                </span>
                              )
                            )}
                          </span>
                          {!cue.isBlankCue && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startInlineEdit(cue);
                              }}
                              className="opacity-0 group-hover/text:opacity-100 p-0.5 rounded text-[#94a3b8] hover:text-[#00f0ff] hover:bg-white/10 transition ml-1 shrink-0"
                              title="Klik untuk edit baris ini (perbaiki typo)"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Aksi Susun Ulang, Split, Duplikasi, Hapus saat Cue Terpilih */}
                      {isSelected && (
                        <div
                          className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            {!cue.isBlankCue && (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(cue)}
                                className="px-1.5 py-0.5 rounded bg-[#07090e] text-[10px] text-[#00f0ff] hover:bg-[#00f0ff]/20 flex items-center gap-1 border border-[#00f0ff]/30 font-semibold"
                                title="Edit teks baris ini langsung untuk perbaiki typo"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={fullIndex <= 0}
                              onClick={() => {
                                updateActiveSong((song) => {
                                  const arr = [...song.cues];
                                  const temp = arr[fullIndex - 1];
                                  arr[fullIndex - 1] = arr[fullIndex];
                                  arr[fullIndex] = temp;
                                  return { ...song, cues: arr };
                                });
                              }}
                              className="p-1 rounded bg-[#07090e] text-[#94a3b8] hover:text-white disabled:opacity-30"
                              title="Geser naik"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={fullIndex >= activeSong.cues.length - 1}
                              onClick={() => {
                                updateActiveSong((song) => {
                                  const arr = [...song.cues];
                                  const temp = arr[fullIndex + 1];
                                  arr[fullIndex + 1] = arr[fullIndex];
                                  arr[fullIndex] = temp;
                                  return { ...song, cues: arr };
                                });
                              }}
                              className="p-1 rounded bg-[#07090e] text-[#94a3b8] hover:text-white disabled:opacity-30"
                              title="Geser turun"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const [first, second] = splitCueIntoTwo(cue);
                                updateActiveSong((song) => {
                                  const arr = [...song.cues];
                                  arr.splice(fullIndex, 1, first, second);
                                  return { ...song, cues: arr };
                                });
                                showToast('Cue berhasil dibagi menjadi 2 baris berurutan.', 'success');
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#07090e] text-[10px] text-[#38bdf8] hover:bg-[#38bdf8]/20 flex items-center gap-1"
                              title="Bagi baris panjang menjadi 2 cue"
                            >
                              <Scissors className="w-2.5 h-2.5" />
                              <span>Bagi 2</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const dup: Cue = {
                                  ...cue,
                                  id: generateStableCueId('cue'),
                                  styleOverrides: { ...cue.styleOverrides },
                                };
                                updateActiveSong((song) => {
                                  const arr = [...song.cues];
                                  arr.splice(fullIndex + 1, 0, dup);
                                  return { ...song, cues: arr };
                                });
                                sendCommand('SELECT_CUE', { cueId: dup.id });
                              }}
                              className="p-1 rounded bg-[#07090e] text-[#94a3b8] hover:text-white"
                              title="Duplikasi cue"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={activeSong.cues.length <= 1}
                              onClick={() => {
                                const nextCandidate =
                                  activeSong.cues[fullIndex + 1] ||
                                  activeSong.cues[fullIndex - 1];
                                updateActiveSong((song) => ({
                                  ...song,
                                  cues: song.cues.filter((c) => c.id !== cue.id),
                                }));
                                if (nextCandidate) {
                                  sendCommand('SELECT_CUE', {
                                    cueId: nextCandidate.id,
                                  });
                                }
                                if (isLive) {
                                  showToast(
                                    'Cue dihapus dari daftar. Snapshot Live tetap bertahan sampai perintah berikutnya (Bagian 12).',
                                    'info'
                                  );
                                }
                              }}
                              className="p-1 rounded bg-[#07090e] text-[#94a3b8] hover:text-red-400 disabled:opacity-30"
                              title="Hapus cue"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* ------------------------------------------------------------- */}
            {/* KOLOM TENGAH (5 cols): PREVIEW & LIVE MONITOR + TRANSPORT     */}
            {/* ------------------------------------------------------------- */}
            <main className="lg:col-span-5 flex flex-col bg-[#07090e] overflow-y-auto min-h-0 h-full">
              {/* Editor Teks Cepat 1 Baris untuk Cue Terpilih */}
              {selectedCue && (
                <div
                  className="p-3 border-b"
                  style={{
                    backgroundColor: 'rgba(14,20,34,0.85)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#00f0ff] flex items-center gap-1">
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Baris Lirik (Typo Fixer)</span>
                      </span>
                      {selectedCue.id === engineState.liveCueId && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>LIVE SYNC</span>
                        </span>
                      )}
                      <span
                        className="text-[10px] text-[#64748b]"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        ID: {selectedCue.id}
                      </span>
                    </div>

                    {isLiveCueOutOfSync && (
                      <button
                        type="button"
                        onClick={() => sendCommand('APPLY_TO_LIVE')}
                        className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#f59e0b] text-[#07090e] hover:brightness-110 flex items-center gap-1 animate-pulse"
                        title="Terapkan perbaikan lirik langsung ke cue yang sedang Live di layar (Bagian 6)"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Apply to Live</span>
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedCue.section || ''}
                      onChange={(e) =>
                        updateSelectedCue((c) => ({
                          ...c,
                          section: e.target.value,
                        }))
                      }
                      placeholder="Bagian (Verse/Chorus)"
                      className="w-28 px-2.5 py-1.5 rounded text-xs bg-[#07090e] border border-white/10 text-[#38bdf8] font-semibold focus:border-[#00f0ff] focus:outline-none"
                    />
                    <input
                      type="text"
                      disabled={Boolean(selectedCue.isBlankCue)}
                      value={selectedCue.text}
                      onChange={(e) => {
                        // Satu cue = satu baris, cegah newline
                        const cleanOneLine = e.target.value.replace(/\r?\n/g, ' ');
                        updateSelectedCue((c) => ({
                          ...c,
                          text: cleanOneLine,
                        }));
                        // Jika baris ini sedang tayang Live, langsung sinkronkan ke layar panggung
                        if (engineState.liveCueId === selectedCue.id && engineRef.current) {
                          sendCommand('APPLY_TO_LIVE');
                        }
                      }}
                      placeholder={
                        selectedCue.isBlankCue
                          ? '[Cue Kosong Eksplisit — Matikan toggle Jeda Kosong untuk mengisi teks]'
                          : 'Ketik satu baris lirik di sini (tekan Enter untuk tayang)...'
                      }
                      className="flex-1 px-3 py-1.5 rounded text-sm font-semibold bg-[#07090e] border border-white/15 text-white focus:border-[#00f0ff] focus:outline-none disabled:opacity-50"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] px-2 py-1 rounded bg-[#07090e] border border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedCue.isBlankCue)}
                        onChange={(e) =>
                          updateSelectedCue((c) => ({
                            ...c,
                            isBlankCue: e.target.checked,
                          }))
                        }
                        className="accent-[#00f0ff]"
                      />
                      <span>Jeda Kosong</span>
                    </label>
                  </div>

                  {/* Peringatan Satu Baris (Auto-Shrink / Overflow) */}
                  {lineFitEvaluation && !lineFitEvaluation.fitsAtBaseSize && (
                    <div
                      className={`mt-2 px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 border ${
                        lineFitEvaluation.fitsAtMinSize
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-red-500/15 border-red-500/40 text-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{lineFitEvaluation.warning}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const idx = activeSong.cues.findIndex(
                            (c) => c.id === selectedCue.id
                          );
                          if (idx < 0) return;
                          const [first, second] = splitCueIntoTwo(selectedCue);
                          updateActiveSong((song) => {
                            const arr = [...song.cues];
                            arr.splice(idx, 1, first, second);
                            return { ...song, cues: arr };
                          });
                          showToast('Cue dibagi menjadi 2 baris.', 'success');
                        }}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold shrink-0"
                      >
                        Bagi 2 Cue
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dual Monitor Header with Layout Switcher */}
              <div className="px-3 pt-2 pb-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-[11px] tracking-wide uppercase">
                    Dual Monitor Output
                  </span>
                  <span className="text-[10px] text-[#64748b]">
                    {monitorLayout === 'stacked'
                      ? '• Atas-Bawah (Layar Lebar & Besar)'
                      : '• Berdampingan'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setMonitorLayout((m) =>
                        m === 'stacked' ? 'side-by-side' : 'stacked'
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07090e] border border-white/10 text-xs font-semibold hover:border-white/20 text-[#94a3b8] hover:text-white transition"
                    title="Ganti tata letak monitor antara Atas-Bawah (Besar) atau Berdampingan"
                  >
                    {monitorLayout === 'stacked' ? (
                      <>
                        <ArrowDown className="w-3.5 h-3.5 text-[#00f0ff]" />
                        <span className="text-[#00f0ff] font-bold">
                          Atas-Bawah (Besar)
                        </span>
                      </>
                    ) : (
                      <>
                        <Columns className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span className="text-[#38bdf8] font-bold">
                          Berdampingan
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dual Monitor: PREVIEW & LIVE OUTPUT */}
              <div
                className={`p-3 gap-3 flex-1 overflow-y-auto ${
                  monitorLayout === 'stacked'
                    ? 'flex flex-col'
                    : 'grid grid-cols-1 xl:grid-cols-2'
                }`}
              >
                {/* MONITOR 1: PREVIEW EDITOR */}
                <div
                  className="flex flex-col rounded-xl border p-2.5"
                  style={{
                    backgroundColor: 'rgba(14,20,34,0.85)',
                    borderColor: 'rgba(0,240,255,0.28)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#00f0ff]/15 text-[#00f0ff]"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        PREVIEW
                      </span>
                      <span className="text-xs text-[#94a3b8] truncate">
                        {selectedCue
                          ? `Cue #${
                              activeSong.cues.findIndex(
                                (c) => c.id === selectedCue.id
                              ) + 1
                            }`
                          : 'Belum dipilih'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        value={previewBackdrop}
                        onChange={(e) =>
                          setPreviewBackdrop(
                            e.target.value as PreviewBackdropMode
                          )
                        }
                        className="px-1.5 py-0.5 rounded text-[10px] bg-[#07090e] border border-white/10 text-[#94a3b8]"
                        title="Uji latar belakang transparansi Preview (tidak masuk ke NDI)"
                      >
                        <option value="checkerboard">Latar: Checkerboard</option>
                        <option value="black">Latar: Hitam (#000)</option>
                        <option value="white">Latar: Putih (#FFF)</option>
                        <option value="red">Latar: Merah Kontras</option>
                        <option value="stage-synth">Latar: Stage Grid</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowSafeArea((v) => !v)}
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          showSafeArea
                            ? 'border-[#00f0ff]/50 text-[#00f0ff] bg-[#00f0ff]/10'
                            : 'border-white/10 text-[#64748b]'
                        }`}
                        title="Tampilkan garis bantu Safe Area 90% & 80%"
                      >
                        Safe Area
                      </button>
                    </div>
                  </div>

                  {/* Kanvas Berlapis Preview (Backdrop terpisah dari Alpha Buffer) */}
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                    <canvas
                      ref={previewBackdropCanvasRef}
                      width={960}
                      height={540}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                    <canvas
                      ref={previewAlphaCanvasRef}
                      width={960}
                      height={540}
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <div
                      className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded text-[10px] bg-black/65 text-[#94a3b8]"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {previewDiag?.wasAutoShrunk
                        ? `Auto-Fit: ${previewDiag.actualFontSizePx * 2}px`
                        : `Font: ${resolvedStyle.fontSize}px`}{' '}
                      • X:{Math.round(resolvedStyle.x * 100)}% Y:
                      {Math.round(resolvedStyle.y * 100)}%
                    </div>
                  </div>

                  {/* Kontrol Uji Fase Animasi di Preview */}
                  <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-[#64748b] mr-1">Uji Fase:</span>
                      {(['auto', 'Entering', 'Holding', 'Exiting'] as const).map(
                        (ph) => (
                          <button
                            key={ph}
                            type="button"
                            onClick={() => {
                              previewPhaseStartRef.current = performance.now();
                              setPreviewTestPhase(ph);
                              setPreviewResetKey((k) => k + 1);
                            }}
                            className={`px-2 py-0.5 rounded font-semibold ${
                              previewTestPhase === ph
                                ? 'bg-[#00f0ff] text-[#07090e]'
                                : 'bg-[#07090e] text-[#94a3b8] hover:text-white'
                            }`}
                          >
                            {ph === 'auto'
                              ? 'IN→HOLD'
                              : ph === 'Entering'
                              ? 'IN'
                              : ph === 'Holding'
                              ? 'HOLD'
                              : 'OUT'}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        previewPhaseStartRef.current = performance.now();
                        setPreviewResetKey((k) => k + 1);
                      }}
                      className="px-2 py-0.5 rounded bg-[#07090e] border border-white/10 text-[#94a3b8] hover:text-white flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Ulang Preview</span>
                    </button>
                  </div>
                </div>

                {/* MONITOR 2: LIVE ALPHA OUTPUT (Murni tanpa UI) */}
                <div
                  className="flex flex-col rounded-xl border p-2.5"
                  style={{
                    backgroundColor: 'rgba(14,20,34,0.85)',
                    borderColor:
                      engineState.phase === 'Blank' ||
                      engineState.phase === 'Ready'
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(16, 185, 129, 0.5)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          engineState.phase === 'Blank' ||
                          engineState.phase === 'Ready'
                            ? 'bg-white/10 text-[#94a3b8]'
                            : 'bg-[#10b981] text-[#07090e]'
                        }`}
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        LIVE OUTPUT • {engineState.phase.toUpperCase()}
                      </span>
                      <span className="text-xs text-[#94a3b8] truncate">
                        {engineState.liveSnapshot
                          ? `Cue #${engineState.liveSnapshot.index + 1}`
                          : 'Frame Transparan (Alpha=0)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        value={liveBackdrop}
                        onChange={(e) =>
                          setLiveBackdrop(
                            e.target.value as PreviewBackdropMode
                          )
                        }
                        className="px-1.5 py-0.5 rounded text-[10px] bg-[#07090e] border border-white/10 text-[#94a3b8]"
                        title="Simulasi latar belakang layer bawah Resolume"
                      >
                        <option value="checkerboard">Simulasi: Alpha Grid</option>
                        <option value="stage-synth">Simulasi: Visual Resolume</option>
                        <option value="black">Simulasi: Hitam</option>
                        <option value="white">Simulasi: Putih</option>
                        <option value="red">Simulasi: Merah</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleDownloadAlphaPng}
                        className="px-1.5 py-0.5 rounded text-[10px] border border-[#00f0ff]/40 text-[#00f0ff] bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20"
                        title="Unduh frame PNG transparan murni untuk verifikasi kanal Alpha"
                      >
                        PNG Alpha
                      </button>
                    </div>
                  </div>

                  {/* Kanvas Berlapis Live (liveAlphaCanvasRef murni RGBA transparan tanpa UI) */}
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                    <canvas
                      ref={liveBackdropCanvasRef}
                      width={project.output.width || 1920}
                      height={project.output.height || 1080}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                    <canvas
                      ref={liveAlphaCanvasRef}
                      width={project.output.width || 1920}
                      height={project.output.height || 1080}
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <div
                      className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded text-[10px] bg-black/65 text-[#94a3b8]"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {project.output.width}×{project.output.height} • RGBA Alpha • UI-Free Surface
                    </div>
                  </div>

                  {/* Ringkasan Baris Live & Baris Berikutnya */}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="px-2 py-1 rounded bg-[#07090e] border border-white/5 truncate">
                      <span className="text-[#64748b] mr-1">Tayang:</span>
                      <span className="text-[#10b981] font-semibold">
                        {engineState.liveSnapshot?.text ||
                          (engineState.liveSnapshot?.isBlankCue
                            ? '[Jeda Kosong]'
                            : '— Transparan —')}
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded bg-[#07090e] border border-white/5 truncate">
                      <span className="text-[#64748b] mr-1">Berikutnya:</span>
                      <span className="text-[#f1f5f9]">
                        {nextUpcomingCue?.text ||
                          (nextUpcomingCue?.isBlankCue
                            ? '[Jeda Kosong]'
                            : '— Akhir Lagu —')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================================================== */}
              {/* TRANSPORT BAWAH (GO, Previous, Next, Replay, Blank, Restore) */}
              {/* =========================================================== */}
              <div
                className="p-3 border-t mt-auto"
                style={{
                  backgroundColor: '#0c101b',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      sendCommand('GO_CUE', { cueId: selectedCue?.id })
                    }
                    className="flex flex-col items-center justify-center py-2.5 px-3 rounded-lg font-extrabold text-sm bg-[#00f0ff] text-[#07090e] hover:brightness-110 shadow-lg shadow-[#00f0ff]/15 transition"
                  >
                    <div className="flex items-center gap-1">
                      <Play className="w-4 h-4 fill-current" />
                      <span>GO LIVE</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-mono">
                      Enter
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendCommand('PREVIOUS')}
                    className="flex flex-col items-center justify-center py-2.5 px-3 rounded-lg font-bold text-sm bg-[#141c30] hover:bg-[#1e293b] text-white border border-white/10 transition"
                  >
                    <div className="flex items-center gap-1">
                      <SkipBack className="w-4 h-4" />
                      <span>PREV</span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono">
                      ← / PgUp
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendCommand('NEXT')}
                    className="flex flex-col items-center justify-center py-2.5 px-3 rounded-lg font-extrabold text-sm bg-[#10b981] text-[#07090e] hover:brightness-110 shadow-lg shadow-[#10b981]/15 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>NEXT</span>
                      <SkipForward className="w-4 h-4 fill-current" />
                    </div>
                    <span className="text-[10px] opacity-80 font-mono">
                      → / PgDn
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendCommand('REPLAY')}
                    className="flex flex-col items-center justify-center py-2.5 px-3 rounded-lg font-bold text-sm bg-[#141c30] hover:bg-[#1e293b] text-white border border-white/10 transition"
                  >
                    <div className="flex items-center gap-1">
                      <RotateCcw className="w-4 h-4 text-[#38bdf8]" />
                      <span>REPLAY</span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono">
                      Key: R
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendCommand('BLANK', { immediate: false })
                    }
                    className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-lg font-bold text-sm border transition ${
                      engineState.phase === 'Blank'
                        ? 'bg-amber-500 text-[#07090e] border-amber-400'
                        : 'bg-[#141c30] hover:bg-[#1e293b] text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <EyeOff className="w-4 h-4" />
                      <span>BLANK</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-mono">
                      Key: B (Anim Out)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendCommand('RESTORE')}
                    className="flex flex-col items-center justify-center py-2.5 px-3 rounded-lg font-bold text-sm bg-[#141c30] hover:bg-[#1e293b] text-[#00f0ff] border border-[#00f0ff]/30 transition"
                  >
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>RESTORE</span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono">
                      Shift+B
                    </span>
                  </button>
                </div>

                {/* Kebijakan Pergantian Cue & Mode Blank (Bagian 9) */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#94a3b8]">
                  <div className="flex items-center gap-2">
                    <span>Transisi Cue:</span>
                    <select
                      value={activeSong?.transitionPolicy || 'strict-single'}
                      onChange={(e) =>
                        updateActiveSong((s) => ({
                          ...s,
                          transitionPolicy: e.target.value as TransitionPolicy,
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-[#07090e] border border-white/10 text-white text-xs"
                    >
                      <option value="strict-single">
                        Strict-Single (OUT selesai → IN baru)
                      </option>
                      <option value="cut">Cut Langsung</option>
                      <option value="crossfade">
                        Crossfade (2 baris saat transisi)
                      </option>
                    </select>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!blankImmediate}
                      onChange={(e) => setBlankImmediate(!e.target.checked)}
                      className="accent-[#00f0ff]"
                    />
                    <span>Gunakan Fade-Out saat Blank</span>
                  </label>
                </div>
              </div>
            </main>

            {/* ------------------------------------------------------------- */}
            {/* KOLOM KANAN (4 cols): INSPECTOR FONT, STYLE, ANIMASI & OUTPUT */}
            {/* ------------------------------------------------------------- */}
            <aside
              className="lg:col-span-4 flex flex-col border-l overflow-hidden min-h-0 h-full"
              style={{
                backgroundColor: '#0c101b',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              {/* Tab Header Inspector (4 Menu: Ringkasan | Font & Warna | Animasi | Output) */}
              <div className="grid grid-cols-4 border-b border-white/10 bg-[#07090e]">
                <button
                  type="button"
                  onClick={() => setInspectorTab('dashboard')}
                  className={`py-2.5 px-1 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                    inspectorTab === 'dashboard'
                      ? 'border-[#00f0ff] text-[#00f0ff] bg-[#141c30]/50'
                      : 'border-transparent text-[#94a3b8] hover:text-white'
                  }`}
                  title="Ringkasan & Dashboard Cepat: Pantau ringkasan tema dan atur Font, Warna, serta Animasi dalam 1 layar"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Ringkasan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('style')}
                  className={`py-2.5 px-1 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                    inspectorTab === 'style'
                      ? 'border-[#00f0ff] text-[#00f0ff] bg-[#141c30]/50'
                      : 'border-transparent text-[#94a3b8] hover:text-white'
                  }`}
                  title="Pengaturan lengkap Tipografi Font, Posisi Layar, Warna, Gradasi, Outline, Glow & Shadow"
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Font & Warna</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('animation')}
                  className={`py-2.5 px-1 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                    inspectorTab === 'animation'
                      ? 'border-[#00f0ff] text-[#00f0ff] bg-[#141c30]/50'
                      : 'border-transparent text-[#94a3b8] hover:text-white'
                  }`}
                  title="Detail kurva & parameter animasi Fase IN (Masuk), HOLD (Stay), dan OUT (Keluar)"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Animasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('output')}
                  className={`py-2.5 px-1 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                    inspectorTab === 'output'
                      ? 'border-[#00f0ff] text-[#00f0ff] bg-[#141c30]/50'
                      : 'border-transparent text-[#94a3b8] hover:text-white'
                  }`}
                  title="Pengaturan NDI Live Streaming, Remote Kontrol HP Wi-Fi QR, dan Resolusi Output"
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Output</span>
                </button>
              </div>

              {/* Isi Tab Inspector */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                {/* TAB 1: RINGKASAN / DASHBOARD (ALUR: 1. TEMA -> 2. FONT -> 3. ANIMASI) */}
                {inspectorTab === 'dashboard' && (
                  <div className="space-y-3.5">
                    {/* KARTU RINGKASAN STATUS VISUAL & ANIMASI AKTIF */}
                    <div className="p-2.5 rounded-xl bg-[#07090e] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#00f0ff]" />
                          <span>Status Konfigurasi Aktif</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#64748b]">
                          {activeSong?.cues.length || 0} Baris
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectorTab('style')}
                          className="p-2 rounded-lg bg-[#0c101b] border border-white/5 hover:border-[#d946ef]/40 text-left transition group"
                          title="Klik untuk membuka tab Font & Warna"
                        >
                          <div className="text-[9px] uppercase tracking-wider text-[#64748b] flex items-center justify-between">
                            <span>Tema & Warna</span>
                            <Palette className="w-3 h-3 text-[#d946ef] opacity-70 group-hover:opacity-100" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: resolvedStyle.fill }}
                            />
                            {resolvedStyle.useGradient && (
                              <span
                                className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: resolvedStyle.gradientEnd }}
                              />
                            )}
                            <span className="text-[10px] font-semibold text-white truncate">
                              {resolvedStyle.charBoxMode === 'marker-highlight'
                                ? 'Stabilo'
                                : resolvedStyle.charBoxMode === 'liquid-drip'
                                ? 'Leleh'
                                : resolvedStyle.charStyleMode === 'ransom-mixed'
                                ? 'Ransom'
                                : resolvedStyle.charBoxMode === 'comic-blocks'
                                ? 'Kotak'
                                : resolvedStyle.charBoxMode === 'confetti-tags'
                                ? 'Kartu'
                                : resolvedStyle.charBoxMode === 'rgb-split'
                                ? 'Glitch RGB'
                                : resolvedStyle.charBoxMode === 'neon-ribbon'
                                ? 'Pita'
                                : resolvedStyle.charStyleMode === 'pop-alternating'
                                ? 'Pelangi'
                                : (resolvedStyle.outerOutlineWidth ?? 0) > 0
                                ? 'Stiker'
                                : (resolvedStyle.extrudeDepth ?? 0) > 0
                                ? '3D'
                                : 'Standar'}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#94a3b8] mt-0.5">
                            Out:{resolvedStyle.outlineWidth} • Glow:{resolvedStyle.glowRadius}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectorTab('style')}
                          className="p-2 rounded-lg bg-[#0c101b] border border-white/5 hover:border-[#00f0ff]/40 text-left transition group"
                          title="Klik untuk membuka tab Font & Warna"
                        >
                          <div className="text-[9px] uppercase tracking-wider text-[#64748b] flex items-center justify-between">
                            <span>Font</span>
                            <Type className="w-3 h-3 text-[#00f0ff] opacity-70 group-hover:opacity-100" />
                          </div>
                          <div className="text-[11px] font-bold text-white truncate mt-0.5">
                            {resolvedStyle.fontFamily.split(',')[0].replace(/"/g, '')}
                          </div>
                          <div className="text-[10px] font-mono text-[#00f0ff]">
                            {resolvedStyle.fontSize}px • Y:{Math.round(resolvedStyle.y * 100)}%
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectorTab('animation')}
                          className="p-2 rounded-lg bg-[#0c101b] border border-white/5 hover:border-[#38bdf8]/40 text-left transition group"
                          title="Klik untuk membuka tab Animasi"
                        >
                          <div className="text-[9px] uppercase tracking-wider text-[#64748b] flex items-center justify-between">
                            <span>Animasi</span>
                            <Sparkles className="w-3 h-3 text-[#38bdf8] opacity-70 group-hover:opacity-100" />
                          </div>
                          <div className="text-[11px] font-bold text-white truncate mt-0.5">
                            IN: {resolvedAnim.in.type}
                          </div>
                          <div className="text-[10px] font-mono text-[#10b981] truncate">
                            HOLD: {resolvedAnim.hold.type}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* LANGKAH 1: PILIH TEMA & WARNA */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#a855f7]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#d946ef] flex items-center gap-1.5 text-xs">
                          <Palette className="w-4 h-4" />
                          <span>1. PILIH TEMA & WARNA</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleResetAllToTheme}
                            title={`Reset semua slider & efek kembali ke default tema "${activeStageTheme.label}"`}
                            className="px-2 py-0.5 rounded bg-[#d946ef]/15 hover:bg-[#d946ef]/30 border border-[#d946ef]/40 text-[#f0abfc] text-[10px] font-bold flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset Default ({activeStageTheme.badge})</span>
                          </button>
                        </div>
                      </div>

                      {/* Pilihan Gaya / Tema Teks (10 Tema Panggung Inovatif) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {stageThemesList.map((st) => (
                          <button
                            key={st.label}
                            type="button"
                            onClick={() => updateMultipleCueStyleOverrides(st.style, st.anim)}
                            className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border text-left truncate transition flex items-center justify-between gap-1.5 ${
                              st.isActive
                                ? 'bg-[#d946ef]/20 border-[#d946ef] text-white shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                                : 'bg-[#0c101b] border-white/10 hover:border-[#d946ef]/50 text-[#f1f5f9]'
                            }`}
                          >
                            <span className="truncate">{st.label}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#d946ef]/20 text-[#f0abfc] text-[9px] font-mono shrink-0">
                              {st.badge}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Atur Warna Sendiri */}
                      <div className="p-2 rounded-lg bg-[#0c101b] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#94a3b8]">
                            Warna Utama
                          </span>
                          <input
                            type="color"
                            value={resolvedStyle.fill}
                            onChange={(e) =>
                              updateCueStyleOverride('fill', e.target.value)
                            }
                            className="w-7 h-6 rounded cursor-pointer bg-transparent"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#94a3b8]">
                            <input
                              type="checkbox"
                              checked={resolvedStyle.useGradient}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'useGradient',
                                  e.target.checked
                                )
                              }
                              className="accent-[#d946ef]"
                            />
                            <span>Gradasi 2 Warna</span>
                          </label>
                          {resolvedStyle.useGradient && (
                            <input
                              type="color"
                              value={resolvedStyle.gradientEnd}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'gradientEnd',
                                  e.target.value
                                )
                              }
                              className="w-7 h-6 rounded cursor-pointer bg-transparent"
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[11px] text-[#94a3b8]">
                            Outline Tebal ({resolvedStyle.outlineWidth}px)
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={16}
                              value={resolvedStyle.outlineWidth}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'outlineWidth',
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 accent-white"
                            />
                            <input
                              type="color"
                              value={resolvedStyle.outlineColor}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'outlineColor',
                                  e.target.value
                                )
                              }
                              className="w-6 h-5 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[11px] text-[#94a3b8]">
                            Glow Neon ({resolvedStyle.glowRadius}px)
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={36}
                              value={resolvedStyle.glowRadius}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateCueStyleOverride('glowRadius', val);
                                if (val > 0 && resolvedStyle.glowIntensity === 0) {
                                  updateCueStyleOverride('glowIntensity', 1.0);
                                }
                              }}
                              className="w-20 accent-[#00f0ff]"
                            />
                            <input
                              type="color"
                              value={resolvedStyle.glowColor}
                              onChange={(e) =>
                                updateCueStyleOverride('glowColor', e.target.value)
                              }
                              className="w-6 h-5 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LANGKAH 2: PILIH FONT & POSISI */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#00f0ff]/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#00f0ff] flex items-center gap-1.5 text-xs">
                          <Type className="w-4 h-4" />
                          <span>2. PILIH FONT & POSISI</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#94a3b8] font-mono">
                            {resolvedStyle.fontSize}px
                          </span>
                          <button
                            type="button"
                            onClick={handleResetTypographyToTheme}
                            title={`Reset font & ukuran ke default tema "${activeStageTheme.label}"`}
                            className="px-1.5 py-0.5 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/25 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] font-semibold flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset Font</span>
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Font */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#94a3b8] block">
                          Font Panggung ({AVAILABLE_STAGE_FONTS.length + customFonts.length} Pilihan)
                        </label>
                        <select
                          value={resolvedStyle.fontFamily}
                          onChange={(e) =>
                            updateCueStyleOverride('fontFamily', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#0c101b] border border-white/15 text-white font-semibold text-xs"
                        >
                          {[...customFonts, ...AVAILABLE_STAGE_FONTS].map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        {/* Tombol Cepat Font Populer (18 Karakteristik Font Panggung) */}
                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          {[
                            { name: 'Fredoka', val: '"Fredoka", "Outfit", sans-serif' },
                            { name: 'Luckiest', val: '"Luckiest Guy", Impact, sans-serif' },
                            { name: 'Wet Paint', val: '"Rubik Wet Paint", Impact, sans-serif' },
                            { name: 'Titan 3D', val: '"Titan One", "Luckiest Guy", sans-serif' },
                            { name: 'Bangers', val: '"Bangers", Impact, sans-serif' },
                            { name: 'Shrikhand', val: '"Shrikhand", Georgia, serif' },
                            { name: 'Spicy Rice', val: '"Spicy Rice", Georgia, serif' },
                            { name: 'Boogaloo', val: '"Boogaloo", Impact, sans-serif' },
                            { name: 'Carter One', val: '"Carter One", Impact, sans-serif' },
                            { name: 'Alfa Slab', val: '"Alfa Slab One", Georgia, serif' },
                            { name: 'Russo Cyber', val: '"Russo One", Impact, sans-serif' },
                            { name: 'Fugaz Speed', val: '"Fugaz One", Impact, sans-serif' },
                            { name: 'Rubik Block', val: '"Rubik Mono One", Impact, sans-serif' },
                            { name: 'Bungee', val: '"Bungee", Impact, sans-serif' },
                            { name: 'Creepster', val: '"Creepster", Impact, cursive' },
                            { name: 'Marker', val: '"Permanent Marker", cursive, sans-serif' },
                            { name: 'Lobster', val: '"Lobster", Georgia, cursive' },
                            { name: '8-Bit Pixel', val: '"Press Start 2P", monospace' },
                          ].map((qf) => (
                            <button
                              key={qf.name}
                              type="button"
                              onClick={() => updateCueStyleOverride('fontFamily', qf.val)}
                              style={{ fontFamily: qf.val }}
                              className={`px-1.5 py-1 rounded text-[11px] truncate border transition ${
                                resolvedStyle.fontFamily === qf.val
                                  ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                                  : 'bg-[#0c101b] border-white/10 text-white/85 hover:border-white/30 hover:text-white'
                              }`}
                            >
                              {qf.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tombol Ukuran Cepat + Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-[#94a3b8]">
                            Ukuran Huruf
                          </label>
                          <div className="flex items-center gap-1">
                            {[
                              { label: 'Kecil', sz: 76 },
                              { label: 'Normal', sz: 94 },
                              { label: 'Besar', sz: 114 },
                            ].map((s) => (
                              <button
                                key={s.sz}
                                type="button"
                                onClick={() =>
                                  updateCueStyleOverride('fontSize', s.sz)
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                  resolvedStyle.fontSize === s.sz
                                    ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                                    : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="range"
                          min={48}
                          max={160}
                          step={2}
                          value={resolvedStyle.fontSize}
                          onChange={(e) =>
                            updateCueStyleOverride(
                              'fontSize',
                              Number(e.target.value)
                            )
                          }
                          className="w-full accent-[#00f0ff]"
                        />
                      </div>

                      {/* Gaya Tebal/Miring & Posisi Layar */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                        <div>
                          <label className="text-[10px] text-[#94a3b8] block mb-1">
                            Gaya Huruf
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateCueStyleOverride(
                                  'fontWeight',
                                  resolvedStyle.fontWeight >= 700 ? 400 : 900
                                )
                              }
                              className={`flex-1 py-1 rounded text-xs font-bold border transition ${
                                resolvedStyle.fontWeight >= 700
                                  ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                                  : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                              }`}
                            >
                              Bold
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateCueStyleOverride(
                                  'italic',
                                  !resolvedStyle.italic
                                )
                              }
                              className={`flex-1 py-1 rounded text-xs italic font-serif border transition ${
                                resolvedStyle.italic
                                  ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                                  : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                              }`}
                            >
                              Italic
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-[#94a3b8] block mb-1">
                            Posisi Layar
                          </label>
                          <div className="flex items-center gap-1">
                            {[
                              { label: 'Atas', y: 0.35 },
                              { label: 'Tengah', y: 0.5 },
                              { label: 'Bawah', y: 0.82 },
                            ].map((pos) => (
                              <button
                                key={pos.label}
                                type="button"
                                onClick={() =>
                                  updateCueStyleOverride('y', pos.y)
                                }
                                className={`flex-1 py-1 rounded text-[10px] font-semibold border transition ${
                                  Math.abs(resolvedStyle.y - pos.y) < 0.05
                                    ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                                    : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LANGKAH 3: GAYA ANIMASI IN (MASUK — MOTION GRAPHICS) */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#38bdf8]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#38bdf8] flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-4 h-4" />
                          <span>3. MOTION GRAPHICS MASUK (IN)</span>
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono">
                          {resolvedAnim.in.durationMs}ms
                        </span>
                      </div>

                      {/* Tombol Grid Pilihan Animasi IN (Curated Motion Graphics) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            id: 'popBounce',
                            label: 'Pop Elastic (Komik Lompat)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'kineticSlam',
                            label: 'Kinetic Slam (Hantam Layar)',
                            icon: <ZoomIn className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'whipSlide',
                            label: 'Whip Skew (Sabet Miring)',
                            icon: <Wind className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'flip3d',
                            label: '3D Flip Card (Putar Balik)',
                            icon: <RefreshCw className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'spiralDrop',
                            label: 'Spiral Tornado (Jatuh Putar)',
                            icon: <RotateCcw className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'glitchIn',
                            label: 'Cyber Glitch (Kedip Siber)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'typewriter',
                            label: 'Typewriter Stomp (Ketik)',
                            icon: <Type className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'trackingExpand',
                            label: 'Cinema Expand (Melebar)',
                            icon: <ChevronsLeftRight className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'wordsRiseBlur',
                            label: 'Words Rise (Kata Naik Lembut)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'charMaskRise',
                            label: 'Editorial Mask (Angkat Huruf 8°)',
                            icon: <Type className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'clipReveal',
                            label: 'Laser Wipe (Sapuan Miring)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'slamStamp',
                            label: 'Impact Stamp (Hentakan Miring)',
                            icon: <ZoomIn className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'linesFromSides',
                            label: 'Kinetic Split (Kiri & Kanan)',
                            icon: <ChevronsLeftRight className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'scrambleText',
                            label: 'Cyber Decrypt (Matriks Huruf)',
                            icon: <RefreshCw className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'none',
                            label: 'Hard Cut (Instan 0ms)',
                            icon: <Square className="w-3.5 h-3.5 shrink-0" />,
                          },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              updateCueAnimationOverride(
                                'in',
                                'type',
                                m.id as AnimationInType
                              );
                              setPreviewResetKey((k) => k + 1);
                            }}
                            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left truncate transition flex items-center gap-1.5 ${
                              resolvedAnim.in.type === m.id
                                ? 'bg-[#38bdf8] text-black shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border border-white/10'
                            }`}
                          >
                            {m.icon}
                            <span className="truncate">{m.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Pilihan Kecepatan Masuk */}
                      <div>
                        <label className="text-[10px] text-[#94a3b8] block mb-1">
                          Kecepatan Animasi Masuk
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            {
                              label: 'Cepat',
                              dur: 260,
                              stag: 35,
                              icon: <Zap className="w-3 h-3 shrink-0" />,
                            },
                            {
                              label: 'Sedang',
                              dur: 420,
                              stag: 50,
                              icon: <Gauge className="w-3 h-3 shrink-0" />,
                            },
                            {
                              label: 'Lambat',
                              dur: 650,
                              stag: 75,
                              icon: <Waves className="w-3 h-3 shrink-0" />,
                            },
                          ].map((spd) => (
                            <button
                              key={spd.label}
                              type="button"
                              onClick={() => {
                                updateCueAnimationOverride(
                                  'in',
                                  'durationMs',
                                  spd.dur
                                );
                                updateCueAnimationOverride(
                                  'in',
                                  'staggerMs',
                                  spd.stag
                                );
                                setPreviewResetKey((k) => k + 1);
                              }}
                              className={`py-1 rounded text-[10px] font-semibold border transition flex items-center justify-center gap-1 ${
                                Math.abs(resolvedAnim.in.durationMs - spd.dur) < 40
                                  ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                                  : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                              }`}
                            >
                              {spd.icon}
                              <span>{spd.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pemicu Animasi Masuk */}
                      <div>
                        <label className="text-[10px] text-[#94a3b8] block mb-1">
                          Pemicu Putar Animasi Masuk
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'in',
                                'inScope',
                                'from-blank'
                              )
                            }
                            className={`px-2 py-1.5 rounded text-[10px] font-semibold text-center border transition flex items-center justify-center gap-1.5 ${
                              resolvedAnim.in.inScope === 'from-blank'
                                ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border-white/10'
                            }`}
                            title="Hanya putar animasi saat teks masuk dari Blank/Hide"
                          >
                            <Crosshair className="w-3 h-3 shrink-0" />
                            <span>Dari Blank Saja</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'in',
                                'inScope',
                                'every-cue'
                              )
                            }
                            className={`px-2 py-1.5 rounded text-[10px] font-semibold text-center border transition flex items-center justify-center gap-1.5 ${
                              resolvedAnim.in.inScope !== 'from-blank'
                                ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border-white/10'
                            }`}
                            title="Putar animasi setiap ganti kalimat"
                          >
                            <RefreshCw className="w-3 h-3 shrink-0" />
                            <span>Tiap Kalimat</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* LANGKAH 4: GAYA ANIMASI SETELAH IN / STAY (HOLD — MOTION GRAPHICS) */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#10b981]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#10b981] flex items-center gap-1.5 text-xs">
                          <Activity className="w-4 h-4" />
                          <span>4. MOTION GRAPHICS STAY (HOLD)</span>
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono">
                          {resolvedAnim.hold.type === 'static'
                            ? 'Diam'
                            : `${resolvedAnim.hold.cycleMs}ms`}
                        </span>
                      </div>

                      {/* Tombol Grid Pilihan Animasi Stay */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            id: 'ransomJitter',
                            label: 'Ransom Live (Acak Font+Warna)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'comicBounce',
                            label: 'Comic Rocking (Goyang Komik)',
                            icon: <Music className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'beatStomp',
                            label: 'Beat Stomp (Jedag-Jedug Bass)',
                            icon: <HeartPulse className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'discoWave',
                            label: 'Disco Rainbow (Ombak Warna)',
                            icon: <Palette className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'charWave',
                            label: 'Mexican Wave (Ombak Huruf)',
                            icon: <Waves className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'glitchTwitch',
                            label: 'Glitch Twitch (Kedip Patah)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'pendulumTilt',
                            label: 'Pendulum Swing (Ayun Kamera)',
                            icon: <RefreshCw className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'shineSweep',
                            label: 'Shine Glint (Kilatan Cahaya)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'floatWave',
                            label: 'Dual Wave Float (Ayunan Ganda)',
                            icon: <Waves className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'beatBounce',
                            label: 'Beat Kick (Denyut Tempo)',
                            icon: <HeartPulse className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'static',
                            label: 'Static Lock (Diam Tenang)',
                            icon: <Square className="w-3.5 h-3.5 shrink-0" />,
                          },
                        ].map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'hold',
                                'type',
                                h.id as AnimationHoldType
                              )
                            }
                            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left truncate transition flex items-center gap-1.5 ${
                              resolvedAnim.hold.type === h.id
                                ? 'bg-[#10b981] text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border border-white/10'
                            }`}
                          >
                            {h.icon}
                            <span className="truncate">{h.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Kecepatan Gerak Stay */}
                      {resolvedAnim.hold.type !== 'static' && (
                        <div>
                          <label className="text-[10px] text-[#94a3b8] block mb-1">
                            Kecepatan Gerakan Stay
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              {
                                label: 'Cepat',
                                cycle: 1100,
                                icon: <Zap className="w-3 h-3 shrink-0" />,
                              },
                              {
                                label: 'Sedang',
                                cycle: 2000,
                                icon: <Gauge className="w-3 h-3 shrink-0" />,
                              },
                              {
                                label: 'Lembut',
                                cycle: 3200,
                                icon: <Waves className="w-3 h-3 shrink-0" />,
                              },
                            ].map((spd) => (
                              <button
                                key={spd.label}
                                type="button"
                                onClick={() =>
                                  updateCueAnimationOverride(
                                    'hold',
                                    'cycleMs',
                                    spd.cycle
                                  )
                                }
                                className={`py-1 rounded text-[10px] font-semibold border transition flex items-center justify-center gap-1 ${
                                  Math.abs(resolvedAnim.hold.cycleMs - spd.cycle) < 350
                                    ? 'bg-[#10b981] text-black border-[#10b981]'
                                    : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                                }`}
                              >
                                {spd.icon}
                                <span>{spd.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* LANGKAH 5: GAYA ANIMASI KELUAR (OUT — MOTION GRAPHICS) */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#f59e0b]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#f59e0b] flex items-center gap-1.5 text-xs">
                          <EyeOff className="w-4 h-4" />
                          <span>5. MOTION GRAPHICS KELUAR (OUT)</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#94a3b8]">
                          {resolvedAnim.out.type === 'cut'
                            ? '0ms'
                            : `${resolvedAnim.out.durationMs}ms`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            id: 'popScatter',
                            label: 'Explode Scatter (Mental Acak)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'whipOut',
                            label: 'Whip Speed (Sabet Keluar)',
                            icon: <Wind className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'dropGravity',
                            label: 'Gravity Drop (Rontok Jatuh)',
                            icon: <ArrowDown className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'glitchOut',
                            label: 'Glitch Disintegrate (Rusak)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'implodeZoom',
                            label: 'Vortex Implode (Hisap Tengah)',
                            icon: <Minimize2 className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'wordsExit',
                            label: 'Words Disperse (Kata Menguap)',
                            icon: <Wind className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'flashCut',
                            label: 'Flash Impact (Kilat Putih 80ms)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'cut',
                            label: 'Hard Cut (Putus Instan 0ms)',
                            icon: <Square className="w-3.5 h-3.5 shrink-0" />,
                          },
                        ].map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'out',
                                'type',
                                o.id as AnimationOutType
                              )
                            }
                            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left truncate transition flex items-center gap-1.5 ${
                              resolvedAnim.out.type === o.id
                                ? 'bg-[#f59e0b] text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border border-white/10'
                            }`}
                          >
                            {o.icon}
                            <span className="truncate">{o.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TEMA, FONT & WARNA (URUTAN: 1. TEMA & WARNA -> 2. FONT -> 3. POSISI) */}
                {inspectorTab === 'style' && (
                  <div className="space-y-3.5">
                    {/* BAGIAN 1: PILIH TEMA & WARNA */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#a855f7]/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#d946ef] flex items-center gap-1.5 text-xs">
                          <Palette className="w-4 h-4" />
                          <span>1. PILIH TEMA & WARNA</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleResetEffectsToTheme}
                            title={`Reset warna, outline, stiker, 3D & glow ke default tema "${activeStageTheme.label}"`}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-[#cbd5e1] text-[10px] font-semibold flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset Efek</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleResetAllToTheme}
                            title={`Reset seluruh slider, font, efek & animasi ke default tema "${activeStageTheme.label}"`}
                            className="px-2 py-0.5 rounded bg-[#d946ef]/15 hover:bg-[#d946ef]/30 border border-[#d946ef]/40 text-[#f0abfc] text-[10px] font-bold flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset Semua ({activeStageTheme.badge})</span>
                          </button>
                        </div>
                      </div>

                      {/* Pilihan Tema / Gaya Teks (10 Tema Panggung Inovatif) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {stageThemesList.map((st) => (
                          <button
                            key={st.label}
                            type="button"
                            onClick={() => updateMultipleCueStyleOverrides(st.style, st.anim)}
                            className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border text-left truncate transition flex items-center justify-between gap-1.5 ${
                              st.isActive
                                ? 'bg-[#d946ef]/20 border-[#d946ef] text-white shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                                : 'bg-[#0c101b] border-white/10 hover:border-[#d946ef]/50 text-[#f1f5f9]'
                            }`}
                          >
                            <span className="truncate">{st.label}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#d946ef]/20 text-[#f0abfc] text-[9px] font-mono shrink-0">
                              {st.badge}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Mode Gaya Huruf & Kotak Latar Karakter */}
                      <div className="p-2.5 rounded-lg bg-[#0c101b] border border-[#d946ef]/30 space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-[#f0abfc] mb-1">
                            Mode Karakter (Ransom / Warna-Warni)
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                { id: 'uniform', label: 'Seragam' },
                                { id: 'ransom-mixed', label: 'Acak Font+Warna' },
                                { id: 'pop-alternating', label: 'Warna-Warni' },
                              ] as Array<{ id: CharStyleMode; label: string }>
                            ).map((cm) => (
                              <button
                                key={cm.id}
                                type="button"
                                onClick={() =>
                                  updateCueStyleOverride('charStyleMode', cm.id)
                                }
                                className={`py-1.5 px-1 rounded border text-[10px] font-semibold truncate ${
                                  (resolvedStyle.charStyleMode || 'uniform') === cm.id
                                    ? 'bg-[#d946ef]/25 border-[#d946ef] text-white'
                                    : 'bg-[#07090e] border-white/10 text-[#94a3b8]'
                                }`}
                              >
                                {cm.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#f0abfc] mb-1">
                            Efek Latar & Ornamen Huruf (Leleh / Kotak / Pita / RGB)
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                { id: 'none', label: 'Tanpa Efek' },
                                { id: 'marker-highlight', label: 'Stabilo Pop' },
                                { id: 'liquid-drip', label: 'Liquid Leleh' },
                                { id: 'rgb-split', label: 'RGB Split' },
                                { id: 'neon-ribbon', label: 'Pita Panggung' },
                                { id: 'confetti-tags', label: 'Confetti Tags' },
                                { id: 'comic-blocks', label: 'Comic Blocks' },
                              ] as Array<{ id: CharBoxMode; label: string }>
                            ).map((bm) => (
                              <button
                                key={bm.id}
                                type="button"
                                onClick={() =>
                                  updateCueStyleOverride('charBoxMode', bm.id)
                                }
                                className={`py-1.5 px-1 rounded border text-[10px] font-semibold truncate ${
                                  (resolvedStyle.charBoxMode || 'none') === bm.id
                                    ? 'bg-[#d946ef]/25 border-[#d946ef] text-white'
                                    : 'bg-[#07090e] border-white/10 text-[#94a3b8]'
                                }`}
                              >
                                {bm.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mode Render Teks */}
                      <div>
                        <label className="block text-[10px] text-[#94a3b8] mb-1">
                          Mode Render Teks
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'fill-outline', label: 'Fill + Outline' },
                              { id: 'fill', label: 'Fill Saja' },
                              { id: 'outline', label: 'Outline Saja' },
                            ] as Array<{ id: FillMode; label: string }>
                          ).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() =>
                                updateCueStyleOverride('fillMode', m.id)
                              }
                              className={`py-1.5 rounded border text-xs font-semibold ${
                                resolvedStyle.fillMode === m.id
                                  ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                                  : 'bg-[#0c101b] border-white/10 text-[#94a3b8]'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Warna Fill & Gradasi */}
                      <div className="p-2.5 rounded-lg bg-[#0c101b] border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#f1f5f9]">
                            Warna Utama (Fill)
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={resolvedStyle.fill}
                              onChange={(e) =>
                                updateCueStyleOverride('fill', e.target.value)
                              }
                              className="w-7 h-6 rounded cursor-pointer bg-transparent"
                            />
                            <span className="font-mono text-[11px]">
                              {resolvedStyle.fill}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[#94a3b8]">
                            <input
                              type="checkbox"
                              checked={resolvedStyle.useGradient}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'useGradient',
                                  e.target.checked
                                )
                              }
                              className="accent-[#00f0ff]"
                            />
                            <span>Aktifkan Gradasi Dua Warna</span>
                          </label>
                          {resolvedStyle.useGradient && (
                            <input
                              type="color"
                              value={resolvedStyle.gradientEnd}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'gradientEnd',
                                  e.target.value
                                )
                              }
                              className="w-7 h-6 rounded cursor-pointer bg-transparent"
                            />
                          )}
                        </div>
                      </div>

                      {/* Outline Dalam & Sticker Border Luar */}
                      <div className="p-2.5 rounded-lg bg-[#0c101b] border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                            Slider Outline, Stiker & 3D
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const s = activeStageTheme.style;
                              updateMultipleCueStyleOverrides({
                                outlineColor: s.outlineColor,
                                outlineWidth: s.outlineWidth,
                                outerOutlineColor: s.outerOutlineColor,
                                outerOutlineWidth: s.outerOutlineWidth,
                                extrudeDepth: s.extrudeDepth,
                                extrudeColor: s.extrudeColor,
                              });
                              showToast(`Outline & 3D di-reset ke default "${activeStageTheme.label}"`, 'info');
                            }}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-[#00f0ff] flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset Default</span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#f1f5f9]">
                              Outline Dalam (Stroke)
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={resolvedStyle.outlineColor}
                                onChange={(e) =>
                                  updateCueStyleOverride(
                                    'outlineColor',
                                    e.target.value
                                  )
                                }
                                className="w-7 h-6 rounded cursor-pointer bg-transparent"
                              />
                              <span className="font-mono text-[#00f0ff]">
                                {resolvedStyle.outlineWidth}px
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            step={0.5}
                            value={resolvedStyle.outlineWidth}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'outlineWidth',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>

                        {/* Sticker Border Luar (Double Outline) */}
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#f0abfc]">
                              Sticker Border Luar (Putih/Kontras)
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={resolvedStyle.outerOutlineColor || '#FFFFFF'}
                                onChange={(e) =>
                                  updateCueStyleOverride(
                                    'outerOutlineColor',
                                    e.target.value
                                  )
                                }
                                className="w-7 h-6 rounded cursor-pointer bg-transparent"
                              />
                              <span className="font-mono text-[#f0abfc]">
                                {resolvedStyle.outerOutlineWidth || 0}px
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={28}
                            step={1}
                            value={resolvedStyle.outerOutlineWidth || 0}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'outerOutlineWidth',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#d946ef]"
                          />
                        </div>

                        {/* 3D Block Extrude */}
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#38bdf8]">
                              Balok 3D Extrude (Retro Block)
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={resolvedStyle.extrudeColor || '#0284C7'}
                                onChange={(e) =>
                                  updateCueStyleOverride(
                                    'extrudeColor',
                                    e.target.value
                                  )
                                }
                                className="w-7 h-6 rounded cursor-pointer bg-transparent"
                              />
                              <span className="font-mono text-[#38bdf8]">
                                {resolvedStyle.extrudeDepth || 0}px
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            step={1}
                            value={resolvedStyle.extrudeDepth || 0}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'extrudeDepth',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#38bdf8]"
                          />
                        </div>
                      </div>

                      {/* Glow Neon */}
                      <div className="p-2.5 rounded-lg bg-[#0c101b] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#f1f5f9]">
                            Outer Glow (Alpha)
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={resolvedStyle.glowColor}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'glowColor',
                                  e.target.value
                                )
                              }
                              className="w-7 h-6 rounded cursor-pointer bg-transparent"
                            />
                            <span className="font-mono text-[#00f0ff]">
                              R:{resolvedStyle.glowRadius}px
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const s = activeStageTheme.style;
                                updateMultipleCueStyleOverrides({
                                  glowColor: s.glowColor,
                                  glowRadius: s.glowRadius,
                                  glowIntensity: s.glowIntensity,
                                });
                                showToast(`Glow di-reset ke default "${activeStageTheme.label}"`, 'info');
                              }}
                              title="Reset Glow sesuai tema"
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-[#00f0ff] flex items-center gap-1 transition"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-[#94a3b8]">
                              Radius Glow
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={48}
                              value={resolvedStyle.glowRadius}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'glowRadius',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-[#00f0ff]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#94a3b8]">
                              Intensitas ({resolvedStyle.glowIntensity.toFixed(1)})
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={1.5}
                              step={0.1}
                              value={resolvedStyle.glowIntensity}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'glowIntensity',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-[#00f0ff]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Drop Shadow */}
                      <div className="p-2.5 rounded-lg bg-[#0c101b] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#f1f5f9]">
                            Drop Shadow
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[#94a3b8]">
                              Opacity: {Math.round(resolvedStyle.shadowOpacity * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const s = activeStageTheme.style;
                                updateMultipleCueStyleOverrides({
                                  shadowBlur: s.shadowBlur,
                                  shadowOpacity: s.shadowOpacity,
                                });
                                showToast(`Shadow di-reset ke default "${activeStageTheme.label}"`, 'info');
                              }}
                              title="Reset Shadow sesuai tema"
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-[#00f0ff] flex items-center gap-1 transition"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-[#94a3b8]">
                              Shadow Blur ({resolvedStyle.shadowBlur}px)
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={36}
                              value={resolvedStyle.shadowBlur}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'shadowBlur',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-[#00f0ff]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#94a3b8]">
                              Shadow Opacity
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={resolvedStyle.shadowOpacity}
                              onChange={(e) =>
                                updateCueStyleOverride(
                                  'shadowOpacity',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-[#00f0ff]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN 2: PILIH FONT & TIPOGRAFI */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#00f0ff]/20 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#00f0ff] flex items-center gap-1.5 text-xs">
                          <Type className="w-4 h-4" />
                          <span>2. PILIH FONT & TIPOGRAFI</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleResetTypographyToTheme}
                            title={`Reset font, ukuran, jarak baris & huruf ke default tema "${activeStageTheme.label}"`}
                            className="px-2 py-0.5 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/25 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] font-semibold flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset Default</span>
                          </button>
                          <label className="text-[11px] text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>Impor .ttf/.otf</span>
                            <input
                              type="file"
                              accept=".ttf,.otf,.woff,.woff2"
                              onChange={handleFontFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <select
                          value={resolvedStyle.fontFamily}
                          onChange={(e) =>
                            updateCueStyleOverride('fontFamily', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#0c101b] border border-white/15 text-white font-semibold"
                        >
                          {[...customFonts, ...AVAILABLE_STAGE_FONTS].map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        {/* Galeri Cepat Font Panggung (Visual Preview — 18 Karakteristik) */}
                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          {[
                            { name: 'Fredoka', val: '"Fredoka", "Outfit", sans-serif' },
                            { name: 'Luckiest', val: '"Luckiest Guy", Impact, sans-serif' },
                            { name: 'Wet Paint', val: '"Rubik Wet Paint", Impact, sans-serif' },
                            { name: 'Titan 3D', val: '"Titan One", "Luckiest Guy", sans-serif' },
                            { name: 'Bangers', val: '"Bangers", Impact, sans-serif' },
                            { name: 'Shrikhand', val: '"Shrikhand", Georgia, serif' },
                            { name: 'Spicy Rice', val: '"Spicy Rice", Georgia, serif' },
                            { name: 'Boogaloo', val: '"Boogaloo", Impact, sans-serif' },
                            { name: 'Carter One', val: '"Carter One", Impact, sans-serif' },
                            { name: 'Alfa Slab', val: '"Alfa Slab One", Georgia, serif' },
                            { name: 'Russo Cyber', val: '"Russo One", Impact, sans-serif' },
                            { name: 'Fugaz Speed', val: '"Fugaz One", Impact, sans-serif' },
                            { name: 'Rubik Block', val: '"Rubik Mono One", Impact, sans-serif' },
                            { name: 'Bungee', val: '"Bungee", Impact, sans-serif' },
                            { name: 'Creepster', val: '"Creepster", Impact, cursive' },
                            { name: 'Marker', val: '"Permanent Marker", cursive, sans-serif' },
                            { name: 'Lobster', val: '"Lobster", Georgia, cursive' },
                            { name: '8-Bit Pixel', val: '"Press Start 2P", monospace' },
                          ].map((qf) => (
                            <button
                              key={qf.name}
                              type="button"
                              onClick={() => updateCueStyleOverride('fontFamily', qf.val)}
                              style={{ fontFamily: qf.val }}
                              className={`px-1.5 py-1 rounded text-[11px] truncate border transition ${
                                resolvedStyle.fontFamily === qf.val
                                  ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                                  : 'bg-[#0c101b] border-white/10 text-white/85 hover:border-white/30 hover:text-white'
                              }`}
                            >
                              {qf.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">Ukuran</span>
                            <span className="font-mono text-[#00f0ff]">
                              {resolvedStyle.fontSize}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={32}
                            max={160}
                            value={resolvedStyle.fontSize}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'fontSize',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">Min Fit</span>
                            <span className="font-mono text-[#94a3b8]">
                              {resolvedStyle.minFontSize}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={24}
                            max={90}
                            value={resolvedStyle.minFontSize}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'minFontSize',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">Jarak Baris</span>
                            <span className="font-mono text-[#94a3b8]">
                              {(resolvedStyle.lineHeight ?? 1.25).toFixed(2)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1.0}
                            max={1.8}
                            step={0.05}
                            value={resolvedStyle.lineHeight ?? 1.25}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'lineHeight',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[#94a3b8] mb-1">
                            Weight
                          </label>
                          <select
                            value={resolvedStyle.fontWeight}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'fontWeight',
                                Number(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1 rounded bg-[#0c101b] border border-white/15 text-white"
                          >
                            <option value={400}>400 Regular</option>
                            <option value={600}>600 SemiBold</option>
                            <option value={700}>700 Bold</option>
                            <option value={800}>800 ExtraBold</option>
                            <option value={900}>900 Black</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#94a3b8] mb-1">
                            Kapitalisasi
                          </label>
                          <select
                            value={resolvedStyle.textTransform}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'textTransform',
                                e.target.value as TextTransformMode
                              )
                            }
                            className="w-full px-2 py-1 rounded bg-[#0c101b] border border-white/15 text-white"
                          >
                            <option value="none">Sesuai Ketikan</option>
                            <option value="uppercase">UPPERCASE</option>
                            <option value="lowercase">lowercase</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#94a3b8] mb-1">
                            Gaya Miring
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              updateCueStyleOverride(
                                'italic',
                                !resolvedStyle.italic
                              )
                            }
                            className={`w-full py-1 rounded border font-semibold ${
                              resolvedStyle.italic
                                ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                                : 'bg-[#0c101b] border-white/15 text-[#94a3b8]'
                            }`}
                          >
                            Italic {resolvedStyle.italic ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">Letter Spacing</span>
                            <span className="font-mono text-[#00f0ff]">
                              {resolvedStyle.letterSpacing}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-2}
                            max={20}
                            step={0.5}
                            value={resolvedStyle.letterSpacing}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'letterSpacing',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">Opacity Teks</span>
                            <span className="font-mono text-[#00f0ff]">
                              {Math.round(resolvedStyle.opacity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={resolvedStyle.opacity}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'opacity',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN 3: POSISI KANVAS & ANCHOR */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#38bdf8]/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#38bdf8] flex items-center gap-1.5 text-xs">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>3. POSISI KANVAS & ANCHOR</span>
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateCueStyleOverride('x', 0.5);
                              updateCueStyleOverride('y', 0.2);
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#0c101b] border border-white/10 text-[10px] hover:border-[#00f0ff]"
                          >
                            Atas
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateCueStyleOverride('x', 0.5);
                              updateCueStyleOverride('y', 0.5);
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#0c101b] border border-white/10 text-[10px] hover:border-[#00f0ff]"
                          >
                            Tengah
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateCueStyleOverride('x', 0.5);
                              updateCueStyleOverride('y', 0.82);
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#0c101b] border border-white/10 text-[10px] hover:border-[#00f0ff]"
                          >
                            Lower-Third
                          </button>
                          <button
                            type="button"
                            onClick={handleResetPositionToTheme}
                            title="Reset Posisi X/Y & Anchor ke Default"
                            className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] text-[10px] hover:bg-[#38bdf8]/30 flex items-center gap-0.5"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">Posisi X</span>
                            <span className="font-mono text-[#00f0ff]">
                              {Math.round(resolvedStyle.x * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.05}
                            max={0.95}
                            step={0.01}
                            value={resolvedStyle.x}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'x',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#94a3b8]">Posisi Y</span>
                            <span className="font-mono text-[#00f0ff]">
                              {Math.round(resolvedStyle.y * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.08}
                            max={0.92}
                            step={0.01}
                            value={resolvedStyle.y}
                            onChange={(e) =>
                              updateCueStyleOverride(
                                'y',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#00f0ff]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {(['left', 'center', 'right'] as TextAnchor[]).map(
                          (anc) => (
                            <button
                              key={anc}
                              type="button"
                              onClick={() =>
                                updateCueStyleOverride('anchor', anc)
                              }
                              className={`py-1 rounded border text-xs font-semibold capitalize ${
                                resolvedStyle.anchor === anc
                                  ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                                  : 'bg-[#0c101b] border-white/10 text-[#94a3b8]'
                              }`}
                            >
                              Anchor: {anc}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ANIMASI FASE IN / HOLD / OUT (Bagian 9) */}
                {inspectorTab === 'animation' && (
                  <div className="space-y-3.5">
                    {/* Baris Info Tema Aktif & Reset Semua Animasi Sesuai Tema */}
                    <div className="px-3 py-2 rounded-xl bg-[#07090e] border border-[#38bdf8]/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-[#94a3b8] block">
                          Tema Panggung Aktif
                        </span>
                        <span className="text-xs font-bold text-white truncate block">
                          {activeStageTheme.label} ({activeStageTheme.badge})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetAnimToTheme}
                        title={`Reset semua animasi IN, STAY & OUT kembali ke default tema "${activeStageTheme.label}"`}
                        className="px-2.5 py-1 rounded-lg bg-[#38bdf8]/15 hover:bg-[#38bdf8]/30 border border-[#38bdf8]/40 text-[#38bdf8] text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Animasi Tema</span>
                      </button>
                    </div>

                    {/* 1. GAYA ANIMASI MASUK (IN) */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#38bdf8]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#38bdf8] flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-4 h-4" />
                          <span>1. GAYA ANIMASI MASUK (IN)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#94a3b8] font-mono">
                            {resolvedAnim.in.durationMs}ms
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateMultipleCueStyleOverrides({}, { in: activeStageTheme.anim.in });
                              setPreviewResetKey((k) => k + 1);
                              showToast(`Animasi IN di-reset ke default "${activeStageTheme.label}"`, 'info');
                            }}
                            title="Reset Animasi IN sesuai tema"
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-[#38bdf8] flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>

                      {/* Tombol Grid Pilihan Animasi IN (Motion Graphics) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            id: 'popBounce',
                            label: 'Pop Bounce (Komik Lompat)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'kineticSlam',
                            label: 'Kinetic Slam (Hantam)',
                            icon: <ZoomIn className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'whipSlide',
                            label: 'Whip Slide (Miring Cepat)',
                            icon: <Wind className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'flip3d',
                            label: 'Flip 3D (Lipat Huruf)',
                            icon: <RefreshCw className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'spiralDrop',
                            label: 'Spiral Drop (Putar Jatuh)',
                            icon: <ArrowDown className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'glitchIn',
                            label: 'Glitch Cyber (Kedip)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'typewriter',
                            label: 'Typewriter (Ketik)',
                            icon: <Type className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'trackingExpand',
                            label: 'Cine Expand (Melebar)',
                            icon: <ChevronsLeftRight className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'wordsRiseBlur',
                            label: 'Words Rise (Kata Naik Lembut)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'charMaskRise',
                            label: 'Editorial Mask (Angkat Huruf 8°)',
                            icon: <Type className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'clipReveal',
                            label: 'Laser Wipe (Sapuan Miring)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'slamStamp',
                            label: 'Impact Stamp (Hentakan Miring)',
                            icon: <ZoomIn className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'linesFromSides',
                            label: 'Kinetic Split (Kiri & Kanan)',
                            icon: <ChevronsLeftRight className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'scrambleText',
                            label: 'Cyber Decrypt (Matriks Huruf)',
                            icon: <RefreshCw className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'none',
                            label: 'Cut In (Instan 0ms)',
                            icon: <Square className="w-3.5 h-3.5 shrink-0" />,
                          },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'in',
                                'type',
                                m.id as AnimationInType
                              )
                            }
                            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left truncate transition flex items-center gap-1.5 ${
                              resolvedAnim.in.type === m.id
                                ? 'bg-[#38bdf8] text-black shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border border-white/10'
                            }`}
                          >
                            {m.icon}
                            <span className="truncate">{m.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Pilihan Kecepatan Masuk */}
                      <div>
                        <label className="text-[10px] text-[#94a3b8] block mb-1">
                          Kecepatan Animasi Masuk
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            {
                              label: 'Cepat',
                              dur: 260,
                              stag: 35,
                              icon: <Zap className="w-3 h-3 shrink-0" />,
                            },
                            {
                              label: 'Sedang',
                              dur: 420,
                              stag: 50,
                              icon: <Gauge className="w-3 h-3 shrink-0" />,
                            },
                            {
                              label: 'Lambat',
                              dur: 650,
                              stag: 75,
                              icon: <Waves className="w-3 h-3 shrink-0" />,
                            },
                          ].map((spd) => (
                            <button
                              key={spd.label}
                              type="button"
                              onClick={() => {
                                updateCueAnimationOverride(
                                  'in',
                                  'durationMs',
                                  spd.dur
                                );
                                updateCueAnimationOverride(
                                  'in',
                                  'staggerMs',
                                  spd.stag
                                );
                              }}
                              className={`py-1 rounded text-[10px] font-semibold border transition flex items-center justify-center gap-1 ${
                                Math.abs(resolvedAnim.in.durationMs - spd.dur) < 40
                                  ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                                  : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                              }`}
                            >
                              {spd.icon}
                              <span>{spd.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pemicu Animasi Masuk */}
                      <div>
                        <label className="text-[10px] text-[#94a3b8] block mb-1">
                          Pemicu Putar Animasi Masuk
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'in',
                                'inScope',
                                'from-blank'
                              )
                            }
                            className={`px-2 py-1.5 rounded text-[10px] font-semibold text-center border transition flex items-center justify-center gap-1.5 ${
                              resolvedAnim.in.inScope === 'from-blank'
                                ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border-white/10'
                            }`}
                            title="Hanya putar animasi saat teks masuk dari Blank/Hide"
                          >
                            <Crosshair className="w-3 h-3 shrink-0" />
                            <span>Dari Blank Saja</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'in',
                                'inScope',
                                'every-cue'
                              )
                            }
                            className={`px-2 py-1.5 rounded text-[10px] font-semibold text-center border transition flex items-center justify-center gap-1.5 ${
                              resolvedAnim.in.inScope !== 'from-blank'
                                ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border-white/10'
                            }`}
                            title="Putar animasi setiap ganti kalimat"
                          >
                            <RefreshCw className="w-3 h-3 shrink-0" />
                            <span>Tiap Kalimat</span>
                          </button>
                        </div>
                      </div>

                      {/* Parameter Detail IN (Durasi, Stagger, Easing) */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-[#94a3b8]">
                              Durasi IN ({resolvedAnim.in.durationMs}ms)
                            </span>
                            <input
                              type="range"
                              min={80}
                              max={1500}
                              step={20}
                              value={resolvedAnim.in.durationMs}
                              onChange={(e) =>
                                updateCueAnimationOverride(
                                  'in',
                                  'durationMs',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-[#38bdf8]"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-[#94a3b8]">
                              Stagger Kata/Huruf ({resolvedAnim.in.staggerMs}ms)
                            </span>
                            <input
                              type="range"
                              min={10}
                              max={140}
                              step={5}
                              value={resolvedAnim.in.staggerMs}
                              onChange={(e) =>
                                updateCueAnimationOverride(
                                  'in',
                                  'staggerMs',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-[#38bdf8]"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#94a3b8] block mb-1">
                            Kurva Easing IN
                          </span>
                          <select
                            value={resolvedAnim.in.easing}
                            onChange={(e) =>
                              updateCueAnimationOverride(
                                'in',
                                'easing',
                                e.target.value as EasingType
                              )
                            }
                            className="w-full px-2 py-1 rounded bg-[#0c101b] border border-white/15 text-white text-xs"
                          >
                            <option value="easeOutCubic">Ease Out Cubic</option>
                            <option value="easeInOutCubic">
                              Ease In Out Cubic
                            </option>
                            <option value="easeOutBack">
                              Ease Out Back (Overshoot)
                            </option>
                            <option value="linear">Linear</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 2. GAYA SETELAH IN (STAY / HOLD) */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#10b981]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#10b981] flex items-center gap-1.5 text-xs">
                          <Activity className="w-4 h-4" />
                          <span>2. GAYA SETELAH IN (STAY / HOLD)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#94a3b8] font-mono">
                            {resolvedAnim.hold.type === 'static'
                              ? 'Diam'
                              : `${resolvedAnim.hold.cycleMs}ms`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateMultipleCueStyleOverrides({}, { hold: activeStageTheme.anim.hold });
                              showToast(`Animasi STAY di-reset ke default "${activeStageTheme.label}"`, 'info');
                            }}
                            title="Reset Animasi STAY sesuai tema"
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-[#10b981] flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>

                      {/* Tombol Grid Pilihan Animasi Stay (Motion Graphics) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            id: 'ransomJitter',
                            label: 'Ransom Font & Warna',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'comicBounce',
                            label: 'Comic Rubber Bounce',
                            icon: <Music className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'beatStomp',
                            label: 'Beat Stomp (Jedag Jedug)',
                            icon: <HeartPulse className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'discoWave',
                            label: 'Disco Rainbow Wave',
                            icon: <Palette className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'glitchTwitch',
                            label: 'Glitch Cyber Twitch',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'pendulumTilt',
                            label: 'Ayun Miring (Pendulum)',
                            icon: <RefreshCw className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'charWave',
                            label: 'Ombak Huruf (Wave)',
                            icon: <Waves className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'shineSweep',
                            label: 'Kilatan Cahaya (Shine Glint)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'floatWave',
                            label: 'Dual Wave Float (Harmonik)',
                            icon: <Waves className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'beatBounce',
                            label: 'Beat Kick (Denyut Bass)',
                            icon: <HeartPulse className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'static',
                            label: 'Diam (Static/Tenang)',
                            icon: <Square className="w-3.5 h-3.5 shrink-0" />,
                          },
                        ].map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'hold',
                                'type',
                                h.id as AnimationHoldType
                              )
                            }
                            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left truncate transition flex items-center gap-1.5 ${
                              resolvedAnim.hold.type === h.id
                                ? 'bg-[#10b981] text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border border-white/10'
                            }`}
                          >
                            {h.icon}
                            <span className="truncate">{h.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Kecepatan Gerak Stay & Slider Siklus */}
                      {resolvedAnim.hold.type !== 'static' && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="text-[10px] text-[#94a3b8] block mb-1">
                              Kecepatan Gerakan Stay
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                {
                                  label: 'Cepat',
                                  cycle: 1400,
                                  icon: <Zap className="w-3 h-3 shrink-0" />,
                                },
                                {
                                  label: 'Sedang',
                                  cycle: 2400,
                                  icon: <Gauge className="w-3 h-3 shrink-0" />,
                                },
                                {
                                  label: 'Lembut',
                                  cycle: 3600,
                                  icon: <Waves className="w-3 h-3 shrink-0" />,
                                },
                              ].map((spd) => (
                                <button
                                  key={spd.label}
                                  type="button"
                                  onClick={() =>
                                    updateCueAnimationOverride(
                                      'hold',
                                      'cycleMs',
                                      spd.cycle
                                    )
                                  }
                                  className={`py-1 rounded text-[10px] font-semibold border transition flex items-center justify-center gap-1 ${
                                    Math.abs(resolvedAnim.hold.cycleMs - spd.cycle) < 300
                                      ? 'bg-[#10b981] text-black border-[#10b981]'
                                      : 'bg-[#0c101b] text-[#94a3b8] border-white/10 hover:text-white'
                                  }`}
                                >
                                  {spd.icon}
                                  <span>{spd.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-[#94a3b8]">
                              Siklus Loop Detail ({resolvedAnim.hold.cycleMs}ms)
                            </span>
                            <input
                              type="range"
                              min={800}
                              max={5000}
                              step={100}
                              value={resolvedAnim.hold.cycleMs}
                              onChange={(e) =>
                                updateCueAnimationOverride(
                                  'hold',
                                  'cycleMs',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full accent-[#10b981]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. GAYA ANIMASI KELUAR (OUT) */}
                    <div className="p-3 rounded-xl bg-[#07090e] border border-[#f59e0b]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#f59e0b] flex items-center gap-1.5 text-xs">
                          <EyeOff className="w-4 h-4" />
                          <span>3. GAYA ANIMASI KELUAR (OUT)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-[#94a3b8]">
                            {resolvedAnim.out.type === 'cut'
                              ? '0ms'
                              : `${resolvedAnim.out.durationMs}ms`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateMultipleCueStyleOverrides({}, { out: activeStageTheme.anim.out });
                              showToast(`Animasi OUT di-reset ke default "${activeStageTheme.label}"`, 'info');
                            }}
                            title="Reset Animasi OUT sesuai tema"
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] text-[#f59e0b] flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            id: 'popScatter',
                            label: 'Pop Scatter (Pecah Acak)',
                            icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'whipOut',
                            label: 'Whip Slide Out (Melesat)',
                            icon: <Wind className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'dropGravity',
                            label: 'Drop Gravity (Jatuh)',
                            icon: <ArrowDown className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'glitchOut',
                            label: 'Glitch Vanish (Kedip)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'implodeZoom',
                            label: 'Implode (Sedot Tengah)',
                            icon: <Minimize2 className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'wordsExit',
                            label: 'Words Disperse (Kata Menguap)',
                            icon: <Wind className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'flashCut',
                            label: 'Flash Impact (Kilat Putih 80ms)',
                            icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
                          },
                          {
                            id: 'cut',
                            label: 'Cut Langsung (0ms)',
                            icon: <Square className="w-3.5 h-3.5 shrink-0" />,
                          },
                        ].map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() =>
                              updateCueAnimationOverride(
                                'out',
                                'type',
                                o.id as AnimationOutType
                              )
                            }
                            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left truncate transition flex items-center gap-1.5 ${
                              resolvedAnim.out.type === o.id
                                ? 'bg-[#f59e0b] text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                : 'bg-[#0c101b] text-[#94a3b8] hover:text-white border border-white/10'
                            }`}
                          >
                            {o.icon}
                            <span className="truncate">{o.label}</span>
                          </button>
                        ))}
                      </div>

                      {resolvedAnim.out.type !== 'cut' && (
                        <div>
                          <span className="text-[10px] text-[#94a3b8]">
                            Durasi OUT ({resolvedAnim.out.durationMs}ms)
                          </span>
                          <input
                            type="range"
                            min={60}
                            max={800}
                            step={20}
                            value={resolvedAnim.out.durationMs}
                            onChange={(e) =>
                              updateCueAnimationOverride(
                                'out',
                                'durationMs',
                                Number(e.target.value)
                              )
                            }
                            className="w-full accent-[#f59e0b]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: PENGATURAN OUTPUT NDI & STATUS KONTRAK (Bagian 10 & 31) */}
                {inspectorTab === 'output' && (
                  <div className="space-y-3">
                    <div
                      className={`p-3 rounded-lg border space-y-1.5 ${
                        ndiActive
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Radio
                            className={`w-4 h-4 shrink-0 ${
                              ndiActive
                                ? 'text-emerald-400 animate-pulse'
                                : 'text-amber-400'
                            }`}
                          />
                          <span>
                            {ndiActive
                              ? 'NDI Live Streaming Active'
                              : 'NDI Status: Standby'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleNdi}
                          className={`px-3 py-1 rounded text-xs font-bold transition ${
                            ndiActive
                              ? 'bg-red-500/80 hover:bg-red-600 text-white'
                              : 'bg-[#00f0ff] hover:bg-[#38bdf8] text-[#07090e]'
                          }`}
                        >
                          {ndiActive ? 'Stop NDI' : 'Start NDI Live'}
                        </button>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {ndiActive
                          ? `Mengirim feed video alfa transparan ke Resolume Arena sebagai '${project.output.senderName}'. Buka Resolume -> Sources -> NDI Servers.`
                          : 'Klik tombol di atas untuk menyiarkan frame alfa transparan secara real-time ke Resolume Arena.'}
                      </p>
                    </div>

                    {/* Remote HP QR Code & Local Wi-Fi Info (Tahap B: LL-B02) */}
                    <div className="p-3 rounded-lg bg-[#07090e] border border-[#00f0ff]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#00f0ff] text-xs flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4" />
                          <span>Remote Control HP (QR Barcode Wi-Fi Lokal)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            fetchPairingInfo().then((info) => {
                              if (info) {
                                showToast(`IP Jaringan Terdeteksi: ${info.ip}`, 'info');
                              } else {
                                showToast('Gagal mendeteksi IP lokal', 'warning');
                              }
                            });
                          }}
                          title="Deteksi Ulang Jaringan Wi-Fi / Hotspot Laptop"
                          className="px-2 py-1 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 border border-[#00f0ff]/30 text-[#00f0ff] transition flex items-center gap-1 text-[10px] font-semibold"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Scan IP</span>
                        </button>
                      </div>

                      {pairingInfo ? (
                        <>
                          {/* Adapter / IP Selector & Manual IP Input */}
                          <div className="space-y-1.5">
                            {pairingInfo.availableIps && pairingInfo.availableIps.length > 0 && (
                              <div>
                                <label className="text-[10px] text-white/60 block mb-0.5">
                                  Jaringan Laptop Terdeteksi ({pairingInfo.availableIps.length} Adapter):
                                </label>
                                <select
                                  value={pairingInfo.ip}
                                  onChange={(e) => {
                                    const newIp = e.target.value;
                                    fetchPairingInfo(newIp).then((info) => {
                                      if (info) {
                                        showToast(`Beralih ke IP: ${info.ip}`, 'success');
                                      }
                                    });
                                  }}
                                  className="w-full text-xs bg-[#0b0f19] border border-[#00f0ff]/40 rounded px-2 py-1 text-white focus:outline-none focus:border-[#00f0ff]"
                                >
                                  {pairingInfo.availableIps.map((adapter) => (
                                    <option key={adapter.ip} value={adapter.ip}>
                                      {adapter.name} — {adapter.ip}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <label className="text-[10px] text-white/60 whitespace-nowrap">IP Manual:</label>
                              <input
                                type="text"
                                defaultValue={pairingInfo.ip}
                                key={pairingInfo.ip}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val && val !== pairingInfo.ip) {
                                    fetchPairingInfo(val).then((info) => {
                                      if (info) {
                                        showToast(`IP disetel ke: ${info.ip}`, 'success');
                                      }
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                placeholder="192.168.1.x"
                                className="flex-1 font-mono text-xs bg-[#0b0f19] border border-[#00f0ff]/30 rounded px-2 py-0.5 text-[#00f0ff] focus:outline-none focus:border-[#00f0ff]"
                              />
                              <span className="text-[10px] font-mono text-white/40">:{pairingInfo.port}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            {pairingInfo.qrDataUrl && (
                              <img
                                src={pairingInfo.qrDataUrl}
                                alt="QR Code Pairing HP"
                                className="w-24 h-24 rounded-lg border border-[#00f0ff]/40 bg-[#07090e] p-1 shrink-0 shadow-md"
                              />
                            )}
                            <div className="text-[11px] space-y-1 min-w-0">
                              <p className="text-white/80 font-medium">
                                Scan QR dengan kamera HP atau buka alamat ini:
                              </p>
                              <a
                                href={pairingInfo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[#00f0ff] underline block truncate"
                              >
                                {pairingInfo.url}
                              </a>
                              <p className="text-[10px] text-white/50 leading-relaxed">
                                Pastikan HP terhubung ke Wi-Fi / Hotspot yang sama dengan laptop (<b>{pairingInfo.ip}</b>).
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-[#94a3b8] py-2">
                          Mendeteksi alamat IP jaringan lokal laptop... Klik <b>Scan IP</b> di atas jika belum muncul.
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-[#07090e] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#f1f5f9] block">
                          Konfigurasi Target Sender & Resolusi (px × px)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff] font-mono text-[10px] font-bold">
                          {project.output.width} × {project.output.height} px
                        </span>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#94a3b8] block mb-1">
                          Nama NDI Sender
                        </label>
                        <input
                          type="text"
                          value={project.output.senderName}
                          onChange={(e) =>
                            setProject((p) => ({
                              ...p,
                              output: {
                                ...p.output,
                                senderName: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#0c101b] border border-white/15 text-white font-mono text-xs"
                        />
                      </div>

                      {/* Preset Cepat Resolusi LED Wall / Resolume */}
                      <div>
                        <label className="text-[11px] text-[#94a3b8] block mb-1.5">
                          Preset Cepat Resolusi Kanvas / LED Wall
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: '1920 × 1080', sub: 'FHD 16:9', w: 1920, h: 1080 },
                            { label: '1280 × 720', sub: 'HD 16:9', w: 1280, h: 720 },
                            { label: '3840 × 2160', sub: '4K UHD', w: 3840, h: 2160 },
                            { label: '3840 × 1080', sub: 'LED 32:9', w: 3840, h: 1080 },
                            { label: '2560 × 1080', sub: 'Wide 21:9', w: 2560, h: 1080 },
                            { label: '1080 × 1920', sub: 'Vertikal 9:16', w: 1080, h: 1920 },
                          ].map((preset) => {
                            const isSelected =
                              project.output.width === preset.w &&
                              project.output.height === preset.h;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleApplyCustomResolution(preset.w, preset.h)}
                                className={`px-2 py-1.5 rounded border text-left transition ${
                                  isSelected
                                    ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-white shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                                    : 'bg-[#0c101b] border-white/10 hover:border-[#00f0ff]/50 text-[#cbd5e1]'
                                }`}
                              >
                                <div className="font-mono text-[11px] font-bold truncate">
                                  {preset.label}
                                </div>
                                <div className="text-[9px] text-[#94a3b8] truncate">
                                  {preset.sub}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Input Kustom Lebar (px) × Tinggi (px) */}
                      <div className="p-2.5 rounded-lg bg-[#0c101b] border border-[#00f0ff]/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#00f0ff]">
                            Ukuran Kustom (Lebar px × Tinggi px)
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyCustomResolution(
                                project.output.height,
                                project.output.width
                              )
                            }
                            title="Tukar Lebar & Tinggi (Landscape ↔ Portrait)"
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-[10px] text-[#cbd5e1] flex items-center gap-1 transition"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Tukar W↔H</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <span className="text-[10px] text-[#94a3b8] block mb-0.5">
                              Lebar / Width (px)
                            </span>
                            <input
                              type="number"
                              min={256}
                              max={7680}
                              step={8}
                              defaultValue={project.output.width}
                              key={`w-${project.output.width}`}
                              onBlur={(e) =>
                                handleApplyCustomResolution(
                                  Number(e.target.value),
                                  project.output.height
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-[#07090e] border border-white/20 focus:border-[#00f0ff] focus:outline-none text-white font-mono text-xs font-bold"
                            />
                          </div>

                          <span className="text-sm font-bold text-[#94a3b8] pt-4">
                            ×
                          </span>

                          <div className="flex-1">
                            <span className="text-[10px] text-[#94a3b8] block mb-0.5">
                              Tinggi / Height (px)
                            </span>
                            <input
                              type="number"
                              min={128}
                              max={4320}
                              step={8}
                              defaultValue={project.output.height}
                              key={`h-${project.output.height}`}
                              onBlur={(e) =>
                                handleApplyCustomResolution(
                                  project.output.width,
                                  Number(e.target.value)
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-full px-2.5 py-1.5 rounded bg-[#07090e] border border-white/20 focus:border-[#00f0ff] focus:outline-none text-white font-mono text-xs font-bold"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-[#94a3b8]">
                          Ketik angka piksel bebas (256–7680 px) lalu tekan <b>Enter</b> atau klik di luar kotak. Ukuran font & efek akan menyesuaikan proporsi kanvas otomatis.
                        </p>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#94a3b8] block mb-1">
                          Target Frame Rate
                        </label>
                        <select
                          value={project.output.fps}
                          onChange={(e) =>
                            setProject((p) => ({
                              ...p,
                              output: {
                                ...p.output,
                                fps: Number(e.target.value) as 30 | 60,
                              },
                            }))
                          }
                          className="w-full px-2 py-1.5 rounded bg-[#0c101b] border border-white/15 text-white font-mono text-xs"
                        >
                          <option value={60}>60 FPS (Ultra-Smooth • Resolume Default)</option>
                          <option value={30}>30 FPS (Mode Hemat CPU)</option>
                        </select>
                      </div>
                    </div>

                    {lastAck && (
                      <div className="p-2.5 rounded-lg bg-[#07090e] border border-white/10 space-y-1">
                        <span className="font-bold text-[#94a3b8] block">
                          Acknowledgement Command Terakhir
                        </span>
                        <pre className="text-[10px] font-mono text-[#00f0ff] overflow-x-auto">
                          {JSON.stringify(lastAck, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
        </div>

        {/* ================================================================= */}
        {/* TOMBOL TEPI KANAN SAAT SIDEBAR REMOTE HP DISISIHKAN (COLLAPSED)   */}
        {/* ================================================================= */}
        {!showRemoteSidebar && (
          <button
            type="button"
            onClick={() => setShowRemoteSidebar(true)}
            className="hidden lg:flex flex-col items-center justify-center gap-2 w-7 border-l border-white/10 bg-[#0c101b]/95 hover:bg-[#141c30] text-[#94a3b8] hover:text-[#00f0ff] transition-all shrink-0 group select-none"
            title="Buka Sidebar Remote HP"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-[#00f0ff] group-hover:-translate-x-0.5 transition-transform" />
            <Smartphone className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span
              className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#94a3b8] group-hover:text-white"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              REMOTE HP
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                simulatedRemoteConnected ? 'bg-[#10b981]' : 'bg-red-500'
              }`}
            />
          </button>
        )}

        {/* ================================================================= */}
        {/* SIDEBAR REMOTE HP ELEGANT (DAPAT DISISIHKAN KE SAMPING)           */}
        {/* ================================================================= */}
        {showRemoteSidebar && (
          <aside className="w-full lg:w-[360px] xl:w-[380px] border-l border-white/10 shrink-0 bg-[#080b12] flex flex-col h-full overflow-hidden select-none shadow-[-12px_0_32px_rgba(0,0,0,0.45)]">
            {/* Top Bar Remote Sidebar */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#0f1626] via-[#131c31] to-[#0f1626] border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.12)]">
                  <Smartphone className="w-3.5 h-3.5 text-[#00f0ff]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold tracking-wide text-white truncate">
                      STAGE REMOTE
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-[#94a3b8] border border-white/10">
                      DOCK
                    </span>
                  </div>
                  <div className="text-[10px] text-[#64748b] truncate">
                    {pairingInfo ? `${pairingInfo.ip}:${pairingInfo.port}` : 'Sinkronisasi Real-Time'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Tombol Toggle QR / Info LAN */}
                <button
                  type="button"
                  onClick={() => setShowRemoteQr((prev) => !prev)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                    showRemoteQr
                      ? 'bg-[#00f0ff]/20 border-[#00f0ff]/50 text-[#00f0ff]'
                      : 'bg-white/[0.04] border-white/10 text-[#94a3b8] hover:text-white'
                  }`}
                  title="Tampilkan QR Code & Link Browser HP"
                >
                  QR LAN
                </button>

                {/* Toggle Uji Koneksi HP */}
                <button
                  type="button"
                  onClick={() => setSimulatedRemoteConnected((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                    simulatedRemoteConnected
                      ? 'bg-[#10b981]/12 border-[#10b981]/35 text-[#34d399]'
                      : 'bg-red-500/15 border-red-500/40 text-red-300'
                  }`}
                  title="Status Koneksi Remote (Klik untuk uji skenario putus koneksi)"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      simulatedRemoteConnected ? 'bg-[#10b981] animate-pulse' : 'bg-red-400'
                    }`}
                  />
                  <span>{simulatedRemoteConnected ? 'Online' : 'Offline'}</span>
                </button>

                {/* Tombol Sisihkan / Collapse Sidebar ke Samping */}
                <button
                  type="button"
                  onClick={() => setShowRemoteSidebar(false)}
                  className="p-1.5 rounded-md border border-white/10 bg-white/[0.04] text-[#94a3b8] hover:text-white hover:bg-white/10 transition"
                  title="Sisihkan Sidebar Remote HP ke samping"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Panel Collapsible QR & Link LAN */}
            {showRemoteQr && (
              <div className="px-3.5 py-3 bg-[#0c1220] border-b border-[#00f0ff]/25 space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#00f0ff]">
                      Akses dari Smartphone (Wi-Fi / Hotspot)
                    </div>
                    <div className="text-[11px] font-mono text-white/90 truncate bg-[#07090e] px-2 py-1 rounded border border-white/10">
                      {pairingInfo?.url || 'http://localhost:4040/remote'}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      {pairingInfo?.url && (
                        <a
                          href={pairingInfo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/25 transition"
                        >
                          <span>Buka Tab Remote</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRemoteQr(false)}
                        className="text-[10px] text-[#94a3b8] hover:text-white"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                  {pairingInfo?.qrDataUrl && (
                    <img
                      src={pairingInfo.qrDataUrl}
                      alt="QR Remote HP"
                      className="w-16 h-16 rounded-lg border border-[#00f0ff]/30 bg-[#07090e] p-1 shrink-0"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Pemilih Lagu Cepat & Status Fase Live */}
            <div className="px-3.5 pt-3 pb-2.5 border-b border-white/[0.07] space-y-2.5 shrink-0 bg-[#0a0e17]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#64748b] mb-1">
                    Lagu Aktif di Setlist
                  </label>
                  <div className="relative">
                    <select
                      value={activeSong?.id || ''}
                      disabled={!simulatedRemoteConnected}
                      onChange={(e) =>
                        sendCommand(
                          'SELECT_SONG',
                          { songId: e.target.value },
                          'mobile-sim'
                        )
                      }
                      className="w-full appearance-none bg-[#111827] hover:bg-[#162033] border border-white/10 focus:border-[#00f0ff]/60 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-bold text-white outline-none transition truncate cursor-pointer disabled:opacity-40"
                    >
                      {project.songs.map((s, idx) => (
                        <option key={s.id} value={s.id} className="bg-[#0c101b] text-white">
                          {idx + 1}. {s.title} ({s.cues.length} cue)
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-3.5 h-3.5 text-[#00f0ff] rotate-90 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[9px] font-mono text-[#64748b] mb-1">
                    REV #{engineState.revision}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                      engineState.phase === 'Blank' || engineState.phase === 'Ready'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-[#10b981]/15 border-[#10b981]/40 text-[#34d399]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        engineState.phase === 'Blank' || engineState.phase === 'Ready'
                          ? 'bg-amber-400'
                          : 'bg-[#10b981] animate-ping'
                      }`}
                    />
                    {engineState.phase.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Teleprompter Monitor: ON AIR (LIVE) & NEXT UP */}
              <div className="space-y-2">
                {/* Kartu ON AIR */}
                <div
                  className={`relative overflow-hidden rounded-xl p-3 border transition-all ${
                    engineState.phase === 'Blank' || engineState.phase === 'Ready'
                      ? 'bg-[#0c101b]/90 border-amber-500/25'
                      : 'bg-gradient-to-br from-[#0c191e] via-[#0b131e] to-[#0c101b] border-[#10b981]/45 shadow-[0_4px_20px_rgba(16,185,129,0.08)]'
                  }`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      engineState.phase === 'Blank' || engineState.phase === 'Ready'
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-b from-[#10b981] to-[#00f0ff]'
                    }`}
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1 pl-1">
                    <span
                      className={`font-extrabold tracking-wider flex items-center gap-1.5 ${
                        engineState.phase === 'Blank' || engineState.phase === 'Ready'
                          ? 'text-amber-300'
                          : 'text-[#34d399]'
                      }`}
                    >
                      <span>SEDANG TAYANG</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#94a3b8] font-bold">
                      {engineState.liveSnapshot
                        ? `CUE #${engineState.liveSnapshot.index + 1} / ${activeSong.cues.length}`
                        : 'STANDBY'}
                    </span>
                  </div>
                  <div className="text-[13px] font-extrabold text-white leading-snug pl-1 min-h-[2.25rem] flex items-center">
                    {engineState.liveSnapshot?.text ||
                      (engineState.liveSnapshot?.isBlankCue
                        ? '[Cue Kosong — Jeda Instrumental]'
                        : '— Layar Transparan (Standby / Blank) —')}
                  </div>
                </div>

                {/* Kartu NEXT UP */}
                <div className="relative overflow-hidden rounded-xl p-2.5 bg-[#0c101b]/80 border border-white/[0.08]">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#38bdf8]/50" />
                  <div className="flex items-center justify-between text-[9px] font-mono text-[#38bdf8] mb-0.5 pl-1">
                    <span className="font-bold uppercase tracking-wider">
                      BERIKUTNYA (NEXT CUE)
                    </span>
                    <span className="text-[#64748b]">
                      {nextUpcomingCue ? 'SIAP TEMBAK' : 'AKHIR LAGU'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#cbd5e1] leading-snug pl-1 truncate">
                    {nextUpcomingCue?.text ||
                      (nextUpcomingCue?.isBlankCue
                        ? '[Cue Kosong — Jeda Instrumental]'
                        : '— Akhir lagu tercapai —')}
                  </div>
                </div>
              </div>
            </div>

            {/* Deck Kontrol Taktil Utama (Ibu Jari & Operasi Cepat) */}
            <div className="px-3.5 py-3 border-b border-white/[0.07] bg-[#090d15] space-y-2 shrink-0">
              <button
                type="button"
                disabled={!simulatedRemoteConnected}
                onClick={() => sendCommand('NEXT', undefined, 'mobile-sim')}
                className="w-full py-3.5 px-4 rounded-xl font-black text-base tracking-wide bg-gradient-to-r from-[#10b981] via-[#059669] to-[#00d2ff] text-[#041014] hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_6px_24px_rgba(16,185,129,0.25)] border-t border-white/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black tracking-wider uppercase">
                    NEXT BARIS
                  </span>
                  <span className="text-[10px] font-mono font-bold opacity-80">
                    Majukan Lirik Live
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-black/15 flex items-center justify-center">
                  <SkipForward className="w-5 h-5 fill-current" />
                </div>
              </button>

              {/* 5 Tombol Aksi Cepat: Awal (#1), Prev, Replay, Blank, Restore */}
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  disabled={!simulatedRemoteConnected || !activeSong?.cues.length}
                  onClick={() => {
                    const firstCue = activeSong?.cues[0];
                    if (firstCue) {
                      sendCommand('GO_CUE', { cueId: firstCue.id }, 'mobile-sim');
                    }
                  }}
                  title="Kembali ke Baris Pertama (Cue #1)"
                  className="py-2.5 rounded-xl font-bold text-[11px] bg-[#101c2e] hover:bg-[#172942] text-[#00f0ff] border border-[#00f0ff]/25 active:scale-95 transition disabled:opacity-40 flex flex-col items-center gap-1"
                >
                  <div className="flex items-center">
                    <SkipBack className="w-3.5 h-3.5 text-[#00f0ff] fill-current" />
                  </div>
                  <span>Awal</span>
                </button>

                <button
                  type="button"
                  disabled={!simulatedRemoteConnected}
                  onClick={() => sendCommand('PREVIOUS', undefined, 'mobile-sim')}
                  title="Mundur 1 Baris (Previous)"
                  className="py-2.5 rounded-xl font-bold text-[11px] bg-[#111827] hover:bg-[#1a2438] text-[#e2e8f0] border border-white/10 active:scale-95 transition disabled:opacity-40 flex flex-col items-center gap-1"
                >
                  <SkipBack className="w-3.5 h-3.5 text-[#94a3b8]" />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  disabled={!simulatedRemoteConnected}
                  onClick={() => sendCommand('REPLAY', undefined, 'mobile-sim')}
                  title="Ulangi Animasi Baris Saat Ini (Replay)"
                  className="py-2.5 rounded-xl font-bold text-[11px] bg-[#111827] hover:bg-[#1a2438] text-[#38bdf8] border border-[#38bdf8]/20 active:scale-95 transition disabled:opacity-40 flex flex-col items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </button>

                <button
                  type="button"
                  disabled={!simulatedRemoteConnected}
                  onClick={() =>
                    sendCommand('BLANK', { immediate: false }, 'mobile-sim')
                  }
                  title="Kosongkan / Sembunyikan Lirik (Blank)"
                  className="py-2.5 rounded-xl font-bold text-[11px] bg-[#1c1412] hover:bg-[#2a1c18] text-amber-300 border border-amber-500/30 active:scale-95 transition disabled:opacity-40 flex flex-col items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Blank</span>
                </button>

                <button
                  type="button"
                  disabled={!simulatedRemoteConnected}
                  onClick={() => sendCommand('RESTORE', undefined, 'mobile-sim')}
                  title="Tampilkan Kembali Lirik (Restore)"
                  className="py-2.5 rounded-xl font-bold text-[11px] bg-[#0d1f28] hover:bg-[#122b38] text-[#00f0ff] border border-[#00f0ff]/30 active:scale-95 transition disabled:opacity-40 flex flex-col items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
            </div>

            {/* Daftar Cue Cepat dengan Filter Pencarian */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#070a10]">
              <div className="px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                  Daftar Cue ({activeSong?.cues.length || 0})
                </span>
                <div className="relative flex-1 max-w-[175px]">
                  <Search className="w-3 h-3 text-[#64748b] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={remoteCueSearch}
                    onChange={(e) => setRemoteCueSearch(e.target.value)}
                    placeholder="Filter lirik..."
                    className="w-full bg-[#0f1624] border border-white/10 focus:border-[#00f0ff]/50 rounded-md pl-6 pr-5 py-1 text-[11px] text-white placeholder-[#64748b] outline-none transition"
                  />
                  {remoteCueSearch && (
                    <button
                      type="button"
                      onClick={() => setRemoteCueSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                {activeSong?.cues
                  .map((cue, idx) => ({ cue, idx }))
                  .filter(({ cue }) => {
                    if (!remoteCueSearch.trim()) return true;
                    const q = remoteCueSearch.toLowerCase();
                    return (
                      cue.text.toLowerCase().includes(q) ||
                      (cue.section || '').toLowerCase().includes(q)
                    );
                  })
                  .map(({ cue, idx }) => {
                    const isLive = cue.id === engineState.liveCueId;
                    const isSelected = cue.id === selectedCue?.id;
                    return (
                      <div
                        key={cue.id}
                        onClick={() =>
                          sendCommand('SELECT_CUE', { cueId: cue.id }, 'mobile-sim')
                        }
                        className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          isLive
                            ? 'bg-gradient-to-r from-[#10b981]/20 to-[#00f0ff]/10 border-[#10b981]/60 text-white shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                            : isSelected
                            ? 'bg-[#141e33] border-[#00f0ff]/60 text-white'
                            : 'bg-[#0c111d] border-white/[0.06] text-[#cbd5e1] hover:border-white/15 hover:bg-[#111827]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isLive
                                ? 'bg-[#10b981] text-[#041014]'
                                : isSelected
                                ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                                : 'bg-white/[0.05] text-[#64748b]'
                            }`}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate ${
                                isLive ? 'font-extrabold text-white' : 'font-medium'
                              }`}
                            >
                              {cue.isBlankCue ? (
                                <span className="italic text-[#64748b]">
                                  [Jeda Instrumental]
                                </span>
                              ) : (
                                cue.text
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!simulatedRemoteConnected}
                          onClick={(e) => {
                            e.stopPropagation();
                            sendCommand('GO_CUE', { cueId: cue.id }, 'mobile-sim');
                          }}
                          className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] tracking-wider uppercase shrink-0 transition active:scale-95 disabled:opacity-40 ${
                            isLive
                              ? 'bg-[#10b981] text-[#041014] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                              : 'bg-[#00f0ff]/15 hover:bg-[#00f0ff] text-[#00f0ff] hover:text-[#07090e] border border-[#00f0ff]/30'
                          }`}
                        >
                          {isLive ? 'LIVE' : 'GO'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL IMPOR / PASTE LIRIK (.TXT / UTF-8) (Bagian 4 & 5)             */}
      {/* =================================================================== */}
      {showImportLyricsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl border p-5 space-y-4 max-h-[90vh] flex flex-col"
            style={{
              backgroundColor: '#0c101b',
              borderColor: 'rgba(0,240,255,0.35)',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  {importModalMode === 'new-song' ? (
                    <>
                      <Plus className="w-4 h-4 text-[#00f0ff]" />
                      <span>Tambah Lagu Baru</span>
                    </>
                  ) : importReplaceExisting ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <span>Replace Seluruh Lirik: &quot;{activeSong?.title}&quot;</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-[#00f0ff]" />
                      <span>Impor / Tambah Lirik: &quot;{activeSong?.title}&quot;</span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-[#94a3b8]">
                  {importModalMode === 'new-song'
                    ? 'Isi judul lagu dan paste lirik. Baris kosong (Enter) otomatis menjadi Jeda / Cue Kosong.'
                    : importReplaceExisting
                    ? 'Ganti seluruh baris cue lama di lagu ini dengan teks baru. Baris kosong (Enter) = Jeda / Cue Kosong.'
                    : 'Tambah baris cue baru ke akhir lagu ini. Baris kosong (Enter) = Jeda / Cue Kosong.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportLyricsModal(false)}
                className="text-[#94a3b8] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importModalMode === 'new-song' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#00f0ff]">
                  Judul Lagu
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newSongTitleInput}
                  onChange={(e) => setNewSongTitleInput(e.target.value)}
                  placeholder={`Masukkan judul lagu (contoh: Lagu Baru #${project.songs.length + 1})...`}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090e] border border-[#00f0ff]/40 text-sm font-bold text-white placeholder-white/35 focus:border-[#00f0ff] focus:outline-none"
                />
              </div>
            ) : (
              <>
                {/* Mode Selector: Tambah ke Akhir vs Replace Seluruh Lagu */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#07090e] rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setImportReplaceExisting(false)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                      !importReplaceExisting
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah ke Akhir (Append)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportReplaceExisting(true);
                      if (activeSong && !importLyricsText.trim()) {
                        const currentLyrics = activeSong.cues
                          .map((c) => (c.isBlankCue ? '' : c.text))
                          .join('\n');
                        setImportLyricsText(currentLyrics);
                      }
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                      importReplaceExisting
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace Seluruh Lirik (Ganti)</span>
                  </button>
                </div>

                {importReplaceExisting && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                    <span className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <span>
                        <b>Mode Replace:</b> Seluruh {activeSong?.cues?.length || 0} cue lama di lagu <b>&quot;{activeSong?.title}&quot;</b> akan digantikan dengan cue baru ini. Tema dan preset lagu tetap dipertahankan.
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeSong) {
                          const currentLyrics = activeSong.cues
                            .map((c) => (c.isBlankCue ? '' : c.text))
                            .join('\n');
                          setImportLyricsText(currentLyrics);
                        }
                      }}
                      className="shrink-0 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold border border-amber-500/30"
                      title="Tarik seluruh baris teks yang ada di lagu ini ke editor"
                    >
                      Muat Lirik Saat Ini
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="px-3 py-1.5 rounded-lg bg-[#141c30] border border-[#00f0ff]/40 text-[#00f0ff] font-semibold cursor-pointer hover:bg-[#00f0ff]/15 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih File .txt (UTF-8)</span>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleTxtFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#f1f5f9]">
                  <input
                    type="checkbox"
                    checked={importExtractHeaders}
                    onChange={(e) =>
                      setImportExtractHeaders(e.target.checked)
                    }
                    className="accent-[#00f0ff]"
                  />
                  <span>Jadikan [Chorus]/[Verse] metadata</span>
                </label>

                <select
                  value={importEmptyMode}
                  onChange={(e) =>
                    setImportEmptyMode(e.target.value as EmptyLineMode)
                  }
                  className="px-2 py-1 rounded bg-[#07090e] border border-white/15 text-white"
                >
                  <option value="blank-cue">
                    Baris Kosong (Enter) = Jeda / Cue Kosong (Default)
                  </option>
                  <option value="section-break">
                    Baris Kosong = Pemisah Bagian
                  </option>
                  <option value="ignore">Baris Kosong = Abaikan</option>
                </select>
              </div>
            </div>

            <textarea
              value={importLyricsText}
              onChange={(e) => setImportLyricsText(e.target.value)}
              rows={8}
              placeholder={
                importModalMode === 'new-song'
                  ? 'Paste lirik lagu di sini...\n(Tekan Enter / baris kosong untuk membuat Jeda / Cue Kosong secara otomatis)'
                  : 'Tempel lirik lagu di sini...\n(Tekan Enter / baris kosong untuk membuat Jeda / Cue Kosong)'
              }
              className="w-full p-3 rounded-xl bg-[#07090e] border border-white/15 text-xs font-mono text-white focus:border-[#00f0ff] focus:outline-none"
            />

            {/* Ringkasan Hasil Pemisahan Sebelum Disimpan */}
            <div className="p-3 rounded-xl bg-[#07090e] border border-white/10 text-xs space-y-1.5 max-h-36 overflow-y-auto">
              <div className="flex items-center justify-between font-bold">
                <span className="text-[#00f0ff]">
                  Preview Pemisahan: {importPreviewResult.cues.length} Cue
                  {importPreviewResult.cues.filter((c) => c.isBlankCue).length > 0 &&
                    ` (${importPreviewResult.cues.filter((c) => c.isBlankCue).length} Jeda Kosong)`}
                </span>
                <span className="text-[#94a3b8]">
                  Bagian terdeteksi:{' '}
                  {importPreviewResult.detectedSections.join(', ') ||
                    'Otomatis'}
                </span>
              </div>
              {importPreviewResult.warnings.length > 0 && (
                <div className="text-amber-300 space-y-0.5">
                  {importPreviewResult.warnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              {importModalMode === 'new-song' ? (
                <span className="text-xs text-[#94a3b8]">
                  1 baris teks = 1 cue • Baris kosong = Jeda Kosong
                </span>
              ) : (
                <label className="flex items-center gap-1.5 text-xs text-[#94a3b8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importReplaceExisting}
                    onChange={(e) => setImportReplaceExisting(e.target.checked)}
                    className="accent-[#00f0ff]"
                  />
                  <span>Ganti/Replace seluruh {activeSong?.cues.length || 0} cue di lagu ini</span>
                </label>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportLyricsModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-[#94a3b8] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyLyricImport}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    importModalMode !== 'new-song' && importReplaceExisting
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#07090e]'
                      : 'bg-[#00f0ff] hover:brightness-110 text-[#07090e]'
                  }`}
                >
                  {importModalMode === 'new-song' ? (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        Simpan Lagu Baru
                        {importPreviewResult.cues.length > 0
                          ? ` (${importPreviewResult.cues.length} Cue)`
                          : ''}
                      </span>
                    </>
                  ) : importReplaceExisting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace Seluruh Lirik ({importPreviewResult.cues.length} Cue Baru)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Masukkan {importPreviewResult.cues.length} Cue ke Lagu</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL EKSPOR / IMPOR JSON, BACKUP, & RINGKASAN HANDOFF              */}
      {/* =================================================================== */}
      {showJsonModal !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl border p-5 space-y-4 max-h-[90vh] flex flex-col"
            style={{
              backgroundColor: '#0c101b',
              borderColor: 'rgba(0,240,255,0.35)',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white">
                {showJsonModal === 'export' && 'Ekspor Proyek JSON LuiLyric'}
                {showJsonModal === 'import' && 'Impor Proyek JSON LuiLyric'}
                {showJsonModal === 'backups' && 'Riwayat Backup & Pemulihan Lokal'}
                {showJsonModal === 'handoff' &&
                  'Status Implementasi Tahap A & Panduan Handoff Agent Windows'}
              </h2>
              <button
                type="button"
                onClick={() => setShowJsonModal('none')}
                className="text-[#94a3b8] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(showJsonModal === 'export' || showJsonModal === 'import') && (
              <>
                <textarea
                  value={jsonModalText}
                  onChange={(e) => setJsonModalText(e.target.value)}
                  readOnly={showJsonModal === 'export'}
                  rows={12}
                  placeholder="Tempel JSON proyek LuiLyric di sini..."
                  className="w-full p-3 rounded-xl bg-[#07090e] border border-white/15 text-xs font-mono text-[#f1f5f9] focus:border-[#00f0ff] focus:outline-none"
                />
                <div className="flex items-center justify-between pt-2">
                  {showJsonModal === 'import' ? (
                    <label className="px-3 py-1.5 rounded-lg bg-[#141c30] border border-white/15 text-xs text-white cursor-pointer hover:border-[#00f0ff]">
                      <span>Pilih File .json</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setJsonModalText(reader.result);
                            }
                          };
                          reader.readAsText(file, 'utf-8');
                        }}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <span className="text-xs text-[#94a3b8] font-mono">
                      Checksum: {project.checksum || 'Tervalidasi'}
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    {showJsonModal === 'export' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(jsonModalText);
                              showToast('JSON disalin ke clipboard.', 'success');
                            } catch {
                              showToast('Silakan salin manual dari kotak teks.', 'info');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs border border-white/15 text-white hover:border-[#00f0ff]"
                        >
                          Salin JSON
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadProjectJson}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#00f0ff] text-[#07090e]"
                        >
                          Unduh File .json
                        </button>
                      </>
                    )}
                    {showJsonModal === 'import' && (
                      <button
                        type="button"
                        onClick={handleImportProjectJson}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#00f0ff] text-[#07090e]"
                      >
                        Validasi & Muat Proyek
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {showJsonModal === 'backups' && (
              <div className="space-y-2 overflow-y-auto max-h-80">
                {backups.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#94a3b8]">
                    Belum ada titik backup tersimpan. Klik tombol &quot;Simpan&quot; di
                    header untuk membuat checkpoint backup.
                  </div>
                ) : (
                  backups.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#07090e] border border-white/10 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {b.projectName}
                        </div>
                        <div className="text-[11px] text-[#94a3b8] font-mono">
                          {new Date(b.timestamp).toLocaleString('id-ID')} •{' '}
                          {b.songCount} lagu
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          storageAdapter.restoreBackup(b.id).then((restored) => {
                            if (restored) {
                              setProject(restored);
                              engineRef.current = new LiveEngine(
                                restored,
                                performance.now()
                              );
                              setEngineState(engineRef.current.getState());
                              setShowJsonModal('none');
                              showToast(
                                `Backup "${b.projectName}" berhasil dipulihkan.`,
                                'success'
                              );
                            }
                          });
                        }}
                        className="px-3 py-1 rounded bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 font-semibold hover:bg-[#00f0ff] hover:text-[#07090e]"
                      >
                        Restore Backup
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {showJsonModal === 'handoff' && (
              <div className="space-y-3 overflow-y-auto text-xs leading-relaxed text-[#f1f5f9] pr-1">
                <div className="p-3 rounded-xl bg-[#07090e] border border-[#10b981]/30 space-y-1">
                  <div className="font-bold text-[#10b981] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Fitur Tahap A yang Sudah Diimplementasikan & Diuji</span>
                  </div>
                  <ul className="list-disc pl-4 text-[#94a3b8] space-y-1">
                    <li>
                      <strong>Tema LuiLyric (Bagian 28)</strong>: Palet dark
                      cyber `#07090e`, `#0c101b`, aksen `#00f0ff`, tipografi
                      Plus Jakarta Sans, Orbitron, dan JetBrains Mono.
                    </li>
                    <li>
                      <strong>Parser Lirik & Satu Baris per Cue (Bagian 4 & 5)</strong>:
                      Normalisasi CRLF/LF, Unicode, ekstraksi `[Section]`,
                      deteksi auto-shrink ukuran font, dan tombol Split Cue.
                    </li>
                    <li>
                      <strong>State Machine Live & Command Deduplication (Bagian 12 & 14)</strong>:
                      Fase `Ready`, `Entering`, `Holding`, `Exiting`, `Blank`;
                      pemisahan `selectedCueId` (Preview) vs `liveCueId` (Live);
                      kebijakan `strict-single`, `cut`, dan `crossfade`.
                    </li>
                    <li>
                      <strong>Alpha Renderer Murni (Bagian 8, 9, 10)</strong>:
                      Render RGBA transparan (`clearRect`), 9 mode IN (termasuk
                      Word Reveal & Character Reveal), 5 mode HOLD, 4 mode OUT,
                      serta ekspor PNG Alpha murni.
                    </li>
                    <li>
                      <strong>Penyimpanan & Validasi JSON (Bagian 13 & 16)</strong>:
                      Checksum FNV-1a, autosave, rotasi backup, ekspor/impor JSON.
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[#07090e] border border-amber-500/30 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4 shrink-0" />
                    <span>Tugas Tahap B (Dilanjutkan oleh Agent Windows Native)</span>
                  </div>
                  <ul className="list-disc pl-4 text-[#94a3b8] space-y-1">
                    <li>
                      <strong>LL-B01 (PoC Native NDI Alpha)</strong>: Integrasi
                      NDI SDK Windows (`NDIlib_FourCC_video_type_BGRA`) dan
                      pengujian alpha di Resolume Arena.
                    </li>
                    <li>
                      <strong>LL-B02 (Server Kontrol Lokal LAN + Pairing QR)</strong>:
                      Implementasi HTTP/WebSocket `/remote`, `/api/pair`, dan
                      `/ws/control` untuk kontrol HP lintas perangkat.
                    </li>
                    <li>
                      <strong>LL-B03 (Host Desktop & Packaging .exe)</strong>:
                      Integrasi Electron/Host Windows, penyimpanan direktori
                      AppData, dan pembuatan installer `.exe`.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
