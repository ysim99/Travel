import { describe, expect, it } from 'vitest'

import { formatEventTime, mapsSearchUrl, sortEvents, type TripEvent } from './trip'

const event = (overrides: Partial<TripEvent>): TripEvent => ({
  id: 'event',
  date: '2026-09-19',
  timeLabel: '',
  title: 'Stop',
  place: '',
  notes: '',
  travelMinutes: null,
  mapsUrl: null,
  websiteUrl: null,
  order: 0,
  revision: 1,
  comments: [],
  ...overrides,
})

describe('trip domain helpers', () => {
  it('orders events by route position without mutating the snapshot', () => {
    const original = [event({ id: 'late', order: 2 }), event({ id: 'early', order: 1 })]

    expect(sortEvents(original).map(({ id }) => id)).toEqual(['early', 'late'])
    expect(original.map(({ id }) => id)).toEqual(['late', 'early'])
  })

  it('builds an encoded Google Maps search instead of inventing an address', () => {
    expect(mapsSearchUrl("Denton Buc-ee's")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Denton%20Buc-ee's",
    )
  })

  it('normalizes only the separator in ambiguous source time text', () => {
    expect(formatEventTime(event({ timeLabel: '10pm - 7pm' }))).toBe('10pm – 7pm')
    expect(formatEventTime(event({ timeLabel: '' }))).toBe('Time open')
  })
})
