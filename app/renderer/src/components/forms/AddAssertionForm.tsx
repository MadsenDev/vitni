import { type FormEvent, useState } from 'react';
import { InfoTip } from '../InfoTip';
import type { Confidence, EntityRecord, SourceRecord } from '@shared/types';
import { formatConfidenceLabel } from '../../lib/confidence';

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
        (parsedValue as any)[k] = v;
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
      className="mt-6 space-y-4 rounded border border-slate-800 bg-slate-900/60 p-4"
      aria-label="Add assertion"
    >
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Add Assertion</h4>
      <p className="text-xs text-slate-500">
        Every assertion must reference a source. Use the Simple editor or switch to JSON for advanced input.
      </p>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Path</label>
        <InfoTip text={'Where this assertion lives on the entity.\nExamples:\n- profile.note\n- contact.email\n- risk.flags'} />
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="relationship.note"
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Value</label>
          <InfoTip text={'Provide the assertion data.\nUse Simple for key/value input or JSON for full objects.'} />
          <button
            type="button"
            className="text-xs rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-slate-500"
            onClick={() => setSimpleMode(m => !m)}
            aria-pressed={simpleMode}
          >
            {simpleMode ? 'Switch to JSON' : 'Switch to Simple'}
          </button>
        </div>
        {simpleMode ? (
          <div className="space-y-2">
            {kvRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="w-1/3 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                  placeholder="key"
                  value={row.key}
                  onChange={e => {
                    const v = e.target.value;
                    setKvRows(prev => prev.map((r, i) => i === idx ? { ...r, key: v } : r));
                  }}
                />
                <select
                  className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
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
                <input
                  className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                  placeholder={row.type === 'date' ? 'YYYY-MM-DD' : 'value'}
                  value={row.value}
                  onChange={e => {
                    const v = e.target.value;
                    setKvRows(prev => prev.map((r, i) => i === idx ? { ...r, value: v } : r));
                  }}
                />
                <button
                  type="button"
                  className="rounded border border-slate-700 px-2 py-2 text-xs text-red-300 hover:border-red-400"
                  onClick={() => setKvRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}
                  title="Remove"
                >
                  Remove
                </button>
              </div>
            ))}
            <div>
              <button
                type="button"
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
                onClick={() => setKvRows(prev => [...prev, { key: '', type: 'string', value: '' }])}
              >
                Add field
              </button>
            </div>
          </div>
        ) : (
          <textarea
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            rows={6}
            value={valueInput}
            onChange={(event) => setValueInput(event.target.value)}
            placeholder='{ "note": "Flagged as important" }'
            required={!simpleMode}
          />
        )}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confidence</label>
        <InfoTip text={'How certain is this assertion?\nVerified: strong evidence\nAsserted: stated but not verified\nUnverified: low certainty'} />
        <div className="mt-2 flex flex-wrap gap-2">
          {CONFIDENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                confidence === level
                  ? 'bg-slate-200 text-slate-900'
                  : 'border border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
              onClick={() => setConfidence(level)}
            >
              {formatConfidenceLabel(level)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source</h5>
        <InfoTip text={'Every assertion must cite a source.\nPick existing media or enter a kind+locator (URL/path).'} />
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Media</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectFromLibrary}
                className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500"
              >
                Browse media gallery
              </button>
              {selectedSource && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Clear selection
                </button>
              )}
            </div>
            {selectedSource ? (
              <div className="mt-2 rounded border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-400">
                <p className="font-medium text-slate-200">
                  Using existing media: {selectedSource.title ?? selectedSource.locator}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {selectedSource.kind} • {selectedSource.mime ?? 'Unknown mime'}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Select an attachment from the gallery or provide locator details manually below.
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Kind</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={sourceKind}
              onChange={(event) => setSourceKind(event.target.value)}
              readOnly={Boolean(selectedSource)}
              placeholder="document"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Locator</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={sourceLocator}
              onChange={(event) => setSourceLocator(event.target.value)}
              placeholder="/path/to/evidence.pdf"
              readOnly={Boolean(selectedSource)}
              required
            />
            {selectedSource && (
              <p className="mt-1 text-xs text-slate-500">Locator locked to existing media path.</p>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Title</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="Evidence summary"
              readOnly={Boolean(selectedSource)}
            />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        className="w-full rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit}
      >
        {isSubmitting ? 'Saving…' : 'Add assertion'}
      </button>
    </form>
  );
}
