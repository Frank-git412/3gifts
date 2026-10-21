import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPlan,publicCandidate,sufficientIdeas,needsFamilyExploration,nextResearchQuery} from '../server/research/public-adapter.mjs';
import {PUBLIC_RULES as R} from '../server/research/public-rules.mjs';
import {selectResearchIdeas} from '../server/research/research-engine.mjs';
import {prioritizeIntentQueries} from '../server/research/intent-search.mjs';
const base={ageRange:'adult',relation:'friend',occasion:'anniversary',interests:['culture'],subinterests:['books'],minBudget:15,budget:60};
const plan=(p=base,note='')=>publicPlan({profile:p,constraints:R.analyseNote(note)});
const all=c=>[...c.plan.queries,...c.plan.fallbackQueries];

for(const relation of ['friend','partner','family'])test('Anniversary explores specific technology uses before accepting generic cards: '+relation,()=>{
 const c=plan({...base,relation,interests:['techGaming'],subinterests:['tech']}),qs=all(c);
 assert.equal(qs.filter(q=>q.eventTargeted).length,1);
 assert.deepEqual(qs.filter(q=>q.qualityProbe).map(q=>q.family),['lettura_digitale','cinema']);
 for(const family of ['lettura_digitale','cinema'])assert.ok(qs.findIndex(q=>q.family===family)<qs.findIndex(q=>q.family==='tablet'));
 const selected={products:[1,2,3].map(()=>({areas:['techGaming'],tags:['tech']})),missing:[]};
 assert.equal(sufficientIdeas(selected,c.plan,qs.filter(q=>q.qualityProbe)),false);
 assert.equal(sufficientIdeas(selected,c.plan,[]),true);
 assert.ok(qs.some(q=>q.family==='foto_ricordi'));assert.ok(qs.some(q=>q.family==='tablet'));assert.ok(qs.length<=12);
});
test('Listening alternatives require known host compatibility and respect a declared interest',()=>{
 const p={...base,interests:['techGaming'],subinterests:['tech']};
 assert.ok(!all(plan(p,'Ama la musica.')).some(q=>q.family==='audio'));
 const c=plan(p,'Ama la musica. Il dispositivo supporta Bluetooth.'),qs=all(c);
 assert.equal(qs.find(q=>q.qualityProbe).family,'audio');
 const q=qs.find(q=>q.qualityProbe&&q.family==='audio');
 assert.equal(q.searchKeywords,q.keywords);assert.ok(c.plan.candidateQueries.some(base=>base.id===q.id.replace(/-intent$/,'')));
 assert.ok(qs.length<=12);
});
test('Anniversary probe terms do not invent occasion or mood evidence',()=>{
 const c=plan({...base,interests:['techGaming'],subinterests:['tech']}),q=all(c).find(q=>q.qualityProbe&&q.family==='cinema');
 const p=publicCandidate({asin:'B000000001',title:'Mini proiettore',features:'Portatile',price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]},c);
 assert.ok(p);assert.equal(p.eventEvidence.status,'absent');assert.equal(p.occasionUse,null);assert.equal(p.contextEvidence.effect.status,'absent');
});

test('Anniversary does not place a photography course before general reading fallbacks',()=>{
 const c=plan(),qs=all(c),at=f=>qs.findIndex(q=>q.family===f&&!q.eventTargeted);
 assert.ok(at('narrativa')>=0&&at('narrativa')<at('libri_fotografia'));
 assert.ok(at('segnalibri')<at('libri_fotografia'));
 assert.ok(qs.length<=12);assert.equal(qs.filter(q=>q.eventTargeted).length,2);
});
for(const note of ['Ama la fotografia.','She enjoys photography.','Vorrei un libro di fotografia.'])test('Declared photographic interest preserves targeted retrieval: '+note,()=>{
 const c=plan(base,note),q=all(c).find(q=>!q.contextual);
 assert.equal(q.family,'libri_fotografia');
});
test('Negated photographic interest does not become a retrieval preference',()=>{
 const c=plan(base,'Non ama la fotografia.');assert.notEqual(all(c).find(q=>!q.contextual).family,'libri_fotografia');
});
for(const ageRange of ['youngAdult','adult','mature'])test('Leisure device order follows purpose rather than an age ban: '+ageRange,()=>{
 const c=plan({...base,ageRange,interests:['techGaming'],subinterests:['tech'],occasion:'birthday'},'Cerco qualcosa di rilassante.'),qs=all(c);
 assert.ok(qs.findIndex(q=>q.family==='lettura_digitale')<qs.findIndex(q=>q.family==='telefonia'));
 assert.ok(qs.findIndex(q=>q.family==='cinema')<qs.findIndex(q=>q.family==='postazione'));
 assert.equal(qs.filter(q=>q.qualityProbe).length,2);
 assert.equal(qs.filter(q=>(q.searchKeywords||q.keywords)==='lettore ebook').length,1);
 const q=qs.find(q=>q.family==='telefonia');
 assert.ok(publicCandidate({asin:'B000000001',title:'Cellulare semplice a conchiglia',features:'Telefono per chiamare e inviare SMS',price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]},c));
});
test('Three preliminary cards do not skip a remaining concise intent probe',()=>{
 const c=plan({...base,occasion:'birthday'},'Cerco qualcosa di rilassante.');
 const selected={products:[1,2,3].map(()=>({areas:['culture'],tags:['books']})),missing:[]};
 assert.equal(sufficientIdeas(selected,c.plan,all(c).filter(q=>q.qualityProbe)),false);
 assert.equal(sufficientIdeas(selected,c.plan,[]),true);
});
test('Intent probe search words cannot manufacture mood evidence',()=>{
 const c=plan({...base,occasion:'birthday'},'Cerco qualcosa di rilassante.'),q=all(c).find(q=>q.qualityProbe&&q.family==='illuminazione_lettura');
 const p=publicCandidate({asin:'B000000001',title:'Lampada lettura',features:'Lampada da tavolo',price:25,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]},c);
 assert.ok(p);assert.equal(p.contextEvidence.effect.status,'absent');
});
test('Specific content obligations still remove unrelated intent probes',()=>{
 const c=plan({...base,occasion:'birthday'},'Cerco un romanzo sulla natura. Cerco qualcosa di rilassante.');
 assert.ok(c.analysis.specificIntents.length);
 assert.ok(all(c).every(q=>q.family==='narrativa'&&q.lexicalTermIds?.includes('m3:K003')));
});
test('Photographic books stay available but equal-scored alternatives gain variety',()=>{
 const c=plan(),qs=all(c),candidates=[
  ['B000000001','Libro fotografia creativa','libri_fotografia'],
  ['B000000002','Libro fotografia digitale','libri_fotografia'],
  ['B000000003','Libro fotografia ritratti','libri_fotografia'],
  ['B000000004','Romanzo di avventura','narrativa'],
  ['B000000005','Segnalibro metallico','segnalibri']
 ].map(([asin,title,family])=>publicCandidate({asin,title,features:'',price:20,url:'https://www.amazon.it/dp/'+asin,productGroup:family==='segnalibri'?'':'Book',bookMetadata:{authors:['Autore di prova']},researchQueryIds:qs.filter(q=>q.family===family).map(q=>q.id)},c)).filter(Boolean);
 assert.equal(candidates.length,5);
 const result=selectResearchIdeas(candidates,c.plan);
 assert.equal(result.products.length,3);
 assert.equal(result.products.filter(p=>/fotografia/.test(p.title)).length,1);
 const onlyPhotos=selectResearchIdeas(candidates.slice(0,3),c.plan);
 assert.equal(onlyPhotos.products.length,3); // soft variety, no ban
});
test('Reordering preserves every qualified query and cross-scope association',()=>{
 const c=plan({...base,interests:['culture','techGaming'],subinterests:['books','tech']},'Cerco qualcosa di rilassante.');
 const input=c.plan.candidateQueries,copy=JSON.stringify(input);
 const output=prioritizeIntentQueries(input,{profile:c.profile,analysis:c.analysis,gift:c.gift,effect:c.plan.effect});
 assert.deepEqual(output.map(q=>q.id).sort(),input.map(q=>q.id).sort());assert.equal(JSON.stringify(input),copy);
 assert.ok(all(c).some(q=>q.area==='culture'));assert.ok(all(c).some(q=>q.area==='techGaming'));
});
test('Three illustrated books allow only two bounded searches for a different family',()=>{
 const c=plan(),qs=all(c),selected={products:[1,2,3].map(()=>({areas:['culture'],tags:['books'],conceptFamily:'culture:illustrati'})),missing:[]};
 const pending=qs.filter(q=>!q.eventTargeted);
 assert.equal(needsFamilyExploration(selected,c.plan,pending),true);
 assert.equal(sufficientIdeas(selected,c.plan,pending),false);
 assert.equal(sufficientIdeas(selected,c.plan,pending,{diversitySearches:1}),false);
 assert.equal(sufficientIdeas(selected,c.plan,pending,{diversitySearches:2}),true);
 const choice=nextResearchQuery(pending,c.plan,selected,[],{diversify:true});
 assert.notEqual(choice.query.family,'illustrati');assert.equal(choice.reason,'explore_family_variety');
 assert.equal(needsFamilyExploration(selected,c.plan,pending.filter(q=>q.family==='illustrati')),false);
 selected.products[2].conceptFamily='culture:segnalibri';
 assert.equal(needsFamilyExploration(selected,c.plan,pending),false);
});
