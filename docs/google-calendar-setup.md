# Window: Google Calendar activation

Status: implementation is present; no live Google account has been connected or tested. The feature remains unavailable until all three runtime variables below exist. Weather-triggered automatic recommendations, availability reading and background retry scheduling are not implemented. Saving or retrying a plan invokes server-side sync; Google delivers event reminders.

## Google project

1. In a Google Cloud project controlled by the Window owner, enable Google Calendar API.
2. Configure Google Auth Platform branding/audience and a Web application OAuth client. Add actual pilot users as test users while in Testing. Complete the requested privacy/domain information and any applicable verification before broad release. Test-mode refresh credentials can expire; never represent this as permanent connectivity.
3. Register exactly this redirect URI:
   `https://window-kitesurf.rasmusniewaldlarsen.chatgpt.site/api/calendar/google-callback`
4. Request only `https://www.googleapis.com/auth/calendar.app.created`. This creates a separate Window calendar; it does not read unrelated personal events or determine availability. ChatGPT site sign-in identifies the Window user; Google's OAuth consent separately authorizes calendar access.
5. Set runtime values in Site settings, never in source or chat:
   - `GOOGLE_CALENDAR_CLIENT_ID`: the Web OAuth client ID.
   - `GOOGLE_CALENDAR_CLIENT_SECRET`: secret client credential.
   - `CALENDAR_TOKEN_KEY`: secret, cryptographically random 32-byte encryption key encoded as 64 hexadecimal characters. Keep a secure backup; changing it without migration makes existing credentials unreadable.
6. Redeploy the saved source to apply the runtime revision. Never use one shared service-account/user refresh token for all visitors.

## Required first connected-account acceptance test

Use a test user and explicitly marked test trip, not another person's real calendar:

- Sign in to Window, grant Google consent, verify a Window secondary calendar exists.
- Save a future plan with 60-minute and optional 1440-minute popup reminders. Inspect actual event times and reminder settings in Google Calendar.
- Change the plan's time, save again and verify exactly one event with the same ID changes.
- Test Google grant denial and expired state. A reused state and a state from a different Window account must fail.
- Revoke Google access, attempt an update, verify an honest error; reconnect to the same Google account and retry.
- Cancel a test trip and verify the event disappears; do not automatically recreate an event manually deleted in Google.
- Disconnect: the app deletes its refresh credential and requests Google revocation; existing events and saved plans remain. Failure to confirm revocation is displayed with a link/instruction to Google's account controls.
- Confirm two different signed-in Window users cannot list or change each other's plans.
- Test a real phone reminder with its OS and Calendar notification permissions enabled. Server success alone does not verify notification delivery.

## Implementation notes

D1 schema is defined in `db/schema.ts`, generated migration in `drizzle/`. Requests use prepared statements, user-specific predicates, a per-account lease and plan revision conflict checks. OAuth state is one-use, expires after 10 minutes and is bound to the authenticated Window user. The PKCE verifier and refresh credential are AES-GCM encrypted with the user ID as authenticated data. Secrets and authorization codes are not returned to the client.

A plan UUID (hex without hyphens) is its stable Google event ID. An insert collision is reconciled by reading and verifying the Window plan marker before patching. Ambiguous network errors do not silently report success. Retry is explicit in this release, not a background queue. Database and Google operations are not a distributed transaction; calendar creation can leave an orphan calendar if the initial database write fails after Google creates it. Inspect and reconcile instead of repeatedly connecting in that situation.

The app must not be declared operational until the connected-account and mobile tests above pass. The current development environment previously failed browser QA; a successful code test does not remove this limitation.

Sources checked 12–13 September 2026:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/concepts/reminders
