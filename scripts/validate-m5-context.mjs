import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {RANKING_VERSION} from '../server/research/weighted-ranking.mjs';
const suites=['m5-relevance','m5-composite-exclusions','m5-reading-recovery','m5-skincare-types','m5-intent-retrieval','m5-context-quality','m5-note-defects','m4-notes','m4-ranking','m4-adaptive','m4-shared-quota','m3-full','m3-closure','m3-block5','m3-block4','m3-block3','m3-block2','pilot-dictionary','pilot-context','research-quality-rules','research-public','research-primary-age','research-age-review','research-child-coverage','research-live-regressions','refinement-context','event-personal','selection-diagnostics','amazon-efficiency','amazon-quota'];
const commands=[['--test','--test-reporter=tap',...suites.map(s=>'tests/'+s+'.mjs')],...['m5-relevance-ui.cjs','m5-notes-ui.cjs','m4-notes-ui.cjs','m3-full-ui.cjs','m3-block5-ui.cjs','m3-closure-ui.cjs','m3-block4-ui.cjs','research-questionnaire.cjs','worker-research.mjs','budget-continuity.cjs','natural-language-exclusions.cjs','recipient-preference.cjs'].map(s=>['tests/'+s])];
const run=args=>new Promise(resolve=>{
 const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 child.on('close',code=>{if(args.includes('--test')&&process.argv[3])fs.writeFileSync(process.argv[3],output);const result={command:['node',...args],exitCode:code,tail:output.slice(-4000),failures:[...output.matchAll(/^not ok .*?(?=^# Subtest:|^1\.\.)/gms)].map(m=>m[0]),...(args.includes('--test')?{tests:Number(output.match(/^# tests (\d+)$/m)?.[1]),passed:Number(output.match(/^# pass (\d+)$/m)?.[1]),failed:Number(output.match(/^# fail (\d+)$/m)?.[1])}:{})};console.log(JSON.stringify(result));resolve(result);});
});
const results=[];for(let i=0;i<commands.length;i+=2)results.push(...await Promise.all(commands.slice(i,i+2).map(run)));
const output={revision:RANKING_VERSION,generatedAt:new Date().toISOString(),passed:results.every(r=>r.exitCode===0),realAmazonCalls:0,browserQA:false,results};
fs.writeFileSync(process.argv[2]||'docs/m5-context-validation.json',JSON.stringify(output,null,2)+'\n');if(!output.passed)process.exitCode=1;
