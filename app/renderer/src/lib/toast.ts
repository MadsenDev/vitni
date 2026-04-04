export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastDetail {
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

export function emitToast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent<ToastDetail>('pi:toast', { detail }));
}
