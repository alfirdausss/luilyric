/**
 * LuiLyric Lyric Parser & Line Fit Validator (Bagian 4 & 5)
 * - Normalisasi CRLF dan LF saat impor
 * - Pertahankan tanda baca, aksen, dan karakter Unicode
 * - Judul bagian seperti [Verse], [Chorus], [Bridge] menjadi metadata
 * - Pilihan perlakuan baris kosong ('section-break' | 'ignore' | 'blank-cue')
 * - Satu cue = satu baris; deteksi baris terlalu panjang untuk peringatan auto-shrink / split
 */

import { Cue, CueStyle } from '../contracts';

export type EmptyLineMode = 'section-break' | 'ignore' | 'blank-cue';

export interface LyricImportOptions {
  defaultPresetId: string;
  extractSectionHeaders: boolean;
  emptyLineMode: EmptyLineMode;
  idPrefix?: string;
}

export interface ParsedLyricsResult {
  cues: Cue[];
  warnings: string[];
  detectedSections: string[];
}

const SECTION_HEADER_REGEX = /^\s*\[([^\[\]]{1,48})\]\s*$/;

let cueCounter = 1;

export function generateStableCueId(prefix = 'cue'): string {
  const rand = Math.random().toString(36).slice(2, 7);
  const id = `${prefix}-${Date.now().toString(36)}-${cueCounter++}-${rand}`;
  return id;
}

/**
 * Mengestimasi apakah satu baris lirik muat dalam satu baris kanvas tanpa wrap,
 * atau memerlukan pengecilan font (auto-shrink) sampai minFontSize, atau masih meluap.
 */
export function evaluateSingleLineFit(
  text: string,
  style: Pick<CueStyle, 'fontSize' | 'minFontSize' | 'letterSpacing' | 'maxWidthRatio' | 'textTransform'>,
  canvasWidth = 1920
): {
  fitsAtBaseSize: boolean;
  fitsAtMinSize: boolean;
  recommendedFontSize: number;
  estimatedWidthAtBasePx: number;
  maxAllowedWidthPx: number;
  warning: string | null;
} {
  const cleanText =
    style.textTransform === 'uppercase'
      ? text.toUpperCase()
      : style.textTransform === 'lowercase'
      ? text.toLowerCase()
      : text;

  const charCount = Array.from(cleanText).length;
  const maxAllowedWidthPx = Math.floor(canvasWidth * (style.maxWidthRatio || 0.72));

  if (charCount === 0) {
    return {
      fitsAtBaseSize: true,
      fitsAtMinSize: true,
      recommendedFontSize: style.fontSize,
      estimatedWidthAtBasePx: 0,
      maxAllowedWidthPx,
      warning: null,
    };
  }

  // Rata-rata lebar glyph proporsional (~0.56 * fontSize) + letterSpacing
  const avgGlyphRatio = style.textTransform === 'uppercase' ? 0.64 : 0.55;
  const estimateWidth = (fontSize: number) =>
    charCount * (fontSize * avgGlyphRatio + Math.max(0, style.letterSpacing));

  const estimatedWidthAtBasePx = Math.round(estimateWidth(style.fontSize));
  const fitsAtBaseSize = estimatedWidthAtBasePx <= maxAllowedWidthPx;

  if (fitsAtBaseSize) {
    return {
      fitsAtBaseSize: true,
      fitsAtMinSize: true,
      recommendedFontSize: style.fontSize,
      estimatedWidthAtBasePx,
      maxAllowedWidthPx,
      warning: null,
    };
  }

  // Hitung ukuran font terkompresi agar tetap 1 baris
  const rawFittedSize = Math.floor(
    (maxAllowedWidthPx / charCount - Math.max(0, style.letterSpacing)) / avgGlyphRatio
  );
  const minFontSize = Math.max(20, style.minFontSize || 36);
  const fitsAtMinSize = rawFittedSize >= minFontSize;
  const recommendedFontSize = Math.max(minFontSize, Math.min(style.fontSize, rawFittedSize));

  const warning = fitsAtMinSize
    ? `Baris panjang (${charCount} karakter): ukuran font dikecilkan otomatis dari ${style.fontSize}px ke ~${recommendedFontSize}px agar tetap 1 baris.`
    : `Baris terlalu panjang (${charCount} karakter): masih melebihi batas aman pada ukuran minimum (${minFontSize}px). Disarankan membagi cue menjadi 2 baris.`;

  return {
    fitsAtBaseSize: false,
    fitsAtMinSize,
    recommendedFontSize,
    estimatedWidthAtBasePx,
    maxAllowedWidthPx,
    warning,
  };
}

/**
 * Memisahkan teks lirik multi-baris (.txt / paste) menjadi daftar Cue satu baris.
 */
export function parseLyricsToCues(
  rawText: string,
  options: LyricImportOptions
): ParsedLyricsResult {
  // Normalisasi CRLF dan CR menjadi LF, pertahankan seluruh karakter Unicode
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');

  const cues: Cue[] = [];
  const warnings: string[] = [];
  const detectedSections: string[] = [];

  let currentSection: string | undefined = undefined;
  let autoSectionIndex = 1;
  let lastLineWasEmpty = false;

  for (let i = 0; i < rawLines.length; i++) {
    // Hapus whitespace ujung kanan/kiri tanpa merusak aksen atau tanda baca internal
    const line = rawLines[i].trim();

    if (line.length === 0) {
      if (options.emptyLineMode === 'blank-cue') {
        cues.push({
          id: generateStableCueId(options.idPrefix),
          text: '',
          section: currentSection,
          isBlankCue: true,
          notes: 'Cue kosong dari baris kosong impor',
          presetId: options.defaultPresetId,
          styleOverrides: {},
        });
      } else if (options.emptyLineMode === 'section-break') {
        if (!lastLineWasEmpty && cues.length > 0) {
          // Tandai pemisah bagian bila baris berikutnya tidak memiliki header [Section] eksplisit
          lastLineWasEmpty = true;
        }
      }
      continue;
    }

    if (options.extractSectionHeaders) {
      const headerMatch = line.match(SECTION_HEADER_REGEX);
      if (headerMatch) {
        currentSection = headerMatch[1].trim();
        if (!detectedSections.includes(currentSection)) {
          detectedSections.push(currentSection);
        }
        lastLineWasEmpty = false;
        continue;
      }
    }

    if (lastLineWasEmpty && options.emptyLineMode === 'section-break') {
      if (!currentSection || currentSection.startsWith('Bagian ')) {
        autoSectionIndex++;
        currentSection = `Bagian ${autoSectionIndex}`;
      }
      lastLineWasEmpty = false;
    } else if (!currentSection && options.emptyLineMode === 'section-break') {
      currentSection = 'Bagian 1';
    }

    const cue: Cue = {
      id: generateStableCueId(options.idPrefix),
      text: line,
      section: currentSection,
      presetId: options.defaultPresetId,
      styleOverrides: {},
    };

    const fit = evaluateSingleLineFit(line, {
      fontSize: 92,
      minFontSize: 40,
      letterSpacing: 2,
      maxWidthRatio: 0.72,
      textTransform: 'none',
    });

    if (!fit.fitsAtBaseSize && fit.warning) {
      warnings.push(`Baris #${cues.length + 1}: ${fit.warning}`);
    }

    cues.push(cue);
  }

  return {
    cues,
    warnings,
    detectedSections,
  };
}

/**
 * Membagi satu cue yang terlalu panjang menjadi dua cue berurutan pada batas kata terdekat di tengah.
 */
export function splitCueIntoTwo(cue: Cue): [Cue, Cue] {
  const words = cue.text.trim().split(/\s+/);
  if (words.length <= 1) {
    const mid = Math.ceil(cue.text.length / 2);
    return [
      { ...cue, text: cue.text.slice(0, mid).trim() },
      {
        ...cue,
        id: generateStableCueId(),
        text: cue.text.slice(mid).trim(),
      },
    ];
  }

  const midWord = Math.ceil(words.length / 2);
  const firstHalf = words.slice(0, midWord).join(' ');
  const secondHalf = words.slice(midWord).join(' ');

  return [
    {
      ...cue,
      text: firstHalf,
    },
    {
      ...cue,
      id: generateStableCueId(),
      text: secondHalf,
      styleOverrides: { ...cue.styleOverrides },
      animationOverrides: cue.animationOverrides
        ? {
            in: cue.animationOverrides.in ? { ...cue.animationOverrides.in } : undefined,
            hold: cue.animationOverrides.hold ? { ...cue.animationOverrides.hold } : undefined,
            out: cue.animationOverrides.out ? { ...cue.animationOverrides.out } : undefined,
          }
        : undefined,
    },
  ];
}
