import fs from 'node:fs';
import {spawn} from 'node:child_process';
const commands=[['scripts/validate-m4-ranking.mjs'],['--test','tests/m4-notes.mjs'],['tests/m4-notes-ui.cjs']];
const run=args=>new Promise(resolve=>{const p=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('close',code=>{const result={command:['node',...args],exitCode:code,tail:output.slice(-5000)};console.log(JSON.stringify(result));resolve(result);});});
const results=[];for(const args of commands)results.push(await run(args));
fs.writeFileSync('docs/m4-notes-validation.json',JSON.stringify({revision:'20261010-m4-notes',generatedAt:new Date().toISOString(),passed:results.every(r=>r.exitCode===0),realAmazonCalls:0,browserQA:false,results},null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
