import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ContextMenuItem = {
  id: string;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
};

interface ContextMenuProps {
  open: boolean;
  position: { x: number; y: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
  onAction: (itemId: string) => void;
}

export function ContextMenu({ open, position, items, onClose, onAction }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const enabledItems = useMemo(
    () => items.map((item, index) => ({ item, index })).filter(({ item }) => !item.separator && !item.disabled),
    [items]
  );

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(enabledItems[0]?.index ?? -1);
  }, [enabledItems, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (enabledItems.length === 0) return;

      const currentEnabledIndex = enabledItems.findIndex(({ index }) => index === activeIndex);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = currentEnabledIndex < 0 ? 0 : (currentEnabledIndex + 1) % enabledItems.length;
        setActiveIndex(enabledItems[nextIndex].index);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex =
          currentEnabledIndex < 0 ? enabledItems.length - 1 : (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length;
        setActiveIndex(enabledItems[nextIndex].index);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        const activeItem = items[activeIndex];
        if (!activeItem || activeItem.separator || activeItem.disabled) return;
        event.preventDefault();
        onAction(activeItem.id);
      }
    };

    const handleViewportChange = () => onClose();

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [activeIndex, enabledItems, items, onAction, onClose, open]);

  if (!open || !position) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = 280;
  const estimatedHeight = Math.min(420, items.length * 56 + 24);
  const left = Math.min(position.x, viewportWidth - width - 16);
  const top = Math.min(position.y, viewportHeight - estimatedHeight - 16);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      className="fixed z-[120] min-w-[280px] overflow-hidden rounded-2xl border border-slate-700/80 bg-[linear-gradient(180deg,rgba(18,26,45,0.96),rgba(8,12,24,0.98))] p-1.5 shadow-[0_28px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      style={{ left, top }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={`${item.id}-${index}`} className="my-1 h-px bg-slate-700/80" />;
        }

        const active = index === activeIndex;
        const tone = item.destructive
          ? active
            ? 'bg-red-500/12 text-red-100'
            : 'text-red-200/90'
          : active
            ? 'bg-sky-500/12 text-white'
            : 'text-slate-200';

        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => {
              if (item.disabled) return;
              onAction(item.id);
            }}
            className={[
              'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
              item.disabled ? 'cursor-not-allowed text-slate-500 opacity-60' : tone
            ].join(' ')}
          >
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-sm font-medium">{item.label}</div>
              {item.description ? <div className="mt-0.5 text-xs text-slate-400">{item.description}</div> : null}
            </div>
          </button>
        );
      })}
    </div>,
    document.body
  );
}
