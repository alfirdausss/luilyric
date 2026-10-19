/**
 * LuiLyric Alpha Canvas 2D Renderer (Bagian 8, 9, 10)
 * - Merender tepat SATU baris lirik pada surface RGBA transparan (alpha=0 di luar teks/efek)
 * - Mendukung fase IN, HOLD, dan OUT dengan monotonic clock (elapsedMs)
 * - Mendukung Word Reveal, Character Reveal, Blur Reveal, Tracking Expand, Wave per karakter, Glow Breath
 * - Mengecilkan font otomatis sampai minFontSize jika baris panjang; tidak pernah diam-diam wrap ke 2 baris
 * - Checkerboard & Safe Area hanya digambar pada layer dekorasi Preview, tidak pernah masuk ke frame buffer alpha murni
 */

import {
  AnimationInConfig,
  CueAnimation,
  CueStyle,
  EasingType,
  LiveCueSnapshot,
  LivePhase,
} from '../contracts';

export type PreviewBackdropMode =
  | 'checkerboard'
  | 'black'
  | 'white'
  | 'red'
  | 'stage-synth';

export interface RenderFrameOptions {
  width: number;
  height: number;
  phase: LivePhase;
  elapsedMs: number;
  snapshot: LiveCueSnapshot | null;
  previousSnapshot?: LiveCueSnapshot | null;
  showSafeArea?: boolean; // Hanya untuk Preview! Jangan aktifkan pada buffer NDI
}

export interface RenderDiagnostics {
  actualFontSizePx: number;
  wasAutoShrunk: boolean;
  isOverflowingMinSize: boolean;
  measuredWidthPx: number;
  maxAllowedWidthPx: number;
}

export function applyEasing(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return clamped;
    case 'easeInCubic':
      return clamped * clamped * clamped;
    case 'easeOutCubic':
      return 1 - Math.pow(1 - clamped, 3);
    case 'easeInOutCubic':
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(clamped - 1, 3) + c1 * Math.pow(clamped - 1, 2);
    }
    default:
      return clamped;
  }
}

export function transformLyricText(
  text: string,
  mode: CueStyle['textTransform']
): string {
  if (mode === 'uppercase') return text.toUpperCase();
  if (mode === 'lowercase') return text.toLowerCase();
  return text;
}

export function formatFontFamily(family: string): string {
  if (!family) return 'sans-serif';
  return family
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('"') || trimmed.startsWith("'")) return trimmed;
      if (
        trimmed.includes(' ') &&
        !['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(
          trimmed.toLowerCase()
        )
      ) {
        return `"${trimmed}"`;
      }
      return trimmed;
    })
    .filter(Boolean)
    .join(', ');
}

interface CachedLayout {
  wrappedLines: WrappedLine[];
  measuredWidthPx: number;
  activeFontSizePx: number;
  wasAutoShrunk: boolean;
  isOverflowingMinSize: boolean;
  charWidthsPerLine: number[][];
  lineTotalWidths: number[];
}

const lyricLayoutCache = new Map<string, CachedLayout>();
const MAX_LAYOUT_CACHE = 128;

interface CachedGlyphSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

const glyphSpriteCache = new Map<string, CachedGlyphSprite>();
const MAX_GLYPH_CACHE = 512;

function getGlyphSprite(
  char: string,
  fontString: string,
  style: CueStyle,
  scaleFactor: number,
  fontSizePx: number,
  overrideFillColor?: string
): CachedGlyphSprite {
  const fill = overrideFillColor || style.fill || '#FFFFFF';
  const gradEnd = overrideFillColor ? '' : (style.gradientEnd || '');
  const useGrad = overrideFillColor ? false : Boolean(style.useGradient && style.gradientEnd);
  const outlineW = Math.round((style.outlineWidth || 0) * scaleFactor * 10) / 10;
  const outerW = Math.round((style.outerOutlineWidth || 0) * scaleFactor * 10) / 10;
  const extrude = Math.round((style.extrudeDepth || 0) * scaleFactor * 10) / 10;
  const glowR = Math.round((style.glowRadius || 0) * scaleFactor * 10) / 10;

  const cacheKey = `${char}|${fontString}|${fontSizePx}|${fill}|${gradEnd}|${useGrad}|${style.outlineColor}|${outlineW}|${style.outerOutlineColor}|${outerW}|${extrude}|${style.extrudeColor}|${glowR}|${style.glowColor}`;

  let cached = glyphSpriteCache.get(cacheKey);
  if (cached) return cached;

  const totalStroke = (outlineW + outerW) * 2;
  const pad = Math.ceil(
    Math.max(
      totalStroke + 16,
      extrude * 1.5 + 16,
      glowR * 2 + 16,
      32
    )
  );

  let charW = fontSizePx;
  if (typeof document !== 'undefined') {
    const measCanvas = document.createElement('canvas');
    const measCtx = measCanvas.getContext('2d');
    if (measCtx) {
      measCtx.font = fontString;
      charW = Math.ceil(measCtx.measureText(char).width || fontSizePx);
    }
  }

  const canvasW = Math.max(16, Math.ceil(charW + pad * 2));
  const canvasH = Math.max(16, Math.ceil(fontSizePx * 1.4 + pad * 2));

  const offCanvas =
    typeof document !== 'undefined'
      ? document.createElement('canvas')
      : ({ width: canvasW, height: canvasH } as any);
  offCanvas.width = canvasW;
  offCanvas.height = canvasH;

  const offCtx = offCanvas.getContext('2d');
  const anchorX = canvasW / 2;
  const anchorY = canvasH / 2;

  if (offCtx) {
    offCtx.font = fontString;
    if (outerW > 0.5 || extrude > 0.5) {
      drawBackdropExtrudeAndSticker(
        offCtx,
        char,
        anchorX,
        anchorY,
        'center',
        style,
        scaleFactor,
        1,
        false
      );
    }

    const tokenStyle: CueStyle = overrideFillColor
      ? { ...style, fill: overrideFillColor, useGradient: false, outerOutlineWidth: 0, extrudeDepth: 0 }
      : { ...style, outerOutlineWidth: 0, extrudeDepth: 0 };

    drawStyledTextToken(
      offCtx,
      char,
      anchorX,
      anchorY,
      'center',
      tokenStyle,
      scaleFactor,
      fontSizePx,
      1,
      1,
      undefined,
      false
    );
  }

  cached = {
    canvas: offCanvas,
    width: canvasW,
    height: canvasH,
    anchorX,
    anchorY,
  };

  if (glyphSpriteCache.size > MAX_GLYPH_CACHE) {
    const firstKey = glyphSpriteCache.keys().next().value;
    if (firstKey) glyphSpriteCache.delete(firstKey);
  }
  glyphSpriteCache.set(cacheKey, cached);

  return cached;
}

/**
 * Menggambar background pengujian hanya pada elemen kanvas backdrop Preview terpisah
 * (atau sebelum layer alpha jika mode preview visual diaktifkan).
 * Untuk buffer output NDI, fungsi ini TIDAK dipanggil agar piksel latar memiliki alpha = 0.
 */
export function drawPreviewBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: PreviewBackdropMode
): void {
  const canvasEl = ctx.canvas as any;
  const cacheKey = `${width}x${height}:${mode}`;
  if (canvasEl && canvasEl.__cachedBackdropKey === cacheKey) {
    return;
  }
  if (canvasEl) {
    canvasEl.__cachedBackdropKey = cacheKey;
  }

  ctx.save();
  if (mode === 'black') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  } else if (mode === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (mode === 'red') {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, width, height);
  } else if (mode === 'stage-synth') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#131c31');
    grad.addColorStop(1, '#042f2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Garis horizon panggung halus untuk menguji alpha glow
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let y = Math.floor(height * 0.2); y < height; y += Math.floor(height * 0.15)) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else {
    // Checkerboard transparansi standar
    const tileSize = Math.max(12, Math.floor(width / 64));
    ctx.fillStyle = '#0f1420';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#182032';
    for (let y = 0; y < height; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        if (((x / tileSize) + (y / tileSize)) % 2 === 0) {
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }
  }
  ctx.restore();
}

export function drawSafeAreaGuides(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);

  // Action Safe 90%
  const ax = width * 0.05;
  const ay = height * 0.05;
  ctx.strokeRect(ax, ay, width * 0.9, height * 0.9);

  // Title Safe 80%
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
  const tx = width * 0.1;
  const ty = height * 0.1;
  ctx.strokeRect(tx, ty, width * 0.8, height * 0.8);

  // Crosshair tengah
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 16, height / 2);
  ctx.lineTo(width / 2 + 16, height / 2);
  ctx.moveTo(width / 2, height / 2 - 16);
  ctx.lineTo(width / 2, height / 2 + 16);
  ctx.stroke();
  ctx.restore();
}

/**
 * Merender frame lirik alpha murni.
 * Mengembalikan informasi diagnostik ukuran font dan kecocokan satu baris.
 */
export function renderLyricAlphaFrame(
  ctx: CanvasRenderingContext2D,
  options: RenderFrameOptions
): RenderDiagnostics {
  const { width, height, phase, elapsedMs, snapshot, previousSnapshot, showSafeArea } =
    options;

  // Bersihkan seluruh kanvas ke RGBA(0, 0, 0, 0) — transparansi penuh untuk NDI Alpha
  ctx.clearRect(0, 0, width, height);

  let diagnostics: RenderDiagnostics = {
    actualFontSizePx: 0,
    wasAutoShrunk: false,
    isOverflowingMinSize: false,
    measuredWidthPx: 0,
    maxAllowedWidthPx: Math.floor(width * 0.88),
  };

  if (previousSnapshot && phase === 'Entering') {
    drawSingleSnapshot(ctx, width, height, previousSnapshot, 'Exiting', elapsedMs);
  }

  if (
    snapshot &&
    !snapshot.isBlankCue &&
    snapshot.text.trim().length > 0 &&
    phase !== 'Ready' &&
    phase !== 'Blank'
  ) {
    diagnostics = drawSingleSnapshot(ctx, width, height, snapshot, phase, elapsedMs);
  }

  if (showSafeArea) {
    drawSafeAreaGuides(ctx, width, height);
  }

  return diagnostics;
}

function drawSingleSnapshot(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  snapshot: LiveCueSnapshot,
  phase: LivePhase,
  elapsedMs: number
): RenderDiagnostics {
  const style = snapshot.resolvedStyle;
  const anim = snapshot.resolvedAnimation;
  const scaleFactor = Math.min(canvasWidth / 1920, canvasHeight / 1080);

  const displayText = transformLyricText(snapshot.text, style.textTransform);

  // Batas lebar aman default: 0.72 (sehingga ada ruang bebas ~14% di kiri dan 14% di kanan, tidak mepet tepi layar)
  const configuredRatio =
    style.maxWidthRatio && style.maxWidthRatio !== 0.88 ? style.maxWidthRatio : 0.72;
  const maxAllowedWidthPx = Math.floor(
    canvasWidth * Math.max(0.42, Math.min(0.92, configuredRatio))
  );

  // Skala ukuran font terhadap resolusi desain 1920x1080
  const baseFontSizePx = Math.max(14, Math.round(style.fontSize * scaleFactor));
  const minFontSizePx = Math.max(12, Math.round((style.minFontSize || 40) * scaleFactor));
  const baseLetterSpacingPx = (style.letterSpacing || 0) * scaleFactor;

  const isRansomHold = anim.hold.type === 'ransomJitter';
  const isComicHold = anim.hold.type === 'comicBounce';
  const isDiscoHold = anim.hold.type === 'discoWave';
  const isGlitchHold = anim.hold.type === 'glitchTwitch';
  const hasCharStyle =
    style.charStyleMode === 'ransom-mixed' ||
    style.charStyleMode === 'pop-alternating';
  const hasCharBox =
    Boolean(style.charBoxMode) && style.charBoxMode !== 'none';
  const hasPerCharFX =
    isRansomHold ||
    isComicHold ||
    isDiscoHold ||
    isGlitchHold ||
    hasCharStyle ||
    hasCharBox;

  // Ruang ekstra antar-huruf bila menggunakan outline tebal, outer sticker, 3D extrude, atau box huruf
  const strokeAndExtrudeSpacingPx = Math.max(
    0,
    ((style.outlineWidth || 0) * 0.35 +
      (style.outerOutlineWidth || 0) * 0.55 +
      (style.extrudeDepth || 0) * 0.3) *
      scaleFactor
  );
  const boxOrStyleSpacingPx = hasCharBox
    ? 10 * scaleFactor
    : hasCharStyle || isRansomHold
    ? 6 * scaleFactor
    : 0;
  const minFxSpacing = Math.max(strokeAndExtrudeSpacingPx, boxOrStyleSpacingPx);
  const effectiveSpacing = Math.max(baseLetterSpacingPx, minFxSpacing);

  // Margin visual ekstra di kedua ujung baris (ketebalan sticker luar, outline, 3D extrude, atau padding kartu)
  const sideOverhangPx =
    ((style.outlineWidth || 0) * 1.5 +
      (style.outerOutlineWidth || 0) * 1.8 +
      (style.extrudeDepth || 0) * 1.2 +
      (hasCharBox ? 24 : 0)) *
    scaleFactor;

  // Anggaran lebar aman sebelum membungkus baris ke bawah
  const wrapBudgetPx = Math.max(
    canvasWidth * 0.38,
    maxAllowedWidthPx - sideOverhangPx
  );

  const buildFontString = (sizePx: number) =>
    `${style.italic ? 'italic ' : ''}${style.fontWeight || 700} ${sizePx}px ${formatFontFamily(style.fontFamily)}`;

  const layoutCacheKey = `${displayText}|${style.fontSize}|${style.fontFamily}|${style.fontWeight}|${style.letterSpacing}|${style.textTransform}|${wrapBudgetPx}|${scaleFactor}|${style.lineHeight}`;

  let cachedLayout = lyricLayoutCache.get(layoutCacheKey);
  if (!cachedLayout) {
    let activeFontSizePx = baseFontSizePx;
    ctx.save();
    ctx.font = buildFontString(activeFontSizePx);

    const measureWithSpacing = (text: string, spacingPx: number, fontSize: number) => {
      const chars = Array.from(text);
      if (chars.length === 0) return 0;
      const minSpaceW = Math.max(
        ctx.measureText(' ').width,
        fontSize * 0.34 +
          spacingPx * 1.4 +
          ((style.outerOutlineWidth || 0) + (style.outlineWidth || 0)) * 1.1 * scaleFactor
      );
      let totalW = 0;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (ch === ' ') {
          totalW += minSpaceW;
        } else {
          totalW += ctx.measureText(ch).width;
        }
        if (i < chars.length - 1) {
          totalW += spacingPx;
        }
      }
      return totalW;
    };

    let wrappedLines = wrapLyricTextIntoLines(
      displayText,
      (str) => measureWithSpacing(str, effectiveSpacing, activeFontSizePx),
      wrapBudgetPx
    );

    let measuredWidthPx = Math.max(...wrappedLines.map((l) => l.widthPx), 0);
    let wasAutoShrunk = false;

    if (measuredWidthPx > wrapBudgetPx && activeFontSizePx > minFontSizePx) {
      const ratio = wrapBudgetPx / Math.max(1, measuredWidthPx);
      activeFontSizePx = Math.max(minFontSizePx, Math.floor(activeFontSizePx * ratio));
      ctx.font = buildFontString(activeFontSizePx);
      wrappedLines = wrapLyricTextIntoLines(
        displayText,
        (str) => measureWithSpacing(str, effectiveSpacing, activeFontSizePx),
        wrapBudgetPx
      );
      measuredWidthPx = Math.max(...wrappedLines.map((l) => l.widthPx), 0);
      wasAutoShrunk = activeFontSizePx < baseFontSizePx;
    }

    const isOverflowingMinSize = measuredWidthPx > wrapBudgetPx + 4;

    ctx.font = buildFontString(activeFontSizePx);
    const charWidthsPerLine: number[][] = [];
    const lineTotalWidths: number[] = [];

    const minWordSpaceW = Math.max(
      ctx.measureText(' ').width,
      activeFontSizePx * 0.35 +
        effectiveSpacing * 1.5 +
        ((style.outerOutlineWidth || 0) + (style.outlineWidth || 0)) * 1.2 * scaleFactor
    );

    for (const line of wrappedLines) {
      const chars = Array.from(line.text);
      const widths = chars.map((ch) => (ch === ' ' ? minWordSpaceW : ctx.measureText(ch).width));
      charWidthsPerLine.push(widths);
      const totalW = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * effectiveSpacing;
      lineTotalWidths.push(totalW);
    }

    ctx.restore();

    cachedLayout = {
      wrappedLines,
      measuredWidthPx,
      activeFontSizePx,
      wasAutoShrunk,
      isOverflowingMinSize,
      charWidthsPerLine,
      lineTotalWidths,
    };

    if (lyricLayoutCache.size > MAX_LAYOUT_CACHE) {
      const firstK = lyricLayoutCache.keys().next().value;
      if (firstK) lyricLayoutCache.delete(firstK);
    }
    lyricLayoutCache.set(layoutCacheKey, cachedLayout);
  }

  const {
    wrappedLines,
    measuredWidthPx,
    activeFontSizePx,
    wasAutoShrunk,
    isOverflowingMinSize,
    charWidthsPerLine,
    lineTotalWidths,
  } = cachedLayout;

  // Hitung parameter animasi berdasarkan fase aktif
  let alphaMultiplier = style.opacity ?? 1;
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let globalRotationRad = 0;
  let globalSkewX = 0;
  let extraTrackingPx = 0;
  let glowMultiplier = 1;

  const isPerCharInType =
    anim.in.type === 'charReveal' ||
    anim.in.type === 'popBounce' ||
    anim.in.type === 'kineticSlam' ||
    anim.in.type === 'whipSlide' ||
    anim.in.type === 'flip3d' ||
    anim.in.type === 'spiralDrop' ||
    anim.in.type === 'glitchIn' ||
    anim.in.type === 'typewriter' ||
    anim.in.type === 'wordsRiseBlur' ||
    anim.in.type === 'charMaskRise' ||
    anim.in.type === 'scrambleText';

  const isPerCharOutType =
    anim.out.type === 'popScatter' ||
    anim.out.type === 'dropGravity' ||
    anim.out.type === 'glitchOut' ||
    anim.out.type === 'wordsExit';

  if (phase === 'Entering') {
    const delay = anim.in.delayMs || 0;
    const effectiveInDur = calculateEffectiveInDuration(displayText, anim.in);
    const dur = Math.max(1, effectiveInDur - delay);
    const rawT = Math.max(0, (elapsedMs - delay) / dur);
    const p = applyEasing(rawT, anim.in.easing || 'easeOutCubic');
    const dist = (anim.in.distancePx || 40) * scaleFactor;

    if (elapsedMs < delay) {
      alphaMultiplier = 0;
    } else {
      switch (anim.in.type) {
        case 'fade':
          alphaMultiplier *= p;
          break;
        case 'slideUp':
          alphaMultiplier *= p;
          offsetY = (1 - p) * dist;
          break;
        case 'slideLeft':
          alphaMultiplier *= p;
          offsetX = (1 - p) * dist;
          break;
        case 'zoom': {
          alphaMultiplier *= Math.min(1, p * 1.25);
          const initScale = anim.in.initialScale ?? 0.78;
          scale = initScale + (1 - initScale) * p;
          break;
        }
        case 'blurReveal': {
          alphaMultiplier *= p;
          offsetY = (1 - p) * (14 * scaleFactor);
          scale = 0.92 + 0.08 * p;
          glowMultiplier = 1 + (1 - p) * 1.4;
          break;
        }
        case 'trackingExpand': {
          alphaMultiplier *= p;
          extraTrackingPx = (1 - p) * 28 * scaleFactor;
          scale = 0.94 + 0.06 * p;
          break;
        }
        case 'slamStamp': {
          alphaMultiplier *= Math.min(1, p * 2.2);
          const stampScale = 1.72 - 0.72 * p;
          scale = stampScale;
          globalRotationRad = -(1 - p) * 0.105;
          if (rawT > 0.65 && rawT < 1.0) {
            const settleT = (rawT - 0.65) / 0.35;
            const shake =
              Math.sin(settleT * Math.PI * 4) *
              Math.exp(-settleT * 3.8) *
              6 *
              scaleFactor;
            offsetY += shake;
          }
          break;
        }
        case 'clipReveal':
          alphaMultiplier *= Math.min(1, p * 1.5);
          break;
        case 'linesFromSides':
          alphaMultiplier *= p;
          break;
        case 'wordReveal':
        case 'wordsRiseBlur':
        case 'charReveal':
        case 'charMaskRise':
        case 'scrambleText':
        case 'popBounce':
        case 'kineticSlam':
        case 'whipSlide':
        case 'flip3d':
        case 'spiralDrop':
        case 'glitchIn':
        case 'typewriter':
          // Ditangani per token multiline di bawah
          break;
        case 'none':
        default:
          break;
      }
    }
  } else if (phase === 'Holding') {
    const cycle = Math.max(400, anim.hold.cycleMs || 2400);
    const wave = Math.sin((elapsedMs / cycle) * Math.PI * 2);
    const amp = (anim.hold.amplitudePx ?? 8) * scaleFactor;

    switch (anim.hold.type) {
      case 'gentleFloat':
        offsetY = wave * amp;
        break;
      case 'floatWave': {
        // Dual harmonic wave: Y float + rotasi mikro sinusoidal
        const ramp = Math.min(1, elapsedMs / 300);
        offsetY =
          Math.sin((elapsedMs / cycle) * Math.PI * 2) *
          (amp * 1.25) *
          ramp;
        globalRotationRad =
          Math.sin((elapsedMs / (cycle * 1.6)) * Math.PI * 2) *
          0.024 *
          ramp;
        break;
      }
      case 'beatBounce': {
        // Hentakan tempo beat dengan exponential decay
        const halfCycle = Math.max(200, cycle / 2);
        const beatPhase = (elapsedMs % halfCycle) / halfCycle;
        const kick = Math.pow(Math.max(0, 1 - beatPhase * 2.8), 2.0);
        scale = 1 + kick * 0.075;
        offsetY = -kick * 3.5 * scaleFactor;
        glowMultiplier = 1 + kick * 0.9;
        break;
      }
      case 'pulse':
        scale = 1 + wave * (anim.hold.scaleAmount ?? 0.03);
        break;
      case 'beatStomp': {
        // Jedag-jedug bass stomp: 2 ketukan per siklus dengan kurva decay tajam
        const halfCycle = Math.max(220, cycle / 2);
        const beatPhase = (elapsedMs % halfCycle) / halfCycle;
        const kick = Math.pow(Math.max(0, 1 - beatPhase * 2.6), 2.2);
        scale = 1 + kick * 0.085;
        glowMultiplier = 1 + kick * 1.15;
        offsetY = -kick * 4 * scaleFactor;
        break;
      }
      case 'pendulumTilt': {
        // Ayunan kamera miring kiri-kanan halus + napas skala tipis
        const ramp = Math.min(1, elapsedMs / 350);
        globalRotationRad = wave * 0.042 * ramp;
        scale = 1 + Math.cos((elapsedMs / cycle) * Math.PI * 4) * 0.018 * ramp;
        break;
      }
      case 'glowBreath': {
        const breathWave = (1 - Math.cos((elapsedMs / cycle) * Math.PI * 2)) / 2;
        glowMultiplier = 1 + breathWave * (anim.hold.glowPulseAmount ?? 0.6);
        break;
      }
      case 'shineSweep':
      case 'charWave':
      case 'discoWave':
      case 'glitchTwitch':
      case 'ransomJitter':
      case 'comicBounce':
        // Ditangani per karakter multiline di bawah
        break;
      case 'static':
      default:
        break;
    }
  } else if (phase === 'Exiting') {
    const dur = Math.max(1, anim.out.durationMs || 1);
    const rawOutT = Math.max(0, Math.min(1, elapsedMs / dur));
    const p = applyEasing(rawOutT, anim.out.easing || 'easeInOutCubic');
    const dist = (anim.out.distancePx || 28) * scaleFactor;

    switch (anim.out.type) {
      case 'cut':
        alphaMultiplier = 0;
        break;
      case 'flashCut': {
        // Flash putih sekejap (<85ms) lalu cut bersih
        if (elapsedMs < 85) {
          const flashP = 1 - elapsedMs / 85;
          glowMultiplier = 1 + flashP * 2.8;
          alphaMultiplier *= 1;
        } else {
          alphaMultiplier = 0;
        }
        break;
      }
      case 'fade':
        alphaMultiplier *= 1 - p;
        break;
      case 'slideDown':
        alphaMultiplier *= 1 - p;
        offsetY = p * dist;
        break;
      case 'shrink':
        alphaMultiplier *= 1 - p;
        scale = 1 - p * 0.25;
        break;
      case 'whipOut': {
        // Sabet keluar cepat ke samping dengan kemiringan skew
        const accel = rawOutT * rawOutT;
        alphaMultiplier *= Math.max(0, 1 - accel * 1.15);
        offsetX = -accel * 240 * scaleFactor;
        globalSkewX = accel * 0.58;
        break;
      }
      case 'implodeZoom': {
        // Pantul membesar sedikit lalu tersedot mengecil ke tengah
        if (rawOutT < 0.28) {
          const up = rawOutT / 0.28;
          scale = 1 + up * 0.14;
        } else {
          const down = (rawOutT - 0.28) / 0.72;
          scale = Math.max(0.02, 1.14 * (1 - down * down));
          alphaMultiplier *= Math.max(0, 1 - down);
          globalRotationRad = down * -0.15;
        }
        break;
      }
      case 'wordsExit':
      case 'popScatter':
      case 'dropGravity':
      case 'glitchOut':
        // Ditangani per karakter di bawah
        break;
    }
  }

  if (alphaMultiplier <= 0.002) {
    return {
      actualFontSizePx: activeFontSizePx,
      wasAutoShrunk,
      isOverflowingMinSize,
      measuredWidthPx,
      maxAllowedWidthPx,
    };
  }

  const anchorX = style.x * canvasWidth + offsetX;
  const anchorY = style.y * canvasHeight + offsetY;

  const effectiveRenderSpacing = effectiveSpacing + extraTrackingPx;

  ctx.save();
  ctx.translate(anchorX, anchorY);
  if (Math.abs(globalRotationRad) > 0.001) {
    ctx.rotate(globalRotationRad);
  }
  if (Math.abs(globalSkewX) > 0.001) {
    ctx.transform(1, 0, globalSkewX, 1, 0, 0);
  }
  ctx.scale(scale, scale);
  if ('letterSpacing' in ctx && typeof effectiveRenderSpacing === 'number') {
    (ctx as any).letterSpacing = `${effectiveRenderSpacing.toFixed(1)}px`;
  }

  // Clip Reveal: Pemindaian horizontal miring progresif
  if (anim.in.type === 'clipReveal' && phase === 'Entering') {
    const delay = anim.in.delayMs || 0;
    const dur = Math.max(1, anim.in.durationMs || 420);
    const rawT = Math.max(0, (elapsedMs - delay) / dur);
    const pClip = applyEasing(rawT, anim.in.easing || 'easeOutCubic');
    const totalW = measuredWidthPx + 160 * scaleFactor;
    const revealW = totalW * pClip;
    ctx.beginPath();
    ctx.rect(-totalW / 2, -canvasHeight / 2, revealW, canvasHeight);
    ctx.clip();
  }

  // Tentukan strategi per-token rendering konsisten di seluruh fase (Entering, Holding, Exiting)
  const isCharWave =
    phase === 'Holding' &&
    (anim.hold.type === 'charWave' || anim.hold.type === 'discoWave');
  const useWordRenderer =
    phase === 'Entering' &&
    anim.in.type === 'wordReveal' &&
    !isCharWave &&
    !hasPerCharFX &&
    !isPerCharInType;
  if (useWordRenderer) {
    drawWordRevealMultiline(
      ctx,
      wrappedLines,
      style,
      anim,
      phase,
      elapsedMs,
      scaleFactor,
      activeFontSizePx,
      effectiveRenderSpacing,
      alphaMultiplier,
      glowMultiplier
    );
  } else {
    drawCharacterMultiline(
      ctx,
      wrappedLines,
      style,
      anim,
      phase,
      elapsedMs,
      scaleFactor,
      activeFontSizePx,
      effectiveRenderSpacing,
      alphaMultiplier,
      glowMultiplier,
      charWidthsPerLine,
      lineTotalWidths
    );
  }

  // Shine Glint Sweep: kilatan cahaya diagonal 20 derajat melintas berkala
  if (phase === 'Holding' && anim.hold.type === 'shineSweep') {
    const sweepCycle = Math.max(1600, anim.hold.cycleMs || 2200);
    const cycleTime = elapsedMs % sweepCycle;
    const sweepDur = 680;
    if (cycleTime < sweepDur) {
      const st = cycleTime / sweepDur;
      const totalW = measuredWidthPx + 240 * scaleFactor;
      const glintX = -totalW / 2 + totalW * st;
      const glintW = 70 * scaleFactor;

      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const grad = ctx.createLinearGradient(glintX - glintW, 0, glintX + glintW, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.88)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.transform(1, 0, -0.36, 1, 0, 0); // ~20 deg slant
      ctx.fillRect(glintX - glintW, -canvasHeight / 2, glintW * 2, canvasHeight);
      ctx.restore();
    }
  }

  ctx.restore();

  return {
    actualFontSizePx: activeFontSizePx,
    wasAutoShrunk,
    isOverflowingMinSize,
    measuredWidthPx,
    maxAllowedWidthPx,
  };
}

export interface WrappedLine {
  text: string;
  widthPx: number;
  wordCount: number;
  charCount: number;
  startIndex: number;
  wordStartIndex: number;
}

export function wrapLyricTextIntoLines(
  text: string,
  measureWidthFn: (str: string) => number,
  maxWidthPx: number
): WrappedLine[] {
  if (!text || text.trim().length === 0) {
    return [
      {
        text: '',
        widthPx: 0,
        wordCount: 0,
        charCount: 0,
        startIndex: 0,
        wordStartIndex: 0,
      },
    ];
  }

  const rawParagraphs = text.split(/\r?\n/);
  const resultLines: WrappedLine[] = [];
  let globalWordCounter = 0;
  let globalCharCounter = 0;

  for (const paragraph of rawParagraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    // Jika seluruh kalimat sudah pas dalam batas aman, gunakan 1 baris langsung
    const fullWidth = measureWidthFn(trimmed);
    if (fullWidth <= maxWidthPx) {
      resultLines.push({
        text: trimmed,
        widthPx: fullWidth,
        wordCount: words.length,
        charCount: Array.from(trimmed).length,
        startIndex: globalCharCounter,
        wordStartIndex: globalWordCounter,
      });
      globalWordCounter += words.length;
      globalCharCounter += Array.from(trimmed).length + 1;
      continue;
    }

    // Jika melebihi batas aman (hampir mepet), bungkus menjadi baris di bawahnya
    // Untuk kalimat 3-8 kata yang bisa dibagi 2 baris seimbang: cari titik potong paling proporsional
    let balancedSplitFound = false;
    if (words.length >= 3 && words.length <= 8) {
      let bestSplitIdx = -1;
      let minDiff = Infinity;
      for (let split = 1; split < words.length; split++) {
        const line1 = words.slice(0, split).join(' ');
        const line2 = words.slice(split).join(' ');
        const w1 = measureWidthFn(line1);
        const w2 = measureWidthFn(line2);
        if (w1 <= maxWidthPx && w2 <= maxWidthPx) {
          const diff = Math.abs(w1 - w2);
          if (diff < minDiff) {
            minDiff = diff;
            bestSplitIdx = split;
          }
        }
      }

      if (bestSplitIdx > 0) {
        balancedSplitFound = true;
        const line1Text = words.slice(0, bestSplitIdx).join(' ');
        const line2Text = words.slice(bestSplitIdx).join(' ');
        const w1 = measureWidthFn(line1Text);
        const w2 = measureWidthFn(line2Text);

        resultLines.push({
          text: line1Text,
          widthPx: w1,
          wordCount: bestSplitIdx,
          charCount: Array.from(line1Text).length,
          startIndex: globalCharCounter,
          wordStartIndex: globalWordCounter,
        });
        globalWordCounter += bestSplitIdx;
        globalCharCounter += Array.from(line1Text).length + 1;

        resultLines.push({
          text: line2Text,
          widthPx: w2,
          wordCount: words.length - bestSplitIdx,
          charCount: Array.from(line2Text).length,
          startIndex: globalCharCounter,
          wordStartIndex: globalWordCounter,
        });
        globalWordCounter += words.length - bestSplitIdx;
        globalCharCounter += Array.from(line2Text).length + 1;
      }
    }

    if (!balancedSplitFound) {
      let currentLineWords: string[] = [words[0]];

      for (let i = 1; i < words.length; i++) {
        const candidateWords = [...currentLineWords, words[i]];
        const candidateText = candidateWords.join(' ');
        const candidateWidth = measureWidthFn(candidateText);

        if (candidateWidth <= maxWidthPx) {
          currentLineWords = candidateWords;
        } else {
          const lineText = currentLineWords.join(' ');
          const lineWidth = measureWidthFn(lineText);
          resultLines.push({
            text: lineText,
            widthPx: lineWidth,
            wordCount: currentLineWords.length,
            charCount: Array.from(lineText).length,
            startIndex: globalCharCounter,
            wordStartIndex: globalWordCounter,
          });
          globalWordCounter += currentLineWords.length;
          globalCharCounter += Array.from(lineText).length + 1;
          currentLineWords = [words[i]];
        }
      }

      if (currentLineWords.length > 0) {
        const lineText = currentLineWords.join(' ');
        const lineWidth = measureWidthFn(lineText);
        resultLines.push({
          text: lineText,
          widthPx: lineWidth,
          wordCount: currentLineWords.length,
          charCount: Array.from(lineText).length,
          startIndex: globalCharCounter,
          wordStartIndex: globalWordCounter,
        });
        globalWordCounter += currentLineWords.length;
        globalCharCounter += Array.from(lineText).length + 1;
      }
    }
  }

  return resultLines.length > 0
    ? resultLines
    : [
        {
          text,
          widthPx: measureWidthFn(text),
          wordCount: 1,
          charCount: text.length,
          startIndex: 0,
          wordStartIndex: 0,
        },
      ];
}

export function calculateEffectiveInDuration(
  text: string,
  animIn: AnimationInConfig
): number {
  if (!text || animIn.type === 'none') return 0;
  const baseDur = Math.max(100, animIn.durationMs || 380);
  const delay = Math.max(0, animIn.delayMs || 0);

  if (animIn.type === 'wordReveal' || animIn.type === 'wordsRiseBlur') {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const count = Math.max(1, words.length);
    const stagger = animIn.staggerMs ?? 45;
    return delay + (count - 1) * stagger + baseDur;
  }

  if (
    animIn.type === 'charReveal' ||
    animIn.type === 'charMaskRise' ||
    animIn.type === 'scrambleText' ||
    animIn.type === 'popBounce' ||
    animIn.type === 'kineticSlam' ||
    animIn.type === 'whipSlide' ||
    animIn.type === 'flip3d' ||
    animIn.type === 'spiralDrop' ||
    animIn.type === 'glitchIn' ||
    animIn.type === 'typewriter'
  ) {
    const chars = Array.from(text.trim()).filter((c) => c !== ' ' && c !== '\n');
    const count = Math.max(1, chars.length);
    const stagger = animIn.staggerMs ?? 25;
    const itemDur = animIn.type === 'typewriter' ? Math.min(140, baseDur) : baseDur;
    return delay + (count - 1) * stagger + itemDur;
  }

  // Untuk animasi global: menyesuaikan durasi proporsional jika kalimatnya panjang (> 6 kata)
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    const extraMs = Math.min(500, (words.length - 6) * 35);
    return delay + baseDur + extraMs;
  }

  return delay + baseDur;
}

const RANSOM_FONT_POOL = [
  { family: '"Playfair Display", Georgia, serif', weight: 900, italic: false, scale: 1.04 },
  { family: '"Fredoka", "Outfit", sans-serif', weight: 800, italic: false, scale: 1.0 },
  { family: '"Bangers", Impact, sans-serif', weight: 900, italic: false, scale: 1.08 },
  { family: '"Titan One", "Luckiest Guy", sans-serif', weight: 900, italic: false, scale: 0.98 },
  { family: '"Shrikhand", Georgia, serif', weight: 800, italic: false, scale: 1.02 },
  { family: '"Spicy Rice", Georgia, serif', weight: 800, italic: false, scale: 1.04 },
  { family: '"Boogaloo", Impact, sans-serif', weight: 800, italic: false, scale: 1.08 },
  { family: '"Carter One", Impact, sans-serif', weight: 800, italic: false, scale: 1.0 },
  { family: '"Alfa Slab One", Georgia, serif', weight: 900, italic: false, scale: 0.94 },
  { family: '"Russo One", Impact, sans-serif', weight: 900, italic: false, scale: 0.98 },
  { family: '"Fugaz One", Impact, sans-serif', weight: 800, italic: false, scale: 1.0 },
  { family: '"Rubik Wet Paint", Impact, sans-serif', weight: 800, italic: false, scale: 0.98 },
  { family: '"Bungee", Impact, sans-serif', weight: 900, italic: false, scale: 0.95 },
  { family: '"Righteous", sans-serif', weight: 800, italic: false, scale: 1.0 },
  { family: 'Georgia, "Times New Roman", serif', weight: 700, italic: true, scale: 1.06 },
  { family: '"Luckiest Guy", Impact, sans-serif', weight: 900, italic: false, scale: 1.02 },
  { family: '"Permanent Marker", cursive, sans-serif', weight: 700, italic: false, scale: 1.02 },
  { family: '"Black Ops One", Impact, sans-serif', weight: 900, italic: false, scale: 0.98 },
  { family: '"Rubik Mono One", Impact, sans-serif', weight: 900, italic: false, scale: 0.88 },
  { family: '"JetBrains Mono", Consolas, monospace', weight: 800, italic: false, scale: 0.96 },
  { family: '"Montserrat", Arial Black, sans-serif', weight: 900, italic: false, scale: 0.98 },
];

const DEFAULT_RANSOM_PALETTE = [
  '#FDE047', // Kuning Cerah
  '#EC4899', // Magenta Pink
  '#22D3EE', // Cyan Elektrik
  '#FFFFFF', // Putih Bersih
  '#FB923C', // Oranye Pop
  '#A3E635', // Lime Segar
];

const DEFAULT_BOX_PALETTE = [
  '#0891B2', // Teal Biru
  '#FACC15', // Kuning Komik
  '#EA580C', // Oranye Terang
  '#E11D48', // Merah Coral
  '#14B8A6', // Tosca
];

function deterministicHash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function drawWordRevealMultiline(
  ctx: CanvasRenderingContext2D,
  lines: WrappedLine[],
  style: CueStyle,
  anim: CueAnimation,
  phase: LivePhase,
  elapsedMs: number,
  scaleFactor: number,
  fontSizePx: number,
  spacingPx: number,
  baseAlpha: number,
  glowMultiplier: number
): void {
  const stagger = anim.in.staggerMs ?? 45;
  const wordDur = Math.max(120, anim.in.durationMs || 380);
  const liftPx = (anim.in.distancePx || 28) * scaleFactor;
  const rawSpaceWidth = ctx.measureText(' ').width;
  const spaceWidth = Math.max(
    rawSpaceWidth,
    fontSizePx * 0.35 +
      spacingPx * 1.5 +
      ((style.outerOutlineWidth || 0) + (style.outlineWidth || 0)) * 1.2 * scaleFactor
  );
  const lineSpacingRatio = Math.max(style.lineHeight || 1.38, 1.38);
  const lineHeightPx = fontSizePx * lineSpacingRatio;
  const totalBlockHeightPx = (lines.length - 1) * lineHeightPx;

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const words = line.text.split(' ').filter(Boolean);
    const wordWidths = words.map(
      (w) =>
        ctx.measureText(w).width +
        Math.max(0, Array.from(w).length - 1) * spacingPx
    );
    const lineTotalWidth =
      wordWidths.reduce((a, b) => a + b, 0) +
      Math.max(0, words.length - 1) * spaceWidth;

    let startX =
      style.anchor === 'center'
        ? -lineTotalWidth / 2
        : style.anchor === 'right'
        ? -lineTotalWidth
        : 0;

    const lineY = -totalBlockHeightPx / 2 + lIdx * lineHeightPx;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      let p = 1;
      let yOffset = lineY;

      if (phase === 'Entering') {
        const globalWordIdx = line.wordStartIndex + wIdx;
        const localElapsed =
          elapsedMs - (anim.in.delayMs || 0) - globalWordIdx * stagger;
        p = applyEasing(localElapsed / wordDur, anim.in.easing || 'easeOutCubic');
        yOffset = lineY + (1 - p) * liftPx;
      }

      if (p > 0.005) {
        let chX = startX;
        const fontStr = `${style.italic ? 'italic ' : ''}${style.fontWeight || 700} ${fontSizePx}px ${style.fontFamily}`;
        for (const ch of Array.from(words[wIdx])) {
          const measW = ctx.measureText(ch).width;
          const sprite = getGlyphSprite(ch, fontStr, style, scaleFactor, fontSizePx);
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, baseAlpha * p));
          ctx.drawImage(
            sprite.canvas,
            chX + measW / 2 - sprite.anchorX,
            yOffset - sprite.anchorY
          );
          ctx.restore();
          chX += measW + spacingPx;
        }
      }
      startX += wordWidths[wIdx] + spaceWidth;
    }
  }
}

interface ComputedCharRenderItem {
  char: string;
  centerX: number;
  charY: number;
  charWidth: number;
  charAlpha: number;
  rotationRad: number;
  charScaleX: number;
  charScaleY: number;
  skewX: number;
  fontString: string;
  overrideFillColor?: string;
  globalCharIdx: number;
}

function drawCharacterMultiline(
  ctx: CanvasRenderingContext2D,
  lines: WrappedLine[],
  style: CueStyle,
  anim: CueAnimation,
  phase: LivePhase,
  elapsedMs: number,
  scaleFactor: number,
  fontSizePx: number,
  spacingPx: number,
  baseAlpha: number,
  glowMultiplier: number,
  charWidthsPerLine?: number[][],
  lineTotalWidths?: number[]
): void {
  const inType = anim.in.type;
  const holdType = anim.hold.type;
  const outType = anim.out.type;

  const isRansomHold = holdType === 'ransomJitter';
  const isComicHold = holdType === 'comicBounce';
  const isDiscoHold = holdType === 'discoWave';
  const isGlitchHold = holdType === 'glitchTwitch';
  const isCharWave =
    phase === 'Holding' && (holdType === 'charWave' || holdType === 'discoWave');
  const isRansomStyle = style.charStyleMode === 'ransom-mixed';
  const isAlternatingStyle = style.charStyleMode === 'pop-alternating';
  const boxMode = style.charBoxMode || 'none';

  const stagger = anim.in.staggerMs ?? 25;
  const charDur = Math.max(100, anim.in.durationMs || 340);
  const liftPx = (anim.in.distancePx || 24) * scaleFactor;
  const waveCycle = Math.max(400, anim.hold.cycleMs || 1800);
  const waveAmp = (anim.hold.amplitudePx ?? 6) * scaleFactor;
  const minRequiredLineHeight =
    boxMode === 'liquid-drip'
      ? 1.55
      : boxMode !== 'none' || (style.outerOutlineWidth || 0) >= 10
      ? 1.48
      : isRansomStyle
      ? 1.44
      : 1.38;
  const lineSpacingRatio = Math.max(style.lineHeight || 1.38, minRequiredLineHeight);
  const lineHeightPx = fontSizePx * lineSpacingRatio;
  const totalBlockHeightPx = (lines.length - 1) * lineHeightPx;
  const seed = anim.seed || 101;

  const baseFontString = `${style.italic ? 'italic ' : ''}${style.fontWeight || 700} ${fontSizePx}px ${formatFontFamily(style.fontFamily)}`;

  // Stop-motion tick untuk efek Ransom Live ("Tapi Hatiku" ganti-ganti font & warna secara acak namun santai/terbaca)
  const ransomStepMs = Math.max(480, Math.round((anim.hold.cycleMs || 2200) / 3.5));
  const isRansomTickActive =
    isRansomHold || (isRansomStyle && phase === 'Holding');

  const colorPalette =
    style.charColorPalette && style.charColorPalette.length > 0
      ? style.charColorPalette
      : DEFAULT_RANSOM_PALETTE;
  const boxPalette =
    style.charColorPalette && style.charColorPalette.length > 0
      ? style.charColorPalette
      : DEFAULT_BOX_PALETTE;

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const chars = Array.from(line.text);
    const charWidths =
      charWidthsPerLine && charWidthsPerLine[lIdx]
        ? charWidthsPerLine[lIdx]
        : chars.map((ch) => (ch === ' ' ? fontSizePx * 0.35 : fontSizePx));
    const lineTotalWidth =
      lineTotalWidths && typeof lineTotalWidths[lIdx] === 'number'
        ? lineTotalWidths[lIdx]
        : charWidths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * spacingPx;

    let cursorX =
      style.anchor === 'center'
        ? -lineTotalWidth / 2
        : style.anchor === 'right'
        ? -lineTotalWidth
        : 0;

    if (inType === 'linesFromSides' && phase === 'Entering') {
      const localElapsed = Math.max(0, elapsedMs - (anim.in.delayMs || 0));
      const pSide = applyEasing(localElapsed / charDur, anim.in.easing || 'easeOutCubic');
      const sideDir = lIdx % 2 === 0 ? -1 : 1;
      cursorX += sideDir * (1 - pSide) * 220 * scaleFactor;
    }

    const lineY = -totalBlockHeightPx / 2 + lIdx * lineHeightPx;
    const items: ComputedCharRenderItem[] = [];
    let prevColorIdx = -1;

    for (let cIdx = 0; cIdx < chars.length; cIdx++) {
      const ch = chars[cIdx];
      const w = charWidths[cIdx];
      let centerX = cursorX + w / 2;
      cursorX += w + spacingPx;

      if (ch === ' ') continue;

      let charAlpha = baseAlpha;
      let charY = lineY;
      let rotationRad = 0;
      let charScaleX = 1;
      let charScaleY = 1;
      let skewX = 0;
      let fontString = baseFontString;
      let overrideFillColor: string | undefined = undefined;
      let activeChar = ch;

      const globalCharIdx = line.startIndex + cIdx;

      // =====================================================
      // 1. FASE ENTERING (ANIMASI MASUK MOTION GRAPHICS)
      // =====================================================
      if (phase === 'Entering') {
        const localElapsed =
          elapsedMs - (anim.in.delayMs || 0) - globalCharIdx * stagger;
        const rawCharT = localElapsed / charDur;

        switch (inType) {
          case 'charMaskRise': {
            if (localElapsed <= 0) {
              charAlpha = 0;
            } else {
              const p = applyEasing(rawCharT, anim.in.easing || 'easeOutCubic');
              charAlpha *= Math.min(1, rawCharT * 2.2);
              charY = lineY + (1 - p) * 36 * scaleFactor;
              rotationRad += (1 - p) * 0.14;
            }
            break;
          }
          case 'wordsRiseBlur': {
            const wordGroup = line.wordStartIndex + Math.floor(cIdx / 5);
            const wElapsed =
              elapsedMs - (anim.in.delayMs || 0) - wordGroup * (stagger * 2.2);
            const wRawT = wElapsed / charDur;
            if (wElapsed <= 0) {
              charAlpha = 0;
            } else {
              const p = applyEasing(wRawT, anim.in.easing || 'easeOutCubic');
              charAlpha *= Math.min(1, wRawT * 2.0);
              charY = lineY + (1 - p) * 32 * scaleFactor;
              charScaleY = 0.88 + 0.12 * p;
            }
            break;
          }
          case 'scrambleText': {
            if (localElapsed <= 0) {
              charAlpha = 0;
            } else if (rawCharT < 0.9) {
              charAlpha = baseAlpha;
              const scramblePool = '0123456789ABCDEF$#%&*<>/?!';
              const hashTick = deterministicHash(
                Math.floor(elapsedMs / 45) + globalCharIdx * 23
              );
              activeChar = scramblePool[hashTick % scramblePool.length];
            } else {
              charAlpha = baseAlpha;
            }
            break;
          }
          case 'popBounce': {
            const p = applyEasing(rawCharT, 'easeOutBack');
            charAlpha *= Math.max(0, Math.min(1, localElapsed / (charDur * 0.6)));
            charY = lineY + (1 - p) * liftPx;
            const sc = 0.22 + 0.78 * p;
            charScaleX = sc;
            charScaleY = sc;
            const dir = globalCharIdx % 2 === 0 ? -1 : 1;
            rotationRad += (1 - p) * dir * 0.24;
            break;
          }
          case 'kineticSlam': {
            // Jatuh menghantam dari besar (2.4x -> 1.0x) dengan getaran hentakan decay halus
            if (localElapsed <= 0) {
              charAlpha = 0;
            } else {
              const p = applyEasing(rawCharT, 'easeOutCubic');
              charAlpha *= Math.min(1, rawCharT * 2.5);
              const slamScale = 2.45 - 1.45 * p;
              charScaleX = slamScale;
              charScaleY = slamScale;
              charY = lineY - (1 - p) * 38 * scaleFactor;
              if (rawCharT > 0.68 && rawCharT < 1.0) {
                const settleT = (rawCharT - 0.68) / 0.32;
                const shake = Math.sin(settleT * Math.PI * 4) * Math.exp(-settleT * 3.5) * 5.5 * scaleFactor;
                charY += shake;
              }
            }
            break;
          }
          case 'whipSlide': {
            // Sabet cepat dari samping dengan kemiringan skew kinetik elegan
            if (localElapsed <= 0) {
              charAlpha = 0;
            } else {
              const p = applyEasing(rawCharT, 'easeOutBack');
              charAlpha *= Math.min(1, rawCharT * 2.2);
              centerX += (1 - p) * 85 * scaleFactor;
              skewX = -(1 - p) * 0.28;
            }
            break;
          }
          case 'flip3d': {
            // Putar balik kartu 3D horizontal
            if (localElapsed <= 0) {
              charAlpha = 0;
            } else {
              const p = applyEasing(rawCharT, 'easeOutBack');
              charAlpha *= Math.min(1, rawCharT * 2.0);
              charScaleX = Math.max(0.04, p);
              charY = lineY + (1 - p) * 18 * scaleFactor;
            }
            break;
          }
          case 'spiralDrop': {
            // Turun berputar tornado dari atas
            if (localElapsed <= 0) {
              charAlpha = 0;
            } else {
              const p = applyEasing(rawCharT, 'easeOutBack');
              charAlpha *= Math.min(1, rawCharT * 1.8);
              charY = lineY - (1 - p) * 68 * scaleFactor;
              rotationRad += -(1 - p) * 1.35;
              const sc = 0.35 + 0.65 * p;
              charScaleX = sc;
              charScaleY = sc;
            }
            break;
          }
          case 'glitchIn': {
            // Kedip siber digital slice sebelum mengunci
            if (localElapsed <= 0) {
              charAlpha = 0;
            } else if (rawCharT < 0.88) {
              const gStep = Math.floor(localElapsed / 32) + globalCharIdx * 17;
              const gh = deterministicHash(gStep);
              charAlpha *= (gh % 4 === 0) ? 0.25 : 1;
              centerX += (((gh % 19) - 9) * 2.2) * scaleFactor;
              charY += ((((gh >>> 5) % 13) - 6) * 1.6) * scaleFactor;
              skewX = (((gh >>> 9) % 11) - 5) * 0.08;
              overrideFillColor = DEFAULT_RANSOM_PALETTE[gh % DEFAULT_RANSOM_PALETTE.length];
            }
            break;
          }
          case 'typewriter': {
            // Ketik tegas satu per satu dengan pop singkat saat diketik
            if (localElapsed < 0) {
              charAlpha = 0;
            } else {
              charAlpha = baseAlpha;
              if (localElapsed < 85) {
                const punch = 1 - localElapsed / 85;
                charScaleX = 1 + punch * 0.22;
                charScaleY = 1 + punch * 0.22;
                charY = lineY - punch * 6 * scaleFactor;
              }
            }
            break;
          }
          case 'charReveal': {
            const p = applyEasing(rawCharT, anim.in.easing || 'easeOutCubic');
            charAlpha *= Math.max(0, Math.min(1, localElapsed / (charDur * 0.65)));
            charY = lineY + (1 - p) * liftPx;
            break;
          }
          default:
            break;
        }
      }

      // =====================================================
      // 2. FASE HOLDING (ANIMASI STAY / HOLD)
      // =====================================================
      if (isCharWave) {
        const waveRamp = Math.min(1, elapsedMs / 350);
        charY +=
          Math.sin((elapsedMs / waveCycle) * Math.PI * 2 + globalCharIdx * 0.45) *
          waveAmp *
          waveRamp;
        if (isDiscoHold) {
          const colorShift = Math.floor(elapsedMs / Math.max(90, waveCycle / 12));
          overrideFillColor =
            colorPalette[(globalCharIdx + colorShift) % Math.max(1, colorPalette.length)];
        }
      } else if (isComicHold && !isRansomHold) {
        const wave = Math.sin(
          (elapsedMs / waveCycle) * Math.PI * 2 + globalCharIdx * 0.85
        );
        charY += wave * (waveAmp * 0.65);
        rotationRad += wave * 0.065;
      } else if (phase === 'Holding' && isGlitchHold) {
        // Glitch Twitch: tenang 78% siklus, lalu kedip glitch tajam 22% siklus
        const cyclePhase = (elapsedMs % waveCycle) / waveCycle;
        if (cyclePhase > 0.76) {
          const gTick = Math.floor(elapsedMs / 38) + globalCharIdx * 29;
          const gh = deterministicHash(gTick);
          if (gh % 3 !== 0) {
            centerX += (((gh % 15) - 7) * 1.9) * scaleFactor;
            charY += ((((gh >>> 4) % 9) - 4) * 1.4) * scaleFactor;
            skewX = (((gh >>> 8) % 9) - 4) * 0.06;
            if (gh % 5 === 0) {
              overrideFillColor = '#00F0FF';
            } else if (gh % 5 === 1) {
              overrideFillColor = '#EC4899';
            }
          }
        }
      }

      // Mode Ransom Mixed / Ransom Jitter (Ganti-ganti font, warna, dan kemiringan secara groovy & tidak terlalu cepat)
      if (isRansomStyle || isRansomHold) {
        const charRansomTick = isRansomTickActive
          ? Math.floor(
              (elapsedMs + (globalCharIdx % 3) * (ransomStepMs * 0.33)) /
                ransomStepMs
            )
          : 0;
        const hFont = deterministicHash(
          globalCharIdx * 73 + charRansomTick * 313 + seed
        );
        const hColor = deterministicHash(
          globalCharIdx * 151 + charRansomTick * 577 + seed
        );
        const hPose = deterministicHash(
          globalCharIdx * 211 + charRansomTick * 811 + seed
        );

        const pickedFont = RANSOM_FONT_POOL[hFont % RANSOM_FONT_POOL.length];
        const scaledFontPx = Math.round(fontSizePx * pickedFont.scale);
        fontString = `${pickedFont.italic ? 'italic ' : ''}${pickedFont.weight} ${scaledFontPx}px ${pickedFont.family}`;

        if (colorPalette.length > 1) {
          const nextIdx =
            (prevColorIdx + 1 + (hColor % (colorPalette.length - 1))) %
            colorPalette.length;
          prevColorIdx = nextIdx;
          overrideFillColor = colorPalette[nextIdx];
        } else {
          overrideFillColor = colorPalette[0];
        }

        // Soft-spring easing saat berganti tick agar tidak melompat patah
        const tickPhase = ((elapsedMs + (globalCharIdx % 3) * (ransomStepMs * 0.33)) % ransomStepMs) / ransomStepMs;
        const settleRamp = Math.min(1, tickPhase * 5); // 0..1 dalam 20% awal tick
        const tiltDeg = ((hPose % 13) - 6) * 1.1; // -6.6 deg .. +6.6 deg
        rotationRad += ((tiltDeg * Math.PI) / 180) * (0.7 + 0.3 * settleRamp);
        const hopY = (((hPose >>> 4) % 9) - 4) * scaleFactor * 1.25;
        charY += hopY * (0.8 + 0.2 * settleRamp);
        const scJitter = 0.95 + (((hPose >>> 8) % 12) / 100);
        charScaleX *= scJitter;
        charScaleY *= scJitter;
      } else if (isAlternatingStyle && !overrideFillColor) {
        overrideFillColor =
          colorPalette[globalCharIdx % Math.max(1, colorPalette.length)];
      }

      // =====================================================
      // 3. FASE EXITING (ANIMASI KELUAR PER-HURUF)
      // =====================================================
      if (phase === 'Exiting') {
        const outDur = Math.max(80, anim.out.durationMs || 260);
        const rawOutT = Math.max(0, Math.min(1, elapsedMs / outDur));
        const pOut = applyEasing(rawOutT, anim.out.easing || 'easeInOutCubic');

        if (outType === 'wordsExit') {
          const wordGroup = line.wordStartIndex + Math.floor(cIdx / 5);
          const wordDelayRatio = Math.min(0.35, wordGroup * 0.08);
          const localOut = Math.max(
            0,
            Math.min(
              1,
              (rawOutT - wordDelayRatio) / Math.max(0.1, 1 - wordDelayRatio)
            )
          );
          const pUp = applyEasing(localOut, 'easeInCubic');
          charY -= pUp * 42 * scaleFactor;
          charAlpha *= Math.max(0, 1 - pUp * 1.15);
        } else if (outType === 'popScatter') {
          const sh = deterministicHash(globalCharIdx * 97 + seed);
          const angle = ((sh % 360) * Math.PI) / 180;
          const distOut = (45 + (sh % 65)) * scaleFactor * pOut;
          centerX += Math.cos(angle) * distOut;
          charY += Math.sin(angle) * distOut - (1 - pOut) * 8 * scaleFactor;
          rotationRad += ((sh % 2 === 0 ? 1 : -1) * 0.9) * pOut;
          const scOut = Math.max(0.05, 1 - pOut * 0.85);
          charScaleX *= scOut;
          charScaleY *= scOut;
          charAlpha *= Math.max(0, 1 - pOut);
        } else if (outType === 'dropGravity') {
          const charDelayRatio = Math.min(0.28, (globalCharIdx % 8) * 0.035);
          const localOut = Math.max(0, Math.min(1, (rawOutT - charDelayRatio) / Math.max(0.1, 1 - charDelayRatio)));
          const pFall = applyEasing(localOut, 'easeInCubic');
          charY += pFall * 155 * scaleFactor;
          rotationRad += (globalCharIdx % 2 === 0 ? 1 : -1) * pFall * 0.28;
          charAlpha *= Math.max(0, 1 - pFall * 1.15);
        } else if (outType === 'glitchOut') {
          const gStep = Math.floor(elapsedMs / 28) + globalCharIdx * 31;
          const gh = deterministicHash(gStep);
          centerX += (((gh % 23) - 11) * 2.8 * rawOutT) * scaleFactor;
          skewX = (((gh >>> 4) % 13) - 6) * 0.1 * rawOutT;
          if ((gh % 100) / 100 < rawOutT * 1.15) {
            charAlpha = 0;
          }
        }
      }

      if (charAlpha > 0.005) {
        items.push({
          char: activeChar,
          centerX,
          charY,
          charWidth: w,
          charAlpha,
          rotationRad,
          charScaleX,
          charScaleY,
          skewX,
          fontString,
          overrideFillColor,
          globalCharIdx,
        });
      }
    }

    // PASS 1: Kotak Komik / Confetti Tags / Pita Panggung / RGB Split / Stabilo Pop di belakang huruf
    if (boxMode === 'marker-highlight' && items.length > 0) {
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const padX = fontSizePx * 0.32;
      const mLeft = firstItem.centerX - firstItem.charWidth / 2 - padX;
      const mRight = lastItem.centerX + lastItem.charWidth / 2 + padX;
      const mW = Math.max(fontSizePx, mRight - mLeft);
      const mH = fontSizePx * 0.92;
      const avgAlpha =
        items.reduce((acc, it) => acc + it.charAlpha, 0) / items.length;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, avgAlpha * 0.82));
      ctx.fillStyle = style.outerOutlineColor || '#FACC15';
      ctx.transform(1, 0, -0.14, 1, 0, 0); // skewX(-8deg)

      const rx = mLeft;
      const ry = lineY - mH * 0.38;
      const radius = 6 * scaleFactor;
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(rx, ry, mW, mH, radius);
      } else {
        ctx.rect(rx, ry, mW, mH);
      }
      ctx.fill();
      ctx.restore();
    } else if (boxMode === 'neon-ribbon' && items.length > 0) {
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const padX = fontSizePx * 0.55;
      const ribLeft = firstItem.centerX - firstItem.charWidth / 2 - padX;
      const ribRight = lastItem.centerX + lastItem.charWidth / 2 + padX;
      const ribW = Math.max(fontSizePx, ribRight - ribLeft);
      const ribH = fontSizePx * 1.24;
      const slant = fontSizePx * 0.22;
      const avgAlpha =
        items.reduce((acc, it) => acc + it.charAlpha, 0) / items.length;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, avgAlpha * 0.94));
      ctx.fillStyle = style.outlineColor || '#090D16';
      ctx.strokeStyle = style.outerOutlineColor || '#FACC15';
      ctx.lineWidth = Math.max(2.5, 5 * scaleFactor);
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(ribLeft + slant, lineY - ribH / 2);
      ctx.lineTo(ribRight + slant, lineY - ribH / 2);
      ctx.lineTo(ribRight - slant, lineY + ribH / 2);
      ctx.lineTo(ribLeft - slant, lineY + ribH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (boxMode === 'rgb-split') {
      const splitShift = (6.5 + Math.sin(elapsedMs / 180) * 2.5) * scaleFactor;
      for (const item of items) {
        ctx.save();
        ctx.translate(item.centerX, item.charY);
        if (Math.abs(item.rotationRad) > 0.001) ctx.rotate(item.rotationRad);
        if (Math.abs(item.skewX) > 0.001) {
          ctx.transform(1, 0, item.skewX, 1, 0, 0);
        }
        ctx.scale(item.charScaleX, item.charScaleY);
        ctx.font = item.fontString;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.max(0, Math.min(1, item.charAlpha * 0.88));

        // Layer Cyan Kiri-Atas
        ctx.fillStyle = '#00F0FF';
        ctx.fillText(item.char, -splitShift, -splitShift * 0.35);
        // Layer Magenta Kanan-Bawah
        ctx.fillStyle = '#FF0055';
        ctx.fillText(item.char, splitShift, splitShift * 0.35);
        ctx.restore();
      }
    } else if (boxMode === 'comic-blocks' || boxMode === 'confetti-tags') {
      for (const item of items) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, item.charAlpha));
        const boxColor =
          boxPalette[item.globalCharIdx % Math.max(1, boxPalette.length)];
        const altSign = item.globalCharIdx % 2 === 0 ? -1 : 1;

        if (boxMode === 'comic-blocks') {
          const bw = Math.max(item.charWidth * 1.26, fontSizePx * 0.72);
          const bh = fontSizePx * 1.12;
          const baseTilt =
            altSign * (0.08 + ((item.globalCharIdx * 7) % 5) * 0.015);
          ctx.translate(item.centerX, item.charY);
          ctx.rotate(baseTilt + item.rotationRad * 0.6);
          if (Math.abs(item.skewX) > 0.001) {
            ctx.transform(1, 0, item.skewX, 1, 0, 0);
          }
          ctx.scale(item.charScaleX, item.charScaleY);

          ctx.fillStyle = boxColor;
          ctx.strokeStyle = style.outlineColor || '#09090B';
          ctx.lineWidth = Math.max(2, 4.5 * scaleFactor);
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.rect(-bw / 2, -bh / 2, bw, bh);
          ctx.fill();
          ctx.stroke();
        } else {
          const bw = Math.max(item.charWidth * 0.78, fontSizePx * 0.46);
          const bh = fontSizePx * 0.9;
          const tagTilt = altSign * 0.24 + item.rotationRad * 0.4;
          const tagOffsetX = altSign * fontSizePx * 0.06;
          const tagOffsetY = -fontSizePx * 0.08;

          ctx.translate(item.centerX + tagOffsetX, item.charY + tagOffsetY);
          ctx.rotate(tagTilt);
          if (Math.abs(item.skewX) > 0.001) {
            ctx.transform(1, 0, item.skewX, 1, 0, 0);
          }
          ctx.scale(item.charScaleX, item.charScaleY);

          ctx.fillStyle = boxColor;
          ctx.strokeStyle = style.outlineColor || '#0F172A';
          ctx.lineWidth = Math.max(1.5, 3.5 * scaleFactor);
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.rect(-bw / 2, -bh / 2, bw, bh);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // SINGLE-PASS HIGH-PERFORMANCE SPRITE DRAW (60+ FPS GPU ACCELERATED)
    const baseStickerStyle =
      boxMode === 'liquid-drip' && (style.outerOutlineWidth || 0) < 8
        ? {
            ...style,
            outerOutlineWidth: 15,
            outerOutlineColor: style.outerOutlineColor || '#00D8FF',
          }
        : style;

    for (const item of items) {
      ctx.save();
      ctx.translate(item.centerX, item.charY);
      if (Math.abs(item.rotationRad) > 0.001) ctx.rotate(item.rotationRad);
      if (Math.abs(item.skewX) > 0.001) {
        ctx.transform(1, 0, item.skewX, 1, 0, 0);
      }
      if (
        Math.abs(item.charScaleX - 1) > 0.001 ||
        Math.abs(item.charScaleY - 1) > 0.001
      ) {
        ctx.scale(item.charScaleX, item.charScaleY);
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, item.charAlpha));

      const sprite = getGlyphSprite(
        item.char,
        item.fontString,
        baseStickerStyle,
        scaleFactor,
        fontSizePx,
        item.overrideFillColor
      );

      ctx.drawImage(
        sprite.canvas,
        -sprite.anchorX,
        -sprite.anchorY
      );

      // Efek Tetesan Leleh ("PANAS PANASE SRENGENGE KUWI") di bawah tiap huruf (Batched 60 FPS)
      if (boxMode === 'liquid-drip') {
        const dripColor = baseStickerStyle.outerOutlineColor || '#00D8FF';
        const dh = deterministicHash(item.globalCharIdx * 59 + seed);
        const dripCount = dh % 3 === 0 ? 2 : 1;
        ctx.fillStyle = dripColor;
        ctx.strokeStyle = dripColor;
        ctx.lineCap = 'round';

        const stemW = Math.max(4, 7.5 * scaleFactor);
        ctx.lineWidth = stemW;
        ctx.beginPath();
        const bulbs: { x: number; y: number; r: number }[] = [];

        for (let d = 0; d < dripCount; d++) {
          const subHash = deterministicHash(
            item.globalCharIdx * 97 + d * 31 + seed
          );
          const offsetRatio =
            dripCount === 1
              ? ((subHash % 5) - 2) * 0.1
              : d === 0
              ? -0.22
              : 0.22;
          const dripX = item.charWidth * offsetRatio;
          const startY = fontSizePx * 0.26;
          const baseLen = fontSizePx * (0.18 + (subHash % 5) * 0.055);
          const meltPhase =
            (Math.sin(elapsedMs / 680 + item.globalCharIdx * 1.15 + d * 2.1) +
              1) *
            0.5;
          const dripLen = baseLen + meltPhase * fontSizePx * 0.16;

          ctx.moveTo(dripX, startY);
          ctx.lineTo(dripX, startY + dripLen);

          const bulbR = stemW * 0.68;
          bulbs.push({ x: dripX, y: startY + dripLen, r: bulbR });

          if ((subHash % 3 === 0) && meltPhase > 0.35) {
            const dropDist = fontSizePx * 0.12 + meltPhase * fontSizePx * 0.12;
            const dropR = Math.max(2, 3.8 * scaleFactor * (1.15 - meltPhase * 0.5));
            bulbs.push({ x: dripX, y: startY + dripLen + dropDist, r: dropR });
          }
        }
        ctx.stroke();

        if (bulbs.length > 0) {
          ctx.beginPath();
          for (let b = 0; b < bulbs.length; b++) {
            const blb = bulbs[b];
            ctx.moveTo(blb.x + blb.r, blb.y);
            ctx.arc(blb.x, blb.y, blb.r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }
}

function drawBackdropExtrudeAndSticker(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'center' | 'right',
  style: CueStyle,
  scaleFactor: number,
  alpha: number,
  skipSaveRestore: boolean = false
): void {
  const outlineWidthPx = (style.outlineWidth || 0) * scaleFactor;
  const outerOutlineWidthPx = (style.outerOutlineWidth || 0) * scaleFactor;
  const extrudeDepthPx = (style.extrudeDepth || 0) * scaleFactor;

  if (outerOutlineWidthPx <= 0.5 && extrudeDepthPx <= 0.5) return;

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const totalOuterStrokePx = (outlineWidthPx + outerOutlineWidthPx) * 2;

  if (!skipSaveRestore) ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;

  // 0. Vector Drop Shadow cepat tanpa Gaussian shadowBlur per-huruf (60 FPS GPU-path)
  if ((style.shadowOpacity || 0) > 0.02) {
    const shOffX = (style.shadowOffsetX ?? 0) * scaleFactor;
    const shOffY = (style.shadowOffsetY ?? 4) * scaleFactor;
    const shSpread = Math.min(10, (style.shadowBlur || 0) * scaleFactor * 0.35);
    const shAlpha = clampedAlpha * Math.min(1, style.shadowOpacity || 0.5);
    ctx.strokeStyle = style.shadowColor || '#000000';
    ctx.lineWidth = Math.max(2, totalOuterStrokePx + shSpread);
    ctx.globalAlpha = shAlpha * 0.45;
    ctx.strokeText(text, x + shOffX, y + shOffY);
  }

  // 0b. Vector Halo Glow di luar Sticker bila glow aktif pada tema ber-sticker
  const glowRadiusPx = (style.glowRadius || 0) * scaleFactor;
  const outerCol = style.outerOutlineColor || '#FFFFFF';
  const glowCol = style.glowColor || outerCol;
  const isSameGlowAndSticker = glowCol.toLowerCase() === outerCol.toLowerCase();

  if (outerOutlineWidthPx > 0.5 && glowRadiusPx > 1.5 && (style.glowIntensity || 0) > 0.05) {
    if (!isSameGlowAndSticker) {
      const glowBaseAlpha = clampedAlpha * Math.min(1, style.glowIntensity || 0.8);
      ctx.strokeStyle = glowCol;
      ctx.lineWidth = totalOuterStrokePx + glowRadiusPx * 0.8;
      ctx.globalAlpha = glowBaseAlpha * 0.42;
      ctx.strokeText(text, x, y);
    }
  }

  ctx.globalAlpha = clampedAlpha;

  // A. Outer Sticker Border (Referensi "KITA PUN DUDUK BERSAMA" — Double Outline Putih Tebal)
  if (outerOutlineWidthPx > 0.5) {
    ctx.strokeStyle = outerCol;
    ctx.lineWidth = isSameGlowAndSticker && glowRadiusPx > 1.5
      ? totalOuterStrokePx + glowRadiusPx * 0.45
      : totalOuterStrokePx;
    ctx.strokeText(text, x, y);
  }

  // B. 3D Block Extrude (Referensi "DAUN-DAUN KEKERINGAN" — Blok 3D Biru/Cyan)
  if (extrudeDepthPx > 0.5) {
    const dirX = Math.cos(((style.extrudeAngle ?? 135) - 90) * (Math.PI / 180));
    const dirY = Math.sin(((style.extrudeAngle ?? 135) - 90) * (Math.PI / 180));
    // Batasi jumlah step extrude maksimal 2 agar tetap locked 60 FPS pada kalimat panjang
    const steps = Math.max(1, Math.min(2, Math.ceil(extrudeDepthPx / 6)));
    const extrudeCol = style.extrudeColor || '#0284C7';
    const rimCol = style.outlineColor || '#0F172A';

    // Gambar rim luar gelap pada layer paling ujung untuk blok 3D agar tegas di atas visual LED
    if (outlineWidthPx > 0.5) {
      const endX = x + dirX * extrudeDepthPx;
      const endY = y + dirY * extrudeDepthPx;
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = outlineWidthPx * 2.2;
      ctx.strokeText(text, endX, endY);
    }

    ctx.strokeStyle = extrudeCol;
    ctx.fillStyle = extrudeCol;
    ctx.lineWidth = Math.max(3, outlineWidthPx * 1.6);
    for (let s = steps; s >= 1; s--) {
      const ox = x + dirX * (s / steps) * extrudeDepthPx;
      const oy = y + dirY * (s / steps) * extrudeDepthPx;
      ctx.strokeText(text, ox, oy);
      if (s === steps || s === 1) {
        ctx.fillText(text, ox, oy);
      }
    }
  }

  if (!skipSaveRestore) ctx.restore();
}

function drawStyledTextToken(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'center' | 'right',
  style: CueStyle,
  scaleFactor: number,
  fontSizePx: number,
  alpha: number,
  glowMultiplier: number,
  cachedFillStyle?: string | CanvasGradient,
  skipSaveRestore: boolean = false
): void {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  if (!skipSaveRestore) ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;
  ctx.globalAlpha = clampedAlpha;
  ctx.font = `${style.italic ? 'italic ' : ''}${style.fontWeight || 700} ${fontSizePx}px ${formatFontFamily(style.fontFamily)}`;

  // Pass Pra-Render: Sticker Luar & 3D Block Extrude (jika dipanggil dari mode non-per-karakter)
  const hasBackdropStickerOrExtrude =
    (style.outerOutlineWidth || 0) > 0.5 || (style.extrudeDepth || 0) > 0.5;
  if (hasBackdropStickerOrExtrude) {
    drawBackdropExtrudeAndSticker(
      ctx,
      text,
      x,
      y,
      align,
      style,
      scaleFactor,
      clampedAlpha,
      true
    );
  }

  // 0. Hitung Style Isi (Solid atau Gradasi Linear) secara konsisten
  let fillStyle: string | CanvasGradient = cachedFillStyle || style.fill || '#FFFFFF';
  if (!cachedFillStyle && style.useGradient && style.gradientEnd) {
    const angleDeg =
      typeof style.gradientAngle === 'number' ? style.gradientAngle : 90;
    const rad = (angleDeg * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const halfH = fontSizePx * 0.46;

    let x0: number, y0: number, x1: number, y1: number;

    if (Math.abs(cosA) < 0.05) {
      const dir = sinA >= 0 ? 1 : -1;
      x0 = x;
      y0 = y - halfH * dir;
      x1 = x;
      y1 = y + halfH * dir;
    } else if (Math.abs(sinA) < 0.05) {
      const textWidth = ctx.measureText(text).width || fontSizePx;
      const leftX =
        align === 'center'
          ? x - textWidth / 2
          : align === 'right'
          ? x - textWidth
          : x;
      const rightX = leftX + textWidth;
      const dir = cosA >= 0 ? 1 : -1;
      x0 = dir > 0 ? leftX : rightX;
      y0 = y;
      x1 = dir > 0 ? rightX : leftX;
      y1 = y;
    } else {
      const textWidth = ctx.measureText(text).width || fontSizePx;
      const halfW = textWidth / 2;
      x0 = x - halfW * cosA;
      y0 = y - halfH * sinA;
      x1 = x + halfW * cosA;
      y1 = y + halfH * sinA;
    }

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, style.fill || '#FFFFFF');
    grad.addColorStop(1, style.gradientEnd);
    fillStyle = grad;
  }

  const glowRadiusPx = (style.glowRadius || 0) * scaleFactor * glowMultiplier;
  const outlineWidthPx = (style.outlineWidth || 0) * scaleFactor;
  const hasOutline =
    (style.fillMode === 'outline' || style.fillMode === 'fill-outline') &&
    outlineWidthPx > 0.2;
  const baseStrokePx = hasOutline ? outlineWidthPx * 2 : 0;

  // 1. Vector Drop Shadow Cepat (Single-pass hardware stroke tanpa alokasi Gaussian blur)
  if (!hasBackdropStickerOrExtrude && (style.shadowOpacity || 0) > 0.02) {
    const shOffX = (style.shadowOffsetX ?? 0) * scaleFactor;
    const shOffY = (style.shadowOffsetY ?? 4) * scaleFactor;
    const shSpread = Math.min(10, (style.shadowBlur || 0) * scaleFactor * 0.35);
    const shAlpha = clampedAlpha * Math.min(1, style.shadowOpacity || 0.5);
    const shCol = style.shadowColor || '#000000';

    if (hasOutline || shSpread > 2) {
      ctx.strokeStyle = shCol;
      ctx.lineWidth = Math.max(2, baseStrokePx + shSpread);
      ctx.globalAlpha = shAlpha * 0.5;
      ctx.strokeText(text, x + shOffX, y + shOffY);
    } else if (style.fillMode !== 'outline') {
      ctx.fillStyle = shCol;
      ctx.globalAlpha = shAlpha * 0.65;
      ctx.fillText(text, x + shOffX, y + shOffY);
    }
  }

  // 2. Vector Halo Neon Glow (Single-pass GPU rim stroke tanpa alokasi Gaussian blur texture)
  if (
    !hasBackdropStickerOrExtrude &&
    glowRadiusPx > 0.5 &&
    (style.glowIntensity || 0) > 0.02
  ) {
    const glowCol = style.glowColor || '#00f0ff';
    const glowBaseAlpha =
      clampedAlpha * Math.min(1, style.glowIntensity || 0.8);

    ctx.strokeStyle = glowCol;
    ctx.lineWidth = baseStrokePx + glowRadiusPx * 0.95;
    ctx.globalAlpha = glowBaseAlpha * 0.42;
    ctx.strokeText(text, x, y);
  }

  ctx.globalAlpha = clampedAlpha;

  // 3. Pass Outline Utama
  if (hasOutline) {
    ctx.strokeStyle = style.outlineColor || '#000000';
    ctx.lineWidth = baseStrokePx;
    ctx.strokeText(text, x, y);
  }

  // 4. Pass Fill Utama (jika fillMode === 'fill' atau 'fill-outline')
  if (style.fillMode !== 'outline') {
    ctx.fillStyle = fillStyle;
    ctx.fillText(text, x, y);
  }

  if (!skipSaveRestore) ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  }
  return `rgba(0, 0, 0, ${Math.max(0, Math.min(1, alpha))})`;
}
