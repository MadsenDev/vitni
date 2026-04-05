import { describe, expect, it } from 'vitest';
import {
  autoMapCsvColumns,
  buildAssertionDeduplicationKey,
  buildExistingAssertionDeduplicationSet,
  buildImportedProperties,
  findMatchingEntityId,
  inferImportedLabel
} from './csvImport';

describe('csvImport helpers', () => {
  it('auto-maps common headers to node properties', () => {
    const mappings = autoMapCsvColumns(['First Name', 'Last Name', 'Primary Email'], 'person');
    expect(mappings).toEqual([
      { column: 'First Name', propertyKey: 'firstName' },
      { column: 'Last Name', propertyKey: 'lastName' },
      { column: 'Primary Email', propertyKey: 'email' }
    ]);
  });

  it('builds typed property values from mapped columns', () => {
    const properties = buildImportedProperties(
      { Amount: '12.5', Notes: 'first; second', Reference: 'TX-01' },
      [
        { column: 'Amount', propertyKey: 'amount' },
        { column: 'Notes', propertyKey: 'description' },
        { column: 'Reference', propertyKey: 'transactionReference' }
      ],
      'financial_transaction'
    );
    expect(properties).toEqual({
      amount: '12.5',
      description: 'first\nsecond',
      transactionReference: 'TX-01'
    });
  });

  it('finds an existing entity by dedupe field', () => {
    const entityId = findMatchingEntityId(
      {
        nodes: [
          {
            id: 'person-1',
            type: 'person',
            label: 'Jane Doe',
            properties: { email: 'jane@example.com' },
            created_at: 1,
            updated_at: 1,
            pos_x: null,
            pos_y: null
          }
        ],
        edges: []
      },
      'person',
      'email',
      'jane@example.com'
    );
    expect(entityId).toBe('person-1');
  });

  it('infers a usable label from imported properties', () => {
    expect(inferImportedLabel('person', { firstName: 'Jane', lastName: 'Doe' }, 0)).toBe('Jane Doe');
  });

  it('builds assertion dedupe keys from parsed assertions', () => {
    const keys = buildExistingAssertionDeduplicationSet([
      {
        id: 'assertion-1',
        subject_kind: 'entity',
        subject_id: 'person-1',
        path: 'contact.email',
        value: { value: 'jane@example.com' },
        source_id: 'source-1',
        confidence: 'asserted',
        review_state: 'unreviewed',
        created_at: 1
      }
    ]);

    expect(
      keys.has(buildAssertionDeduplicationKey('person-1', 'contact.email', 'source-1', { value: 'jane@example.com' }))
    ).toBe(true);
  });
});
