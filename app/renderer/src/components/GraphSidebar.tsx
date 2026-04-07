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
    <aside
      className="h-full w-80 min-w-[240px] max-w-[320px] flex-shrink-0 backdrop-blur-xl"
      style={{
        background: 'var(--surface-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-float)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="px-4 pt-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="mb-3 px-1">
            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>
              Workspace palette
            </p>
            <h2 className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {profileDefinition.sidebarTitle}
            </h2>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl p-1"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-base)'
            }}
          >
            <button
              className="flex-1 rounded-xl px-3 py-2 text-sm transition-colors"
              style={
                sidebarTab === 'nodes'
                  ? {
                      background: 'var(--surface-raised)',
                      color: 'var(--text-primary)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                    }
                  : { color: 'var(--text-muted)' }
              }
              onClick={() => onSidebarTabChange('nodes')}
            >
              Nodes
            </button>
            {localAIEnabled && (
              <button
                className="flex-1 rounded-xl px-3 py-2 text-sm transition-colors"
                style={
                  sidebarTab === 'ai'
                    ? {
                        background: 'var(--surface-raised)',
                        color: 'var(--text-primary)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                      }
                    : { color: 'var(--text-muted)' }
                }
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
            <Suspense fallback={<div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading AI insights…</div>}>
              <LocalAIInsights enabled={localAIEnabled} graph={graph} nodeTypes={nodeTypes} />
            </Suspense>
          )}
        </div>
      </div>
    </aside>
  );
}
