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
        </li>
      ))}
    </ul>
  );
}
