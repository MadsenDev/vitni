import { describe, expect, it } from 'vitest';
import type { ElementDefinition } from 'cytoscape';
import { displayNameForNode, getDeviceSecondaryLabel, inferEntityLabel, mapGraphElements } from './labeling';
import type { GraphSnapshot } from '@renderer/types/graph';

function getElementData(element: ElementDefinition): Record<string, unknown> {
  if (!element.data || typeof element.data !== 'object' || Array.isArray(element.data)) {
    throw new Error('Element is missing data');
  }
  return element.data as Record<string, unknown>;
}

describe('graph labeling', () => {
  it('ignores placeholder device names and falls back to model', () => {
    const label = inferEntityLabel('device', {
      name: 'N/A',
      model: 'Galaxy S24+',
      serialNumber: 'ABC123'
    });

    expect(label).toBe('Galaxy S24+');
  });

  it('builds a secondary label from serial number before imei', () => {
    expect(getDeviceSecondaryLabel({ serialNumber: 'ABC123', imei: '123456789012345' })).toBe('SN: ABC123');
    expect(getDeviceSecondaryLabel({ imei: '123456789012345' })).toBe('IMEI: 123456789012345');
  });

  it('adds a secondary line to device canvas labels', () => {
    const graph: GraphSnapshot = {
      nodes: [
        {
          id: 'device-1',
          type: 'device',
          label: 'N/A',
          properties: { name: 'N/A', model: 'Galaxy S24+', serialNumber: 'ABC123' },
          created_at: 0,
          updated_at: 0
        }
      ],
      edges: []
    };

    const [nodeElement] = mapGraphElements(graph, true, false, new Map());
    const data = getElementData(nodeElement);
    expect(data.label).toContain('Galaxy S24+');
    expect(data.label).toContain('SN: ABC123');
  });

  it('prefers structured person names over raw labels', () => {
    const displayName = displayNameForNode({
      id: 'person-1',
      type: 'person',
      label: 'Unknown',
      properties: { first_name: 'Ada', last_name: 'Lovelace' },
      created_at: 0,
      updated_at: 0
    });

    expect(displayName).toBe('Ada Lovelace');
  });

  it('suppresses generic linked-to labels when a more specific relationship exists for the same pair', () => {
    const graph: GraphSnapshot = {
      nodes: [
        { id: 'person-1', type: 'person', label: 'Ada', properties: {}, created_at: 0, updated_at: 0 },
        { id: 'person-2', type: 'person', label: 'Charles', properties: {}, created_at: 0, updated_at: 0 }
      ],
      edges: [
        {
          id: 'edge-1',
          src_id: 'person-1',
          dst_id: 'person-2',
          type: 'family_or_personal',
          properties: { subtype: 'spouse_of', date: '2022-01-01' },
          created_at: 0,
          updated_at: 0
        },
        {
          id: 'edge-2',
          src_id: 'person-1',
          dst_id: 'person-2',
          type: 'associated_with',
          properties: { subtype: 'linked_to' },
          created_at: 0,
          updated_at: 0
        }
      ]
    };

    const elements = mapGraphElements(graph, true, false, new Map());
    const spouseEdge = elements.find((element) => getElementData(element).id === 'edge-1');
    const genericEdge = elements.find((element) => getElementData(element).id === 'edge-2');

    expect(spouseEdge).toBeDefined();
    expect(genericEdge).toBeDefined();

    expect(getElementData(spouseEdge!).label).toContain('Spouse Of');
    expect(getElementData(genericEdge!).label).toBe('');
  });
});
