import type { CommentDraft, EventDraft, TripEvent, TripSnapshot } from '../domain/trip'

export type RepositoryErrorCode =
  | 'configuration'
  | 'conflict'
  | 'network'
  | 'not-found'
  | 'validation'

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export interface TripRepository {
  load(token: string): Promise<TripSnapshot>
  createEvent(token: string, input: EventDraft): Promise<TripSnapshot>
  updateEvent(token: string, input: TripEvent): Promise<TripSnapshot>
  deleteEvent(token: string, eventId: string): Promise<TripSnapshot>
  addComment(token: string, eventId: string, input: CommentDraft): Promise<TripSnapshot>
  subscribe(token: string, onRefresh: () => void): () => void
}
