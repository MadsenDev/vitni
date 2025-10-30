import { AddSourceForm } from './forms/AddSourceForm';
import type { SourceRecord } from '@shared/types';
import type { GraphNodeSnapshot } from '../types/graph';

interface SourceCreationModalProps {
  isOpen: boolean;
  entity: GraphNodeSnapshot | null;
  onClose: () => void;
  onSourceCreated: () => void;
  onOpenMediaLibrary: (onSelect: (source: SourceRecord) => void) => void;
}

export function SourceCreationModal({
  isOpen,
  entity,
  onClose,
  onSourceCreated,
  onOpenMediaLibrary
}: SourceCreationModalProps) {
  if (!isOpen || !entity) return null;

  const label = entity.label || 'Untitled Entity';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Attach Source</h2>
            <p className="text-sm text-slate-400">Record where the information about {label} comes from.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        <AddSourceForm
          entityId={entity.id}
          onSourceCreated={() => {
            onSourceCreated();
            onClose();
          }}
          onOpenMediaLibrary={onOpenMediaLibrary}
        />
      </div>
    </div>
  );
}
