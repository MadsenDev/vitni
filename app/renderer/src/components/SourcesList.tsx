import type { SourceRecord } from '@shared/types';

interface Props {
  sources: SourceRecord[];
}

export function SourcesList({ sources }: Props) {
  if (sources.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">No sources attached.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {sources.map((source) => (
        <li key={source.id} className="rounded border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-sm font-semibold text-slate-100">{source.title ?? source.locator}</p>
          <p className="text-xs text-slate-400">Kind: {source.kind}</p>
          <p className="text-xs text-slate-500">Added: {new Date(source.added_at * 1000).toLocaleString()}</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
              title="Edit source"
              onClick={async () => {
                try {
                  const nextTitle = window.prompt('Title (optional):', source.title ?? '') ?? undefined;
                  const nextLocator = window.prompt('Locator (URL or path):', source.locator) ?? undefined;
                  if (!nextTitle && !nextLocator) return;
                  if (window.piBridge.updateSource) {
                    const ok = await window.piBridge.updateSource(source.id, { title: nextTitle ?? null, locator: nextLocator });
                    if (ok) window.dispatchEvent(new CustomEvent('pi:refresh'));
                  } else {
                    console.warn('updateSource API not available');
                  }
                } catch (e) {
                  console.error('Edit source failed', e);
                }
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded bg-red-900/30 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-900/50"
              title="Delete source"
              onClick={async () => {
                if (!confirm('Delete this source?')) return;
                try {
                  if (window.piBridge.deleteSource) {
                    const ok = await window.piBridge.deleteSource(source.id);
                    if (ok) window.dispatchEvent(new CustomEvent('pi:refresh'));
                  } else {
                    console.warn('deleteSource API not available');
                  }
                } catch (e) {
                  console.error('Delete source failed', e);
                }
              }}
            >
              Delete
            </button>
          </div>
          {source.hash ? (
            <div className="mt-2 rounded border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-xs font-medium text-slate-200">Stored attachment</p>
              <div className="mt-1 flex items-start gap-2">
                <span className="text-[11px] text-slate-400">Hash:</span>
                <code className="text-[11px] text-slate-300 break-all overflow-hidden">{source.hash}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText?.(String(source.hash))}
                  className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                  title="Copy hash"
                >
                  Copy
                </button>
              </div>
              <p className="text-[11px] text-slate-500">MIME: {source.mime ?? 'unknown'}</p>
              <p className="text-[11px] text-slate-500 truncate" title={source.locator}>
                Locator: {source.locator}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500 truncate" title={source.locator}>
              Locator: {source.locator}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
