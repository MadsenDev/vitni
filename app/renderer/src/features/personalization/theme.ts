import type { CSSProperties } from 'react';

export type PersonalizationPresetId =
  | 'vitni_midnight'
  | 'signal_bloom'
  | 'ember_terminal'
  | 'paper_trail'
  | 'frost_ledger'
  | 'archive_daylight'
  | 'operator_slate'
  | 'custom';
export type IconPackId = 'default' | 'wireframe';
export type SurfaceDepthPreset = 'soft' | 'standard' | 'dramatic';
export type CanvasBackgroundMode = 'grid' | 'gradient' | 'none' | 'image';
export type CanvasImageFit = 'cover' | 'contain' | 'tile' | 'center';
export type AppearanceMode = 'dark' | 'light';

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
  version: 2;
  presetId: PersonalizationPresetId;
  appearanceMode: AppearanceMode;
  iconPack: IconPackId;
  surfaceDepth: SurfaceDepthPreset;
  colors: PersonalizationColors;
  canvasBackground: CanvasBackgroundConfig;
};

export type PersonalizationPresetDefinition = {
  id: Exclude<PersonalizationPresetId, 'custom'>;
  label: string;
  description: string;
  appearanceMode: AppearanceMode;
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

const PAPER_TRAIL_COLORS: PersonalizationColors = {
  appBg: '#f4f1e8',
  appBgSoft: '#fbf8f2',
  surfaceBase: 'rgba(255, 252, 246, 0.9)',
  surfaceRaised: 'rgba(255, 255, 252, 0.96)',
  surfaceElevated: 'rgba(255, 255, 255, 0.985)',
  borderSubtle: 'rgba(144, 128, 112, 0.26)',
  borderStrong: 'rgba(119, 101, 83, 0.42)',
  textPrimary: '#1e2430',
  textMuted: '#566171',
  textSoft: '#7e8896',
  accentSky: '#3578e5',
  accentEmerald: '#1f9b76',
  accentAmber: '#b9791b',
  dangerSoft: '#d2586c'
};

export const PERSONALIZATION_PRESETS: PersonalizationPresetDefinition[] = [
  {
    id: 'vitni_midnight',
    label: 'Vitni Midnight',
    description: 'The default dark investigative shell with cyan and emerald accents.',
    appearanceMode: 'dark',
    colors: MIDNIGHT_COLORS
  },
  {
    id: 'signal_bloom',
    label: 'Signal Bloom',
    description: 'Cool glassy surfaces with brighter cyan highlights and softer contrast.',
    appearanceMode: 'dark',
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
    description: 'A warmer tactical dark theme with amber and coral highlights.',
    appearanceMode: 'dark',
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
  },
  {
    id: 'operator_slate',
    label: 'Operator Slate',
    description: 'A flatter graphite dark theme with cleaner contrast and quieter accents.',
    appearanceMode: 'dark',
    colors: {
      appBg: '#0d1118',
      appBgSoft: '#141b25',
      surfaceBase: 'rgba(20, 27, 37, 0.86)',
      surfaceRaised: 'rgba(28, 36, 48, 0.93)',
      surfaceElevated: 'rgba(34, 43, 56, 0.98)',
      borderSubtle: 'rgba(108, 122, 138, 0.28)',
      borderStrong: 'rgba(124, 140, 158, 0.42)',
      textPrimary: '#edf3fb',
      textMuted: '#a7b3c2',
      textSoft: '#768294',
      accentSky: '#69baf9',
      accentEmerald: '#59c3aa',
      accentAmber: '#d7aa58',
      dangerSoft: '#f17b8e'
    }
  },
  {
    id: 'paper_trail',
    label: 'Paper Trail',
    description: 'A neutral light theme inspired by paper files, desks, and printed reports.',
    appearanceMode: 'light',
    colors: PAPER_TRAIL_COLORS
  },
  {
    id: 'frost_ledger',
    label: 'Frost Ledger',
    description: 'A crisp cool light theme with blue-steel accents and cleaner analytical contrast.',
    appearanceMode: 'light',
    colors: {
      appBg: '#edf4fb',
      appBgSoft: '#f8fbff',
      surfaceBase: 'rgba(250, 252, 255, 0.9)',
      surfaceRaised: 'rgba(255, 255, 255, 0.96)',
      surfaceElevated: 'rgba(255, 255, 255, 0.99)',
      borderSubtle: 'rgba(120, 141, 166, 0.22)',
      borderStrong: 'rgba(92, 118, 148, 0.38)',
      textPrimary: '#1a2434',
      textMuted: '#5f6d82',
      textSoft: '#8390a1',
      accentSky: '#2c7be5',
      accentEmerald: '#219d84',
      accentAmber: '#c98b2e',
      dangerSoft: '#d35574'
    }
  },
  {
    id: 'archive_daylight',
    label: 'Archive Daylight',
    description: 'A warmer daylight theme with archive-box tones and softer paper contrast.',
    appearanceMode: 'light',
    colors: {
      appBg: '#f7f0e3',
      appBgSoft: '#fdf8ef',
      surfaceBase: 'rgba(255, 251, 244, 0.88)',
      surfaceRaised: 'rgba(255, 255, 250, 0.96)',
      surfaceElevated: 'rgba(255, 255, 252, 0.99)',
      borderSubtle: 'rgba(155, 133, 98, 0.24)',
      borderStrong: 'rgba(138, 111, 70, 0.4)',
      textPrimary: '#2b241c',
      textMuted: '#67594b',
      textSoft: '#94826f',
      accentSky: '#5c7de8',
      accentEmerald: '#4a9b72',
      accentAmber: '#c17a21',
      dangerSoft: '#ca5d5a'
    }
  }
];

export const DEFAULT_PERSONALIZATION_THEME: PersonalizationTheme = {
  version: 2,
  presetId: 'vitni_midnight',
  appearanceMode: 'dark',
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
    value.presetId === 'signal_bloom' ||
    value.presetId === 'ember_terminal' ||
    value.presetId === 'vitni_midnight' ||
    value.presetId === 'paper_trail' ||
    value.presetId === 'frost_ledger' ||
    value.presetId === 'archive_daylight' ||
    value.presetId === 'operator_slate' ||
    value.presetId === 'custom'
      ? value.presetId
      : base.presetId;
  const presetDefinition = getPersonalizationPreset(presetId);
  const presetColors = presetDefinition.colors;

  const colors = isRecord(value.colors) ? value.colors : {};
  const canvasBackground = isRecord(value.canvasBackground) ? value.canvasBackground : {};
  const rawOverlayOpacity =
    typeof canvasBackground.overlayOpacity === 'number'
      ? clamp(canvasBackground.overlayOpacity, 0, 0.9)
      : base.canvasBackground.overlayOpacity;
  const normalizedOverlayOpacity =
    canvasBackground.mode === 'image' && Math.abs(rawOverlayOpacity - 0.48) < 0.001 ? 0.18 : rawOverlayOpacity;
  const normalizedImageBlurPx =
    typeof canvasBackground.imageBlurPx === 'number'
      ? clamp(canvasBackground.imageBlurPx, 0, 24)
      : base.canvasBackground.imageBlurPx;
  const appearanceMode =
    value.appearanceMode === 'light' || value.appearanceMode === 'dark'
      ? value.appearanceMode
      : presetDefinition.appearanceMode;

  return {
    version: 2,
    presetId,
    appearanceMode,
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
          : appearanceMode === 'light'
            ? 0.08
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
    version: 2,
    presetId,
    appearanceMode: preset.appearanceMode,
    colors: structuredClone(preset.colors),
    canvasBackground: {
      ...structuredClone(DEFAULT_PERSONALIZATION_THEME.canvasBackground),
      gridOpacity: preset.appearanceMode === 'light' ? 0.08 : DEFAULT_PERSONALIZATION_THEME.canvasBackground.gridOpacity
    }
  };
}

export function applyPersonalizationTheme(theme: PersonalizationTheme) {
  const root = document.documentElement;
  const body = document.body;
  const { colors, appearanceMode } = theme;
  const panelShadow =
    theme.surfaceDepth === 'soft'
      ? appearanceMode === 'light'
        ? '0 10px 28px rgba(15, 23, 42, 0.08)'
        : '0 14px 42px rgba(2, 6, 23, 0.34)'
      : theme.surfaceDepth === 'dramatic'
        ? appearanceMode === 'light'
          ? '0 22px 56px rgba(15, 23, 42, 0.16)'
          : '0 28px 88px rgba(2, 6, 23, 0.68)'
        : appearanceMode === 'light'
          ? '0 16px 42px rgba(15, 23, 42, 0.12)'
          : '0 18px 60px rgba(2, 6, 23, 0.45)';
  const floatShadow =
    theme.surfaceDepth === 'soft'
      ? appearanceMode === 'light'
        ? '0 14px 34px rgba(15, 23, 42, 0.11)'
        : '0 18px 56px rgba(2, 6, 23, 0.42)'
      : theme.surfaceDepth === 'dramatic'
        ? appearanceMode === 'light'
          ? '0 28px 72px rgba(15, 23, 42, 0.18)'
          : '0 32px 108px rgba(2, 6, 23, 0.78)'
        : appearanceMode === 'light'
          ? '0 20px 52px rgba(15, 23, 42, 0.14)'
          : '0 24px 80px rgba(2, 6, 23, 0.58)';

  const bodyBackground =
    appearanceMode === 'light'
      ? [
          `radial-gradient(circle at top, ${withAlpha(colors.accentEmerald, 0.08)}, transparent 26%)`,
          `radial-gradient(circle at 85% 15%, ${withAlpha(colors.accentSky, 0.09)}, transparent 24%)`,
          `linear-gradient(180deg, ${colors.appBgSoft} 0%, ${colors.appBg} 100%)`
        ].join(', ')
      : [
          `radial-gradient(circle at top, ${withAlpha(colors.accentEmerald, 0.08)}, transparent 28%)`,
          `radial-gradient(circle at 85% 15%, ${withAlpha(colors.accentSky, 0.1)}, transparent 24%)`,
          `linear-gradient(180deg, ${colors.appBgSoft} 0%, ${colors.appBg} 100%)`
        ].join(', ');

  const gradientCanvas =
    appearanceMode === 'light'
      ? [
          `radial-gradient(circle at top, ${withAlpha(colors.accentEmerald, 0.04)}, transparent 28%)`,
          `radial-gradient(circle at 82% 16%, ${withAlpha(colors.accentSky, 0.05)}, transparent 24%)`,
          `linear-gradient(180deg, ${withAlpha(colors.appBgSoft, 0.98)} 0%, ${withAlpha(colors.appBg, 0.99)} 100%)`
        ].join(', ')
      : [
          `radial-gradient(circle at top, ${withAlpha(colors.accentEmerald, 0.05)}, transparent 30%)`,
          `radial-gradient(circle at 82% 16%, ${withAlpha(colors.accentSky, 0.05)}, transparent 26%)`,
          `linear-gradient(180deg, ${withAlpha(colors.appBgSoft, 0.96)} 0%, ${withAlpha(colors.appBg, 0.98)} 100%)`
        ].join(', ');

  const gridCanvas = [
    `linear-gradient(to right, ${withAlpha(colors.textMuted, theme.canvasBackground.gridOpacity)} 1px, transparent 1px)`,
    `linear-gradient(to bottom, ${withAlpha(colors.textMuted, theme.canvasBackground.gridOpacity)} 1px, transparent 1px)`,
    gradientCanvas
  ].join(', ');

  root.dataset.appearanceMode = appearanceMode;
  body.dataset.appearanceMode = appearanceMode;
  root.style.colorScheme = appearanceMode;
  body.style.colorScheme = appearanceMode;
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
  root.style.setProperty('--input-bg', appearanceMode === 'light' ? withAlpha(colors.surfaceElevated, 0.98) : 'rgba(10, 16, 31, 0.82)');
  root.style.setProperty('--input-border', appearanceMode === 'light' ? withAlpha(colors.borderStrong, 0.9) : colors.borderStrong);
  root.style.setProperty('--input-text', colors.textPrimary);
  root.style.setProperty('--input-placeholder', colors.textSoft);
  root.style.setProperty('--overlay-backdrop', appearanceMode === 'light' ? 'rgba(15, 23, 42, 0.22)' : 'rgba(2, 6, 23, 0.72)');
  root.style.setProperty('--status-accent-bg', withAlpha(colors.accentSky, appearanceMode === 'light' ? 0.10 : 0.12));
  root.style.setProperty('--status-accent-border', withAlpha(colors.accentSky, appearanceMode === 'light' ? 0.28 : 0.34));
  root.style.setProperty('--status-accent-text', appearanceMode === 'light' ? colors.accentSky : '#d6f6ff');
  root.style.setProperty('--status-success-bg', withAlpha(colors.accentEmerald, appearanceMode === 'light' ? 0.10 : 0.12));
  root.style.setProperty('--status-success-border', withAlpha(colors.accentEmerald, appearanceMode === 'light' ? 0.28 : 0.34));
  root.style.setProperty('--status-success-text', appearanceMode === 'light' ? colors.accentEmerald : '#d8fff1');
  root.style.setProperty('--status-warning-bg', withAlpha(colors.accentAmber, appearanceMode === 'light' ? 0.10 : 0.12));
  root.style.setProperty('--status-warning-border', withAlpha(colors.accentAmber, appearanceMode === 'light' ? 0.28 : 0.30));
  root.style.setProperty('--status-warning-text', appearanceMode === 'light' ? colors.accentAmber : '#ffe8c1');
  root.style.setProperty('--status-danger-bg', withAlpha(colors.dangerSoft, appearanceMode === 'light' ? 0.10 : 0.12));
  root.style.setProperty('--status-danger-border', withAlpha(colors.dangerSoft, appearanceMode === 'light' ? 0.28 : 0.30));
  root.style.setProperty('--status-danger-text', appearanceMode === 'light' ? colors.dangerSoft : '#ffd9e2');
  root.style.setProperty('--shadow-panel', panelShadow);
  root.style.setProperty('--shadow-float', floatShadow);
  root.style.setProperty('--body-background', bodyBackground);
  root.style.setProperty('--canvas-gradient-background', gradientCanvas);
  root.style.setProperty('--canvas-grid-background', gridCanvas);
  root.style.setProperty('--control-chip-bg', appearanceMode === 'light' ? withAlpha(colors.surfaceRaised, 0.98) : 'rgba(15, 23, 42, 0.78)');
  root.style.setProperty('--control-chip-border', appearanceMode === 'light' ? withAlpha(colors.borderStrong, 0.8) : 'rgba(71, 85, 105, 0.45)');
  root.style.setProperty('--control-chip-hover-border', withAlpha(colors.accentSky, appearanceMode === 'light' ? 0.42 : 0.32));
  root.style.setProperty('--control-chip-shadow', appearanceMode === 'light' ? '0 8px 24px rgba(15, 23, 42, 0.09)' : '0 10px 24px rgba(2, 6, 23, 0.28)');
  root.style.setProperty('--scrollbar-track', appearanceMode === 'light' ? withAlpha(colors.surfaceRaised, 0.95) : 'rgba(15, 23, 42, 0.7)');
  root.style.setProperty('--scrollbar-thumb-start', withAlpha(colors.accentSky, appearanceMode === 'light' ? 0.38 : 0.35));
  root.style.setProperty('--scrollbar-thumb-end', withAlpha(colors.accentEmerald, appearanceMode === 'light' ? 0.38 : 0.35));
  root.style.setProperty('--scrollbar-thumb-hover-start', withAlpha(colors.accentSky, appearanceMode === 'light' ? 0.52 : 0.5));
  root.style.setProperty('--scrollbar-thumb-hover-end', withAlpha(colors.accentEmerald, appearanceMode === 'light' ? 0.52 : 0.5));
  root.style.setProperty('--scrollbar-thumb-border', appearanceMode === 'light' ? withAlpha(colors.borderStrong, 0.7) : 'rgba(51, 65, 85, 0.6)');
  root.style.setProperty('--scrollbar-thumb-hover-border', appearanceMode === 'light' ? withAlpha(colors.borderStrong, 0.9) : 'rgba(71, 85, 105, 0.8)');
}

export function buildCanvasImageStyle(theme: PersonalizationTheme): CSSProperties | null {
  const { colors, canvasBackground, appearanceMode } = theme;
  if (canvasBackground.mode !== 'image' || !canvasBackground.imagePath) {
    return null;
  }

  const url = `file://${encodeURI(canvasBackground.imagePath.replace(/\\/g, '/'))}`;
  const overlayEndOpacity = appearanceMode === 'light'
    ? Math.min(canvasBackground.overlayOpacity + 0.02, 0.65)
    : Math.min(canvasBackground.overlayOpacity + 0.04, 0.8);
  const overlay = `linear-gradient(180deg, ${withAlpha(colors.appBgSoft, canvasBackground.overlayOpacity)} 0%, ${withAlpha(colors.appBg, overlayEndOpacity)} 100%)`;

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
