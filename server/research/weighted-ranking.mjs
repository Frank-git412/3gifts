// M2 v3 deterministic ranking. Scores are editorial, not probabilities.
import {primaryProductType} from './product-identity.mjs';
export const RANKING_VERSION='20261017-m5-relevance';
export const RANKING_WEIGHTS=Object.freeze({category:45,note:20,effect:15,occasion:12,relation:8});
// Only interpretable, optional note signals enter this channel. Mandatory
// requirements stay in the filters and never earn the same bonus a second time.
const NOTE_PROPERTIES={
 books:/\b(?:libr[oi]|romanz[oi]|books?|novels?)\b/,
 thriller:/\bthriller\b/,
 horror:/\bhorror\b/,
 calm:/\b(?:lettura rilassante|esercizi di rilassamento|relaxing reading|relaxation exercises|luce calda regolabile|adjustable warm light)\b/,
 practical:/\b(?:organizzatore|organizer|organiser|supporto regolabile|adjustable stand)\b/,
 personalized:/\b(?:incisione (?:del |di )?nome|nome personalizzabile|name engraving|customisable name|personalized name)\b/,
 funny:/\b(?:racconti umoristici|humorous stories|contenuto umoristico|humorous content)\b/,
 travel:/\b(?:formato viaggio|da viaggio|travel size|for travel)\b/,
 music:/\b(?:riproduzione musicale|ascolto musica|music playback|music listening)\b/,
 filmUse:/\b(?:cinema|film|movies?|home theat(?:er|re)|riproduzione (?:di )?video|video playback)\b/,
 nature:/\b(?:romanzo sulla natura|novel about nature|tema natura|nature theme)\b/,
 photo:/\b(?:fotografia|photography|fotocamera|camera)\b/,
 skincare:/\b(?:crema viso|siero viso|maschera viso|face cream|face serum|face mask|skincare)\b/,
 coffee:/\b(?:caffe|coffee)\b/,tea:/\b(?:teiera|teapot|tisane|herbal tea)\b/
};
export function rankingProfile(analysis={},gift={},effect='any'){
 const mandatory=new Set(analysis.requiredSignals||[]);
 const noteSignals=[...new Set(analysis.signals||[])].filter(s=>!mandatory.has(s)&&!(s==='calm'&&effect==='relax')&&Object.hasOwn(NOTE_PROPERTIES,s));
 const optionalIntents=[...new Set(analysis.optionalIntents||[])].filter(id=>!(analysis.specificIntents||[]).includes(id));
 const active={category:true,note:noteSignals.length+optionalIntents.length>0,effect:effect!=='any',occasion:!!gift.occasion,relation:!!gift.relation};
 return {version:RANKING_VERSION,weights:RANKING_WEIGHTS,active,denominator:Object.keys(active).reduce((sum,k)=>sum+(active[k]?RANKING_WEIGHTS[k]:0),0),noteSignals,optionalIntents,eventFirst:gift.eventFirst===true,
  noteStatus:active.note?'optional_signals':mandatory.size||analysis.specificIntents?.length?'mandatory_only_no_bonus':'no_interpretable_optional_signal'};
}
const rankingNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function optionalNoteEvidence(product,signals,optionalIntents=[]){
 const evidence=[];
 for(const signal of signals){
  if(signal==='filmUse'&&!['projector','tablet','laptop','smartphone'].includes(primaryProductType(product.title))){evidence.push({signal,status:'absent',evidence:[]});continue;}
  const found=[];let contradictory=false;
  for(const [field,value] of [['title',product.title],['features',product.features]]){
   const text=rankingNorm(Array.isArray(value)?value.join('. '):value);
   for(const match of text.matchAll(new RegExp(NOTE_PROPERTIES[signal].source,'g'))){
    const before=text.slice(0,match.index).split(/[.;!?\n]/).at(-1),after=text.slice(match.index+match[0].length).split(/[.;!?\n]/)[0];
    if(/\b(?:non|no|not|senza|without|optional|opzionale|variante|variant|se|if)\b/.test(before)||/^\s*(?:non|not|sold separately|vendut[oa] separat\w*)\b/.test(after))contradictory=true;
    else found.push({signal,field,matched:match[0],source:'listing_title_features'});
   }
  }
  evidence.push({signal,status:contradictory?'contradictory':found.length?'supported':'absent',evidence:contradictory?[]:found});
 }
 for(const id of optionalIntents){
  const checks=product.optionalLexicalEvidence?.find(x=>x.signal===id)?.checks||[];
  evidence.push({signal:id,status:checks.length&&checks.every(c=>c.status==='supported_by_listing')?'supported':'absent',evidence:checks});
 }
 const supported=evidence.filter(e=>e.status==='supported').length;
 return {status:supported===evidence.length&&supported?'supported':supported?'partial':'absent',evidence};
}
const evidenceValue=e=>e?.status==='supported'?1:e?.status==='partial'&&e.evidence?.some(x=>x.status==='supported'||x.evidence?.length)?0.5:0;
export function weightedRanking(product,matches,config){
 const best=Math.max(0,...matches.map(m=>m.score));
 const category=best>=1?1:best>=0.5?0.5:0;
 const evidence={
  category:{status:category===1?'supported':category?'partial':'absent',source:'listing_match_after_requirements',matches:matches.map(m=>({queryId:m.queryId,area:m.area,subId:m.subId,family:m.family,match:m.score}))},
  note:optionalNoteEvidence(product,config.noteSignals,config.optionalIntents),
  effect:product.contextEvidence?.effect||{status:'absent'},
  occasion:(config.eventFirst?(product.eventEvidence?.status==='supported'?product.eventEvidence:product.occasionUse||product.eventEvidence):product.contextEvidence?.occasion)||{status:'absent'},
  relation:product.contextEvidence?.relation||{status:'absent'}
 };
 const signals=Object.fromEntries(Object.keys(RANKING_WEIGHTS).map(k=>{
  const active=config.active[k],value=active?(k==='category'?category:evidenceValue(evidence[k])):0;
  return [k,{active,weight:active?RANKING_WEIGHTS[k]:0,value,contribution:(active?RANKING_WEIGHTS[k]:0)*value,evidence:evidence[k]}];
 }));
 const numerator=Object.values(signals).reduce((s,x)=>s+x.contribution,0);
 return {version:RANKING_VERSION,score:100*numerator/config.denominator,numerator,denominator:config.denominator,categoryTier:category,eventTier:config.eventFirst&&signals.occasion.value===1?1:0,
  evidenceCompleteness:Object.values(signals).filter(s=>s.active&&s.value===1).length,signals,reviewsUsed:false};
}
export function compareWeightedCandidates(a,b){
 const ar=a.ranking,br=b.ranking;
 return Number(a.ageVerification==='required')-Number(b.ageVerification==='required')||br.eventTier-ar.eventTier||br.categoryTier-ar.categoryTier||br.score-ar.score||br.evidenceCompleteness-ar.evidenceCompleteness;
}
export function chooseWeightedCandidate(candidates,picked=[]){
 if(!candidates.length)return {product:null,status:'no_candidates'};
 const represented=new Set(picked.flatMap(p=>p.matches.map(m=>m.area+':'+m.subId)));
 const fresh=p=>Number(p.matches.some(m=>!represented.has(m.area+':'+m.subId)));
 const representedFamilies=new Set(picked.flatMap(p=>p.matches.map(m=>m.area+':'+m.subId+':'+m.family)));
 const freshFamily=p=>Number(p.matches.some(m=>['culture:books','techGaming:tech'].includes(m.area+':'+m.subId)&&!representedFamilies.has(m.area+':'+m.subId+':'+m.family)));
 return {product:[...candidates].sort((a,b)=>compareWeightedCandidates(a,b)||fresh(b)-fresh(a)||freshFamily(b)-freshFamily(a)||a.asin.localeCompare(b.asin))[0],status:'reviews_disabled'};
}
