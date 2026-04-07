import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ThemedPanel } from '@renderer/features/personalization/primitives';

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
    <ThemedPanel
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      elevated
      className="fixed z-[120] min-w-[280px] overflow-hidden rounded-2xl p-1.5 backdrop-blur-xl"
      style={{ left, top, boxShadow: '0 28px 100px rgba(0,0,0,0.55)' }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={`${item.id}-${index}`} className="my-1 h-px" style={{ background: 'var(--border-subtle)' }} />;
        }

        const active = index === activeIndex;
        const tone = item.destructive
          ? active
            ? { background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }
            : { color: 'var(--status-danger-text)' }
          : active
            ? { background: 'var(--status-accent-bg)', color: 'var(--text-primary)' }
            : { color: 'var(--text-primary)' };

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
            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
            style={item.disabled ? { color: 'var(--text-dim)', opacity: 0.6 } : tone}
          >
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}>
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-sm font-medium">{item.label}</div>
              {item.description ? <div className="mt-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>{item.description}</div> : null}
            </div>
          </button>
        );
      })}
    </ThemedPanel>,
    document.body
  );
}
