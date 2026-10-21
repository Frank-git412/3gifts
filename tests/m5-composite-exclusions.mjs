import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
const require=createRequire(import.meta.url),cases=require('./fixtures/m5-composite.cjs');
const {createRuntime}=require('./published-runtime.cjs');
const profile={ageRange:'adult',relation:'friend',occasion:'birthday',recipientPreference:'unisex',minBudget:15,budget:60,tone:'useful'};
function setup(c,note,lang='it'){
 const r=createRuntime(lang);r.seed();r.set('interest',[c.area]);r.set('subinterest',[c.sub]);r.c.m5Profile={...profile,interests:[c.area],subinterests:[c.sub],note};
 const request=JSON.parse(JSON.stringify(r.eval('researchRequest(m5Profile,analyseNote(m5Profile.note),false)')));
 assert.ok(!('note' in request.profile));const ctx=publicPlan(request);
 const product=(extra={})=>({asin:'B000000001',title:c.title,features:c.features,price:30,url:'https://www.amazon.it/dp/B000000001?tag=3gifts-21',researchQueryIds:[...ctx.plan.queries,...ctx.plan.fallbackQueries].map(q=>q.id),...(c.book?{productGroup:'Books',bookMetadata:{binding:'Paperback',language:'Italiano',authors:['Autore']}}:{}),...extra});
 return {request,ctx,product};
}
for(const c of cases)for(const lang of ['it','en'])test('Composite request keeps good product and excludes the conflicting product: '+c.id+' '+lang,()=>{
 const {request,ctx,product}=setup(c,c[lang],lang);assert.equal(ctx.blocked,false,JSON.stringify(request.constraints));
 const reasons={};assert.ok(publicCandidate(product(),ctx,reasons),JSON.stringify({reasons,queries:ctx.plan.queries.map(q=>q.keywords)}));
 assert.equal(publicCandidate(product(c.bad),ctx),null);
 assert.ok(request.constraints.exclusions.length);
});
test('Connection needs stay unresolved until the recipient declares them',()=>{
 for(const id of ['C-T17','C-T18'])for(const lang of ['it','en']){
  const c=cases.find(c=>c.id===id),note=c[lang].split('.').slice(0,2).join('.')+'.';
  const {request,ctx}=setup(c,note,lang);assert.equal(request.constraints.needsClarification,false);assert.equal(ctx.blocked,true);assert.equal(ctx.plan.queries.length,0);
 }
});
test('A study about novels is not itself a novel',()=>{
 const c=cases.find(c=>c.id==='C-L17');
 for(const lang of ['it','en']){
  const {ctx,product}=setup(c,c[lang],lang);
  for(const title of ['Storia del romanzo italiano','Teoria della narrativa','History of the novel','A study of fiction'])assert.equal(publicCandidate(product({title}),ctx),null,title);
  assert.ok(publicCandidate(product({title:'Sherlock Holmes. Tutti i romanzi e tutti i racconti'}),ctx));
 }
});
test('Properties require affirmative absence evidence, with no contradictory or conditional claims',()=>{
 const rows=[
  ['C-S17','Retinol-free. Fragrance-free.','Senza profumo.'],
  ['C-S22','Senza acidi esfolianti e senza retinolo.','Senza retinolo.'],
  ['C-T21','No Wi-Fi. No subscription.','Foto da SD.'],
  ['C-L23','Luce calda. Warm light only.','Luce calda.'],
  ['C-T18','USB-C. Wired charging only.','USB-C.']
 ];
 for(const [id,good,missing] of rows){
  const c=cases.find(c=>c.id===id),{ctx,product}=setup(c,c.it);
  assert.ok(publicCandidate(product({features:good}),ctx),id);
  for(const features of [missing,'Forse '+good,'Variante '+good,'Non '+good,good.replace(/\.$/,'')+' optional'])assert.equal(publicCandidate(product({features}),ctx),null,id+' '+features);
 }
 // A known additive requirement must survive a joined free-from statement.
 const c=cases.find(c=>c.id==='C-S17'),{ctx,product}=setup(c,c.it);
 assert.equal(publicCandidate(product({features:'Senza profumo e senza retinolo. Contiene retinal.'}),ctx),null);
});
test('Unknown restrictions and double negation are preserved, not silently discarded',()=>{
 for(const note of ['Niente sieri e niente oggetti misteriosi.','Niente libri romantici e oggetti misteriosi.','No fantasy books and unknown objects.','Non senza retinolo.','Non escludere sieri.','Solo libri in italiano, niente fantasy e niente oggetti misteriosi.'])assert.equal(rules.analyseNote(note).needsClarification,true,note);
 const a=rules.analyseNote('Niente libri romantici, preferisce storie di avventura.');assert.ok(!a.exclusions.includes('books'));assert.ok(a.signals.includes('adventurous'));
 const b=rules.analyseNote('Niente sieri e niente prodotti anti-età. Vorrei una crema corpo.');assert.ok(!b.exclusions.includes('skincare'));
 const joined=rules.analyseNote('Niente horror e fantasy.');assert.ok(joined.exclusions.includes('horror'));assert.ok(joined.exclusions.includes('bookFantasy'));
});
test('Generic gifts and unknown tastes do not authorize erotic suggestions; adult explicit preferences can',()=>{
 const c=cases[0],erotic={title:'Il ponte Romanzo Erotico di Fantascienza',features:'Romanzo erotico.'};
 for(const note of ['Vorrei un libro.','Vorrei un libro ma non conosco i generi che preferisce.','Un regalo elegante per la mia compagna.']){
  const {ctx,product}=setup(c,note);const reasons={};assert.equal(publicCandidate(product(erotic),ctx,reasons),null);assert.ok(reasons.editorial_explicit_content_without_adult_preference);
 }
 for(const note of ['Vorrei un romanzo erotico.','I want an erotic novel.','Ama un romanzo erotico.']){
  const {ctx,product}=setup(c,note);assert.equal(ctx.blocked,false);assert.ok(publicCandidate(product(erotic),ctx));
  for(const ageRange of ['teen','child','earlyChild','unknown'])assert.equal(rules.editorialEligible(product(erotic),{ageRange},ctx.analysis),false);
 }
 for(const title of ['Erotic romance','Racconti con scene erotiche','Racconti erotici'])assert.equal(rules.editorialEligible({title},{ageRange:'adult'},{}),false);
 assert.equal(rules.editorialEligible({title:'Manuale di educazione sessuale'},{ageRange:'adult'},{}),true);
 assert.equal(rules.editorialEligible({title:'Romanzo romantico'},{ageRange:'adult'},{}),true);
 for(const note of ['Non voglio un romanzo erotico.','Forse un romanzo erotico.'])assert.equal(rules.analyseNote(note).needsClarification,true);
});
