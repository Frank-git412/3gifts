import {EXPANDED_RULE_DATA,EXPANDED_FAMILY_REVIEWS,EXPANDED_TERMS} from './expanded-data.mjs';
import {PILOT_CONTEXT_AXES,pilotDictionaryInventory} from './pilot-dictionary.mjs';
export const EXPANDED_RULES=Object.freeze(EXPANDED_RULE_DATA.flatMap(r=>r.subIds.map(subId=>({...r,subId,titlePattern:new RegExp(r.titlePattern,'i'),properties:r.properties.map(p=>new RegExp(p,'i'))}))));
const expandedNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const expandedScopes=new Set(EXPANDED_FAMILY_REVIEWS.map(r=>r.area+':'+r.subId));
export function expandedContextEvidence(product,context={},effect){
 const tags=product.tags||[],scopes=[...expandedScopes].filter(k=>k.split(':').every(t=>tags.includes(t)));
 if(!scopes.length)return null;
 const fields=[['title',expandedNorm(product.title)],['features',expandedNorm(Array.isArray(product.features)?product.features.join('. '):product.features)]];
 const result={version:'20261009-m3-full',scope:'expanded'};
 for(const signal of ['relation','effect','occasion']){
  const value=signal==='effect'?effect:context[signal],candidates=[];
  for(const rule of EXPANDED_RULES.filter(r=>r.signal===signal&&r.values.includes(value)&&scopes.includes(r.area+':'+r.subId))){
   // An explicit matched catalog family is required; a keyword in a query is not evidence.
   if(!rule.families.some(f=>product.conceptFamily===rule.area+':'+f)||!rule.titlePattern.test(fields[0][1]))continue;
   if(/^(?:non|not|optional|opzional\w*|variante|variant|custodia|cover|ricambio|replacement|case|borsa|bag)\b/.test(fields[0][1]))continue;
   let contradicted=false;const evidence=[];
   for(const pattern of rule.properties){
    let found=false;
    for(const [field,text] of fields)for(const match of text.matchAll(new RegExp(pattern.source,'gi'))){
     const before=text.slice(0,match.index).split(/[.;!?\n]/).at(-1),after=text.slice(match.index+match[0].length).split(/[.;!?\n]/)[0];
     const affirmative=match[0].replace(/\b(?:senza schermo|screen[ -]free|no app required)\b/g,'');
     const negative=/\b(non|senza|nessun\w*|not|no|without|cannot|can't|optional|opzional\w*|variante|variant|se|if)\b/;
     if(/^(?:non|not|optional|opzional\w*|variante|variant)\b/.test(text)||negative.test(before)||negative.test(affirmative)||/^\s*(?:non|not|optional|opzional\w*|sold separately|vendut[oa] separat\w*)\b/.test(after))contradicted=true;
     else{found=true;evidence.push({field,matched:match[0],property:rule.property,rule:rule.id,status:'supported',asin:product.asin||null});}
    }
    if(!found)evidence.push({rule:rule.id,property:rule.property,status:'absent'});
   }
   candidates.push({status:contradicted?'contradictory':evidence.every(e=>e.status==='supported')?'supported':evidence.some(e=>e.status==='supported')?'partial':'absent',rule:rule.id,evidence});
  }
  result[signal]=candidates.find(c=>c.status==='supported')||candidates.find(c=>c.status==='contradictory')||candidates.find(c=>c.status==='partial')||{status:'absent',evidence:[]};
 }
 return result;
}
export function fullDictionaryInventory(){
 return [...pilotDictionaryInventory(),...EXPANDED_FAMILY_REVIEWS.map(review=>{
  const rules=EXPANDED_RULES.filter(r=>r.area===review.area&&r.subId===review.subId&&r.families.includes(review.family));
  const terms=EXPANDED_TERMS.filter(t=>t.id.startsWith(review.area+':'+review.subId+':')&&t.family===review.family);
  return {...review,id:'m3:'+review.area+':'+review.subId+':'+review.family,bilingualTerms:terms,keywordIds:terms.map(t=>t.id),rules:rules.map(r=>r.id),contextDecisions:Object.entries(PILOT_CONTEXT_AXES).flatMap(([signal,values])=>values.map(value=>{
   const applicable=rules.filter(r=>r.signal===signal&&r.values.includes(value));
   return {signal,value,status:applicable.length?'conditional':'neutral',rules:applicable.map(r=>r.id),reason:applicable.length?'Richiede proprietà affermative del prodotto offerto; tutti i vincoli restano obbligatori.':review.neutralReason};
  })),verification:'editorial_and_synthetic; real_offer_M5_pending'};
 })];
}
