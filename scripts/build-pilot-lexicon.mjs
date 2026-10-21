import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RESEARCH_CATALOG} from '../server/research/catalog-data.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const rows=JSON.parse(fs.readFileSync(root+'server/research/pilot-lexicon.json','utf8'));
const pilot=RESEARCH_CATALOG.associations.filter(k=>[['culture','books'],['techGaming','tech'],['styleBeauty','skincare']].some(([a,s])=>k.area===a&&k.subId===s));
if(rows.length!==353||new Set(rows.map(r=>r.id)).size!==353||pilot.some(k=>!rows.some(r=>r.id===k.id&&r.it===k.keyword&&r.family===k.family&&r.en&&Array.isArray(r.aliasesEN))))throw Error('Incomplete pilot translations');
// Resolve duplicate synonyms only within the same reviewed family. Translation
// aliases join a semantic group; no attribute or product family is broadened.
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9%]+/g,' ').trim();
const parent=rows.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
const seen=new Map();
rows.forEach((r,i)=>{for(const term of [r.it,r.en,...r.aliasesEN]){const k=norm(term),old=seen.get(k);if(old!==undefined){if(rows[old].family!==r.family)throw Error('Cross-family translation: '+term);parent[find(i)]=find(old);}else seen.set(k,i);}});
const entries=[...seen].map(([term,i])=>[term,rows[find(i)].it]);
const file=root+'recommendation-rules.js',source=fs.readFileSync(file,'utf8');
const block='// BEGIN GENERATED M3 BILINGUAL TERMS\n  const M3_BILINGUAL_TERMS='+JSON.stringify(entries)+';\n  // END GENERATED M3 BILINGUAL TERMS';
if(!source.includes('// BEGIN GENERATED M3 BILINGUAL TERMS'))throw Error('Missing lexicon marker');
fs.writeFileSync(file,source.replace(/\/\/ BEGIN GENERATED M3 BILINGUAL TERMS[\s\S]*?\/\/ END GENERATED M3 BILINGUAL TERMS/,block));
fs.writeFileSync(root+'server/research/pilot-lexicon-data.mjs','// Generated from reviewed pilot-lexicon.json. Editorial translations.\nexport const PILOT_BILINGUAL_LEXICON='+JSON.stringify(rows)+';\n');
