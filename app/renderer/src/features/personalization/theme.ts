import type { CSSProperties } from 'react';

export type PersonalizationPresetId = 'vitni_midnight' | 'signal_bloom' | 'ember_terminal' | 'custom';
export type IconPackId = 'default' | 'wireframe';
export type SurfaceDepthPreset = 'soft' | 'standard' | 'dramatic';
export type CanvasBackgroundMode = 'grid' | 'gradient' | 'none' | 'image';
export type CanvasImageFit = 'cover' | 'contain' | 'tile' | 'center';

export type PersonalizationColors = {
  appBg: string;
  appBgSoft: string;
  surfaceBase: string;
  surfaceRaised: string;
  surfaceElevated: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textMuted: string;
  textSoft: string;
  accentSky: string;
  accentEmerald: string;
  accentAmber: string;
  dangerSoft: string;
};

export type CanvasBackgroundConfig = {
  mode: CanvasBackgroundMode;
  gridOpacity: number;
  imagePath: string | null;
  imageFileName: string | null;
  imageFit: CanvasImageFit;
  overlayOpacity: number;
  imageBlurPx: number;
};

export type PersonalizationTheme = {
  version: 1;
  presetId: PersonalizationPresetId;
  iconPack: IconPackId;
  surfaceDepth: SurfaceDepthPreset;
  colors: PersonalizationColors;
  canvasBackground: CanvasBackgroundConfig;
};

export type PersonalizationPresetDefinition = {
  id: Exclude<PersonalizationPresetId, 'custom'>;
  label: string;
  description: string;
  colors: PersonalizationColors;
};

const MIDNIGHT_COLORS: PersonalizationColors = {
  appBg: '#050816',
  appBgSoft: '#0b1020',
  surfaceBase: 'rgba(10, 16, 31, 0.86)',
  surfaceRaised: 'rgba(15, 23, 42, 0.92)',
  surfaceElevated: 'rgba(15, 23, 42, 0.98)',
  borderSubtle: 'rgba(71, 85, 105, 0.34)',
  borderStrong: 'rgba(100, 116, 139, 0.5)',
  textPrimary: '#e5eefb',
  textMuted: '#8fa0bf',
  textSoft: '#62708d',
  accentSky: '#5fd4ff',
  accentEmerald: '#45d6a8',
  accentAmber: '#f0b45b',
  dangerSoft: '#ff6a88'
};

export const PERSONALIZATION_PRESETS: PersonalizationPresetDefinition[] = [
  {
    id: 'vitni_midnight',
    label: 'Vitni Midnight',
    description: 'The current dark analytical default with cyan and emerald accents.',
    colors: MIDNIGHT_COLORS
  },
  {
    id: 'signal_bloom',
    label: 'Signal Bloom',
    description: 'Cooler glassy surfaces with brighter cyan highlights and softer text contrast.',
    colors: {
      appBg: '#07101e',
      appBgSoft: '#10192e',
      surfaceBase: 'rgba(14, 24, 43, 0.84)',
      surfaceRaised: 'rgba(18, 31, 54, 0.92)',
      surfaceElevated: 'rgba(20, 35, 61, 0.98)',
      borderSubtle: 'rgba(94, 234, 212, 0.22)',
      borderStrong: 'rgba(125, 211, 252, 0.38)',
      textPrimary: '#eef7ff',
      textMuted: '#a6bddc',
      textSoft: '#7185a4',
      accentSky: '#78e7ff',
      accentEmerald: '#62f2d3',
      accentAmber: '#f8c36f',
      dangerSoft: '#ff7d9f'
    }
  },
  {
    id: 'ember_terminal',
    label: 'Ember Terminal',
    description: 'Warmer contrast with amber and coral highlights for a more tactical mood.',
    colors: {
      appBg: '#0b0712',
      appBgSoft: '#15101f',
      surfaceBase: 'rgba(20, 15, 34, 0.86)',
      surfaceRaised: 'rgba(29, 21, 45, 0.92)',
      surfaceElevated: 'rgba(33, 25, 51, 0.98)',
      borderSubtle: 'rgba(148, 76, 54, 0.32)',
      borderStrong: 'rgba(203, 113, 74, 0.45)',
      textPrimary: '#f9f2ef',
      textMuted: '#caaea4',
      textSoft: '#94786f',
      accentSky: '#f58f65',
      accentEmerald: '#ffbd59',
      accentAmber: '#ffcf7d',
      dangerSoft: '#ff7f78'
    }
  }
];

export const DEFAULT_PERSONALIZATION_THEME: PersonalizationTheme = {
  version: 1,
  presetId: 'vitni_midnight',
  iconPack: 'default',
  surfaceDepth: 'standard',
  colors: MIDNIGHT_COLORS,
  canvasBackground: {
    mode: 'grid',
    gridOpacity: 0.06,
    imagePath: null,
    imageFileName: null,
    imageFit: 'cover',
    overlayOpacity: 0.18,
    imageBlurPx: 10
  }
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function withAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  if (normalized.startsWith('rgba(')) {
    return normalized.replace(/rgba\(([^)]+),[^,]+\)$/, `rgba($1, ${alpha})`);
  }
  if (normalized.startsWith('rgb(')) {
    return normalized.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  const hex = normalized.replace('#', '');
  if (![3, 6].includes(hex.length)) return normalized;
  const expanded = hex.length === 3 ? hex.split('').map((part) => `${part}${part}`).join('') : hex;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getPersonalizationPreset(presetId: PersonalizationPresetId | null | undefined) {
  return PERSONALIZATION_PRESETS.find((preset) => preset.id === presetId) ?? PERSONALIZATION_PRESETS[0];
}

export function normalizePersonalizationTheme(value: unknown): PersonalizationTheme {
  const base = structuredClone(DEFAULT_PERSONALIZATION_THEME);
  if (!isRecord(value)) {
    return base;
  }

  const presetId =
    value.presetId === 'signal_bloom' || value.presetId === 'ember_terminal' || value.presetId === 'vitni_midnight' || value.presetId === 'custom'
      ? value.presetId
      : base.presetId;
  const presetColors = getPersonalizationPreset(presetId).colors;

  const colors = isRecord(value.colors) ? value.colors : {};
  const canvasBackground = isRecord(value.canvasBackground) ? value.canvasBackground : {};
  const rawOverlayOpacity =
    typeof canvasBackground.overlayOpacity === 'number'
      ? clamp(canvasBackground.overlayOpacity, 0, 0.9)
      : base.canvasBackground.overlayOpacity;
  const normalizedOverlayOpacity =
    canvasBackground.mode === 'image' && Math.abs(rawOverlayOpacity - 0.48) < 0.001
      ? 0.18
      : rawOverlayOpacity;
  const normalizedImageBlurPx =
    typeof canvasBackground.imageBlurPx === 'number'
      ? clamp(canvasBackground.imageBlurPx, 0, 24)
      : base.canvasBackground.imageBlurPx;

  return {
    version: 1,
    presetId,
    iconPack: value.iconPack === 'wireframe' ? 'wireframe' : 'default',
    surfaceDepth: value.surfaceDepth === 'soft' || value.surfaceDepth === 'dramatic' ? value.surfaceDepth : 'standard',
    colors: {
      appBg: typeof colors.appBg === 'string' ? colors.appBg : presetColors.appBg,
      appBgSoft: typeof colors.appBgSoft === 'string' ? colors.appBgSoft : presetColors.appBgSoft,
      surfaceBase: typeof colors.surfaceBase === 'string' ? colors.surfaceBase : presetColors.surfaceBase,
      surfaceRaised: typeof colors.surfaceRaised === 'string' ? colors.surfaceRaised : presetColors.surfaceRaised,
      surfaceElevated: typeof colors.surfaceElevated === 'string' ? colors.surfaceElevated : presetColors.surfaceElevated,
      borderSubtle: typeof colors.borderSubtle === 'string' ? colors.borderSubtle : presetColors.borderSubtle,
      borderStrong: typeof colors.borderStrong === 'string' ? colors.borderStrong : presetColors.borderStrong,
      textPrimary: typeof colors.textPrimary === 'string' ? colors.textPrimary : presetColors.textPrimary,
      textMuted: typeof colors.textMuted === 'string' ? colors.textMuted : presetColors.textMuted,
      textSoft: typeof colors.textSoft === 'string' ? colors.textSoft : presetColors.textSoft,
      accentSky: typeof colors.accentSky === 'string' ? colors.accentSky : presetColors.accentSky,
      accentEmerald: typeof colors.accentEmerald === 'string' ? colors.accentEmerald : presetColors.accentEmerald,
      accentAmber: typeof colors.accentAmber === 'string' ? colors.accentAmber : presetColors.accentAmber,
      dangerSoft: typeof colors.dangerSoft === 'string' ? colors.dangerSoft : presetColors.dangerSoft
    },
    canvasBackground: {
      mode:
        canvasBackground.mode === 'none' ||
        canvasBackground.mode === 'gradient' ||
        canvasBackground.mode === 'image' ||
        canvasBackground.mode === 'grid'
          ? canvasBackground.mode
          : base.canvasBackground.mode,
      gridOpacity:
        typeof canvasBackground.gridOpacity === 'number'
          ? clamp(canvasBackground.gridOpacity, 0, 0.25)
          : base.canvasBackground.gridOpacity,
      imagePath: typeof canvasBackground.imagePath === 'string' && canvasBackground.imagePath.trim() ? canvasBackground.imagePath : null,
      imageFileName:
        typeof canvasBackground.imageFileName === 'string' && canvasBackground.imageFileName.trim()
          ? canvasBackground.imageFileName
          : null,
      imageFit:
        canvasBackground.imageFit === 'contain' ||
        canvasBackground.imageFit === 'tile' ||
        canvasBackground.imageFit === 'center'
          ? canvasBackground.imageFit
          : 'cover',
      overlayOpacity: normalizedOverlayOpacity,
      imageBlurPx: normalizedImageBlurPx
    }
  };
}

export function createPresetTheme(presetId: Exclude<PersonalizationPresetId, 'custom'>): PersonalizationTheme {
  const preset = getPersonalizationPreset(presetId);
  return {
    ...structuredClone(DEFAULT_PERSONALIZATION_THEME),
    presetId,
    colors: structuredClone(preset.colors)
  };
}

export function applyPersonalizationTheme(theme: PersonalizationTheme) {
  const root = document.documentElement;
  const { colors } = theme;
  const panelShadow =
    theme.surfaceDepth === 'soft'
      ? '0 14px 42px rgba(2, 6, 23, 0.34)'
      : theme.surfaceDepth === 'dramatic'
        ? '0 28px 88px rgba(2, 6, 23, 0.68)'
        : '0 18px 60px rgba(2, 6, 23, 0.45)';
  const floatShadow =
    theme.surfaceDepth === 'soft'
      ? '0 18px 56px rgba(2, 6, 23, 0.42)'
      : theme.surfaceDepth === 'dramatic'
        ? '0 32px 108px rgba(2, 6, 23, 0.78)'
        : '0 24px 80px rgba(2, 6, 23, 0.58)';

  const bodyBackground = [
    `radial-gradient(circle at top, ${withAlpha(colors.accentEmerald, 0.08)}, transparent 28%)`,
    `radial-gradient(circle at 85% 15%, ${withAlpha(colors.accentSky, 0.1)}, transparent 24%)`,
    `linear-gradient(180deg, ${colors.appBgSoft} 0%, ${colors.appBg} 100%)`
  ].join(', ');

  const gradientCanvas = [
    `radial-gradient(circle at top, ${withAlpha(colors.accentEmerald, 0.05)}, transparent 30%)`,
    `radial-gradient(circle at 82% 16%, ${withAlpha(colors.accentSky, 0.05)}, transparent 26%)`,
    `linear-gradient(180deg, ${withAlpha(colors.appBgSoft, 0.96)} 0%, ${withAlpha(colors.appBg, 0.98)} 100%)`
  ].join(', ');

  const gridCanvas = [
    `linear-gradient(to right, ${withAlpha(colors.textMuted, theme.canvasBackground.gridOpacity)} 1px, transparent 1px)`,
    `linear-gradient(to bottom, ${withAlpha(colors.textMuted, theme.canvasBackground.gridOpacity)} 1px, transparent 1px)`,
    gradientCanvas
  ].join(', ');

  root.style.setProperty('--app-bg', colors.appBg);
  root.style.setProperty('--app-bg-soft', colors.appBgSoft);
  root.style.setProperty('--surface-base', colors.surfaceBase);
  root.style.setProperty('--surface-raised', colors.surfaceRaised);
  root.style.setProperty('--surface-elevated', colors.surfaceElevated);
  root.style.setProperty('--border-subtle', colors.borderSubtle);
  root.style.setProperty('--border-strong', colors.borderStrong);
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-soft', colors.textSoft);
  root.style.setProperty('--accent-sky', colors.accentSky);
  root.style.setProperty('--accent-emerald', colors.accentEmerald);
  root.style.setProperty('--accent-amber', colors.accentAmber);
  root.style.setProperty('--danger-soft', colors.dangerSoft);
  root.style.setProperty('--shadow-panel', panelShadow);
  root.style.setProperty('--shadow-float', floatShadow);
  root.style.setProperty('--body-background', bodyBackground);
  root.style.setProperty('--canvas-gradient-background', gradientCanvas);
  root.style.setProperty('--canvas-grid-background', gridCanvas);
}

export function buildCanvasImageStyle(theme: PersonalizationTheme): CSSProperties | null {
  const { colors, canvasBackground } = theme;
  if (canvasBackground.mode !== 'image' || !canvasBackground.imagePath) {
    return null;
  }

  const url = `file://${encodeURI(canvasBackground.imagePath.replace(/\\/g, '/'))}`;
  const overlay = `linear-gradient(180deg, ${withAlpha(colors.appBgSoft, canvasBackground.overlayOpacity)} 0%, ${withAlpha(colors.appBg, Math.min(canvasBackground.overlayOpacity + 0.04, 0.8))} 100%)`;

  const backgroundSize =
    canvasBackground.imageFit === 'cover'
      ? 'cover'
      : canvasBackground.imageFit === 'contain'
        ? 'contain'
        : canvasBackground.imageFit === 'center'
          ? 'auto'
          : '240px 240px';

  return {
    backgroundColor: colors.appBgSoft,
    backgroundImage: `${overlay}, url("${url}")`,
    backgroundPosition: canvasBackground.imageFit === 'tile' ? '0 0, 0 0' : 'center, center',
    backgroundRepeat: canvasBackground.imageFit === 'tile' ? 'repeat, repeat' : 'no-repeat, no-repeat',
    backgroundSize,
    filter: `blur(${canvasBackground.imageBlurPx}px)`,
    transform: canvasBackground.imageBlurPx > 0 ? 'scale(1.04)' : undefined,
    transformOrigin: 'center'
  };
}
