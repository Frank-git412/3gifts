// Evaluation channel: hidden without the token, judges each pair twice with the order swapped.
import assert from 'node:assert/strict';
import test from 'node:test';
import {database} from './d1-fixture.mjs';
import {evalJudge} from '../server/eval.mjs';

const req=(token,body)=>new Request('https://3gifts.it/api/eval/judge',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'X-Eval-Token':token}:{})},body:JSON.stringify(body)});
const pair={id:'p01',label:'Mamma, 58 anni',A:[{title:'Kit erbe aromatiche',price:14}],B:[{title:'Macchina fotografica per bambini',price:27}]};

test('without the right token the channel does not exist', async () => {
  for(const r of [req(null,{pairs:[pair]}),req('wrong',{pairs:[pair]})])assert.equal((await evalJudge(r,{EVAL_TOKEN:'secret'})).status,404);
  assert.equal((await evalJudge(req('secret',{pairs:[pair]}),{})).status,404,'no token configured, no channel');
});

test('a verdict counts only when it survives swapping A and B', async () => {
  const {binding}=database();const seen=[];
  // A judge biased to the first position always answers "A": swapping exposes it, the verdict becomes a tie.
  const biased={beta:{messages:{create:async p=>{seen.push(p.messages[0].content);return {stop_reason:'end_turn',usage:{},content:[{type:'text',text:'{"verdetto":"A","motivo":"prima"}'}]};}}}};
  let body=await (await evalJudge(req('secret',{pairs:[pair]}),{DB:binding,EVAL_TOKEN:'secret',ANTHROPIC_CLIENT:biased})).json();
  assert.equal(body.results[0].verdict,'pari');assert.equal(body.results[0].consistent,false);
  assert.ok(seen.some(t=>t.indexOf('Kit erbe')<t.indexOf('Macchina'))&&seen.some(t=>t.indexOf('Macchina')<t.indexOf('Kit erbe')),'both orders were shown');
  // A judge that prefers the herb kit wherever it is stays consistent.
  const fair={beta:{messages:{create:async p=>{const t=p.messages[0].content;const v=t.indexOf('Kit erbe')<t.indexOf('Macchina')?'A':'B';return {stop_reason:'end_turn',usage:{},content:[{type:'text',text:JSON.stringify({verdetto:v,motivo:'adatto'})}]};}}}};
  body=await (await evalJudge(req('secret',{pairs:[pair]}),{DB:binding,EVAL_TOKEN:'secret',ANTHROPIC_CLIENT:fair})).json();
  assert.equal(body.results[0].verdict,'A');assert.equal(body.results[0].consistent,true);
});
