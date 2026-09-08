import { useRef, useState, type FormEvent } from 'react'
import type { CommentDraft, TripEvent, TripSnapshot } from '../domain/trip'
import { Modal } from './Modal'

export function CommentsDialog({ event, shared, onClose, onPost }: {
  event: TripEvent; shared: boolean; onClose: () => void
  onPost: (input: CommentDraft) => Promise<TripSnapshot>
}) {
  const [displayName, setDisplayName] = useState(() => {
    try { return localStorage.getItem('dallas-display-name') ?? '' } catch { return '' }
  })
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const lock = useRef(false)

  async function post(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (lock.current || !displayName.trim() || !body.trim()) return
    lock.current = true
    setPending(true)
    setError('')
    setStatus('')
    try {
      await onPost({ displayName, body })
      try { localStorage.setItem('dallas-display-name', displayName.trim()) } catch { /* Comment succeeded; remembering a name is optional. */ }
      setBody('')
      setStatus('Comment posted')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not post. Your draft is here — try again.')
    } finally { lock.current = false; setPending(false) }
  }

  return <Modal title={`${event.title} comments`} onClose={onClose}>
    <p className="dialog-intro">{shared ? 'Make a suggestion or work out the details with your friends.' : 'Local preview: comments are saved in this browser only.'}</p>
    <ol className="comments-list" aria-label="Comments">
      {event.comments.map((comment) => <li key={comment.id}>
        <span className="avatar" aria-hidden="true">{Array.from(comment.displayName)[0]}</span>
        <div><div className="comment-meta"><strong>{comment.displayName}</strong><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(comment.createdAt))}</time></div><p>{comment.body}</p></div>
      </li>)}
    </ol>
    {event.comments.length === 0 && <div className="empty-comments"><strong>Start the conversation</strong><p>Meeting spot, food order, or a better idea?</p></div>}
    <form className="comment-form" onSubmit={(formEvent) => { void post(formEvent) }}>
      <label htmlFor="comment-name">Your name</label>
      <input id="comment-name" autoComplete="nickname" maxLength={40} required value={displayName} disabled={pending} onChange={(input) => setDisplayName(input.target.value)} placeholder="What should we call you?" />
      <label htmlFor="comment-body">Comment</label>
      <textarea id="comment-body" maxLength={300} required rows={3} value={body} disabled={pending} onChange={(input) => setBody(input.target.value)} placeholder="Leave a thought for this stop…" />
      <div className="form-actions"><span>{body.length}/300</span><button className="primary-button" disabled={pending || !displayName.trim() || !body.trim()} type="submit">{pending ? 'Posting…' : 'Post comment'}</button></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <p role="status" className="success-message">{status}</p>
    </form>
  </Modal>
}
