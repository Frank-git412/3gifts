import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RESEARCH_CATALOG as catalog} from '../server/research/catalog-data.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const parts=['tech','lifestyle','home','early-a','early-b','kids'].map(n=>JSON.parse(fs.readFileSync(root+'server/research/expanded/'+n+'.json','utf8')));
const terms=parts.flatMap(p=>p.terms),reviews=parts.flatMap(p=>p.familyReviews),rules=parts.flatMap(p=>p.proposedRules),sources=parts.flatMap(p=>p.sources);
const pilot=JSON.parse(fs.readFileSync(root+'server/research/pilot-lexicon.json','utf8')),all=[...pilot,...terms];
const key=r=>r.area+':'+r.subId+':'+r.family;
if(all.length!==catalog.associations.length||new Set(all.map(r=>r.id)).size!==all.length)throw Error('Incomplete full dictionary');
for(const k of catalog.associations){const r=all.find(r=>r.id===k.id);if(!r||r.it!==k.keyword||r.family!==k.family||!r.en||!Array.isArray(r.aliasesEN))throw Error('Unreviewed association '+k.id);}
const outside=catalog.associations.filter(k=>!pilot.some(p=>p.id===k.id));
if(new Set(reviews.map(key)).size!==new Set(outside.map(key)).size||outside.some(k=>!reviews.some(r=>key(r)===key(k)&&r.neutralReason)))throw Error('Incomplete family scope reviews');
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9%]+/g,' ').trim();
const groups={};
for(const row of all){const scope=row.id.split(':').slice(0,2).join(':');(groups[scope]||=[]).push(row);}
const scoped={},globalTargets=new Map();
for(const [scope,rows] of Object.entries(groups)){
 const parent=rows.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));const seen=new Map();
 rows.forEach((r,i)=>{for(const term of [r.it,r.en,...r.aliasesEN]){const k=norm(term),old=seen.get(k);if(old!==undefined)parent[find(i)]=find(old);else seen.set(k,i);}});
 scoped[scope]=[...seen].map(([term,i])=>[term,rows[find(i)].it]);
 for(const [term,target] of scoped[scope]){const values=globalTargets.get(term)||new Set();values.add(target);globalTargets.set(term,values);}
}
const global=[...globalTargets].filter(([,v])=>v.size===1).map(([k,v])=>[k,[...v][0]]),ambiguous=[...globalTargets].filter(([,v])=>v.size>1).map(([term,v])=>({term,meanings:[...v]}));
const path=root+'recommendation-rules.js',source=fs.readFileSync(path,'utf8');
const block='// BEGIN GENERATED M3 EXPANDED TERMS\n  const M3_EXPANDED_TERMS='+JSON.stringify({scoped,global})+';\n  // END GENERATED M3 EXPANDED TERMS';
if(!source.includes('// BEGIN GENERATED M3 EXPANDED TERMS'))throw Error('Missing expanded marker');
fs.writeFileSync(path,source.replace(/\/\/ BEGIN GENERATED M3 EXPANDED TERMS[\s\S]*?\/\/ END GENERATED M3 EXPANDED TERMS/,block));
fs.writeFileSync(root+'server/research/expanded-data.mjs','// Generated from reviewed expanded assets. Source IDs and scopes remain distinct.\nexport const EXPANDED_TERMS='+JSON.stringify(terms)+';\nexport const EXPANDED_FAMILY_REVIEWS='+JSON.stringify(reviews)+';\nexport const EXPANDED_RULE_DATA='+JSON.stringify(rules)+';\nexport const EXPANDED_SOURCES='+JSON.stringify(sources)+';\nexport const EXPANDED_AMBIGUITIES='+JSON.stringify(ambiguous)+';\n');
console.log('Full M3 dictionary: '+all.length+' associations, '+Object.keys(scoped).length+' scopes; '+reviews.length+' additional family reviews.');
