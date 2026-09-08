import type { TripEvent } from './trip'

const TIMEZONE = 'America/Chicago'
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const chicagoClock = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

type CalendarTiming = {
  allDay: boolean
  start: string
  end: string
  note: string | null
}

function dateTime(value: number): string {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function parseTime(value: string): number | null {
  const match = /^(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?\s*m\.?$/i.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  if (hour < 1 || hour > 12) return null
  return (hour % 12 + (match[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(match[2] ?? 0)
}

// Resolve local wall time using the named timezone, never the device timezone.
function chicagoInstant(date: string, minutes: number): number | null {
  const wallTime = Date.parse(`${date}T00:00:00Z`) + minutes * MINUTE
  let instant = wallTime
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(chicagoClock.formatToParts(instant).map(({ type, value }) => [type, value]))
    const displayedWallTime = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    )
    const correction = wallTime - displayedWallTime
    if (correction === 0) return instant
    instant += correction
  }
  // A nonexistent wall time at a daylight-saving transition needs review.
  return null
}

function timing(event: TripEvent): CalendarTiming {
  const dayStart = Date.parse(`${event.date}T00:00:00Z`)
  const allDay = (note: string): CalendarTiming => ({
    allDay: true,
    start: dateTime(dayStart).slice(0, 8),
    end: dateTime(dayStart + DAY).slice(0, 8),
    note,
  })
  const label = event.timeLabel.trim()
  if (!label) return allDay('Time is open. Saved as an all-day event; choose a time when ready.')

  const range = label.split(/\s*[-–—]\s*/)
  const startMinutes = parseTime(range[0])
  const endMinutes = range.length === 2 ? parseTime(range[1]) : null
  if (startMinutes === null || range.length > 2 || (range.length === 2 && endMinutes === null)) {
    return allDay('Time needs review. Saved as an all-day event with the original time unchanged.')
  }
  if (endMinutes !== null && endMinutes <= startMinutes) {
    return allDay('The end time is not after the start time. Saved as an all-day event; review the original range.')
  }

  const start = chicagoInstant(event.date, startMinutes)
  const end = endMinutes === null ? (start === null ? null : start + HOUR) : chicagoInstant(event.date, endMinutes)
  if (start === null || end === null) {
    return allDay('This local time needs review. Saved as an all-day event with the original time unchanged.')
  }
  const notes = []
  if (endMinutes === null) notes.push('A 1-hour placeholder is used because no end time was supplied.')
  if (event.date === '2026-09-21' && startMinutes === 23 * 60 + 30) {
    notes.push('Verify the supplied 11:30 p.m. time; it is preserved as late night on Monday.')
  }
  return { allDay: false, start: dateTime(start), end: dateTime(end), note: notes.join(' ') || null }
}

function description(event: TripEvent, schedule: CalendarTiming): string {
  return [
    event.notes,
    `Original time: ${event.timeLabel || 'Time open'}`,
    `Itinerary timezone: ${TIMEZONE}`,
    schedule.note,
    event.travelMinutes === null ? null : `Travel: ${event.travelMinutes} minutes`,
    event.mapsUrl ? `Map: ${event.mapsUrl}` : null,
    event.websiteUrl ? `Website: ${event.websiteUrl}` : null,
  ].filter(Boolean).join('\n\n')
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

function foldLine(line: string): string {
  const encoder = new TextEncoder()
  let result = ''
  let bytes = 0
  for (const character of line) {
    const length = encoder.encode(character).length
    if (bytes + length > 75) {
      result += '\r\n '
      bytes = 1
    }
    result += character
    bytes += length
  }
  return result
}

/** An importable snapshot; later itinerary edits do not automatically sync. */
export function buildCalendar(events: TripEvent[], tripTitle: string): string {
  const latestEvents = new Map<string, TripEvent>()
  for (const event of events) {
    if ((latestEvents.get(event.id)?.revision ?? -1) <= event.revision) latestEvents.set(event.id, event)
  }
  const stamp = dateTime(Date.now())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dallas Weekend Scheduler//Trip Calendar//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(tripTitle)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
  ]
  for (const event of latestEvents.values()) {
    const schedule = timing(event)
    const dateType = schedule.allDay ? ';VALUE=DATE' : ''
    lines.push(
      'BEGIN:VEVENT',
      `UID:dallas-2026-${encodeURIComponent(event.id)}@dallas-weekend.local`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${Math.max(0, Math.trunc(event.revision))}`,
      `DTSTART${dateType}:${schedule.start}`,
      `DTEND${dateType}:${schedule.end}`,
      `SUMMARY:${escapeText(event.title)}`,
      `LOCATION:${escapeText(event.place)}`,
      `DESCRIPTION:${escapeText(description(event, schedule))}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

/** Opens a prefilled draft; the user chooses whether to save in Google Calendar. */
export function googleCalendarUrl(event: TripEvent): string {
  const schedule = timing(event)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${schedule.start}/${schedule.end}`,
    stz: TIMEZONE,
    etz: TIMEZONE,
    details: description(event, schedule),
    location: event.place,
  })
  return `https://calendar.google.com/calendar/r/eventedit?${params}`
}

export function calendarTimingNote(event: TripEvent): string | null {
  return timing(event).note
}
