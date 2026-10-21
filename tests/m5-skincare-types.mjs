import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {createRequire} from 'node:module';
const {createRuntime}=createRequire(import.meta.url)('./published-runtime.cjs');
const profile={ageRange:'mature',relation:'partner',occasion:'newhome',recipientPreference:'unisex',minBudget:25,budget:120,interests:['styleBeauty'],subinterests:['skincare'],tone:'neutral'};
const candidate=(ctx,title,features='Senza profumo. Fragrance free.')=>({asin:'B000000001',title,features,price:30,url:'https://www.amazon.it/dp/B000000001?tag=3gifts-21',researchQueryIds:[...ctx.plan.queries,...ctx.plan.fallbackQueries].map(q=>q.id)});
for(const [note,family,title] of [
 ['Solo crema mani senza profumo.','creme_mani','Crema mani senza profumo'],
 ['Vorrei una crema per le mani senza profumo.','creme_mani','Crema per le mani senza profumo'],
 ['Only hand cream, fragrance free.','creme_mani','Fragrance free hand cream'],
 ['Detergente viso per pelle sensibile, senza profumo.','detergenti_viso','Detergente viso senza profumo'],
 ['Vorrei un detergente per il viso senza profumo.','detergenti_viso','Detergente per il viso senza profumo'],
 ['Face cleanser for sensitive skin, fragrance free.','detergenti_viso','Fragrance free face cleanser']
])test('Explicit product noun survives actual questionnaire serialization: '+note,()=>{
 const r=createRuntime('it');r.seed();r.set('interest',['styleBeauty']);r.set('subinterest',['skincare']);r.c.m5Profile={...profile,note};
 const request=JSON.parse(JSON.stringify(r.eval('researchRequest(m5Profile,analyseNote(m5Profile.note),false)')));
 assert.ok(!('note' in request.profile));assert.ok(request.constraints.specificIntents.length);
 const ctx=publicPlan(request);assert.equal(ctx.blocked,false);
 assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].every(q=>q.family===family));
 assert.ok(publicCandidate(candidate(ctx,title),ctx));
 for(const wrong of ["Paula's Choice Oil-Free Crema, Riduce i Punti Neri, Per Pelle Grassa, 60 ml",'M. Asam Aqua Intense Crema corpo all’acido ialuronico','Siero viso','Custodia per '+title])assert.equal(publicCandidate(candidate(ctx,wrong,'Senza profumo. Applicare con le mani dopo il detergente viso.'),ctx),null);
 assert.equal(publicCandidate(candidate(ctx,title,'Contiene profumo.'),ctx),null);
 const p=publicCandidate(candidate(ctx,title),ctx);assert.equal(rules.violatesExclusions({...p,title:'Crema corpo',name:'Crema corpo'},ctx.profile,request.constraints),true);
});
test('Generic nouns preserve stronger ingredient and absorption obligations',()=>{
 for(const note of ['Crema mani con ceramidi.','Crema mani rapido assorbimento.','Detergente viso con ceramidi.']){
  const a=rules.analyseNote(note),ctx=publicPlan({profile,constraints:a});assert.equal(ctx.blocked,false);
  const title=note.startsWith('Crema')?'Crema mani':'Detergente viso';
  assert.equal(publicCandidate(candidate(ctx,title,''),ctx),null);
  assert.ok(publicCandidate(candidate(ctx,title,'Con ceramidi. Rapido assorbimento.'),ctx));
 }
});
test('Liking hand creams stays a preference; negative or uncertain requests never become positive obligations',()=>{
 const a=rules.analyseNote('Ama le creme per le mani.');assert.equal(a.needsClarification,false);assert.deepEqual(a.specificIntents,[]);assert.ok(a.optionalIntents.includes('m3:M5_HAND_TYPE'));
 for(const note of ['Forse un detergente viso.']){const a=rules.analyseNote(note);assert.equal(a.needsClarification,true);assert.deepEqual(a.specificIntents,[]);}
});
for(const note of ['Niente profumo, ma desidera un prodotto molto profumato.','No perfume, but I want a scented product.','Solo senza profumo. Vorrei un prodotto profumato.'])test('Contradictory scent request stops before retrieval: '+note,()=>{
 const a=rules.analyseNote(note);assert.equal(a.needsClarification,true);const ctx=publicPlan({profile,constraints:a});assert.equal(ctx.blocked,true);assert.deepEqual(ctx.plan.queries,[]);assert.deepEqual(ctx.plan.fallbackQueries,[]);
});
test('A hand cream ban preserves skincare and rejects hand cream',()=>{
 for(const note of ['Niente crema mani.','I do not want hand cream.']){const a=rules.analyseNote(note);assert.equal(a.needsClarification,false);assert.deepEqual(a.specificIntents,[]);assert.ok(a.exclusions.includes('handCream'));assert.ok(!a.exclusions.includes('skincare'));assert.equal(rules.violatesExclusions({title:'Crema mani',tags:['skincare']},{},a),true);assert.equal(rules.violatesExclusions({title:'Crema corpo',tags:['skincare']},{},a),false);}
});
test('A sole fragrance exclusion is not a contradiction',()=>{
 for(const note of ['Niente profumo.','Non voglio prodotti profumati.','No perfume.','I do not want scented products.'])assert.ok(!rules.analyseNote(note).constraintReport.unclear.includes('vincolo_contraddittorio'),note);
 for(const note of ['Niente profumo.','No perfume.'])assert.equal(rules.analyseNote(note).needsClarification,false,note);
});
test('Compiled Worker clarifies conflicting fragrance request without Amazon access',async()=>{
 const worker=(await import('../dist/server/index.js')).default;
 const r=createRuntime('it');r.seed();r.set('interest',['styleBeauty']);r.set('subinterest',['skincare']);r.c.m5Profile={...profile,note:'Niente profumo, ma desidera un prodotto molto profumato.'};
 const body=JSON.parse(JSON.stringify(r.eval('researchRequest(m5Profile,analyseNote(m5Profile.note),false)')));
 const prior=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected network access');};
 try{
  const response=await worker.fetch(new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify(body)}),{});
  const data=await response.json();assert.equal(data.code,'ConstraintsNeedReview');assert.deepEqual(data.products,[]);assert.equal(data.searched,0);assert.equal(calls,0);
 }finally{globalThis.fetch=prior;}
});
