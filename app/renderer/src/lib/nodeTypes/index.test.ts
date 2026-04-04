import { describe, expect, it } from 'vitest';
import { nodeTypes } from './index';

describe('canonical node taxonomy', () => {
  it('contains the canonical investigation node types', () => {
    const ids = new Set(nodeTypes.map((nodeType) => nodeType.id));

    expect(ids.has('person')).toBe(true);
    expect(ids.has('organization')).toBe(true);
    expect(ids.has('domain')).toBe(true);
    expect(ids.has('online_account')).toBe(true);
    expect(ids.has('ip_address')).toBe(true);
    expect(ids.has('financial_account')).toBe(true);
  });

  it('removes deprecated role and overlap node ids', () => {
    const ids = new Set(nodeTypes.map((nodeType) => nodeType.id));

    expect(ids.has('suspect')).toBe(false);
    expect(ids.has('witness')).toBe(false);
    expect(ids.has('victim')).toBe(false);
    expect(ids.has('government')).toBe(false);
    expect(ids.has('educational')).toBe(false);
    expect(ids.has('healthcare')).toBe(false);
    expect(ids.has('financial')).toBe(false);
    expect(ids.has('residence')).toBe(false);
    expect(ids.has('business')).toBe(false);
    expect(ids.has('miscellaneous')).toBe(false);
    expect(ids.has('cryptocurrency')).toBe(false);
  });
});
