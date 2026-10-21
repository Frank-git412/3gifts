import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan} from '../server/research/public-adapter.mjs';
import {contextualizeQueries,giftContext} from '../server/research/gift-context.mjs';
import {PILOT_DICTIONARY_RULES} from '../server/research/pilot-dictionary.mjs';
const profile={ageRange:'adult',minBudget:0,budget:100,interests:['culture'],subinterests:['books'],relation:'friend',tone:'funny'};
for(const note of ['Niente romanzi horror.','No horror novels.','Niente retinolo.','Without retinol.','Non conosco il suo tipo di pelle.',"I don't know their skin type."])test('Complete clause: '+note,()=>{
 const a=rules.analyseNote(note);assert.equal(a.needsClarification,false);
 assert.equal(a.exclusions.includes('books'),false);assert.equal(a.signals.length,0);
 if(/horror/.test(note))assert.deepEqual(a.exclusions,['horror']);
 if(/retinol/.test(note))assert.deepEqual(a.exclusions,['retinol']);
 assert.equal(publicPlan({profile,constraints:a}).blocked,false);
});
for(const note of ['Hub USB-C con HDMI per il suo computer, modello non indicato.','Voglio cuffie wireless ma niente Bluetooth.','Niente retinolo e acidi.','Niente romanzi horror e violenti.','Non conosco il suo tipo di pelle. Niente acidi.'])test('Unresolved restriction remains blocked: '+note,()=>assert.equal(rules.analyseNote(note).needsClarification,true));
test('Horror is excluded without excluding all novels',()=>{
 const a=rules.analyseNote('Niente romanzi horror.');
 assert.equal(rules.violatesExclusions({title:'Romanzo horror',tags:['culture','books']},{},a),true);
 assert.equal(rules.violatesExclusions({title:'Romanzo di amicizia',tags:['culture','books']},{},a),false);
 const ctx=publicPlan({profile,constraints:a});assert.ok(ctx.plan.queries.length);assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].every(q=>!/horror/.test(q.keywords)));
});
test('Retinol absence requires listing evidence, including conflict checks',()=>{
 const a=rules.analyseNote('Niente retinolo.');
 for(const title of ['Crema viso','Crema con retinolo','Retinol-free cream with retinol','Cream not without retinol','Crema non senza retinolo'])assert.equal(rules.violatesExclusions({title,tags:['styleBeauty','skincare']},{},a),true,title);
 for(const title of ['Crema senza retinolo','Retinol-free cream'])assert.equal(rules.violatesExclusions({title,tags:['styleBeauty','skincare']},{},a),false,title);
 const ctx=publicPlan({profile:{...profile,interests:['styleBeauty'],subinterests:['skincare']},constraints:a});assert.equal(ctx.blocked,false);assert.ok(ctx.plan.queries.length);
});
for(const rule of PILOT_DICTIONARY_RULES.filter(r=>r.signal!=='occasion'))test('Concrete query limited to qualified family: '+rule.id,()=>{
 const q={id:'q',keywords:'base',area:rule.area,associations:[{area:rule.area,subId:rule.subId,family:rule.families[0]}]};
 const ctx=giftContext({relation:rule.signal==='relation'?rule.values[0]:undefined});
 const out=contextualizeQueries([q],ctx,{effect:rule.signal==='effect'?rule.values[0]:'any'});
 assert.equal(out[0].contextRule,rule.id);assert.ok(out[0].searchKeywords.includes(rule.query));assert.equal(out[1],q);
 const wrong={...q,associations:[{area:rule.area,subId:rule.subId,family:'unrelated'}]};assert.ok(contextualizeQueries([wrong],ctx,{effect:'useful'}).every(x=>!x.contextRule));
});
test('Public quotas, dual interests, compatibility and event precedence',()=>{
 const ctx=publicPlan({profile:{...profile,interests:['culture','techGaming'],subinterests:['books','tech']}});
 assert.equal(ctx.plan.queries.length,6);assert.ok(ctx.plan.fallbackQueries.length<=6);assert.equal(new Set(ctx.plan.queries.map(q=>q.area)).size,2);
 assert.ok(ctx.plan.queries.some(q=>q.contextRule==='books-funny-content'));
 assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].every(q=>!q.associations.some(a=>['ricarica','audio','collegamenti'].includes(a.family))));
 const event=publicPlan({profile:{...profile,occasion:'anniversary'}});
 // M5: the event now owns a qualified search before soft effect preferences.
 assert.equal(event.plan.queries[0].contextRule,'books-anniversary');
 assert.equal(event.plan.queries[0].eventTargeted,true);
 assert.ok(event.plan.queries.findIndex(q=>q.contextRule==='books-funny-content')>0);
});
