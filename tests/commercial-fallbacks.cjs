// Shipped runtime with synthetic commercial observations. No browser or seller claims.
const assert = require('node:assert/strict');
const { createRuntime } = require('./published-runtime.cjs');
let checks = 0;
const check = (ok, label) => { assert.ok(ok, label); checks++; };
async function main() {
  for (const language of ['it', 'en']) {
    const r = createRuntime(language); r.seed();
    const now = Date.now(), stamp = new Date(now).toISOString();
    const p = r.products.find(x => x.asin && r.R.productLink(x.directUrl));
    const duplicate = { ...p, id: 'same-asin-other-id' };
    const merge = observations => r.H.merge([p, duplicate], { products: observations }, { now });
    const negative = { asin: p.asin, available: false, checkedAt: stamp };
    let result = merge([negative]);
    check(result.meta.matched === 2, 'ASIN-only health matches internal IDs');
    check(result.products.every(x => !r.H.isEligible(x)), 'all copies of unavailable ASIN excluded');
    check(!r.H.isEligible(merge([{ url: `https://www.amazon.it/gp/product/${p.asin}?tag=other-21`, status: 'OUT_OF_STOCK', checkedAt: stamp }]).products[0]), 'URL-only observation resolves ASIN independent of query');
    check(!r.H.isEligible(merge([{ ...negative, checkedAt: new Date(now - 10 * 86400000).toISOString() }]).products[0]), 'stale negative fails closed');
    check(r.H.isEligible(merge([{ ...negative, checkedAt: new Date(now + 86400000).toISOString() }]).products[0]), 'future observation ignored');
    check(r.H.isEligible(merge([{ ...negative, checkedAt: new Date(now - 1000).toISOString() }, { id: p.id, available: true, checkedAt: stamp }]).products[0]), 'latest positive observation wins');
    check(!r.H.isEligible(merge([{ id: p.id, available: true, checkedAt: stamp }, negative]).products[0]), 'negative wins tied timestamps');
    const unrelated = merge([{ asin: 'B000000001', available: false, checkedAt: stamp }]);
    check(unrelated.meta.matched === 0 && unrelated.products[0] === p, 'unrelated ASIN leaves catalog untouched');
    const changed = r.H.merge([{ ...p, offer: { verified: true } }], { products: [{ asin: p.asin, price: 600, available: true, checkedAt: stamp }] }, { now }).products[0];
    check(changed.price === 600 && changed.offer === null, 'new price invalidates previous offer certification');
    const profile = { ...r.a.formData(), interests: p.tags.filter(x => ['techGaming','culture','mediaAudio','foodDrink','travelOutdoor','sportFitness','artPhoto','homeGarden','styleBeauty','animalsNature','gamesCollecting','newsBusiness'].includes(x)), budget: 500, timing: 'none', allowUnverified: true };
    check(r.a.rankProducts([changed], profile, r.a.analyseNote('')).length === 0, 'updated price above budget excluded');
    const unchanged = merge([{ asin: p.asin, price: 'unknown', checkedAt: stamp }]).products[0];
    check(unchanged.price === p.price, 'unknown price never becomes zero');
    r.set('interest', ['culture']); r.set('timing', 'none');
    await r.a.showResults();
    check(r.eval('displayedProducts.length') > 0, 'static indicative catalog remains usable');
    check(/Prezzo indicativo|Estimated price/.test(r.el('#resultGrid').innerHTML), 'indicative price disclosed');
    check(r.el('#resultGrid').innerHTML.includes('data-no-image="true"'), 'absent image uses no-image layout');
    check(!r.el('#resultGrid').innerHTML.includes('<img'), 'no unlicensed external photo introduced');
    const image = { handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, closest() { return wrap; } };
    const card = { setAttribute(k, v) { this[k] = v; } }, wrap = { innerHTML: '<img>', closest() { return card; } };
    const select = r.c.document.querySelectorAll;
    r.c.document.querySelectorAll = selector => selector === '.gift-image-link img' ? [image] : select(selector);
    r.eval('bindProductImageFallbacks()'); image.handlers.error();
    check(wrap.innerHTML === '' && card['data-no-image'] === 'true', 'broken image removes empty visual slot');
    r.c.document.querySelectorAll = select;
    // Exercise the integration through the configured monitor endpoint, not just merge().
    r.c.window.TRE_REGALI_CONFIG.catalogHealthEndpoint = 'https://monitor.example.test/exec';
    r.c.fetch = async () => ({ ok: true, json: async () => ({ products: r.products.filter(x => x.asin).map(x => ({ asin: x.asin, available: false, checkedAt: stamp })) }) });
    await r.a.showResults();
    check(r.eval('displayedProducts.length') === 0 && !r.el('#zeroRecovery').hidden, 'ASIN-only unavailable snapshot activates recovery');
    r.c.fetch = async () => { throw new Error('simulated monitor outage'); };
    await r.a.showResults();
    check(r.eval('displayedProducts.length') === 0, 'cached negative observations remain blocking');
    const fresh = createRuntime(language); fresh.seed(); fresh.set('timing', 'none');
    fresh.c.window.TRE_REGALI_CONFIG.catalogHealthEndpoint = 'https://monitor.example.test/exec';
    await fresh.a.showResults();
    check(fresh.eval('displayedProducts.length') > 0 && /Prezzo indicativo|Estimated price/.test(fresh.el('#resultGrid').innerHTML), 'monitor outage without observations returns disclosed indicative ideas');
  }
  console.log(JSON.stringify({ checks, languages: 2, errors: 0, browserQA: false, liveOffersVerified: false }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
