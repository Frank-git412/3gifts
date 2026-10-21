# M3 first dictionary block — 9 October 2026

M3 is in progress. M1 stays closed with recorded reservations; M2 v3 stays the specification. This block adds a reusable family inventory and the first relationship/effect evidence rules. It does not implement all M2 weights or complete M3/M5.

## Inventory and scope

| Pilot scope | Existing associations | Existing families |
| --- | ---: | ---: |
| culture / books | 133 | 24 |
| techGaming / tech | 190 | 21 |
| styleBeauty / skincare | 30 | 20 |
| Total | 353 | 65 |

These are dictionary associations, not unique search volumes, products or commercial coverage. `pilotDictionaryInventory()` and `m3-dictionary-inventory.json` preserve canonical IDs, Italian words, base queries, contextual query drafts, requirements, diversity guidance, rule IDs, provenance and explicit gaps. The dictionary remains the source for base searches.

## Twelve added rules

Six relationship rules: friendship in a novel's content; recipes for two; headset calls for a colleague; shared cinema; a shared skincare routine; individually usable masks to share with a friend. Six effect rules: humorous book content; adjustable reading light; uploading personal photographs; portable charging with a stated connection; daily moisturizing use; a stated frosted-glass bottle finish.

The 12 rules apply to 29 families at least once; this is only partial context coverage, not 29 completed families. Thirty-six families have no relationship/effect rule yet. In particular, the humour rule can apply to different book subjects only when humour is explicitly stated. Neither genre nor a demographic characteristic creates that evidence. Existing nine event rules remain separate and unchanged.

Runtime checks use title and features only, and preserve field, matched property, rule ID and ASIN/parent ASIN where supplied. Query words, the visitor's note and relation labels are not product evidence. Status is supported, partial, absent or contradictory. Only supported evidence contributes the existing relationship/effect bonus in the three pilot subcategories. No generic fallback bonus fills a missing pilot rule. Other subcategories keep their prior behaviour.

This is a conservative linguistic matching layer, not factual verification of marketing claims or a complete natural-language parser. Clause-level negation suppresses ambiguous bonuses; descriptions outside the covered phrasing may receive no bonus. Hard budget, category, recipient, compatibility and exclusion filters still run. Full M2 scoring 45/20/15/12/8 is pending; current 2/3-point bonuses remain unchanged. Generic occasion and gift-pack heuristics outside the nine event-priority rules also remain a follow-up.

Contextual queries in the inventory are **draft search candidates**, not new Amazon requests or the active query planner. The planner still uses its existing contextualisation. English positive examples are tested; a complete English synonym inventory is pending. Family diversity keys are documented, not a fix to the existing broad fiction duplication rule.

## Verification and remaining work

90 server tests pass, including 17 new tests: the 12 rules with Italian/English positive and generic negative cases, negation/missing/query-only evidence, wrong scope/stereotypes, real public-adapter preference changes, personal mode and inventory integrity. Network responses are simulated. The bundled Worker is exercised by the existing integration test. No new Amazon calls, real prices, user judgements or mobile verification are claimed.

The pre-existing funny-refinement test first exposed lack of plural book aliases. The rule now recognises `libri`/`books` and the inventory explicitly includes book subjects where stated humour can be relevant. The original test and assertion are unchanged.

Remaining M3: review all 65 families and applicable options; extend relation/effect and ordinary-event mappings only with defensible properties; complete IT/EN synonyms; connect and verify concrete contextual searches; distinguish works/editions/series; strengthen device/subscription and ingredient conditions; record unresolved cases. Family relation has no new rule yet; surprising/relax and other uncovered effects remain explicit gaps. Existing teen/minor restrictions continue; adult rules do not extend coverage to children's categories.

Remaining M4/M5: complete weighted ranking and evidence for other signals, replay C25 with real diagnostics, verify the account quota and other consumers before broad live testing, then freeze and evaluate 120 scenarios and collect editorial judgements. No percentage of M3 completion is claimed.
