import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {PILOT_EXPANSION_RULES,PILOT_CONTEXT_DECISIONS} from '../server/research/pilot-expansion.mjs';
import {PILOT_DICTIONARY_RULES,pilotDictionaryInventory} from '../server/research/pilot-dictionary.mjs';
import {PUBLIC_RULES} from '../server/research/public-rules.mjs';
import {publicPlan} from '../server/research/public-adapter.mjs';
const bytes=fs.readFileSync(new URL('../docs/m3-manifest-120-frozen.json',import.meta.url));
const hash=crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash,'e174c07bccdad0920dbf4d673a79f05c06736615b9b69d20b6e68c6e93daf499');
const rows=JSON.parse(bytes).scenarios.map(s=>{
 const constraints={...s.request.constraints,...PUBLIC_RULES.analyseNote(s.request.profile.note)};
 const ctx=publicPlan({...s.request,constraints});
 assert.ok(ctx.plan.queries.length<=6&&ctx.plan.queries.length+ctx.plan.fallbackQueries.length<=12);
 return {id:s.id,blocked:ctx.blocked,queries:ctx.plan.queries.length,contextRules:ctx.plan.queries.map(q=>q.contextRule).filter(Boolean)};
});
assert.deepEqual(rows.filter(r=>r.blocked).map(r=>r.id),['T32','T36']);
const inventory=pilotDictionaryInventory();
const contexts=[['relation','family'],['effect','surprising'],['effect','relax'],...['birthday','christmas','thanks','graduation','newhome','event'].map(v=>['occasion',v])];
const matrix=['culture','techGaming','styleBeauty'].flatMap(area=>contexts.map(([signal,value])=>{
 const rules=PILOT_EXPANSION_RULES.filter(r=>r.area===area&&r.signal===signal&&r.values.includes(value));
 const decision=PILOT_CONTEXT_DECISIONS.find(d=>d.area===area&&d.occasion===value);
 assert.ok(rules.length||decision);
 return {area,signal,value,rules:rules.map(r=>r.id),status:rules.length?'conditional_rule':'no_automatic_bonus',reason:decision?.reason||null};
}));
const result={date:'2026-10-09',revision:'m3-block3',limits:'Editorial hypotheses with synthetic tests; no Amazon product or demand verification',
 counts:{newRules:PILOT_EXPANSION_RULES.length,totalDictionaryRules:PILOT_DICTIONARY_RULES.length,relationEffectRules:PILOT_DICTIONARY_RULES.filter(r=>r.signal!=='occasion').length,ordinaryOccasionRules:PILOT_DICTIONARY_RULES.filter(r=>r.signal==='occasion').length,families:inventory.length,familiesWithRelationEffect:inventory.filter(r=>r.relations.length||r.effects.length).length,familiesWithAnyContext:inventory.filter(r=>r.rules.length).length},
 matrix,inventory,preflight:{manifestSha256:hash,total:rows.length,planned:rows.filter(r=>!r.blocked).length,blocked:rows.filter(r=>r.blocked).map(r=>r.id),rows},
 propertySources:[
 {rules:['tech-surprise-colour'],url:'https://ereader.kobo.com/it-it/collections/colour-ereaders/products/kobo-clara-colour',observed:'2026-10-09',scope:'E Ink colour display only; surprise is an editorial hypothesis, not a manufacturer claim'},
 {rules:['tech-relax-reading'],url:'https://help.kobo.com/hc/it/articles/360017481174-Regola-ComfortLight-PRO-sul-tuo-eReader-Kobo',observed:'2026-10-09',scope:'Adjustable light colour on listed models only; no sleep or health claim copied'},
 {rules:['skin-surprise-transform'],url:'https://www.cliniqueitaly.it/product/take-the-day-off-cleansing-balm',observed:'2026-10-09',scope:'Solid balm to oil texture only; no clinical or individual tolerance claim copied'}]
};
fs.writeFileSync(new URL('../docs/m3-block3-audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({counts:result.counts,matrixDecisions:matrix.length,planned:result.preflight.planned,blocked:result.preflight.blocked}));
