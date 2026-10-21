import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {matchResearchProduct,selectResearchIdeas} from '../server/research/research-engine.mjs';
import {normalizeCandidates} from '../server/research/engine.mjs';

const profile=category=>({ageRange:'adult',recipientPreference:'unisex',minBudget:15,budget:60,interests:[{books:'culture',tech:'techGaming',skincare:'styleBeauty'}[category]],subinterests:[category],tone:'any',relation:'friend',occasion:'birthday'});
const setup=(category,note)=>{
 const analysis=rules.analyseNote(note),ctx=publicPlan({profile:profile(category),constraints:analysis});
 const candidate=(title,features='',extra={})=>({asin:'B000000001',title,features,price:30,url:'https://www.amazon.it/dp/B000000001?tag=3gifts-21',researchQueryIds:[...ctx.plan.queries,...ctx.plan.fallbackQueries].map(q=>q.id),...extra});
 return {analysis,ctx,candidate};
};
const cases=[
 {id:'friendship',category:'books',notes:['Cerco un romanzo che parli di amicizia.','Vorrei un romanzo sul tema dell’amicizia.','I want a novel whose story is about friendship.'],title:'Romanzo Il ponte di carta',features:'La trama racconta una storia di amicizia.',missing:'Romanzo di avventura',wrong:'Segnalibro amicizia',denied:'La trama non tratta amicizia.'},
 {id:'reading-light',category:'books',notes:['Luce da lettura a luce calda con luminosità regolabile.','Vorrei una lampada per la lettura con luminosità regolabile e luce calda.','I need a warm reading light with adjustable brightness.'],title:'Lampada da lettura',features:'Luce calda. Luminosità regolabile.',missing:'Lampada da lettura',wrong:'Romanzo di avventura',denied:'Non ha luce calda. Luminosità regolabile.'},
 {id:'headset',category:'tech',notes:['Cuffie con microfono per videochiamate.','Vorrei cuffie per chiamate con microfono.','Headphones for video calls with a microphone.'],host:'Il dispositivo supporta Bluetooth. Il dispositivo usa Windows.',title:'Cuffie con microfono',features:'Microfono per videochiamate. Bluetooth. Windows.',missing:'Cuffie Bluetooth',wrong:'Smartphone Android',denied:'Non ha microfono. Videochiamate. Bluetooth. Windows.'},
 {id:'frame',category:'tech',notes:['Cornice per inviare le mie foto a distanza.','Vorrei inviare foto a distanza a una cornice digitale.','I want a frame to share my photos remotely.'],host:'Il telefono usa Android. Il dispositivo supporta WiFi e internet.',title:'Cornice digitale WiFi',features:'Invio foto a distanza. App per inviare foto. Android. WiFi e internet.',missing:'Cornice digitale WiFi',wrong:'Smartphone Android',denied:'Invio foto a distanza non disponibile. App per inviare foto. Android. WiFi e internet.'},
 {id:'hand-cream',category:'skincare',notes:['Crema mani che si assorba rapidamente.','Vorrei una crema per le mani ad assorbimento veloce.','I need hand cream that absorbs quickly.'],title:'Crema mani',features:'Si assorbe rapidamente.',missing:'Crema mani',wrong:'Siero viso',denied:'Non si assorbe rapidamente.'},
 {id:'masks',category:'skincare',notes:['Due maschere viso da usare insieme.','Cerco 2 maschere viso per noi.','I want two face masks to use together.'],title:'Maschere viso in tessuto',features:'2 maschere viso individuali.',missing:'Maschera viso',wrong:'Siero viso',denied:'Non include 2 maschere viso individuali.'}
];
test('Long listing titles retain explicit friendship evidence in the same clause',()=>{
 const {ctx,candidate}=setup('books','Cerco un romanzo che parli di amicizia.');
 const title='Tra i bisbigli delle foglie: Una storia del Condominio di Natale | Romanzo corale ambientato nella stagione autunnale: amore, amicizia e seconde possibilità';
 assert.ok(publicCandidate(candidate(title),ctx));
 assert.equal(publicCandidate(candidate(title.replace('amore, amicizia','amore, non amicizia')),ctx),null);
});
for(const c of cases)for(const note of c.notes)test(c.id+' affirmative, missing, conflicting and wrong product: '+note,()=>{
 const {analysis,ctx,candidate}=setup(c.category,note+' '+(c.host||''));
 assert.equal(analysis.needsClarification,false,JSON.stringify(analysis));assert.equal(ctx.blocked,false,JSON.stringify(ctx.lexicalContext));
 const good=publicCandidate(candidate(c.title,c.features),ctx);
 assert.ok(good,'Valid product must remain selectable, not only reject counterexamples');
 assert.equal(publicCandidate(candidate(c.missing,''),ctx),null,'missing evidence');
 assert.equal(publicCandidate(candidate(c.wrong,c.features),ctx),null,'wrong main product');
 assert.equal(publicCandidate(candidate(c.missing,c.denied),ctx),null,'contradictory evidence');
 assert.equal(publicCandidate(candidate('Custodia per '+c.title,c.features),ctx),null,'accessory');
 assert.equal(rules.violatesExclusions({...good,features:''},ctx.profile,analysis),true,'frontend retains mandatory evidence');
});
for(const c of cases)test(c.id+' negation and uncertainty never become positive requests',()=>{
 for(const prefix of ['Non voglio ','Forse ','I do not want ','Maybe ']){
  const {analysis,ctx}=setup(c.category,prefix+c.notes[0]);
  assert.ok(analysis.needsClarification||ctx.blocked);
 }
});
test('Required technology compatibility is requested before searching',()=>{
 for(const c of cases.filter(c=>c.host)){
  const x=setup(c.category,c.notes[0]);assert.equal(x.ctx.blocked,true);assert.equal(x.ctx.plan.queries.length,0);
  const y=setup(c.category,c.notes[0]+' Il dispositivo non supporta Bluetooth.');assert.equal(y.ctx.blocked,true);
 }
});
test('A property preference does not remove other selected interests',()=>{
 for(const note of ['Gli piace una crema mani che si assorbe rapidamente.','Likes hand cream that absorbs quickly.']){
  const a=rules.analyseNote(note);assert.equal(a.needsClarification,false);assert.deepEqual(a.specificIntents,[]);assert.ok(a.optionalIntents.includes('m3:K035'));
  const ctx=publicPlan({profile:{...profile('skincare'),interests:['culture','styleBeauty'],subinterests:['books','skincare']},constraints:a});
  assert.ok(ctx.plan.queries.some(q=>q.area==='culture'));assert.ok(ctx.plan.queries.some(q=>q.area==='styleBeauty'));
 }
});
test('Independent exclusions and unknown restrictions survive phrase parsing',()=>{
 for(const tail of ['Niente horror.','No horror.']){
  const a=rules.analyseNote('Cerco un romanzo che parli di amicizia. '+tail);assert.ok(a.exclusions.includes('horror'));
 }
 assert.equal(rules.analyseNote('Crema mani che si assorba rapidamente e senza acidi').needsClarification,true);
 assert.equal(rules.analyseNote('Né romanzo sulla natura né romanzo di viaggio').needsClarification,true);
});
for(const note of ['Solo libri cartacei in italiano.','Cerco libri in italiano, solo cartacei.','Only physical books in Italian.','Paper books only, in Italian.'])test('Format AND published language: '+note,()=>{
 const {analysis,ctx,candidate}=setup('books',note);
 assert.equal(ctx.blocked,false);assert.ok(analysis.exclusions.includes('bookPhysical'));assert.ok(analysis.exclusions.includes('bookItalian'));
 const book=(binding='Paperback',language='Italiano')=>candidate('Romanzo avventura','Romanzo di avventura.',{productGroup:'Books',bookMetadata:{binding,language,authors:['Autore']}});
 assert.ok(publicCandidate(book(),ctx));
 for(const p of [book('Kindle eBook'),book('Paperback','English'),book('Paperback',''),book('Paperback','Italiano, English'),candidate('Lampada da lettura','Luce calda')])assert.equal(publicCandidate(p,ctx),null);
 const declared=book();declared.bookMetadata.language='';declared.features+=' Lingua: italiano.';assert.ok(publicCandidate(declared,ctx));
 declared.features+=' Lingua: inglese.';assert.equal(publicCandidate(declared,ctx),null);
});
for(const note of ['Ha già letto L’anno della lepre.','Ho già letto "L’anno della lepre".','They have already read L’anno della lepre.'])test('Read work stays excluded across editions with only opaque title key: '+note,()=>{
 const {analysis,ctx,candidate}=setup('books',note);assert.equal(ctx.blocked,false);
 assert.ok(analysis.exclusions.some(k=>/^bookread:[a-f0-9]{16}$/.test(k)));
 assert.ok(!JSON.stringify({...analysis,feedback:undefined}).includes('lepre'),'No book title in transmitted constraints');
 const book=(title)=>candidate(title,'Romanzo di avventura.',{productGroup:'Books',bookMetadata:{binding:'Paperback',language:'Italiano',authors:['Arto Paasilinna']}});
 assert.equal(publicCandidate(book('L’anno della lepre'),ctx),null);
 assert.equal(publicCandidate(book('L’anno della lepre (nuova edizione)'),ctx),null);
 assert.ok(publicCandidate(book('Il bosco delle volpi'),ctx));
 const translated=book('The Year of the Hare');translated.features+=' Titolo originale: L’anno della lepre';assert.equal(publicCandidate(translated,ctx),null);
});
test('Missing title is clarified and a trailing exclusion is retained',()=>{
 assert.equal(rules.analyseNote('Ha già letto molti libri').needsClarification,true);
 assert.ok(rules.analyseNote('Ha già letto L’anno della lepre e niente horror.').exclusions.includes('horror'));
});
test('Italian API language/author labels are preserved, original language is not substituted',()=>{
 const raw={asin:'B000000001',detailPageURL:'https://www.amazon.it/dp/B000000001',itemInfo:{title:{displayValue:'Romanzo'},classifications:{productGroup:{displayValue:'Books'},binding:{displayValue:'Copertina flessibile'}},byLineInfo:{contributors:[{name:'Autore Test',role:'Autore'}]},contentInfo:{languages:{displayValues:[{type:'Pubblicato',displayValue:'Italiano'},{type:'Originale',displayValue:'Inglese'}]}}},offersV2:{listings:[{price:{money:{amount:20,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}};
 const [p]=normalizeCandidates({searchResult:{items:[raw]}},{id:'q1',area:'culture',keywords:'libro',keywordId:'x'},{age:'adult',sex:'any',exclude:[],effectiveMin:15,max:60});
 assert.equal(p.bookMetadata.language,'Italiano');assert.deepEqual(p.bookMetadata.authors,['Autore Test']);
});
test('Massage cream is not a hand cream and its sizes cannot fill two gift slots',()=>{
 const {ctx,candidate}=setup('skincare','Cerco qualcosa di rilassante.');
 const a=candidate('Crema da massaggio corpo 500 ml','Crema da massaggio corpo rilassante. Protegge le mani del massaggiatore.');
 const b={...a,asin:'B000000002',title:'Crema da massaggio corpo 1000 ml'};
 for(const q of [...ctx.plan.queries,...ctx.plan.fallbackQueries].filter(q=>q.family==='creme_mani'))assert.equal(matchResearchProduct(a,q),0);
 const c={...a,asin:'B000000003',title:'Olio Massaggio Rilassante Argan 250 ml + Crema Corpo Profumata Argan 200 ml, Set Regalo'};
 const e={...a,asin:'B000000004',title:'Relaxing massage oil and body cream gift set'};
 const good=[a,b,c,e].map(p=>publicCandidate(p,ctx)).filter(Boolean);assert.equal(good.length,4);
 for(const pool of [good,[...good].reverse()]){
  const selected=selectResearchIdeas(pool,ctx.plan);assert.equal(selected.products.length,1);assert.ok(selected.finalSelection.some(d=>d.reason==='equivalent_function'));
 }
 assert.equal(rules.skincareFunction(a),'massage_care');
 assert.equal(rules.skincareFunction(c),'massage_care');
 assert.equal(rules.skincareFunction(e),'massage_care');
 assert.equal(rules.skincareFunction({title:'Crema mani',features:'Indicata anche per massaggio'}),'hand_cream');
});
