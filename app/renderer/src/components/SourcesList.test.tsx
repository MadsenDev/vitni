import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SourcesList } from './SourcesList';

describe('SourcesList', () => {
  beforeEach(() => {
    window.piBridge = {
      updateSource: vi.fn().mockResolvedValue(true),
      deleteSource: vi.fn().mockResolvedValue(true)
    } as any;
    window.prompt = vi.fn();
  });

  it('edits a source inline without browser prompts', async () => {
    render(
      <SourcesList
        sources={[
          {
            id: 'source-1',
            kind: 'web',
            locator: 'https://example.com',
            title: 'Example source',
            added_at: 1,
            hash: null,
            mime: null
          }
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(window.piBridge.updateSource).toHaveBeenCalledWith('source-1', {
        title: 'Updated title',
        locator: 'https://example.com'
      })
    );
    expect(window.prompt).not.toHaveBeenCalled();
  });
});
