import React from 'react';
import type { ToastDetail, ToastTone } from '@renderer/lib/toast';

interface ToastItem extends ToastDetail {
  id: string;
}

const toneClasses: Record<ToastTone, string> = {
  success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-50',
  error: 'border-red-500/30 bg-red-950/80 text-red-50',
  warning: 'border-amber-500/30 bg-amber-950/80 text-amber-50',
  info: 'border-sky-500/30 bg-sky-950/80 text-sky-50'
};

export function ToastViewport() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      const id = detail.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast: ToastItem = {
        id,
        tone: detail.tone ?? 'info',
        durationMs: detail.durationMs ?? 3200,
        ...detail
      };

      setToasts((current) => [...current.slice(-2), toast]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, toast.durationMs);
    };

    window.addEventListener('pi:toast', handleToast);
    return () => window.removeEventListener('pi:toast', handleToast);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-4 top-14 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-enter-rise pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl ${toneClasses[toast.tone ?? 'info']}`}
        >
          <div className="text-sm font-semibold">{toast.title}</div>
          {toast.description ? (
            <p className="mt-1 text-xs leading-5 opacity-80">{toast.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
