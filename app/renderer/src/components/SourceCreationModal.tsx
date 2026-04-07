import { AddSourceForm } from './forms/AddSourceForm';
import type { SourceRecord } from '@shared/types';
import type { GraphNodeSnapshot } from '../types/graph';
import { ThemedButton, ThemedPanel } from '@renderer/features/personalization/primitives';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-lg rounded-[28px] p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Attach Source</h2>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Record where the information about {label} comes from.</p>
          </div>
          <ThemedButton type="button" onClick={onClose} variant="quiet" className="px-2 py-1 text-sm">
            ✕
          </ThemedButton>
        </div>

        <AddSourceForm
          entityId={entity.id}
          onSourceCreated={() => {
            onSourceCreated();
            onClose();
          }}
          onOpenMediaLibrary={onOpenMediaLibrary}
        />
      </ThemedPanel>
    </div>
  );
}
