import type { TFunction } from 'i18next';

/**
 * Turns an activation-code error from the API into a short title and a "what to do next" line,
 * in the app language. The API sends a stable `code` + `details` (see backend code-errors.ts).
 */
export interface CodeProblem {
  code: string;
  title: string;
  body: string;
  details: Record<string, any>;
  /** The server wants a decision (nothing was redeemed yet). */
  needsChoice: boolean;
}

const CHOICES = new Set(['FILE_CODE_PICK_FILE', 'CONFIRM_COURSE_FILES', 'CONFIRM_LECTURE', 'CONFIRM_COURSE']);

export function describeCodeError(t: TFunction, err: unknown): CodeProblem {
  const res = (err as any)?.response;
  const data = res?.data ?? {};
  const details: Record<string, any> = data.details ?? {};
  let code: string = data.code || '';
  if (!code) {
    if (!res) code = 'NETWORK';
    else if (res.status === 429) code = 'TOO_MANY';
    else if (res.status === 400 && Array.isArray(data.message)) code = 'CODE_NOT_FOUND';
    else code = 'UNKNOWN';
  }

  const level = (l?: string) => (l ? t(`codes.level.${l}`, l) : '');
  const kind = (k?: string) => (k ? t(`codes.kind.${k}`, k) : '');
  const date = details.usedAt
    ? new Date(details.usedAt).toLocaleDateString(t('codes.locale', 'en-GB'), { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const vars = {
    ...details,
    codeLevel: level(details.codeLevel),
    yourLevel: level(details.yourLevel),
    codeKind: kind(details.codeType ?? details.usedType),
    expectedKind: kind(details.expectedType),
    what: kind(details.what),
    date,
    usedOn: details.usedOn ?? '',
    title: details.title ?? details.courseTitle ?? '',
  };

  const known = t(`codes.errors.${code}.title`, { defaultValue: '' });
  if (!known) {
    const fallback = typeof data.message === 'string' ? data.message : '';
    return { code, title: t('codes.errors.UNKNOWN.title'), body: fallback || t('codes.errors.UNKNOWN.body'), details, needsChoice: false };
  }
  // A couple of cases read better with an extra sentence.
  let body = t(`codes.errors.${code}.body`, vars);
  if (code === 'CODE_ALREADY_USED_BY_YOU' && !details.usedOn) body = t('codes.errors.CODE_ALREADY_USED_BY_YOU.bodyNoTarget', vars);
  if (code === 'CONFIRM_COURSE_FILES') {
    if (details.staysLocked) body += ' ' + t('codes.errors.CONFIRM_COURSE_FILES.staysLocked', { count: details.staysLocked });
    if (details.thisFileStaysLocked) body += ' ' + t('codes.errors.CONFIRM_COURSE_FILES.thisFileStaysLocked');
  }
  return { code, title: t(`codes.errors.${code}.title`, vars), body, details, needsChoice: CHOICES.has(code) };
}

/** One line for places that show a single error string (lecture page, course page). */
export function codeErrorLine(t: TFunction, err: unknown): string {
  const p = describeCodeError(t, err);
  return `${p.title}. ${p.body}`;
}

/** Codes are three blocks of 8 characters; show what the student typed in that shape. */
export function tidyCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '');
}
