import { useEffect, useMemo, useRef, useState } from 'react';

type SearchItem = { id: string; label: string };

interface SearchPaletteProps {
  open: boolean;
  items: SearchItem[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function SearchPalette({ open, items, onClose, onSelect }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 20);
    return items
      .filter((i) => (i.label || i.id).toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      .slice(0, 30);
  }, [items, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1))); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const sel = filtered[activeIndex];
        if (sel) { onSelect(sel.id); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose, onSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-24">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur">
        <div className="border-b border-slate-800">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes by label or id…"
            className="w-full bg-transparent px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-auto">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">No results</li>
          )}
          {filtered.map((item, idx) => (
            <li
              key={item.id}
              className={`cursor-pointer px-4 py-2 text-sm ${idx === activeIndex ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-800/70'}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => { onSelect(item.id); onClose(); }}
              title={item.id}
            >
              <div className="truncate font-medium">{item.label || 'Untitled Entity'}</div>
              <div className="truncate text-xs text-slate-500">{item.id}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


