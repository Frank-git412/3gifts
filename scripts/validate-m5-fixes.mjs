import fs from 'node:fs';
import {spawn} from 'node:child_process';
const suites=['m5-note-defects','m4-notes','m4-ranking','m4-adaptive','m4-shared-quota','m3-full','m3-closure','m3-block5','m3-block4','m3-block3','m3-block2','pilot-dictionary','pilot-context','research-quality-rules','research-public','research-primary-age','research-age-review','research-child-coverage','research-live-regressions','refinement-context','event-personal','selection-diagnostics','amazon-efficiency','amazon-quota'];
const commands=[['--test','--test-reporter=tap',...suites.map(s=>'tests/'+s+'.mjs')],...['m5-notes-ui.cjs','m4-notes-ui.cjs','m3-full-ui.cjs','m3-block5-ui.cjs','m3-closure-ui.cjs','m3-block4-ui.cjs','research-questionnaire.cjs','worker-research.mjs','budget-continuity.cjs','natural-language-exclusions.cjs','recipient-preference.cjs'].map(s=>['tests/'+s])];
const run=args=>new Promise(resolve=>{
 const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 child.on('close',code=>{const result={command:['node',...args],exitCode:code,tail:output.slice(-4500),...(args.includes('--test')?{tests:Number(output.match(/^# tests (\d+)$/m)?.[1]),passed:Number(output.match(/^# pass (\d+)$/m)?.[1]),failed:Number(output.match(/^# fail (\d+)$/m)?.[1])}:{})};console.log(JSON.stringify(result));resolve(result);});
});
const results=[];
for(let i=0;i<commands.length;i+=2)results.push(...await Promise.all(commands.slice(i,i+2).map(run)));
const output={revision:'20261013-m5-g12-g13',generatedAt:new Date().toISOString(),passed:results.every(r=>r.exitCode===0),realAmazonCalls:0,browserQA:false,results};
fs.writeFileSync('docs/m5-fixes-validation.json',JSON.stringify(output,null,2)+'\n');
if(!output.passed)process.exitCode=1;
