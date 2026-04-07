import { ThemedButton, ThemedCard, ThemedPanel } from '@renderer/features/personalization/primitives';

interface ConsentDetails {
  transformId: string;
  transformName: string;
  subjectEntityId: string;
  subjectEntityType: string;
  payload: Record<string, unknown>;
  destination: string;
}

interface Props {
  consent: ConsentDetails;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConsentModal({ consent, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-lg rounded-[28px] p-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Confirm Remote Transform</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold">{consent.transformName}</span> will send the following data to{' '}
          <span className="font-semibold">{consent.destination}</span>.
          Review and confirm before proceeding.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          Subject type: <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>{consent.subjectEntityType}</span>
        </p>
        <ThemedCard className="mt-4 rounded-2xl p-3 text-xs" style={{ whiteSpace: 'pre-wrap' }}>
          <pre className="whitespace-pre-wrap">{JSON.stringify(consent.payload, null, 2)}</pre>
        </ThemedCard>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-dim)' }}>
          Remote requests are never performed automatically. You must consent every time.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <ThemedButton type="button" variant="quiet" onClick={onCancel}>
            Cancel
          </ThemedButton>
          <ThemedButton type="button" variant="accent" onClick={() => void onConfirm()}>
            Send Request
          </ThemedButton>
        </div>
      </ThemedPanel>
    </div>
  );
}
