// Engine v3: real candidates in, Claude's choice and explanations out, v1 as the safety net.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {database} from './d1-fixture.mjs';
import {recommendV3,describeProfile} from '../server/engine-v3.mjs';

const concepts=JSON.parse(fs.readFileSync('library/concepts.json','utf8')).filter(c=>c.status==='approved');
const profile={relation:'friend',occasion:'birthday',ageRange:'adult',recipientPreference:'women',interests:['culture','foodDrink'],subinterests:['books','coffeeTea'],tone:'sentimental',budget:30,minBudget:0,avoid:[]};
const amazon=(asin,title,price)=>({asin,id:asin,title,name:title,price,store:'Amazon',url:'https://www.amazon.it/dp/'+asin+'?tag=3gifts-21',directUrl:'https://www.amazon.it/dp/'+asin+'?tag=3gifts-21',why:'Testo del v1.'});
const v1Answer={method:'research-20261007',products:[amazon('B0000000A1','Romanzo storico',15)],candidates:[amazon('B0000000A1','Romanzo storico',15),amazon('B0000000A2','Set tè verde giapponese',24),amazon('B0000000A3','Macinacaffè manuale',20)]};
const request=body=>new Request('https://3gifts.it/api/v3/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify(body)});
function claude(answer,calls){return {beta:{messages:{create:async params=>{calls.push(params);if(answer instanceof Error)throw answer;return {stop_reason:'end_turn',usage:{},content:[{type:'text',text:JSON.stringify(answer)}]};}}}};}

async function setup(){
  const {binding}=database();const now=Date.now();
  const tea=concepts.find(c=>c.id.startsWith('c009'));
  await binding.prepare('INSERT INTO library_products (concept_id,asin,rank,title,price,detail_url,available,matched_at,checked_at) VALUES (?,?,1,?,?,?,1,?,?)').bind(tea.id,'B0000000L1','Cofanetto tè pregiati 40 bustine',22,'https://www.amazon.it/dp/B0000000L1?tag=3gifts-21',now,now).run();
  return {binding,now};
}

test('Claude chooses among real candidates, explains them, and the note reaches only Claude', async () => {
  const {binding,now}=await setup();const calls=[],v1Bodies=[];
  const runV1=async r=>{v1Bodies.push(await r.json());return Response.json(v1Answer);};
  const answer={scelte:[{id:'L1',perche:'Ama il tè: un cofanetto da scoprire tazza dopo tazza.'},{id:'A3',perche:'Inventato'},{id:'X9',perche:'id inesistente'},{id:'A3',perche:'doppione'}],domanda:''};
  // A3 is the coffee grinder; Claude's answer is respected as long as the id is real.
  const res=await recommendV3(request({profile,note:'beve solo tè, niente caffè',rejectedAsins:[]}),{DB:binding,ANTHROPIC_CLIENT:claude(answer,calls)},concepts,{runV1,labels:{culture:'Libri, fumetti e cultura',books:'Libri'},now});
  const body=await res.json();
  assert.equal(res.status,200);assert.equal(body.engine,'ai-v3');assert.equal(body.method,'research-20261007');
  assert.deepEqual(body.products.map(p=>p.asin),['B0000000L1','B0000000A3'],'unknown and repeated ids are ignored');
  assert.equal(body.products[0].why,'Ama il tè: un cofanetto da scoprire tazza dopo tazza.');
  assert.match(body.products[0].directUrl,/tag=3gifts-21/);assert.equal(body.partial,true);
  assert.ok(!('note' in v1Bodies[0]),'v1 never receives the note');
  const prompt=calls[0].messages[0].content;
  assert.match(prompt,/<nota>beve solo tè, niente caffè<\/nota>/);assert.match(prompt,/Interessi: Libri, fumetti e cultura/);
  assert.match(prompt,/"id":"L1".*Cofanetto tè pregiati/);assert.match(prompt,/"id":"A\d".*Macinacaffè manuale/);
  assert.equal(calls[0].model,'claude-opus-5-5');assert.equal(calls[0].fallbacks,'default');
});

test('without Claude the v1 answer already computed is served', async () => {
  const {binding,now}=await setup();
  for(const env of [{DB:binding},{DB:binding,ANTHROPIC_CLIENT:claude(new Error('timeout'),[])}]){
    const res=await recommendV3(request({profile,rejectedAsins:[]}),env,concepts,{runV1:async()=>Response.json(v1Answer),now});
    const body=await res.json();
    assert.equal(body.engine,'v1-fallback');assert.deepEqual(body.products.map(p=>p.asin),['B0000000A1']);
  }
  const foreign=await recommendV3(new Request('https://3gifts.it/api/v3/recommend',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),{DB:binding},concepts,{runV1:async()=>Response.json(v1Answer)});
  assert.equal(foreign.status,403);
});

test('the profile reads as plain Italian for Claude', () => {
  const text=describeProfile({...profile,avoid:['alcohol'],minBudget:10},{culture:'Libri, fumetti e cultura'});
  assert.match(text,/Rapporto: amico o amica/);assert.match(text,/Genere: donna/);assert.match(text,/Budget: da 10 fino a 30 euro/);assert.match(text,/Da evitare: alcolici/);
});

test('Claude tokens are counted per day and priced for the month', async () => {
  const {binding}=database();
  const client={beta:{messages:{create:async()=>({stop_reason:'end_turn',usage:{input_tokens:1000,output_tokens:500,cache_read_input_tokens:2000,cache_creation_input_tokens:0},content:[{type:'text',text:'{"scelte":[],"domanda":""}'}]})}}};
  const {claudeJson,claudeCosts}=await import('../server/claude.mjs');
  await claudeJson({DB:binding,ANTHROPIC_CLIENT:client},{system:'s',user:'u',schema:{type:'object'}});
  const costs=await claudeCosts({DB:binding});
  assert.equal(costs.calls,1);assert.equal(costs.estimatedUsd,0.01,'1000×4 + 500×20 + 2000×0.2 per million = 0.0144 $');
});
