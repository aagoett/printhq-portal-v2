const FOLLOW_UP_LABELS = ['follow-up', 'follow up', 'next move', 'next step', 'promise', 'promised'];
const FOLLOW_UP_AT_LABELS = ['follow-up at', 'follow up at', 'next follow-up', 'next follow up', 'follow-up due', 'follow up due'];
const PROMISED_AT_LABELS = ['promised at', 'promise by', 'promised by', 'customer promised', 'promised date'];
const REMINDER_LABELS = ['reminder', 'remind', 'check back'];

const normalizeLabel = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const extractLineValue = (lines: string[], labels: string[]) => {
  for (const line of lines) {
    const normalized = normalizeLabel(line);
    const label = labels.find((entry) => normalized.startsWith(`${entry}:`));
    if (label) {
      return line.slice(line.indexOf(':') + 1).trim();
    }
  }
  return '';
};

const looksLikeDate = (value: string) => /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b)/i.test(value);

const parseDate = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || !looksLikeDate(trimmed)) return null;

  const isoLike = trimmed.includes('T') || /\d{4}-\d{2}-\d{2}/.test(trimmed);
  const withZone = /(?:Z|[+-]\d{2}:?\d{2}|\b(?:PST|PDT|MST|MDT|CST|CDT|EST|EDT|PT|MT|CT|ET)\b)/i.test(trimmed)
    ? trimmed
    : `${trimmed} PT`;

  const timestamp = Date.parse(isoLike ? trimmed : withZone);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

const normalizeIso = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseDate(value);
  if (parsed) return parsed;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export type JobFollowUpState = {
  summary: string;
  followUpText: string;
  promiseText: string;
  reminderText: string;
  nextFollowUpAt: string | null;
  promisedAt: string | null;
  reminderAt: string | null;
  displayAt: string | null;
  displayLabel: string;
  displayValue: string;
  displayStatus: 'missing' | 'scheduled' | 'today' | 'overdue' | 'cleared';
  badgeLabel: string;
  helperText: string;
  disciplineHint: string;
  ownerId?: string | null;
  status: 'open' | 'done';
  completedAt: string | null;
  source: 'structured' | 'notes';
};

export function getJobFollowUpState(jobOrNotes?: { follow_up_note?: string | null; follow_up_at?: string | null; follow_up_owner?: string | null; follow_up_status?: string | null; follow_up_completed_at?: string | null; notes?: string | null } | string | null): JobFollowUpState {
  const isStringInput = typeof jobOrNotes === 'string' || jobOrNotes == null;
  const notes = (isStringInput ? jobOrNotes : jobOrNotes?.notes) || '';
  const structuredNote = isStringInput ? '' : jobOrNotes?.follow_up_note || '';
  const structuredAt = isStringInput ? null : normalizeIso(jobOrNotes?.follow_up_at || null);
  const structuredStatus = (isStringInput ? null : jobOrNotes?.follow_up_status) || 'open';
  const structuredOwner = isStringInput ? null : jobOrNotes?.follow_up_owner || null;
  const completedAt = isStringInput ? null : normalizeIso(jobOrNotes?.follow_up_completed_at || null);

  const lines = String(notes || '')
    .split(/\n+/)
    .map((line: string) => line.trim())
    .filter(Boolean);

  const fallbackFollowUpText = extractLineValue(lines, FOLLOW_UP_LABELS);
  const fallbackPromiseText = extractLineValue(lines, ['promise', 'promised']);
  const fallbackReminderText = extractLineValue(lines, REMINDER_LABELS);
  const followUpAtRaw = extractLineValue(lines, FOLLOW_UP_AT_LABELS);
  const promisedAtRaw = extractLineValue(lines, PROMISED_AT_LABELS);
  const reminderAtRaw = extractLineValue(lines, ['reminder at', 'remind at', 'check back at']);

  const nextFollowUpAt = structuredStatus === 'done' ? null : (structuredAt || parseDate(followUpAtRaw));
  const promisedAt = structuredStatus === 'done' ? null : (parseDate(promisedAtRaw) || parseDate(fallbackPromiseText));
  const reminderAt = structuredStatus === 'done' ? null : (parseDate(reminderAtRaw) || parseDate(fallbackReminderText));
  const derivedText = structuredNote || fallbackFollowUpText || fallbackPromiseText || lines[0] || '';
  const displayAt = structuredStatus === 'done' ? null : (nextFollowUpAt || promisedAt || reminderAt);
  const displayLabel = structuredStatus === 'done'
    ? 'Follow-up closed'
    : nextFollowUpAt
      ? 'Next follow-up due'
      : promisedAt
        ? 'Promised by'
        : reminderAt
          ? 'Reminder at'
          : 'Follow-up timing';

  let displayStatus: JobFollowUpState['displayStatus'] = structuredStatus === 'done' ? 'cleared' : 'missing';
  let badgeLabel = structuredStatus === 'done' ? 'Follow-up cleared' : 'Follow-up missing';
  let helperText = structuredStatus === 'done'
    ? 'Follow-up cleared. Capture the next promise if more touches are needed.'
    : 'Use the follow-up fields to name the promise and when it is due.';

  if (structuredStatus !== 'done' && displayAt) {
    const diffMs = new Date(displayAt).getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 0) {
      displayStatus = 'overdue';
      badgeLabel = 'Follow-up overdue';
      helperText = `Missed ${displayLabel.toLowerCase()} — reset the promise or clear it with the customer.`;
    } else if (diffHours <= 24) {
      displayStatus = 'today';
      badgeLabel = 'Follow-up due soon';
      helperText = `${displayLabel} lands soon. Keep this visible until the customer gets an update.`;
    } else {
      displayStatus = 'scheduled';
      badgeLabel = 'Follow-up scheduled';
      helperText = `${displayLabel} is set. The next CSR should not have to guess the promised touchpoint.`;
    }
  } else if (structuredStatus !== 'done' && derivedText) {
    badgeLabel = 'Timing missing';
    helperText = 'You captured the promise, but not the date/time. Add a follow-up date/time and owner.';
  }

  const displayValue = structuredStatus === 'done'
    ? (completedAt ? `Cleared ${formatDateTime(completedAt)}` : 'Cleared')
    : displayAt
      ? formatDateTime(displayAt)
      : derivedText || 'Not captured yet';

  const summary = derivedText || 'No promised follow-up captured yet';
  const disciplineHint = 'Suggested: set a follow-up note + owner + time (e.g., “Call with stock option” at Mar 23 9:00 AM PT).';

  return {
    summary,
    followUpText: structuredNote || fallbackFollowUpText,
    promiseText: fallbackPromiseText,
    reminderText: fallbackReminderText,
    nextFollowUpAt,
    promisedAt,
    reminderAt,
    displayAt,
    displayLabel,
    displayValue,
    displayStatus,
    badgeLabel,
    helperText,
    disciplineHint,
    ownerId: structuredOwner,
    status: structuredStatus === 'done' ? 'done' : 'open',
    completedAt: completedAt,
    source: structuredNote || structuredAt ? 'structured' : 'notes',
  };
}
