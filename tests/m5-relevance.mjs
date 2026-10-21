import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PUBLIC_RULES as R} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate,sufficientIdeas} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas,matchResearchProduct} from '../server/research/research-engine.mjs';
import {weightedRanking,RANKING_WEIGHTS} from '../server/research/weighted-ranking.mjs';
import {primaryProductType} from '../server/research/product-identity.mjs';
const {createRuntime}=createRequire(import.meta.url)('./published-runtime.cjs');
const base={ageRange:'adult',relation:'friend',occasion:'birthday',tone:'neutral',recipientPreference:'unisex',budget:120,minBudget:15,interests:['culture'],subinterests:['books']};
function setup(note,lang='it',profile=base){
 const r=createRuntime(lang);r.seed();r.set('interest',profile.interests);r.set('subinterest',profile.subinterests);r.c.p={...profile,note};
 const req=JSON.parse(JSON.stringify(r.eval('researchRequest(p,analyseNote(p.note),false)')));
 assert.ok(!('note' in req.profile));assert.ok(!JSON.stringify(req).includes(note));
 const ctx=publicPlan(req),queries=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
 const product=(title,features='',extra={})=>({asin:'B000000001',title,features,price:30,url:'https://www.amazon.it/dp/B000000001',productGroup:profile.interests.includes('culture')?'Books':'',bookMetadata:{binding:'Paperback',language:'Italiano',authors:['Autore Test']},researchQueryIds:queries.map(q=>q.id),...extra});
 return {req,ctx,queries,product};
}
const score=(p,c)=>weightedRanking(p,[{score:1}],c.plan.ranking);
for(const [lang,note] of [['it','Vorrei un libro illustrato da sfogliare nella nuova casa.'],['en','I want an illustrated book to browse in the new home.']])test('Illustrated book request requires listing evidence through the questionnaire: '+lang,()=>{
 const {ctx,product,queries}=setup(note,lang);assert.equal(ctx.blocked,false);assert.ok(queries.every(q=>q.family==='illustrati'));
 const good=product('Il viaggio. Ediz. illustrata','Libro con illustrazioni');assert.ok(publicCandidate(good,ctx));
 for(const [title,features] of [['Romanzo storico Il viaggio',''],['Il viaggio','Solo copertina illustrata.'],['Il viaggio','Illustrated cover.'],['Il viaggio','Illustrazioni opzionali.'],['Il viaggio','With illustrations optional.'],['Libro illustrato Il viaggio','Senza illustrazioni.']])assert.equal(publicCandidate(product(title,features),ctx),null,title+' '+features);
 const no=product('Romanzo storico Il viaggio','');no.query='libro illustrato';assert.equal(publicCandidate(no,ctx),null,'query text cannot prove illustration');
 assert.equal(ctx.plan.ranking.active.note,false,'mandatory requirement earns no preference bonus');
});
for(const [lang,note] of [['it','Le piacciono le biografie e le storie vere.'],['en','She likes biographies and true stories.']])test('Biography preference targets searches and rewards proven evidence without becoming a ban: '+lang,()=>{
 const {ctx,product,queries}=setup(note,lang);assert.equal(ctx.blocked,false);assert.deepEqual(ctx.analysis.specificIntents,[]);assert.equal(ctx.analysis.optionalIntents.length,2);
 assert.equal(queries[0].family,'biografie');assert.ok(queries.some(q=>q.family!=='biografie'));
 const bio=publicCandidate(product('Biografia Una vita','Una storia vera.',{asin:'B000000002'}),ctx),fiction=publicCandidate(product('Romanzo storico Il ponte','Una storia di fantasia.'),ctx);
 assert.ok(bio);assert.ok(fiction,'a preference must not exclude all alternatives');
 assert.equal(score(bio,ctx).signals.note.value,1);assert.equal(score(fiction,ctx).signals.note.value,0);
 assert.equal(selectResearchIdeas([fiction,bio],ctx.plan).products[0].asin,bio.asin);
 const negative=publicCandidate(product('Romanzo storico Una vita','Biografia immaginaria. Non è una storia vera.'),ctx);assert.ok(negative);assert.equal(score(negative,ctx).signals.note.value,0);
});
for(const [lang,note] of [['it','Solo biografie.'],['en','Only biographies.'],['it','Voglio una storia vera.'],['en','I want a true story.']])test('Explicit nonfiction request rejects unsupported or fictional content: '+note,()=>{
 const {ctx,product}=setup(note,lang);assert.equal(ctx.blocked,false);assert.ok(ctx.analysis.specificIntents.length);
 assert.ok(publicCandidate(product('Biografia Una vita','Una storia vera.'),ctx));
 assert.equal(publicCandidate(product('Romanzo storico Il ponte','Una storia di fantasia.'),ctx),null);
 assert.equal(ctx.plan.ranking.active.note,false);
});
test('Soft illustrated-book preference, negative wording and unknown tails remain distinct',()=>{
 const a=R.analyseNote('Ama i libri illustrati.');assert.deepEqual(a.specificIntents,[]);assert.ok(a.optionalIntents.includes('m3:M5_ILLUSTRATED_BOOK'));
 for(const note of ['Non voglio una biografia.','Maybe a biography.','No illustrated books.','Vorrei un libro illustrato senza oggetti misteriosi.'])assert.equal(R.analyseNote(note).needsClarification,true,note);
 const m=R.mergeAnalysis(R.analyseNote('Solo libri illustrati in italiano.'),R.analyseNote('Niente horror.'));
 assert.ok(m.specificIntents.includes('m3:M5_ILLUSTRATED_BOOK'));assert.ok(m.exclusions.includes('bookItalian'));assert.ok(m.exclusions.includes('horror'));
});
for(const [lang,note] of [['it','Guarda film. Non cerco accessori per il telefono.'],['en','Watches movies. I do not want phone accessories.']])test('Film use affects ranking and forces the qualified movie search before stopping: '+lang,()=>{
 const {ctx,product,queries}=setup(note,lang,{...base,interests:['techGaming'],subinterests:['tech']});
 assert.equal(ctx.plan.ranking.active.note,true);assert.ok(ctx.plan.ranking.noteSignals.includes('filmUse'));
 const probe=queries.find(q=>q.qualityProbe&&q.family==='cinema');assert.ok(probe);
 assert.equal(sufficientIdeas({products:[1,2,3].map(()=>({areas:['techGaming'],tags:['tech']})),missing:[]},ctx.plan,[probe]),false);
 const good=publicCandidate(product('Mini proiettore','Per guardare film. Cinema in casa.'),ctx),generic=publicCandidate(product('Tablet Android','Schermo touch'),ctx);
 assert.ok(good);assert.ok(generic);assert.equal(score(good,ctx).signals.note.value,1);assert.equal(score(generic,ctx).signals.note.value,0);
 for(const features of ['Non riproduce film.','Movies not supported.','Optional movie playback.'])assert.equal(score({...good,features,title:'Mini proiettore'},ctx).signals.note.value,0,features);
 for(const title of ['Tablet grafico ugee S640','Tastiera wireless per laptop','Hub USB-C HDMI per laptop e tablet'])assert.equal(publicCandidate(product(title,'Tablet per guardare film, computer portatile.'),ctx),null,title);
 assert.equal(score({...good,title:'Power bank',features:'Guardare film'},ctx).signals.note.value,0);
});
for(const [title,type,wrong] of [['Tablet grafico ugee S640','graphics_tablet','tablet'],['Drawing tablet with pen','graphics_tablet','tablet'],['Tavoletta grafica per tablet Android','graphics_tablet','tablet'],['Tastiera wireless per computer portatile','keyboard','computer portatile'],['Wireless keyboard for laptop','keyboard','computer portatile']])test('Primary type prevents cross-category keyword leakage: '+title,()=>{
 assert.equal(primaryProductType(title),type);
 assert.equal(matchResearchProduct({title,features:'Tablet computer portatile'}, {area:'techGaming',subId:'tech',keywords:wrong,recipientContext:{connections:[]}}),0);
});
test('No recipient capability or film preference is invented from negation or occasion',()=>{
 for(const note of ['Non guarda film.','Maybe watches movies.','Non solo guarda film.'])assert.ok(!R.analyseNote(note).signals.includes('filmUse'));
 const {ctx}=setup('Guarda film.','it',{...base,interests:['techGaming'],subinterests:['tech']});
 assert.deepEqual(ctx.plan.recipientContext?.connections||[],[]);
 assert.deepEqual(RANKING_WEIGHTS,{category:45,note:20,effect:15,occasion:12,relation:8});
});
test('USB hubs are accessories; a laptop or tablet listing can mention a keyboard and hub',()=>{
 for(const title of ['Hub USB-C HDMI per laptop e tablet','USB C hub for laptop','Docking station USB-C per computer portatile','USB 3.0 Docking Station Dual Monitor, HDMI HUB Displaylink Dock for Laptop']){
  assert.equal(primaryProductType(title),'usb_hub');
  assert.equal(matchResearchProduct({title,features:'Tablet computer portatile'}, {area:'techGaming',subId:'tech',keywords:'computer portatile',recipientContext:{connections:[]}}),0);
 }
 assert.equal(primaryProductType('Laptop con tastiera e hub USB-C incluso'),'laptop');
 assert.equal(primaryProductType('Tablet Android con tastiera e hub USB-C'),'tablet');
 assert.ok(matchResearchProduct({title:'Hub USB-C con HDMI',features:'Hub USB-C'}, {area:'techGaming',subId:'tech',keywords:'hub usb c',recipientContext:{connections:['usb_c']}})>0);
 assert.equal(matchResearchProduct({title:'Hub USB C per laptop con scheda micro SD',features:'Lettore di schede micro SD'}, {area:'techGaming',subId:'tech',keywords:'scheda micro sd'}),0);
});
test('Infinitive and plural movie preferences affect ranking without interpreting negated clauses',()=>{
 for(const note of ['Amano guardare film nel soggiorno della nuova casa.','Guardano film.','They watch movies.','They enjoy watching films.'])assert.ok(R.analyseNote(note).signals.includes('filmUse'),note);
 for(const note of ['Non amano guardare film.','They do not watch movies.','Maybe watching films.'])assert.ok(!R.analyseNote(note).signals.includes('filmUse'),note);
});
