/**
 * LuiLyric Contracts (Bagian 13, 14, 28, 31)
 * Kontrak tipe proyek, cue, style, animasi, state machine, command, dan output adapter.
 * File ini portabel antara Web (Tahap A) dan Windows Desktop Host (Tahap B).
 */

export const CURRENT_SCHEMA_VERSION = 1;
export const APP_VERSION = '0.1.0-alpha.1';
export const DEFAULT_SENDER_NAME = 'LuiLyric - Main';

export type TextAnchor = 'left' | 'center' | 'right';
export type FillMode = 'fill' | 'outline' | 'fill-outline';
export type TextTransformMode = 'none' | 'uppercase' | 'lowercase';
export type CharStyleMode = 'uniform' | 'ransom-mixed' | 'pop-alternating';
export type CharBoxMode =
  | 'none'
  | 'confetti-tags'
  | 'comic-blocks'
  | 'liquid-drip'
  | 'rgb-split'
  | 'neon-ribbon'
  | 'marker-highlight';

export type AnimationInType =
  | 'none'
  | 'fade'
  | 'slideUp'
  | 'slideLeft'
  | 'zoom'
  | 'wordReveal'
  | 'charReveal'
  | 'blurReveal'
  | 'trackingExpand'
  | 'popBounce'
  | 'kineticSlam'
  | 'whipSlide'
  | 'flip3d'
  | 'spiralDrop'
  | 'glitchIn'
  | 'typewriter'
  | 'wordsRiseBlur'
  | 'charMaskRise'
  | 'clipReveal'
  | 'slamStamp'
  | 'linesFromSides'
  | 'scrambleText';

export type AnimationHoldType =
  | 'static'
  | 'gentleFloat'
  | 'pulse'
  | 'glowBreath'
  | 'charWave'
  | 'ransomJitter'
  | 'comicBounce'
  | 'beatStomp'
  | 'discoWave'
  | 'glitchTwitch'
  | 'pendulumTilt'
  | 'shineSweep'
  | 'floatWave'
  | 'beatBounce';

export type AnimationOutType =
  | 'cut'
  | 'fade'
  | 'slideDown'
  | 'shrink'
  | 'popScatter'
  | 'whipOut'
  | 'dropGravity'
  | 'glitchOut'
  | 'implodeZoom'
  | 'wordsExit'
  | 'flashCut';

export type EasingType =
  | 'linear'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutBack';

export type TransitionPolicy = 'strict-single' | 'cut' | 'crossfade';

export interface CueStyle {
  fontFamily: string;
  fontWeight: number;
  italic: boolean;
  fontSize: number; // Ukuran dasar dalam px pada resolusi desain (1920x1080)
  minFontSize: number; // Batas minimum auto-shrink satu baris (default 36px)
  letterSpacing: number; // Dalam px
  textTransform: TextTransformMode;
  fillMode: FillMode;
  fill: string; // Hex warna utama
  useGradient: boolean;
  gradientEnd: string; // Hex warna kedua jika useGradient aktif
  gradientAngle: number; // Derajat 0-360
  outlineColor: string;
  outlineWidth: number; // 0 = mati
  outerOutlineColor?: string; // Warna sticker border luar (mis. #FFFFFF)
  outerOutlineWidth?: number; // Ketebalan sticker border luar (px, 0 = mati)
  extrudeDepth?: number; // Kedalaman efek 3D block extrude (px, 0 = mati)
  extrudeColor?: string; // Warna efek 3D block extrude (mis. #0284C7)
  extrudeAngle?: number; // Sudut arah 3D extrude dalam derajat (default 135)
  charStyleMode?: CharStyleMode; // 'uniform' | 'ransom-mixed' (acak font & warna) | 'pop-alternating' (warna selang-seling)
  charColorPalette?: string[]; // Daftar warna per karakter untuk ransom / pop
  charBoxMode?: CharBoxMode; // 'none' | 'confetti-tags' (kartu miring kecil) | 'comic-blocks' (blok komik miring besar)
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowOpacity: number; // 0..1
  glowColor: string;
  glowRadius: number; // 0 = mati
  glowIntensity: number; // 0..2
  x: number; // 0..1 koordinat ternormalisasi
  y: number; // 0..1 koordinat ternormalisasi
  anchor: TextAnchor;
  opacity: number; // 0..1
  maxWidthRatio: number; // 0.5..0.96 batas lebar kanvas satu baris
  lineHeight?: number; // Rasio tinggi baris multiline (default 1.25)
}

export interface AnimationInConfig {
  type: AnimationInType;
  durationMs: number;
  delayMs: number;
  staggerMs: number;
  easing: EasingType;
  distancePx: number;
  initialScale: number;
  initialBlur: number;
  inScope?: 'from-blank' | 'every-cue'; // Default: 'every-cue' atau 'from-blank'
}

export interface AnimationHoldConfig {
  type: AnimationHoldType;
  cycleMs: number;
  amplitudePx: number;
  scaleAmount: number;
  glowPulseAmount: number;
}

export interface AnimationOutConfig {
  type: AnimationOutType;
  durationMs: number;
  easing: EasingType;
  distancePx: number;
}

export interface CueAnimation {
  in: AnimationInConfig;
  hold: AnimationHoldConfig;
  out: AnimationOutConfig;
  seed?: number;
}

export interface Cue {
  id: string;
  text: string;
  section?: string;
  notes?: string;
  isBlankCue?: boolean; // Cue jeda instrumental eksplisit
  presetId: string;
  styleOverrides: Partial<CueStyle>;
  animationOverrides?: {
    in?: Partial<AnimationInConfig>;
    hold?: Partial<AnimationHoldConfig>;
    out?: Partial<AnimationOutConfig>;
  };
}

export interface StylePreset {
  id: string;
  name: string;
  version: number;
  style: CueStyle;
  animation: CueAnimation;
}

export interface Song {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  defaultPresetId: string;
  transitionPolicy: TransitionPolicy;
  cues: Cue[];
}

export interface OutputConfig {
  senderName: string;
  width: number;
  height: number;
  fps: 30 | 60;
  alpha: boolean;
}

export interface ProjectFile {
  schemaVersion: number;
  appVersion: string;
  projectId: string;
  name: string;
  updatedAt: string;
  checksum?: string;
  activeSongId?: string;
  selectedCueId?: string;
  output: OutputConfig;
  songs: Song[];
  presets: StylePreset[];
}

// ============================================================================
// State Machine Live & Command Contracts (Bagian 12 & 14)
// ============================================================================

export type LivePhase = 'Ready' | 'Entering' | 'Holding' | 'Exiting' | 'Blank';

export interface LiveCueSnapshot {
  cueId: string;
  songId: string;
  index: number;
  text: string;
  section?: string;
  isBlankCue?: boolean;
  resolvedStyle: CueStyle;
  resolvedAnimation: CueAnimation;
}

export interface LiveEngineState {
  revision: number;
  activeSongId: string;
  selectedCueId: string | null; // Hanya untuk Preview editor
  liveCueId: string | null;     // Sedang tayang di Output Live
  liveSnapshot: LiveCueSnapshot | null; // Dipertahankan meskipun cue diedit/dihapus saat live
  previousSnapshot: LiveCueSnapshot | null; // Untuk crossfade/exiting
  pendingTargetCueId: string | null; // Target cue setelah fase Exiting selesai
  phase: LivePhase;
  phaseStartedAtMs: number;
  blankedFromSnapshot: LiveCueSnapshot | null; // Untuk Restore dari Blank
  lastWarning: string | null;
  lastCommandId: string | null;
}

export type ControlAction =
  | 'GO_CUE'
  | 'NEXT'
  | 'PREVIOUS'
  | 'REPLAY'
  | 'BLANK'
  | 'RESTORE'
  | 'SELECT_CUE'
  | 'SELECT_SONG'
  | 'APPLY_TO_LIVE';

export interface ControlCommand {
  type: 'command';
  id: string;
  sessionId: string;
  expectedRevision?: number;
  action: ControlAction;
  payload?: {
    cueId?: string;
    songId?: string;
    immediate?: boolean;
  };
}

export interface ControlAck {
  type: 'ack';
  commandId: string;
  accepted: boolean;
  reason?: string;
  revision: number;
  liveCueId: string | null;
  phase: LivePhase;
}

// ============================================================================
// Output & Storage Adapter Contracts (Bagian 10, 16, 31)
// ============================================================================

export type OutputStatus = 'unavailable' | 'stopped' | 'starting' | 'running' | 'error';

export interface OutputCapabilities {
  nativeNdi: boolean;
  spout: boolean;
  alpha: boolean;
  supportedFrameRates: number[];
  environmentLabel: string;
}

export interface OutputAdapter {
  getCapabilities(): OutputCapabilities;
  start(config: OutputConfig): Promise<void>;
  stop(): Promise<void>;
  getStatus(): OutputStatus;
  getStatusMessage(): string;
}

export interface StorageBackupEntry {
  id: string;
  timestamp: string;
  projectName: string;
  songCount: number;
  project: ProjectFile;
}

export interface StorageAdapter {
  loadActiveProject(): Promise<ProjectFile | null>;
  saveActiveProject(project: ProjectFile): Promise<void>;
  createBackup(project: ProjectFile, label?: string): Promise<StorageBackupEntry>;
  listBackups(): Promise<StorageBackupEntry[]>;
  restoreBackup(backupId: string): Promise<ProjectFile | null>;
  exportProjectJson(project: ProjectFile): string;
  importProjectJson(rawJson: string): { ok: true; project: ProjectFile; warnings: string[] } | { ok: false; error: string };
}
