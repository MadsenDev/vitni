import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterPanel } from './FilterPanel';

describe('FilterPanel', () => {
  it('shows a one-click show-all action when node types are hidden', () => {
    const onShowAllTypes = vi.fn();

    render(
      <FilterPanel
        nodeTypes={[
          { id: 'person', label: 'Person' },
          { id: 'organization', label: 'Organization' },
          { id: 'phone', label: 'Phone Number' }
        ]}
        activeTypeIds={new Set(['person'])}
        onToggleType={vi.fn()}
        onShowAllTypes={onShowAllTypes}
        hasSourcesOnly={false}
        onToggleHasSources={vi.fn()}
      />
    );

    expect(screen.getByText('2 hidden types')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(onShowAllTypes).toHaveBeenCalledTimes(1);
  });
});
