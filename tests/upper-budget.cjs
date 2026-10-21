const {installResearchFixture,submitRefinement}=require('./research-api-fixture.cjs');
// Real shipped runtime + synthetic edge cases; no seller-price or browser claims.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createRuntime}=require('./published-runtime.cjs');
const beforeSource=execFileSync('git',['show','95234f26b588a70fb8c92651b185d077cefd177c:app.js'],{encoding:'utf8'});
const oldRank=beforeSource.slice(beforeSource.indexOf('function rankProducts('),beforeSource.indexOf('\nfunction storeUrl('));
let checks=0,cases=0;const check=(ok,label)=>{assert.ok(ok,label);checks++};
const rows=[];
async function main(){for(const lang of ['it','en']){
 const r=createRuntime(lang);r.seed();await installResearchFixture(r);
 const base={...r.a.formData(),ageRange:'adult',timing:'none',allowUnverified:true,note:'',tone:'neutral',minBudget:0};
 const baseline=r.eval('('+oldRank+')'),analysis=r.a.analyseNote('');
 const interests=[['techGaming'],['culture'],['mediaAudio'],['artPhoto'],['homeGarden'],['styleBeauty'],['techGaming','culture'],['culture','styleBeauty'],['mediaAudio','artPhoto']];
 for(const budget of [15,25,75,100,145,150,200,300,500])for(const areas of interests)for(const minBudget of [0,Math.floor(budget/10)*5]){
   const p={...base,budget,minBudget,interests:areas,subinterests:[]};
   const before=baseline(r.products,p,analysis),after=r.a.rankProducts(r.products,p,analysis);cases++;
   check(after.length<=3,'max three');
   check(after.every(x=>r.R.eligible(x,p,analysis,r.H.isEligible)),'all constraints and Amazon');
   const keys=after.flatMap(x=>r.R.productConceptKeys(x));check(new Set(keys).size===keys.length,'distinct concepts');
   for(const area of areas)if(before.some(x=>x.tags.includes(area))&&(budget<150||r.products.some(x=>x.tags.includes(area)&&r.R.eligible(x,p,analysis,r.H.isEligible)&&x.price>=budget*.5)))check(after.some(x=>x.tags.includes(area)),'interest coverage within requested spending range');
   if(budget>=150)check(after.every(x=>x.price>=budget*.5),'first search never silently drops below half budget');
   if(budget<150)check(before.map(x=>x.id).join()===after.map(x=>x.id).join(),'low/mid behavior unchanged');
   if(lang==='it'&&minBudget===0&&[75,150,300,500].includes(budget))rows.push({budget,interests:areas,before:before.map(x=>({name:x.name,price:x.price})),after:after.map(x=>({name:x.name,price:x.price}))});
 }
 // Valid Amazon fixtures, unrelated concepts and all constraints explicit.
 const fixture=(id,price,tags=['techGaming','tech'],extra={})=>r.a.normalizeProduct({id,name:'Test '+id,price,tags,store:'Amazon',directUrl:'https://www.amazon.it/dp/B0'+String(id).padStart(8,'0'),type:'product',...extra});
 const p={...base,budget:500,interests:['techGaming'],subinterests:[]};
 const cheap=[fixture(1,20),fixture(2,30),fixture(3,40)],upper=[fixture(4,320),fixture(5,400),fixture(6,480)];
 check(r.a.rankProducts([...cheap,...upper],p,analysis).every(x=>x.price>=300),'three comparable high-price candidates prevent cheap fillers');
 const smallMargin=upper.map(x=>({...x,tags:[...x.tags,'creative']}));
 check(r.a.rankProducts([...cheap,...smallMargin],p,analysis).every(x=>x.price>=300),'minor context differences do not suppress upper band');
 const strongCheap=cheap.map(x=>({...x,tags:[...x.tags,'photo']}));
 check(r.a.rankProducts([...strongCheap,...upper],p,{...analysis,signals:['photo']}).every(x=>x.price>=250),'strong note score cannot reintroduce products outside initial spending range');
 check(r.a.rankProducts([...cheap,...upper,fixture(7,490,['culture','books'])],p,analysis).every(x=>x.tags.includes('techGaming')),'expensive irrelevant excluded');
 const ranged={...p,minBudget:350,budget:450};
 check(r.a.rankProducts([...cheap,...upper],ranged,analysis).map(x=>x.price).join()==='400','explicit minimum/maximum never relaxed');
 const multiple={...p,interests:['techGaming','culture']};
 check(!r.a.rankProducts([...upper,fixture(8,8,['culture','books'])],multiple,analysis).some(x=>x.price===8),'missing area cannot be filled below initial spending range');
 const middle=fixture(10,275);
 const tiers=r.a.rankProducts([...cheap,...upper,middle],p,analysis);
 check(tiers.length===3&&tiers[1].price===275&&tiers[0].price>=300,'500 budget reserves 250–300 middle card');
 for(const price of [250,300])check(r.a.rankProducts([...upper,fixture(11,price)],p,analysis)[1].price===price,'middle band inclusive boundaries');
 check(r.a.rankProducts([fixture(12,450),fixture(13,90),fixture(14,45)],p,analysis).map(x=>x.price).join()==='450','sparse catalog returns one suitable option without cheap fillers');
 const covered=r.a.rankProducts([...upper,middle,fixture(15,400,['culture','books'])],multiple,analysis);
 check(covered[1].price===275&&covered.some(x=>x.tags.includes('culture')),'middle reservation retains both eligible interests');
 const strong=fixture(16,350,['techGaming','tech','photo']);
 check(r.a.rankProducts([middle,strong,...upper],p,{...analysis,signals:['photo']})[0].id===strong.id,'strong relevance remains primary within spending range');
 const refined={...analysis,refinement:{reason:'price',direction:'practical',surprise:'balanced',rejectedProducts:[]}};
 check(r.a.rankProducts([...cheap,...upper],p,refined).every(x=>x.price>=250),'refinement preserves range until maximum changes');
 const strict={...p,allowUnverified:false};
 check(r.a.rankProducts([...cheap,...upper],strict,analysis).length===0,'premium does not invent verified offers');
 const total=fixture(9,20,['techGaming','tech'],{offer:{url:'https://www.amazon.it/dp/B000000009',checkedAt:new Date().toISOString(),available:true,giftable:true,variantConfirmed:true,destinationCountry:'IT',total:{amount:520,currency:'EUR',includesShipping:true,includesPersonalization:true}}});
 check(r.a.rankProducts([total],p,analysis).length===0,'known total above maximum excluded');
 // UI first search -> refinement -> a new first search, including translations.
 r.set('interest',['techGaming']);r.set('subinterest',[]);r.set('budgetChoice','500');r.set('timing','none');await r.a.showResults();
 check(/Ricerca da 250|Search from 250/.test(r.el('#resultSummary').textContent),'first search disclosure');
 check(r.eval('displayedProducts').every(p=>p.price>=250&&p.price<=500),'research cards stay in declared range');
 const seen=r.eval('displayedProducts.map(x=>x.id)');
 r.set('refineReason','price').dispatchEvent({type:'change'});r.set('refineDirection','practical');r.set('refineSurprise','balanced');r.set('refineBudget','500');await submitRefinement(r);
 check(!r.el('#refinementError').textContent,'actual refinement succeeds');
 check(r.eval('displayedProducts').every(x=>!seen.includes(x.id)),'refinement no repeats');
 check(/Ricerca da 250|Search from 250/.test(r.el('#resultSummary').textContent),'refinement disclosure');
 const allSeen=new Set([...seen,...r.eval('displayedProducts.map(x=>x.id)')]);
 for(let round=2;round<=3;round++){
   const previous=r.eval('displayedProducts.map(x=>x.id)').join();
   r.set('refineReason','price').dispatchEvent({type:'change'});r.set('refineDirection','practical');r.set('refineSurprise','balanced');r.set('refineBudget','500');await submitRefinement(r);
   const next=r.eval('displayedProducts');
   if(r.el('#refinementError').textContent)check(next.map(x=>x.id).join()===previous,'exhaustion leaves previous results explicitly unchanged');
   else {check(next.every(x=>!allSeen.has(x.id)&&x.price<=500),'later refinements obey budget and never repeat');next.forEach(x=>allSeen.add(x.id));}
 }
 await r.a.showResults();check(/Ricerca da 250|Search from 250/.test(r.el('#resultSummary').textContent),'new search resets premium behavior');
 if(lang==='en')check(!/Prima ricerca|Il catalogo non offre|Negli affinamenti/.test(r.el('#resultSummary').textContent),'English copy translated');
}
console.log(JSON.stringify({checks,cases,languages:2,errors:0,browserQA:false,...(process.argv.includes('--summary')?{}:{rows})},null,2));}
main().catch(e=>{console.error(e);process.exitCode=1});
