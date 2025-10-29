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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-red-500/50 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-lg">
            ⚠️
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Delete Node</h2>
            <p className="text-sm text-slate-400">This action cannot be undone</p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-md">
          <div className="text-sm">
            <div className="text-slate-300 font-medium">{node.label || 'Untitled Entity'}</div>
            <div className="text-slate-400 text-xs mt-1">Type: {node.type}</div>
            <div className="text-slate-400 text-xs">ID: {node.id}</div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-300 mb-3">
            This will permanently delete the node and all its associated data, including:
          </p>
          <ul className="text-sm text-slate-400 space-y-1 ml-4">
            <li>• All assertions about this entity</li>
            <li>• All relationships connected to this node</li>
            <li>• All source references</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
}
