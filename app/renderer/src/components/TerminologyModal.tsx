interface TerminologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TerminologyModal({ isOpen, onClose }: TerminologyModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Terminology</h2>
            <p className="text-sm text-slate-400">Key concepts used throughout Vitni.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-slate-200">
          <div>
            <h3 className="text-sm font-semibold">Entity</h3>
            <p className="text-sm text-slate-400">A node in the graph (person, organization, location, etc.).</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Relationship</h3>
            <p className="text-sm text-slate-400">A connection between two entities with an optional subtype and date.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Assertion</h3>
            <p className="text-sm text-slate-400">Structured evidence attached to an entity (or relationship), always citing a source.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Source</h3>
            <p className="text-sm text-slate-400">The origin of an assertion (file, URL, note). Sources can include attachments and hashes.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Confidence</h3>
            <p className="text-sm text-slate-400">The certainty level of an assertion (verified, asserted, unverified).</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Timeline</h3>
            <p className="text-sm text-slate-400">A chronological narrative generated from dated relationships and properties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


