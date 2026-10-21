import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as R} from '../server/research/public-rules.mjs';
import {PILOT_BILINGUAL_LEXICON as terms} from '../server/research/pilot-lexicon-data.mjs';
import {PILOT_CLOSURE_RULES} from '../server/research/pilot-closure-rules.mjs';
import {pilotDictionaryInventory,pilotContextEvidence} from '../server/research/pilot-dictionary.mjs';
import {PILOT_EVENT_RULES,pilotEventEvidence} from '../server/research/pilot-context.mjs';
import {RESEARCH_CATALOG} from '../server/research/catalog-data.mjs';
import {matchResearchProduct,selectResearchIdeas} from '../server/research/research-engine.mjs';
import {checkProductRequirements} from '../server/research/product-requirements.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {giftContext,contextualizeQueries} from '../server/research/gift-context.mjs';
const connections=['usb_c','usb_a','bluetooth','jack_35','qi','magsafe','hdmi_arc'];
for(const term of terms)test('IT/EN '+term.id,()=>{
 const k=RESEARCH_CATALOG.associations.find(k=>k.id===term.id);
 const q={...k,keywords:k.queryKeywords,originalKeyword:k.keyword,recipientContext:{connections}};
 const p={title:term.it,features:'USB-C USB-A Bluetooth Windows',productGroup:''};
 for(const en of [term.en,...term.aliasesEN]){
  assert.equal(R.pilotTranslateTerms(en),R.pilotTranslateTerms(term.it),'same reviewed meaning: '+en);
  assert.equal(matchResearchProduct({...p,title:en},q),matchResearchProduct(p,q),'same candidate decision');
  assert.deepEqual(checkProductRequirements({...p,title:en},q),checkProductRequirements(p,q),'same requirements');
  for(const prefix of ['','Non voglio ','Né ']){
   const a=R.analyseNote(prefix+term.it),b=R.analyseNote(prefix+en);
   for(const key of ['signals','requiredSignals','specificIntents','exclusions','requiredTypes','needsClarification'])assert.deepEqual(b[key],a[key],prefix+en+' '+key);
  }
 }
});
test('65 families have 353 reviewed translations and 1300 explicit context cells',()=>{
 const rows=pilotDictionaryInventory();assert.equal(rows.length,65);assert.equal(terms.length,353);
 assert.equal(rows.filter(r=>r.rules.length).length,48);assert.equal(rows.filter(r=>!r.rules.length).length,17);
 assert.equal(rows.flatMap(r=>r.contextDecisions).length,1300);
 for(const row of rows){assert.equal(row.bilingualTerms.length,row.keywordIds.length);assert.equal(row.contextDecisions.length,20);assert.ok(row.familyReview.neutralReason);for(const d of row.contextDecisions){assert.ok(d.reason);assert.equal(d.status==='conditional_rule',d.rules.length>0);}}
 assert.equal(pilotContextEvidence({title:'Acqua micellare uso quotidiano senza risciacquo',tags:['styleBeauty','skincare']},giftContext({}),'any').effect.status,'absent');
});
for(const rule of PILOT_CLOSURE_RULES)test(rule.id+' complete/absent/contradictory evidence and reachable query',()=>{
 const context=giftContext({relation:rule.signal==='relation'?rule.values[0]:null}),effect=rule.signal==='effect'?rule.values[0]:'any';
 const p={title:rule.examples.it,tags:[rule.area,rule.subId],conceptFamily:rule.area+':'+rule.families[0]};
 for(const lang of ['it','en']){
  const title=rule.examples[lang];assert.equal(pilotContextEvidence({...p,title},context,effect)[rule.signal].status,'supported');
  for(const prefix of ['Non ','Not ','Optional ','Variante '])assert.notEqual(pilotContextEvidence({...p,title:prefix+title},context,effect)[rule.signal].status,'supported');
  assert.notEqual(pilotContextEvidence({...p,title,features:'Not '+title},context,effect)[rule.signal].status,'supported');
 }
 for(const pattern of rule.properties)assert.notEqual(pilotContextEvidence({...p,title:p.title.replace(new RegExp(pattern.source,'gi'),'')},context,effect)[rule.signal].status,'supported',pattern.source);
 assert.notEqual(pilotContextEvidence({...p,title:rule.examples.negative},context,effect)[rule.signal].status,'supported');
 assert.notEqual(pilotContextEvidence({...p,conceptFamily:rule.area+':other'},context,effect)[rule.signal].status,'supported');
 const plan=publicPlan({profile:{ageRange:'adult',budget:100,minBudget:10,interests:[rule.area],subinterests:[rule.subId],tone:effect,relation:context.relation},constraints:{recipientContext:{connections}}});
 const q=plan.plan.candidateQueries.find(q=>rule.families.includes(q.family));assert.ok(q,'qualified base query');
 assert.ok(contextualizeQueries([q],context,{effect}).some(q=>q.contextRule===rule.id));
});
for(const rule of PILOT_EVENT_RULES)test(rule.id+' explicit event evidence rejects negation and query claims',()=>{
 const p={title:rule.positive,tags:[rule.area,rule.sub]},context={occasion:rule.event};
 assert.equal(pilotEventEvidence(p,context).status,'supported');
 for(const prefix of ['Non ','Not ','Optional '])assert.equal(pilotEventEvidence({...p,title:prefix+p.title},context).status,'absent');
 assert.equal(pilotEventEvidence({...p,title:'Prodotto',features:'',query:p.title},context).status,'absent');
 assert.equal(pilotEventEvidence({...p,conceptFamily:rule.area+':unrelated'},context).status,'absent');
});
const book=(title,author='A. Rossi',extra={})=>({asin:'B000000001',title,productGroup:'Books',features:'Romanzo. Autoconclusivo.',bookMetadata:{authors:[author],binding:'Paperback'},...extra});
test('Book work, edition, series, collection and homonym identities stay distinct',()=>{
 const a=book('Il bosco'),edition=book('Il bosco (Seconda edizione)',undefined,{asin:'B000000002'});
 assert.equal(R.bookDuplicate(a,edition),'same_book_work');
 assert.equal(R.bookDuplicate(a,book('La montagna')),null);
 assert.equal(R.bookDuplicate(a,book('Il bosco','B. Verdi')),null);
 const s1=book('Alba',{},{bookMetadata:{authors:['Anna Rossi']},features:'Serie narrativa: Terre lontane; Volume 1'}),s2={...s1,title:'Tramonto',features:'Serie narrativa: Terre lontane; Volume 2'};
 assert.equal(R.bookDuplicate(s1,s2),'same_book_series');
 assert.equal(R.bookDuplicate({...a,features:'Collana editoriale: Classici'}, {...book('La montagna'),features:'Collana editoriale: Classici'}),null);
 assert.equal(R.bookDuplicate(book('Il bosco',undefined,{bookMetadata:{isbns:['0-306-40615-2']}}),book('Titolo alternativo',undefined,{bookMetadata:{isbns:['9780306406157']}})),'same_book_edition');
 assert.equal(R.validBookISBN('9780306406158'),null);
 assert.equal(R.bookDuplicate(book('Cofanetto romanzi',undefined,{features:'Opere incluse: Il bosco|La montagna'}),a),'book_in_collection');
 assert.equal(R.bookDuplicate(book('Cofanetto romanzi',undefined,{features:''}),a),'uncertain_collection_overlap');
 assert.equal(R.bookIdentity({title:'Leggio per libri',productGroup:'Office'}),null);
 assert.equal(R.bookIdentity({title:'Lettore ebook',productGroup:'Electronics'}),null);
 const old=R.productKeys(a);a.title='Il mare';assert.notDeepEqual(R.productKeys(a),old,'mutable identity cache refreshes');
});
test('Book format and series constraints need positive evidence and preserve unknown clauses',()=>{
 for(const note of ['Solo libri cartacei','Paper books only']){
  const a=R.analyseNote(note);assert.equal(a.needsClarification,false);assert.ok(a.exclusions.includes('bookPhysical'));
  assert.equal(R.violatesExclusions(book('Il bosco'),{},a),false);
  assert.equal(R.violatesExclusions(book('Il bosco',undefined,{features:'Non fa parte di una serie'}),{},a),false);
  for(const binding of ['Kindle eBook','', 'Paperback Kindle eBook'])assert.equal(R.violatesExclusions(book('Il bosco',undefined,{bookMetadata:{binding}}),{},a),true);
 }
 for(const note of ['Niente saghe','No series']){
  const a=R.analyseNote(note);assert.equal(a.needsClarification,false);assert.ok(a.exclusions.includes('bookSeries'));
  assert.equal(R.violatesExclusions(book('Il bosco'),{},a),false);
  for(const features of ['','Not standalone','Non autoconclusivo','Autoconclusivo. Serie narrativa: Terre lontane'])assert.equal(R.violatesExclusions(book('Il bosco',undefined,{features}),{},a),true,features);
 }
 assert.equal(R.analyseNote('Solo libri cartacei e senza altri vincoli sconosciuti').needsClarification,true);
});
test('Known different novels can fill separate slots; another edition and series volume cannot',()=>{
 const ctx=publicPlan({profile:{ageRange:'adult',budget:60,minBudget:10,interests:['culture'],subinterests:['books']}});
 const q=ctx.plan.queries.find(q=>q.keywords==='romanzo')||ctx.plan.candidateQueries.find(q=>q.keywords==='romanzo');assert.ok(q);
 ctx.plan.queries=[q];ctx.plan.fallbackQueries=[];
 const titles=['Il bosco','Il bosco (Seconda edizione)','La montagna','Il mare'];
 const products=titles.map((t,i)=>publicCandidate(book(t,undefined,{asin:'B'+String(i+1).padStart(9,'0'),price:30,url:'https://www.amazon.it/dp/B'+String(i+1).padStart(9,'0'),researchQueryIds:[q.id]}),ctx));assert.ok(products.every(Boolean));
 const selected=selectResearchIdeas(products,ctx.plan);assert.equal(selected.products.length,3);
 assert.equal(selected.finalSelection.find(d=>d.asin===products[1].asin).reason,'same_book_work');
 const next={...ctx,rejectedBookKeys:new Set(R.bookIdentity(products[0]).keys)};
 assert.equal(publicCandidate(products[1],next),null);
 assert.ok(publicCandidate(products[2],next));
});
// Eight source-derived distinctions, independently named for the closure audit.
test('PROP-01 dimmable is not warm light',()=>{const p={title:'Lettore ebook',features:'E Ink. Adjustable dimmable light',tags:['techGaming','tech']};assert.notEqual(pilotContextEvidence(p,giftContext({}),'relax').effect.status,'supported');p.features='Reading. Adjustable warm light';assert.equal(pilotContextEvidence(p,giftContext({}),'relax').effect.status,'supported');});
test('PROP-02 microphone noise reduction is not earcup ANC',()=>{const q={area:'techGaming',subId:'tech',keywords:'cuffie ANC',recipientContext:{connections:['usb_c']}};const p={title:'Cuffie USB-C',features:'Noise-cancelling microphone'};assert.equal(checkProductRequirements(p,q).passed,false);assert.equal(checkProductRequirements({...p,features:'ANC'},q).passed,true);});
test('PROP-03 USB-C is not universal compatibility',()=>{const q={area:'techGaming',subId:'tech',keywords:'hub USB-C',originalKeyword:'hub USB-C',recipientContext:{connections:['usb_a']}};assert.equal(checkProductRequirements({title:'Hub USB-C',features:''},q).passed,false);});
test('PROP-04 remote photos require declared app and network',()=>{const missing=R.m3ContextChecks(['m3:K020']);assert.ok(missing.length>=3);assert.ok(missing.every(c=>c.status==='unknown'));for(const absent of ['android','frameo','wifi']){const intents=['m3:K020',...['android','frameo','wifi'].filter(k=>k!==absent).map(k=>'m3host:'+k)];assert.ok(R.m3ContextChecks(intents).some(c=>c.status==='unknown'));}assert.ok(R.m3ContextChecks(['m3:K020','m3host:android','m3host:frameo','m3host:wifi']).every(c=>c.status==='declared'));});
test('PROP-05 HDMI 4K is not a declared refresh rate',()=>{const rows=R.m3Requirements(['m3:K022']);for(const features of ['HDMI 4K','HDMI 4K at 60Hz'])assert.notEqual(R.m3ListingChecks({title:'Hub USB-C',features},rows).find(c=>c.key==='hdmi4k30')?.status,'supported_by_listing');});
test('PROP-06 gentle is not fragrance-free',()=>{assert.notEqual(R.skincarePropertyChecks({title:'Gentle face cleanser',features:'',tags:['skincare']},['fragranceFree'])[0].status,'supported_by_listing');assert.equal(R.skincarePropertyChecks({title:'Face cleanser',features:'Fragrance-free',tags:['skincare']},['fragranceFree'])[0].status,'supported_by_listing');});
test('PROP-07 ebook is not paper',()=>{const analysis=R.analyseNote('Paper books only');assert.equal(R.violatesExclusions(book('Il bosco Kindle eBook'),{},analysis),true);assert.equal(R.violatesExclusions(book('Il bosco'),{},analysis),false);});
test('PROP-08 as-needed is not daily',()=>{const p={title:'Micellar water',features:'No rinse required. Use as needed',tags:['styleBeauty','skincare']};assert.notEqual(pilotContextEvidence(p,giftContext({}),'useful').effect.status,'supported');p.features='Daily use. No rinse required';assert.equal(pilotContextEvidence(p,giftContext({}),'useful').effect.status,'supported');});
