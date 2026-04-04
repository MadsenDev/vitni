import React from 'react';
import type { SourceRecord } from '@shared/types';
import { piBridge } from '@renderer/services/piBridge';
import { emitToast } from '@renderer/lib/toast';

interface Props {
  sources: SourceRecord[];
  highlightedSourceId?: string | null;
}

function SourceListItem({ source, highlighted = false }: { source: SourceRecord; highlighted?: boolean }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [title, setTitle] = React.useState(source.title ?? '');
  const [locator, setLocator] = React.useState(source.locator);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  React.useEffect(() => {
    setTitle(source.title ?? '');
    setLocator(source.locator);
  }, [source.id, source.locator, source.title]);

  const handleSave = async () => {
    if (!locator.trim()) {
      emitToast({
        tone: 'warning',
        title: 'Source locator required',
        description: 'A source needs a URL or attachment path before it can be saved.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const ok = await piBridge.updateSource(source.id, {
        title: title.trim().length > 0 ? title.trim() : null,
        locator: locator.trim()
      });

      if (!ok) {
        throw new Error('Source update was not applied.');
      }

      setIsEditing(false);
      emitToast({ tone: 'success', title: 'Source updated' });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Source update failed',
        description: error instanceof Error ? error.message : 'Unexpected renderer error.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsRemoving(true);
    try {
      const ok = await piBridge.deleteSource(source.id);
      if (!ok) {
        throw new Error('Source delete was not applied.');
      }

      emitToast({ tone: 'success', title: 'Source deleted' });
      window.dispatchEvent(new CustomEvent('pi:refresh'));
    } catch (error) {
      emitToast({
        tone: 'error',
        title: 'Source delete failed',
        description: error instanceof Error ? error.message : 'Unexpected renderer error.'
      });
    } finally {
      setIsRemoving(false);
      setIsDeleting(false);
    }
  };

  return (
    <li
      data-source-item-id={source.id}
      className={`rounded-2xl border bg-slate-900/55 p-3 ${
        highlighted
          ? 'border-sky-500/60 ring-2 ring-sky-500/40 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]'
          : 'border-slate-800/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-label="Title"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Optional source title"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Locator</label>
                <input
                  value={locator}
                  onChange={(event) => setLocator(event.target.value)}
                  aria-label="Locator"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="URL or attachment path"
                />
              </div>
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-semibold text-slate-100">{source.title ?? source.locator}</p>
              <p className="mt-1 text-xs text-slate-400">Kind: {source.kind}</p>
              <p className="text-xs text-slate-500">Added: {new Date(source.added_at * 1000).toLocaleString()}</p>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl bg-sky-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle(source.title ?? '');
                  setLocator(source.locator);
                  setIsEditing(false);
                }}
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                title="Edit source"
                onClick={() => {
                  setTitle(source.title ?? '');
                  setLocator(source.locator);
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
              {!isDeleting ? (
                <button
                  type="button"
                  className="rounded-xl border border-red-800/40 bg-red-900/20 px-2.5 py-1 text-[11px] text-red-300 transition-colors hover:bg-red-900/40"
                  title="Delete source"
                  onClick={() => setIsDeleting(true)}
                >
                  Delete
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="rounded-xl border border-red-700/50 bg-red-800/40 px-2.5 py-1 text-[11px] font-medium text-red-100 transition-colors hover:bg-red-700/60 disabled:cursor-not-allowed"
                    onClick={handleDelete}
                    disabled={isRemoving}
                  >
                    {isRemoving ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800"
                    onClick={() => setIsDeleting(false)}
                  >
                    Keep
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {source.hash ? (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
          <p className="text-xs font-medium text-slate-200">Stored attachment</p>
          <div className="mt-1 flex items-start gap-2">
            <span className="text-[11px] text-slate-400">Hash:</span>
            <code className="break-all overflow-hidden text-[11px] text-slate-300">{source.hash}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText?.(String(source.hash))}
              className="ml-auto rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
              title="Copy hash"
            >
              Copy
            </button>
          </div>
          <p className="text-[11px] text-slate-500">MIME: {source.mime ?? 'unknown'}</p>
          <p className="truncate text-[11px] text-slate-500" title={source.locator}>
            Locator: {source.locator}
          </p>
        </div>
      ) : (
        <p className="mt-3 truncate text-[11px] text-slate-500" title={source.locator}>
          Locator: {source.locator}
        </p>
      )}
    </li>
  );
}

export function SourcesList({ sources, highlightedSourceId = null }: Props) {
  if (sources.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">No sources attached.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {sources.map((source) => (
        <SourceListItem
          key={source.id}
          source={source}
          highlighted={highlightedSourceId === source.id}
        />
      ))}
    </ul>
  );
}
