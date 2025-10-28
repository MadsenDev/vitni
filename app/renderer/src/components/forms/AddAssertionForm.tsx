import { type FormEvent, useState } from 'react';
import type { Confidence, EntityRecord } from '@shared/types';
import { formatConfidenceLabel } from '../../lib/confidence';

interface Props {
  entity: EntityRecord;
  onAssertionCreated: () => void;
}

const CONFIDENCE_LEVELS: Confidence[] = ['verified', 'asserted', 'unverified'];

export function AddAssertionForm({ entity, onAssertionCreated }: Props) {
  const [path, setPath] = useState('');
  const [valueInput, setValueInput] = useState('{}');
  const [confidence, setConfidence] = useState<Confidence>('asserted');
  const [sourceKind, setSourceKind] = useState('document');
  const [sourceLocator, setSourceLocator] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    path.trim().length > 0 && sourceLocator.trim().length > 0 && valueInput.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);

    let parsedValue: Record<string, unknown>;
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

    setIsSubmitting(true);

    try {
      const sourceId = await window.piBridge.createSource({
        kind: sourceKind,
        locator: sourceLocator,
        title: sourceTitle || undefined
      });

      await window.piBridge.createAssertion({
        subject_kind: 'entity',
        subject_id: entity.id,
        path,
        value: parsedValue,
        source_id: sourceId,
        confidence
      });

      await window.piBridge.recordAudit({
        action: 'create_assertion',
        subject_kind: 'entity',
        subject_id: entity.id,
        actor: 'user',
        reason: `Assertion added on ${path}`,
        transform_run_id: null
      });

      setPath('');
      setValueInput('{}');
      setSourceLocator('');
      setSourceTitle('');
      setSourceKind('document');
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
        Every assertion must reference a source. Values should be JSON so they can be inspected in the audit trail.
      </p>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Path</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="relationship.note"
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Value (JSON)</label>
        <textarea
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          rows={4}
          value={valueInput}
          onChange={(event) => setValueInput(event.target.value)}
          placeholder='{ "note": "Flagged as important" }'
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confidence</label>
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
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Kind</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={sourceKind}
              onChange={(event) => setSourceKind(event.target.value)}
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
              required
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Title</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="Evidence summary"
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
