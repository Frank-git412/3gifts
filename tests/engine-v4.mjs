// Engine v4 "ideas first": Claude plans searches, the site searches Amazon, Claude picks only real listings.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {database} from './d1-fixture.mjs';
import {recommendV4} from '../server/engine-v4.mjs';

const concepts=JSON.parse(fs.readFileSync('library/concepts.json','utf8')).filter(c=>c.status==='approved');
const profile={relation:'friend',occasion:'birthday',ageRange:'adult',recipientPreference:'men',interests:['sportFitness'],subinterests:['fitness'],interestLevel:'start',tone:'useful',budget:40,minBudget:0,avoid:[]};
const item=(asin,title,price)=>({asin,detailPageURL:`https://www.amazon.it/dp/${asin}?tag=3gifts-21`,itemInfo:{title:{displayValue:title}},offersV2:{listings:[{isBuyBoxWinner:true,price:{money:{amount:price,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}});
const env=(db,client)=>({DB:db,ANTHROPIC_CLIENT:client,AMAZON_CREATORS_CLIENT_ID:'v4-'+Math.random(),AMAZON_CREATORS_CLIENT_SECRET:'s',AMAZON_CREATORS_VERSION:'3.2',AMAZON_PARTNER_TAG:'3gifts-21'});
const request=body=>new Request('https://3gifts.it/api/v4/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify(body)});
const searches=[];
function amazon(){globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/auth/o2/token'))return new Response(JSON.stringify({access_token:'t',expires_in:3600}),{status:200});
  const body=JSON.parse(init.body);searches.push(body.keywords);
  const results={'fascia braccio porta telefono corsa':[item('B0000RUN01','Fascia da braccio porta telefono per corsa',19),item('B0000KID01','Fascia porta telefono per bambini',12)],
    'calze tecniche running':[item('B0000SOX01','Calze tecniche running antivescica uomo',16),item('B0000SOX02','Calze running donna',15)]}[body.keywords]||[];
  return new Response(JSON.stringify({searchResult:{items:results}}),{status:200});
};}
function claude(calls,{plan,pick,fail}){return {beta:{messages:{create:async p=>{calls.push(p);const planning=p.system[0].text.includes('Proponi da 3');
  if(fail&&planning)throw Error('timeout');
  return {stop_reason:'end_turn',usage:{},content:[{type:'text',text:JSON.stringify(planning?plan:pick)}]};}}}};}

test('ideas become searches, Claude picks only real listings, kids and wrong-gender items never reach it', async () => {
  amazon();const {binding}=database();const calls=[];
  const plan={idee:[{posizione:'sicura',archetipo:'kit d\'inizio',idea:'Fascia porta telefono per correre',ricerca:'fascia braccio porta telefono corsa'},{posizione:'colpisce',archetipo:'strumento chiave',idea:'Calze tecniche',ricerca:'calze tecniche running'}]};
  const pick={scelte:[{id:'I1P1',posizione:'sicura',perche:'Ha appena iniziato a correre: tiene il telefono fermo.',biglietto:'Per i tuoi primi chilometri.'},{id:'I9P9',posizione:'colpisce',perche:'inventato',biglietto:'x'},{id:'I2P1',posizione:'colpisce',perche:'Niente vesciche nelle prime uscite.',biglietto:'Corri leggero.'}],domanda:''};
  const res=await recommendV4(request({profile,note:'ha appena iniziato a correre',rejectedAsins:[]}),env(binding,claude(calls,{plan,pick})),concepts,{now:Date.now()});
  const body=await res.json();
  assert.equal(body.engine,'ai-v4');assert.equal(body.method,'research-20261007');
  assert.deepEqual(body.products.map(p=>p.asin),['B0000RUN01','B0000SOX01'],'an invented id is ignored');
  assert.equal(body.products[0].slotLabel,'La scelta sicura');assert.equal(body.products[0].cardMessage,'Per i tuoi primi chilometri.');
  assert.match(body.products[0].directUrl,/tag=3gifts-21/);
  assert.deepEqual(searches.slice(-2),['fascia braccio porta telefono corsa','calze tecniche running']);
  const pickPrompt=calls[1].messages[0].content;
  assert.match(pickPrompt,/Fascia da braccio porta telefono per corsa/);
  assert.doesNotMatch(pickPrompt,/per bambini/,'children\'s listing filtered before Claude sees it');
  assert.doesNotMatch(pickPrompt,/Calze running donna/,'women\'s listing filtered for a man');
  assert.match(calls[0].messages[0].content,/<nota>ha appena iniziato a correre<\/nota>/);
  assert.match(calls[0].messages[0].content,/Con queste passioni: vuole iniziare/);
});

test('if planning fails the v1 answer is served, without the note', async () => {
  amazon();const {binding}=database();const v1Bodies=[];
  const runV1=async r=>{v1Bodies.push(await r.json());return Response.json({method:'research-20261007',products:[{asin:'B0000000V1',title:'Prodotto v1',price:20}]});};
  const res=await recommendV4(request({profile:{...profile,relation:'acquaintance'},note:'segreto',rejectedAsins:[]}),env(binding,claude([],{fail:true})),concepts,{runV1,now:Date.now()});
  const body=await res.json();
  assert.equal(body.engine,'v1-fallback');assert.equal(body.products[0].asin,'B0000000V1');
  assert.ok(!('note' in v1Bodies[0]));assert.equal(v1Bodies[0].profile.relation,'colleague');
});

test('a faster planning model is used only on the evaluation channel; picking stays on Opus', async () => {
  const plan={idee:[{posizione:'sicura',archetipo:'kit d\'inizio',idea:'Fascia',ricerca:'fascia braccio porta telefono corsa'}]};
  const pick={scelte:[{id:'I1P1',posizione:'sicura',perche:'ok',biglietto:'ok'}],domanda:''};
  const run=async headers=>{amazon();const {binding}=database();const calls=[];
    const req=new Request('https://3gifts.it/api/v4/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json',...headers},body:JSON.stringify({profile,planModel:'claude-haiku-5-5',rejectedAsins:[]})});
    const body=await (await recommendV4(req,{...env(binding,claude(calls,{plan,pick})),EVAL_TOKEN:'segreto'},concepts,{now:Date.now()})).json();
    return {calls,body};};
  const visitor=await run({});
  assert.equal(visitor.calls[0].model,'claude-opus-5-5');assert.ok(!('planModel' in visitor.body.timing));
  const wrong=await run({'X-Eval-Token':'no'});assert.equal(wrong.calls[0].model,'claude-opus-5-5');
  const evaluation=await run({'X-Eval-Token':'segreto'});
  assert.equal(evaluation.calls[0].model,'claude-haiku-5-5');assert.ok(!('fallbacks' in evaluation.calls[0]),'Haiku has no server-side fallback');
  assert.equal(evaluation.calls[1].model,'claude-opus-5-5');assert.equal(evaluation.body.timing.planModel,'claude-haiku-5-5');
});
