import { type FormEvent, useState } from 'react';
import { InfoTip } from '../InfoTip';
import type { Confidence, EntityRecord, SourceRecord } from '@shared/types';
import { formatConfidenceLabel } from '../../lib/confidence';
import { ThemedButton, ThemedCard, ThemedInput, ThemedTextarea } from '@renderer/features/personalization/primitives';

interface Props {
  entityId: EntityRecord['id'];
  onAssertionCreated: () => void;
  onOpenMediaLibrary: (onSelect: (source: SourceRecord) => void) => void;
}

const CONFIDENCE_LEVELS: Confidence[] = ['verified', 'asserted', 'unverified'];

export function AddAssertionForm({ entityId, onAssertionCreated, onOpenMediaLibrary }: Props) {
  const [path, setPath] = useState('');
  const [valueInput, setValueInput] = useState('{}');
  const [simpleMode, setSimpleMode] = useState(true);
  const [kvRows, setKvRows] = useState<Array<{ key: string; type: 'string' | 'number' | 'boolean' | 'date'; value: string }>>([
    { key: '', type: 'string', value: '' }
  ]);
  const [confidence, setConfidence] = useState<Confidence>('asserted');
  const [sourceKind, setSourceKind] = useState('document');
  const [sourceLocator, setSourceLocator] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceMime, setSourceMime] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simpleHasContent = kvRows.some(r => r.key.trim().length > 0);
  const canSubmit =
    path.trim().length > 0 &&
    sourceLocator.trim().length > 0 &&
    ((simpleMode && simpleHasContent) || (!simpleMode && valueInput.trim().length > 0)) &&
    !isSubmitting;

  const resetSourceFields = () => {
    setSourceLocator('');
    setSourceTitle('');
    setSourceKind('document');
    setSourceMime(null);
    setSelectedSource(null);
    setError(null);
  };

  const handleSelectFromLibrary = () => {
    onOpenMediaLibrary((source) => {
      setSelectedSource(source);
      setSourceKind(source.kind || 'document');
      setSourceLocator(source.locator);
      setSourceTitle(source.title ?? '');
      setSourceMime(source.mime ?? null);
      setError(null);
    });
  };

  const handleClearSelection = () => {
    resetSourceFields();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);

    let parsedValue: Record<string, unknown> = {};
    if (simpleMode) {
      for (const row of kvRows) {
        const k = row.key.trim();
        if (!k) continue;
        let v: unknown = row.value;
        if (row.type === 'number') v = Number(row.value);
        if (row.type === 'boolean') v = row.value === 'true';
        if (row.type === 'date') v = row.value; // store as ISO date string
        parsedValue[k] = v;
      }
      if (Object.keys(parsedValue).length === 0) {
        setError('Please add at least one key/value');
        return;
      }
    } else {
      try {
        const candidate = JSON.parse(valueInput);
        if (typeof candidate !== 'object' || candidate === null) {
          throw new Error('Value must be a JSON object');
        }
        parsedValue = candidate as Record<string, unknown>;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Value must be valid JSON');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const sourceId = selectedSource
        ? selectedSource.id
        : await window.piBridge.createSource({
            kind: sourceKind,
            locator: sourceLocator,
            title: sourceTitle || undefined,
            hash: null,
            mime: sourceMime
          });

      await window.piBridge.createAssertion({
        subject_kind: 'entity',
        subject_id: entityId,
        path,
        value: parsedValue,
        source_id: sourceId,
        confidence
      });

      await window.piBridge.recordAudit({
        action: 'create_assertion',
        subject_kind: 'entity',
        subject_id: entityId,
        actor: 'user',
        reason: `Assertion added on ${path}`,
        transform_run_id: null
      });

      setPath('');
      setValueInput('{}');
      setKvRows([{ key: '', type: 'string', value: '' }]);
      resetSourceFields();
      setConfidence('asserted');

      onAssertionCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assertion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 rounded-2xl border p-4"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}
      aria-label="Add assertion"
    >
      <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Add Fact</h4>
      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        Every assertion must reference a source. Use the Simple editor or switch to JSON for advanced input.
      </p>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Path</label>
        <InfoTip text={'Where this assertion lives on the entity.\nExamples:\n- profile.note\n- contact.email\n- risk.flags'} />
        <ThemedInput
          className="mt-1 w-full rounded-md"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="relationship.note"
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Value</label>
          <InfoTip text={'Provide the assertion data.\nUse Simple for key/value input or JSON for full objects.'} />
          <ThemedButton type="button" variant="quiet" className="text-xs px-2 py-1" onClick={() => setSimpleMode(m => !m)} aria-pressed={simpleMode}>
            {simpleMode ? 'Switch to JSON' : 'Switch to Simple'}
          </ThemedButton>
        </div>
        {simpleMode ? (
          <div className="space-y-2">
            {kvRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <ThemedInput
                  className="w-1/3 rounded-md px-2 py-2"
                  placeholder="key"
                  value={row.key}
                  onChange={e => {
                    const v = e.target.value;
                    setKvRows(prev => prev.map((r, i) => i === idx ? { ...r, key: v } : r));
                  }}
                />
                <select
                  className="w-28 rounded-md border px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/25"
                  style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                  value={row.type}
                  onChange={e => {
                    const v = e.target.value as typeof row.type;
                    setKvRows(prev => prev.map((r, i) => i === idx ? { ...r, type: v } : r));
                  }}
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="date">date</option>
                </select>
                <ThemedInput
                  className="flex-1 rounded-md px-2 py-2"
                  placeholder={row.type === 'date' ? 'YYYY-MM-DD' : 'value'}
                  value={row.value}
                  onChange={e => {
                    const v = e.target.value;
                    setKvRows(prev => prev.map((r, i) => i === idx ? { ...r, value: v } : r));
                  }}
                />
                <ThemedButton type="button" variant="danger" className="px-2 py-2 text-xs" onClick={() => setKvRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)} title="Remove">
                  Remove
                </ThemedButton>
              </div>
            ))}
            <div>
              <ThemedButton type="button" variant="quiet" className="px-3 py-1 text-xs" onClick={() => setKvRows(prev => [...prev, { key: '', type: 'string', value: '' }])}>
                Add field
              </ThemedButton>
            </div>
          </div>
        ) : (
          <ThemedTextarea
            className="mt-1 w-full rounded-md px-3 py-2"
            rows={6}
            value={valueInput}
            onChange={(event) => setValueInput(event.target.value)}
            placeholder='{ "note": "Flagged as important" }'
            required={!simpleMode}
          />
        )}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Confidence</label>
        <InfoTip text={'How certain is this assertion?\nVerified: strong evidence\nAsserted: stated but not verified\nUnverified: low certainty'} />
        <div className="mt-2 flex flex-wrap gap-2">
          {CONFIDENCE_LEVELS.map((level) => (
            <ThemedButton
              key={level}
              type="button"
              variant={confidence === level ? 'accent' : 'quiet'}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              onClick={() => setConfidence(level)}
            >
              {formatConfidenceLabel(level)}
            </ThemedButton>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Source</h5>
        <InfoTip text={'Every assertion must cite a source.\nPick existing media or enter a kind+locator (URL/path).'} />
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>Media</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ThemedButton type="button" variant="quiet" onClick={handleSelectFromLibrary} className="px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Browse media gallery
              </ThemedButton>
              {selectedSource && (
                <ThemedButton type="button" variant="quiet" onClick={handleClearSelection} className="px-3 py-1 text-xs">
                  Clear selection
                </ThemedButton>
              )}
            </div>
            {selectedSource ? (
              <ThemedCard className="mt-2 rounded-xl p-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
                  Using existing media: {selectedSource.title ?? selectedSource.locator}
                </p>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                  {selectedSource.kind} • {selectedSource.mime ?? 'Unknown mime'}
                </p>
              </ThemedCard>
            ) : (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                Select an attachment from the gallery or provide locator details manually below.
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>Kind</label>
            <ThemedInput
              className="mt-1 w-full rounded-md"
              value={sourceKind}
              onChange={(event) => setSourceKind(event.target.value)}
              readOnly={Boolean(selectedSource)}
              placeholder="document"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>Locator</label>
            <ThemedInput
              className="mt-1 w-full rounded-md"
              value={sourceLocator}
              onChange={(event) => setSourceLocator(event.target.value)}
              placeholder="/path/to/evidence.pdf"
              readOnly={Boolean(selectedSource)}
              required
            />
            {selectedSource && (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>Locator locked to existing media path.</p>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>Title</label>
            <ThemedInput
              className="mt-1 w-full rounded-md"
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="Evidence summary"
              readOnly={Boolean(selectedSource)}
            />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <ThemedButton type="submit" variant="accent" className="w-full text-sm font-semibold" disabled={!canSubmit}>
        {isSubmitting ? 'Saving…' : 'Add assertion'}
      </ThemedButton>
    </form>
  );
}
