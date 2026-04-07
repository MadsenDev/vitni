import { ThemedButton, ThemedCard, ThemedPanel } from '@renderer/features/personalization/primitives';

interface RelationshipDeletionModalProps {
  isOpen: boolean;
  relationship: { 
    id: string; 
    type: string; 
    sourceLabel: string; 
    targetLabel: string;
  } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function RelationshipDeletionModal({
  isOpen,
  relationship,
  onClose,
  onConfirm
}: RelationshipDeletionModalProps) {
  if (!isOpen || !relationship) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-md rounded-[28px] p-6 mx-4" style={{ borderColor: 'var(--status-danger-border)' }}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }}>
            ⚠️
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Relationship</h2>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>This action cannot be undone</p>
          </div>
        </div>

        <ThemedCard className="mb-4 rounded-2xl p-3">
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{relationship.sourceLabel}</div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)' }}>
                  🔗
                </div>
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{relationship.type}</span>
              </div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{relationship.targetLabel}</div>
            </div>
            <div className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>ID: {relationship.id}</div>
          </div>
        </ThemedCard>

        <div className="mb-4">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            This will permanently delete the relationship and its associated data, including:
          </p>
          <ul className="text-sm space-y-1 ml-4" style={{ color: 'var(--text-dim)' }}>
            <li>• The connection between these entities</li>
            <li>• All metadata about this relationship</li>
            <li>• Any confidence or strength ratings</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <ThemedButton onClick={onClose} variant="quiet">
            Cancel
          </ThemedButton>
          <ThemedButton onClick={onConfirm} variant="danger">
            Delete Relationship
          </ThemedButton>
        </div>
      </ThemedPanel>
    </div>
  );
}
