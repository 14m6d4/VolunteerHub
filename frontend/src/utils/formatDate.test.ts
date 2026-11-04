import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDate, formatDateTime, formatEventDate, formatRelativeTime, formatTime } from './formatDate'

// Dates are built in local time, so the expected strings hold in any time zone.
const NOW = new Date(2026, 10, 4, 12, 0, 0)
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(NOW.getTime() - ms)

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [0, 'Just now'],
    [59 * 1000, 'Just now'],
    [MIN, '1 min ago'],
    [2 * MIN, '2 mins ago'],
    [59 * MIN, '59 mins ago'],
    [HOUR, '1 hour ago'],
    [23 * HOUR, '23 hours ago'],
    [DAY, '1 day ago'],
    [6 * DAY, '6 days ago'],
  ])('%i ms ago is %j', (ms, expected) => {
    expect(formatRelativeTime(ago(ms))).toBe(expected)
  })

  it('accepts an ISO string', () => {
    expect(formatRelativeTime(ago(5 * MIN).toISOString())).toBe('5 mins ago')
  })

  it('shows the full date and time from a week ago', () => {
    expect(formatRelativeTime(new Date(2026, 9, 28, 9, 5))).toBe('Oct 28, 2026, 09:05 AM')
  })

  it('treats a time in the future as just now', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + HOUR))).toBe('Just now')
  })
})

describe('absolute formatters', () => {
  const d = new Date(2026, 0, 5, 14, 3, 30)

  it('formatDate shows the date only', () => {
    expect(formatDate(d)).toBe('Jan 5, 2026')
  })

  it('formatDateTime shows date and time', () => {
    expect(formatDateTime(d)).toBe('Jan 5, 2026, 02:03 PM')
  })

  it('formatTime shows the time only', () => {
    expect(formatTime(d)).toBe('02:03 PM')
  })

  it('accepts ISO strings', () => {
    expect(formatDate(d.toISOString())).toBe('Jan 5, 2026')
  })
})

describe('formatEventDate', () => {
  it('rounds to the nearest 5 minutes', () => {
    expect(formatEventDate(new Date(2026, 0, 5, 14, 2, 59))).toBe('Jan 5, 2026, 2:00 PM')
    expect(formatEventDate(new Date(2026, 0, 5, 14, 3))).toBe('Jan 5, 2026, 2:05 PM')
  })

  it('carries a round-up into the next hour and day', () => {
    expect(formatEventDate(new Date(2026, 0, 5, 9, 58))).toBe('Jan 5, 2026, 10:00 AM')
    expect(formatEventDate(new Date(2026, 11, 31, 23, 58))).toBe('Jan 1, 2027, 12:00 AM')
  })

  it('does not change the date passed in', () => {
    const d = new Date(2026, 0, 5, 14, 3)
    formatEventDate(d)
    expect(d.getMinutes()).toBe(3)
  })
})
