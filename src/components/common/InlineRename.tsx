import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import toast from 'react-hot-toast';
import { Check, Loader2, Pencil, X } from 'lucide-react';

function errorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || e?.message || 'Could not save the new name.';
}

/**
 * Click-to-rename text. Enter saves, Escape cancels. Clicks never bubble to the row it sits in
 * (so it can live inside an expandable header without toggling it).
 */
export function InlineRename({
  value,
  onSave,
  className = '',
  inputClassName = '',
  label = 'Rename',
  maxLength = 255,
}: {
  value: string;
  onSave: (next: string) => Promise<unknown>;
  className?: string;
  inputClassName?: string;
  label?: string;
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const save = async () => {
    const next = draft.trim();
    if (!next) {
      toast.error('The name cannot be empty.');
      return;
    }
    if (next === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
      toast.success('Renamed.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <span className={`group/rename inline-flex items-center gap-1.5 min-w-0 max-w-full ${className}`}>
        <span dir="auto" className="truncate">{value}</span>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setEditing(true);
          }}
          onKeyDown={stop}
          className="shrink-0 p-1 rounded-md text-theme-muted opacity-60 hover:opacity-100 hover:text-accent-600 dark:hover:text-accent-300 hover:bg-accent-500/10 transition"
          aria-label={label}
          title={label}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 w-full ${className}`} onClick={stop} onMouseDown={stop}>
      <input
        ref={inputRef}
        dir="auto"
        value={draft}
        maxLength={maxLength}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            void save();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        aria-label={label}
        className={`flex-1 min-w-0 rounded-lg border border-accent-500/50 bg-theme-card px-2 py-1 text-sm text-theme-text outline-none focus:border-accent-500 ${inputClassName}`}
      />
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          void save();
        }}
        disabled={saving}
        className="shrink-0 p-1 rounded-md text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
        aria-label="Save name"
        title="Save"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          cancel();
        }}
        disabled={saving}
        className="shrink-0 p-1 rounded-md text-theme-muted hover:bg-theme-card"
        aria-label="Cancel rename"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </span>
  );
}
