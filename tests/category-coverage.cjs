const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
let checks=0;function check(ok,label){assert.ok(ok,label);checks++}
async function main(){for(const lang of ['it','en']){
 const r=createRuntime(lang);r.seed();
 for(const [key,value]of Object.entries({relation:'family',recipientPreference:'women',ageRange:'mature',interest:['culture','styleBeauty'],subinterest:['books','beauty'],tone:'neutral',budgetChoice:'50',timing:'month'}))r.set(key,value);
 const base={...r.a.formData(),allowUnverified:true};
 for(const budget of [30,50,100])for(const tone of ['neutral','sentimental','useful']){
  const p={...base,budget,tone},picks=r.a.rankProducts(r.products,p,r.a.analyseNote(''));
  check(picks.length===3&&picks.some(x=>x.tags.includes('culture'))&&picks.some(x=>x.tags.includes('styleBeauty')),lang+': reported profile represents both categories');
  check(picks.every(x=>r.R.eligible(x,p,r.a.analyseNote(''),r.H.isEligible)),lang+': coverage never weakens constraints');
 }
 const skincare=r.a.analyseNote(lang==='it'?'Vorrei creme e sieri':'I want creams and serums');
 check(skincare.requiredSignals.includes('skincare'),lang+': skincare note understood');
 const onlyCreams={...base,interests:['styleBeauty'],subinterests:['skincare']};
 const creamPicks=r.a.rankProducts(r.products,onlyCreams,skincare);
 check(creamPicks.length===3&&creamPicks.every(p=>p.tags.includes('skincare')),lang+': three real skincare products, no accessory substitutes');
 for(const note of ['Mi proponi solo libri, cambia categoria','Mi hai proposto solo libri, vorrei creme','Mi stai proponendo solo libri; cambia categoria','You only recommend books, change category','You suggest only books, I want creams']){
  const a=r.a.analyseNote(note);check(a.feedback.changeCategory&&!a.requiredSignals.includes('books')&&!a.needsClarification,lang+': complaint not positive book request: '+note);
 }
 check(r.a.analyseNote('Ama i libri').requiredSignals.includes('books'),lang+': ordinary preference preserved');
 check(r.a.analyseNote('Non solo libri, anche creme').exclusions.length===0,lang+': diversification is not a book ban');
 await r.a.showResults();
 const before=r.eval('displayedProducts.map(p=>p.id)');
 r.set('refineReason','oneCategory').dispatchEvent({type:'change'});r.set('refineDirection','differentCategory');r.set('refineSurprise','balanced');
 r.set('refineDetail',lang==='it'?'Mi proponi solo libri, cambia categoria':'You only recommend books, change category');
 r.el('#refinementForm').dispatchEvent({type:'submit'});
 check(!r.el('#refinementError').textContent,lang+': explicit category feedback succeeds');
 const next=r.eval('displayedProducts');
 check(next.length>0&&next.every(p=>!p.tags.includes('culture')&&p.tags.includes('styleBeauty')),lang+': requested category change is binding');
 check(next.every(p=>!before.includes(p.id)),lang+': no prior products repeated');
 check(r.eval('lastProfile.excludedInterests.includes("culture")'),lang+': category exclusion retained for subsequent refinements');
 // A further refinement cannot quietly return to books when beauty alternatives run out.
 r.set('refineReason','owned').dispatchEvent({type:'change'});r.set('refineDirection','differentType');r.set('refineSurprise','safe');r.el('#refinementForm').dispatchEvent({type:'submit'});
 check(r.eval('displayedProducts.every(p=>!p.tags.includes("culture"))'),lang+': repeated rejection does not revive books');
 // The newly added skincare products participate in mixed-interest results.
 r.set('interest',['culture','styleBeauty']);r.set('subinterest',['books','skincare']);await r.a.showResults();
 check(r.eval('displayedProducts.some(p=>p.tags.includes("skincare"))'),lang+': skincare represented in mixed results');
 const fixture=(id,tags,price=25)=>r.a.normalizeProduct({id,name:'Test '+id,tags,price,directUrl:'https://www.amazon.it/dp/'+id.padEnd(10,'0')});
 const items=[fixture('bookA',['culture','books']),fixture('bookB',['culture','books']),fixture('bookC',['culture','books']),fixture('cream',['styleBeauty','skincare'],75)];
 const p={...base,subinterests:['books','skincare']};
 check(r.a.rankProducts(items,p,r.a.analyseNote('')).every(x=>x.price<=50),lang+': no over-budget filler for category coverage');
 const expanded={...p,budget:100};check(r.a.rankProducts(items,expanded,r.a.analyseNote('')).some(x=>x.id==='cream'),lang+': eligible future skincare participates');
 check(r.a.rankProducts([...items.slice(0,3),fixture('lowCream',['styleBeauty','skincare'],3)],{...p,budget:100},r.a.analyseNote('')).some(x=>x.id==='lowCream'),lang+': soft price preference cannot erase an eligible area');
 const safeNote=r.a.analyseNote('Mi proponi solo libri, vorrei creme ma niente profumi');check(safeNote.requiredSignals.includes('skincare')&&safeNote.exclusions.includes('perfume'),lang+': complaint preserves positive requests and exclusions');
 const reverse={...expanded,interests:[...expanded.interests].reverse()};
 check(r.a.rankProducts(items,reverse,r.a.analyseNote('')).map(x=>x.id).join()===r.a.rankProducts(items,expanded,r.a.analyseNote('')).map(x=>x.id).join(),lang+': selection independent of checkbox order in this case');
}
console.log(JSON.stringify({checks,languages:2,browserQA:false,errors:0}));}
main().catch(e=>{console.error(e);process.exitCode=1});
