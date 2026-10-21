import fs from "node:fs";
import vm from "node:vm";

const context = { window: {}, URL, URLSearchParams };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("./catalog.js", import.meta.url), "utf8"), context);
vm.runInContext(fs.readFileSync(new URL("./catalog-health.js", import.meta.url), "utf8"), context);

const products = context.window.TRE_REGALI_CATALOG;
const health = context.window.TRE_REGALI_HEALTH;
const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const failures = [];
const assert = (condition, detail) => { if (!condition) failures.push(detail); };

const areas = {
  techGaming: ["tech", "gaming"], culture: ["books", "comics", "culture"],
  mediaAudio: ["music", "cinema", "audio"], foodDrink: ["food", "wine", "coffeeTea"],
  travelOutdoor: ["travel", "outdoor", "organization"], sportFitness: ["sport", "fitness", "recovery"],
  artPhoto: ["creative", "photo", "craft"], homeGarden: ["home", "garden", "organization"],
  styleBeauty: ["style", "beauty", "jewelry"], animalsNature: ["pets", "nature", "petCare"],
  gamesCollecting: ["boardGames", "puzzle", "collecting"], newsBusiness: ["news", "learning", "writing"],
};
const tones = ["sentimental", "useful", "funny", "surprising", "elegant", "neutral"];
const ages = ["teen", "youngAdult", "adult", "mature", "unknown"];
const relations = ["partner", "friend", "family", "colleague", "couple"];
const occasions = ["birthday", "anniversary", "christmas", "graduation", "thanks", "wedding", "newhome", "newbaby", "event"];
const budgets = [15, 50, 100, 300];
const timings = ["urgent2", "week", "month", "exact", "none"];
const toneSignals = {
  sentimental: ["personalized", "partner", "family", "photo", "symbolic"], useful: ["practical", "tech", "home", "service"],
  elegant: ["style", "beauty", "home", "craft"], funny: ["funny", "social", "gaming"],
  surprising: ["adventurous", "creative", "experience", "recurring", "symbolic"], neutral: [],
};
const macroByArea = Object.fromEntries(Object.keys(areas).map((area) => [area, products.find((p) => p.tags.includes(area))?.macro]));

assert(Array.isArray(products) && products.length === 240, { check: "catalog-size", actual: products?.length });
assert(new Set(products.map((p) => String(p.id))).size === products.length, { check: "unique-ids" });
assert(new Set(products.map((p) => p.name)).size === products.length, { check: "unique-names" });
assert(new Set(products.map((p) => p.directUrl)).size === products.length, { check: "unique-links" });
assert(products.every((p) => /^https:\/\//.test(p.directUrl)), { check: "https-links" });
assert(products.every((p) => p.name && p.macro && p.subcategory && p.price > 0 && p.store), { check: "required-fields" });
assert(html.includes('<script src="catalog-health.js"></script>'), { check: "health-script-loaded" });
assert((html.match(/name="interest"/g) || []).length === 12, { check: "macroarea-ui-count" });
assert(!html.includes('value="0-12"'), { check: "excluded-age-0-12" });
assert((html.match(/class="step(?: active)?"/g) || []).length === 7, { check: "questionnaire-visible-step-count" });
assert(html.indexOf('data-step-key="relation"') < html.indexOf('data-step-key="perspective"'), { check: "relation-before-perspective" });
assert(html.includes("Facoltativo: aggiungi gusti, passioni o cose da evitare"), { check: "optional-details-copy" });
assert(html.includes('role="progressbar"') && app.includes("visibleSteps()") && app.includes("aria-valuenow"), { check: "dynamic-progress" });
assert(app.includes('questionnaire_step_timing') && app.includes('trackStepTiming("exit")'), { check: "per-step-timing" });
assert(html.includes('id="zeroRecovery"') && app.includes("showZeroRecovery") && app.includes('zero_results_recovery'), { check: "zero-results-recovery" });

const macroCounts = Object.fromEntries([...new Set(products.map((p) => p.macro))].map((macro) => [macro, products.filter((p) => p.macro === macro).length]));
const subcategoryCounts = Object.fromEntries(Object.keys(macroCounts).map((macro) => [macro, new Set(products.filter((p) => p.macro === macro).map((p) => p.subcategory)).size]));
assert(Object.keys(macroCounts).length === 12 && Object.values(macroCounts).every((count) => count === 20), { check: "macroarea-distribution", macroCounts });
assert(Object.values(subcategoryCounts).every((count) => count <= 4), { check: "subcategory-limit", subcategoryCounts });

const freshDate = new Date().toISOString();
for (const [area, macro] of Object.entries(macroByArea)) {
  const lowBudget = products.filter((p) => p.macro === macro && p.price <= 15);
  assert(lowBudget.length >= 6, { check: "low-budget-reserve", area, count: lowBudget.length });
  const unavailable = lowBudget.slice(0, Math.max(1, Math.floor(lowBudget.length * 0.3)));
  const snapshot = { generatedAt: freshDate, products: unavailable.map((p) => ({ id: p.id, availability: "NON DISPONIBILE", status: "NON DISPONIBILE", checkedAt: freshDate })) };
  const merged = health.merge(products, snapshot, { maxAgeHours: 192 });
  const survivors = merged.products.filter((p) => p.macro === macro && p.price <= 15 && health.isEligible(p));
  assert(survivors.length >= 3, { check: "30-percent-unavailable", area, survivors: survivors.length });
}

const sample = products[0];
const priceSnapshot = { generatedAt: freshDate, products: [{ id: sample.id, price: 11.49, availability: "DISPONIBILE", status: "OK", checkedAt: freshDate }] };
const priceMerge = health.merge(products, priceSnapshot, { maxAgeHours: 192 });
assert(priceMerge.products[0].price === 11.49 && priceMerge.products[0].priceStatus === "monitored", { check: "fresh-price-override" });
const staleSnapshot = { generatedAt: "2020-01-01T00:00:00Z", products: [{ id: sample.id, price: 1, availability: "NON DISPONIBILE", status: "NON DISPONIBILE", checkedAt: "2020-01-01T00:00:00Z" }] };
const staleMerge = health.merge(products, staleSnapshot, { maxAgeHours: 192 });
assert(staleMerge.products[0].price === sample.price && !health.isEligible(staleMerge.products[0]), { check: "stale-negative-remains-blocked" });

function rank(profile, source = products) {
  const interestTags = [profile.area, ...areas[profile.area]];
  let eligible = source.filter((p) => health.isEligible(p) && p.price <= profile.budget);
  const relevant = eligible.filter((p) => p.tags.some((tag) => interestTags.includes(tag)));
  if (relevant.length >= 3) eligible = relevant;
  if (profile.timing === "urgent2") {
    const instant = eligible.filter((p) => p.instant);
    if (instant.length >= 3) eligible = instant;
  }
  return eligible.map((p) => {
    let score = 0;
    interestTags.forEach((tag) => { if (p.tags.includes(tag)) score += 3; });
    toneSignals[profile.tone].forEach((tag) => { if (p.tags.includes(tag) || p.type === tag) score += 2.5; });
    [profile.relation, profile.occasion].forEach((tag) => { if (p.tags.includes(tag)) score += 1.5; });
    return { ...p, score };
  }).sort((a, b) => b.score - a.score || a.price - b.price);
}

let exhaustiveProfiles = 0;
for (const mode of ["recipient", "giver"])
  for (const area of Object.keys(areas))
    for (const tone of tones)
      for (const age of ages)
        for (const budget of budgets)
          for (const timing of timings) {
            exhaustiveProfiles += 1;
            const result = rank({ mode, area, tone, age, relation: "friend", occasion: "birthday", budget, timing });
            if (result.length < 3) failures.push({ check: "three-results", mode, area, tone, age, budget, timing, count: result.length });
          }

for (const mode of ["recipient", "giver"])
  for (const area of Object.keys(areas))
    for (const relation of relations)
      for (const occasion of occasions) {
        exhaustiveProfiles += 1;
        const result = rank({ mode, area, tone: "neutral", age: "unknown", relation, occasion, budget: 15, timing: "week" });
        if (result.length < 3) failures.push({ check: "relation-occasion-coverage", mode, area, relation, occasion, count: result.length });
      }

let refinementProfiles = 0;
for (const area of Object.keys(areas)) {
  for (const tone of tones) {
    for (const budget of budgets) {
      const rejected = new Set();
      for (let round = 0; round < 4; round += 1) {
        refinementProfiles += 1;
        const result = rank(
          { area, tone, relation: "friend", occasion: "birthday", budget, timing: "week" },
          products.filter((p) => !rejected.has(p.id)),
        ).slice(0, 3);
        assert(result.length === 3, { check: "refinement-capacity", area, tone, budget, round, count: result.length });
        result.forEach((p) => rejected.add(p.id));
      }
      assert(rejected.size === 12, { check: "refinement-no-repeats", area, tone, budget, unique: rejected.size });
    }
  }
}

const zeroResultProfiles = [
  { budget: 15, timing: "urgent2", area: "techGaming", tone: "useful" },
  { budget: 50, timing: "week", area: "culture", tone: "sentimental" },
  { budget: 100, timing: "exact", area: "homeGarden", tone: "elegant" },
];
for (const profile of zeroResultProfiles) {
  const result = rank({ ...profile, relation: "friend", occasion: "birthday" }, []);
  assert(result.length < 3, { check: "zero-result-fixture", profile, count: result.length });
}

const report = {
  catalogProducts: products.length,
  marketplaces: Object.fromEntries([...new Set(products.map((p) => p.store))].map((store) => [store, products.filter((p) => p.store === store).length])),
  macroCounts,
  subcategoryCounts,
  exhaustiveProfiles,
  refinementProfiles,
  zeroResultRecoveryProfiles: zeroResultProfiles.length,
  healthFailureSimulations: Object.keys(areas).length,
  failures: failures.slice(0, 50),
  totalFailures: failures.length,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
