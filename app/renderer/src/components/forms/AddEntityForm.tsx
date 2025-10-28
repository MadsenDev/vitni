import { type FormEvent, useState } from 'react';
import type { Confidence, EntityType } from '@shared/types';
import { formatConfidenceLabel } from '../../lib/confidence';

interface Props {
  onEntityCreated: (entity: { id: string } | null) => void;
}

const ENTITY_TYPES: EntityType[] = ['person', 'org', 'domain', 'phone', 'email', 'document'];
const CONFIDENCE_LEVELS: Confidence[] = ['verified', 'asserted', 'unverified'];

export function AddEntityForm({ onEntityCreated }: Props) {
  const [entityType, setEntityType] = useState<EntityType>('person');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('asserted');
  const [sourceKind, setSourceKind] = useState('document');
  const [sourceLocator, setSourceLocator] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = label.trim().length > 0 && sourceLocator.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const sourceId = await window.piBridge.createSource({
        kind: sourceKind,
        locator: sourceLocator,
        title: sourceTitle || undefined
      });

      const entityId = await window.piBridge.createEntity({
        type: entityType,
        label,
        properties: { note }
      });

      await window.piBridge.createAssertion({
        subject_kind: 'entity',
        subject_id: entityId,
        path: 'note',
        value: { note },
        source_id: sourceId,
        confidence
      });

      await window.piBridge.recordAudit({
        action: 'create_entity',
        subject_kind: 'entity',
        subject_id: entityId,
        actor: 'user',
        reason: 'Manual entry',
        transform_run_id: null
      });

      setLabel('');
      setNote('');
      setSourceLocator('');
      setSourceTitle('');
      onEntityCreated({ id: entityId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded border border-slate-800 bg-slate-900/60 p-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Entity type</label>
        <select
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={entityType}
          onChange={(event) => setEntityType(event.target.value as EntityType)}
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Label</label>
        <input
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Investigator note</label>
        <textarea
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Summarize relevant details"
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
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source (required)</h4>
        <p className="text-xs text-slate-500">
          You must attach a source for every entity. Provide enough context to revisit the evidence.
        </p>
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
              placeholder="/path/to/file.pdf"
              required
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-slate-500">Title</label>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="Leaked email from..."
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
        {isSubmitting ? 'Saving…' : 'Add entity'}
      </button>
    </form>
  );
}
