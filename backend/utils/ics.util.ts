/**
 * iCalendar (RFC 5545) output for the calendar export and the reminder email's
 * attachment. Pure: no database, no clock unless `now` is left out.
 *
 * Times are written in UTC (`DTSTART:20261105T120000Z`), the form RFC 5545
 * defines as an absolute instant, so every calendar shows them in its own
 * time zone without a VTIMEZONE block. Checked by scripts/calendar-check.ts.
 */

export interface IcsEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startAt: Date;
  /** Null when the event has no end; DTEND is then left out (RFC 5545 3.6.1). */
  endAt: Date | null;
  updatedAt: Date;
  /** The event's page in the web app. */
  url: string;
  cancelled?: boolean;
}

export interface CalendarOptions {
  /** Right-hand side of each UID: a stable host name, so a re-import updates instead of duplicating. */
  uidDomain: string;
  /** Shown by calendars that name an imported feed (X-WR-CALNAME). */
  name?: string;
  /** DTSTAMP: when this file was made. */
  now?: Date;
}

const CRLF = '\r\n';
const MAX_OCTETS = 75;

/** 2026-11-05T12:00:00.123Z -> 20261105T120000Z */
export function formatUtc(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date');
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
}

/**
 * A TEXT value (RFC 5545 3.3.11): backslash, semicolon and comma are escaped,
 * every line break becomes `\n`, and the other control characters, which TEXT
 * may not hold, are dropped.
 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\x00-\x08\x0A-\x1F\x7F]/g, '');
}

/**
 * Folds a content line at 75 octets (RFC 5545 3.1): CRLF plus one space, which
 * counts toward the next line's 75. Breaks between code points only, so a
 * multi-byte UTF-8 character (Vietnamese text, emoji) is never split.
 */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

function vevent(event: IcsEvent, opts: Required<Pick<CalendarOptions, 'uidDomain' | 'now'>>): string[] {
  const description = [event.description.trim(), `Event page: ${event.url}`].filter(Boolean).join('\n\n');
  return [
    'BEGIN:VEVENT',
    `UID:event-${event.id}@${opts.uidDomain}`,
    `DTSTAMP:${formatUtc(opts.now)}`,
    `DTSTART:${formatUtc(event.startAt)}`,
    ...(event.endAt ? [`DTEND:${formatUtc(event.endAt)}`] : []),
    `LAST-MODIFIED:${formatUtc(event.updatedAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(event.location.trim() ? [`LOCATION:${escapeText(event.location.trim())}`] : []),
    `URL:${event.url}`,
    `STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
  ];
}

/** A whole VCALENDAR with one VEVENT per event, CRLF line endings, folded. */
export function buildCalendar(events: IcsEvent[], opts: CalendarOptions): string {
  const now = opts.now ?? new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VolunteerHub//Event calendar//EN',
    'CALSCALE:GREGORIAN',
    ...(opts.name ? [`X-WR-CALNAME:${escapeText(opts.name)}`] : []),
    ...events.flatMap((e) => vevent(e, { uidDomain: opts.uidDomain, now })),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** An ASCII file name for Content-Disposition: "Dọn rác bãi biển" -> "don-rac-bai-bien.ics". */
export function icsFilename(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `${slug || 'event'}.ics`;
}
