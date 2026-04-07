import { useEffect, useMemo, useState } from 'react';
import { nodeTypes, type NodeType, type NodeCategory } from '../lib/nodeTypes/index';
import {
  getInvestigationProfileDefinition,
  orderNodeCategoriesForProfile,
  orderNodeTypesForProfile,
  type InvestigationProfile
} from '@renderer/features/profiles/investigationProfiles';
import { resolveCategoryIcon, resolveNodeTypeIcon } from '@renderer/features/personalization/iconPacks';
import type { IconPackId } from '@renderer/features/personalization/theme';
import { 
  FaUser, 
  FaBuilding, 
  FaGlobe, 
  FaSearch, 
  FaChevronDown, 
  FaChevronRight,
  FaPlus
} from 'react-icons/fa';

// Define categories
const categories: NodeCategory[] = [
  {
    id: 'people',
    label: 'People',
    description: 'Individuals and human identities',
    icon: FaUser,
    color: 'text-blue-400'
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Companies, agencies, institutions',
    icon: FaBuilding,
    color: 'text-green-400'
  },
  {
    id: 'technology',
    label: 'Digital',
    description: 'Accounts, identifiers, infrastructure, and devices',
    icon: FaGlobe,
    color: 'text-purple-400'
  },
  {
    id: 'evidence',
    label: 'Evidence, Assets & Cases',
    description: 'Records, places, transactions, events, and case objects',
    icon: FaSearch,
    color: 'text-orange-400'
  }
];

interface NodePaletteProps {
  investigationProfile: InvestigationProfile;
  iconPack: IconPackId;
  onNodeDragStart: (nodeType: NodeType, event: React.DragEvent) => void;
  onNodeCreate: (nodeType: NodeType) => void;
}

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function NodePalette({ investigationProfile, iconPack, onNodeDragStart, onNodeCreate }: NodePaletteProps) {
  const orderedCategories = orderNodeCategoriesForProfile(investigationProfile, categories);
  const profileDefinition = getInvestigationProfileDefinition(investigationProfile);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(orderedCategories.slice(0, 2).map((category) => category.id)));

  useEffect(() => {
    setExpandedCategories(new Set(orderedCategories.slice(0, 2).map((category) => category.id)));
  }, [investigationProfile]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleDragStart = (nodeType: NodeType, event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      nodeTypeId: nodeType.id,
      position: { x: event.clientX, y: event.clientY }
    }));
    event.dataTransfer.effectAllowed = 'copy';
    onNodeDragStart(nodeType, event);
  };

  const getNodesByCategory = (categoryId: string) => {
    return orderNodeTypesForProfile(
      investigationProfile,
      nodeTypes.filter(node => node.category === categoryId)
    );
  };

  const featuredNodes = useMemo(
    () =>
      profileDefinition.featuredNodeTypeIds
        .map((nodeTypeId) => nodeTypes.find((nodeType) => nodeType.id === nodeTypeId))
        .filter((nodeType): nodeType is NodeType => Boolean(nodeType)),
    [profileDefinition.featuredNodeTypeIds]
  );

  const normalizedQuery = normalizeSearchValue(searchQuery);
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];

    const categoryLabelById = new Map(categories.map((category) => [category.id, category.label]));
    return orderNodeTypesForProfile(investigationProfile, nodeTypes).filter((nodeType) => {
      const haystack = normalizeSearchValue(
        [
          nodeType.label,
          nodeType.description,
          categoryLabelById.get(nodeType.category) ?? '',
          nodeType.id
        ].join(' ')
      );
      return haystack.includes(normalizedQuery);
    });
  }, [investigationProfile, normalizedQuery]);

  const renderNodeLauncherItem = (nodeType: NodeType, emphasis: 'featured' | 'default' = 'default') => {
    const Icon = resolveNodeTypeIcon(nodeType, iconPack);
    const isFeatured = emphasis === 'featured';
    return (
    <button
      type="button"
      key={nodeType.id}
      draggable
      onDragStart={(event) => handleDragStart(nodeType, event)}
      onClick={() => onNodeCreate(nodeType)}
      className="group flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-2xl border text-left transition-all"
      style={{
        borderColor: isFeatured ? 'var(--border-strong)' : 'transparent',
        background: isFeatured ? 'var(--surface-elevated)' : 'transparent',
        padding: isFeatured ? '0.875rem' : '0.625rem 0.75rem'
      }}
    >
      <div
        className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${nodeType.color} text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px rgba(15, 23, 42, 0.12)' }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{nodeType.label}</p>
            <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--text-muted)' }}>{nodeType.description}</p>
          </div>
          <span
            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border text-[11px] opacity-80 transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface-raised)',
              color: 'var(--text-muted)'
            }}
          >
            <FaPlus className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </button>
    );
  };

  return (
    <div
      className="h-full overflow-x-hidden overflow-y-auto rounded-[28px]"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'linear-gradient(180deg, var(--surface-raised), var(--surface-base))',
        boxShadow: 'var(--shadow-panel)'
      }}
    >
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="space-y-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-soft)' }}>Node launcher</p>
            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Build from the graph outward</h2>
          </div>
          <p className="text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{profileDefinition.sidebarDescription}</p>
        </div>

        <div className="relative mt-4">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--text-soft)' }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Quick-create a node type"
            className="w-full rounded-2xl py-3 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-elevated)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      <div className="space-y-5 overflow-x-hidden px-3 py-4">
        {!normalizedQuery ? (
          <>
            <section className="rounded-[24px] px-3 py-3.5" style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-base)' }}>
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Recommended for this profile</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Click to open the creation form, or drag onto the canvas.</p>
                </div>
              </div>
              <div className="space-y-2 min-w-0">
                {featuredNodes.map((nodeType) => renderNodeLauncherItem(nodeType, 'featured'))}
              </div>
            </section>

            <section className="space-y-3 min-w-0">
              {orderedCategories.map((category) => {
                const nodes = getNodesByCategory(category.id);
                const isExpanded = expandedCategories.has(category.id);
                const CategoryIcon = resolveCategoryIcon(category, iconPack);

                return (
                  <div key={category.id} className="overflow-hidden rounded-[24px]" style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-base)' }}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}>
                          <CategoryIcon className={`h-4 w-4 ${category.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{category.label}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{category.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>{nodes.length} types</span>
                        {isExpanded ? <FaChevronDown className="h-3 w-3" /> : <FaChevronRight className="h-3 w-3" />}
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="animate-enter-rise px-2 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <div className="space-y-1.5 min-w-0">
                          {nodes.map((nodeType) => renderNodeLauncherItem(nodeType))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </>
        ) : (
          <section className="rounded-[24px] px-3 py-3.5" style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-base)' }}>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-soft)' }}>Matching node types</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {searchResults.length > 0 ? `${searchResults.length} results` : 'No node types match that search yet.'}
                </p>
              </div>
            </div>
            {searchResults.length > 0 ? (
              <div className="space-y-1.5 min-w-0">
                {searchResults.map((nodeType) => renderNodeLauncherItem(nodeType))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-5 text-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>
                Try a node name, category, or identifier concept like email, domain, transaction, or account.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
