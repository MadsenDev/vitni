import { ThemedButton, ThemedPanel } from '@renderer/features/personalization/primitives';

interface TerminologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TerminologyModal({ isOpen, onClose }: TerminologyModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-2xl rounded-[28px] p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Terminology</h2>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Key concepts used throughout Vitni.</p>
          </div>
          <ThemedButton type="button" onClick={onClose} variant="quiet" className="px-2 py-1 text-sm">
            ✕
          </ThemedButton>
        </div>

        <div className="space-y-4" style={{ color: 'var(--text-primary)' }}>
          <div>
            <h3 className="text-sm font-semibold">Entity</h3>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>A node in the graph (person, organization, location, etc.).</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Relationship</h3>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>A connection between two entities with an optional subtype and date.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Fact</h3>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Structured evidence attached to an entity (or relationship), always citing a source.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Source</h3>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>The origin of a fact (file, URL, note). Sources can include attachments and hashes.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Confidence</h3>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>The certainty level of a fact (verified, asserted, unverified).</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Timeline</h3>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>A chronological narrative generated from dated relationships and properties.</p>
          </div>
        </div>
      </ThemedPanel>
    </div>
  );
}

