import { ConfidenceBadge } from './ConfidenceBadge';
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
  const selectedNode = selectedNodeId ? graphNodes.find(n => n.id === selectedNodeId) ?? null : null;

  return (
    <aside className="w-96 overflow-y-auto border-l border-slate-800 bg-slate-950/70 p-6">
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
                  <ConfidenceBadge confidence={assertion.confidence} />
                </div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
                  {JSON.stringify(assertion.value, null, 2)}
                </pre>
              </div>
            ))}
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
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
          </section>
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
    </aside>
  );
}
