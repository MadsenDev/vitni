interface ConsentDetails {
  transformId: string;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-100">Confirm Remote Transform</h3>
        <p className="mt-2 text-sm text-slate-300">
          This action will send the following data to <span className="font-semibold">{consent.destination}</span>.
          Review and confirm before proceeding.
        </p>
        <div className="mt-4 rounded border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
          <pre className="whitespace-pre-wrap">{JSON.stringify(consent.payload, null, 2)}</pre>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Remote requests are never performed automatically. You must consent every time.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-400"
            onClick={() => void onConfirm()}
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}
