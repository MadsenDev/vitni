import { ThemedButton, ThemedCard, ThemedPanel } from '@renderer/features/personalization/primitives';

interface NodeDeletionModalProps {
  isOpen: boolean;
  node: { id: string; label: string; type: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function NodeDeletionModal({
  isOpen,
  node,
  onClose,
  onConfirm
}: NodeDeletionModalProps) {

  if (!isOpen || !node) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-md rounded-[28px] p-6 mx-4" style={{ borderColor: 'var(--status-danger-border)' }}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }}>
            ⚠️
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Node</h2>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>This action cannot be undone</p>
          </div>
        </div>

        <ThemedCard className="mb-4 rounded-2xl p-3">
          <div className="text-sm">
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{node.label || 'Untitled Entity'}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Type: {node.type}</div>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>ID: {node.id}</div>
          </div>
        </ThemedCard>

        <div className="mb-4">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            This will permanently delete the node and all its associated data, including:
          </p>
          <ul className="text-sm space-y-1 ml-4" style={{ color: 'var(--text-dim)' }}>
            <li>• All assertions about this entity</li>
            <li>• All relationships connected to this node</li>
            <li>• All source references</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <ThemedButton onClick={onClose} variant="quiet">
            Cancel
          </ThemedButton>
          <ThemedButton onClick={onConfirm} variant="danger">
            Delete Node
          </ThemedButton>
        </div>
      </ThemedPanel>
    </div>
  );
}
