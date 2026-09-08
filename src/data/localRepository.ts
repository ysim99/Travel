import { nextEventOrder, type CommentDraft, type EventDraft, type TripEvent, type TripSnapshot } from '../domain/trip'
import { RepositoryError, type TripRepository } from './repository'

const clone = <T,>(value: T): T => structuredClone(value)

function requireToken(token: string): void {
  if (!token.trim()) throw new RepositoryError('not-found', 'Trip not found.')
}

function validateEvent(input: EventDraft | TripEvent): void {
  if (!input.title.trim()) {
    throw new RepositoryError('validation', 'Add an activity name before saving.')
  }
  if (input.title.length > 100 || input.place.length > 120 || input.notes.length > 400) {
    throw new RepositoryError('validation', 'One or more event fields are too long.')
  }
}

export class LocalTripRepository implements TripRepository {
  private snapshot: TripSnapshot
  private readonly listeners = new Set<() => void>()

  constructor(
    seed: TripSnapshot,
    private readonly storage?: Storage,
    private readonly storageKey = 'dallas-weekend-trip-v1',
  ) {
    const stored = storage?.getItem(storageKey)
    const parsed: unknown = stored ? JSON.parse(stored) : null
    if (parsed && (typeof parsed !== 'object' || !('days' in parsed) || !Array.isArray(parsed.days))) {
      throw new RepositoryError('configuration', 'Saved itinerary could not be read.')
    }
    this.snapshot = parsed ? parsed as TripSnapshot : clone(seed)
  }

  async load(token: string): Promise<TripSnapshot> {
    requireToken(token)
    return clone(this.snapshot)
  }

  async createEvent(token: string, input: EventDraft): Promise<TripSnapshot> {
    requireToken(token)
    validateEvent(input)
    const day = this.snapshot.days.find(({ date }) => date === input.date)
    if (!day) throw new RepositoryError('validation', 'Choose a day in this trip.')

    day.events.push({
      ...clone(input),
      id: crypto.randomUUID(),
      title: input.title.trim(),
      order: nextEventOrder(day.events),
      revision: 1,
      comments: [],
    })
    return this.commit()
  }

  async updateEvent(token: string, input: TripEvent): Promise<TripSnapshot> {
    requireToken(token)
    validateEvent(input)
    const currentDay = this.snapshot.days.find((day) =>
      day.events.some(({ id }) => id === input.id),
    )
    const current = currentDay?.events.find(({ id }) => id === input.id)
    if (!current || !currentDay) throw new RepositoryError('not-found', 'This event no longer exists.')
    if (current.revision !== input.revision) {
      throw new RepositoryError(
        'conflict',
        'This event was updated by someone else. Review the latest schedule and try again.',
      )
    }

    const destinationDay = this.snapshot.days.find(({ date }) => date === input.date)
    if (!destinationDay) throw new RepositoryError('validation', 'Choose a day in this trip.')

    currentDay.events = currentDay.events.filter(({ id }) => id !== input.id)
    destinationDay.events.push({
      ...clone(input),
      title: input.title.trim(),
      order: currentDay === destinationDay ? input.order : nextEventOrder(destinationDay.events),
      revision: input.revision + 1,
    })
    return this.commit()
  }

  async deleteEvent(token: string, eventId: string): Promise<TripSnapshot> {
    requireToken(token)
    const day = this.snapshot.days.find((item) => item.events.some(({ id }) => id === eventId))
    if (!day) throw new RepositoryError('not-found', 'This event no longer exists.')
    day.events = day.events.filter(({ id }) => id !== eventId)
    return this.commit()
  }

  async addComment(
    token: string,
    eventId: string,
    input: CommentDraft,
  ): Promise<TripSnapshot> {
    requireToken(token)
    const displayName = input.displayName.trim()
    const body = input.body.trim()
    if (!displayName || !body) {
      throw new RepositoryError('validation', 'Add your name and a suggestion before posting.')
    }
    if (displayName.length > 40 || body.length > 300) {
      throw new RepositoryError('validation', 'Your name or suggestion is too long.')
    }

    const event = this.snapshot.days
      .flatMap(({ events }) => events)
      .find(({ id }) => id === eventId)
    if (!event) throw new RepositoryError('not-found', 'This event no longer exists.')

    const previousComments = [...event.comments]
    event.comments.push({
      id: crypto.randomUUID(),
      eventId,
      displayName,
      body,
      createdAt: new Date().toISOString(),
    })
    try { return this.commit() }
    catch {
      event.comments = previousComments
      throw new RepositoryError('configuration', 'Could not save your comment in this browser. Check available storage and try again.')
    }
  }

  subscribe(_token: string, onRefresh: () => void): () => void {
    this.listeners.add(onRefresh)
    return () => this.listeners.delete(onRefresh)
  }

  private commit(): TripSnapshot {
    this.storage?.setItem(this.storageKey, JSON.stringify(this.snapshot))
    this.listeners.forEach((listener) => listener())
    return clone(this.snapshot)
  }
}
