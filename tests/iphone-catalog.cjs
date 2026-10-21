const assert = require('node:assert/strict');
const { createRuntime } = require('./published-runtime.cjs');

(async () => {
  for (const language of ['it', 'en']) {
    const r = createRuntime(language); r.seed();
    const note = language === 'it'
      ? 'Ama la tecnologia e cerca un iPhone 15 ricondizionato oppure una cover MagSafe compatibile.'
      : 'Loves technology and wants a refurbished iPhone 15 or a compatible MagSafe phone case.';
    for (const [key, value] of Object.entries({ interest: ['techGaming'], subinterest: ['tech'], tone: 'useful', budgetChoice: '500', timing: 'none', note })) r.set(key, value);
    await r.a.showResults();
    const html = r.el('#resultGrid').innerHTML;
    assert.equal((html.match(/class="gift-card"/g) || []).length, 3);
    for (const asin of ['B0CVJ8716B', 'B0DMT42CFL']) assert.ok(html.includes(`/dp/${asin}?tag=3gifts-21`));
    assert.equal(r.el('#zeroRecovery').hidden, true);
    assert.ok(r.R.validBudget(500)); assert.ok(!r.R.validBudget(505));
    const base = { ...r.a.formData(), allowUnverified: true };
    const eligible = (asin, change = {}) => {
      const profile = { ...base, ...change };
      return r.R.eligible(r.products.find(p => p.asin === asin), profile, r.a.analyseNote(profile.note), r.H.isEligible);
    };
    assert.equal(eligible('B0CVJ8716B', { budget: 300 }), false);
    assert.equal(eligible('B0CVJ8716B', { budget: 450 }), true);
    assert.equal(eligible('B0DMT42CFL', { budget: 15 }), true);
    for (const model of ['iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 15 Plus', 'iPhone 16']) {
      for (const asin of ['B0CVJ8716B', 'B0DMT42CFL']) assert.equal(eligible(asin, { note: `Tecnologia e cover MagSafe per ${model}` }), false);
    }
    assert.equal(eligible('B0DMT42CFL', { note: 'Ama la tecnologia' }), false);
    assert.equal(eligible('B0CVJ8716B', { note: 'Tecnologia, no ricondizionati' }), false);
    assert.equal(eligible('B0DMT42CFL', { note: 'Tecnologia per iPhone 15, no cover' }), false);
    for (const asin of ['B0CVJ8716B', 'B0DMT42CFL']) {
      assert.equal(eligible(asin, { avoid: ['tech'] }), false);
      assert.equal(eligible(asin, { note: 'No iPhone 15' }), false);
      assert.equal(eligible(asin, { timing: 'urgent2', deadline: r.R.dateAfter(2) }), false);
      assert.equal(eligible(asin, { allowUnverified: false }), false);
    }
    const score = items => Array.from(r.a.rankProducts(items, base, r.a.analyseNote(note)), p => p.id);
    assert.deepEqual(score(r.products.map(p => ({ ...p, store: 'Etsy' }))), [], 'Amazon-only policy excludes relabeled Etsy items');
    console.log(JSON.stringify({ language, results: score(r.products), bothProductsVisible: true, browserQA: false }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
