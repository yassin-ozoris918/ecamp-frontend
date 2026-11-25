import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Loader2, MessageCircleQuestion, Send, ShieldCheck, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { api } from '../../lib/api';
import { EcampMark } from '../common/EcampLogo';

interface BotReply {
  id: string | null;
  type: 'answer' | 'no_match' | 'refused';
  text: string;
  link?: { url: string; label: string };
  suggestions: { id: string; question: string }[];
}

type Msg =
  | { from: 'me'; text: string }
  | { from: 'bot'; reply: BotReply; rated?: boolean }
  | { from: 'bot-error'; text: string };

const MAX_LEN = 500;

/**
 * Support assistant for students. It only shows answers written by the E.Camp team (or a fixed
 * "I can't help with that"), never free AI text, and has no access to accounts or codes.
 */
export function SupportChat({ signedIn = true, raised = false }: { signedIn?: boolean; raised?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<{ id: string; question: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    api
      .get('/support-bot/suggestions', { params: { lang } })
      .then((r) => setSuggestions(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSuggestions([]));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, lang]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const errorText = (e: any) => (e?.response?.status === 429 ? t('supportBot.tooMany') : t('supportBot.error'));

  const send = async (text: string) => {
    const message = text.trim().slice(0, MAX_LEN);
    if (!message || busy) return;
    setInput('');
    setMessages((m) => [...m, { from: 'me', text: message }]);
    setBusy(true);
    try {
      const r = await api.post('/support-bot/ask', { message, lang });
      setMessages((m) => [...m, { from: 'bot', reply: r.data }]);
    } catch (e) {
      setMessages((m) => [...m, { from: 'bot-error', text: errorText(e) }]);
    }
    setBusy(false);
  };

  const pick = async (s: { id: string; question: string }) => {
    if (busy) return;
    setMessages((m) => [...m, { from: 'me', text: s.question }]);
    setBusy(true);
    try {
      const r = await api.post('/support-bot/pick', { faqId: s.id, lang });
      setMessages((m) => [...m, { from: 'bot', reply: r.data }]);
    } catch (e) {
      setMessages((m) => [...m, { from: 'bot-error', text: errorText(e) }]);
    }
    setBusy(false);
  };

  const rate = async (index: number, id: string, helpful: boolean) => {
    setMessages((m) => m.map((msg, i) => (i === index && msg.from === 'bot' ? { ...msg, rated: true } : msg)));
    api.post('/support-bot/feedback', { id, helpful }).catch(() => undefined);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const openLink = (url: string) => {
    if (url.startsWith('/')) {
      window.location.hash = url;
      setOpen(false);
    } else if (url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const position = raised ? 'bottom-20 lg:bottom-6' : 'bottom-5 sm:bottom-6';

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed ${position} end-4 sm:end-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent-500 hover:bg-accent-400 text-white ps-3 pe-4 py-3 shadow-lg shadow-accent-500/30 transition-colors`}
          aria-label={t('supportBot.open')}
        >
          <MessageCircleQuestion className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">{t('supportBot.button')}</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={t('supportBot.title')}
          className={`fixed z-50 inset-x-3 ${raised ? 'bottom-20 lg:bottom-6' : 'bottom-3 sm:bottom-6'} sm:inset-x-auto sm:end-6 sm:w-[380px] h-[min(600px,calc(100vh-7rem))] flex flex-col rounded-2xl border border-theme-border bg-theme-bg shadow-2xl overflow-hidden animate-scale-in`}
        >
          <header className="flex items-center gap-3 px-4 py-3 border-b border-theme-border bg-theme-card/60">
            <span className="w-9 h-9 rounded-xl bg-white ring-1 ring-black/5 flex items-center justify-center shrink-0">
              <EcampMark className="w-7 h-7" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-theme-text leading-tight">{t('supportBot.title')}</p>
              <p className="text-[11px] text-theme-muted truncate">{t('supportBot.subtitle')}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-card" aria-label={t('common.close', 'Close')}>
              <X className="w-5 h-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3" aria-live="polite">
            <BotBubble>
              <p className="whitespace-pre-line">{t('supportBot.greeting')}</p>
            </BotBubble>
            {messages.length === 0 && suggestions.length > 0 && <Chips items={suggestions} onPick={pick} disabled={busy} label={t('supportBot.common')} />}

            {messages.map((m, i) =>
              m.from === 'me' ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-ee-md bg-accent-500 text-white px-3.5 py-2 text-sm whitespace-pre-line break-words" dir="auto">
                    {m.text}
                  </p>
                </div>
              ) : m.from === 'bot-error' ? (
                <BotBubble key={i} tone="error">
                  {m.text}
                </BotBubble>
              ) : (
                <div key={i} className="space-y-2">
                  <BotBubble tone={m.reply.type === 'refused' ? 'warning' : 'default'}>
                    <p className="whitespace-pre-line break-words" dir="auto">
                      {m.reply.text}
                    </p>
                    {m.reply.link && (signedIn || !m.reply.link.url.startsWith('/')) && (
                      <button
                        type="button"
                        onClick={() => openLink(m.reply.link!.url)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent-500/10 text-accent-700 dark:text-accent-200 px-3 py-1.5 text-xs font-semibold hover:bg-accent-500/20"
                      >
                        {m.reply.link.label}
                        {m.reply.link.url.startsWith('https://') && <ExternalLink className="w-3 h-3" />}
                      </button>
                    )}
                    {m.reply.type === 'answer' && m.reply.id && (
                      <div className="mt-2 pt-2 border-t border-theme-border/60 flex items-center gap-2 text-[11px] text-theme-muted">
                        {m.rated ? (
                          <span>{t('supportBot.thanks')}</span>
                        ) : (
                          <>
                            <span>{t('supportBot.helpful')}</span>
                            <button type="button" onClick={() => rate(i, m.reply.id!, true)} className="p-1 rounded hover:bg-theme-card hover:text-secondary-600" aria-label={t('supportBot.yes')}>
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => rate(i, m.reply.id!, false)} className="p-1 rounded hover:bg-theme-card hover:text-error-500" aria-label={t('supportBot.no')}>
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </BotBubble>
                  {m.reply.suggestions?.length > 0 && <Chips items={m.reply.suggestions} onPick={pick} disabled={busy} label={m.reply.type === 'answer' ? t('supportBot.related') : t('supportBot.didYouMean')} />}
                </div>
              ),
            )}
            {busy && (
              <BotBubble>
                <Loader2 className="w-4 h-4 animate-spin text-theme-muted" />
              </BotBubble>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-theme-border p-3 space-y-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                dir="auto"
                rows={1}
                value={input}
                maxLength={MAX_LEN}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('supportBot.placeholder')}
                className="flex-1 resize-none max-h-28 rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-accent-400"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-accent-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-accent-400 transition-colors"
                aria-label={t('supportBot.send')}
              >
                <Send className="w-4 h-4 rtl:-scale-x-100" />
              </button>
            </div>
            <p className="flex items-center gap-1.5 text-[10px] text-theme-muted">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              {t('supportBot.privacy')}
            </p>
          </form>
        </section>
      )}
    </>
  );
}

function BotBubble({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'warning' | 'error' }) {
  const toneClass =
    tone === 'warning'
      ? 'bg-warning-500/10 border-warning-500/20'
      : tone === 'error'
        ? 'bg-error-500/10 border-error-500/20'
        : 'bg-theme-card border-theme-border';
  return <div className={`max-w-[90%] rounded-2xl rounded-ss-md border px-3.5 py-2.5 text-sm text-theme-text ${toneClass}`}>{children}</div>;
}

function Chips({ items, onPick, disabled, label }: { items: { id: string; question: string }[]; onPick: (s: { id: string; question: string }) => void; disabled: boolean; label: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-theme-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            dir="auto"
            className="text-start rounded-xl border border-accent-500/30 bg-accent-500/5 px-3 py-1.5 text-xs text-accent-700 dark:text-accent-200 hover:bg-accent-500/15 disabled:opacity-50 transition-colors"
          >
            {s.question}
          </button>
        ))}
      </div>
    </div>
  );
}
