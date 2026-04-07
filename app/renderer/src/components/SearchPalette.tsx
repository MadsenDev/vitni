import { useEffect, useMemo, useRef, useState } from 'react';
import { filterSearchResults, searchGroupLabel } from '@renderer/features/search/searchIndex';
import type { SearchResult } from '@renderer/types/app';
import { ThemedInput, ThemedPanel } from '@renderer/features/personalization/primitives';

interface SearchPaletteProps {
  open: boolean;
  items: SearchResult[];
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
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
    return filterSearchResults(items, query);
  }, [items, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Array<{ kind: SearchResult['kind']; items: SearchResult[] }>>((groups, result) => {
      const existing = groups.find((group) => group.kind === result.kind);
      if (existing) {
        existing.items.push(result);
      } else {
        groups.push({ kind: result.kind, items: [result] });
      }
      return groups;
    }, []);
  }, [filtered]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1))); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const sel = filtered[activeIndex];
        if (sel) { onSelect(sel); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose, onSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] animate-enter-scale flex items-start justify-center pt-24 backdrop-blur-[2px]" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-2xl overflow-hidden rounded-[24px]">
        <div className="border-b px-1 pt-1" style={{ borderColor: 'var(--border-subtle)' }}>
          <ThemedInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes, relationships, assertions, and sources…"
            className="w-full rounded-[18px] border-transparent px-4 py-3"
            style={{ background: 'transparent' }}
          />
        </div>
        <div className="max-h-96 overflow-auto p-2">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-dim)' }}>No results</div>
          )}
          {grouped.map((group) => (
            <div key={group.kind} className="mb-2 last:mb-0">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>
                {searchGroupLabel(group.kind)}
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const idx = filtered.findIndex((candidate) => candidate.id === item.id);
                  return (
                    <li
                      key={item.id}
                      className="cursor-pointer rounded-2xl px-4 py-3 text-sm transition-colors"
                      style={idx === activeIndex
                        ? {
                            background: 'var(--surface-raised)',
                            color: 'var(--text-primary)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
                          }
                        : { color: 'var(--text-muted)' }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => { onSelect(item); onClose(); }}
                      title={item.id}
                    >
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="mt-1 truncate text-xs" style={{ color: 'var(--text-dim)' }}>{item.subtitle}</div>
                      {item.metadata ? <div className="mt-1 truncate text-[11px]" style={{ color: 'var(--text-dim)' }}>{item.metadata}</div> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </ThemedPanel>
    </div>
  );
}
