import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||Date.now())>>>0;
const destination=process.argv[3];
if(!destination||!path.isAbsolute(destination))throw Error('Provide an absolute evidence output directory outside the Site checkout.');
const out=path.resolve(destination);
if(out===root||out.startsWith(root+path.sep))throw Error('Evidence must stay outside the published repository tree.');
fs.mkdirSync(out,{recursive:true});
const startedAt=new Date().toISOString(),revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const steps=[['build-full',['scripts/build-locales.mjs']],['localization',['tests/localization.cjs']],['privacy-consent',['tests/privacy-consent.cjs','dist']],['path-defects',['tests/path-defects.cjs']],['audit-regressions',['tests/audit-regressions.cjs']],['night-audit-fixes',['tests/night-audit-fixes.cjs']],['natural-language-exclusions',['tests/natural-language-exclusions.cjs']],['high-priority',['tests/high-priority.cjs']],['budget-timing',['tests/budget-timing-matrix.cjs']],['seeded-fuzz',['tests/nightly-fuzz.cjs',String(seed)]]];
const results=[];
for(const [name,args] of steps){
 // The exhaustive matrix legitimately takes over three minutes in this runtime.
 const timeout=name==='budget-timing'?600000:180000;
 const begin=Date.now();const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout,maxBuffer:8*1024*1024});
 const stdout=r.stdout||'',stderr=r.stderr||'';let metrics=null;
 try{metrics=JSON.parse(stdout.trim());}catch{}
 const result={name,command:['node',...args].join(' '),status:r.error?'BLOCKED':r.status===0?'PASS':'FAIL',exitCode:r.status,signal:r.signal,durationMs:Date.now()-begin,timeoutMs:timeout,error:r.error?.message||null,metrics,stdout,stderr};
 results.push(result);fs.writeFileSync(path.join(out,name+'.log'),stdout+'\n'+stderr);
 console.log(JSON.stringify({name,status:result.status,durationMs:result.durationMs}));
 if(name==='build-full'&&result.status!=='PASS')break;
}
const report={startedAt,finishedAt:new Date().toISOString(),timezone:'Europe/Rome',revision,seed,scope:'Full application in dist; local Node/DOM-double tests, NOT browser QA or hosting load testing',results};
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
const rows=results.map(r=>`| ${r.name} | ${r.status} | ${(r.durationMs/1000).toFixed(2)} s |`).join('\n');
const text=`# 3Gifts - primo ciclo audit notturno\n\nAvvio UTC: ${startedAt}\n\nFine UTC: ${report.finishedAt}\n\nRevisione: ${revision}; seed: ${seed}.\n\n## Copertura e limiti\n\nTest del sito completo, non della pagina temporanea. Esecuzione locale con simulazione DOM/rete: nessuna prova visuale in browser, nessuna verifica della disponibilita commerciale, nessuna certificazione legale e nessun carico sull'hosting. Gli esiti positivi non dimostrano assenza di ulteriori difetti.\n\n| Suite | Esito | Durata |\n|---|---|---|\n${rows}\n\n## Evidenze\n\n`+results.map(r=>`### ${r.name}\n\nComando: \`${r.command}\`\n\nEsito: ${r.status}\n\n\`\`\`text\n${r.stdout}\n${r.stderr}\n\`\`\`\n`).join('\n');
fs.writeFileSync(path.join(out,'report.md'),text);
console.log(JSON.stringify({evidenceDirectory:out,suites:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,blocked:results.filter(r=>r.status==='BLOCKED').length}));
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
