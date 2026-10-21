import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {declaredAgeRange,checkProductRequirements} from '../server/research/product-requirements.mjs';
import {primaryProductType} from '../server/research/product-identity.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas} from '../server/research/research-engine.mjs';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';

test('Age evidence handles mixed units, ranges, age lists and contradictions without using dimensions',()=>{
 for(const [title,min,max] of [['Gioco bambini 18 Mesi - 5 Anni',18,60],['Libro dai 7 ai 12 anni',84,144],['Gioco ages 8+',96,null],['Gioco da 6 mesi a 2 anni',6,24],['Libro bambini 7 8 9 10 11 12 anni',84,144]]){
  const r=declaredAgeRange({title});assert.equal(r.minimumMonths,min,title);assert.equal(r.maximumMonths,max,title);
 }
 assert.equal(declaredAgeRange({title:'Gioco 18 x 5 cm per 2-4 giocatori'}).minimumMonths,null);
 assert.equal(declaredAgeRange({title:'Gioco 3-6 anni',features:'Età minima 8 anni'}).conflict,true);
 assert.equal(declaredAgeRange({title:'Gioco 3-12 anni',features:'Non adatto a bambini di età inferiore a 8 anni'}).minimumMonths,96);
});

test('Primary objects reject mentions, but actual smartphones, laptops and weights remain eligible',()=>{
 for(const [title,query,expected] of [
  ['Visore VR per smartphone con cuffie','smartphone',false],
  ['Tazza palestra con pesi e manubri','pesi palestra',false],
  ['SUPERDANT Insegne Metallo Palestra Cartello Arte Murale Sollevamento Pesi','pesi palestra',false],
  ['Biglietto compleanno per sollevamento pesi palestra','pesi palestra',false],
  ['20 grembiuli bambini gioco da afferrare','gioco da afferrare',false],
  ['Smartphone 5G 128GB','smartphone',true],
  ['HP Laptop 15-fd0016sl PC Portatile 15.6 FHD','computer portatile',true],
  ['Manubri pesi palestra 10 kg','pesi palestra',true],
  ['Sonaglio neonato gioco da afferrare','gioco da afferrare',true]
 ])assert.equal(checkProductRequirements({title},{keywords:query}).passed,expected,title);
 for(const title of ['Lettore CD con cuffie Bluetooth','Lettore CD portatile'])assert.equal(primaryProductType(title),'cd_player');
 for(const title of ['HP Laptop computer portatile','BMAX PC Portatile notebook'])assert.equal(primaryProductType(title),'laptop');
});

test('Decorative records and child-only devices are not adult listening/device gifts',()=>{
 assert.equal(checkProductRequirements({title:'Lotto dischi in vinile per artigianato e decorazione'},{keywords:'dischi vinile'}).passed,false);
 assert.equal(checkProductRequirements({title:'Album dischi in vinile jazz'},{keywords:'dischi vinile'}).passed,true);
 const ctx=publicPlan({profile:{ageRange:'adult',interests:['techGaming'],subinterests:['tech'],minBudget:15,budget:60}}),q=ctx.plan.queries.find(q=>q.keywords==='tablet');
 const p={asin:'B000000001',title:'Tablet Bambini 7 Pollici Android con Controllo Parentale',price:35,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]};
 assert.equal(publicCandidate(p,ctx),null);
 assert.ok(publicCandidate({...p,title:'Tablet Android 10 Pollici'},ctx));
});

test('Recipient negation and selected-variant restrictions override generic marketing',()=>{
 for(const [p,gender,eligible] of [
  [{title:'Portafoglio non adatto a donne'},'women',false],
  [{title:'Portafoglio non adatto a uomini'},'men',false],
  [{title:'Portafoglio unisex',features:'Questa variante è solo per uomo'},'women',false],
  [{title:'Portafoglio unisex',features:'Questa variante è solo per uomo'},'men',true],
  [{title:'Portafoglio uomo, non adatto a donne'},'men',true],
  [{title:'Portafoglio donna regalo da marito'},'women',true],
  [{title:'Portafoglio unisex'},'women',true],
  [{title:'Romanzo avventura'},'women',true]
 ])assert.equal(rules.recipientEligible(p,{recipientPreference:gender}),eligible,JSON.stringify(p));
});

const fixtures=JSON.parse(fs.readFileSync(new URL('./quality-observed-fixtures.json',import.meta.url)));
test('Observed Amazon failures: mixed ages, VR as phone, gym mug and aprons are rejected',()=>{
 const bad=new Set(['B073JZ5F8V','B0HLGTR6RK','B0HLLFYN4F','B0BNLF67GJ','B088PLZ95Q']);let checked=0;
 for(const row of fixtures){const ctx=publicPlan(row.payload),qs=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
  for(const p of row.products)if(bad.has(p.asin)){
   const candidate={...p,title:p.name,features:'',researchQueryIds:qs.filter(q=>q.keywords===p.query).map(q=>q.id)};
   assert.equal(publicCandidate(candidate,ctx),null,p.name);checked++;
  }
 }
 assert.ok(checked>=5);
});
test('Observed CD players and laptops cannot occupy two slots through different query families',()=>{
 for(const id of ['C03','A07']){
  const row=fixtures.find(r=>r.id===id),ctx=publicPlan(row.payload),qs=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
  const candidates=row.products.map(p=>({...p,title:p.name,features:'',researchQueryIds:qs.filter(q=>q.keywords===p.query).map(q=>q.id)})).map(p=>publicCandidate(p,ctx)).filter(Boolean);
  const selected=selectResearchIdeas(candidates,ctx.plan).products;
  const type=id==='C03'?'cd_player':'laptop';
  assert.ok(candidates.filter(p=>primaryProductType(p.title)===type).length>=2,'positive products retained');
  assert.equal(selected.filter(p=>primaryProductType(p.title)===type).length,1,id);
 }
});
