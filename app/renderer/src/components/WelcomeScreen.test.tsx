import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WelcomeScreen } from './WelcomeScreen';

describe('WelcomeScreen', () => {
  const baseProps = {
    investigationProfile: 'general' as const,
    onInvestigationProfileChange: vi.fn(),
    showExampleCase: true
  };

  beforeEach(() => {
    window.piBridge = {
      projectRecent: vi.fn().mockResolvedValue([
        {
          root: '/cases/primary/alpha.vitni',
          name: 'Alpha Case',
          lastOpenedAt: Date.now()
        },
        {
          root: '/cases/archive/bravo.vitni',
          name: 'Bravo Case',
          lastOpenedAt: Date.now() - 86_400_000
        }
      ]),
      projectOpenPath: vi.fn().mockResolvedValue({ ok: true }),
      projectRemoveRecent: vi.fn().mockResolvedValue(true),
      projectExampleInfo: vi.fn().mockResolvedValue({
        available: true,
        name: 'Operation Circuit Ledger',
        path: '/samples/operation-glass-harbor.vitni'
      }),
      projectOpenExample: vi.fn().mockResolvedValue({ ok: true }),
      revealPath: vi.fn().mockResolvedValue(true)
    } as unknown as Window['piBridge'];
  });

  it('renders launch actions and opens the most recent and example project', async () => {
    const onProjectCreate = vi.fn();
    const onProjectLoad = vi.fn();

    render(<WelcomeScreen onProjectCreate={onProjectCreate} onProjectLoad={onProjectLoad} {...baseProps} />);

    expect(screen.getByRole('button', { name: /start new investigation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open existing case/i })).toBeInTheDocument();

    await screen.findAllByText('Alpha Case');
    expect(screen.getByRole('button', { name: /open example case/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /alpha case/i }));
    await waitFor(() => {
      expect(window.piBridge.projectOpenPath).toHaveBeenCalledWith('/cases/primary/alpha.vitni');
    });

    fireEvent.click(screen.getByRole('button', { name: /open example case/i }));
    await waitFor(() => {
      expect(window.piBridge.projectOpenExample).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /start new investigation/i }));
    fireEvent.click(screen.getByRole('button', { name: /open existing case/i }));

    expect(onProjectCreate).toHaveBeenCalled();
    expect(onProjectLoad).toHaveBeenCalled();
  });

  it('opens the recent-project context menu and removes an entry', async () => {
    render(<WelcomeScreen onProjectCreate={vi.fn()} onProjectLoad={vi.fn()} {...baseProps} />);

    const alphaButton = await screen.findByRole('button', { name: /alpha case/i });
    fireEvent.contextMenu(alphaButton);

    const removeItem = await screen.findByRole('menuitem', { name: /remove from recent/i });
    fireEvent.click(removeItem);

    await waitFor(() => {
      expect(window.piBridge.projectRemoveRecent).toHaveBeenCalledWith('/cases/primary/alpha.vitni');
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /alpha case/i })).not.toBeInTheDocument();
    });
  });

  it('renders an empty recent-project state instead of hiding the section', async () => {
    window.piBridge.projectRecent = vi.fn().mockResolvedValue([]);

    render(<WelcomeScreen onProjectCreate={vi.fn()} onProjectLoad={vi.fn()} {...baseProps} />);

    expect(await screen.findByRole('heading', { name: /^continue casework$/i })).toBeInTheDocument();
    expect(screen.getByText(/no investigations yet/i)).toBeInTheDocument();
    expect(screen.getByText(/appear here as your casework queue/i)).toBeInTheDocument();
  });
});
