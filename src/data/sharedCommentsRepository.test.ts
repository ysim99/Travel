import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TripComment } from '../domain/trip'
import { sampleTrip } from './sampleTrip'
import { SharedCommentsRepository } from './sharedCommentsRepository'

const token = 'a'.repeat(64)
const comment: TripComment = {
  id: 'comment-1',
  eventId: 'arrival',
  displayName: 'Min',
  body: 'Meet at baggage claim.',
  createdAt: '2026-09-08T12:00:00.000Z',
}

function setup() {
  const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
  const client = { rpc } as unknown as Pick<SupabaseClient, 'rpc'>
  return { rpc, repository: new SharedCommentsRepository(client, sampleTrip) }
}

describe('SharedCommentsRepository', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('loads server comments into an isolated copy of the fixed itinerary', async () => {
    const { rpc, repository } = setup()
    rpc.mockResolvedValue({ data: [comment], error: null })

    const snapshot = await repository.load(token)

    expect(rpc).toHaveBeenCalledWith('get_trip_comments', { share_token_input: token })
    expect(snapshot.days[0].events[0]).toEqual({
      ...sampleTrip.days[0].events[0],
      comments: [comment],
    })
    expect(snapshot.days[1]).toEqual(sampleTrip.days[1])
    snapshot.days[0].events[0].title = 'Changed by caller'
    snapshot.days[0].events[0].comments[0].body = 'Changed by caller'
    expect(sampleTrip.days[0].events[0].comments).toEqual([])
    expect((await repository.load(token)).days[0].events[0].title).toBe('Dallas arrival')
    expect((await repository.load(token)).days[0].events[0].comments[0].body).toBe(comment.body)
  })

  it('posts trimmed input and returns the server snapshot including other travelers comments', async () => {
    const { rpc, repository } = setup()
    const otherComment = { ...comment, id: 'comment-2', eventId: 'coffee' }
    rpc.mockResolvedValue({ data: [comment, otherComment], error: null })

    const snapshot = await repository.addComment(token, 'arrival', {
      displayName: '  Min  ', body: '  Meet at baggage claim.  ',
    })

    expect(rpc).toHaveBeenCalledExactlyOnceWith('add_trip_comment', {
      share_token_input: token,
      event_id_input: 'arrival',
      display_name_input: 'Min',
      body_input: 'Meet at baggage claim.',
    })
    expect(snapshot.days[0].events[0].comments).toEqual([comment])
    expect(snapshot.days[2].events[2].comments).toEqual([otherComment])
  })

  it.each([
    { displayName: ' ', body: 'hello' },
    { displayName: 'Min', body: '\n\t' },
    { displayName: 'x'.repeat(41), body: 'hello' },
    { displayName: 'Min', body: 'x'.repeat(301) },
  ])('rejects invalid comments before contacting the server: %j', async (input) => {
    const { rpc, repository } = setup()
    await expect(repository.addComment(token, 'arrival', input)).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects malformed tokens and unknown itinerary sections without a request', async () => {
    const { rpc, repository } = setup()
    await expect(repository.load('bad token')).rejects.toMatchObject({ code: 'not-found' })
    await expect(repository.addComment(token, 'made-up', { displayName: 'Min', body: 'Hi' }))
      .rejects.toMatchObject({ code: 'not-found' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['PT404', 'not-found'],
    ['PT400', 'validation'],
    ['PT409', 'validation'],
    ['PGRST202', 'configuration'],
    ['42501', 'configuration'],
    ['unexpected', 'network'],
  ])('surfaces %s as %s instead of substituting local comments', async (serverCode, repositoryCode) => {
    const { rpc, repository } = setup()
    rpc.mockResolvedValue({ data: null, error: { code: serverCode, message: 'Internal server detail' } })
    await expect(repository.load(token)).rejects.toMatchObject({ code: repositoryCode })
    await expect(repository.load(token)).rejects.not.toHaveProperty('message', 'Internal server detail')
  })

  it('surfaces rejected network requests', async () => {
    const { rpc, repository } = setup()
    rpc.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(repository.load(token)).rejects.toMatchObject({ code: 'network' })
  })

  it('reads Unicode text up to the database character limits', async () => {
    const { rpc, repository } = setup()
    const unicodeComment = { ...comment, displayName: '😀'.repeat(40), body: '😀'.repeat(300) }
    rpc.mockResolvedValue({ data: [unicodeComment], error: null })
    expect((await repository.load(token)).days[0].events[0].comments).toEqual([unicodeComment])
  })

  it.each([
    null,
    { comments: [] },
    [{ ...comment, eventId: 'unregistered-event' }],
    [{ ...comment, createdAt: 'not a date' }],
    [{ ...comment, body: '' }],
    [comment, comment],
    Array.from({ length: 201 }, (_, id) => ({ ...comment, id: `comment-${id}` })),
  ])('rejects a malformed or excessive server response', async (data) => {
    const { rpc, repository } = setup()
    rpc.mockResolvedValue({ data, error: null })
    await expect(repository.load(token)).rejects.toMatchObject({ code: 'configuration' })
  })

  it('refuses itinerary editing through the comments backend', async () => {
    const { rpc, repository } = setup()
    await expect(repository.createEvent(token, sampleTrip.days[0].events[0])).rejects.toMatchObject({ code: 'configuration' })
    await expect(repository.updateEvent(token, sampleTrip.days[0].events[0])).rejects.toMatchObject({ code: 'configuration' })
    await expect(repository.deleteEvent(token, 'arrival')).rejects.toMatchObject({ code: 'configuration' })
    expect(rpc).not.toHaveBeenCalled()
  })

  describe('refresh subscription', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    })

    it('polls every 15 seconds while visible and refreshes on focus and return to the page', () => {
      const { repository } = setup()
      const refresh = vi.fn()
      const unsubscribe = repository.subscribe(token, refresh)
      vi.advanceTimersByTime(14_999)
      expect(refresh).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(refresh).toHaveBeenCalledTimes(1)
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      vi.advanceTimersByTime(30_000)
      window.dispatchEvent(new Event('focus'))
      expect(refresh).toHaveBeenCalledTimes(1)
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
      document.dispatchEvent(new Event('visibilitychange'))
      expect(refresh).toHaveBeenCalledTimes(2)
      window.dispatchEvent(new Event('focus'))
      expect(refresh).toHaveBeenCalledTimes(3)
      unsubscribe()
    })

    it('removes the timer and browser listeners on unsubscribe', () => {
      const { repository } = setup()
      const refresh = vi.fn()
      const unsubscribe = repository.subscribe(token, refresh)
      unsubscribe()
      vi.advanceTimersByTime(60_000)
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      expect(refresh).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
