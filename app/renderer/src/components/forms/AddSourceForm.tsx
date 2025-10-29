import { type FormEvent, useState } from 'react';
import type { Confidence, EntityRecord } from '@shared/types';
import { formatConfidenceLabel } from '../../lib/confidence';

interface Props {
  entityId: EntityRecord['id'];
  onSourceCreated: () => void;
}

const CONFIDENCE_LEVELS: Confidence[] = ['verified', 'asserted', 'unverified'];

export function AddSourceForm({ entityId, onSourceCreated }: Props) {
  const [kind, setKind] = useState('document');
  const [locator, setLocator] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('asserted');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = kind.trim().length > 0 && locator.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const sourceId = await window.piBridge.createSource({
        kind,
        locator,
        title: title.trim() ? title.trim() : undefined
      });

      await window.piBridge.createAssertion({
        subject_kind: 'entity',
        subject_id: entityId,
        path: 'source.reference',
        value: note.trim() ? { note: note.trim() } : {},
        source_id: sourceId,
        confidence
      });

      await window.piBridge.recordAudit({
        action: 'link_source',
        subject_kind: 'entity',
        subject_id: entityId,
        actor: 'user',
        reason: `Source linked (${title.trim() || locator.trim()})`,
        transform_run_id: null
      });

      setKind('document');
      setLocator('');
      setTitle('');
      setNote('');
      setConfidence('asserted');

      onSourceCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Add source">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kind</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          placeholder="document"
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Locator</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={locator}
          onChange={(event) => setLocator(event.target.value)}
          placeholder="/path/to/file.pdf"
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Title</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Leaked memo"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Investigator note</label>
        <textarea
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Brief context for why this source matters"
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        className="w-full rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit}
      >
        {isSubmitting ? 'Saving…' : 'Attach source'}
      </button>
    </form>
  );
}
