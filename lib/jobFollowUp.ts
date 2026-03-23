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
  displayStatus: 'missing' | 'scheduled' | 'today' | 'overdue';
  badgeLabel: string;
  helperText: string;
  disciplineHint: string;
};

export function getJobFollowUpState(notes?: string | null): JobFollowUpState {
  const lines = String(notes || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const followUpText = extractLineValue(lines, FOLLOW_UP_LABELS);
  const promiseText = extractLineValue(lines, ['promise', 'promised']);
  const reminderText = extractLineValue(lines, REMINDER_LABELS);
  const followUpAtRaw = extractLineValue(lines, FOLLOW_UP_AT_LABELS);
  const promisedAtRaw = extractLineValue(lines, PROMISED_AT_LABELS);
  const reminderAtRaw = extractLineValue(lines, ['reminder at', 'remind at', 'check back at']);

  const derivedText = followUpText || promiseText || lines[0] || '';
  const nextFollowUpAt = parseDate(followUpAtRaw) || parseDate(followUpText);
  const promisedAt = parseDate(promisedAtRaw) || parseDate(promiseText);
  const reminderAt = parseDate(reminderAtRaw) || parseDate(reminderText);
  const displayAt = nextFollowUpAt || promisedAt || reminderAt;
  const displayLabel = nextFollowUpAt ? 'Next follow-up due' : promisedAt ? 'Promised by' : reminderAt ? 'Reminder at' : 'Follow-up timing';

  let displayStatus: JobFollowUpState['displayStatus'] = 'missing';
  let badgeLabel = 'Follow-up missing';
  let helperText = 'Use the handoff note to name the next follow-up and when it is due.';
  if (displayAt) {
    const diffMs = new Date(displayAt).getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 0) {
      displayStatus = 'overdue';
      badgeLabel = 'Follow-up overdue';
      helperText = `Missed ${displayLabel.toLowerCase()} — clear it or reset the customer promise.`;
    } else if (diffHours <= 24) {
      displayStatus = 'today';
      badgeLabel = 'Follow-up due soon';
      helperText = `${displayLabel} lands soon. Keep the reminder visible until the customer gets an update.`;
    } else {
      displayStatus = 'scheduled';
      badgeLabel = 'Follow-up scheduled';
      helperText = `${displayLabel} is set. The next CSR should not have to guess the promised touchpoint.`;
    }
  } else if (derivedText) {
    badgeLabel = 'Timing missing';
    helperText = 'You captured the promise, but not the date/time. Add a “Follow-up at:” or “Promised by:” line.';
  }

  const displayValue = displayAt ? formatDateTime(displayAt) : derivedText || 'Not captured yet';
  const summary = derivedText || 'No promised follow-up captured yet';
  const disciplineHint = 'Suggested handoff block: “Follow-up: call with revised stock option” + “Follow-up at: Mar 23 9:00 AM PT” + optional “Promised by: Mar 23 12:00 PM PT”.';

  return {
    summary,
    followUpText,
    promiseText,
    reminderText,
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
  };
}
