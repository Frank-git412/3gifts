const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRuntime } = require('./published-runtime.cjs');

(async () => {
  const source = JSON.parse(fs.readFileSync('catalog-products.json', 'utf8'));
  const asins = ['B0DD733WQG', 'B00MXY21LW', 'B07BQC7GNL'];
  assert.equal(source.count, source.products.length);
  for (const language of ['it', 'en']) {
    const r = createRuntime(language); r.seed();
    const owned = language === 'it' ? 'Ama la musica. Possiede già diffusori passivi.' : 'Loves music. Already owns passive speakers.';
    for (const [key, value] of Object.entries({ interest: ['mediaAudio'], subinterest: ['music'], tone: 'useful', budgetChoice: '200', timing: 'none', note: owned })) r.set(key, value);
    const base = { ...r.a.formData(), allowUnverified: true };
    const items = asins.map(asin => r.products.find(p => p.asin === asin));
    const eligible = (p, changes = {}) => {
      const profile = { ...base, ...changes };
      return r.R.eligible(p, profile, r.a.analyseNote(profile.note), r.H.isEligible);
    };
    for (const p of items) {
      assert.ok(p && eligible(p), `${language}: ${p?.asin} selectable`);
      assert.equal(r.products.filter(other => other.asin === p.asin).length, 1);
      assert.equal(eligible(p, { budget: 50 }), false);
      assert.equal(eligible(p, { minBudget: 200 }), false);
      for (const ageRange of ['earlyChild', 'child', 'teen']) assert.equal(eligible(p, { ageRange }), false);
      assert.equal(eligible(p, { allowUnverified: false }), false);
      assert.equal(eligible(p, { timing: 'urgent2', deadline: r.R.dateAfter(2) }), false);
      assert.equal(eligible(p, { interests: ['sportFitness'], subinterests: ['sport'] }), false);
      assert.equal(eligible(p, { note: language === 'it' ? 'No musica' : 'No music' }), false);
      assert.equal(p.priceStatus, 'indicative');
      assert.equal(r.R.verifiedOffer(p), false);
      assert.ok(r.a.storeUrl(p).includes(`/dp/${p.asin}?tag=3gifts-21`));
    }
    const amplifier = items[2];
    for (const note of [
      '', 'Ama la musica', 'Vorrei dei diffusori passivi', 'Non possiede diffusori passivi',
      'Ha dei diffusori attivi', 'Se ha diffusori passivi', 'Forse possiede diffusori passivi',
      'Loves music', 'Wants passive speakers', 'Does not have passive speakers',
      "Doesn't have passive speakers", 'Has no passive speakers', 'If he has passive speakers',
      'Maybe he owns passive speakers', 'He had passive speakers'
    ]) assert.equal(eligible(amplifier, { note }), false, note);
    for (const note of ['Ha già delle casse passive', 'Possiede diffusori passivi', 'He owns passive speakers', 'She already has a pair of passive speakers'])
      assert.equal(eligible(amplifier, { note }), true, note);
    const rank = (candidates, changes = {}) => {
      const profile = { ...base, ...changes };
      return Array.from(r.a.rankProducts(candidates, profile, r.a.analyseNote(profile.note)));
    };
    assert.equal(rank(items).filter(p => p.conceptFamily === 'bookshelf-speakers').length, 1);
    assert.ok(rank(r.products, { minBudget: 55, budget: 100, note: '' }).some(p => p.asin === asins[0]), 'LONPOO reachable');
    assert.ok(rank(r.products, { minBudget: 100, note: '' }).some(p => p.asin === asins[1]), 'Edifier reachable');
    assert.ok(rank(r.products).some(p => p.asin === asins[2]), 'Fosi reachable');
    await r.a.showResults();
    const html = r.el('#resultGrid').innerHTML;
    assert.ok(html.includes('/dp/B07BQC7GNL?tag=3gifts-21'), 'amplifier card rendered');
    assert.ok(html.includes(language === 'it' ? 'diffusori passivi' : 'passive speakers'), 'compatibility visible');
    const echo = r.products.find(p => p.asin === 'B09TPZSS9C');
    assert.match(echo.name, /ricondizionato|refurbished/i);
    assert.ok(r.R.violatesExclusions(echo, base, r.a.analyseNote(language === 'it' ? 'No ricondizionati' : 'No refurbished')));
    const swisscard = r.products.find(p => p.asin === 'B001U5042I');
    assert.equal(r.R.ageEligible(swisscard, { ageRange: 'teen' }), false);
    console.log(JSON.stringify({ language, newProducts: items.length, rankingAndCards: 'passed', compatibility: 'passed', browserQA: false }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
