import { useEffect, useState } from 'react';
import type { TransformManifest, TransformRegistry } from '@shared/types';

interface Props {
  onRemoteTransform: (manifest: TransformManifest, payload: Record<string, unknown>) => void;
}

export function TransformList({ onRemoteTransform }: Props) {
  const [registry, setRegistry] = useState<TransformRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.piBridge
      .listTransforms()
      .then((data) => setRegistry(data as TransformRegistry))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <p className="mt-6 text-sm text-red-400">Failed to load transforms: {error}</p>;
  }

  if (!registry) {
    return <p className="mt-6 text-sm text-slate-500">Loading transforms…</p>;
  }

  return (
    <div className="mt-6 space-y-4">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Local Transforms</h3>
        {registry.local.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No local transforms configured.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {registry.local.map((transform) => (
              <li key={transform.id} className="rounded border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-sm font-semibold text-slate-100">{transform.name}</p>
                <p className="text-xs text-slate-400">ID: {transform.id}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Remote Transforms</h3>
        {registry.remote.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No remote transforms configured.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {registry.remote.map((transform) => (
              <li key={transform.id} className="rounded border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{transform.name}</p>
                    <p className="text-xs text-slate-400">Destination: {transform.network?.host ?? 'unknown'}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-sky-500 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/10"
                    onClick={() =>
                      onRemoteTransform(transform, {
                        preview: 'Provide domain or payload in production UI'
                      })
                    }
                  >
                    Request
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
