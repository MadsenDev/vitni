import { useMemo } from 'react';

interface LocalAIStatusProps {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}

const duties = [
  {
    title: 'Summarize findings',
    detail: 'Condense source material into concise briefs you can review quickly.'
  },
  {
    title: 'Organize leads',
    detail: 'Group related entities and keep potential follow-up actions together.'
  },
  {
    title: 'Highlight duplicates',
    detail: 'Surface overlapping evidence so you can reconcile conflicting claims.'
  }
];

export function LocalAIStatus({ enabled, loading, onToggle }: LocalAIStatusProps) {
  const statusCopy = useMemo(() => {
    if (loading) return 'Checking local AI status…';
    return enabled
      ? 'Local AI is active for this project and will quietly assist with investigation hygiene.'
      : 'Local AI is currently paused. Enable it to let the assistant help without leaving your device.';
  }, [enabled, loading]);

  const toggleLabel = useMemo(() => {
    if (loading) return 'Working…';
    return enabled ? 'Disable' : 'Enable';
  }, [enabled, loading]);

  const toggleStyles = useMemo(() => {
    const base =
      'rounded-md px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';
    if (enabled) {
      return `${base} bg-emerald-500 text-emerald-950 hover:bg-emerald-400 focus:ring-emerald-500`;
    }
    return `${base} bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-slate-600`;
  }, [enabled]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-left">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Local AI Assistant</h2>
          <p className="text-xs text-slate-500">Runs entirely on-device for this project.</p>
        </div>
        <button
          type="button"
          className={`${toggleStyles} ${loading ? 'cursor-wait opacity-70' : ''}`}
          onClick={() => {
            if (!loading) onToggle();
          }}
          disabled={loading}
          aria-pressed={enabled}
        >
          {toggleLabel}
        </button>
      </header>

      <p className="mt-3 text-xs text-slate-300 leading-relaxed">{statusCopy}</p>

      <ul className="mt-4 space-y-2 text-xs text-slate-200">
        {duties.map((duty) => (
          <li key={duty.title} className="flex items-start space-x-2">
            <span
              className={`mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full ${
                enabled ? 'bg-sky-400' : 'bg-slate-600'
              }`}
            ></span>
            <div>
              <p className="font-semibold text-slate-100">{duty.title}</p>
              <p className="text-[11px] text-slate-400">{duty.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
