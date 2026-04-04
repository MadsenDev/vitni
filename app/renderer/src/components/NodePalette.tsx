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
    return (
    <button
      type="button"
      key={nodeType.id}
      draggable
      onDragStart={(event) => handleDragStart(nodeType, event)}
      onClick={() => onNodeCreate(nodeType)}
      className={`group flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-2xl border text-left transition-all ${
        emphasis === 'featured'
          ? 'border-slate-700/80 bg-slate-950/65 px-3.5 py-3.5 hover:border-sky-500/50 hover:bg-slate-900/80'
          : 'border-transparent bg-transparent px-3 py-2.5 hover:border-slate-800/80 hover:bg-slate-900/55'
      }`}
    >
      <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${nodeType.color} text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{nodeType.label}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{nodeType.description}</p>
          </div>
          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/75 text-[11px] text-slate-300 opacity-80 transition-colors group-hover:border-sky-500/40 group-hover:text-sky-200">
            <FaPlus className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </button>
    );
  };

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.9))] shadow-[0_18px_50px_rgba(2,6,23,0.28)]">
      <div className="border-b border-slate-800/80 px-4 py-4">
        <div className="space-y-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Node launcher</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Build from the graph outward</h2>
          </div>
          <p className="text-sm leading-6 text-slate-400">{profileDefinition.sidebarDescription}</p>
        </div>

        <div className="relative mt-4">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Quick-create a node type"
            className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 py-3 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
          />
        </div>
      </div>

      <div className="space-y-5 overflow-x-hidden px-3 py-4">
        {!normalizedQuery ? (
          <>
            <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/35 px-3 py-3.5">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Recommended for this profile</p>
                  <p className="mt-1 text-xs text-slate-400">Click to open the creation form, or drag onto the canvas.</p>
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
                  <div key={category.id} className="overflow-hidden rounded-[24px] border border-slate-800/80 bg-slate-950/25">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-900/55"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/75">
                          <CategoryIcon className={`h-4 w-4 ${category.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{category.label}</div>
                          <div className="text-xs text-slate-400">{category.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{nodes.length} types</span>
                        {isExpanded ? <FaChevronDown className="h-3 w-3" /> : <FaChevronRight className="h-3 w-3" />}
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="animate-enter-rise border-t border-slate-800/80 px-2 py-2">
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
          <section className="rounded-[24px] border border-slate-800/80 bg-slate-950/30 px-3 py-3.5">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Matching node types</p>
                <p className="mt-1 text-xs text-slate-400">
                  {searchResults.length > 0 ? `${searchResults.length} results` : 'No node types match that search yet.'}
                </p>
              </div>
            </div>
            {searchResults.length > 0 ? (
              <div className="space-y-1.5 min-w-0">
                {searchResults.map((nodeType) => renderNodeLauncherItem(nodeType))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/35 px-4 py-5 text-sm text-slate-500">
                Try a node name, category, or identifier concept like email, domain, transaction, or account.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
