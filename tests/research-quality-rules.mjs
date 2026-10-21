import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {checkProductRequirements} from '../server/research/product-requirements.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {normalizeCandidates} from '../server/research/engine.mjs';
import {selectResearchIdeas} from '../server/research/research-engine.mjs';
const profile={ageRange:'adult',relation:'friend',occasion:'birthday',interests:['styleBeauty'],subinterests:['style'],tone:'useful',budget:60,minBudget:15,recipientPreference:'women',avoid:[]};
const ctx=publicPlan({profile});
const q=[...ctx.plan.queries,...ctx.plan.fallbackQueries].find(q=>q.keywords==='portafoglio');
const product=(title,features='',i=1)=>({asin:'B'+String(i).padStart(9,'0'),title,features,price:30,url:'https://www.amazon.it/dp/B'+String(i).padStart(9,'0'),researchQueryIds:[q.id]});
test('Recipient evidence uses features and variants, never search intent',()=>{
 for(const p of [{title:'Portafoglio in pelle',features:'Modello da uomo'},{title:'Portafoglio in pelle',variantTitle:'Uomo'},{title:'Portafoglio uomo regalo per donna'}])assert.equal(rules.recipientEligible(p,profile),false);
 assert.equal(rules.productRecipientTarget({title:'Portafoglio in pelle',query:'portafoglio donna'}),'unknown');
 assert.equal(rules.recipientEligible({title:'Portafoglio in pelle',query:'portafoglio donna'},profile),false);
 assert.equal(rules.recipientEligible({title:'Portafoglio da donna'},profile),true);
});
test('Giver references do not change recipient; explicit unisex differs from missing data',()=>{
 for(const title of ['Portafoglio uomo regalo da moglie','Portafoglio uomo da parte della moglie','Mens wallet gift from wife'])assert.equal(rules.productRecipientTarget({title}),'men');
 for(const title of ['Portafoglio unisex','Portafoglio per uomo e donna'])assert.equal(rules.recipientEligible({title},profile),true);
 assert.equal(rules.productRecipientTarget({title:'Romanzo avventura'}),'unknown');
 assert.equal(rules.recipientEligible({title:'Romanzo avventura'},profile),true);
 assert.equal(rules.recipientEligible({title:'Orologio da parete'},profile),true);
});
test('Raw Amazon normalization rejects description-only conflict and public adapter retains compatible evidence',()=>{
 const raw=features=>({searchResult:{items:[{asin:'B000000001',detailPageURL:'https://www.amazon.it/dp/B000000001',itemInfo:{title:{displayValue:'Portafoglio in pelle'},features:{displayValues:[features]}},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}}]}});
 assert.equal(normalizeCandidates(raw('Modello da uomo'),q,ctx.plan.profile).length,0);
 const good=normalizeCandidates(raw('Modello da donna'),q,ctx.plan.profile);assert.equal(good.length,1);assert.ok(publicCandidate(good[0],ctx));
 assert.equal(publicCandidate(product('Portafoglio in pelle','Modello da uomo'),ctx),null);
});
test('Fashion scarf excludes observed juggling products but accepts fashion and explicit activity intent',()=>{
 const p={title:'36 Pezzi Sciarpe da Giocoleria, Sciarpe per Bambini Asilo'};
 assert.equal(checkProductRequirements(p,{keywords:'sciarpa',originalKeyword:'sciarpa'}).passed,false);
 assert.equal(checkProductRequirements({title:'Sciarpa donna in seta'},{keywords:'sciarpa'}).passed,true);
 assert.equal(checkProductRequirements(p,{keywords:'sciarpe giocoleria'}).passed,true);
 assert.equal(checkProductRequirements({title:'Foulard colorati',features:'Per danza ritmica e giocoleria'},{keywords:'foulard'}).passed,false);
});
test('Books exclude school texts, blank recipe books and ebook bundles; intended textbooks remain possible',()=>{
 const reading={keywords:'libro cucina',originalKeyword:'libri cucina'};
 for(const p of [{title:'L’avventura più grande. Per la Scuola media. Con e-book. Con espansione online (Vol. 2)'},{title:'Alta professionalità in cucina. Per il triennio delle Scuole superiori'},{title:'Libro di ricette',features:'Quaderno con pagine bianche da compilare'},{title:'Kit utensili cucina con libro di ricette ebook'}])assert.equal(checkProductRequirements(p,reading).passed,false);
 assert.equal(checkProductRequirements({title:'Libro cucina con 100 ricette illustrate'},reading).passed,true);
 assert.equal(checkProductRequirements({title:'Libro scolastico per scuole superiori'},{keywords:'libro scolastico'}).passed,true);
});
test('Wallet and cardholder share one function across query families; scarf remains distinct',()=>{
 const qs=[...ctx.plan.queries,...ctx.plan.fallbackQueries],card=qs.find(x=>x.keywords==='portacarte'),scarf=qs.find(x=>/sciarp/.test(x.keywords));assert.ok(card);assert.ok(scarf);
 const candidates=[product('Portafoglio donna pelle','',1),{...product('Portacarte donna pelle','',2),researchQueryIds:[card.id]},{...product(scarf.keywords+' donna','',3),researchQueryIds:[scarf.id]}];
 const result=selectResearchIdeas(candidates,ctx.plan);assert.equal(result.products.length,2);assert.equal(result.products.filter(x=>/Portafoglio|Portacarte/.test(x.title)).length,1);
 assert.equal(selectResearchIdeas(candidates.slice(0,2),ctx.plan).products.length,1);
});
test('Two available selected interests are represented before filling a third idea',()=>{
 const c=publicPlan({profile:{...profile,interests:['culture','styleBeauty'],subinterests:['books','skincare']}});
 const qs=[...c.plan.queries,...c.plan.fallbackQueries];const book=qs.find(q=>q.area==='culture'),skin=qs.find(q=>q.area==='styleBeauty');assert.ok(book);assert.ok(skin);
 const ps=[book,skin].map((query,i)=>({...product(query.keywords,'',i+1),researchQueryIds:[query.id]}));
 const r=selectResearchIdeas(ps,c.plan);assert.equal(r.products.length,2);assert.deepEqual(r.missing,[]);
});
test('Night and day face creams are equivalent; a skincare kit overlaps its declared serum and cream',()=>{
 const mk=(id,keywords,family)=>({id,keywords,originalKeyword:keywords,area:'styleBeauty',subId:'skincare',family,associations:[{area:'styleBeauty',subId:'skincare',family}]});
 const qs=[mk('night','crema notte','crema_notte'),mk('retinol','crema retinolo','crema_retinolo'),mk('serum','siero','siero')];
 const plan={profile:{age:'adult',ageBand:'adult',effectiveMin:15,max:60,exclude:[]},interests:['styleBeauty'],queries:qs,fallbackQueries:[]};
 const ps=[{...product('Vichy Liftactiv H.A. Crema Anti-Rughe Rassodante Notte, 50 ml','',1),researchQueryIds:['night']},{...product('Crema Retinolo Anti-Età – Crema Viso Notte Idratante','',2),researchQueryIds:['retinol']},{...product('Kit Skincare Viso Siero e Crema Idratante','',3),researchQueryIds:['serum']}];
 assert.equal(selectResearchIdeas(ps,plan).products.length,1);
});
test('Live recovery cannot substitute commercial shopping bags, book-shaped vases or RPG manuals',()=>{
 assert.equal(checkProductRequirements({title:'1000 PZ BUSTE BIODEGRADABILI MANICO COMPOSTABILI MINI 23X40 SHOPPER'},{keywords:'shopper'}).passed,false);
 assert.equal(checkProductRequirements({title:'Shopper donna in cotone riutilizzabile'},{keywords:'shopper'}).passed,true);
 assert.equal(checkProductRequirements({title:'Vaso a forma di libro | Vaso a forma di libri impilati | Vasi e accessori per piante grasse, ufficio e regalo di Natale per gli amanti dei libri',features:'Cucina'},{keywords:'libri cucina'}).passed,false);
 assert.equal(checkProductRequirements({title:'Dragonlance: libro di avventure di Dungeons & Dragons'},{keywords:'libri avventura'}).passed,false);
 assert.equal(checkProductRequirements({title:'Goodman Games 5E RPG Compendium of Dungeon Crawls V.4 Libro GDR 7 Avventure'},{keywords:'libri avventura'}).passed,false);
 assert.equal(checkProductRequirements({title:'Dragonlance: romanzo di avventura'},{keywords:'libri avventura'}).passed,true);
});

test('English night cream overlaps the skincare kit, too',()=>{
 const query={id:'cream',keywords:'cream',associations:[{area:'styleBeauty',subId:'skincare',family:'cream'}]};
 const plan={profile:{age:'adult',ageBand:'adult',effectiveMin:15,max:60,exclude:[]},interests:['styleBeauty'],queries:[query],fallbackQueries:[]};
 const ps=['Eucerin Hyaluron Filler + Elasticity Night Cream 50ml','Kit Skincare Viso Siero e Cream'].map((title,i)=>({...product(title,'',i+1),researchQueryIds:['cream']}));
 assert.equal(selectResearchIdeas(ps,plan).products.length,1);
});
test('Equivalent puzzles and experiment kits cannot fill separate slots through different query families',()=>{
 for(const [noun,titles] of [['puzzle',['Puzzle Grandi da Pavimento','Puzzle Progressivo Animali','Puzzle Ocean XXL']],['esperimenti',['Kit di Chimica con 50 Esperimenti','60 Esperimenti Scientifici']]]){
  const queries=titles.map((_,i)=>({id:String(i),keywords:noun,associations:[{area:'culture',subId:'books',family:'family'+i}]}));
  const plan={profile:{age:'adult',ageBand:'adult',effectiveMin:15,max:60,exclude:[]},interests:['culture'],queries,fallbackQueries:[]};
  const ps=titles.map((title,i)=>({...product(title,'',i+1),researchQueryIds:[String(i)]}));
  assert.equal(selectResearchIdeas(ps,plan).products.length,1);
 }
});
test('A complete face kit also occupies the explicitly included eye-care function',()=>{
 const query={id:'cream',keywords:'crema',associations:[{area:'styleBeauty',subId:'skincare',family:'cream'}]};
 const plan={profile:{age:'adult',ageBand:'adult',effectiveMin:15,max:60,exclude:[]},interests:['styleBeauty'],queries:[query],fallbackQueries:[]};
 const ps=['Kit Skincare Viso Detergente Siero Crema Contorno Occhi','Clinique All About Eyes Crema Contorno Occhi'].map((title,i)=>({...product(title,'',i+1),researchQueryIds:['cream']}));
 assert.equal(selectResearchIdeas(ps,plan).products.length,1);
});
