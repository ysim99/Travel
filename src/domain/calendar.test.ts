import { describe, expect, it } from 'vitest'

import { buildCalendar, calendarTimingNote, googleCalendarUrl } from './calendar'
import type { TripEvent } from './trip'

const event = (overrides: Partial<TripEvent> = {}): TripEvent => ({
  id: 'stop',
  date: '2026-09-19',
  timeLabel: '6 a.m.',
  title: 'Dallas arrival',
  place: 'Dallas, TX',
  notes: '',
  travelMinutes: null,
  mapsUrl: null,
  websiteUrl: null,
  order: 1,
  revision: 1,
  comments: [],
  ...overrides,
})

const unfold = (calendar: string) => calendar.replace(/\r\n[ \t]/g, '')
const uids = (calendar: string) => unfold(calendar).match(/^UID:.+$/gm) ?? []

describe('calendar export', () => {
  it('exports Dallas morning in UTC with an explained one-hour placeholder', () => {
    const output = unfold(buildCalendar([event()], 'Dallas Weekend'))

    expect(output).toContain('DTSTART:20260919T110000Z\r\n')
    expect(output).toContain('DTEND:20260919T120000Z\r\n')
    expect(output).toContain('Original time: 6 a.m.')
    expect(output).toMatch(/1.hour placeholder/i)
    expect(output).toContain('America/Chicago')
  })

  it('preserves a complete range including its next-day UTC end', () => {
    const stop = event({ date: '2026-09-20', timeLabel: '6 p.m. - 8 p.m.' })
    const output = unfold(buildCalendar([stop], 'Dallas Weekend'))

    expect(output).toContain('DTSTART:20260920T230000Z\r\n')
    expect(output).toContain('DTEND:20260921T010000Z\r\n')
    expect(calendarTimingNote(stop)).toBeNull()
  })

  it.each(['', '10pm - 7pm', 'after lunch', '13 p.m.', '6 p.m. - 6 p.m.'])(
    'exports uncertain time %j as all-day for the supplied local date',
    (timeLabel) => {
      const stop = event({ date: '2026-09-20', timeLabel })
      const output = unfold(buildCalendar([stop], 'Dallas Weekend'))

      expect(output).toContain('DTSTART;VALUE=DATE:20260920\r\n')
      expect(output).toContain('DTEND;VALUE=DATE:20260921\r\n')
      expect(output).not.toMatch(/^DTSTART:\d+T/m)
      expect(calendarTimingNote(stop)).toMatch(/all.day/i)
      if (timeLabel) expect(output).toContain(`Original time: ${timeLabel}`)
    },
  )

  it('keeps Monday 11:30 p.m. as supplied and explains the time to verify', () => {
    const stop = event({ date: '2026-09-21', timeLabel: '11:30 p.m.' })
    const output = unfold(buildCalendar([stop], 'Dallas Weekend'))

    expect(output).toContain('DTSTART:20260922T043000Z\r\n')
    expect(output).toContain('DTEND:20260922T053000Z\r\n')
    expect(calendarTimingNote(stop)).toMatch(/verify.*11:30 p\.m\./i)
  })

  it('escapes text so itinerary wording cannot inject calendar properties', () => {
    const stop = event({
      title: 'Food, friends; fun\\night\r\nBEGIN:VEVENT',
      place: 'Dallas, TX; room\\2',
      notes: 'First line\nSecond line: 안녕',
    })
    const output = unfold(buildCalendar([stop], 'Dallas; Weekend'))

    expect(output).toContain('SUMMARY:Food\\, friends\\; fun\\\\night\\nBEGIN:VEVENT\r\n')
    expect(output).toContain('LOCATION:Dallas\\, TX\\; room\\\\2\r\n')
    expect(output).toContain('First line\\nSecond line: 안녕')
    expect(output).toContain('X-WR-CALNAME:Dallas\\; Weekend\r\n')
    expect(output.match(/^BEGIN:VEVENT\r?$/gm)).toHaveLength(1)
  })

  it('folds UTF-8 lines to 75 bytes without splitting Korean or emoji', () => {
    const title = '여행으로 함께 🧳 '.repeat(12)
    const output = buildCalendar([event({ title })], 'Dallas Weekend')

    expect(output).toContain('\r\n ')
    for (const line of output.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(unfold(output)).toContain(`SUMMARY:${title}\r\n`)
    expect(output.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
    expect(output.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('keeps identifiers stable across edits and avoids ID encoding collisions', () => {
    const first = event({ id: 'stop/a' })
    const second = event({ id: 'stop%2Fa' })
    const initialIds = uids(buildCalendar([first, second], 'Dallas Weekend'))
    const editedIds = uids(buildCalendar([
      { ...first, title: 'Changed', date: '2026-09-20', revision: 2 },
      second,
    ], 'Renamed trip'))

    expect(initialIds).toHaveLength(2)
    expect(new Set(initialIds).size).toBe(2)
    expect(editedIds).toEqual(initialIds)
  })

  it('exports only the latest revision if the same event appears twice', () => {
    const output = unfold(buildCalendar([
      event({ title: 'Current', revision: 3 }),
      event({ title: 'Stale', revision: 1 }),
    ], 'Dallas Weekend'))

    expect(uids(output)).toHaveLength(1)
    expect(output).toContain('SUMMARY:Current\r\n')
    expect(output).toContain('SEQUENCE:3\r\n')
  })

  it('resolves Chicago daylight saving independently of the device timezone', () => {
    const output = unfold(buildCalendar([
      event({ date: '2026-01-19', timeLabel: '6 a.m.' }),
    ], 'Dallas Weekend'))

    expect(output).toContain('DTSTART:20260119T120000Z\r\n')
  })
})

describe('Google Calendar drafts', () => {
  it('encodes user text as parameters and uses the same exact UTC range', () => {
    const title = 'AT&T = fun + 안녕 #weekend'
    const stop = event({ title, timeLabel: '4 p.m. - 5 p.m.', notes: 'a&b=c\nNext' })
    const url = new URL(googleCalendarUrl(stop))

    expect(url.origin).toBe('https://calendar.google.com')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe(title)
    expect(url.searchParams.get('location')).toBe('Dallas, TX')
    expect(url.searchParams.get('dates')).toBe('20260919T210000Z/20260919T220000Z')
    expect(url.searchParams.get('details')).toContain('a&b=c\nNext')
  })

  it('opens ambiguous times as an all-day draft with the original time in details', () => {
    const url = new URL(googleCalendarUrl(event({ timeLabel: '10pm - 7pm' })))

    expect(url.searchParams.get('dates')).toBe('20260919/20260920')
    expect(url.searchParams.get('details')).toContain('Original time: 10pm - 7pm')
    expect(url.searchParams.get('details')).toMatch(/all.day/i)
  })
})
