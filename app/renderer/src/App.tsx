import { useEffect, useMemo, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { type ElementDefinition } from 'cytoscape';
import type { AssertionRecord, EdgeRecord, EntityRecord, SourceRecord } from '@shared/types';
import { ConfidenceBadge } from './components/ConfidenceBadge';
import { ConsentModal } from './components/ConsentModal';
import { SourcesList } from './components/SourcesList';
import { TransformList } from './components/TransformList';
import { AddEntityForm } from './components/forms/AddEntityForm';
import { AddAssertionForm } from './components/forms/AddAssertionForm';

cytoscape.warnings(false);

interface GraphData {
  nodes: EntityRecord[];
  edges: EdgeRecord[];
}

type AssertionView = AssertionRecord & { value: Record<string, unknown> };

function mapGraphElements(data: GraphData): ElementDefinition[] {
  return [
    ...data.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label ?? node.id,
        type: node.type
      }
    })),
    ...data.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.src_id,
        target: edge.dst_id,
        label: edge.type
      }
    }))
  ];
}

export default function App() {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [assertions, setAssertions] = useState<AssertionView[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [consentData, setConsentData] = useState<{
    transformId: string;
    payload: Record<string, unknown>;
    destination: string;
  } | null>(null);

  useEffect(() => {
    void window.piBridge.loadGraph().then((data) => {
      setGraph({ nodes: data.nodes, edges: data.edges });
    });
  }, []);

  useEffect(() => {
    if (!selectedNodeId) {
      setAssertions([]);
      setSources([]);
      return;
    }

    void fetchAssertions(selectedNodeId).then(setAssertions);
    void fetchSources(selectedNodeId).then(setSources);
  }, [selectedNodeId]);

  const elements = useMemo(() => mapGraphElements(graph), [graph]);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId]
  );

  return (
    <div className="flex h-full">
      <aside className="w-80 border-r border-slate-800 bg-slate-950/70 p-6">
        <h1 className="text-xl font-semibold">Investigation Workspace</h1>
        <p className="mt-2 text-sm text-slate-400">
          All assertions require a verifiable source. Speculative data appears with a dashed border.
        </p>
        <AddEntityForm
          onEntityCreated={(refresh) => {
            void refreshGraph().then(setGraph);
            if (refresh) {
              setSelectedNodeId(refresh.id);
            }
          }}
        />
        <TransformList
          onRemoteTransform={(manifest, payload) => {
            setConsentData({
              transformId: manifest.id,
              payload,
              destination: manifest.network ? manifest.network.host : 'local'
            });
          }}
        />
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Graph</h2>
            <p className="text-sm text-slate-400">
              Drag nodes to explore relationships. Select a node to view its assertions and sources.
            </p>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <section className="flex-1">
            <CytoscapeComponent
              className="h-full w-full"
              elements={elements}
              layout={{ name: 'cose' }}
              style={{ background: '#0f172a' }}
              cy={(cyInstance) => {
                cyInstance.on('select', 'node', (event) => {
                  setSelectedNodeId(event.target.id());
                });
                cyInstance.on('unselect', 'node', () => {
                  setSelectedNodeId(null);
                });
              }}
            />
          </section>
          <aside className="w-96 overflow-y-auto border-l border-slate-800 bg-slate-950/70 p-6">
            {selectedNode ? (
              <div>
                <h3 className="text-lg font-semibold">{selectedNode.label ?? 'Untitled Entity'}</h3>
                <p className="text-sm text-slate-400">Type: {selectedNode.type}</p>
                <section className="mt-4 space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Assertions</h4>
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
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sources</h4>
                  <SourcesList sources={sources} />
                </section>
                <AddAssertionForm
                  entity={selectedNode}
                  onAssertionCreated={() => {
                    void fetchAssertions(selectedNode.id).then(setAssertions);
                    void fetchSources(selectedNode.id).then(setSources);
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <p>Select a node to inspect assertions and sources.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
      {consentData && (
        <ConsentModal
          consent={consentData}
          onCancel={() => setConsentData(null)}
          onConfirm={async () => {
            if (!consentData) return;
            const snapshot = {
              destination: consentData.destination,
              payload: consentData.payload
            };
            await window.piBridge.createTransformRun({
              transform_id: consentData.transformId,
              input_json: JSON.stringify(consentData.payload),
              output_summary: null,
              consent_snapshot_json: JSON.stringify(snapshot),
              finished_at: null
            });
            setConsentData(null);
          }}
        />
      )}
    </div>
  );
}

async function refreshGraph() {
  const result = await window.piBridge.loadGraph();
  return { nodes: result.nodes, edges: result.edges };
}

async function fetchAssertions(entityId: string): Promise<AssertionView[]> {
  const results = await window.piBridge.listAssertionsByEntity(entityId);
  return results.map((assertion) => ({
    ...assertion,
    value: safeParseJson(assertion.value_json)
  }));
}

async function fetchSources(entityId: string): Promise<SourceRecord[]> {
  return window.piBridge.listSourcesByEntity(entityId);
}

function safeParseJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    console.warn('Failed to parse JSON value', error);
    return {};
  }
}
