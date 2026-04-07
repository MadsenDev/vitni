import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ThemedButton, ThemedCard, ThemedInput, ThemedPanel } from '@renderer/features/personalization/primitives';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (projectName: string) => void;
}

export function buildDefaultProjectName(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `Case ${year}-${month}-${day} ${hours}-${minutes}`;
}

function sanitizeProjectName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function ProjectCreationModal({ isOpen, onClose, onCreate }: ProjectCreationModalProps) {
  const initialName = useMemo(() => buildDefaultProjectName(), [isOpen]);
  const [projectName, setProjectName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setProjectName(buildDefaultProjectName());
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = sanitizeProjectName(projectName);
    if (!nextName) {
      setError('Project name is required.');
      return;
    }
    onCreate(nextName);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 backdrop-blur-sm" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-lg rounded-[28px] p-6">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>New project</div>
          <h2 className="mt-3 font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Name the investigation first</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
            Pick a project name now so the file chooser opens with a sensible default instead of a generic folder name.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="project-name" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Project name
            </label>
            <ThemedInput
              id="project-name"
              autoFocus
              value={projectName}
              onChange={(event) => {
                setProjectName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Case 2026-03-31 23-20"
              className="w-full rounded-2xl px-4 py-3 font-mono"
            />
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
          </div>

          <ThemedCard className="rounded-2xl px-4 py-3 text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
            You’ll choose where to save the project next. The selected name will be prefilled in the native save dialog.
          </ThemedCard>

          <div className="flex items-center justify-end gap-3">
            <ThemedButton type="button" onClick={onClose} variant="quiet" className="rounded-2xl px-4 py-2.5 text-sm font-medium">
              Cancel
            </ThemedButton>
            <ThemedButton type="submit" variant="accent" className="rounded-2xl px-4 py-2.5 text-sm font-semibold">
              Continue
            </ThemedButton>
          </div>
        </form>
      </ThemedPanel>
    </div>,
    document.body
  );
}
