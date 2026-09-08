import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sampleTrip } from './sampleTrip'
import { LocalTripRepository } from './localRepository'

describe('LocalTripRepository', () => {
  let repository: LocalTripRepository

  beforeEach(() => {
    repository = new LocalTripRepository(sampleTrip)
  })

  it('creates an event at the end of the selected day', async () => {
    const snapshot = await repository.createEvent('demo-dallas-2026', {
      date: '2026-09-19',
      timeLabel: '6:30 p.m.',
      title: 'Late lunch',
      place: 'Dallas',
      notes: '',
      travelMinutes: null,
      mapsUrl: null,
      websiteUrl: null,
      order: 99,
    })

    const created = snapshot.days[0].events.at(-1)
    expect(created).toMatchObject({ title: 'Late lunch', order: 8, revision: 1 })
  })

  it('rejects an edit when another client already changed that revision', async () => {
    const original = (await repository.load('demo-dallas-2026')).days[0].events[0]
    await repository.updateEvent('demo-dallas-2026', { ...original, title: 'First edit' })

    await expect(
      repository.updateEvent('demo-dallas-2026', { ...original, title: 'Stale edit' }),
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('removes an event together with its suggestions', async () => {
    const eventId = (await repository.load('demo-dallas-2026')).days[0].events[0].id
    await repository.addComment('demo-dallas-2026', eventId, {
      displayName: 'Min',
      body: 'Meet at baggage claim.',
    })

    const snapshot = await repository.deleteEvent('demo-dallas-2026', eventId)
    expect(snapshot.days[0].events.some(({ id }) => id === eventId)).toBe(false)
  })

  it('requires both a display name and a suggestion body', async () => {
    const eventId = (await repository.load('demo-dallas-2026')).days[0].events[0].id

    await expect(
      repository.addComment('demo-dallas-2026', eventId, { displayName: ' ', body: 'Go early' }),
    ).rejects.toMatchObject({ code: 'validation' })
  })

  it('does not retain a failed comment when browser storage is full', async () => {
    const storage = { getItem: () => null, setItem: vi.fn(() => { throw new Error('Quota exceeded') }) } as unknown as Storage
    const repo = new LocalTripRepository(sampleTrip, storage)
    await expect(repo.addComment('demo-dallas-2026', 'fort-worth', { displayName: 'Min', body: 'Go early' })).rejects.toThrow(/save/i)
    const saved = await repo.load('demo-dallas-2026')
    expect(saved.days[0].events.find(({ id }) => id === 'fort-worth')?.comments).toHaveLength(0)
  })
})
