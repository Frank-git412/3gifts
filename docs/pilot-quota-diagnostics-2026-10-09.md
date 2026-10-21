# M3 pilot and M4 protections — 9 October 2026

This follows the v115 budget continuity and delivery-copy correction. It starts M3; it does not declare the full M2 scoring specification or M3–M7 complete.

## Event evidence

Nine editorial rules cover books, technology and skincare across wedding, new baby and anniversary. A listing must contain both an allowed product family and the concrete use/recipient required by the rule. Generic house, relaxation and romantic wording no longer activates the event tier. Personal mode removes event influence, retaining ordinary category matching and constraints. `eventEvidence` exposes rule, source and status; it is linguistic evidence from the listing, not independent product certification. Outside these pilot subcategories only explicit event terms qualify. Relationship/effect mappings, weighted M2 scoring and broader vocabulary remain unfinished. Rules, positive and negative examples are in `server/research/pilot-context.mjs`.

## Catalogue budget

All three Amazon catalogue routes use the same D1-backed transport. Each uncached outgoing attempt atomically reserves a row in a rolling 24-hour window. Default application ceiling: 6,912 calls (80% of the owner-declared 8,640/day baseline). `AMAZON_DAILY_REQUEST_LIMIT` may set an integer from 1 to 8,640. This is not a verified account allowance or Amazon reset timezone. Failed upstream calls consume a reservation; cache and shared in-flight hits do not. Missing storage, invalid limits or exhausted budget prevent catalogue calls. Public recommendation request metrics also cap attempts at 12. Existing 1.1-second pacing, Retry-After and cache remain.

Migration `0001_happy_nocturne.sql` was generated from `db/schema.ts` with the existing Drizzle toolchain; the earlier migration is unchanged. Indexed timestamps support reservation and cleanup. The counter starts at release: previous calls and other consumers of the credentials are not reconstructed. Account limits and other consumers remain an operational follow-up, so G01 is only partially closed.

## Final selection

`diagnostics.finalSelection` accounts for each unique normalized candidate: public rejection, engine rejection, selected, same parent variant, equivalent function, or not selected after priority/coverage. Duplicates reference a selected ASIN. Pre-normalization rows still have aggregate counts only. Diagnostics do not persist visitor notes or profiles. C25 has not been rerun on Amazon; its cause is not asserted from the new synthetic tests. G03 is partially closed.

## Historical test alignment

The four suites now use fixed synthetic listing examples through the real server planner, public filters and selector, delivered to the shipped frontend runtime. They do not simulate a browser or live availability.

- `child-categories`: replaces network-disabled local-catalog expectations with the research API contract; retains stage, age, category and Amazon checks.
- `upper-budget`: preserves 324 legacy-ranking comparisons and explicit constraints; refinement now preserves the automatic floor. UI assertions use the actual research range disclosure, await submissions and verify no repeats.
- `natural-language-exclusions`: examines displayed research products rather than looking them up in the legacy catalogue; allows one/two disclosed alternatives instead of requiring three fillers; still requires three when compatible technology alternatives exist. Strengthened title checks found and fixed books misclassified under art escaping exclusions.
- `recipient-preference`: Amazon fixture URLs, explicit unisex evidence, current catalog IDs 43/44 instead of removed IDs, marketplace eligibility, awaited refinements and matching current asset versions. Marketing wording is not assumed to certify a unisex variant; ordinary wall clocks remain eligible.

## Verification

73 server tests pass: research-*.mjs, amazon-efficiency, amazon-quota, amazon-connection, amazon-catalog, refinement-context, worker-research, event-personal, pilot-context and selection-diagnostics. Quota tests use actual SQLite migrations and independent module instances, covering the last shared slot, rolling expiry, invalid/no storage, upstream failures and cache reuse. Selection tests connect exclusions/duplicates to their final decisions.

The frontend regression run covers the four historical suites plus budget-continuity, event-personal-ui, research-questionnaire, age-review-cards, privacy-consent, localization and worker-routing. Exact run totals are recorded in the progress report. No real Amazon calls or mobile browser certification are claimed by these tests.
