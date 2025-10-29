import { useMemo } from 'react';
import { analyzeInvestigation, type LocalAIAnalysisResult } from '../lib/localAI';
import type { GraphSnapshot } from '../types/graph';
import type { NodeType } from '../lib/nodeTypes';

interface LocalAIInsightsProps {
  enabled: boolean;
  graph: GraphSnapshot;
  nodeTypes: NodeType[];
}

function formatMissingProperties(missing: string[] | undefined): string | null {
  if (!missing || missing.length === 0) return null;
  if (missing.length === 1) {
    return missing[0];
  }
  const last = missing[missing.length - 1];
  return `${missing.slice(0, -1).join(', ')} and ${last}`;
}

function renderLeadGroup(result: LocalAIAnalysisResult['leads'][number]) {
  if (result.nodes.length === 0) {
    return null;
  }
  return (
    <div key={result.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <header className="mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{result.title}</h4>
        <p className="text-xs text-slate-500">{result.description}</p>
      </header>
      <ul className="space-y-2">
        {result.nodes.map(node => {
          const missingSummary = formatMissingProperties(node.missingProperties);
          return (
            <li key={node.id} className="rounded-md bg-slate-950/40 px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-100">{node.label}</span>
                <span className="text-[11px] text-slate-500">{node.type}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {missingSummary ? (
                    <span>Missing {missingSummary}</span>
                  ) : (
                    <span>{node.connectionCount} connection{node.connectionCount === 1 ? '' : 's'}</span>
                  )}
                </span>
                {node.connectionCount > 0 && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {node.connectionCount} link{node.connectionCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function renderDuplicateGroup(group: LocalAIAnalysisResult['duplicates'][number]) {
  return (
    <li key={group.id} className="rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs">
      <header className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-amber-200">{group.reason}</span>
        <span className="rounded bg-amber-800/40 px-1.5 py-0.5 text-[10px] text-amber-200">{group.nodes.length} matches</span>
      </header>
      <ul className="space-y-1 text-[11px] text-amber-100">
        {group.nodes.map(node => (
          <li key={node.id} className="flex items-center justify-between">
            <span>{node.label}</span>
            <span className="text-amber-300/80">{node.type}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function LocalAIInsights({ enabled, graph, nodeTypes }: LocalAIInsightsProps) {
  const analysis = useMemo(() => {
    if (!enabled) return null;
    return analyzeInvestigation(graph, nodeTypes);
  }, [enabled, graph, nodeTypes]);

  if (!enabled) return null;

  if (!analysis) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-left">
        <h3 className="text-sm font-semibold text-slate-100">Local AI Insights</h3>
        <p className="mt-2 text-xs text-slate-400">Preparing insights…</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-left space-y-4">
      <header>
        <h3 className="text-sm font-semibold text-slate-100">Local AI Insights</h3>
        <p className="text-[11px] text-slate-500">Updated just now</p>
      </header>

      <p className="text-xs leading-relaxed text-slate-300">{analysis.summary}</p>

      {analysis.leads.length > 0 ? (
        <div className="space-y-3">
          {analysis.leads.map(renderLeadGroup)}
        </div>
      ) : (
        <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
          All leads look organized. Add more data to surface suggestions.
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duplicate watch</h4>
        {analysis.duplicates.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {analysis.duplicates.map(renderDuplicateGroup)}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No obvious duplicates detected.</p>
        )}
      </div>
    </section>
  );
}
