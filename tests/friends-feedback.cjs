const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRuntime,ROOT} = require('./published-runtime.cjs');
let assertions=0;
function check(value,label){assert.ok(value,label);assertions++}
function distinct(r,picks){const keys=picks.flatMap(p=>r.R.productConceptKeys(p));return new Set(keys).size===keys.length}
async function main(){
 for(const language of ['it','en']){
  const r=createRuntime(language);r.seed();
  check(r.steps[0].dataset.stepKey==='relation_age',language+': relationship and age come first');
  for(const age of ['earlyChild','child','teen']){
   r.set('ageRange',age).dispatchEvent({type:'change'});
   check(r.steps.filter(s=>!s.hidden).map(s=>s.dataset.stepKey).join(',')==='relation_age,occasion,interests,tone,budget_timing_details',language+': five-step minor journey');
   check(r.el('#perspectiveQuestion').hidden,language+': perspective hidden for minors');
   check(r.inputs.filter(i=>i.name==='perspective').every(i=>i.disabled),language+': perspective cannot block minors');
   check(r.a.formData().relation==='child'&&r.a.formData().mode==='recipient',language+': no stale partner/giver answers');
   check(r.el('#stepLabel').textContent.includes('5'),language+': actual progress denominator');
   check(r.el('#wineInterest').hidden&&r.inputs.find(i=>i.name==='subinterest'&&i.value==='wine').disabled,language+': alcohol choice is hidden for minors');
   r.eval('step=1');r.a.renderStep();r.el('#nextBtn').click();
   check(r.eval('step')===2,language+': next goes to the occasion');
   r.el('#backBtn').click();check(r.eval('step')===1,language+': back returns directly to age');
  }
  r.set('ageRange','adult').dispatchEvent({type:'change'});
  check(r.steps.filter(s=>!s.hidden).length===5&&!r.el('#relationQuestion').hidden,language+': adults also answer five screens, relationship included');
  check(!r.a.valid()===false,language+': age answer remains valid');
  r.el('#nextBtn').click();check(r.eval('step')===2&&r.a.formData().relation==='friend',language+': relationship chosen first survives an age change');
  r.seed();r.set('recipientPreference','women');r.set('interest',['styleBeauty','artPhoto']);r.set('subinterest',['beauty','photo']);r.set('budgetChoice','300');r.set('relation','partner');r.set('occasion','anniversary');
  const base={...r.a.formData(),allowUnverified:true};
  for(const note of ['ha poco spazio in casa','has little space at home']){
   const p={...base,note},picks=r.a.rankProducts(r.products,p,r.a.analyseNote(note));
   check(picks.length===3&&distinct(r,picks),language+': reported small-space profile has three distinct ideas');
   check(picks.every(p=>p.constraints.bulky===false),language+': compactness remains binding');
   check(!picks.some(p=>p.subcategory==='Pelletteria'),language+': skincare/photo does not select a wallet');
  }
  for(const area of ['animalsNature','homeGarden','styleBeauty']){
   const p={...base,interests:[area],subinterests:[],budget:50},picks=r.a.rankProducts(r.products,p,r.a.analyseNote(''));
   check(picks.length===3&&distinct(r,picks),language+': real catalog does not repeat tags, plaques, wallets or necklaces');
  }
  const fixture=(id,name,price=250,extra={})=>r.a.normalizeProduct({id,name,price,tags:['styleBeauty','beauty'],directUrl:'https://shop.example/products/'+id,...extra});
  const copies=[fixture('a','Medaglietta per cani'),fixture('b','Targhetta identificativa personalizzata per cani'),fixture('c','Targhetta identificativa per gatti')];
  check(r.a.rankProducts(copies,base,r.a.analyseNote('')).length===1,language+': duplicate concepts are not used as fillers');
  const products=[fixture('low','Prodotto economico',195),fixture('min','Prodotto al minimo',200),fixture('mid','Prodotto intermedio',250),fixture('max','Prodotto al massimo',300),fixture('high','Prodotto oltre il massimo',305)];
  const ranged={...base,minBudget:200};
  const picks=r.a.rankProducts(products,ranged,r.a.analyseNote(''));
  check(picks.length===3&&picks.every(p=>p.price>=200&&p.price<=300),language+': minimum and maximum inclusive');
  const verified=fixture('verified','Offerta verificata',180,{offer:{url:'https://shop.example/products/verified',checkedAt:new Date().toISOString(),available:true,giftable:true,variantConfirmed:true,destinationCountry:'IT',total:{amount:210,currency:'EUR',includesShipping:true,includesPersonalization:true},delivery:{verified:true,by:r.R.dateAfter(1)}}});
  check(r.R.eligible(verified,{...ranged,allowUnverified:false},r.a.analyseNote(''),r.H.isEligible),language+': verified minimum uses the total including delivery');
  check(!r.R.eligible({...verified,offer:{...verified.offer,total:{...verified.offer.total,amount:190}}},{...ranged,allowUnverified:false},r.a.analyseNote(''),r.H.isEligible),language+': verified total below minimum is excluded');
  for(const minBudget of [-5,301,205.5,NaN])check(!r.R.validBudgetRange(300,minBudget),language+': invalid range rejected');
  r.set('minBudget','200');await r.a.showResults();
  check(!r.el('#zeroRecovery').hidden&&!r.el('#resultGrid').innerHTML,language+': no fabricated 200-300 euro catalog results');
  check(r.el('#resultSummary').textContent.includes('200–300'),language+': requested range is displayed');
  r.set('minBudget','350');await r.a.showResults();check(!!r.el('#formError').textContent,language+': crossed range blocked');
  r.set('minBudget','20');await r.a.showResults();
  const beforeRefinement=r.el('#resultGrid').innerHTML;
  r.set('refineReason','price').dispatchEvent({type:'change'});r.set('refineDirection','passion');r.set('refineSurprise','balanced');r.set('refineBudget','15');
  r.el('#refinementForm').dispatchEvent({type:'submit'});
  check(!!r.el('#refinementError').textContent&&r.eval('lastProfile.minBudget')===20&&r.el('#resultGrid').innerHTML===beforeRefinement,language+': refinement cannot lower maximum below minimum or replace valid results');
  r.set('minBudget','0');
  // Narrow jewelry selection has one distinct product family, not three necklaces.
  r.set('interest',['styleBeauty']);r.set('subinterest',['jewelry']);r.set('note','');
  await r.a.showResults();
  check(r.el('#zeroRecovery').hidden&&(r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length===1,language+': partial useful results are visible');
  check(!r.el('#resultsTitle').textContent.includes('3'),language+': partial results do not promise three');
  const html=r.el('#resultGrid').innerHTML;
  check(html.includes('data-no-image="true"')&&!html.includes('gift-placeholder'),language+': no tall misleading image placeholder');
  for(const m of html.matchAll(/<h3>(.*?)<\/h3>/g))check(m[1].length<=140,language+': product headings stay concise');
  const long=fixture('long','Una collana personalizzata, '+('dettaglio '.repeat(50)));
  r.a.renderProductCards([long],base);check(r.el('#resultGrid').innerHTML.includes('<details class="product-details">'),language+': full original name remains accessible');
  r.seed();r.set('budgetChoice','300');
  for(const age of ['earlyChild','child']){
   r.set('ageRange',age).dispatchEvent({type:'change'});await r.a.showResults();
   check(r.eval('displayedProducts').every(p=>p.ageSuitability?.verified&&r.R.ageEligible(p,{ageRange:age})),language+': only documented age-compatible products are recommended to children');
   check(!r.el('#childCatalogNotice').hidden,language+': children catalog limitation is announced up front');
  }
  const young=fixture('safe','Gioco con idoneità documentata',40,{ageSuitability:{minYears:0,maxYears:12,verified:true,sourceUrl:'https://manufacturer.example/age-guide'}});
  check(r.R.ageEligible(young,{ageRange:'earlyChild'})&&r.R.ageEligible(young,{ageRange:'child'}),language+': documented child products can be supported');
  check(!r.R.ageEligible({...young,ageSuitability:{...young.ageSuitability,minYears:3}},{ageRange:'earlyChild'}),language+': a 3+ toy is not assumed safe for ages 0-6');
  const wine=fixture('wine','Vino rosso',40,{tags:['wine','foodDrink']});
  check(!r.R.ageEligible(wine,{ageRange:'teen'}),language+': alcohol excluded for minors');
  r.el('#restartBtn').click();check(r.a.formData().minBudget===0&&r.eval('step')===1&&r.steps.filter(s=>!s.hidden).length===7,language+': reset clears range and conditional flow');
  check(r.events.every(e=>!/(minBudget|ageRange|recipientPreference)/.test(JSON.stringify(e.data))),language+': personal answers are not added to analytics');
  const page=fs.readFileSync(path.join(ROOT,language==='en'?'en/index.html':'index.html'),'utf8');
  check(page.includes('image-cards.css?v=20260920-delivery-choice'),language+': returning visitors receive mobile CSS update');
 }
 console.log(JSON.stringify({assertions,languages:2,browserQA:false,errors:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
