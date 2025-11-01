import { ConfidenceBadge } from './ConfidenceBadge';
import { SourcesList } from './SourcesList';
import { MediaLibraryModal } from './MediaLibraryModal';
import type { SourceRecord } from '@shared/types';
import type { NodeType } from '../lib/nodeTypes/index';
import { relationshipTypes } from '../lib/relationshipTypes';
import { useAttachmentPreviews } from '../lib/useAttachmentPreviews';
import { fetchWebsiteMetadata } from '../lib/fetchWebsiteMetadata';
import React from 'react';

interface ParsedNode {
  id: string;
  type: string;
  label: string | null;
  properties: Record<string, unknown>;
}

interface ParsedEdge {
  id: string;
  src_id: string;
  dst_id: string;
  type: string;
  properties?: Record<string, unknown>;
}

interface AssertionView {
  id: string;
  path: string;
  value: Record<string, unknown>;
  confidence: 'asserted' | 'unverified' | 'verified';
}

interface InspectorPanelProps {
  nodeTypes: NodeType[];
  graphNodes: ParsedNode[];
  graphEdges: ParsedEdge[];
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  selectedEdgeId: string | null;
  assertions: AssertionView[];
  sources: SourceRecord[];
  onAddAssertion: () => void;
  onAddSource: () => void;
  onDeleteNode: () => void;
  onDeleteNodes?: (ids: string[]) => void;
  onDeleteEdge: () => void;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onUpdateProperty: (nodeId: string, key: string, value: unknown) => void;
  onUpdateEdgeProperty?: (edgeId: string, key: string, value: unknown) => void;
  onAlignLeft?: () => void;
  onAlignTop?: () => void;
}

export function InspectorPanel({
  nodeTypes,
  graphNodes,
  graphEdges,
  selectedNodeId,
  selectedNodeIds,
  selectedEdgeId,
  assertions,
  sources,
  onAddAssertion,
  onAddSource,
  onDeleteNode,
  onDeleteNodes,
  onDeleteEdge,
  onUpdateLabel,
  onUpdateProperty
  , onUpdateEdgeProperty,
  onAlignLeft,
  onAlignTop
}: InspectorPanelProps) {
  const [tab, setTab] = React.useState<'details' | 'evidence'>('details');
  const [imageModalOpen, setImageModalOpen] = React.useState(false);
  const [imagePropertyKey, setImagePropertyKey] = React.useState<string | null>(null);
  const [allSources, setAllSources] = React.useState<SourceRecord[]>([]);
  const [fetchingMetadata, setFetchingMetadata] = React.useState(false);
  const selectedNode = selectedNodeId ? graphNodes.find(n => n.id === selectedNodeId) ?? null : null;
  const multiSelected = (selectedNodeIds ?? []).filter(id => graphNodes.some(n => n.id === id));
  
  // Load all sources for image previews (including ones referenced in properties)
  React.useEffect(() => {
    const loadAllSources = async () => {
      try {
        const all = await window.piBridge.listAllSourcesWithUsage();
        setAllSources(all);
      } catch (error) {
        console.error('Failed to load all sources for image previews:', error);
      }
    };
    loadAllSources();
  }, [selectedNodeId]);
  
  // Get sources that are referenced in node properties (for previews)
  const imageSourceIds = React.useMemo(() => {
    if (!selectedNode) return [];
    const imageProps = Object.entries(selectedNode.properties || {})
      .filter(([_, value]) => value && typeof value === 'string' && value.length > 0)
      .map(([_, value]) => String(value));
    return imageProps;
  }, [selectedNode]);
  
  const imageSources = React.useMemo(() => {
    return allSources.filter(s => imageSourceIds.includes(s.id));
  }, [allSources, imageSourceIds]);
  
  // Get all sources for previews (sources from evidence + image sources)
  const allSourcesForPreviews = React.useMemo(() => {
    const sourceIds = new Set<string>();
    sources.forEach(s => sourceIds.add(s.id));
    imageSources.forEach(s => sourceIds.add(s.id));
    return allSources.filter(s => sourceIds.has(s.id));
  }, [sources, imageSources, allSources]);
  
  const { previews } = useAttachmentPreviews(allSourcesForPreviews);
  const previewMap = React.useMemo(() => {
    const map = new Map<string, { url: string; mimeType: string; fileName: string }>();
    previews.forEach((preview) => {
      map.set(preview.source.id, {
        url: preview.url,
        mimeType: preview.mimeType,
        fileName: preview.fileName
      });
    });
    return map;
  }, [previews]);

  return (
    <aside className="w-96 min-w-[280px] max-w-[400px] flex-shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-950/70">
      <div className="flex items-center gap-2 border-b border-slate-800 px-6 pt-4">
        <button
          className={`rounded-t px-3 py-2 text-sm ${tab === 'details' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          className={`rounded-t px-3 py-2 text-sm ${tab === 'evidence' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          onClick={() => setTab('evidence')}
        >
          Evidence
        </button>
      </div>
      <div className="p-6 pr-4">
      {multiSelected.length > 1 ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Multiple selected</h3>
            <div className="text-sm text-slate-400">{multiSelected.length} items</div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-slate-300">
            <div>
              <div className="text-slate-400">Types</div>
              <ul className="mt-1 list-disc pl-5">
                {Array.from(new Map(multiSelected.map(id => {
                  const n = graphNodes.find(nn => nn.id === id);
                  return [n?.type || 'unknown', (n?.type || 'unknown')];
                })).values()).map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-slate-400">First items</div>
              <ul className="mt-1 space-y-1">
                {multiSelected.slice(0, 5).map(id => {
                  const n = graphNodes.find(nn => nn.id === id);
                  return <li key={id} className="truncate">{n?.label || id}</li>;
                })}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              onClick={() => onAlignLeft && onAlignLeft()}
            >
              Align left
            </button>
            <button
              className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              onClick={() => onAlignTop && onAlignTop()}
            >
              Align top
            </button>
            <button
              className="rounded bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50"
              onClick={() => onDeleteNodes && onDeleteNodes(multiSelected)}
            >
              Delete selected
            </button>
          </div>
        </div>
      ) : selectedNode ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Node Inspector</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Selected</span>
              <button
                onClick={onDeleteNode}
                className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
                title="Delete node (or press Delete key)"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-8 h-8 rounded-full ${nodeTypes.find(nt => nt.id === selectedNode.type)?.color || 'bg-slate-600'} flex items-center justify-center text-white text-sm`}>
                {(() => {
                  const nodeType = nodeTypes.find(nt => nt.id === selectedNode.type);
                  return nodeType?.icon ? <nodeType.icon className="w-4 h-4" /> : '?';
                })()}
              </div>
              <div>
                <div className="text-sm text-slate-400">Type: {selectedNode.type}</div>
                <input
                  type="text"
                  value={selectedNode.label || ''}
                  onChange={(e) => onUpdateLabel(selectedNode.id, e.target.value)}
                  className="text-lg font-semibold bg-transparent border-none text-white focus:outline-none focus:bg-slate-800 focus:px-2 focus:py-1 focus:rounded"
                  placeholder="Untitled Entity"
                />
              </div>
            </div>
          </div>

          {tab === 'details' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Properties</h4>
            {(() => {
              const nodeType = nodeTypes.find(nt => nt.id === selectedNode.type);
              if (!nodeType) {
                return (
                  <div className="space-y-2">
                    {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{key}</label>
                        <input
                          type="text"
                          value={String(value || '')}
                          onChange={(e) => onUpdateProperty(selectedNode.id, key, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Enter ${key}...`}
                        />
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {nodeType.properties.map((property) => {
                    const currentValue = selectedNode.properties?.[property.id] || '';

                    const renderInput = () => {
                      switch (property.type) {
                        case 'select':
                          return (
                            <select
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select {property.label}</option>
                              {property.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          );
                        case 'textarea':
                          return (
                            <textarea
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              rows={3}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                          );
                        case 'number':
                          return (
                            <input
                              type="number"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'date':
                          return (
                            <input
                              type="date"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'email':
                          return (
                            <input
                              type="email"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'url':
                          // Add fetch button for website nodes
                          const isWebsiteNode = selectedNode.type === 'website';
                          const isUrlProperty = property.id === 'url';
                          
                          const handleFetchMetadata = async () => {
                            const url = String(currentValue || '').trim();
                            if (!url) return;
                            
                            setFetchingMetadata(true);
                            try {
                              const metadata = await fetchWebsiteMetadata(url);
                              
                              // Auto-populate available fields
                              if (metadata.domain) {
                                const domainProp = nodeType.properties.find(p => p.id === 'domain');
                                if (domainProp) {
                                  onUpdateProperty(selectedNode.id, 'domain', metadata.domain);
                                }
                              }
                              
                              // IP address
                              if ((metadata as any).ipAddress) {
                                const ipProp = nodeType.properties.find(p => p.id === 'ipAddress');
                                if (ipProp) {
                                  onUpdateProperty(selectedNode.id, 'ipAddress', (metadata as any).ipAddress);
                                }
                              }
                              
                              // Hosting provider
                              if ((metadata as any).hosting) {
                                const hostingProp = nodeType.properties.find(p => p.id === 'hosting');
                                if (hostingProp) {
                                  onUpdateProperty(selectedNode.id, 'hosting', (metadata as any).hosting);
                                }
                              }
                              
                              // Domain registration info (if available from WHOIS)
                              if (metadata.registrar) {
                                const registrarProp = nodeType.properties.find(p => p.id === 'registrar');
                                if (registrarProp) {
                                  onUpdateProperty(selectedNode.id, 'registrar', metadata.registrar);
                                }
                              }
                              
                              if (metadata.registrationDate) {
                                const regDateProp = nodeType.properties.find(p => p.id === 'registrationDate');
                                if (regDateProp) {
                                  const date = new Date(metadata.registrationDate);
                                  if (!isNaN(date.getTime())) {
                                    onUpdateProperty(selectedNode.id, 'registrationDate', date.toISOString().split('T')[0]);
                                  }
                                }
                              }
                              
                              if (metadata.expirationDate) {
                                const expDateProp = nodeType.properties.find(p => p.id === 'expirationDate');
                                if (expDateProp) {
                                  const date = new Date(metadata.expirationDate);
                                  if (!isNaN(date.getTime())) {
                                    onUpdateProperty(selectedNode.id, 'expirationDate', date.toISOString().split('T')[0]);
                                  }
                                }
                              }
                            } catch (error) {
                              console.warn('[InspectorPanel] Failed to fetch website metadata:', error);
                            } finally {
                              setFetchingMetadata(false);
                            }
                          };
                          
                          return (
                            <div className="space-y-2">
                              <div className="flex gap-1.5">
                                <input
                                  type="url"
                                  value={String(currentValue)}
                                  onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                                  placeholder={property.placeholder}
                                  className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {isWebsiteNode && isUrlProperty && (
                                  <button
                                    type="button"
                                    onClick={handleFetchMetadata}
                                    disabled={fetchingMetadata || !String(currentValue || '').trim()}
                                    className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs rounded-md transition-colors whitespace-nowrap shrink-0"
                                    title="Look up domain registration information (WHOIS)"
                                  >
                                    {fetchingMetadata ? '...' : 'Fetch'}
                                  </button>
                                )}
                              </div>
                              {isWebsiteNode && isUrlProperty && fetchingMetadata && (
                                <p className="text-xs text-slate-400">Looking up domain registration information...</p>
                              )}
                            </div>
                          );
                        case 'phone':
                          return (
                            <input
                              type="tel"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                        case 'image': {
                          const sourceId = String(currentValue);
                          const preview = sourceId ? previewMap.get(sourceId) : null;
                          return (
                            <div className="space-y-2">
                              {preview && preview.mimeType?.startsWith('image/') ? (
                                <div className="relative group">
                                  <img
                                    src={preview.url}
                                    alt={preview.fileName}
                                    className="w-full h-48 object-cover rounded-lg border border-slate-700"
                                  />
                                  <button
                                    onClick={() => {
                                      setImagePropertyKey(property.id);
                                      setImageModalOpen(true);
                                    }}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm rounded-lg"
                                  >
                                    Change Image
                                  </button>
                                  <button
                                    onClick={() => onUpdateProperty(selectedNode.id, property.id, '')}
                                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImagePropertyKey(property.id);
                                    setImageModalOpen(true);
                                  }}
                                  className="w-full px-4 py-8 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors text-sm"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{property.placeholder || 'Click to upload image'}</span>
                                  </div>
                                </button>
                              )}
                            </div>
                          );
                        }
                        default:
                          return (
                            <input
                              type="text"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          );
                      }
                    };

                    return (
                      <div key={property.id} className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                          {property.label}
                          {property.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {renderInput()}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          )}

          {tab === 'evidence' && (
          <section className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Assertions</h4>
              <button
                onClick={onAddAssertion}
                className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 px-2 py-1 rounded transition-colors"
                title="Add assertion"
              >
                +
              </button>
            </div>
            {assertions.length === 0 && (
              <p className="text-sm text-slate-500">No assertions yet.</p>
            )}
            {assertions.map((assertion) => (
              <div
                key={assertion.id}
                className={
                  assertion.confidence === 'unverified'
                    ? 'rounded border border-dashed border-unverified/70 bg-slate-900/40 p-3'
                    : 'rounded border border-slate-800 bg-slate-900/40 p-3'
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-100">{assertion.path}</span>
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge confidence={assertion.confidence} />
                    <button
                      className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                      title="Edit assertion"
                      onClick={async () => {
                        try {
                          const nextConfidence = window.prompt('Confidence (asserted|unverified|verified):', assertion.confidence);
                          const nextJson = window.prompt('Assertion JSON value:', JSON.stringify(assertion.value, null, 2));
                          if (nextConfidence == null && nextJson == null) return;
                          const updates: { value?: Record<string, unknown>; confidence?: 'asserted' | 'unverified' | 'verified' } = {};
                          if (nextConfidence && (nextConfidence === 'asserted' || nextConfidence === 'unverified' || nextConfidence === 'verified')) {
                            updates.confidence = nextConfidence;
                          }
                          if (nextJson) {
                            try { updates.value = JSON.parse(nextJson); } catch { alert('Invalid JSON'); return; }
                          }
                          if (window.piBridge.updateAssertion) {
                            const ok = await window.piBridge.updateAssertion(assertion.id, updates);
                            if (ok) window.dispatchEvent(new CustomEvent('pi:refresh'));
                          } else {
                            console.warn('updateAssertion API not available');
                          }
                        } catch (e) {
                          console.error('Edit assertion failed', e);
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded bg-red-900/30 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-900/50"
                      title="Delete assertion"
                      onClick={async () => {
                        if (!confirm('Delete this assertion?')) return;
                        try {
                          if (window.piBridge.deleteAssertion) {
                            const ok = await window.piBridge.deleteAssertion(assertion.id);
                            if (ok) window.dispatchEvent(new CustomEvent('pi:refresh'));
                          } else {
                            console.warn('deleteAssertion API not available');
                          }
                        } catch (e) {
                          console.error('Delete assertion failed', e);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
                  {JSON.stringify(assertion.value, null, 2)}
                </pre>
              </div>
            ))}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sources</h4>
                <button
                  onClick={onAddSource}
                  className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 px-2 py-1 rounded transition-colors"
                  title="Add source"
                >
                  +
                </button>
              </div>
              <SourcesList sources={sources} />
            </div>
          </section>
          )}
        </div>
      ) : selectedEdgeId ? (
        <div>
          {(() => {
            const edge = graphEdges.find(e => e.id === selectedEdgeId);
            const sourceNode = graphNodes.find(n => n.id === edge?.src_id);
            const targetNode = graphNodes.find(n => n.id === edge?.dst_id);
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Relationship</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Selected</span>
                    <button
                      onClick={onDeleteEdge}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
                      title="Delete relationship (or press Delete key)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-md">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-slate-300 font-medium">{sourceNode?.label || 'Unknown'}</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs">🔗</div>
                      <span className="text-slate-400 text-xs">{edge?.type}</span>
                    </div>
                    <div className="text-slate-300 font-medium">{targetNode?.label || 'Unknown'}</div>
                  </div>
                  <div className="text-slate-400 text-xs mt-2">ID: {edge?.id}</div>
                </div>
                {edge && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Subtype</label>
                      <select
                        value={String(edge.properties?.subtype || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'subtype', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        {relationshipTypes.find(rt => rt.id === edge.type)?.subtypes?.map(st => (
                          <option key={st.id} value={st.id}>{st.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                      <input
                        type="date"
                        value={String(edge.properties?.date || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'date', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                      <textarea
                        value={String(edge.properties?.notes || '')}
                        onChange={(e) => onUpdateEdgeProperty && onUpdateEdgeProperty(edge.id, 'notes', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
          <p>Select a node or relationship to inspect details.</p>
        </div>
      )}
      </div>
      
      {/* Image selection modal */}
      <MediaLibraryModal
        isOpen={imageModalOpen}
        mode="select"
        onClose={() => {
          setImageModalOpen(false);
          setImagePropertyKey(null);
        }}
        onSelect={(source) => {
          if (imagePropertyKey && selectedNode) {
            onUpdateProperty(selectedNode.id, imagePropertyKey, source.id);
          }
          setImageModalOpen(false);
          setImagePropertyKey(null);
        }}
      />
    </aside>
  );
}
