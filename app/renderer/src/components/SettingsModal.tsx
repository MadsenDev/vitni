import { FaCog } from 'react-icons/fa';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localAIEnabled: boolean;
  onLocalAIToggle: () => void;
  showNodeLabels: boolean;
  onShowNodeLabelsChange: (value: boolean) => void;
  autoLayoutOnCreate: boolean;
  onAutoLayoutOnCreateChange: (value: boolean) => void;
  defaultRelationshipConfidence: 'unverified' | 'asserted' | 'verified';
  onDefaultRelationshipConfidenceChange: (value: 'unverified' | 'asserted' | 'verified') => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  localAIEnabled,
  onLocalAIToggle,
  showNodeLabels,
  onShowNodeLabelsChange,
  autoLayoutOnCreate,
  onAutoLayoutOnCreateChange,
  defaultRelationshipConfidence,
  onDefaultRelationshipConfidenceChange
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-3 mb-6">
          <FaCog className="w-6 h-6 text-slate-400" />
          <h2 className="text-xl font-semibold text-white">Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Local AI Assistant */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Local AI Assistant</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Runs entirely on-device to help organize and analyze your investigation data
                </p>
              </div>
              <button
                onClick={onLocalAIToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localAIEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localAIEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {localAIEnabled && (
              <div className="mt-3 rounded-md bg-slate-800/50 p-3 text-xs text-slate-300">
                <p className="font-semibold mb-2">Capabilities:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Summarize findings and organize leads</li>
                  <li>Highlight potential duplicate entities</li>
                  <li>Suggest missing properties based on node types</li>
                </ul>
              </div>
            )}
          </section>

          <div className="h-px bg-slate-700"></div>

          {/* Graph Display */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Graph Display</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-slate-300">Show Node Labels</label>
                <p className="text-xs text-slate-400 mt-1">Display node names on the graph</p>
              </div>
              <button
                onClick={() => onShowNodeLabelsChange(!showNodeLabels)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showNodeLabels ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showNodeLabels ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-slate-300">Auto-Layout on Create</label>
                <p className="text-xs text-slate-400 mt-1">Automatically arrange nodes when creating new entities</p>
              </div>
              <button
                onClick={() => onAutoLayoutOnCreateChange(!autoLayoutOnCreate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoLayoutOnCreate ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoLayoutOnCreate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          <div className="h-px bg-slate-700"></div>

          {/* Relationship Defaults */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Relationship Defaults</h3>
            
            <div>
              <label className="block text-sm text-slate-300 mb-2">Default Confidence Level</label>
              <select
                value={defaultRelationshipConfidence}
                onChange={(e) => onDefaultRelationshipConfidenceChange(e.target.value as typeof defaultRelationshipConfidence)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="unverified">Unverified</option>
                <option value="asserted">Asserted</option>
                <option value="verified">Verified</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Default confidence level for newly created relationships</p>
            </div>
          </section>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
