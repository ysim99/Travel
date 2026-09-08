# Dallas Weekend

A React itinerary preview for September 19–21, 2026, built from `AGENT.md`.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Switch between the three trip days and open venue Maps links. The original Korean notes and ambiguous times are preserved.

## Verify

```sh
npm test -- --run
npm run lint
npm run build
```

`src/main.tsx` mounts `App`, which connects the local sample repository to `AppShell` during development. This currently provides the read-only itinerary. Editing, comments, sharing, and the Supabase backend in the design plan remain unimplemented. Production builds intentionally show a setup message until shared persistence is implemented; they do not advertise a working private or shared trip.
