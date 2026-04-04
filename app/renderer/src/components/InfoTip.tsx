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
        className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[10px] leading-none text-slate-300 transition-colors hover:border-sky-400/40 hover:text-white"
      >
        ?
      </span>
      {open && (
        <span className="panel-elevated animate-enter-rise absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-pre rounded-xl px-3 py-2 text-xs text-slate-200">
          {text}
        </span>
      )}
    </span>
  );
}

