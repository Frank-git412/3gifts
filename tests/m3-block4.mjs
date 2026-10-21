import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas,planResearchAnswers} from '../server/research/research-engine.mjs';
import {PILOT_LEXICAL_ALIASES,PILOT_QUERY_SOURCES,pilotDictionaryInventory} from '../server/research/pilot-dictionary.mjs';
import {RESEARCH_CATALOG} from '../server/research/catalog-data.mjs';
const profile={ageRange:'adult',minBudget:10,budget:60,interests:['styleBeauty'],subinterests:['skincare'],tone:'any'};
const fixtures=[
 ['K026','fragranceFree','detergente viso','Detergente viso senza profumo','Fragrance-free facial cleanser','Detergente viso delicato','Detergente viso senza profumo. Contiene profumo.'],
 ['K029','fragranceFree','acqua micellare','Acqua micellare senza profumo','Fragrance-free micellar water','Acqua micellare delicata','Acqua micellare senza profumo. Profumata.'],
 ['K033','fragranceFree','crema mani','Crema mani senza profumo','Fragrance-free hand cream','Crema mani delicata','Crema mani senza profumo. Contiene parfum.'],
 ['K030','noRinse','acqua micellare','Acqua micellare senza risciacquo','No-rinse micellar water','Acqua micellare quotidiana','Acqua micellare senza risciacquo. Risciacquare dopo l’uso.'],
 ['K036','nonGreasy','crema mani','Crema mani non grassa','Non-greasy hand cream','Crema mani rapido assorbimento','Crema mani non grassa. Texture grassa.']
];
const tags=['styleBeauty','skincare'];
for(const [id,key,base,it,en,absent,conflict] of fixtures){
 test(id+' IT/EN notes become requirements without excluding the product',()=>{
  for(const note of [it,en]){const a=rules.analyseNote(note);assert.equal(a.needsClarification,false,note);assert.ok(a.exclusions.includes(key));assert.ok(!a.exclusions.includes('skincare'));}
 });
 test(id+' evidence comes from title/features, missing and contradictory fail',()=>{
  for(const title of [it,en])assert.equal(rules.skincarePropertyChecks({title,tags},[key])[0].status,'supported_by_listing',title);
  assert.equal(rules.skincarePropertyChecks({title:absent,tags,query:it,reason:en},[key])[0].status,'unknown');
  assert.equal(rules.skincarePropertyChecks({title:conflict,tags},[key])[0].status,'conflict');
  assert.equal(rules.skincarePropertyChecks({title:base,features:en,tags},[key])[0].status,'supported_by_listing');
  assert.equal(rules.skincarePropertyChecks({title:en,features:conflict,tags},[key])[0].status,'conflict');
  assert.deepEqual(rules.skincarePropertyChecks({title:'Romanzo '+it,tags:['culture','books']},[key]),[]);
 });
 test(id+' plan, public candidate and final selection enforce the property',()=>{
  for(const note of [it,en]){
   const ctx=publicPlan({profile,constraints:rules.analyseNote(note)});
   assert.equal(ctx.blocked,false);
   if(['crema mani','detergente viso'].includes(base)){assert.ok(ctx.plan.queries.length>0&&ctx.plan.queries.length<=6);assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].every(q=>q.family===(base==='crema mani'?'creme_mani':'detergenti_viso')));}
   else assert.equal(ctx.plan.queries.length,6);
   assert.ok(ctx.plan.fallbackQueries.length<=6);
   const all=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
   assert.ok(all.filter(q=>q.area==='styleBeauty').every(q=>q.requiredListingProperties.includes(key)));
   // Use a genuine qualified base query for this family, preserving the same
   // public product path and budget checks even if its turn is after query 12.
   const q=ctx.plan.candidateQueries.find(q=>q.keywords===base);assert.ok(q,base);
   ctx.plan.queries=[q];ctx.plan.fallbackQueries=[];
   const products=[it,en,absent,conflict].map((title,i)=>({asin:'B'+String(i+1).padStart(9,'0'),title,features:'',price:20,url:'https://www.amazon.it/dp/B'+String(i+1).padStart(9,'0'),researchQueryIds:[q.id]}));
   const accepted=products.map(p=>publicCandidate(p,ctx));
   assert.ok(accepted[0],it);assert.ok(accepted[1],en);assert.equal(accepted[2],null);assert.equal(accepted[3],null);
   const selected=selectResearchIdeas(accepted.filter(Boolean),ctx.plan);
   assert.equal(selected.products.length,1,'Equivalent IT/EN product functions occupy one slot');
   assert.equal(selected.products[0].listingPropertyEvidence[0].status,'supported_by_listing');
  }
 });
}
test('Negated, double-negative and unresolved notes remain blocked',()=>{
 for(const note of ['Non senza profumo','Not fragrance-free','Non voglio una crema non grassa','Senza profumo e senza acidi','Without fragrance and without acids','Senza profumo ma profumata','Non grassa e grassa','Senza risciacquo ma da risciacquare'])assert.equal(rules.analyseNote(note).needsClarification,true,note);
});
test('Denials, optional variants and contradictions never establish absence',()=>{
 for(const [key,text] of [['fragranceFree','Crema non senza profumo'],['fragranceFree','Cream not fragrance-free'],['fragranceFree','Alternative fragrance-free hand cream'],['fragranceFree','Crema senza profumo. Fragrance added'],['noRinse','Micellar water. No-rinse not guaranteed'],['noRinse','Non senza risciacquo'],['nonGreasy','Hand cream not non-greasy'],['nonGreasy','Crema variante non grassa']])assert.notEqual(rules.skincarePropertyChecks({title:text,tags},[key])[0].status,'supported_by_listing',text);
});
test('Multiple properties and unrelated positive attributes coexist',()=>{
 const a=rules.analyseNote('Crema mani senza profumo e non grassa');assert.equal(a.needsClarification,false);
 assert.equal(rules.violatesExclusions({title:'Crema mani senza profumo e non grassa',tags},{},a),false);
 assert.equal(rules.violatesExclusions({title:'Crema mani senza profumo',tags},{},a),true);
 assert.equal(rules.violatesExclusions({title:'Crema mani non grassa',tags},{},a),true);
});
test('Existing perfume avoidance requires evidence for skincare, preserves other categories',()=>{
 for(const a of [{exclusions:['perfume']},rules.analyseNote('Senza profumo')]){
  assert.equal(rules.violatesExclusions({title:'Crema mani senza profumo',tags},{},a),false);
  assert.equal(rules.violatesExclusions({title:'Crema mani delicata',tags},{},a),true);
 }
 assert.equal(rules.violatesExclusions({title:'Candela profumata',tags:['home']},{avoid:['perfume']},{}),true);
 assert.equal(rules.violatesExclusions({title:'Romanzo di viaggio',tags:['culture','books']},{avoid:['perfume']},{}),false);
});
test('Targeted micellar and hand-cream queries preserve dual interests and limits',()=>{
 for(const [note,family] of [['Senza risciacquo','acque_micellari'],['Non grassa','creme_mani']]){
  const ctx=publicPlan({profile:{...profile,interests:['culture','styleBeauty'],subinterests:['books','skincare']},constraints:rules.analyseNote(note)});
  assert.ok(ctx.plan.queries.some(q=>q.family===family));assert.equal(new Set(ctx.plan.queries.map(q=>q.area)).size,2);
  assert.ok(ctx.plan.queries.filter(q=>q.area==='culture').every(q=>!q.requiredListingProperties));
  assert.equal(ctx.plan.queries.length,6);assert.ok(ctx.plan.fallbackQueries.length<=6);
 }
});
test('Four aliases consolidate onto unchanged canonical associations',()=>{
 const inventory=pilotDictionaryInventory();assert.equal(inventory.length,65);
 const plan=planResearchAnswers({age:'adult',interests:['culture','techGaming'],subcategories:{culture:['books'],techGaming:['tech']},recipientContext:{connections:['usb_c']},min:10,max:100});
 assert.equal(PILOT_LEXICAL_ALIASES.length,4);
 for(const alias of PILOT_LEXICAL_ALIASES){
  assert.ok(RESEARCH_CATALOG.associations.some(a=>a.id===alias.canonicalId));
  assert.equal(inventory.flatMap(f=>f.reviewedAliases).filter(a=>a.termId===alias.termId).length,1);
  assert.equal(plan.candidateQueries.filter(q=>q.lexicalAliases.some(a=>a.termId===alias.termId)).length,1);
 }
 assert.equal(inventory.reduce((n,f)=>n+f.keywordIds.length,0),353);
 assert.equal(PILOT_QUERY_SOURCES['tech-family-photos'].termId,'M3-K021');
});
