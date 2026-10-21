const {installResearchFixture,submitRefinement}=require('./research-api-fixture.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRuntime, ROOT } = require('./published-runtime.cjs');
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }

(async () => {
  for (const language of ['it', 'en']) {
    const r = createRuntime(language); r.seed();await installResearchFixture(r);
    const base = { ...r.a.formData(), relation: 'partner', interests: ['styleBeauty'], subinterests: [], budget: 100, timing: 'none', tone: 'neutral', allowUnverified: true };
    const analysis = r.a.analyseNote('');
    let fixtureId=0;
    const gift = (id, name, extra = {}) => r.a.normalizeProduct({ id, name, price: 40, tags: ['styleBeauty', 'style', 'jewelry'], store:'Amazon', type:'product', directUrl: 'https://www.amazon.it/dp/B'+String(++fixtureId).padStart(9,'0'), ...extra });
    const men = gift('men-watch', 'Orologio da uomo');
    const women = gift('women-watch', 'Women’s watch');
    const unisex = gift('unisex-watch', 'Orologio unisex');
    const unknown = gift('unknown-watch', 'Orologio modello classico');
    const declared = gift('declared-watch', 'Modello 123', { recipientTarget: 'men' });
    const neutral = gift('neutral', 'Portafoglio in pelle unisex');
    const eligible = (product, preference, changes = {}) => r.R.eligible(product, { ...base, recipientPreference: preference, ...changes }, analysis, r.H.isEligible);

    check(r.steps.length === 7, `${language}: no extra questionnaire step`);
    check(r.a.formData().recipientPreference === 'unisex' && r.a.valid(), `${language}: optional answer has a neutral default`);
    check(!r.inputs.filter(x => x.name === 'recipientPreference').some(x => x.required), `${language}: preference is optional`);
    for (const preference of ['men', 'women', 'unisex', undefined]) {
      check(eligible(men, preference) === (preference === 'men'), `${language}: men's watch matches only men's preference`);
      check(eligible(women, preference) === (preference === 'women'), `${language}: women's watch matches only women's preference`);
      check(eligible(declared, preference) === (preference === 'men'), `${language}: remote/catalog metadata survives normalization`);
      check(eligible(unisex, preference) && eligible(neutral, preference), `${language}: neutral products remain available`);
      check(!eligible(unknown, preference), `${language}: unknown watch variant cannot be guessed`);
      check(!eligible(unisex, preference, { budget: 15 }), `${language}: recipient choice cannot bypass budget`);
    }
    const verified = gift('verified-men', 'Orologio da uomo', { offer: { url: 'https://www.amazon.it/dp/B000000007', checkedAt: new Date().toISOString(), available: true, giftable: true, variantConfirmed: true, destinationCountry: 'IT', total: { amount: 40, currency: 'EUR', includesShipping: true, includesPersonalization: true }, delivery: { verified: true, by: r.R.dateAfter(1) } } });
    check(eligible(verified, 'men', { allowUnverified: false }) && !eligible(verified, 'women', { allowUnverified: false }), `${language}: verified offers obey the same recipient filter`);
    check(r.R.productRecipientTarget({ name: 'Orologio per uomo e donna' }) === 'unisex', `${language}: both audiences are recognized`);
    check(r.R.recipientEligible({ name: 'Orologio da parete' },{recipientPreference:'unisex'}), `${language}: wall clocks stay neutral`);

    for (const preference of ['men', 'women', 'unisex']) for (const relation of ['partner', 'friend', 'family', 'colleague', 'couple']) for (const mode of ['recipient', 'giver']) {
      const profile = { ...base, recipientPreference: preference, relation, mode };
      const picks = r.a.rankProducts(r.products, profile, analysis);
      check(picks.length === 3, `${language}: three current-catalog results for ${preference}/${relation}/${mode}`);
      check(picks.every(p => r.R.recipientEligible(p, profile)), `${language}: current-catalog ranking respects preference`);
      const relabeled = r.a.rankProducts(r.products.map(p => ({ ...p, store: p.store === 'Amazon' ? 'Etsy' : 'Amazon' })), profile, analysis);
      check(relabeled.every(p=>r.R.marketplaceEligible(p)), `${language}: marketplace labels cannot bypass Amazon-only eligibility`);
    }
    for (const [id, preference] of [[43, 'men'], [44, 'women']]) {
      const product = r.products.find(p => p.id === String(id));
      check(r.R.productRecipientTarget(product) === preference, `${language}: known catalog item ${id} classified`);
      check(!r.R.recipientEligible(product, { recipientPreference: preference === 'women' ? 'men' : 'women' }), `${language}: opposite preference excludes ${id}`);
    }
    r.set('relation', 'partner'); r.set('recipientPreference', 'women'); r.set('interest', ['styleBeauty']); r.set('budgetChoice', '100'); r.set('timing', 'none');
    await r.a.showResults();
    check(r.el('#zeroRecovery').hidden, `${language}: automatic indicative-results fallback succeeds`);
    check(r.eval('lastProfile.recipientPreference') === 'women', `${language}: fallback preserves the preference`);
    check(Array.from(r.eval('activeCatalogProducts.filter(wasShown)')).every(p => r.R.recipientEligible(p, { recipientPreference: 'women' })), `${language}: rendered results respect preference`);
    r.set('refineReason', 'impersonal').dispatchEvent({ type: 'change' }); r.set('refineDirection', 'passion'); r.set('refineSurprise', 'balanced');
    await submitRefinement(r);
    check(Array.from(r.eval('activeCatalogProducts.filter(wasShown)')).every(p => r.R.recipientEligible(p, { recipientPreference: 'women' })), `${language}: refinement never reintroduces incompatible products`);
    check(r.events.every(e => !/recipientPreference|recipientTarget/.test(JSON.stringify(e.data))), `${language}: analytics never receives the answer`);
    r.el('#restartBtn').click();
    check(r.a.formData().recipientPreference === 'unisex', `${language}: restart resets preference`);
    const html = fs.readFileSync(path.join(ROOT, language === 'en' ? 'en/index.html' : 'index.html'), 'utf8');
    check(html.includes('role="radiogroup"') && html.includes('aria-describedby="recipientPreferenceHint"'), `${language}: accessible group and hint`);
    check(html.match(/recommendation-rules\.js\?v=([^"]+)/)?.[1]===html.match(/app\.js\?v=([^"]+)/)?.[1]&&!!html.match(/app\.js\?v=/), `${language}: returning visitors get matching questionnaire and rules`);
  }
  console.log(JSON.stringify({ checks, languages: 2, errors: 0, browserQA: false }));
})().catch(error => { console.error(error); process.exitCode = 1; });
