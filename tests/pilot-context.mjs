import test from 'node:test';import assert from 'node:assert/strict';
import {PILOT_EVENT_RULES,pilotEventEvidence} from '../server/research/pilot-context.mjs';
import {giftContext,contextPreference} from '../server/research/gift-context.mjs';
for(const r of PILOT_EVENT_RULES)test(r.id+' requires supported use and removes it in personal mode',()=>{
 const context=giftContext({ageRange:'adult',occasion:r.event,interests:[r.area]});
 const p={title:r.positive,features:'',tags:[r.area,r.sub]};
 assert.equal(pilotEventEvidence(p,context).rule,r.id);
 assert.equal(contextPreference(p,context,'any').eventPriorityScore,1);
 assert.equal(contextPreference({...p,title:r.negative},context,'any').eventPriorityScore,0);
 assert.equal(contextPreference(p,giftContext({occasion:r.event,interests:[r.area],searchPriority:'personal'}),'any').eventPriorityScore,0);
});
test('Generic house/relax/romantic signals cannot win an event tier',()=>{
 for(const [occasion,title,area]of [['wedding','Lampada da scrivania per casa','techGaming'],['newbaby','Kit relax benessere','styleBeauty'],['anniversary','Romanzo romantico','culture']])assert.equal(contextPreference({title,features:''},giftContext({occasion,ageRange:'adult',interests:[area]}),'any').eventPriorityScore,0);
});
