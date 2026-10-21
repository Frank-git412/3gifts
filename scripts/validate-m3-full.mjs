import fs from 'node:fs';
import {spawn} from 'node:child_process';
const suites=['m3-full','m3-closure','m3-block5','m3-block4','m3-block3','m3-block2','pilot-dictionary','pilot-context','research-quality-rules','research-public','research-primary-age','research-age-review','refinement-context','event-personal','selection-diagnostics'];
const commands=[['--test','--test-reporter=tap',...suites.map(s=>'tests/'+s+'.mjs')],...['m3-full-ui.cjs','m3-block5-ui.cjs','m3-closure-ui.cjs','m3-block4-ui.cjs','natural-language-exclusions.cjs','research-questionnaire.cjs','localization.cjs','worker-research.mjs','m3-full-audit.mjs'].map(s=>['tests/'+s])];
const run=args=>new Promise(resolve=>{const p=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('close',code=>{console.log(JSON.stringify({command:args.slice(0,3),code,tail:output.slice(-1800)}));resolve({command:['node',...args],exitCode:code,output});});});
// Two independent local test processes at a time; no network or live quotas.
const results=[];for(let i=0;i<commands.length;i+=2)results.push(...await Promise.all(commands.slice(i,i+2).map(run)));
fs.writeFileSync('docs/m3-full-validation.json',JSON.stringify({revision:'20261009-m3-full',generatedAt:new Date().toISOString(),passed:results.every(r=>r.exitCode===0),realAmazonCalls:0,browserQA:false,results},null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
