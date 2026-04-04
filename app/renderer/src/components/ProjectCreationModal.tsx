import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(7,11,23,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">New project</div>
          <h2 className="mt-3 font-mono text-2xl font-semibold text-white">Name the investigation first</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Pick a project name now so the file chooser opens with a sensible default instead of a generic folder name.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-slate-200">
              Project name
            </label>
            <input
              id="project-name"
              autoFocus
              value={projectName}
              onChange={(event) => {
                setProjectName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Case 2026-03-31 23-20"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono text-white outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/20"
            />
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 px-4 py-3 text-xs leading-5 text-slate-400">
            You’ll choose where to save the project next. The selected name will be prefilled in the native save dialog.
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
