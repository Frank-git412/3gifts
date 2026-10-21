# Quality priorities — revision 20261008-quality4

This update keeps the questionnaire and interface unchanged and retains the
shared API pacing, cache and error recovery from efficiency2.

## Listing age evidence

One parser normalizes explicit age evidence to months, including mixed-unit
ranges, same-unit ranges, minimum ages, and explicitly labelled age lists.
Contradictory bounds reject the listing. Child cohorts keep the existing
conservative full-cohort rule: a minimum above the cohort start or a maximum
below its end is insufficient. Search wording and item dimensions never supply
age evidence. Missing age remains unknown; this does not certify child safety.

## Primary object and diversity

A shared title classifier covers the observed technology, gym and sensory-toy
failures. It identifies the earliest explicit object, distinguishing a VR headset
from the smartphone it accepts, and a CD player from included headphones.
Requested device/equipment types require matching primary-object evidence.
Laptop/PC-portatile naming is equivalent. Selection groups laptop, CD player,
VR headset and other recognized primary types before using query families.
Existing skincare-kit functional overlap and ASIN/parent exclusions remain.
This is bounded rule coverage, not universal semantic product understanding.

## Recipient evidence

Negated recipient descriptions are not positive evidence. Explicit variant-only
restrictions override generic unisex wording. Conflicting restrictions exclude
the product. Gift-giver references remain masked; generic books and lamps do
not require gender marketing.

## Verification and remaining work

Tests replay captured Amazon titles/queries for the actual age, VR, mug, apron,
CD-player and laptop failures alongside valid counterparts. The fixture replay
uses captured titles rather than unavailable full historical feature payloads.
Retain existing age, recipient, context, refinement, API-efficiency and routing
tests. Missing child-age metadata, pack-size suitability and broader contextual
ranking remain separate work. No rule infers age suitability from a search query.

Live follow-up also excludes adult-profile child devices, decorative vinyl records,
and gym-themed cards/signs masquerading as weights. Latest automated suite: 43
tests passed; seven initial live profiles and three follow-ups were inspected.
Children’s books and sensory toys can still return no eligible products when
listing age evidence is missing or incompatible.
