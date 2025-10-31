import { ConfidenceBadge } from './ConfidenceBadge';
import React from 'react';
import { SourcesList } from './SourcesList';
import type { SourceRecord } from '@shared/types';
import type { NodeType } from '../lib/nodeTypes/index';
import { relationshipTypes } from '../lib/relationshipTypes';

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
  selectedEdgeId: string | null;
  assertions: AssertionView[];
  sources: SourceRecord[];
  onAddAssertion: () => void;
  onAddSource: () => void;
  onDeleteNode: () => void;
  onDeleteEdge: () => void;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onUpdateProperty: (nodeId: string, key: string, value: unknown) => void;
  onUpdateEdgeProperty?: (edgeId: string, key: string, value: unknown) => void;
}

export function InspectorPanel({
  nodeTypes,
  graphNodes,
  graphEdges,
  selectedNodeId,
  selectedEdgeId,
  assertions,
  sources,
  onAddAssertion,
  onAddSource,
  onDeleteNode,
  onDeleteEdge,
  onUpdateLabel,
  onUpdateProperty
  , onUpdateEdgeProperty
}: InspectorPanelProps) {
  const [tab, setTab] = React.useState<'details' | 'evidence'>('details');
  const selectedNode = selectedNodeId ? graphNodes.find(n => n.id === selectedNodeId) ?? null : null;

  return (
    <aside className="w-96 overflow-y-auto border-l border-slate-800 bg-slate-950/70">
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
      {selectedNode ? (
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
                          return (
                            <input
                              type="url"
                              value={String(currentValue)}
                              onChange={(e) => onUpdateProperty(selectedNode.id, property.id, e.target.value)}
                              placeholder={property.placeholder}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
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
    </aside>
  );
}
