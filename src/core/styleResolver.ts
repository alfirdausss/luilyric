/**
 * LuiLyric Style & Animation Inheritance Resolver (Bagian 8 & 9)
 * Urutan resolusi:
 * 1. Default aplikasi (APP_DEFAULT_STYLE / APP_DEFAULT_ANIMATION)
 * 2. Preset default lagu (song.defaultPresetId)
 * 3. Preset cue (cue.presetId)
 * 4. Override spesifik cue (cue.styleOverrides / cue.animationOverrides)
 */

import { Cue, CueAnimation, CueStyle, Song, StylePreset } from '../contracts';
import { APP_DEFAULT_ANIMATION, APP_DEFAULT_STYLE } from './defaults';

export function resolveCueStyle(
  cue: Cue,
  song: Song,
  presets: StylePreset[]
): CueStyle {
  const songPreset = presets.find((p) => p.id === song.defaultPresetId);
  const cuePreset = presets.find((p) => p.id === cue.presetId);

  return {
    ...APP_DEFAULT_STYLE,
    ...(songPreset ? songPreset.style : {}),
    ...(cuePreset ? cuePreset.style : {}),
    ...(cue.styleOverrides || {}),
  };
}

export function resolveCueAnimation(
  cue: Cue,
  song: Song,
  presets: StylePreset[]
): CueAnimation {
  const songPreset = presets.find((p) => p.id === song.defaultPresetId);
  const cuePreset = presets.find((p) => p.id === cue.presetId);

  const baseIn = {
    ...APP_DEFAULT_ANIMATION.in,
    ...(songPreset ? songPreset.animation.in : {}),
    ...(cuePreset ? cuePreset.animation.in : {}),
    ...(cue.animationOverrides?.in || {}),
  };

  const baseHold = {
    ...APP_DEFAULT_ANIMATION.hold,
    ...(songPreset ? songPreset.animation.hold : {}),
    ...(cuePreset ? cuePreset.animation.hold : {}),
    ...(cue.animationOverrides?.hold || {}),
  };

  const baseOut = {
    ...APP_DEFAULT_ANIMATION.out,
    ...(songPreset ? songPreset.animation.out : {}),
    ...(cuePreset ? cuePreset.animation.out : {}),
    ...(cue.animationOverrides?.out || {}),
  };

  const seed =
    cuePreset?.animation.seed ??
    songPreset?.animation.seed ??
    APP_DEFAULT_ANIMATION.seed ??
    101;

  return {
    in: baseIn,
    hold: baseHold,
    out: baseOut,
    seed,
  };
}

export function hasCueOverrides(cue: Cue): boolean {
  const styleKeys = Object.keys(cue.styleOverrides || {});
  const animInKeys = Object.keys(cue.animationOverrides?.in || {});
  const animHoldKeys = Object.keys(cue.animationOverrides?.hold || {});
  const animOutKeys = Object.keys(cue.animationOverrides?.out || {});
  return (
    styleKeys.length > 0 ||
    animInKeys.length > 0 ||
    animHoldKeys.length > 0 ||
    animOutKeys.length > 0
  );
}
