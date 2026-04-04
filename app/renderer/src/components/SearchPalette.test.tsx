import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchPalette } from './SearchPalette';

describe('SearchPalette', () => {
  it('renders grouped investigation results and returns the selected result', () => {
    const onSelect = vi.fn();

    render(
      <SearchPalette
        open={true}
        onClose={vi.fn()}
        onSelect={onSelect}
        items={[
          {
            id: 'node:person-1',
            kind: 'node',
            title: 'Alice Example',
            subtitle: 'person • person-1',
            metadata: 'alice@example.com',
            relatedNodeIds: ['person-1'],
            nodeId: 'person-1',
            primaryText: 'alice example person-1',
            secondaryText: 'person alice@example.com',
            searchText: 'alice example person-1 alice@example.com'
          },
          {
            id: 'source:source-1',
            kind: 'source',
            title: 'Profile page',
            subtitle: 'web • https://example.com',
            metadata: 'Alice Example • identity.alias',
            relatedNodeIds: ['person-1'],
            sourceId: 'source-1',
            primaryText: 'profile page https://example.com',
            secondaryText: 'web alice example identity.alias',
            searchText: 'profile page https://example.com alice example identity.alias'
          }
        ]}
      />
    );

    expect(screen.getByText('Nodes')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Profile page'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'source:source-1',
        kind: 'source',
        sourceId: 'source-1'
      })
    );
  });
});
