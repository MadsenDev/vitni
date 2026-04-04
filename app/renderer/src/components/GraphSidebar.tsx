import { Suspense, lazy } from 'react';
import { getInvestigationProfileDefinition, type InvestigationProfile } from '@renderer/features/profiles/investigationProfiles';
import type { IconPackId } from '@renderer/features/personalization/theme';
import { NodePalette } from './NodePalette';
import { nodeTypes, type NodeType } from '@renderer/lib/nodeTypes';
import type { GraphSnapshot } from '@renderer/types/graph';

const LocalAIInsights = lazy(() => import('./LocalAIInsights').then((module) => ({ default: module.LocalAIInsights })));

interface GraphSidebarProps {
  sidebarTab: 'nodes' | 'ai';
  localAIEnabled: boolean;
  investigationProfile: InvestigationProfile;
  iconPack: IconPackId;
  graph: GraphSnapshot;
  onSidebarTabChange: (tab: 'nodes' | 'ai') => void;
  onNodeDragStart: (nodeType: NodeType, event: React.DragEvent) => void;
  onNodeCreate: (nodeType: NodeType) => void;
}

export function GraphSidebar({
  sidebarTab,
  localAIEnabled,
  investigationProfile,
  iconPack,
  graph,
  onSidebarTabChange,
  onNodeDragStart,
  onNodeCreate
}: GraphSidebarProps) {
  const profileDefinition = getInvestigationProfileDefinition(investigationProfile);
  return (
    <aside className="h-full w-80 min-w-[240px] max-w-[320px] flex-shrink-0 bg-[rgba(7,11,23,0.94)] backdrop-blur-xl">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-slate-800/80 px-4 pt-4">
          <div className="mb-3 px-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Workspace palette</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-100">{profileDefinition.sidebarTitle}</h2>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/45 p-1">
            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${sidebarTab === 'nodes' ? 'bg-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-slate-200'}`}
              onClick={() => onSidebarTabChange('nodes')}
            >
              Nodes
            </button>
            {localAIEnabled && (
              <button
                className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors ${sidebarTab === 'ai' ? 'bg-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => onSidebarTabChange('ai')}
              >
                AI
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-5 pb-6 pt-4 pr-3">
          {sidebarTab === 'nodes' && (
            <NodePalette
              investigationProfile={investigationProfile}
              iconPack={iconPack}
              onNodeDragStart={onNodeDragStart}
              onNodeCreate={onNodeCreate}
            />
          )}
          {sidebarTab === 'ai' && localAIEnabled && (
            <Suspense fallback={<div className="text-sm text-slate-500">Loading AI insights…</div>}>
              <LocalAIInsights enabled={localAIEnabled} graph={graph} nodeTypes={nodeTypes} />
            </Suspense>
          )}
        </div>
      </div>
    </aside>
  );
}
