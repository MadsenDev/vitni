import { forwardRef, type CSSProperties, type HTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

function joinClassNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

function toneStyle(tone: Tone): CSSProperties {
  switch (tone) {
    case 'accent':
      return {
        borderColor: 'var(--status-accent-border)',
        background: 'var(--status-accent-bg)',
        color: 'var(--status-accent-text)'
      };
    case 'success':
      return {
        borderColor: 'var(--status-success-border)',
        background: 'var(--status-success-bg)',
        color: 'var(--status-success-text)'
      };
    case 'warning':
      return {
        borderColor: 'var(--status-warning-border)',
        background: 'var(--status-warning-bg)',
        color: 'var(--status-warning-text)'
      };
    case 'danger':
      return {
        borderColor: 'var(--status-danger-border)',
        background: 'var(--status-danger-bg)',
        color: 'var(--status-danger-text)'
      };
    default:
      return {
        borderColor: 'var(--border-subtle)',
        background: 'var(--surface-base)',
        color: 'var(--text-primary)'
      };
  }
}

export const ThemedPanel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { elevated?: boolean }>(function ThemedPanel(
  {
    className,
    elevated = false,
    style,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={joinClassNames(elevated ? 'panel-elevated' : 'panel-surface', className)}
      style={style}
      {...props}
    />
  );
});

export function ThemedCard({
  className,
  style,
  tone = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return (
    <div
      className={joinClassNames('rounded-2xl border', className)}
      style={{ ...toneStyle(tone), ...style }}
      {...props}
    />
  );
}

export function ThemedSection({
  className,
  style,
  elevated = false,
  ...props
}: HTMLAttributes<HTMLElement> & { elevated?: boolean }) {
  return (
    <section
      className={joinClassNames('rounded-[24px] border p-4', className)}
      style={{
        borderColor: 'var(--border-subtle)',
        background: elevated ? 'var(--surface-raised)' : 'var(--surface-base)',
        ...style
      }}
      {...props}
    />
  );
}

export function ThemedButton({
  className,
  variant = 'default',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'accent' | 'quiet' | 'danger' | 'success' | 'warning';
}) {
  const variantStyle: CSSProperties =
    variant === 'accent'
      ? {
          borderColor: 'var(--status-accent-border)',
          background: 'var(--status-accent-bg)',
          color: 'var(--status-accent-text)'
        }
      : variant === 'quiet'
        ? {
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-base)',
            color: 'var(--text-muted)'
          }
        : variant === 'danger'
          ? {
              borderColor: 'var(--status-danger-border)',
              background: 'var(--status-danger-bg)',
              color: 'var(--status-danger-text)'
            }
          : variant === 'success'
            ? {
                borderColor: 'var(--status-success-border)',
                background: 'var(--status-success-bg)',
                color: 'var(--status-success-text)'
              }
            : variant === 'warning'
              ? {
                  borderColor: 'var(--status-warning-border)',
                  background: 'var(--status-warning-bg)',
                  color: 'var(--status-warning-text)'
                }
          : {
              borderColor: 'var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)'
            };

  return (
    <button
      className={joinClassNames(
        'rounded-xl border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      style={{ ...variantStyle, ...style }}
      {...props}
    />
  );
}

export const ThemedInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function ThemedInput(
  {
    className,
    style,
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      className={joinClassNames(
        'w-full rounded-2xl border px-3 py-2 text-sm outline-none transition placeholder:opacity-100 focus:ring-2 focus:ring-sky-500/25',
        className
      )}
      style={{
        borderColor: 'var(--input-border)',
        background: 'var(--input-bg)',
        color: 'var(--input-text)',
        ...style
      }}
      {...props}
    />
  );
});

export function ThemedSelect({
  className,
  style,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={joinClassNames(
        'rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-sky-500/25',
        className
      )}
      style={{
        borderColor: 'var(--input-border)',
        background: 'var(--input-bg)',
        color: 'var(--input-text)',
        ...style
      }}
      {...props}
    />
  );
}

export function ThemedTextarea({
  className,
  style,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={joinClassNames(
        'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition placeholder:opacity-100 focus:ring-2 focus:ring-sky-500/25',
        className
      )}
      style={{
        borderColor: 'var(--input-border)',
        background: 'var(--input-bg)',
        color: 'var(--input-text)',
        ...style
      }}
      {...props}
    />
  );
}

export function ThemedBadge({
  className,
  tone = 'default',
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={joinClassNames('rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]', className)}
      style={{ ...toneStyle(tone), ...style }}
      {...props}
    />
  );
}
