import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Short reason shown when disabled. */
  hint?: string;
  /** Draw a divider above this item. */
  separated?: boolean;
}

/**
 * "⋯" button with a dropdown of row actions. The menu is portalled to <body> with fixed positioning,
 * so table containers with overflow never clip it. Keyboard: Enter/Space opens, arrows move, Esc closes.
 */
export function ActionsMenu({ items, label = 'More actions' }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 224;
    const estHeight = items.length * 40 + 16;
    const up = r.bottom + estHeight > window.innerHeight - 8 && r.top > estHeight;
    const left = rtl ? Math.max(8, r.left) : Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, up });
  }, [open, items.length, rtl]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    // Focus the first item for keyboard users.
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-2 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-card border border-transparent hover:border-theme-border transition-colors"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[200] rounded-xl border border-theme-border bg-theme-secondary shadow-2xl py-1.5 animate-scale-in"
            style={{
              left: pos.left,
              width: pos.width,
              top: pos.up ? undefined : pos.top,
              bottom: pos.up ? window.innerHeight - pos.top : undefined,
            }}
          >
            {items.map((item, i) => (
              <div key={i}>
                {item.separated && <div className="my-1.5 border-t border-theme-border" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.disabled ? item.hint : undefined}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-start transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                    item.danger
                      ? 'text-error-600 dark:text-error-300 hover:bg-error-500/10 focus:bg-error-500/10'
                      : 'text-theme-text hover:bg-theme-card focus:bg-theme-card'
                  }`}
                >
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center opacity-80">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
