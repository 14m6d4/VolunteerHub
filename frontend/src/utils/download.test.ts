import { describe, expect, it } from 'vitest'
import { filenameFromDisposition } from './download'

describe('filenameFromDisposition', () => {
  it('reads the quoted file name the calendar export sends', () => {
    expect(filenameFromDisposition('attachment; filename="don-rac-bai-bien.ics"', 'event.ics')).toBe('don-rac-bai-bien.ics')
  })

  it('reads an unquoted file name', () => {
    expect(filenameFromDisposition('attachment; filename=events.ics; size=10', 'x.ics')).toBe('events.ics')
  })

  it('prefers the UTF-8 form when both are present', () => {
    expect(filenameFromDisposition(
      `attachment; filename="don-rac.ics"; filename*=UTF-8''D%E1%BB%8Dn%20r%C3%A1c.ics`, 'x.ics',
    )).toBe('Dọn rác.ics')
  })

  it('falls back to the plain form when the UTF-8 one is malformed', () => {
    expect(filenameFromDisposition(`attachment; filename="plain.ics"; filename*=UTF-8''%E0%A4%A`, 'x.ics')).toBe('plain.ics')
  })

  it('uses the fallback without a header or a name', () => {
    expect(filenameFromDisposition(null, 'event.ics')).toBe('event.ics')
    expect(filenameFromDisposition('attachment', 'event.ics')).toBe('event.ics')
    expect(filenameFromDisposition('attachment; filename=""', 'event.ics')).toBe('event.ics')
  })
})
