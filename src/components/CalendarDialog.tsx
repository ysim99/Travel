import { useState } from 'react'
import { buildCalendar, calendarTimingNote, googleCalendarUrl } from '../domain/calendar'
import type { TripEvent } from '../domain/trip'
import { Modal } from './Modal'
import { Icon } from './Icons'
import { detailsForStop, mapForStop } from '../data/stopDetails'

export function CalendarDialog({ events, title, onClose }: { events: TripEvent[]; title: string; onClose: () => void }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const calendarEvents = events.map((event) => {
    const details = detailsForStop(event.id)
    return { ...event, mapsUrl: mapForStop(event.id, event.mapsUrl), websiteUrl: details.website ?? event.websiteUrl,
      notes: [event.notes, `${details.price} (${details.priceKind}). ${details.priceNote}`, details.tip, details.mapNote].filter(Boolean).join('\n\n') }
  })

  function download() {
    try {
      const file = new Blob([buildCalendar(calendarEvents, title)], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = events.length === 1 ? `dallas-${events[0].id}.ics` : 'dallas-weekend.ics'
      document.body.append(link)
      link.click()
      link.remove()
      // Keep the URL alive until the browser has begun handling the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setStatus('Calendar file downloaded. Open it in your calendar app, review the times, and confirm the import.')
      setError('')
    } catch {
      setError('The calendar file could not be created. Please try again.')
    }
  }

  return <Modal title="Save to calendar" onClose={onClose}>
    <p className="dialog-intro">{title} · {events.length} {events.length === 1 ? 'stop' : 'stops'}</p>
    <div className="calendar-options">
      <button className="primary-button" onClick={download}><Icon name="download" />Download .ics file</button>
      <p>Open or import the file in Apple Calendar, Outlook, or another calendar app. In Google Calendar on desktop, use Settings → Import & export.</p>
      {events.length === 1 && <a className="secondary-button" href={googleCalendarUrl(calendarEvents[0])} target="_blank" rel="noopener noreferrer"><Icon name="calendar" />Open Google Calendar</a>}
    </div>
    <div className="calendar-notes"><strong>Review before saving</strong><p>Times use Dallas–Fort Worth time. Missing or unclear times become all-day reminders. Stops with only a start time get a one-hour placeholder. These are one-time copies, not a live subscription.</p>
      {events.length === 1 && <p>{calendarTimingNote(events[0])}</p>}
      {events.length > 1 && <p>The original Sunday “10pm - 7pm” and Monday “11:30 p.m.” need confirmation.</p>}
    </div>
    <p role="status" className="success-message">{status}</p>
    {error && <p role="alert" className="error-message">{error}</p>}
  </Modal>
}
