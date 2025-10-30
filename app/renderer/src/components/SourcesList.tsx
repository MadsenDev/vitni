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
          {source.hash ? (
            <div className="mt-2 rounded border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-xs font-medium text-slate-200">Stored attachment</p>
              <p className="text-[11px] text-slate-400">Hash: {source.hash}</p>
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
