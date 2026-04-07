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
    } as unknown as Window['piBridge'];
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
            subject_kind: 'entity',
            path: 'identity.name',
            value: { first: 'Alice' },
            source_id: 'source-1',
            confidence: 'asserted',
            review_state: 'unreviewed',
            review_note: null,
            reviewed_by: null,
            reviewed_at: null,
            subject_id: 'node-1',
            created_at: 1
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
    fireEvent.change(screen.getByLabelText('Fact JSON'), { target: { value: '{"first":"Alicia"}' } });
    fireEvent.change(screen.getByLabelText('Confidence'), { target: { value: 'verified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(window.piBridge.updateAssertion).toHaveBeenCalledWith('assertion-1', {
        confidence: 'verified',
        value: { first: 'Alicia' },
        review_state: 'unreviewed',
        review_note: null
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
            subject_kind: 'entity',
            path: 'identity.name',
            value: { first: 'Alice' },
            source_id: 'source-1',
            confidence: 'asserted',
            review_state: 'unreviewed',
            review_note: null,
            reviewed_by: null,
            reviewed_at: null,
            subject_id: 'node-1',
            created_at: 1
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
    } as unknown as Window['piBridge'];

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

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    await waitFor(() => expect(screen.getByText('WHOIS Lookup')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Request' }));

    expect(onRequestRemoteTransform).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'whois.lookup' }),
      { domain: 'evil.example' }
    );
  });

  it('promotes a mapped field into an assertion when a linked source exists', async () => {
    window.piBridge = {
      listAllSourcesWithUsage: vi.fn().mockResolvedValue([]),
      listTransforms: vi.fn().mockResolvedValue({ local: [], remote: [] }),
      createAssertion: vi.fn().mockResolvedValue('assertion-new'),
      updateAssertion: vi.fn().mockResolvedValue(true),
      deleteAssertion: vi.fn().mockResolvedValue(true)
    } as unknown as Window['piBridge'];

    render(
      <InspectorPanel
        nodeTypes={nodeTypes}
        iconPack="default"
        graphNodes={[{ id: 'node-1', type: 'person', label: 'Alice', properties: { firstName: 'Alice', lastName: 'Doe' } }]}
        graphEdges={[]}
        selectedNodeId="node-1"
        selectedNodeIds={['node-1']}
        selectedEdgeId={null}
        assertions={[]}
        sources={[
          {
            id: 'source-1',
            kind: 'document',
            locator: '/tmp/source.pdf',
            title: 'Case note',
            added_at: 10,
            hash: null,
            mime: 'application/pdf'
          }
        ]}
        onAddAssertion={vi.fn()}
        onAddSource={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteNodes={vi.fn()}
        onDeleteEdge={vi.fn()}
        onUpdateLabel={vi.fn()}
        onUpdateProperty={vi.fn().mockResolvedValue(undefined)}
        onUpdateEdgeProperty={vi.fn()}
        onRequestRemoteTransform={vi.fn()}
        onAlignLeft={vi.fn()}
        onAlignTop={vi.fn()}
        searchFocus={null}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Facts' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Create fact' }));

    await waitFor(() =>
      expect(window.piBridge.createAssertion).toHaveBeenCalledWith({
        subject_kind: 'entity',
        subject_id: 'node-1',
        path: 'identity.first_name',
        value: { value: 'Alice' },
        source_id: 'source-1',
        confidence: 'asserted'
      })
    );
  });

  it('uses the field prompt modal before auto-creating a fact in prompt mode', async () => {
    window.piBridge = {
      listAllSourcesWithUsage: vi.fn().mockResolvedValue([]),
      listTransforms: vi.fn().mockResolvedValue({ local: [], remote: [] }),
      createAssertion: vi.fn().mockResolvedValue('assertion-new'),
      updateAssertion: vi.fn().mockResolvedValue(true),
      deleteAssertion: vi.fn().mockResolvedValue(true)
    } as unknown as Window['piBridge'];

    render(
      <InspectorPanel
        nodeTypes={nodeTypes}
        iconPack="default"
        graphNodes={[{ id: 'node-1', type: 'person', label: 'Alice', properties: { firstName: 'Alice' } }]}
        graphEdges={[]}
        selectedNodeId="node-1"
        selectedNodeIds={['node-1']}
        selectedEdgeId={null}
        assertions={[]}
        sources={[
          {
            id: 'source-1',
            kind: 'document',
            locator: '/tmp/source.pdf',
            title: 'Case note',
            added_at: 10,
            hash: null,
            mime: 'application/pdf'
          }
        ]}
        onAddAssertion={vi.fn()}
        onAddSource={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteNodes={vi.fn()}
        onDeleteEdge={vi.fn()}
        onUpdateLabel={vi.fn()}
        onUpdateProperty={vi.fn().mockResolvedValue(undefined)}
        onUpdateEdgeProperty={vi.fn()}
        onRequestRemoteTransform={vi.fn()}
        onAlignLeft={vi.fn()}
        onAlignTop={vi.fn()}
        searchFocus={null}
        assertionFieldAutomation="prompt"
      />
    );

    const firstNameInput = screen.getByPlaceholderText('Jane');
    fireEvent.change(firstNameInput, { target: { value: 'Alicia' } });
    fireEvent.blur(firstNameInput, { target: { value: 'Alicia' } });

    expect(window.piBridge.createAssertion).not.toHaveBeenCalled();
    expect(
      await screen.findByText('This field changed. Create a source-backed fact now, or keep the summary field as-is for the moment.')
    ).toBeInTheDocument();
    expect(screen.getByText('Case note')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Create fact' }).at(-1)!);

    await waitFor(() =>
      expect(window.piBridge.createAssertion).toHaveBeenCalledWith({
        subject_kind: 'entity',
        subject_id: 'node-1',
        path: 'identity.first_name',
        value: { value: 'Alicia' },
        source_id: 'source-1',
        confidence: 'asserted'
      })
    );
    expect(window.prompt).not.toHaveBeenCalled();
  });
});
