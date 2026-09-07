# Shared Travel Scheduler Design

## Purpose

Build a clear, mobile-first schedule for a mostly fixed Dallas–Fort Worth trip on September 19–21, 2026. Friends open one private link to view the itinerary, make small event edits, and leave suggestions. The link itself grants access; there are no accounts or passwords.

## Product boundaries

The first version supports one trip and one shared access link. It includes schedule viewing, event creation and editing, event deletion with confirmation, per-event comments, external place links, and native mobile sharing. It does not include user accounts, invitations, voting, chat, expense splitting, reservations, route optimization, offline editing, or a general multi-trip dashboard.

Because anyone holding the link can change the trip, the interface will explain that the link is private and should only be sent to invited friends. Link secrecy is access control, not strong identity-based security.

## Experience

The default state is optimized for reading, not editing. The top of the page shows the trip name, destination, dates, and a Share button. A sticky three-day switcher lets people jump between Saturday, Sunday, and Monday.

Each day is a vertical route timeline. Events show the time first, then the activity and place. Drive durations appear as connectors between events instead of competing with the events. Event rows may include a short note, a Google Maps link, a venue website link, and an expandable suggestion count. Korean and English content remain as supplied.

Editing stays behind an "Edit schedule" control. In edit mode, event actions and an "Add event" button become visible. Add and edit use a mobile bottom sheet; larger screens use the same form in a centered dialog. Friends enter a display name when commenting, remembered locally on that device. Comments attach to individual events because the itinerary is already mostly fixed.

The schedule uses a restrained road-map visual language: an ink-blue base, clear white surfaces, Texas-sky blue for links, and one sunset-orange route line connecting the day. Typography prioritizes highly legible Korean and Latin text. The route line is the memorable visual element; other decoration stays quiet.

## Initial itinerary

The seed data comes from `AGENT.md` and uses the 2026 calendar because September 19, 20, and 21 fall on Saturday, Sunday, and Monday that year. Ambiguous entries remain faithful to the source instead of being silently corrected. In particular, the late-night September 20 entry and the September 21 Tex-Mex time retain their supplied text until a collaborator edits them.

Place links will use explicit URLs in the event data. When a source entry does not provide a venue URL, the seed script generates a Google Maps search URL from the place name rather than inventing a precise street address.

## Architecture

The client is a Vite, React, and TypeScript single-page application. Components are organized around the trip header, day navigation, timeline, event editor, and event comments. Schedule data access sits behind a small repository interface so UI components do not depend directly on Supabase calls.

Supabase provides the hosted PostgreSQL database and shared persistence. The data model contains:

- `trips`: title, destination, dates, timezone, and a cryptographically random share token.
- `events`: trip reference, date, optional start/end times, title, place, notes, travel minutes, external URLs, display order, and a revision number for conflict detection.
- `comments`: trip and event references, display name, comment body, and creation time.

The browser never receives unrestricted table access. Database functions accept the random share token and return or mutate only the matching trip. Direct anonymous table reads and writes remain disabled. Database mutations broadcast a content-free refresh signal on a channel derived from the share token; connected clients refetch the canonical trip after receiving it. This provides live collaboration without exposing itinerary rows through a public change feed.

The share token is read from the URL. A local sample-data adapter powers development and the automated UI tests when Supabase environment variables are absent. Production shows a clear configuration screen rather than pretending edits were shared if the backend is not configured.

## Data flow

On load, the app validates the token-shaped route parameter and requests the trip snapshot. It selects the day nearest the current trip date, otherwise the first day. Event changes are applied optimistically, sent through the repository, and reconciled with the returned snapshot. Comments are submitted only when both a display name and non-empty message are present.

If a live refresh arrives while an edit form contains unsaved changes, the form stays open and the page displays a small "Schedule updated" notice. Saving then uses the latest event version; the server rejects stale edits instead of silently overwriting another person's work.

## Failure states and safeguards

- Missing or invalid links show "Trip not found" with no schedule data.
- Network failures preserve entered form content and offer a Retry action.
- Empty days invite collaborators to add an event while edit mode is active.
- Deleting an event requires confirmation and also removes its comments.
- Inputs have practical length limits and are rendered as text, never raw HTML.
- External links open safely and remain keyboard accessible.
- Repeated submissions are disabled while a request is pending.

## Accessibility and responsiveness

The layout targets narrow phones first and expands to a centered reading column on larger screens. Touch targets are at least 44 pixels, focus states are visible, color is never the only status indicator, and dialogs trap and restore focus. Reduced-motion preferences disable nonessential movement. Dates and times use semantic elements and accessible labels while retaining the itinerary's original wording for ambiguous entries.

## Verification

Unit tests cover date ordering, time formatting, itinerary normalization, repository error handling, and URL generation. Component tests cover day switching, viewing versus edit mode, adding and editing events, delete confirmation, comment validation, sharing fallback, loading, empty, and error states. A production build and lint/type checks must pass.

Browser verification covers a phone viewport and a desktop viewport, including the complete edit-and-comment flow, keyboard navigation, external links, and visual review of the rendered itinerary. The Supabase setup includes schema, functions, seed data, and a concise deployment guide for creating the live shared URL.

## Success criteria

- A friend can understand the next time and destination within a few seconds on a phone.
- Anyone with the private link can make a persistent event change or leave an event suggestion without creating an account.
- Other open clients receive the update without reloading.
- Every known venue has an obvious Maps or website action when a reliable URL is available.
- The app remains useful and honest about its state during loading, invalid-link, and network-error conditions.
