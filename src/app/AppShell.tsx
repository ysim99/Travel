import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { TripRepository } from '../data/repository'
import { isValidShareToken, sortEvents, type TripSnapshot, type TripEvent } from '../domain/trip'
import { EventCard } from '../components/EventCard'
import { CommentsDialog } from '../components/CommentsDialog'
import { CalendarDialog } from '../components/CalendarDialog'
import { Icon } from '../components/Icons'

export function AppShell({ repository, token, shared = false }: { repository: TripRepository; token: string; shared?: boolean }) {
  const [trip, setTrip] = useState<TripSnapshot | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [commentEventId, setCommentEventId] = useState<string | null>(null)
  const [calendar, setCalendar] = useState<{ events: TripEvent[]; title: string } | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const requestVersion = useRef(0)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      const version = ++requestVersion.current
      try {
        if (!isValidShareToken(token)) throw new Error('Trip not found. Check your itinerary link.')
        const snapshot = await repository.load(token)
        if (active && version === requestVersion.current) {
          setTrip(snapshot)
          setError('')
        }
      } catch (cause) {
        if (active && version === requestVersion.current) setError(cause instanceof Error ? cause.message : 'Could not load the schedule. Try again.')
      }
    }
    void refresh()
    const unsubscribe = repository.subscribe(token, () => { void refresh() })
    return () => { active = false; unsubscribe() }
  }, [repository, token, attempt])

  const day = trip?.days.find(({ date }) => date === selectedDate) ?? trip?.days[0]
  const activeDate = day?.date
  const commentEvent = trip?.days.flatMap(({ events }) => events).find(({ id }) => id === commentEventId)

  useLayoutEffect(() => {
    if (!panelRef.current || !activeDate) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(panelRef.current!.querySelectorAll('.event'), { y: 20, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.45, stagger: 0.055, ease: 'power3.out', clearProps: 'transform,opacity',
      })
    })
    return () => media.revert()
  }, [activeDate])

  if (!trip) {
    return <main className="state">
      <h1>{error ? 'Unable to open itinerary' : 'Loading your weekend…'}</h1>
      {error && <><p role="alert">{error}</p><button onClick={() => setAttempt(attempt + 1)}>Retry</button></>}
    </main>
  }

  return (
    <main className="itinerary">
      <header className="trip-header">
        <p className="destination">{trip.destination}</p>
        <h1>{trip.title}</h1>
        <p className="dates">{trip.dateRange}</p>
        <div className="header-actions"><button className="primary-button" onClick={() => setCalendar({ events: trip.days.flatMap(({ events }) => sortEvents(events)), title: trip.title })}><Icon name="calendar" />Save to calendar</button><span>All times in Dallas time</span></div>
        <p className={`mode-note${shared ? ' shared' : ''}`}>{shared ? 'Shared threads · Friends with this link can comment. Updates refresh about every 15 seconds.' : 'Local preview · Comments stay in this browser. Shared comments need hosting setup.'}</p>
      </header>
      {error && <p role="alert">{error} <button onClick={() => setAttempt(attempt + 1)}>Retry</button></p>}
      <nav className="day-tabs" role="tablist" aria-label="Trip days">
        {trip.days.map((item, index) => (
          <button key={item.date} role="tab" id={`tab-${item.date}`}
            aria-controls="day-panel" aria-selected={day?.date === item.date}
            tabIndex={day?.date === item.date ? 0 : -1}
            aria-label={`${item.weekday}, ${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`))}`}
            onClick={() => setSelectedDate(item.date)}
            onKeyDown={(event) => {
              const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }
              let next = index
              if (event.key in offsets) next = (index + offsets[event.key] + trip.days.length) % trip.days.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = trip.days.length - 1
              else return
              event.preventDefault()
              setSelectedDate(trip.days[next].date)
              document.getElementById(`tab-${trip.days[next].date}`)?.focus()
            }}>
            <span>{item.weekday}</span><time dateTime={item.date}>{item.shortLabel}</time>
          </button>
        ))}
      </nav>
      {day ? <section ref={panelRef} id="day-panel" role="tabpanel" aria-labelledby={`tab-${day.date}`} tabIndex={0}>
        <div className="day-heading"><div><h2>{day.weekday} route</h2><p>{day.events.length} stops · Tap a stop for details</p></div><button className="icon-button" aria-label={`Save ${day.weekday} to calendar`} onClick={() => setCalendar({ events: sortEvents(day.events), title: `${trip.title} — ${day.weekday}` })}><Icon name="calendar" /></button></div>
        <p className="budget-note">USD per person unless noted. Estimates exclude tax, tips, transport, and unlisted purchases.</p>
        <ol className="timeline">
          {sortEvents(day.events).map((event) => <li key={event.id}>
            {event.travelMinutes !== null && <p className="drive">{event.travelMinutes} min drive<span className="sr-only"> to {event.title}</span></p>}
            <EventCard event={event} onComments={() => setCommentEventId(event.id)} onCalendar={() => setCalendar({ events: [event], title: event.title })} />
          </li>)}
        </ol>
        {day.events.length === 0 && <p>No stops planned for this day yet.</p>}
      </section> : <p>No days have been scheduled yet.</p>}
      <footer>Three days in Texas. A little room for the unexpected.</footer>
      {commentEvent && <CommentsDialog key={commentEvent.id} event={commentEvent} shared={shared} onClose={() => setCommentEventId(null)} onPost={async (input) => {
        const snapshot = await repository.addComment(token, commentEvent.id, input)
        ++requestVersion.current
        setTrip(snapshot)
        return snapshot
      }} />}
      {calendar && <CalendarDialog events={calendar.events} title={calendar.title} onClose={() => setCalendar(null)} />}
    </main>
  )
}
