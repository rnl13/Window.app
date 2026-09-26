# Explore integration — 21 September 2026

Based on authoritative main commit 323dd9d (Sites version 24 when reopened). The supplied uncommitted Explore implementation was integrated and extended in the existing project. The original home screen was copied to /forecast before replacing /.

## Verification

- All 37 Node test entries passed, including 8 new Explore cases: interval safety, gaps, missing data, equipment, personal rules, travel limits, Danish DST date selection, categories and profile validation.
- TypeScript noEmit passed. Production Vinext build passed.
- Browser QA: desktop, 390px iframe viewport, map marker/card selection, day and sport filters, region switching, selected-spot details, five forecast columns, and route to /ride with spot/date/at/sport context.
- Existing calendar and push test suites passed. No external calendar event or notification was sent during QA.
- Error and no-match states tested. A live provider probe returned marine snapshots but all wind providers timed out in this environment. Real-time successful forecast retrieval is not verified here.
- Full-result visual QA used synthetic snapshots seeded ONLY into the ignored local Miniflare database. Those fixtures and the temporary viewport wrapper are excluded from the source and build. Screenshots of fit scores are examples, not current forecasts.

## Boundaries

- The same rules engine supplies Explore and session planning. Explore uses two contiguous hours and rejects a window if either hour fails a hard or required-data condition. Confidence is the weaker of the two hours, never a probability.
- Saved gear types, enabled disciplines, level, personal rules and known travel limits affect fit. Missing drive time is left unknown. Gear sizes are preserved but not used for exact kite sizing.
- Stance and frontside/backside preference are saved with the account profile. They deliberately do not modify fit until local wave-break direction is known. No inferred frontside/backside claim is displayed.
- Progression ranks available windows in the user's chosen discipline. It is not trick-specific coaching. The relaxed-session suggestion requires known swell and limited gust ratio.
- Middles is an approximate area coordinate (57.12, 8.64), sourced from https://lets-kite.com/en/spots/10271/kitesurf/middles. Launch and break geometry are unknown. Agger Tange is represented by the existing Høfde 72 location, not duplicated.
- /forecast, /ride, /calendar, /decision-lab and /push remain available. Detail comparison is available inline for spots not in the original four-spot forecast screen.
- Saved without deployment. Existing public version remains unchanged.
