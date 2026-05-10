import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { ThemedInput } from '@renderer/features/personalization/primitives';
import { filterSearchResults } from '@renderer/features/search/searchIndex';
import type { SearchResult, SearchResultKind } from '@renderer/types/app';

export interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  group: string;
  groupOrder: number;
  keywords?: string[];
  icon?: React.ReactNode;
  action: () => void;
  shortcut?: string;
  disabled?: boolean;
  /** Show in the empty/default state. Omit to keep discoverable-only via search. */
  pin?: boolean;
}

type PaletteEntry =
  | { kind: 'command'; id: string; item: CommandItem }
  | { kind: 'search'; id: string; item: SearchResult };

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
  searchItems: SearchResult[];
  onSearchSelect: (result: SearchResult) => void;
}

const GROUP_COLOR: Record<string, string> = {
  Navigate:  'var(--accent-sky)',
  Create:    'var(--accent-emerald)',
  Graph:     'var(--accent-amber)',
  File:      'var(--text-soft)',
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  node:         'Node',
  relationship: 'Link',
  assertion:    'Assertion',
  source:       'Source',
};

function groupColor(group: string) {
  return GROUP_COLOR[group] ?? GROUP_COLOR.File;
}

function matchesQuery(item: CommandItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.label.toLowerCase().includes(q) ||
    (item.subtitle?.toLowerCase().includes(q) ?? false) ||
    (item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false)
  );
}

export function CommandPalette({ open, onClose, commands, searchItems, onSearchSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const commandsOnly = query.startsWith('>');
  const effectiveQuery = (commandsOnly ? query.slice(1).trimStart() : query).trim();
  const isEmpty = effectiveQuery === '';

  const flatEntries = useMemo((): PaletteEntry[] => {
    if (isEmpty && !commandsOnly) {
      // Curated default: only pinned commands, grouped
      return commands
        .filter((cmd) => !cmd.disabled && cmd.pin)
        .sort((a, b) => a.groupOrder - b.groupOrder || a.label.localeCompare(b.label))
        .map((cmd) => ({ kind: 'command' as const, id: cmd.id, item: cmd }));
    }

    const matchedCommands = commands
      .filter((cmd) => !cmd.disabled && matchesQuery(cmd, effectiveQuery))
      .sort((a, b) => a.groupOrder - b.groupOrder || a.label.localeCompare(b.label));

    if (commandsOnly) {
      return matchedCommands.map((cmd) => ({ kind: 'command' as const, id: cmd.id, item: cmd }));
    }

    const filteredSearch = filterSearchResults(searchItems, effectiveQuery);
    return [
      ...filteredSearch.map((sr) => ({ kind: 'search' as const, id: sr.id, item: sr })),
      ...matchedCommands.map((cmd) => ({ kind: 'command' as const, id: cmd.id, item: cmd })),
    ];
  }, [commands, searchItems, effectiveQuery, commandsOnly, isEmpty]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, flatEntries.length - 1)));
  }, [flatEntries.length]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, Math.max(0, flatEntries.length - 1))); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const entry = flatEntries[activeIndex];
        if (!entry) return;
        if (entry.kind === 'command') { entry.item.action(); onClose(); }
        else { onSearchSelect(entry.item); onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatEntries, activeIndex, onClose, onSearchSelect]);

  if (!open) return null;

  const showGrouped = isEmpty && !commandsOnly;

  const groups = showGrouped
    ? (() => {
        const map = new Map<string, { order: number; items: { cmd: CommandItem; idx: number }[] }>();
        flatEntries.forEach((entry, idx) => {
          if (entry.kind !== 'command') return;
          const { group, groupOrder } = entry.item;
          if (!map.has(group)) map.set(group, { order: groupOrder, items: [] });
          map.get(group)!.items.push({ cmd: entry.item, idx });
        });
        return [...map.entries()].sort((a, b) => a[1].order - b[1].order);
      })()
    : null;

  const hasSearchInFlat = !showGrouped && flatEntries.some((e) => e.kind === 'search');
  const firstCommandIdxInFlat = flatEntries.findIndex((e) => e.kind === 'command');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] backdrop-blur-sm"
      style={{ background: 'rgba(2, 6, 23, 0.78)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[620px] overflow-hidden rounded-2xl"
        style={{
          background: 'rgba(8, 13, 28, 0.98)',
          border: '1px solid rgba(71, 85, 105, 0.38)',
          boxShadow: '0 32px 80px rgba(2, 6, 23, 0.7)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(95, 212, 255, 0.3) 40%, rgba(69, 214, 168, 0.18) 65%, transparent 90%)' }} />

        {/* Input row */}
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.25)' }}>
          <svg className="h-[15px] w-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'rgba(143, 160, 191, 0.45)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <ThemedInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type › for commands…"
            className="flex-1 border-transparent py-3.5 text-[14px]"
            style={{ background: 'transparent', paddingLeft: 0, paddingRight: 0 }}
          />
          {commandsOnly && (
            <span className="flex-shrink-0 text-[11px] font-medium tracking-wide" style={{ color: 'var(--accent-sky)' }}>
              commands
            </span>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-auto px-1.5 py-1.5">
          {flatEntries.length === 0 && (
            <p className="px-4 py-5 text-center text-sm" style={{ color: 'rgba(98, 112, 141, 0.7)' }}>
              {effectiveQuery ? `No results for "${effectiveQuery}"` : 'No commands available'}
            </p>
          )}

          {showGrouped && groups ? (
            groups.map(([groupName, { items }]) => (
              <div key={groupName} className="mb-0.5">
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: groupColor(groupName) }}>
                  {groupName}
                </p>
                <ul>
                  {items.map(({ cmd, idx }) => (
                    <CommandRow key={cmd.id} cmd={cmd} idx={idx} activeIndex={activeIndex} onActivate={setActiveIndex} onSelect={() => { cmd.action(); onClose(); }} />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <>
              {hasSearchInFlat && (
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(98, 112, 141, 0.7)' }}>
                  Matches
                </p>
              )}
              <ul>
                {flatEntries.map((entry, idx) => (
                  <div key={entry.id}>
                    {!commandsOnly && entry.kind === 'command' && idx === firstCommandIdxInFlat && (
                      <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(98, 112, 141, 0.7)' }}>
                        Commands
                      </p>
                    )}
                    {entry.kind === 'command' ? (
                      <CommandRow cmd={entry.item} idx={idx} activeIndex={activeIndex} onActivate={setActiveIndex} onSelect={() => { entry.item.action(); onClose(); }} />
                    ) : (
                      <SearchRow result={entry.item} idx={idx} activeIndex={activeIndex} onActivate={setActiveIndex} onSelect={() => { onSearchSelect(entry.item); onClose(); }} />
                    )}
                  </div>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 text-[11px]" style={{ borderTop: '1px solid rgba(71, 85, 105, 0.18)', color: 'rgba(98, 112, 141, 0.55)' }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
          <span className="ml-auto">type › for commands</span>
        </div>
      </div>
    </div>
  );
}

function CommandRow({ cmd, idx, activeIndex, onActivate, onSelect }: {
  cmd: CommandItem;
  idx: number;
  activeIndex: number;
  onActivate: (idx: number) => void;
  onSelect: () => void;
}) {
  const isActive = idx === activeIndex;
  const color = groupColor(cmd.group);

  return (
    <li
      data-active={isActive ? '' : undefined}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
      style={isActive
        ? { background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-primary)' }
        : { color: 'var(--text-muted)' }}
      onMouseEnter={() => onActivate(idx)}
      onClick={onSelect}
    >
      {cmd.icon != null && (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-[12px]" style={{ color: isActive ? color : 'rgba(143, 160, 191, 0.4)' }}>
          {cmd.icon}
        </span>
      )}
      <span className="flex-1 truncate font-medium">{cmd.label}</span>
      {cmd.shortcut != null && (
        <kbd className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ background: 'rgba(15, 23, 42, 0.5)', color: isActive ? color : 'rgba(98, 112, 141, 0.5)', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
          {cmd.shortcut}
        </kbd>
      )}
    </li>
  );
}

function SearchRow({ result, idx, activeIndex, onActivate, onSelect }: {
  result: SearchResult;
  idx: number;
  activeIndex: number;
  onActivate: (idx: number) => void;
  onSelect: () => void;
}) {
  const isActive = idx === activeIndex;

  return (
    <li
      data-active={isActive ? '' : undefined}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
      style={isActive
        ? { background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-primary)' }
        : { color: 'var(--text-muted)' }}
      onMouseEnter={() => onActivate(idx)}
      onClick={onSelect}
    >
      <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ background: 'rgba(15, 23, 42, 0.6)', color: 'rgba(143, 160, 191, 0.6)', border: '1px solid rgba(71, 85, 105, 0.2)' }}>
        {KIND_LABEL[result.kind]}
      </span>
      <span className="flex-1 truncate font-medium">{result.title}</span>
      <span className="flex-shrink-0 truncate text-xs" style={{ color: 'rgba(98, 112, 141, 0.5)', maxWidth: '140px' }}>
        {result.subtitle}
      </span>
    </li>
  );
}
