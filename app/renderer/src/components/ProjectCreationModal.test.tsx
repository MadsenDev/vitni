import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCreationModal, buildDefaultProjectName } from './ProjectCreationModal';

describe('ProjectCreationModal', () => {
  it('submits a sanitized project name', () => {
    const onClose = vi.fn();
    const onCreate = vi.fn();

    render(<ProjectCreationModal isOpen onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText(/project name/i), {
      target: { value: '  My: Case  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(onCreate).toHaveBeenCalledWith('My Case');
  });

  it('builds a timestamped default name', () => {
    expect(buildDefaultProjectName(new Date('2026-03-31T23:20:00Z'))).toMatch(/^Case \d{4}-\d{2}-\d{2} \d{2}-\d{2}$/);
  });
});
