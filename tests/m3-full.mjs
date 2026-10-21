import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPANDED_TERMS,EXPANDED_SOURCES} from '../server/research/expanded-data.mjs';
import {EXPANDED_RULES,expandedContextEvidence,fullDictionaryInventory} from '../server/research/expanded-context.mjs';
import {PUBLIC_RULES as R} from '../server/research/public-rules.mjs';
import {RESEARCH_CATALOG as C} from '../server/research/catalog-data.mjs';
import {matchResearchProduct} from '../server/research/research-engine.mjs';
import {checkProductRequirements} from '../server/research/product-requirements.mjs';
import {contextPreference,contextualizeQueries} from '../server/research/gift-context.mjs';
const fixture=x=>typeof x==='string'?{title:x}:({...x,features:Array.isArray(x.features)?x.features.join('. '):x.features||''});
const negatives=x=>!x?[]:typeof x==='string'||x.title?[fixture(x)]:Array.isArray(x)?x.flatMap(negatives):Object.values(x).flatMap(negatives);
test('complete full catalog inventory and twenty explicit decisions per scoped family',()=>{
 const rows=fullDictionaryInventory();assert.equal(rows.length,1526);assert.equal(rows.flatMap(r=>r.contextDecisions).length,30520);
 assert.equal(new Set(rows.map(r=>r.area)).size,28);assert.equal(new Set(rows.map(r=>r.area+':'+r.subId)).size,88);
 assert.equal(rows.flatMap(r=>r.keywordIds).length,2591);assert.equal(EXPANDED_TERMS.length,2238);
 for(const r of rows)for(const d of r.contextDecisions)assert.ok(d.reason);
});
for(const t of EXPANDED_TERMS)test('expanded IT/EN '+t.id,()=>{
 const k=C.associations.find(k=>k.id===t.id),q={...k,keywords:k.queryKeywords,originalKeyword:k.keyword,recipientContext:{connections:['usb_c','usb_a','bluetooth','jack_35']}};
 for(const en of [t.en,...t.aliasesEN]){
  assert.equal(R.dictionaryTranslateTerms(en,k),R.dictionaryTranslateTerms(t.it,k));
  assert.equal(matchResearchProduct({title:en},q),matchResearchProduct({title:t.it},q));
  assert.deepEqual(checkProductRequirements({title:en},q),checkProductRequirements({title:t.it},q));
  for(const prefix of ['','Non voglio ']){
   const a=R.analyseNote(prefix+t.it,k),b=R.analyseNote(prefix+en,k);
   for(const key of ['signals','requiredSignals','specificIntents','exclusions','requiredTypes','needsClarification'])assert.deepEqual(a[key],b[key],prefix+en+' '+key);
  }
 }
});
for(const [it,en,wrong] of [['torcia ricaricabile','rechargeable torch','torcia a batteria'],['libro lavabile in lavatrice','machine washable book','libro lavabile a mano'],['tavolo pieghevole','folding table','tavolo fisso'],['supporto regolabile','adjustable stand','supporto fisso'],['borraccia acciaio inox','stainless steel bottle','borraccia plastica']])test('explicit attribute '+it,()=>{
 const q={area:'homeGarden',subId:'home',keywords:it};
 assert.ok(checkProductRequirements({title:it},q).passed);
 assert.ok(!checkProductRequirements({title:wrong},q).passed);
 for(const prefix of ['Non ','Not ','Optional '])assert.ok(!checkProductRequirements({title:prefix+it},q).passed);
});
for(const r of EXPANDED_RULES)test('expanded evidence '+r.id,()=>{
 const p={tags:[r.area,r.subId],conceptFamily:r.area+':'+r.families[0]},ctx={[r.signal]:r.values[0]},effect=r.signal==='effect'?r.values[0]:'any';
 const state=x=>expandedContextEvidence({...p,...x},ctx,effect)[r.signal].status;
 assert.ok(r.sourceIds.every(id=>EXPANDED_SOURCES.some(s=>s.id===id)));
 for(const family of r.families)assert.ok(C.associations.some(k=>k.area===r.area&&k.subId===r.subId&&k.family===family),family);
 for(const lang of ['it','en']){
  const f=fixture(r.examples[lang]);assert.equal(state(f),'supported',lang);
  assert.notEqual(state({...f,conceptFamily:r.area+':unrelated'}),'supported');
  assert.notEqual(state({...f,features:'Not '+f.title+' '+(f.features||'')}),'supported','contradictory '+lang);
  assert.notEqual(state({...f,title:'Custodia per '+f.title}),'supported','accessory '+lang);
  for(const prefix of ['Non ','Not ','Optional ','Variante '])assert.notEqual(state({title:prefix+f.title,features:prefix+f.features}),'supported',prefix+lang);
  assert.notEqual(state({title:'Accessorio',query:f.title,features:''}),'supported');
  for(const pattern of r.properties){const rx=new RegExp(pattern.source,'gi');assert.notEqual(state({title:f.title.replace(rx,''),features:f.features?.replace(rx,'')}),'supported','missing '+pattern.source);}
 }
 for(const f of [...negatives(r.examples.negative),...negatives(r.examples.negativeEN)])assert.notEqual(state(f),'supported',JSON.stringify(f));
 const k=C.associations.find(k=>k.area===r.area&&k.subId===r.subId&&r.families.includes(k.family));
 assert.ok(contextualizeQueries([{...k,keywords:k.queryKeywords}],ctx,{effect}).some(q=>q.contextRule===r.id));
 assert.equal(contextPreference({...p,title:'Regalo elegante romantico per la famiglia',features:''},{relation:'family',occasion:'birthday'},'elegant').score,0);
});
test('notebook is scoped, never conflates computer with paper',()=>{
 assert.equal(R.dictionaryTranslateTerms('notebook',{area:'techGaming',subId:'tech'}),'notebook');
 assert.equal(R.dictionaryTranslateTerms('notebook',{area:'newsBusiness',subId:'writing'}),'taccuino');
});
