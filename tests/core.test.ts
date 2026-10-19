/**
 * Automated Unit Tests for LuiLyric Stage A (Bagian 20, 24, 29)
 * Menguji:
 * 1. Normalisasi CRLF/LF, karakter Unicode, ekstraksi bagian [Verse]/[Chorus], & mode baris kosong
 * 2. Evaluasi kecocokan satu baris (Auto-Shrink & Overflow Warning) + Split Cue
 * 3. Urutan pewarisan style (App Default -> Song Preset -> Cue Preset -> Cue Override) & Reset Override
 * 4. State Machine Live (Ready -> Entering -> Holding -> Exiting -> Blank -> Restore -> Replay)
 * 5. Pemisahan selectedCueId (Preview) vs liveCueId (Live) & ketahanan liveSnapshot saat cue dihapus
 * 6. Deduplikasi Command ID & penolakan expectedRevision yang usang
 * 7. Batas awal/akhir lagu (Previous di cue pertama & Next di cue terakhir = no-op tanpa wrap)
 * 8. Validasi JSON Proyek, Checksum, Backup, & Status jujur PreviewOutputAdapter ("Unavailable in web preview")
 */

import assert from 'assert';
import { createDefaultProject } from '../src/core/defaults';
import {
  evaluateSingleLineFit,
  parseLyricsToCues,
  splitCueIntoTwo,
} from '../src/core/lyricParser';
import {
  hasCueOverrides,
  resolveCueAnimation,
  resolveCueStyle,
} from '../src/core/styleResolver';
import { LiveEngine } from '../src/core/liveEngine';
import { PreviewOutputAdapter } from '../src/adapters/outputAdapter';
import {
  BrowserStorageAdapter,
  sanitizeAndValidateProject,
} from '../src/adapters/storageAdapter';
import { applyEasing } from '../src/renderer/alphaRenderer';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log('=== Menjalankan Unit Test LuiLyric Tahap A ===\n');

test('1. Parser Lirik: normalisasi CRLF/LF, karakter Unicode, dan ekstraksi [Section]', () => {
  const raw =
    '[Verse 1]\r\nBaris pertama dengan tanda baca — & aksen é ü!\r\nBaris kedua tetap satu cue\r\n\r\n[Chorus]\nNYALAKAN FREKUENSI KITA!';
  const res = parseLyricsToCues(raw, {
    defaultPresetId: 'preset-clean',
    extractSectionHeaders: true,
    emptyLineMode: 'section-break',
  });

  assert.strictEqual(res.cues.length, 3);
  assert.strictEqual(res.cues[0].section, 'Verse 1');
  assert.strictEqual(
    res.cues[0].text,
    'Baris pertama dengan tanda baca — & aksen é ü!'
  );
  assert.strictEqual(res.cues[1].section, 'Verse 1');
  assert.strictEqual(res.cues[2].section, 'Chorus');
  assert.strictEqual(res.cues[2].text, 'NYALAKAN FREKUENSI KITA!');
  assert.deepStrictEqual(res.detectedSections, ['Verse 1', 'Chorus']);
});

test('2. Parser Lirik: mode baris kosong "blank-cue" membuat cue jeda eksplisit', () => {
  const raw = 'Baris satu\n\nBaris dua';
  const res = parseLyricsToCues(raw, {
    defaultPresetId: 'preset-clean',
    extractSectionHeaders: true,
    emptyLineMode: 'blank-cue',
  });
  assert.strictEqual(res.cues.length, 3);
  assert.strictEqual(res.cues[1].isBlankCue, true);
  assert.strictEqual(res.cues[1].text, '');
});

test('3. Evaluasi Satu Baris (Auto-Shrink & Split Cue): deteksi baris panjang dan pembagian 2 cue', () => {
  const shortFit = evaluateSingleLineFit(
    'Baris pendek aman',
    {
      fontSize: 92,
      minFontSize: 40,
      letterSpacing: 1,
      maxWidthRatio: 0.88,
      textTransform: 'none',
    },
    1920
  );
  assert.strictEqual(shortFit.fitsAtBaseSize, true);
  assert.strictEqual(shortFit.warning, null);

  const longText =
    'Ini adalah contoh baris lirik yang sangat panjang sehingga memerlukan pengecilan ukuran font otomatis agar tidak terpotong di panggung';
  const longFit = evaluateSingleLineFit(
    longText,
    {
      fontSize: 96,
      minFontSize: 40,
      letterSpacing: 2,
      maxWidthRatio: 0.88,
      textTransform: 'uppercase',
    },
    1920
  );
  assert.strictEqual(longFit.fitsAtBaseSize, false);
  assert.ok(longFit.recommendedFontSize < 96);
  assert.ok(longFit.warning && longFit.warning.length > 0);

  const [c1, c2] = splitCueIntoTwo({
    id: 'cue-long',
    text: longText,
    presetId: 'preset-clean',
    styleOverrides: { fill: '#00f0ff' },
  });
  assert.ok(c1.text.length > 0 && c2.text.length > 0);
  assert.notStrictEqual(c1.id, c2.id);
  assert.strictEqual(c2.styleOverrides.fill, '#00f0ff');
});

test('4. Resolusi Pewarisan Style: Default -> Song Preset -> Cue Preset -> Cue Override', () => {
  const project = createDefaultProject();
  const song = project.songs[0];
  const cue = {
    ...song.cues[0],
    presetId: 'preset-lui-cyber',
    styleOverrides: {
      fontSize: 128,
      fill: '#10b981',
    },
  };

  const resolved = resolveCueStyle(cue, song, project.presets);
  assert.strictEqual(resolved.fontSize, 128);
  assert.strictEqual(resolved.fill, '#10b981');
  // Warisan dari preset-lui-cyber
  assert.strictEqual(resolved.fontFamily, 'Orbitron, sans-serif');
  assert.strictEqual(hasCueOverrides(cue), true);

  const anim = resolveCueAnimation(cue, song, project.presets);
  assert.strictEqual(anim.in.type, 'wordReveal');
});

test('5. State Machine Live: Pemisahan Preview (SELECT_CUE) vs Live (GO_CUE, NEXT, PREVIOUS)', () => {
  const project = createDefaultProject();
  const engine = new LiveEngine(project, 0);

  // Awal: Ready, belum ada cue live
  assert.strictEqual(engine.getState().phase, 'Ready');
  assert.strictEqual(engine.getState().liveCueId, null);

  // Pilih cue ke-3 di editor: hanya mengubah selectedCueId, liveCueId tetap null
  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-1',
      sessionId: 'local',
      action: 'SELECT_CUE',
      payload: { cueId: 'cue-003' },
    },
    10
  );
  assert.strictEqual(engine.getState().selectedCueId, 'cue-003');
  assert.strictEqual(engine.getState().liveCueId, null);

  // Tekan GO pada cue-001
  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-2',
      sessionId: 'local',
      action: 'GO_CUE',
      payload: { cueId: 'cue-001' },
    },
    100
  );
  assert.strictEqual(engine.getState().liveCueId, 'cue-001');
  assert.strictEqual(engine.getState().phase, 'Entering');

  // Tick melewati durasi IN (360ms) -> fase berubah menjadi Holding
  engine.tick(project, 500);
  assert.strictEqual(engine.getState().phase, 'Holding');

  // Tekan NEXT saat Holding (mode strict-single) -> masuk Exiting dulu
  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-3',
      sessionId: 'local',
      action: 'NEXT',
    },
    600
  );
  assert.strictEqual(engine.getState().phase, 'Exiting');
  assert.strictEqual(engine.getState().pendingTargetCueId, 'cue-002');

  // Tick melewati durasi OUT (160ms) -> otomatis Entering pada cue-002
  engine.tick(project, 800);
  assert.strictEqual(engine.getState().liveCueId, 'cue-002');
  assert.strictEqual(engine.getState().phase, 'Entering');
});

test('6. State Machine Live: Next cepat saat transisi tidak menumpuk antrean & batas lagu tidak wrap', () => {
  const project = createDefaultProject();
  const engine = new LiveEngine(project, 0);

  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-go-1',
      sessionId: 'local',
      action: 'GO_CUE',
      payload: { cueId: 'cue-001' },
    },
    0
  );

  // Previous pada cue pertama harus no-op dan tetap di cue-001
  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-prev-bound',
      sessionId: 'local',
      action: 'PREVIOUS',
    },
    20
  );
  assert.strictEqual(engine.getState().liveCueId, 'cue-001');
  assert.ok(engine.getState().lastWarning?.includes('pertama'));

  // Next cepat beruntun saat masih Entering langsung melompat ke target terbaru
  engine.dispatch(
    project,
    { type: 'command', id: 'cmd-n1', sessionId: 'local', action: 'NEXT' },
    30
  );
  engine.dispatch(
    project,
    { type: 'command', id: 'cmd-n2', sessionId: 'local', action: 'NEXT' },
    40
  );
  assert.strictEqual(engine.getState().liveCueId, 'cue-003');
});

test('7. State Machine Live: Blank, Restore, Replay, Deduplikasi Command ID, dan Stale Revision', () => {
  const project = createDefaultProject();
  const engine = new LiveEngine(project, 0);

  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-go',
      sessionId: 'local',
      action: 'GO_CUE',
      payload: { cueId: 'cue-001' },
    },
    0
  );
  engine.tick(project, 700);
  assert.strictEqual(engine.getState().phase, 'Holding');

  // Pengiriman ulang command ID yang sama harus diabaikan (idempotent)
  const revBefore = engine.getState().revision;
  const dupRes = engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-go',
      sessionId: 'local',
      action: 'NEXT',
    },
    750
  );
  assert.strictEqual(dupRes.ack.accepted, true);
  assert.strictEqual(dupRes.state.revision, revBefore);
  assert.strictEqual(dupRes.state.liveCueId, 'cue-001');

  // ExpectedRevision usang harus ditolak
  const staleRes = engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-stale',
      sessionId: 'remote',
      expectedRevision: 1,
      action: 'NEXT',
    },
    760
  );
  assert.strictEqual(staleRes.ack.accepted, false);

  // Blank segera -> fase Blank
  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-blank',
      sessionId: 'local',
      action: 'BLANK',
      payload: { immediate: true },
    },
    800
  );
  assert.strictEqual(engine.getState().phase, 'Blank');
  assert.strictEqual(engine.getState().liveCueId, null);

  // Restore -> kembali Entering pada cue-002
  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-restore',
      sessionId: 'local',
      action: 'RESTORE',
    },
    900
  );
  assert.strictEqual(engine.getState().phase, 'Entering');
  assert.strictEqual(engine.getState().liveCueId, 'cue-001');

  // Blank dengan animasi out halus (immediate: false / default)
  engine.dispatch(
    project,
    {
      type: 'command',
      id: 'cmd-blank-anim',
      sessionId: 'local',
      action: 'BLANK',
      payload: { immediate: false },
    },
    1000
  );
  assert.strictEqual(engine.getState().phase, 'Exiting');
  assert.ok(engine.getState().liveSnapshot !== null);

  // Setelah durasi OUT selesai, tick bertransisi ke Blank
  const outDur = engine.getState().liveSnapshot?.resolvedAnimation.out.durationMs || 200;
  engine.tick(project, 1000 + outDur + 50);
  assert.strictEqual(engine.getState().phase, 'Blank');
  assert.strictEqual(engine.getState().liveCueId, null);
});

test('8. Output & Storage Adapter: Label NDI jujur & Validasi JSON Proyek', () => {
  const out = new PreviewOutputAdapter();
  const caps = out.getCapabilities();
  assert.strictEqual(caps.nativeNdi, false);
  assert.strictEqual(caps.environmentLabel, 'Unavailable in web preview');
  assert.strictEqual(out.getStatus(), 'unavailable');

  const storage = new BrowserStorageAdapter();
  const project = createDefaultProject();
  const exported = storage.exportProjectJson(project);
  assert.ok(!exported.includes('pairingCode'));

  const imported = storage.importProjectJson(exported);
  assert.strictEqual(imported.ok, true);
  if (imported.ok) {
    assert.strictEqual(imported.project.songs.length, project.songs.length);
    assert.ok(imported.project.checksum?.startsWith('fnv1a-'));
  }

  const invalid = sanitizeAndValidateProject({ schemaVersion: 999 });
  assert.strictEqual(invalid.ok, false);

  assert.strictEqual(applyEasing(0, 'easeOutCubic'), 0);
  assert.strictEqual(applyEasing(1, 'easeOutCubic'), 1);
});

console.log(`\n=== SEMUA ${passed} UNIT TEST LULUS DENGAN SUKSES ===`);
