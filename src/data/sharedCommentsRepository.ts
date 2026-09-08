import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidShareToken, type CommentDraft, type TripComment, type TripSnapshot } from '../domain/trip'
import { RepositoryError, type TripRepository } from './repository'

const MAX_COMMENTS_PER_EVENT = 200

function requireToken(token: string): void {
  if (!isValidShareToken(token)) throw new RepositoryError('not-found', 'This trip link is invalid.')
}

function responseError(): RepositoryError {
  return new RepositoryError('configuration', 'The shared-comments service returned an unexpected response.')
}

function mapServerError(code?: string, status?: number): RepositoryError {
  if (code === 'PT404') {
    return new RepositoryError('not-found', 'This trip link or itinerary section is no longer available.')
  }
  if (code === 'PT400') {
    return new RepositoryError('validation', 'Add a name (up to 40 characters) and a comment (up to 300 characters).')
  }
  if (code === 'PT409') {
    return new RepositoryError('validation', 'This section has reached its limit of 200 comments.')
  }
  if (status === 401 || status === 403 || ['PGRST202', '42883', '42P01', '42501'].includes(code ?? '')) {
    return new RepositoryError('configuration', 'Shared comments are not configured correctly. Check the Supabase settings and SQL setup.')
  }
  return new RepositoryError('network', 'Could not reach shared comments. Check your connection and try again.')
}

async function rejectItineraryEdit(): Promise<TripSnapshot> {
  throw new RepositoryError('configuration', 'This shared itinerary supports comments only.')
}

export class SharedCommentsRepository implements TripRepository {
  private readonly seed: TripSnapshot
  private readonly eventIds: Set<string>

  constructor(private readonly client: Pick<SupabaseClient, 'rpc'>, seed: TripSnapshot) {
    this.seed = structuredClone(seed)
    this.eventIds = new Set(seed.days.flatMap(({ events }) => events.map(({ id }) => id)))
  }

  async load(token: string): Promise<TripSnapshot> {
    requireToken(token)
    return this.request('get_trip_comments', { share_token_input: token })
  }

  async addComment(token: string, eventId: string, input: CommentDraft): Promise<TripSnapshot> {
    requireToken(token)
    if (!this.eventIds.has(eventId)) {
      throw new RepositoryError('not-found', 'This itinerary section no longer exists.')
    }
    const displayName = input.displayName.trim()
    const body = input.body.trim()
    if (!displayName || !body || displayName.length > 40 || body.length > 300) {
      throw mapServerError('PT400')
    }

    return this.request('add_trip_comment', {
      share_token_input: token,
      event_id_input: eventId,
      display_name_input: displayName,
      body_input: body,
    })
  }

  createEvent: TripRepository['createEvent'] = rejectItineraryEdit
  updateEvent: TripRepository['updateEvent'] = rejectItineraryEdit
  deleteEvent: TripRepository['deleteEvent'] = rejectItineraryEdit

  subscribe(token: string, onRefresh: () => void): () => void {
    if (!isValidShareToken(token) || typeof window === 'undefined') return () => {}
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') onRefresh()
    }
    const interval = window.setInterval(refreshVisible, 15_000)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }

  private async request(name: string, parameters: Record<string, string>): Promise<TripSnapshot> {
    let response
    try {
      response = await this.client.rpc(name, parameters)
    } catch {
      throw mapServerError()
    }
    if (response.error) throw mapServerError(response.error.code, response.status)
    return this.withComments(response.data)
  }

  private withComments(data: unknown): TripSnapshot {
    if (!Array.isArray(data) || data.length > this.eventIds.size * MAX_COMMENTS_PER_EVENT) {
      throw responseError()
    }
    const byEvent = new Map<string, TripComment[]>()
    const commentIds = new Set<string>()
    for (const item of data) {
      if (
        !item || typeof item !== 'object' ||
        typeof item.id !== 'string' || !item.id || item.id.length > 100 ||
        typeof item.eventId !== 'string' || !this.eventIds.has(item.eventId) ||
        typeof item.displayName !== 'string' || !item.displayName.trim() || [...item.displayName].length > 40 ||
        typeof item.body !== 'string' || !item.body.trim() || [...item.body].length > 300 ||
        typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) ||
        commentIds.has(item.id)
      ) throw responseError()

      commentIds.add(item.id)
      const comments = byEvent.get(item.eventId) ?? []
      if (comments.length >= MAX_COMMENTS_PER_EVENT) throw responseError()
      comments.push({
        id: item.id,
        eventId: item.eventId,
        displayName: item.displayName,
        body: item.body,
        createdAt: item.createdAt,
      })
      byEvent.set(item.eventId, comments)
    }

    const snapshot = structuredClone(this.seed)
    for (const day of snapshot.days) {
      for (const event of day.events) {
        event.comments = (byEvent.get(event.id) ?? []).sort((a, b) =>
          Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
        )
      }
    }
    return snapshot
  }
}
