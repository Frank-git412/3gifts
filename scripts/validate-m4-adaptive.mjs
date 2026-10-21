import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {QUERY_STRATEGY_VERSION} from '../server/research/public-adapter.mjs';
const commands=[['scripts/validate-m4-notes.mjs'],['--test','tests/m4-adaptive.mjs'],['--test','tests/m4-shared-quota.mjs']];
const results=[];
for(const args of commands){
 const result=await new Promise(resolve=>{const p=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('close',exitCode=>resolve({command:['node',...args],exitCode,tail:output.slice(-5000)}));});
 results.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync('docs/m4-adaptive-validation.json',JSON.stringify({queryStrategy:QUERY_STRATEGY_VERSION,generatedAt:new Date().toISOString(),passed:results.every(x=>x.exitCode===0),realAmazonCalls:0,browserQA:false,results},null,2)+'\n');
if(results.some(x=>x.exitCode!==0))process.exitCode=1;
