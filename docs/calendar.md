# Calendar export

`buildCalendar(events, tripTitle)` returns a UTF-8 `.ics` snapshot. Use the MIME type `text/calendar;charset=utf-8`. It includes the latest revision of each event ID, stable UIDs, descriptions, locations, and original time wording. The output follows RFC 5545 text escaping, CRLF delimiters, exclusive end dates, and 75-octet folding without splitting Unicode characters. Timed entries use UTC instants resolved from `America/Chicago`, independently of the device timezone. [RFC 5545](https://www.rfc-editor.org/info/rfc5545/)

`googleCalendarUrl(event)` returns Google's documented prefilled event URL. The user reviews the event and selects Save in Google Calendar. Parameters are encoded using `URLSearchParams`; `stz` and `etz` name `America/Chicago`. These are independent copies, so later itinerary changes do not automatically update them. [Google's event-link documentation](https://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events#provide_a_link_for_users_to_add_the_event)

`calendarTimingNote(event)` returns the explanation also included in each event's description, or `null` for a complete, unambiguous range.

Time rules:

- Supplied a.m./p.m. times and complete forward ranges are preserved.
- A start without an end uses a clearly described one-hour placeholder.
- Blank, unrecognized, equal, and backwards ranges become all-day entries for the supplied date, with a review note. No overnight duration is inferred from `10pm - 7pm`.
- Monday, September 21's `11:30 p.m.` remains Monday night and includes a verification note.
- The helpers expect the valid ISO date and stable ID supplied by the trip domain. The UID namespace is scoped to this Dallas 2026 trip.

The export does not request account access or write calendar events. Direct API synchronization would require an OAuth integration with the calendar write scope. [Google's event-creation requirements](https://developers.google.com/workspace/calendar/api/guides/create-events)

Validation: `npm test -- --run src/domain/calendar.test.ts` covers exact Dallas UTC times, all-day dates, ambiguous source wording, Korean/emoji folding, text injection prevention, safe Google parameters, and stable duplicate-free UIDs. Calendar-client import behavior and repeat-import deduplication still depend on the receiving application; these exports are snapshots, not subscriptions.
