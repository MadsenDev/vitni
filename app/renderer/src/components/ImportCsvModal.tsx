import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import type { Confidence, EntityType } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { emitToast } from '@renderer/lib/toast';
import { piBridge } from '@renderer/services/piBridge';
import { nodeTypes } from '@renderer/lib/nodeTypes';
import {
  autoMapCsvColumns,
  buildAssertionDeduplicationKey,
  buildExistingAssertionDeduplicationSet,
  buildImportedProperties,
  collectImportableAssertionPaths,
  findMatchingEntityId,
  getNodeTypeDefinition,
  inferImportedLabel,
  type CsvColumnMapping
} from '@renderer/features/import/csvImport';
import {
  ThemedButton,
  ThemedCard,
  ThemedPanel,
  ThemedSection,
  ThemedSelect
} from '@renderer/features/personalization/primitives';

interface ImportCsvModalProps {
  isOpen: boolean;
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  onClose: () => void;
  onImported: () => Promise<void>;
}

type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function ImportCsvModal({ isOpen, graph, assertions, onClose, onImported }: ImportCsvModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [targetType, setTargetType] = useState<EntityType>('person');
  const [mappings, setMappings] = useState<CsvColumnMapping[]>([]);
  const [dedupeProperty, setDedupeProperty] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence>('asserted');
  const [isImporting, setIsImporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const nodeType = useMemo(() => getNodeTypeDefinition(targetType), [targetType]);
  const previewRows = parsedCsv?.rows.slice(0, 5) ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setParsedCsv(null);
    setTargetType('person');
    setMappings([]);
    setDedupeProperty(null);
    setConfidence('asserted');
    setNote(null);
  }, [isOpen]);

  useEffect(() => {
    if (!parsedCsv) return;
    const nextMappings = autoMapCsvColumns(parsedCsv.headers, targetType);
    setMappings(nextMappings);
    const preferredDedupe = nextMappings.find((mapping) =>
      ['email', 'phone', 'number', 'domain', 'address', 'accountNumber', 'transactionReference', 'documentNumber', 'registrationNumber'].includes(
        mapping.propertyKey ?? ''
      )
    );
    setDedupeProperty(preferredDedupe?.propertyKey ?? null);
  }, [parsedCsv, targetType]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isImporting) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImporting, isOpen, onClose]);

  if (!isOpen) return null;

  const mappedPropertyIds = new Set(mappings.map((mapping) => mapping.propertyKey).filter(Boolean));

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setParsedCsv(null);
    setNote(null);
    if (!nextFile) return;
    try {
      const text = await nextFile.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim()
      });
      const headers = result.meta.fields?.filter(Boolean) ?? [];
      const rows = (result.data ?? [])
        .map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? value : value == null ? '' : String(value)])
          )
        )
        .filter((row) => Object.values(row).some((value) => value.trim().length > 0));
      if (headers.length === 0 || rows.length === 0) {
        setNote('The selected CSV did not contain any importable rows.');
        return;
      }
      setParsedCsv({ headers, rows });
      setNote(`${rows.length} rows ready to import from ${nextFile.name}.`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Could not parse the selected CSV.');
    }
  };

  const handleImport = async () => {
    if (!file || !parsedCsv || !nodeType) return;
    const usedMappings = mappings.filter((mapping) => mapping.propertyKey);
    if (usedMappings.length === 0) {
      setNote('Map at least one CSV column to a node field before importing.');
      return;
    }

    setIsImporting(true);
    setNote('Uploading the CSV into the case and importing rows…');
    try {
      const buffer = await file.arrayBuffer();
      const importSource = await piBridge.uploadMedia({
        data: buffer,
        name: file.name,
        mime: file.type || 'text/csv',
        folderPath: 'Imports',
        title: `Imported CSV: ${file.name}`,
        kind: 'document'
      });

      const workingGraph: GraphSnapshot = {
        nodes: graph.nodes.map((node) => ({ ...node, properties: { ...(node.properties || {}) } })),
        edges: graph.edges
      };
      const seenAssertions = buildExistingAssertionDeduplicationSet(assertions);
      let createdCount = 0;
      let updatedCount = 0;
      let factCount = 0;

      for (const [rowIndex, row] of parsedCsv.rows.entries()) {
        const properties = buildImportedProperties(row, usedMappings, targetType);
        if (Object.keys(properties).length === 0) continue;

        const label = inferImportedLabel(targetType, properties, rowIndex);
        const dedupeValue = dedupeProperty ? properties[dedupeProperty] : null;
        const existingId = findMatchingEntityId(workingGraph, targetType, dedupeProperty, dedupeValue);
        let entityId = existingId;

        if (entityId) {
          const node = workingGraph.nodes.find((candidate) => candidate.id === entityId);
          const mergedProperties = { ...(node?.properties || {}), ...properties };
          await piBridge.updateEntity(entityId, { label: inferImportedLabel(targetType, mergedProperties, rowIndex), properties: mergedProperties });
          if (node) {
            node.properties = mergedProperties;
            node.label = inferImportedLabel(targetType, mergedProperties, rowIndex);
          }
          updatedCount += 1;
        } else {
          entityId = await piBridge.createEntity({
            type: targetType,
            label,
            properties
          });
          workingGraph.nodes.push({
            id: entityId,
            type: targetType,
            label,
            properties,
            created_at: Date.now(),
            updated_at: Date.now(),
            pos_x: null,
            pos_y: null
          });
          createdCount += 1;
        }

        const importableAssertions = collectImportableAssertionPaths(targetType, properties);
        for (const assertionEntry of importableAssertions) {
          const assertionValue = { value: assertionEntry.value };
          const dedupeKey = buildAssertionDeduplicationKey(entityId, assertionEntry.assertionPath, importSource.id, assertionValue);
          if (seenAssertions.has(dedupeKey)) continue;
          await piBridge.createAssertion({
            subject_kind: 'entity',
            subject_id: entityId,
            path: assertionEntry.assertionPath,
            value: assertionValue,
            source_id: importSource.id,
            confidence
          });
          seenAssertions.add(dedupeKey);
          factCount += 1;
        }
      }

      await onImported();
      emitToast({
        tone: 'success',
        title: 'CSV imported',
        description: `${createdCount} new nodes, ${updatedCount} updated nodes, ${factCount} facts added.`
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CSV import failed.';
      setNote(message);
      emitToast({
        tone: 'error',
        title: 'Import failed',
        description: message
      });
    } finally {
      setIsImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-center justify-center px-4 py-8 backdrop-blur-sm" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel className="w-full max-w-6xl rounded-[30px] p-6" elevated>
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Structured import</div>
            <h2 className="mt-3 font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Bring CSV evidence into this case</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              Upload the original CSV into the case, map its columns onto a node type, and create source-backed facts from the mapped fields.
            </p>
          </div>
          <ThemedButton type="button" onClick={onClose} disabled={isImporting}>Close</ThemedButton>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <ThemedSection className="rounded-3xl">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>1. Source file</div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFilePick} />
              <ThemedButton type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3">
                {file ? `Change CSV (${file.name})` : 'Choose CSV file'}
              </ThemedButton>
              <p className="mt-3 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                The selected CSV will be copied into the case media library under <span className="font-mono" style={{ color: 'var(--text-primary)' }}>Imports</span> and used as the supporting source for created facts.
              </p>
            </ThemedSection>

            <ThemedSection className="rounded-3xl">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>2. Import target</div>
              <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Node type</label>
              <ThemedSelect className="w-full rounded-2xl px-4 py-3" value={targetType} onChange={(event) => setTargetType(event.target.value as EntityType)}>
                {nodeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </ThemedSelect>

              <label className="mb-2 mt-4 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Match existing by field</label>
              <ThemedSelect
                className="w-full rounded-2xl px-4 py-3"
                value={dedupeProperty ?? ''}
                onChange={(event) => setDedupeProperty(event.target.value || null)}
              >
                <option value="">Always create new nodes</option>
                {nodeType?.properties
                  .filter((property) => mappedPropertyIds.has(property.id))
                  .map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.label}
                    </option>
                  ))}
              </ThemedSelect>

              <label className="mb-2 mt-4 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Fact confidence</label>
              <ThemedSelect className="w-full rounded-2xl px-4 py-3" value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)}>
                <option value="asserted">Asserted</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </ThemedSelect>
            </ThemedSection>

            {note ? (
              <ThemedCard className="px-4 py-3 text-sm">{note}</ThemedCard>
            ) : null}
          </div>

          <div className="space-y-4">
            <ThemedSection className="rounded-3xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>3. Column mapping</div>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Map CSV headers onto <span style={{ color: 'var(--text-primary)' }}>{nodeType?.label ?? targetType}</span> fields. Mapped fields with assertion support will create source-backed facts automatically.
                  </p>
                </div>
                {parsedCsv ? <div className="text-xs" style={{ color: 'var(--text-soft)' }}>{parsedCsv.rows.length} rows</div> : null}
              </div>

              {parsedCsv ? (
                <div className="max-h-[420px] overflow-y-auto rounded-2xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                  <table className="min-w-full text-sm">
                    <thead style={{ background: 'var(--surface-elevated)' }}>
                      <tr className="text-left text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>
                        <th className="px-4 py-3">CSV column</th>
                        <th className="px-4 py-3">Maps to</th>
                        <th className="px-4 py-3">Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((mapping) => (
                        <tr key={mapping.column} className="align-top" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{mapping.column}</td>
                          <td className="px-4 py-3">
                            <ThemedSelect
                              className="w-full"
                              value={mapping.propertyKey ?? ''}
                              onChange={(event) =>
                                setMappings((current) =>
                                  current.map((entry) =>
                                    entry.column === mapping.column
                                      ? { ...entry, propertyKey: event.target.value || null }
                                      : entry
                                  )
                                )
                              }
                            >
                              <option value="">Ignore this column</option>
                              {nodeType?.properties.map((property) => (
                                <option key={property.id} value={property.id}>
                                  {property.label}
                                </option>
                              ))}
                            </ThemedSelect>
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                            {previewRows.slice(0, 2).map((row, index) => (
                              <div key={`${mapping.column}-${index}`} className="truncate">
                                {row[mapping.column] || <span style={{ color: 'var(--text-soft)' }}>Empty</span>}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <ThemedCard className="border-dashed px-4 py-10 text-center text-sm" style={{ color: 'var(--text-soft)' }}>
                  Choose a CSV file to generate a mapping preview.
                </ThemedCard>
              )}
            </ThemedSection>

            {parsedCsv ? (
              <ThemedSection className="rounded-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>Preview</div>
                <div className="mt-3 overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                  <table className="min-w-full text-sm">
                    <thead style={{ background: 'var(--surface-elevated)' }}>
                      <tr className="text-left text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-soft)' }}>
                        {parsedCsv.headers.map((header) => (
                          <th key={header} className="px-4 py-3">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          {parsedCsv.headers.map((header) => (
                            <td key={`${rowIndex}-${header}`} className="max-w-[220px] truncate px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                              {row[header] || <span style={{ color: 'var(--text-soft)' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ThemedSection>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <ThemedButton type="button" onClick={onClose} disabled={isImporting}>Cancel</ThemedButton>
          <ThemedButton type="button" variant="accent" onClick={() => void handleImport()} disabled={!parsedCsv || isImporting}>
            {isImporting ? 'Importing…' : 'Import into case'}
          </ThemedButton>
        </div>
      </ThemedPanel>
    </div>,
    document.body
  );
}
