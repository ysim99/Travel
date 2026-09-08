import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { formatEventTime, type TripEvent } from '../domain/trip'
import { detailsForStop, mapForStop } from '../data/stopDetails'
import { Icon } from './Icons'

export function EventCard({ event, onComments, onCalendar }: { event: TripEvent; onComments: () => void; onCalendar: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const details = detailsForStop(event.id)
  const map = mapForStop(event.id, event.mapsUrl)
  const website = details.website ?? event.websiteUrl

  useLayoutEffect(() => {
    if (!expanded) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const animation = gsap.timeline()
      animation.fromTo(cardRef.current, { scale: 0.988 }, { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.7)', clearProps: 'transform' })
      animation.fromTo(detailRef.current, { height: 0, opacity: 0, y: -8 }, { height: 'auto', opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'height,opacity,transform' }, 0)
    })
    return () => media.revert()
  }, [expanded])

  return <article className={`event${expanded ? ' is-expanded' : ''}`} ref={cardRef}>
    <div className="event-time">{formatEventTime(event)}</div>
    <div className="event-content">
      <h3><button className="event-toggle" aria-label={`Details for ${event.title}`} aria-expanded={expanded} aria-controls={`details-${event.id}`} onClick={() => setExpanded(!expanded)}>{event.title}<Icon name="chevron" className="chevron" /></button></h3>
      {event.place && <p className="place">{event.place}</p>}
      <p className={`price price-${details.priceKind}`}>{details.price}<span>{details.priceKind === 'estimate' ? 'Budget estimate' : details.priceKind === 'published' ? 'Published admission' : 'Personal cost'}</span></p>
      {event.notes && <p className="notes">{event.notes}</p>}
      {details.tip && <p className="stop-tip">{details.tip}</p>}
      <div className="event-actions">
        {map ? <a href={map} target="_blank" rel="noopener noreferrer" aria-label={`Maps for ${event.title}`}><Icon name="pin" />Maps<span aria-hidden="true">↗</span></a> : <span className="map-unavailable"><Icon name="pin" />Location needed</span>}
        <button className="thread-button" onClick={onComments} aria-label={`Comments for ${event.title}, ${event.comments.length} comments`}><Icon name="thread" /><span>Thread</span><span className="comment-count">{event.comments.length}</span></button>
      </div>
      <div id={`details-${event.id}`} hidden={!expanded} ref={detailRef} className="event-details">
        <div className="details-inner">
          <p>{details.priceNote}</p>
          {details.mapNote && <p>{details.mapNote}</p>}
          {details.source && <p><a href={details.source.url} target="_blank" rel="noopener noreferrer">{details.source.label} ↗</a><small>Reference checked September 8, 2026</small></p>}
          {website && /^https?:\/\//i.test(website) && <a className="venue-link" href={website} target="_blank" rel="noopener noreferrer">Venue website ↗</a>}
          <button className="secondary-button" onClick={onCalendar} aria-label={`Save ${event.title} to calendar`}><Icon name="calendar" />Save this stop</button>
        </div>
      </div>
    </div>
  </article>
}
