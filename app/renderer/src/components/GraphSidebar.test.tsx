import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraphSidebar } from './GraphSidebar';

describe('GraphSidebar', () => {
  it('shows node palette by default and switches to AI tab when enabled', () => {
    const onSidebarTabChange = vi.fn();

    render(
      <GraphSidebar
        sidebarTab="nodes"
        localAIEnabled={true}
        investigationProfile="general"
        iconPack="default"
        graph={{ nodes: [], edges: [] }}
        onSidebarTabChange={onSidebarTabChange}
        onNodeDragStart={vi.fn()}
        onNodeCreate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Nodes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AI' }));
    expect(onSidebarTabChange).toHaveBeenCalledWith('ai');
  });

  it('supports click-first node creation from the launcher', () => {
    const onNodeCreate = vi.fn();

    render(
      <GraphSidebar
        sidebarTab="nodes"
        localAIEnabled={false}
        investigationProfile="general"
        iconPack="default"
        graph={{ nodes: [], edges: [] }}
        onSidebarTabChange={vi.fn()}
        onNodeDragStart={vi.fn()}
        onNodeCreate={onNodeCreate}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /person/i })[0]);
    expect(onNodeCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 'person' }));
  });
});
