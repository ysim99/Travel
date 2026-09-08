export type TripComment = {
  id: string
  eventId: string
  displayName: string
  body: string
  createdAt: string
}

export type TripEvent = {
  id: string
  date: string
  timeLabel: string
  title: string
  place: string
  notes: string
  travelMinutes: number | null
  mapsUrl: string | null
  websiteUrl: string | null
  order: number
  revision: number
  comments: TripComment[]
}

export type TripDay = {
  date: string
  shortLabel: string
  weekday: string
  events: TripEvent[]
}

export type TripSnapshot = {
  id: string
  title: string
  destination: string
  dateRange: string
  timezone: string
  days: TripDay[]
}

export type EventDraft = Omit<TripEvent, 'id' | 'revision' | 'comments'>

export type CommentDraft = {
  displayName: string
  body: string
}

export function sortEvents(events: TripEvent[]): TripEvent[] {
  return [...events].sort((a, b) => a.order - b.order)
}

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function formatEventTime(event: Pick<TripEvent, 'timeLabel'>): string {
  if (!event.timeLabel.trim()) return 'Time open'
  return event.timeLabel.replace(/\s+-\s+/g, ' – ')
}

export function isValidShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{12,128}$/.test(token)
}

export function nextEventOrder(events: TripEvent[]): number {
  return events.reduce((highest, item) => Math.max(highest, item.order), 0) + 1
}
