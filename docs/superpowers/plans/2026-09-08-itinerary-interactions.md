# Itinerary interactions and hosting

User-requested scope: per-stop comment threads in popups, price information and Maps links based on AGENT.md, GSAP click interactions, calendar export, mobile layouts, and hosting documentation.

Design: keep the ink/paper/sky/sunset route timeline. Event headings become disclosure buttons; a thread icon and count open an accessible modal (bottom sheet on phones). Price summaries stay visible; expanded details contain source/estimate notes and calendar actions. GSAP animates day transitions, event disclosures, and modal entry; reduced motion skips transforms. Maintain 44px targets and native dialog focus containment/restoration.

Implementation:
- [ ] Add event price/location metadata with official sources and explicit estimates; never invent home addresses or venues.
- [ ] Add calendar utility and tests (delegated independently); ICS for full trip/day/stop, Google Calendar per stop. Preserve ambiguous source times.
- [ ] Add accessible comments modal, persisted local preview, and optional shared comment repository/setup.
- [ ] Integrate event disclosures, calendar modal, GSAP animations and mobile styling.
- [ ] Write hosting/configuration and price/calendar documentation; test both configured and local operation.
- [ ] Run tests, lint, build, phone/desktop browser checks and independent review.

Decisions: use the current workspace because all application files are uncommitted user work. Build a reviewable local result without publishing. Use separate calendar and optional shared-storage tasks while UI integration proceeds locally. No calendar account access or silent calendar writes: users confirm in their own calendar app. Unknown locations get region-scoped Maps searches; home locations show an address-needed message. Pricing is not a total trip quote.

Progress: baseline read, existing app and repository inspected; official source research in progress.
