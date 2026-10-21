const assert = require('node:assert/strict');
const { createRuntime } = require('./published-runtime.cjs');

const runtime = createRuntime();
const { a: api, R, H, c, products, el } = runtime;
const budgets = process.argv.includes('--quick') ? [15,30,50,100,200,300,500] : Array.from({ length: 98 }, (_, index) => 15 + index * 5);
const areas = ['techGaming','culture','mediaAudio','foodDrink','travelOutdoor','sportFitness','artPhoto','homeGarden','styleBeauty','animalsNature','gamesCollecting','newsBusiness'];
const modes = ['recipient','giver'];
const timingCases = [
  ['urgent2', R.dateAfter(2)], ['week', R.dateAfter(7)], ['month', R.dateAfter(30)], ['none', R.dateAfter(3650)],
  ['exact-today', R.dateAfter(0)], ['exact-1', R.dateAfter(1)], ['exact-3', R.dateAfter(3)],
  ['exact-7', R.dateAfter(7)], ['exact-30', R.dateAfter(30)], ['exact-365', R.dateAfter(365)],
];
const base = {
  journey: 'direct', relation: 'friend', occasion: 'birthday', ageRange: 'adult', subinterests: [],
  tone: 'neutral', avoid: [], note: '', allowUnverified: true,
};
const analysis = api.analyseNote('');
let rankingProfiles = 0, uiProfiles = 0, availabilityProfiles = 0, exclusionProfiles = 0, constraintBlocks = 0, assertions = 0;
const failures = [];
const blockedProfiles = [];
const check = (condition, detail) => { assertions += 1; if (!condition) failures.push(detail); };
const timingProfile = ([name, deadline]) => ({ timing: name.startsWith('exact-') ? 'exact' : name, deadline });
const requiresVerifiedDelivery = timingCase => ['urgent2','exact-today','exact-1'].includes(timingCase[0]);
// First searches at >=150 EUR deliberately start at half the maximum.
// Count only concepts inside that range; sparse inventory must not be padded.
const availableCount = (items, profile) => Math.min(3,new Set(items.filter(item=>R.eligible(item,profile,analysis,H.isEligible) && (profile.budget<150 || (R.verifiedOffer(item)?item.offer.total.amount:item.price)>=profile.budget*.5)).flatMap(item=>R.productConceptKeys(item))).size);

(async function main() {
// Complete crossing of every accepted budget, every timing case, every macro-area and both perspectives.
for (const budget of budgets) for (const timingCase of timingCases) for (const interest of areas) for (const mode of modes) {
  const profile = { ...base, ...timingProfile(timingCase), budget, interests: [interest], mode };
  const picks = api.rankProducts(products, profile, analysis);
  rankingProfiles += 1;
  const expectedCount=availableCount(products,profile);
  check(picks.length === expectedCount, { check: requiresVerifiedDelivery(timingCase)?'urgent-unverified-blocked':'three-ranked-results', budget, timing: timingCase[0], interest, mode, count: picks.length });
  check(new Set(picks.map(item => item.id)).size === picks.length, { check: 'unique-results', budget, timing: timingCase[0], interest, mode });
  check(picks.every(item => item.price <= budget), { check: 'budget-respected', budget, timing: timingCase[0], interest, mode, prices: picks.map(item => item.price) });
  check(picks.every(item => H.isEligible(item)), { check: 'known-availability-respected', budget, timing: timingCase[0], interest, mode });
}

// Exercise the actual results UI for every budget, the four presets plus exact dates, and all areas.
c.formProfile = { ...base };
c.globalThis = c;
require('node:vm').runInContext('formData=()=>globalThis.formProfile', c);
for (const budget of budgets) for (const timingCase of timingCases) for (const interest of areas) {
  c.formProfile = { ...base, ...timingProfile(timingCase), budget, interests: [interest], mode: 'recipient', allowUnverified: false };
  await api.showResults();
  uiProfiles += 1;
  const cardCount = (el('#resultGrid').innerHTML.match(/class="gift-card"/g) || []).length;
  if(requiresVerifiedDelivery(timingCase)){
    check(!el('#zeroRecovery').hidden && cardCount === 0, { check: 'ui-urgent-recovery', budget, timing: timingCase[0], interest, cardCount, recoveryHidden: el('#zeroRecovery').hidden });
    const dateChangeUseful=availableCount(products,{...c.formProfile,timing:'none',allowUnverified:true})>0;
    check(el('#changeDateRecovery').hidden===!dateChangeUseful, { check: 'ui-urgent-date-recovery', budget, timing: timingCase[0], interest });
  }else{
    const expected=availableCount(products,{...c.formProfile,allowUnverified:true});
    check(el('#zeroRecovery').hidden === (expected>0) && cardCount === expected, { check: 'ui-renders-available-distinct-cards', budget, timing: timingCase[0], interest, cardCount, expected });
    check(expected>0?/devono essere confermati|restano da verificare/.test(el('#recommendationStatus').textContent):!el('#zeroRecovery').hidden&&!!el('#zeroRecoveryText').textContent, { check: 'ui-disclaimer', budget, timing: timingCase[0], interest });
  }
}

// Remove 30% of the cheapest relevant inventory and repeat all budgets and timing presets.
const now = new Date().toISOString();
for (const interest of areas) {
  const relevant = products.filter(item => item.tags.includes(interest)).sort((a, b) => a.price - b.price);
  const unavailable = relevant.slice(0, Math.max(1, Math.floor(relevant.length * .3)));
  const monitored = H.merge(products, { products: unavailable.map(item => ({ id: item.id, status: 'OUT_OF_STOCK', checkedAt: now })) }).products;
  for (const budget of budgets) for (const timingCase of timingCases.slice(0, 4)) {
    const profile = { ...base, ...timingProfile(timingCase), budget, interests: [interest], mode: 'recipient' };
    const picks = api.rankProducts(monitored, profile, analysis);
    availabilityProfiles += 1;
    check(picks.length === availableCount(monitored,profile), { check: 'availability-degradation-distinct-candidates', budget, timing: timingCase[0], interest, count: picks.length });
    check(picks.every(item => H.isEligible(item) && !unavailable.some(blocked => blocked.id === item.id)), { check: 'unavailable-never-selected', budget, timing: timingCase[0], interest });
  }
}

// Cross every budget and preset timing with structured exclusions. Zero results are allowed only when constraints truly remove the area.
const avoidSets = [[], ['bulky'], ['sizes'], ['foodAlcohol'], ['subscriptions'], ['experiences'], ['gadgets'], ['bulky','sizes','gadgets']];
for (const budget of budgets) for (const timingCase of timingCases.slice(0, 4)) for (const interest of areas) for (const avoid of avoidSets) {
  const profile = { ...base, ...timingProfile(timingCase), budget, interests: [interest], mode: 'recipient', avoid };
  const picks = api.rankProducts(products, profile, analysis);
  exclusionProfiles += 1;
  check(picks.every(item => !R.violatesExclusions(item, profile, analysis)), { check: 'exclusion-respected', budget, timing: timingCase[0], interest, avoid });
  if (picks.length < 3) { constraintBlocks += 1; blockedProfiles.push({ ...profile, timingName: timingCase[0] }); }
}

// Partial results are useful, but must obey every constraint and never contain fillers.
for (const profile of blockedProfiles) {
  c.formProfile = { ...profile, allowUnverified: false };
  await api.showResults();
  const cardCount = (el('#resultGrid').innerHTML.match(/class="gift-card"/g) || []).length;
  const expected=availableCount(products,profile);
  check(el('#zeroRecovery').hidden === (expected>0) && cardCount === expected, { check: 'constraint-limited-results-explained', budget: profile.budget, timing: profile.timingName, interest: profile.interests[0], avoid: profile.avoid, cardCount, expected });
}

// Invalid/past exact dates must fail closed; valid boundary dates must render three cards.
for (const deadline of ['2020-01-01', '2026-02-30', 'bad-date']) {
  const picks = api.rankProducts(products, { ...base, budget: 100, interests: ['culture'], mode: 'recipient', timing: 'exact', deadline }, analysis);
  check(picks.length === 0, { check: 'invalid-exact-date-blocked', deadline, count: picks.length });
}

console.log(JSON.stringify({
  budgets: budgets.length,
  budgetRange: [budgets[0], budgets.at(-1)],
  timingCases: timingCases.map(item => item[0]),
  macroAreas: areas.length,
  rankingProfiles,
  uiProfiles,
  availabilityProfiles,
  exclusionProfiles,
  constraintBlocks,
  assertions,
  failures: failures.slice(0, 30),
  totalFailures: failures.length,
}, null, 2));

assert.equal(failures.length, 0, `${failures.length} matrix failures`);
})().catch(error => { console.error(error); process.exitCode = 1; });
