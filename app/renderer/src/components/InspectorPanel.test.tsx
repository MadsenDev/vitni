import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorPanel } from './InspectorPanel';
import { nodeTypes } from '@renderer/lib/nodeTypes';

describe('InspectorPanel', () => {
  beforeEach(() => {
    window.piBridge = {
      listAllSourcesWithUsage: vi.fn().mockResolvedValue([]),
      listTransforms: vi.fn().mockResolvedValue({ local: [], remote: [] }),
      updateAssertion: vi.fn().mockResolvedValue(true),
      deleteAssertion: vi.fn().mockResolvedValue(true)
    } as any;
    window.prompt = vi.fn();
    window.alert = vi.fn();
  });

  it('edits an assertion inline without browser dialogs', async () => {
    render(
      <InspectorPanel
        nodeTypes={nodeTypes}
        iconPack="default"
        graphNodes={[{ id: 'node-1', type: 'person', label: 'Alice', properties: {} }]}
        graphEdges={[]}
        selectedNodeId="node-1"
        selectedNodeIds={['node-1']}
        selectedEdgeId={null}
        assertions={[
          {
            id: 'assertion-1',
            path: 'identity.name',
            value: { first: 'Alice' },
            confidence: 'asserted'
          }
        ]}
        sources={[]}
        onAddAssertion={vi.fn()}
        onAddSource={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteNodes={vi.fn()}
        onDeleteEdge={vi.fn()}
        onUpdateLabel={vi.fn()}
        onUpdateProperty={vi.fn()}
        onUpdateEdgeProperty={vi.fn()}
        onRequestRemoteTransform={vi.fn()}
        onAlignLeft={vi.fn()}
        onAlignTop={vi.fn()}
        searchFocus={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Evidence' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Assertion JSON'), { target: { value: '{"first":"Alicia"}' } });
    fireEvent.change(screen.getByLabelText('Confidence'), { target: { value: 'verified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(window.piBridge.updateAssertion).toHaveBeenCalledWith('assertion-1', {
        confidence: 'verified',
        value: { first: 'Alicia' }
      })
    );
    expect(window.prompt).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('switches to evidence when search focuses an assertion', async () => {
    render(
      <InspectorPanel
        nodeTypes={nodeTypes}
        iconPack="default"
        graphNodes={[{ id: 'node-1', type: 'person', label: 'Alice', properties: {} }]}
        graphEdges={[]}
        selectedNodeId="node-1"
        selectedNodeIds={['node-1']}
        selectedEdgeId={null}
        assertions={[
          {
            id: 'assertion-1',
            path: 'identity.name',
            value: { first: 'Alice' },
            confidence: 'asserted'
          }
        ]}
        sources={[]}
        onAddAssertion={vi.fn()}
        onAddSource={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteNodes={vi.fn()}
        onDeleteEdge={vi.fn()}
        onUpdateLabel={vi.fn()}
        onUpdateProperty={vi.fn()}
        onUpdateEdgeProperty={vi.fn()}
        onRequestRemoteTransform={vi.fn()}
        onAlignLeft={vi.fn()}
        onAlignTop={vi.fn()}
        searchFocus={{ assertionId: 'assertion-1', sourceId: null, edgeId: null }}
      />
    );

    await waitFor(() => expect(screen.getByText('identity.name')).toBeInTheDocument());
  });

  it('shows applicable remote tools and requests a consented payload', async () => {
    const onRequestRemoteTransform = vi.fn();
    window.piBridge = {
      listAllSourcesWithUsage: vi.fn().mockResolvedValue([]),
      listTransforms: vi.fn().mockResolvedValue({
        local: [],
        remote: [
          {
            id: 'whois.lookup',
            name: 'WHOIS Lookup',
            description: 'Look up registration details.',
            appliesTo: ['domain'],
            input: [{ entityType: 'domain' }],
            network: { kind: 'http', host: 'rdap.org', path: '/domain/${domain}', method: 'GET' }
          }
        ]
      }),
      updateAssertion: vi.fn().mockResolvedValue(true),
      deleteAssertion: vi.fn().mockResolvedValue(true)
    } as any;

    render(
      <InspectorPanel
        nodeTypes={nodeTypes}
        iconPack="default"
        graphNodes={[{ id: 'node-1', type: 'domain', label: 'evil.example', properties: { domain: 'evil.example' } }]}
        graphEdges={[]}
        selectedNodeId="node-1"
        selectedNodeIds={['node-1']}
        selectedEdgeId={null}
        assertions={[]}
        sources={[]}
        onAddAssertion={vi.fn()}
        onAddSource={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteNodes={vi.fn()}
        onDeleteEdge={vi.fn()}
        onUpdateLabel={vi.fn()}
        onUpdateProperty={vi.fn()}
        onUpdateEdgeProperty={vi.fn()}
        onRequestRemoteTransform={onRequestRemoteTransform}
        onAlignLeft={vi.fn()}
        onAlignTop={vi.fn()}
        searchFocus={null}
      />
    );

    await waitFor(() => expect(screen.getByText('WHOIS Lookup')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Request' }));

    expect(onRequestRemoteTransform).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'whois.lookup' }),
      { domain: 'evil.example' }
    );
  });
});
