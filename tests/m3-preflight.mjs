import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {PUBLIC_RULES} from '../server/research/public-rules.mjs';
import {publicPlan} from '../server/research/public-adapter.mjs';
const bytes=fs.readFileSync(new URL('../docs/m3-manifest-120-frozen.json',import.meta.url));
const hash=crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(hash,'e174c07bccdad0920dbf4d673a79f05c06736615b9b69d20b6e68c6e93daf499');
const rows=JSON.parse(bytes).scenarios.map(s=>{
 const constraints={...s.request.constraints,...PUBLIC_RULES.analyseNote(s.request.profile.note)};
 const ctx=publicPlan({...s.request,constraints});
 return {id:s.id,blocked:ctx.blocked,queries:ctx.plan.queries.length,fallback:ctx.plan.fallbackQueries.length,exclusions:constraints.exclusions,unclear:constraints.constraintReport.unclear};
});
assert.equal(rows.length,120);assert.deepEqual(rows.filter(r=>r.blocked).map(r=>r.id),['T32','T36']);
const result={method:'Reparse unchanged frozen inputs; no Amazon calls or product comparison',manifestSha256:hash,total:120,planned:118,blocked:2,rows};
fs.writeFileSync(new URL('../docs/m3-block2-preflight.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({total:120,planned:118,blocked:['T32','T36']}));
