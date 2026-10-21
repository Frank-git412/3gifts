// Regression tests run the shipped application, not a copy of the ranking.
// DOM/network doubles: this is not a browser or concurrent-user load test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', process.argv.slice(2).find(arg=>!arg.startsWith('--')) || 'dist');
const events = [], nodes = new Map(), listeners = new Map();
let required = [], formValues = {}, activeSteps = [];
function node(key) {
  if (!nodes.has(key)) nodes.set(key, { hidden: false, disabled: false, value: '', textContent: '', innerHTML: '', dataset: {}, style: {}, required: false,
    classList: { toggle() {} }, setAttribute(k, v) { this[k] = v; }, addEventListener(type, fn) { listeners.set(key + ':' + type, fn); },
    querySelectorAll(q) { return q === '[required]' ? required : []; }, querySelector() { return {}; },
    scrollIntoView() {}, reset() {}, focus() {}, showModal() {}, close() {}, dispatchEvent() {} });
  return nodes.get(key);
}
const c = { window: { GiftsPrivacy: { hasAnalyticsConsent: () => true }, umami: { track: (name, data) => events.push({ name, data }) }, addEventListener: (type, fn) => listeners.set('window:' + type, fn) },
  document: { querySelector: node, querySelectorAll: q => q === '.step' ? activeSteps : [], addEventListener: (type, fn) => listeners.set('document:' + type, fn) },
  URL, URLSearchParams, Date, performance, AbortController, setTimeout, clearTimeout, console, scrollTo() {},
  fetch: async () => { throw new Error('No network in tests'); },
  FormData: class { get(k) { return formValues[k] ?? null; } getAll(k) { return formValues[k] ?? []; } }, Event: class {} };
vm.createContext(c);
for (const file of ['config.js', 'catalog.js', 'catalog-health.js', 'recommendation-rules.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, { filename: file });
}
const api = vm.runInContext('({rankProducts,normalizeProduct,analyseNote,enrichWithAI,showResults,valid,track,storeUrl,safeUrl,renderStep,suggestedBudget,renderProductCards,fetchJSON})', c);
const R = c.window.TRE_REGALI_RULES, H = c.window.TRE_REGALI_HEALTH;
const products = c.window.TRE_REGALI_CATALOG.map(api.normalizeProduct);
const base = { mode: 'recipient', journey: 'direct', relation: 'friend', occasion: 'birthday', ageRange: 'adult', interests: ['techGaming', 'culture'], subinterests: [], tone: 'neutral', avoid: [], budget: 50, timing: 'week', deadline: R.dateAfter(7), note: '' };
let assertions = 0;
function check(value, label) { assert.ok(value, label); assertions++; }
const plain = value => JSON.parse(JSON.stringify(value));
function verified(id, extra = {}) {
  return api.normalizeProduct({ id, name: `Prodotto ${id}`, price: 15, tags: ['techGaming', 'tech'], type: 'product', directUrl: `https://shop.example/products/${id}`, constraints: { bulky: false, sizes: false },
    offer: { url: `https://shop.example/products/${id}`, checkedAt: new Date().toISOString(), available: true, giftable: true, variantConfirmed: true, destinationCountry: 'IT',
      total: { amount: 20, currency: 'EUR', includesShipping: true, includesPersonalization: true }, delivery: { verified: true, by: R.dateAfter(1) } }, ...extra });
}
async function main() {
  check(products.length === 255, 'catalog preserved');
  check(api.analyseNote('tennis').signals.includes('sport') && !api.analyseNote('tennis').signals.includes('food'), 'whole-word tennis');
  for (const [note, tag] of [['non ama il vino', 'wine'], ['non ama i libri', 'books'], ['no tech', 'tech'], ['non usa profumi', 'perfume'], ['poco spazio in casa', 'bulky']]) {
    const analysis = api.analyseNote(note);
    check(analysis.exclusions.includes(tag) && !analysis.signals.includes(tag), `negative preference: ${note}`);
    const merged = R.mergeAnalysis(analysis, await api.enrichWithAI(base, products, analysis.signals));
    check(merged.exclusions.includes(tag), 'local enrichment preserves exclusion');
    const adversarial = R.mergeAnalysis(analysis, { signals: [tag], exclusions: [], source: 'ai' });
    check(!adversarial.signals.includes(tag) && adversarial.exclusions.includes(tag), 'AI cannot override hard exclusion');
  }
  check(api.analyseNote('allergica alle noci').needsClarification, 'allergy not silently interpreted');
  check(api.analyseNote('no tech, libri e vino').exclusions.includes('books'), 'negation covers comma-separated list');
  check(api.analyseNote('no tech, ama libri').signals.includes('books'), 'new positive clause after comma');
  check(!api.analyseNote('non ama il vino').signals.includes('food'),'negative wine does not boost food');
  check(api.analyseNote('ama la cucina ma non il vino').signals.includes('food')&&!api.analyseNote('ama la cucina ma non il vino').exclusions.includes('food'),'wine exclusion does not exclude all cooking');
  check(api.analyseNote('niente materiali ruvidi').needsClarification, 'unsupported restriction requires clarification');
  const noTech = api.analyseNote('no tech');
  const eligibleIdeas = api.rankProducts(products, { ...base, allowUnverified: true }, noTech);
  check(eligibleIdeas.length === 3 && eligibleIdeas.every(p => !p.constraints.tech), 'no tech actual ranking');

  c.profile = { ...base, note: 'no tech' }; vm.runInContext('formData=()=>globalThis.profile', c);
  await api.showResults();
  check(node('#zeroRecovery').hidden && !node('#productSelection').hidden, 'valid journey automatically renders three indicative results');
  check((node('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length===3, 'automatic fallback renders exactly three cards');
  check(events.some(e => e.name === 'questionnaire_completed'), 'submission is completed even with no offers');
  const rendered=node('#resultGrid').innerHTML.replaceAll('&#39;',"'").replaceAll('&amp;','&');
  check(eligibleIdeas.every(p => rendered.includes(p.name)), 'real rendering respects exclusions');
  check(node('#recommendationStatus').textContent.includes('devono essere confermati'), 'automatic fallback disclaimer');
  check(!node('#resultGrid').innerHTML.includes('Scelta sicura'), 'no unsupported safety role');
  check(node('#resultGrid').innerHTML.includes('Totale da verificare'), 'unknown total disclosed');

  c.profile = { ...base, budget: 100, timing: 'week', deadline: R.dateAfter(7), note: '' };
  await api.showResults();
  check((node('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length===3, 'reported 100 euro / one week journey returns three proposals');

  const strict = [verified(901), verified(902), verified(903)];
  check(api.rankProducts(strict, base, api.analyseNote('')).length === 3, 'three genuinely verified fixtures');
  check(api.rankProducts(products, base, api.analyseNote('')).length === 0, 'current data stays unverified');
  for (const field of ['available', 'giftable', 'variantConfirmed']) {
    const p = verified(904); p.offer[field] = false;
    check(!R.eligible(p, base, api.analyseNote(''), H.isEligible), `offer rejects ${field}`);
    if(field!=='variantConfirmed')check(!R.eligible(p,{...base,allowUnverified:true},api.analyseNote(''),H.isEligible),`exploration rejects known ${field}`);
  }
  for (const field of ['includesShipping', 'includesPersonalization']) {
    const p = verified(905); p.offer.total[field] = false;
    check(!R.verifiedOffer(p), `total requires ${field}`);
  }
  for (const date of ['2020-01-01', '2099-01-01', 'bad-date']) {
    const p = verified(906); p.offer.checkedAt = date;
    check(!R.verifiedOffer(p), `offer timestamp ${date}`);
  }
  const expensive = verified(907); expensive.offer.total.amount = 60;
  check(!R.eligible(expensive, base, api.analyseNote(''), H.isEligible), 'shipping-inclusive total beats nominal budget');
  check(!R.eligible(expensive, { ...base, allowUnverified: true }, api.analyseNote(''), H.isEligible), 'exploration never hides known excess total');
  const search = verified(908); search.offer.url = 'https://www.amazon.it/s?k=gift';
  check(!R.verifiedOffer(search), 'search URL is not a verified offer');
  const late = verified(909); late.offer.delivery.by = R.dateAfter(8);
  check(!R.deliveryEligible(late, base), 'late delivery excluded');
  const unknown = verified(910); delete unknown.offer.delivery;
  check(!R.deliveryEligible(unknown, base), 'unknown delivery excluded');
  const today = { ...base, timing: 'exact', deadline: R.localDate() };
  const instant = verified(911, { instant: true }); delete instant.offer.delivery;
  check(api.rankProducts([instant, late, unknown], today, api.analyseNote('')).length === 0, 'no urgent fallback to physical/unknown');
  const immediate = verified(912); immediate.offer.delivery.by = R.localDate();
  check(R.deliveryEligible(immediate, today), 'verified same-day offer');
  check(R.calendarDay(R.dateAfter(2)) - R.calendarDay(R.localDate()) === 2, 'two calendar days, not rounded three');
  check(!R.deliveryEligible(immediate, { ...today, deadline: '2026-02-30' }), 'invalid calendar date');
  check(R.deliveryEligible(unknown, { ...base, timing: 'none' }), 'no date only removes date constraint');
  const shippingNotGift = verified(913); shippingNotGift.offer.destinationCountry = 'US';
  check(!R.verifiedOffer(shippingNotGift), 'destination scope matters');

  const constraintCounts = {};
  for (const filter of ['bulky', 'sizes']) {
    constraintCounts[filter] = products.filter(p => R.violatesExclusions(p, { ...base, avoid: [filter] }, { exclusions: [] })).length;
    check(constraintCounts[filter] > 0 && constraintCounts[filter] < products.length, `${filter} actually filters catalog`);
    const unknownAttributes = api.normalizeProduct({ id: 'unknown', name: 'Articolo sconosciuto', price: 15, directUrl: 'https://shop.example/unknown' });
    check(R.violatesExclusions(unknownAttributes, { ...base, avoid: [filter] }, { exclusions: [] }), `${filter} unknown fails closed`);
  }
  check(R.violatesExclusions(products.find(p => p.id === '59'), base, noTech), 'Kindle Scribe is electronic despite original tags');
  for(const id of ['11','12','13','15','20','21','29','38','40','41','42','44','47'])check(R.violatesExclusions(products.find(p=>p.id===id),base,noTech),`conservative electronic exclusion: ${id}`);
  check(R.violatesExclusions(api.normalizeProduct({id:'scented-fixture',name:'Candela profumata',price:15,directUrl:'https://shop.example/candle'}), base, api.analyseNote('non usa profumi')), 'scented candle excluded');

  const step = node('budgetStep');step.dataset={step:'7',stepKey:'budget_timing_details'};
  c.budgetStep=step;vm.runInContext('currentStep=()=>globalThis.budgetStep',c);
  const budget=node('#budget');budget.required=true;required=[budget];
  for (const value of ['-10','0','14','16','501','10000','NaN','Infinity','']) {
    budget.value=value;check(!api.valid(), `invalid budget rejected: ${value}`);
  }
  for (const value of ['15','50','75','300','500']) {budget.value=value;check(api.valid(), `valid budget: ${value}`);}
  budget.required=false;required=[];
  node('#deadline').required=true;node('#deadline').value='2026-02-30';check(!api.valid(), 'invalid date rejected in form');
  node('#deadline').value=R.localDate();check(api.valid(), 'today accepted in form');node('#deadline').required=false;

  c.profile={...base,note:''};await api.showResults(true);
  formValues={refineReason:'owned',refineDirection:'differentType',refineSurprise:'balanced',refineBudget:'',refineDetail:''};
  for(let round=0;round<4;round++)listeners.get('#refinementForm:submit')({preventDefault(){},currentTarget:node('#refinementForm')});
  const refined=events.filter(e=>e.name==='recommendations_refined');
  check(refined.length===3,'no fourth refinement');
  check(refined.every(e=>Object.keys(e.data).join(',')==='round'),'refinement responses never sent to analytics');
  api.track('recommendations_refined',{round:1,reason:'secret',direction:'secret',surprise:'secret',note:'secret',budget:99});
  check(JSON.stringify(events.at(-1).data)==='{"round":1}','analytics allowlist protects future callers');
  check(!JSON.stringify(events).includes('secret'),'no sensitive values in any event');
  const before=events.length;api.track('custom_event',{note:'secret'});check(events.length===before,'unknown event blocked');

  check(api.safeUrl('', 'javascript:alert(1)')==='','unsafe fallback rejected');
  check(api.storeUrl({...products[0],directUrl:'broken url'})==='','malformed URL does not throw');
  check(!H.isEligible(api.normalizeProduct({...products[0],catalogStatus:'LINK ROTTO'})),'normalization preserves block');
  check(!H.isEligible(H.merge([products[0]],{products:[{id:products[0].id,status:'NON DISPONIBILE',checkedAt:'2020-01-01'}]}).products[0]),'stale negative remains blocked');
  check(H.merge([products[0]],{products:[{id:products[0].id,price:1,checkedAt:'2099-01-01'}]}).products[0].price===products[0].price,'future monitor ignored');

  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'journey.css'),'utf8');
  check(/<script src="recommendation-rules\.js(?:\?[^\"]*)?"><\/script>/.test(html),'shared rules loaded');
  check(/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/.test(css),'hidden overrides grid/flex');
  for(const id of ['zeroRecovery','refinementForm'])check(new RegExp(`id="${id}"[^>]*hidden`).test(html),'conditional panel starts hidden');

  const areas=process.argv.includes('--quick')?[]:['techGaming','culture','mediaAudio','foodDrink','travelOutdoor','sportFitness','artPhoto','homeGarden','styleBeauty','animalsNature','gamesCollecting','newsBusiness'],tones=['sentimental','useful','funny','surprising','elegant','neutral'];
  let profiles=0,zeroStrict=0,ideaProfiles=0,ideaRecovery=0,exclusions=0;
  for(const area of areas)for(const tone of tones)for(const ageRange of ['teen','youngAdult','adult','mature','unknown'])for(const max of [15,50,100,300])for(const timing of ['urgent2','week','month','exact','none'])for(const mode of ['recipient','giver']){
    const profile={...base,interests:[area],tone,ageRange,budget:max,timing,mode,deadline:timing==='urgent2'?R.dateAfter(2):base.deadline};
    const strictPick=api.rankProducts(products,profile,api.analyseNote(''));profiles++;if(!strictPick.length)zeroStrict++;
    assert.equal(strictPick.length,0,'no false verified results');
    const pick=api.rankProducts(products,{...profile,allowUnverified:true},api.analyseNote(''));ideaProfiles++;if(pick.length<3)ideaRecovery++;
    assert.ok(pick.every(p=>p.price<=max));assert.equal(new Set(pick.map(p=>p.id)).size,pick.length);
  }
  const avoidOptions=['bulky','sizes','foodAlcohol','subscriptions','experiences','gadgets'];
  for(const area of areas)for(let mask=0;mask<64;mask++)for(const max of [15,50,300]){
    const profile={...base,allowUnverified:true,interests:[area],budget:max,avoid:avoidOptions.filter((_,i)=>mask&(1<<i))};
    const pick=api.rankProducts(products,profile,api.analyseNote(''));exclusions++;
    assert.ok(pick.every(p=>!R.violatesExclusions(p,profile,{exclusions:[]})));
  }
  console.log(JSON.stringify({assertions,strictProfiles:profiles,strictDataRecovery:zeroStrict,explicitExplorationProfiles:ideaProfiles,explorationRecovery:ideaRecovery,exclusionProfiles:exclusions,constraintCounts,errors:0,browserQA:false},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1});
