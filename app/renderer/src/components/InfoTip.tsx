import { useState } from 'react';

interface InfoTipProps {
  text: string;
  className?: string;
}

export function InfoTip({ text, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        aria-label="Help"
        className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none transition-colors"
        style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--text-muted)' }}
      >
        ?
      </span>
      {open && (
        <span className="panel-elevated animate-enter-rise absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-pre rounded-xl px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
          {text}
        </span>
      )}
    </span>
  );
}
