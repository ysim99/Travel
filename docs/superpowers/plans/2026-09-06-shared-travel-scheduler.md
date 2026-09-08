# Shared Travel Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, mobile-first Dallas–Fort Worth itinerary that can run against local sample data in development and a token-scoped Supabase backend in production.

**Architecture:** A Vite/React/TypeScript client renders a repository-owned `TripSnapshot`; the UI never talks to persistence directly. A local repository supports development and tests, while a Supabase repository calls token-scoped database functions and listens only for content-free refresh signals.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS, Supabase JS

**Spec:** `docs/superpowers/specs/2026-09-06-travel-scheduler-design.md`

## Global Constraints

- One private-link trip for Dallas–Fort Worth, September 19–21, 2026.
- Preserve Korean and English source wording and ambiguous supplied times.
- The reading experience is primary; mutations remain behind `Edit schedule`.
- Anonymous browsers receive no direct table access; all hosted reads and writes use token-scoped RPC functions.
- Touch targets are at least 44px, keyboard focus is visible, dialogs manage focus, and reduced motion is respected.
- Production without Supabase configuration shows an honest configuration screen.

---

### Task 1: Project shell and domain behavior

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/domain/trip.ts`, `src/domain/trip.test.ts`

**Interfaces:**
- Produces: `TripSnapshot`, `TripEvent`, `TripComment`, `sortEvents(events)`, `mapsSearchUrl(query)`, `formatEventTime(event)`.

- [ ] **Step 1: Write failing domain tests**

```ts
expect(sortEvents([{ id: 'late', order: 2 }, { id: 'early', order: 1 }])[0].id).toBe('early')
expect(mapsSearchUrl("Denton Buc-ee's")).toContain('Denton%20Buc-ee')
expect(formatEventTime({ timeLabel: '10pm - 7pm' })).toBe('10pm – 7pm')
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- src/domain/trip.test.ts`
Expected: FAIL because `src/domain/trip.ts` does not exist.

- [ ] **Step 3: Implement the typed domain helpers**

```ts
export const sortEvents = (events: TripEvent[]) => [...events].sort((a, b) => a.order - b.order)
export const mapsSearchUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
export const formatEventTime = (event: Pick<TripEvent, 'timeLabel'>) => event.timeLabel.replace(/\s*-\s*/g, ' – ')
```

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- src/domain/trip.test.ts`
Expected: PASS.

### Task 2: Sample itinerary and repository contract

**Files:**
- Create: `src/data/sampleTrip.ts`, `src/data/repository.ts`, `src/data/localRepository.ts`
- Create: `src/data/localRepository.test.ts`

**Interfaces:**
- Consumes: `TripSnapshot`, `TripEvent`, `TripComment`.
- Produces: `TripRepository` with `load`, `createEvent`, `updateEvent`, `deleteEvent`, `addComment`, and `subscribe`; `LocalTripRepository`.

- [ ] **Step 1: Write failing repository tests**

```ts
const repo = new LocalTripRepository(sampleTrip)
const created = await repo.createEvent({ ...eventDraft, title: 'Dinner' })
expect(created.days[0].events.some((event) => event.title === 'Dinner')).toBe(true)
await expect(repo.updateEvent({ ...staleEvent, revision: 0 })).rejects.toThrow('updated by someone else')
```

- [ ] **Step 2: Run and confirm the missing-repository failure**

Run: `npm test -- src/data/localRepository.test.ts`
Expected: FAIL because the repository implementation does not exist.

- [ ] **Step 3: Implement immutable local mutations and faithful seed data**

```ts
export interface TripRepository {
  load(token: string): Promise<TripSnapshot>
  createEvent(token: string, input: EventDraft): Promise<TripSnapshot>
  updateEvent(token: string, input: TripEvent): Promise<TripSnapshot>
  deleteEvent(token: string, eventId: string): Promise<TripSnapshot>
  addComment(token: string, eventId: string, input: CommentDraft): Promise<TripSnapshot>
  subscribe(token: string, onRefresh: () => void): () => void
}
```

- [ ] **Step 4: Re-run repository tests**

Run: `npm test -- src/data/localRepository.test.ts`
Expected: PASS.

### Task 3: Primary itinerary experience

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/app/AppShell.tsx`
- Create: `src/components/TripHeader.tsx`, `src/components/DayTabs.tsx`, `src/components/Timeline.tsx`, `src/components/EventCard.tsx`, `src/components/icons.tsx`
- Create: `src/app/AppShell.test.tsx`, `src/test/setup.ts`

**Interfaces:**
- Consumes: `TripRepository`, `TripSnapshot`.
- Produces: reader view, selected-day navigation, edit-mode action affordances, loading/not-found/network/configuration states.

- [ ] **Step 1: Write failing reader-flow tests**

```tsx
render(<AppShell repository={repo} token="demo-dallas-2026" />)
expect(await screen.findByRole('heading', { name: /Dallas/i })).toBeVisible()
await user.click(screen.getByRole('tab', { name: /Sunday/i }))
expect(screen.getByText('WinStar Casino')).toBeVisible()
expect(screen.queryByRole('button', { name: /Edit WinStar/i })).not.toBeInTheDocument()
```

- [ ] **Step 2: Run and confirm the missing-UI failure**

Run: `npm test -- src/app/AppShell.test.tsx`
Expected: FAIL because `AppShell` does not exist.

- [ ] **Step 3: Implement the route-line reading UI and state surfaces**

```tsx
<main>
  <TripHeader trip={trip} onShare={shareTrip} />
  <DayTabs days={trip.days} selectedDate={selectedDate} onSelect={setSelectedDate} />
  <Timeline day={selectedDay} editing={editing} />
</main>
```

- [ ] **Step 4: Re-run reader-flow tests**

Run: `npm test -- src/app/AppShell.test.tsx`
Expected: PASS.

### Task 4: Event editing, deletion, and suggestions

**Files:**
- Create: `src/components/EventEditor.tsx`, `src/components/CommentsPanel.tsx`, `src/components/ConfirmDialog.tsx`
- Modify: `src/app/AppShell.tsx`, `src/components/Timeline.tsx`, `src/components/EventCard.tsx`
- Modify: `src/app/AppShell.test.tsx`

**Interfaces:**
- Consumes: repository mutation methods and event revisions.
- Produces: validated add/edit bottom sheet, confirmed delete, locally remembered display name, comment validation, stale-edit and refresh notices.

- [ ] **Step 1: Add failing mutation-flow tests**

```tsx
await user.click(screen.getByRole('button', { name: 'Edit schedule' }))
await user.click(screen.getByRole('button', { name: 'Add event' }))
await user.type(screen.getByLabelText('Activity'), 'Late lunch')
await user.click(screen.getByRole('button', { name: 'Add to schedule' }))
expect(await screen.findByText('Late lunch')).toBeVisible()
```

- [ ] **Step 2: Run and confirm the missing-control failure**

Run: `npm test -- src/app/AppShell.test.tsx`
Expected: FAIL because add/edit controls are absent.

- [ ] **Step 3: Implement accessible dialogs and mutation reconciliation**

```ts
const saveEvent = async (draft: EventDraft) => {
  setPending(true)
  try { setTrip(await repository.createEvent(token, draft)) }
  catch (error) { setMutationError(messageFrom(error)) }
  finally { setPending(false) }
}
```

- [ ] **Step 4: Re-run mutation-flow tests**

Run: `npm test -- src/app/AppShell.test.tsx`
Expected: PASS.

### Task 5: Distinctive responsive styling and sharing

**Files:**
- Create: `src/styles.css`
- Modify: `src/components/TripHeader.tsx`, `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`

**Interfaces:**
- Produces: ink `#102A43`, paper `#F7F8F5`, sky `#1677A5`, sunset `#F26B38`, sage `#DDE7DE`; Pretendard/Noto Sans Korean-safe typography; sticky day tabs; phone bottom sheet and desktop dialog; native sharing with clipboard fallback.

- [ ] **Step 1: Write the failing share-fallback test**

```tsx
await user.click(screen.getByRole('button', { name: 'Share trip' }))
expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
expect(await screen.findByText('Private link copied')).toBeVisible()
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/app/AppShell.test.tsx`
Expected: FAIL because sharing is not implemented.

- [ ] **Step 3: Implement sharing and the reviewed visual system**

```css
:root { --ink: #102a43; --paper: #f7f8f5; --sky: #1677a5; --sunset: #f26b38; --sage: #dde7de; }
.timeline::before { content: ''; position: absolute; background: var(--sunset); width: 3px; }
@media (min-width: 720px) { .sheet { inset: 50% auto auto 50%; transform: translate(-50%, -50%); } }
```

- [ ] **Step 4: Re-run component tests**

Run: `npm test -- src/app/AppShell.test.tsx`
Expected: PASS.

### Task 6: Supabase adapter, schema, and deployment guide

**Files:**
- Create: `src/data/supabaseRepository.ts`, `src/data/createRepository.ts`, `src/data/supabaseRepository.test.ts`
- Create: `supabase/schema.sql`, `supabase/seed.sql`, `.env.example`, `README.md`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `TripRepository`.
- Produces: token-scoped RPC adapter; content-free realtime channel refresh; RLS-denied direct tables; setup instructions and live URL shape.

- [ ] **Step 1: Write failing adapter contract tests**

```ts
await repository.load('token-value')
expect(rpc).toHaveBeenCalledWith('get_trip_by_token', { share_token_input: 'token-value' })
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/data/supabaseRepository.test.ts`
Expected: FAIL because the Supabase adapter does not exist.

- [ ] **Step 3: Implement the RPC adapter and SQL contract**

```ts
const { data, error } = await client.rpc('get_trip_by_token', { share_token_input: token })
if (error) throw new RepositoryError(error.message)
return normalizeSnapshot(data)
```

- [ ] **Step 4: Verify the full project**

Run: `npm run lint && npm test -- --run && npm run build`
Expected: all commands exit 0 with no errors.

### Task 7: Browser verification and polish

**Files:**
- Modify: UI files only when a reproducible visual or interaction defect is found.

**Interfaces:**
- Produces: verified phone and desktop layouts, keyboard-operable editor/comments/delete, working external links, and an honest production configuration state.

- [ ] **Step 1: Start the development server**

Run: `npm run dev -- --host 127.0.0.1`
Expected: Vite serves the sample trip URL.

- [ ] **Step 2: Verify reader and editor flows at 390×844 and 1440×1000**

Check: day switching, route connectors, add/edit/delete confirmation, suggestion validation, Maps links, Share fallback, focus behavior, and reduced-motion CSS.

- [ ] **Step 3: Capture screenshots and correct concrete issues**

Run focused tests after each correction, then repeat the affected browser flow.

- [ ] **Step 4: Run final verification**

Run: `npm run lint && npm test -- --run && npm run build`
Expected: all commands exit 0 with clean output.
