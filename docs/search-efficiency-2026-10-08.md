# Search efficiency — 8 October 2026

Revision `20261008-efficiency1` preserves the UI and eligibility/ranking rules.

- Stop once three distinct eligible ideas cover the selected interests and, when at most three are selected, requested subcategories. Continue up to the existing twelve-query ceiling otherwise.
- Alternate interests in query scheduling. Preserve separate query associations even when two query bodies match; the transport coalesces the actual Amazon call.
- Reuse exact catalogue request results for 15 minutes, retaining their original observation timestamp. Keys include operation, full request (budget, resources, tag) and credential identifier hash. Never store raw notes or visitor profiles.
- D1 provides shared cache and an atomic lease for all catalogue API paths: recommendations, curated catalogue, connection check. A lease expires after 15 seconds; outbound timeout is at most 8 seconds. Calls are separated by at least 1.1 seconds from the actual prior call start. Cache is checked again after acquiring the lease to prevent cross-worker duplicate calls.
- Honour Amazon 429 cooldown, including retry hints. Server errors trigger a short shared cooldown. Stop failed recommendation runs rather than issuing the same failure across twelve queries. Preserve valid items in partial upstream results, without caching partial responses.
- D1 failures fail the operation without bypassing the limiter. Without a D1 binding, local tests use an in-process queue; production declares DB in the hosting manifest.
- Private logs contain aggregate request timing, call/cache counts and sanitized error categories, not raw profiles, notes, product bodies or credentials.

The limiter covers this public Site, not other projects using the same Amazon account. The account's actual daily quota remains unverified; no daily quota is invented or enforced. Token caching remains per Worker instance. These optimizations do not correct the separately documented relevance, age parsing or recipient-negation defects.

Validation: existing quality/context tests; bundled Worker routing; real SQLite migrations and shared-cache/lease tests using independent bundled Worker instances; expiry, budget isolation, 429 cooldown, storage failure, early termination and refinement exclusions. Controlled technology fixture: three calls for the first three ideas, zero for the repeated search, three additional calls for refinement excluding all prior ASINs. This is a deterministic test result, not a live Amazon performance guarantee.

Schema maintained in db/schema.ts. Migration generated with drizzle-kit 0.31.11 / drizzle-orm 0.44.7. Packaging includes immutable Drizzle migration metadata under dist/.openai/drizzle; it is not served as public content.
