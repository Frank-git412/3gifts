import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import readline from 'node:readline';
import {createRequire} from 'node:module';
import {RANKING_VERSION} from '../server/research/weighted-ranking.mjs';
const require=createRequire(import.meta.url),{createRuntime}=require('../tests/published-runtime.cjs');
const [manifestPath,destination,mode='context']=process.argv.slice(2);
if(!destination||fs.existsSync(destination))throw Error('Provide a new output path');
const manifest=JSON.parse(fs.readFileSync(manifestPath));
if(!['context','anniversary','anniversary-controls','calibration'].includes(mode))throw Error('Unknown scenario group');
const cases=(mode==='calibration'?['L06','L12','T06','T12','S06','S12']:mode==='context'?['L12','T06','T12','S06','S12']:['L12','T12','S12']).map(id=>structuredClone(manifest.scenarios.find(s=>s.id===id)));
const clarified=structuredClone(manifest.scenarios.find(s=>s.id==='T06'));
clarified.id='T06-bluetooth';clarified.request.profile.note+=' Il dispositivo supporta Bluetooth.';if(mode==='context')cases.push(clarified);
if(mode==='anniversary-controls')for(const original of [...cases]){const personal=structuredClone(original);personal.id+='-personal';personal.request.profile.searchPriority='personal';cases.push(personal);}
if(process.stdin.isTTY)spawnSync('stty',['-echo'],{stdio:'inherit'});
console.log('Ready for Site service credential JSON on stdin (input is hidden).');
const rl=readline.createInterface({input:process.stdin});const line=await new Promise(resolve=>rl.once('line',resolve));rl.close();
if(process.stdin.isTTY)spawnSync('stty',['echo'],{stdio:'inherit'});
const {token,origin}=JSON.parse(line);
if(origin!=='https://tre-regali.c-nota.chatgpt.site')throw Error('Unexpected Site origin');
const result={startedAt:new Date().toISOString(),expectedMethodRevision:RANKING_VERSION,observations:[],mode:'public_worker_real_amazon',browserQA:false,humanVotes:0};
const r=createRuntime('it');
for(const s of cases){
 r.seed();r.set('interest',s.request.profile.interests);r.set('subinterest',s.request.profile.subinterests);r.c.m5Profile=s.request.profile;
 const payload=JSON.parse(JSON.stringify(r.eval('researchRequest(m5Profile,analyseNote(m5Profile.note||""))')));
 const config=['url = '+JSON.stringify(origin+'/api/amazon/recommend'),'request = "POST"','header = "Content-Type: application/json"','header = '+JSON.stringify('Origin: '+origin),...(token?['header = '+JSON.stringify('OAI-Sites-Authorization: Bearer '+token)]:[]),'data = '+JSON.stringify(JSON.stringify(payload)),'silent','show-error','max-time = 85','write-out = "\\n%{http_code}"'].join('\n');
 const started=Date.now(),response=spawnSync('curl',['--config','-'],{input:config,encoding:'utf8',maxBuffer:15*1024*1024});
 const output=response.stdout||'',at=output.lastIndexOf('\n'),status=Number(output.slice(at+1));let body;
 try{body=JSON.parse(output.slice(0,at));}catch{body={code:'invalid_response'};}
 const violations=[];
 for(const p of body.products||[]){if(p.price<payload.profile.minBudget||p.price>payload.profile.budget)violations.push('budget');if(new URL(p.url).searchParams.get('tag')!=='3gifts-21')violations.push('affiliate');}
 if(new Set((body.products||[]).map(p=>p.asin)).size!==(body.products||[]).length)violations.push('duplicate_asin');
 if((body.products||[]).length>3)violations.push('too_many');
 const item={id:s.id,payload,status,transportCode:response.status,durationMs:Date.now()-started,violations,body};result.observations.push(item);
 fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({id:s.id,status,code:body.code,count:body.products?.length||0,searched:body.searched,efficiency:body.efficiency,revision:body.methodRevision,violations}));
 if(response.status!==0||status!==200||body.partial||body.methodRevision!==RANKING_VERSION||violations.length){result.stoppedOnError=true;break;}
}
result.completedAt=new Date().toISOString();result.complete=result.observations.length===cases.length&&!result.stoppedOnError;
result.summary={cases:result.observations.length,products:result.observations.reduce((n,o)=>n+(o.body.products?.length||0),0),amazonCalls:result.observations.reduce((n,o)=>n+(o.body.efficiency?.amazonCalls||0),0),cacheHits:result.observations.reduce((n,o)=>n+(o.body.efficiency?.cacheHits||0),0)};
fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({complete:result.complete,...result.summary}));
