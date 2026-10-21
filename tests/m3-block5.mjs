import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas} from '../server/research/research-engine.mjs';
import {cases,compatibility} from './m3-block5-fixtures.mjs';
const words=JSON.parse(fs.readFileSync('docs/m3-lexical-review.json')).words;
const profileFor=w=>({ageRange:'adult',minBudget:10,budget:100,interests:[w.category==='Lettura'?'culture':w.category==='Tecnologia'?'techGaming':'styleBeauty'],subinterests:[w.category==='Lettura'?'books':w.category==='Tecnologia'?'tech':'skincare'],tone:'any'});
export function setup(f,lang='it'){
 const w=words.find(w=>w.id==='M3-'+f.id),compat=compatibility(f.id,lang),note=w[lang]+'. '+compat.note;
 const analysis=rules.analyseNote(note),profile=profileFor(w),ctx=publicPlan({profile,constraints:analysis});
 const q=ctx.plan.queries.find(q=>q.lexicalTermIds?.includes('m3:'+f.id));
 const candidate=(title,feature,i=1)=>({asin:'B'+String(i).padStart(9,'0'),title,features:feature+'. '+compat.features,price:30,url:'https://www.amazon.it/dp/B'+String(i).padStart(9,'0'),researchQueryIds:q?[q.id]:[]});
 return {w,note,analysis,profile,ctx,q,candidate};
}
for(const f of cases)for(const lang of ['it','en']){
 test(f.id+' '+lang+' request schedules and selects only proven listings',()=>{
  const {analysis,ctx,q,candidate}=setup(f,lang);
  assert.equal(analysis.needsClarification,false,JSON.stringify(analysis));assert.ok(analysis.specificIntents.includes('m3:'+f.id));
  assert.equal(ctx.blocked,false,JSON.stringify(ctx.lexicalContext));assert.ok(q,'derived query must be in actual schedule');
  assert.ok(ctx.plan.queries.length<=6&&ctx.plan.fallbackQueries.length<=6);
  const title=lang==='it'?f.titleIt:f.titleEn,feature=lang==='it'?f.featureIt:f.featureEn,trap=lang==='it'?f.trapIt:f.trapEn;
  const good=publicCandidate(candidate(title,feature),ctx);
  assert.ok(good,JSON.stringify({q,checks:rules.m3ListingChecks(candidate(title,feature),rules.m3Requirements(analysis.specificIntents),analysis.specificIntents)}));
  assert.equal(publicCandidate(candidate(title,''),ctx),null,'absent property');
  assert.equal(publicCandidate(candidate(title,trap),ctx),null,'near-miss property');
  assert.equal(publicCandidate(candidate(title,feature+'. '+(lang==='it'?'Non ':'Not ')+feature),ctx),null,'contradiction');
  assert.equal(publicCandidate(candidate((lang==='it'?'Custodia per ':'Cover for ')+title,feature),ctx),null,'accessory is not main product');
  const selected=selectResearchIdeas([good,{...good,asin:'B000000002'}],ctx.plan);assert.equal(selected.products.length,1,'same function does not multiply ideas');
  assert.equal(rules.violatesExclusions(good,ctx.profile,analysis),false);
  assert.equal(rules.violatesExclusions({...good,features:''},ctx.profile,analysis),true,'browser rechecks evidence');
 });
 test(f.id+' '+lang+' denies negative requests and does not invent host context',()=>{
  const {w,profile}=setup(f,lang);
  for(const prefix of lang==='it'?['Non voglio ','Forse ','Evita ']:['I do not want ','Maybe ','Avoid ']){
   const a=rules.analyseNote(prefix+w[lang]);assert.equal(a.needsClarification,true,prefix+w[lang]);assert.ok(!a.specificIntents.includes('m3:'+f.id));
  }
  if(w.category==='Tecnologia'){
   const a=rules.analyseNote(w[lang]);assert.equal(publicPlan({profile,constraints:a}).blocked,true,'unknown compatibility blocks before Amazon');
   const negative=rules.analyseNote(w[lang]+'. '+(lang==='it'?'Il dispositivo non supporta USB-C.':'The device does not support USB-C.'));
   assert.ok(!negative.specificIntents.includes('m3host:usb_c'));
   assert.equal(publicPlan({profile,constraints:negative}).plan.queries.length,0);
  }
 });
}
test('22 distinct requirements with no inference from generic interests or brand',()=>{
 assert.equal(cases.length,22);assert.equal(new Set(cases.map(c=>c.id)).size,22);
 for(const note of ['Ama tecnologia e lettura','CeraVe','Anker','Frameo','Vorrei USB-C','Maybe the device supports USB-C'])assert.equal(rules.m3Requirements(rules.analyseNote(note).specificIntents).length,0);
 assert.ok(!rules.analyseNote('Maybe the device supports USB-C').specificIntents.includes('m3host:usb_c'));
});
test('Multiple properties in one family combine; distinct families are alternatives',()=>{
 const profile={ageRange:'adult',minBudget:10,budget:60,interests:['culture'],subinterests:['books']};
 const a=rules.analyseNote('Segnalibro illustrato. Segnalibro con elastico. Romanzo sulla natura.');
 const ctx=publicPlan({profile,constraints:a});assert.equal(ctx.plan.queries.length,2);
 const q=ctx.plan.queries.find(q=>q.family==='segnalibri');assert.equal(q.lexicalTermIds.length,2);
 const p={asin:'B000000001',title:'Segnalibro illustrato',features:'Con elastico',price:20,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]};
 assert.ok(publicCandidate(p,ctx));assert.equal(publicCandidate({...p,features:''},ctx),null);
});
test('Other interests retain coverage; excluded families and incompatible profile cannot bypass lexical request',()=>{
 const f=cases.find(f=>f.id==='K034'),{analysis,profile}=setup(f);
 const dual=publicPlan({profile:{...profile,interests:['culture','styleBeauty'],subinterests:['books','skincare']},constraints:analysis});
 assert.ok(dual.plan.queries.some(q=>q.area==='culture'));assert.ok(dual.plan.queries.some(q=>q.lexicalTermIds));
 assert.equal(publicPlan({profile,constraints:analysis,rejectedConcepts:['concept:styleBeauty:creme_mani']}).blocked,true);
 assert.equal(publicPlan({profile:{...profile,ageRange:'teen'},constraints:analysis}).blocked,true);
 const unknown=rules.analyseNote('Crema mani con ceramidi e senza acidi');assert.equal(unknown.needsClarification,true);
});
test('Cables, host variants, charging-only USB, remote app costs and brand claims stay distinct',()=>{
 const traps=[
  ['K013','Cavo USB-C integrato opzionale. USB-C.'],
  ['K014','Cavo Lightning retrattile. Porta USB-C.'],
  ['K015','Potenza totale 45W. USB PD.'],
  ['K015','45W single-port output. USB PD. Output USB-C 30W.'],
  ['K016','Wired USB-A. Microphone. USB-C charging only. Windows.'],
  ['K017','Noise-cancelling microphone. USB-C charging only. Windows.'],
  ['K019','Send photos from your phone. Frameo. Free app. Subscription required.'],
  ['K020','Remote photo sharing. Frameo. Free app. Local network only.'],
  ['K022','HDMI 4K at 60Hz.'],
  ['K023','SD reader. MicroSD cards included.'],
  ['K027','Other product with ceramides.'],
  ['K031','Makeup remover for face. Not for eyes.']
 ];
 for(const [id,features] of traps){const f=cases.find(f=>f.id===id),{ctx,candidate}=setup(f,'en');assert.equal(publicCandidate(candidate(f.titleEn,features),ctx),null,id+' '+features);}
});
test('Host capabilities cannot be supplied by the requested product phrase or a hypothetical ownership clause',()=>{
 const f=cases.find(f=>f.id==='K022'),{profile}=setup(f);
 for(const note of ['Hub USB-C HDMI 4K. Forse il dispositivo supporta uscita video USB-C 4K a 30Hz.','USB-C hub with 4K HDMI. If the device supports USB-C.','Hub USB-C HDMI 4K. Il dispositivo supporta USB-C. Il dispositivo usa Windows.'])assert.equal(publicPlan({profile,constraints:rules.analyseNote(note)}).blocked,true,note);
 for(const note of ['Né libri né fumetti','Né romanzo sulla natura né romanzo di viaggio'])assert.ok(!rules.analyseNote(note).specificIntents.includes('m3:K003'));
});
