import { describe, expect, it } from 'vitest';
import { getGraphLayoutPreset, normalizeAutoLayoutPresetSetting } from './layoutPresets';

describe('layoutPresets', () => {
  it('normalizes legacy boolean auto-layout values', () => {
    expect(normalizeAutoLayoutPresetSetting(undefined, true)).toBe('investigation_map');
    expect(normalizeAutoLayoutPresetSetting(undefined, false)).toBe('off');
    expect(normalizeAutoLayoutPresetSetting('chain_view', false)).toBe('chain_view');
  });

  it('returns a readable preset definition', () => {
    const preset = getGraphLayoutPreset('focus_rings');
    expect(preset.label).toBe('Focus rings');
    expect(preset.layoutEngine).toBe('concentric');
    expect(preset.edgeStyleMode).toBe('rings');
  });
});
