const assert = require('node:assert/strict');
const {createRuntime} = require('./published-runtime.cjs');

(async () => {
  const asins = ['B0DBF65JYY', 'B0GS97T2MV', 'B0CX5B5VTX'];
  for (const language of ['it', 'en']) {
    const r = createRuntime(language); r.seed();
    for (const [key,value] of Object.entries({interest:['styleBeauty'],subinterest:['skincare'],tone:'useful',budgetChoice:'60',timing:'none'})) r.set(key,value);
    const base = {...r.a.formData(),allowUnverified:true};
    const items = asins.map(asin => r.products.find(p => p.asin === asin));
    const eligible = (p, changes = {}) => {
      const profile = {...base,...changes};
      return r.R.eligible(p,profile,r.a.analyseNote(profile.note),r.H.isEligible);
    };
    for (const [i,p] of items.entries()) {
      assert.ok(p && eligible(p));
      assert.equal(r.products.filter(x => x.asin === p.asin).length,1);
      assert.equal(p.price,[16.60,25.90,47.55][i]);
      assert.equal(p.priceStatus,'indicative');
      assert.equal(r.R.verifiedOffer(p),false);
      assert.equal(p.availabilityStatus,'unknown');
      const url = new URL(r.a.storeUrl(p));
      assert.equal(url.hostname,'www.amazon.it');
      assert.ok(url.pathname.includes('/dp/'+p.asin));
      assert.equal(url.searchParams.get('tag'),'3gifts-21');
      for (const ageRange of ['earlyChild','child','teen']) assert.equal(eligible(p,{ageRange}),false);
      assert.equal(eligible(p,{allowUnverified:false}),false);
      assert.equal(eligible(p,{timing:'urgent2',deadline:r.R.dateAfter(2)}),false);
      assert.equal(eligible(p,{interests:['techGaming'],subinterests:['tech']}),false);
    }
    for (const [minBudget,budget,asin] of [[10,20,asins[0]],[20,35,asins[1]],[35,60,asins[2]]]) {
      const p = {...base,minBudget,budget};
      const picks = r.a.rankProducts(r.products,p,r.a.analyseNote(''));
      assert.equal(picks.length,1);
      assert.equal(picks[0].asin,asin);
    }
    const picks = r.a.rankProducts(r.products,base,r.a.analyseNote(''));
    assert.equal(picks.length,3);
    assert.deepEqual(Array.from(picks,p=>p.asin).sort(),[...asins].sort());
    await r.a.showResults();
    const html = r.el('#resultGrid').innerHTML;
    for (const asin of asins) assert.ok(html.includes('/dp/'+asin),language+': card '+asin);
    assert.ok(html.includes(language==='it' ? 'non è una scelta vegana' : 'not a vegan choice'));
    console.log(JSON.stringify({language,manualSkincare:3,links:'passed',budgets:'passed',cards:'passed'}));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
