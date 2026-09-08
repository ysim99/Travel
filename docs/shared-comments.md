# Shared comments setup

This optional Supabase backend lets everyone with the trip link read and add comments under each itinerary section. The itinerary stays in the website's `src/data/sampleTrip.ts`; only comments are stored in Supabase. Without backend configuration, comments stay in the current browser and are not shared across devices.

## 1. Create the database

1. Create a Supabase project and open its SQL Editor as the project administrator.
2. Copy all of [`supabase/comments.sql`](../supabase/comments.sql) into a new query and run it. The script installs `pgcrypto` in the standard `extensions` schema if needed, creates private tables and two API functions, and registers the 18 existing itinerary section IDs. If you have customized where `pgcrypto` is installed, adjust the `extensions.digest` / `extensions.gen_random_bytes` references to its actual schema before running.
3. Save the final result's **`share_token`** privately. It is generated on the database server from 32 random bytes; only its SHA-256 hash is stored. The token is not recoverable from the stored hash. The script returns it only when creating this trip for the first time.

Re-running the script preserves existing comments and the existing token; `share_token` will be `null` with an “Already configured” note. It safely adds any missing section registrations. Do not replace the generated token with the sample/demo token.

Supabase supports SQL Editor setup and remote calls to database functions. These functions use a fixed empty `search_path`, explicit schema names, and restricted execution grants as described in [Supabase's database-function guidance](https://supabase.com/docs/guides/database/functions). The cryptographic functions come from [PostgreSQL's pgcrypto extension](https://www.postgresql.org/docs/current/pgcrypto.html), which is included in [Supabase's supported extensions](https://supabase.com/docs/guides/database/extensions).

## 2. Configure the website build

Set these values in your hosting project's environment settings, then rebuild and deploy the website:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

For development, put them in an untracked `.env.local` and restart the dev server. Copy the project URL and publishable key from Supabase's project connection/API settings. A legacy `anon` key also works in `VITE_SUPABASE_PUBLISHABLE_KEY` for projects using legacy keys. Never use a secret key or `service_role` key in the website. Publishable keys are intended for browser code; secret keys bypass RLS and belong on trusted servers. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Vite includes these values in the built browser files, so neither variable is a place to store the share token. Both variables must be configured together. See [hosting instructions](hosting.md) for the site deployment steps.

## 3. Share and verify

Build the private trip link by appending the token to the deployed site's URL:

```text
https://YOUR_SITE.example/#trip=YOUR_SAVED_SHARE_TOKEN
```

Send the full link only to the intended travelers. The URL fragment keeps the token out of ordinary website request URLs; the application sends it in the body of each Supabase RPC request. Anyone who possesses the link can read and post comments, and display names are self-reported. This is bearer-link access, not verified accounts or individual permissions. Do not publish the token, paste it into issue reports, or log RPC arguments. Keep SQL Editor results and project logs private, too.

Use two browsers or a browser plus a phone to verify the deployed setup:

1. Open the same full link in both places. Post a comment with a name under an itinerary section.
2. Confirm it appears in the other browser within about 15 seconds while that page is visible, or when returning to that page.
3. Reload both pages and confirm the comment remains under the correct section.
4. Change one character of the token in a separate tab. Shared comments should fail to load; the app must not silently switch to local comments.
5. Temporarily use the browser's offline mode. A post should report failure rather than imply it was saved.

There are no live project credentials in this repository. Automated tests cover the client/RPC contract with a mocked transport; they do **not** prove that your hosted Supabase project is configured correctly. Complete the two-browser checks after setup.

## Access and limits

All three tables are in `shared_comments_private`, with RLS enabled, no browser policies, and no `anon`/`authenticated` schema or table privileges. Keep this schema out of the Data API's exposed schemas. Only `get_trip_comments` and `add_trip_comment` are granted to browser roles; both verify a token hash for an active trip before accessing its comments. The write function also checks the registered section ID. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) for how table permissions and RLS work together.

Comments require a trimmed, nonempty name (up to 40 characters) and body (up to 300 characters). Each section accepts at most 200 comments; writes lock that section while enforcing the limit, and reads return at most 200 comments per section. This bounds stored comments through the public API and the amount returned, but is not per-person throttling or spam protection. For a public audience, add account authentication and request rate limiting before sharing broadly.

The client uses [Supabase RPC calls](https://supabase.com/docs/reference/javascript/rpc) and polls once every 15 seconds while the page is visible, with an extra refresh on focus/return. Unsubscribing removes the timer and browser listeners. Realtime publication is not needed; do not add these tables to a public Realtime feed. This trades instant updates for a small setup with no comment content in public broadcast channels. An open, visible tab makes approximately four refresh requests a minute.

Keep stable section IDs when editing itinerary text. If you add a new section, register its ID in `shared_comments_private.trip_events` as an administrator and update the SQL seed list. The backend does not offer itinerary editing, comment editing, or comment deletion to link holders.

## Disable or replace a link

To stop read/post access for every holder of the current link, run this in the private SQL Editor:

```sql
update shared_comments_private.trip_shares
set active = false
where trip_id = 'dallas-2026';
```

To replace a lost or exposed link while preserving the comments, run this private query and save its one-time result. It invalidates the old token and activates the new one:

```sql
with replacement as materialized (
  select encode(extensions.gen_random_bytes(32), 'hex') as share_token
), updated as (
  update shared_comments_private.trip_shares
  set token_hash = extensions.digest(replacement.share_token, 'sha256'), active = true
  from replacement
  where trip_id = 'dallas-2026'
  returning trip_id
)
select replacement.share_token
from replacement cross join updated;
```

Share the new full URL with travelers. No website rebuild is needed for token replacement. Disabling or rotating a link prevents later requests; it cannot erase comments someone has already viewed or copied.
