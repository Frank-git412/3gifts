import {primaryProductType,requestedPrimaryType} from './product-identity.mjs';
import {normalizeRecipientContext,queryContextChecks,checkProductRequirements,ageListingConflict} from './product-requirements.mjs';
import {RESEARCH_CATALOG} from './catalog-data.mjs';
import {ageBand,isAdultBand,keywordAllowed,MINOR_AGE_NOTICE} from './age-policy.mjs';
import {normalizeProfile} from './engine.mjs';
import {chooseCandidate} from './reviews.mjs';
import {weightedRanking,chooseWeightedCandidate} from './weighted-ranking.mjs';
import {pilotAliasesFor} from './pilot-dictionary.mjs';
import {PUBLIC_RULES} from './public-rules.mjs';

export const RESEARCH_LIMITS=Object.freeze({initialQueries:6,maxRequests:12,maxSeconds:75});
export const RESEARCH_NOTE='Vocabolario ricavato da Google Trends e dalle osservazioni Amazon conservate. Gli indici Trends sono relativi al singolo confronto: non sono volumi, vendite o qualità dei prodotti. Le priorità di ricerca sono editoriali.';
const catalogAreas=new Map(RESEARCH_CATALOG.categories.map(c=>[c.id,c]));
const catalogTerms=new Map(RESEARCH_CATALOG.categories.map(c=>[c.id,RESEARCH_CATALOG.associations.filter(k=>k.area===c.id)]));
export const normalizeText=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const researchFamilyId=(area,family)=>area+':'+normalizeText(family).replaceAll(' ','_');
const STOP=new Set('a al alla alle agli allo ai da dal dalla dalle di del della dei degli delle e ed con per un una uno il lo la le i gli in su sul sulla set kit regalo regali bambini bambino ragazzi anni'.split(' '));
const stem=w=>w.length>4?w.replace(/[aeio]$/,''):w;
const synonyms=[['cuffia','cuffie','headphones'],['ebook','ereader','kindle','kobo'],['powerbank'],['smartwatch'],['gioco','giochi','game','games'],['lampada','lampade','lamp'],['romanzo','romanzi','narrativa'],['libro','libri','book'],['bluetooth','bt'],['penna','penne'],['matita','matite'],['siero','serum'],['crema','cream'],['maschera','maschere','mask'],['caricatore','caricabatterie'],['organizer','organizzatore','organizzatori'],['auricolare','auricolari','earbuds','earphones'],['smartband']];
const equivalent=new Map(synonyms.flatMap((list,i)=>list.map(w=>[stem(w),'syn'+i])));
function tokens(text){return [...new Set(normalizeText(text).replace(/\bmicellar water\b/g,'acqua micellare').replace(/\b(?:facial cleanser|face cleanser)\b/g,'detergente viso').replace(/\bhand cream\b/g,'crema mani').replace(/\b(notebook|laptop)\b/g,'computer portatile').replace(/power bank/g,'powerbank').replace(/e reader/g,'ereader').replace(/smart band/g,'smartband').replace(/video proiettore/g,'videoproiettore').split(' ').filter(w=>w.length>1&&!STOP.has(w)).map(w=>equivalent.get(stem(w))||stem(w)))];}
export function excludedText(text,exclusions){const normalized=normalizeText(text);return exclusions.some(e=>{const words=normalizeText(e).split(' ').filter(Boolean);return words.length&&words.every(w=>normalized.split(' ').some(t=>stem(t)===stem(w)));});}
function availableCategory(c,age){return c.audience===(age==='earlyChild'?'earlyChild':age==='child'?'child':'general');}
function editorialPriority(k,effect,hints=[]){
 let score=(k.seed?10:0)+(k.directEvidence?2:0)+(k.previousRuntimeUse?1:0);
 const s=normalizeText(k.keyword+' '+k.family);
 if(effect==='relax'&&/cuffi|ebook|lettur|romanzo|luce calda|candel|plaid|massagg|yoga|meditaz|puzzle|color|teier|tisana/.test(s))score+=8;
 if(effect==='useful'&&/organizz|organizer|caric|power bank|support|taccuin|agend|lampad|borracc|portafogl|portacart|strument/.test(s))score+=8;
 if(effect==='sentimental'&&/album|foto|ricord|diario|cornic|personalizz|portagioiell/.test(s))score+=8;
 if(effect==='funny'&&/gioc|party|karaoke|magia|umoris|divert/.test(s))score+=8;
 if(effect==='surprising'&&/creativ|modell|esperiment|puzzle|craft|costruz/.test(s))score+=8;
 if(effect==='elegant'&&/design|penna|stilograf|portafogl|gioiell|teiera|cofanett/.test(s))score+=8;
 const contextPatterns={home:/casa|arredo|cucin|tazza|teiera|piant|organizz/,memory:/album|foto|ricord|diario|cornic/,study:/penna|agenda|studio|taccuin|scrivania|libr/,together:/gioc|party|cucin|teiera|puzzle/,practical:/organizz|support|agenda|borracc|lampad/,care:/relax|benessere|cuscino|album|tisana/,celebration:/cofanett|set |gioc|album|regalo/,gratitude:/tazza|penna|taccuin|teiera|candela|cofanett/};
 if(hints.some(h=>contextPatterns[h]?.test(s)))score+=4;
 if(k.qualificationNotes.some(n=>/stringa ambigua|termine ampio|termine molto ampio|include finanza|intento ampio/i.test(n)))score-=5;
 return score;
}
function eligibleKeyword(k,profile){
 if(k.intentDecision?.status==='suspended'||queryContextChecks({keywords:k.queryKeywords+(queryContextChecks({keywords:k.queryKeywords,originalKeyword:k.keyword},profile.recipientContext).some(c=>c.kind==='device_model')?' '+profile.recipientContext.deviceModel:''),originalKeyword:k.keyword},profile.recipientContext).some(c=>c.status==='unknown'))return false;
 if(!keywordAllowed(k.keyword,profile.ageBand)||excludedText(k.keyword,profile.exclude))return false;
 // SearchItems is for purchasable catalog items; subscription landing pages and
 // informational searches need a separate product path, not a fabricated ASIN.
 if(/\b(abbonament\w*|audible|kindle unlimited|netflix|spotify|gratis|download|tutorial|recensioni|usato|usati|ricondizionat\w*)\b/i.test(k.keyword))return false;
 if(profile.age==='teen'&&(k.area==='styleBeauty'&&k.subId==='skincare'||k.area==='foodDrink'&&k.subId==='wine'))return false;
 return true;
}
export function researchTaxonomy(){return {version:RESEARCH_CATALOG.version,stats:RESEARCH_CATALOG.stats,categories:RESEARCH_CATALOG.categories};}
export function planResearchAnswers(raw={}){
 const band=ageBand(raw.age||'adult');
 if(!Array.isArray(raw.interests)||!raw.interests.length)throw Error('Scegli almeno un interesse.');
 const interests=[...new Set(raw.interests)];
 if(interests.some(id=>!catalogAreas.has(id)))throw Error('Categoria non riconosciuta.');
 if(interests.some(id=>!availableCategory(catalogAreas.get(id),band)))throw Error('Le categorie scelte non corrispondono alla fascia d’età.');
 const base=normalizeProfile({...raw,age:isAdultBand(band)?'adult':band,terms:{reading:['accessori']},premium:raw.premium!==false});
 const {terms,...profile}=base;profile.ageBand=band;profile.recipientContext=normalizeRecipientContext(raw.recipientContext);
 const effect=['relax','useful','sentimental','funny','surprising','elegant','any'].includes(raw.effect)?raw.effect:'any';
 const subcategories={},warnings=[],excludedAssociations=[],areaQueues=[];
 const selectedPairs=[];
 for(const area of interests){
  const c=catalogAreas.get(area),rawSubs=raw.subcategories?.[area];
  if(rawSubs!==undefined&&!Array.isArray(rawSubs))throw Error('Sottocategorie non valide.');
  const ids=[...new Set(rawSubs||[])];
  if(ids.some(id=>!c.subcategories.some(s=>s.id===id)))throw Error('Sottocategoria non riconosciuta per '+c.label+'.');
  subcategories[area]=ids;
  const subs=ids.length?c.subcategories.filter(s=>ids.includes(s.id)):c.subcategories;
  const queues=subs.map(sub=>{
   selectedPairs.push(area+':'+sub.id);
   const all=catalogTerms.get(area).filter(k=>k.subId===sub.id);
   const permitted=all.filter(k=>eligibleKeyword(k,profile)&&!(raw.excludedFamilies||[]).includes('concept:'+researchFamilyId(k.area,k.family)));
   const suppressed=all.length-permitted.length;
   if(suppressed)excludedAssociations.push({keywords:c.label+' · '+sub.label,reason:suppressed+' associazioni escluse per età, tipo di ricerca, esclusioni o compatibilità ancora ignota'});
   const sorted=permitted.map((k,order)=>({k,order,priority:editorialPriority(k,effect,Array.isArray(raw.selectionHints)?raw.selectionHints:[])-((raw.deprioritizedFamilies||[]).includes('concept:'+researchFamilyId(k.area,k.family))?24:0)})).sort((a,b)=>b.priority-a.priority||a.order-b.order).map(x=>x.k);
   const families=new Set(),first=[],later=[];
   for(const k of sorted){if(families.has(k.family))later.push(k);else{first.push(k);families.add(k.family);}}
   return [...first,...later].map(k=>({id:k.id,keywords:k.queryKeywords+(queryContextChecks({keywords:k.queryKeywords,originalKeyword:k.keyword},profile.recipientContext).some(c=>c.kind==='device_model')?' '+profile.recipientContext.deviceModel:''),originalKeyword:k.keyword,intentDecision:k.intentDecision,recipientContext:profile.recipientContext,keywordId:k.keywordId,aliasGroup:k.aliasGroup,area,subId:sub.id,family:k.family,from:[c.label,sub.label],kind:'dizionario',searchIndex:'All',min:profile.effectiveMin,max:profile.max,qualificationNotes:k.qualificationNotes,profileRequirements:k.profileRequirements,requirementStatus:'to_verify_on_product'}));
  });
  // Keep every qualified dictionary alternative available for contextual choice.
  // The downstream schedule, not this in-memory pool, owns the 6/12 call limits.
  const queue=[];for(let round=0;round<Math.max(0,...queues.map(q=>q.length));round++)for(const q of queues)if(q[round])queue.push(q[round]);areaQueues.push(queue);
 }
 const ordered=[];for(let round=0;round<Math.max(0,...areaQueues.map(q=>q.length));round++)for(const q of areaQueues)if(q[round])ordered.push(q[round]);
 // A shared keyword is sent once while preserving every selected association.
 const unique=new Map();for(const q of ordered){const key=(q.aliasGroup||normalizeText(q.keywords))+'|'+JSON.stringify(q.intentDecision?.titleMustMatch||[]);const old=unique.get(key);const association={area:q.area,subId:q.subId,family:q.family,keywordId:q.keywordId};if(old){old.associations.push(association);old.observedKeywords=[...new Set([...old.observedKeywords,q.originalKeyword])];old.profileRequirements=[...new Set([...old.profileRequirements,...q.profileRequirements])];old.qualificationNotes=[...new Set([...old.qualificationNotes,...q.qualificationNotes])];}else unique.set(key,{...q,observedKeywords:[q.originalKeyword],associations:[association]});}
 const candidates=[...unique.values()].map(q=>({...q,lexicalAliases:q.associations.flatMap(a=>pilotAliasesFor(a.area+':'+a.subId+':'+a.keywordId))})),reserved=[],covered=new Set();
 for(const q of candidates){if(q.associations.some(a=>!covered.has(a.area+':'+a.subId))){reserved.push(q);q.associations.forEach(a=>covered.add(a.area+':'+a.subId));}}
 const initialCount=Math.min(RESEARCH_LIMITS.maxRequests,Math.max(RESEARCH_LIMITS.initialQueries,reserved.length));
 const candidateQueries=[...reserved,...candidates.filter(q=>!reserved.includes(q))];
 const schedule=candidateQueries.slice(0,RESEARCH_LIMITS.maxRequests);
 const queries=schedule.slice(0,initialCount),fallbackQueries=schedule.slice(initialCount);
 const scheduledPairs=new Set(queries.flatMap(q=>q.associations.map(a=>a.area+':'+a.subId)));
 const deferredSubcategories=selectedPairs.filter(pair=>!scheduledPairs.has(pair));
 if(deferredSubcategories.length)warnings.push('Alcune sottocategorie non entrano nella prima ricerca o non hanno parole compatibili. Riduci le scelte per approfondirle.');
 if(excludedAssociations.some(x=>x.reason.includes('compatibilità')))warnings.push('Le ricerche che richiedono modello, collegamento, misure o installazione non noti vengono escluse. Puoi precisare il dispositivo nelle opzioni di compatibilità.');
 if(interests.length>3)warnings.push('Le tre proposte possono rappresentare soltanto una parte degli interessi selezionati.');
 if(profile.age!=='adult')warnings.push(MINOR_AGE_NOTICE);
 if(profile.exclude.length)warnings.push('Esclusioni controllate sul testo disponibile: ingredienti e requisiti non dichiarati non sono verificati.');
 return {mode:'research',version:RESEARCH_CATALOG.version,profile,interests,effect,subcategories,queries,fallbackQueries,candidateQueries,warnings,excludedAssociations,deferredSubcategories,popularity:RESEARCH_NOTE,coverage:RESEARCH_CATALOG.stats};
}
export function matchResearchProduct(product,query){
 if(query.area==='styleBeauty'&&query.subId==='skincare'&&query.family==='creme_mani'&&PUBLIC_RULES.skincareFunction(product)!=='hand_cream')return 0;
 if(!query.lexicalTermIds?.length&&! [['culture','books'],['techGaming','tech'],['styleBeauty','skincare']].some(([a,s])=>query.area===a&&query.subId===s)){
  product={...product,title:PUBLIC_RULES.dictionaryTranslateTerms(product.title,query),features:PUBLIC_RULES.dictionaryTranslateTerms(product.features,query)};
  query={...query,keywords:PUBLIC_RULES.dictionaryTranslateTerms(query.keywords,query)};
 }
 if(!query.lexicalTermIds?.length&&[['culture','books'],['techGaming','tech'],['styleBeauty','skincare']].some(([a,s])=>query.area===a&&query.subId===s)){
  product={...product,title:PUBLIC_RULES.pilotTranslateTerms(product.title),features:PUBLIC_RULES.pilotTranslateTerms(product.features)};
  query={...query,keywords:PUBLIC_RULES.pilotTranslateTerms(query.keywords)};
 }
 const requirements=checkProductRequirements(product,query);if(!requirements.passed)return 0;
 if(query.lexicalTermIds?.length)return PUBLIC_RULES.m3ListingChecks(product,PUBLIC_RULES.m3Requirements(query.lexicalTermIds),query.lexicalIntents).every(c=>c.status==='supported_by_listing')?1:0;
 if(query.area==='kidsBooks'&&product.productGroup&&!/^(?:book|books|libro|libri)$/i.test(product.productGroup))return 0;
 if(query.associations?.length&&query.associations.every(a=>a.subId==='kidsBooks_kidsStories')){
  // A generic children's-book classification is not narrative evidence. C25
  // returned educational body-safety and Earth-history books through this gap.
  const listing=normalizeText(product.title+' '+(product.features||''));
  const bookTitle=normalizeText(product.title);
  if(/\b(?:enciclopedi\w*|encyclopedi\w*|encyclopaedi\w*|fatti incredibili|curiosita scientifiche|activity book|workbook)\b/.test(bookTitle)||/\b(?:diario|journal)\b/.test(bookTitle)&&/\b(?:attivita|missioni|spazi per|raccontarsi|da scrivere|activities|prompts|write your)\b/.test(bookTitle))return 0;
  const narrative=/\b(?:raccont[oi]|fiab[ae]|favol[ae]|romanz[oi]|narrativ[ao]|avventur[ae]|storie|stories|storybooks?|fairy tales?|novels?|fiction)\b/;
  let supported=false,contradictory=false;
  for(const m of listing.matchAll(new RegExp(narrative.source,'g'))){
   const before=listing.slice(0,m.index).split(/\b(?:ma|but)\b/).at(-1).split(' ').slice(-5).join(' ');
   if(/\b(?:non|no|not|senza|without)\b/.test(before))contradictory=true;else supported=true;
  }
  if(!supported||contradictory)return 0;
 }
 if(requestedPrimaryType(query)===primaryProductType(product.title)&&/^(?:smartphone|cellulare|tablet|notebook|laptop|computer portatile|pc portatile|lettore cd|giradischi)$/i.test(query.keywords.trim()))return 1;
 // Classification establishes that the main object is a book, never its age.
 // Only generic children's-book queries can use this shortcut; genre queries
 // still need their descriptive evidence and all requirement checks above.
 if(query.area==='kidsBooks'&&/^(?:book|books|libro|libri)$/i.test(product.productGroup||'')&&/^libri (?:bambini|ragazzi)(?: \d+ anni)?$/.test(query.keywords)&&/\b(?:raccont\w*|stori[ae]|fiab\w*|romanzo|avventur\w*)\b/.test(normalizeText(product.title+' '+(product.features||''))))return 1;
 const wanted=tokens(query.keywords),title=tokens(product.title),all=tokens(product.title+' '+(product.features||''));
 if(!wanted.length)return 0;
 // Require the product noun in the title; mentions of a compatible product in
 // accessories, replacement parts or long descriptions do not establish a match.
 const bibliographicBook=PUBLIC_RULES.bookIdentity(product)&&/^(?:books?|libri|libro)$/i.test(product.productGroup||'');
 const bookNoun=/^(?:libri?|books?|romanz[oi]|novels?)\b/i.test(query.keywords);
 if(!title.includes(wanted[0])&&!(bibliographicBook&&bookNoun&&(/^(?:libri?|books?)\b/i.test(query.keywords)||all.includes(wanted[0]))))return 0;
 if(bibliographicBook&&/^(?:libri?|books?)\b/i.test(query.keywords)&&!all.includes(wanted[0]))all.push(wanted[0]);
 const accessory=/\b(custodia|cover|ricambio|ricambi|pellicola|cinturino|custodie|protezion\w*)\b/i;
 if(!accessory.test(query.keywords)&&accessory.test(product.title)){
  const titleWords=normalizeText(product.title).split(' ');
  const accessoryAt=titleWords.findIndex(w=>accessory.test(w));
  const nounAt=titleWords.findIndex(w=>(equivalent.get(stem(w))||stem(w))===wanted[0]);
  if(accessoryAt>=0&&(nounAt<0||accessoryAt<nounAt))return 0;
 }
 const hits=wanted.filter(w=>all.includes(w)).length;
 if(hits<Math.ceil(wanted.length*.65))return 0;
 return hits/wanted.length;
}
function conceptKey(p,match){
 const skincare=PUBLIC_RULES.skincareFunction(p);if(skincare)return skincare;
 if(primaryProductType(p.title)==='ereader')return 'ereader';
 if(/\b(?:segnalibr\w*|bookmarks?)\b/i.test(p.title))return 'reading_bookmark';
 const book=PUBLIC_RULES.bookIdentity(p);
 if(book)return book.workKey||book.editionKeys[0]||'book_identity_unresolved';
 const text=normalizeText(PUBLIC_RULES.dictionaryTranslateTerms(String(p.title||'').replace(/\bcrème\b/gi,'cream'),match));
 if(/\blibr[oi]\b/.test(text)&&/\b(?:stoffa|morbidi|morbido|tessuto)\b/.test(text))return 'soft_activity_book';
 const primary=primaryProductType(text);if(primary&&primary!=='device_accessory')return primary;
 if(match.area==='newsBusiness'&&/\b(penna|penne|stilografica|stilografiche)\b/.test(text))return 'writing_pen';
 if(/contorno occhi|eye cream|eyes.*crema|crema.*occhi/.test(text))return 'eye_cream';
 if(/\b(crema|cream)\b/.test(text)&&! /\b(mani|hand|piedi|foot|corpo|body|occhi|eye|eyes)\b/.test(text)&&/\b(viso|face|notte|night|giorno|day|rughe|wrinkle|rassodante|retinolo|idratante|moisturi\w*)\b|anti age|anti eta/.test(text))return 'face_cream';
 // A cream without a declared body area is not evidence of a distinct use.
 if(/\b(?:crema|cream)\b/.test(text)&&! /\b(?:mani|hand|piedi|foot|corpo|body|occhi|eye|eyes)\b/.test(text))return 'cream_unspecified';
 const types=[[/\b(puzzle|jigsaw)\b/,'puzzle'],[/\b(esperiment\w*|experiments?|chimica|chemistry)\b/,'science_experiments'],[/\b(romanzo|romanzi|novel|narrativa)\b/,'fiction_book'],[/\b(portafogl\w*|portacart\w*|wallet|card holder)\b/,'wallet'],[/\b(sciarp\w*|foulard|scarf|scarves)\b/,'scarf'],[/\b(borsa|borse|borsetta|borsette|handbag)\b/,'bag'],[/cuffi|auricolar|headphon/,'headphones'],[/power bank|powerbank|batteria portatile/,'powerbank'],[/ebook|e reader|kindle|kobo/,'ereader'],[/lampad|abat jour/,'lamp'],[/siero|serum/,'serum'],[/mascher.*viso|face mask/,'face_mask'],[/crema.*viso|face cream/,'face_cream']];
 if(/\b(supporto|stand|scrivania|tavolino)\b/.test(text)&&/notebook|laptop|computer|monitor/.test(text))return 'computer_support';
 return types.find(([re])=>re.test(text))?.[1]||match.area+':'+match.family;
}
function equivalentFunctions(p,match){
 const primary=conceptKey(p,match),text=normalizeText(PUBLIC_RULES.dictionaryTranslateTerms(p.title,match));
 const functions=[primary];
 if(primary==='cream_unspecified')functions.push('face_cream');
 if(/\b(kit|set|cofanetto|routine)\b/.test(text)&&/skincare|skin care|\bviso\b|anti rughe|anti eta/.test(text)){
  if(/siero|serum/.test(text))functions.push('serum');
  if(/crema|cream/.test(text))functions.push('face_cream');
  if(/maschera|mask/.test(text))functions.push('face_mask');
  if(/contorno occhi|eye cream|eye care/.test(text))functions.push('eye_cream');
 }
 return [...new Set(functions)];
}
export function selectResearchIdeas(candidates,plan){
 const queryMap=new Map([...plan.queries,...plan.fallbackQueries].map(q=>[q.id,q]));
 const pool=[],rejections=[];
 for(const p of candidates){
  const ageCheck=ageListingConflict(p,plan.profile.ageBand);if(ageCheck.conflict){rejections.push({asin:p.asin,title:p.title,reason:'declared_age_conflict',minimumYears:ageCheck.minimumYears,cohortMax:ageCheck.cohortMax});continue;}
  const reason=!Number.isFinite(p.price)||p.price<plan.profile.effectiveMin||p.price>plan.profile.max?'outside_budget':excludedText(p.title+' '+(p.features||''),plan.profile.exclude)?'explicit_exclusion':!keywordAllowed(p.title,plan.profile.ageBand)?'age_keyword_restriction':null;
  if(reason){rejections.push({asin:p.asin,reason});continue;}
  const matches=(p.researchQueryIds||[]).flatMap(id=>{const q=queryMap.get(id);if(!q)return [];const score=matchResearchProduct(p,q);return score?q.associations.map(a=>({...a,score,queryId:q.id})):[];});
  if(!matches.length){const checks=(p.researchQueryIds||[]).flatMap(id=>{const q=queryMap.get(id);return q?checkProductRequirements(p,q).checks.filter(c=>c.status!=='supported_by_listing'):[]});rejections.push({asin:p.asin,title:p.title,reason:checks.length?'required_property_missing_or_conflicting':'product_type_or_query_mismatch',checks});continue;}
  const areas=[...new Set(matches.map(m=>m.area))];
  const best=matches.reduce((a,b)=>a.score>=b.score?a:b);
  pool.push({...p,areas,matches,relevance:Math.round(best.score*100),concept:conceptKey(p,best),functions:equivalentFunctions(p,best),...(plan.ranking?{ranking:weightedRanking(p,matches,plan.ranking)}:{})});
 }
 const picked=[],used=new Set(),families=new Set(),parents=new Set(),decisions=[];
 const distinct=p=>!used.has(p.asin)&&!p.functions.some(key=>families.has(key))&&(!p.parentAsin||!parents.has(p.parentAsin))&&!picked.some(chosen=>PUBLIC_RULES.bookDuplicate(p,chosen));
 const pick=list=>{const choice=plan.ranking?chooseWeightedCandidate(list,picked):chooseCandidate(list);decisions.push(choice.status);const p=choice.product;if(!p||picked.length===3)return;picked.push(p);used.add(p.asin);p.functions.forEach(key=>families.add(key));if(p.parentAsin)parents.add(p.parentAsin);};
 // Fill from age-documented candidates first; uncertain books only fill remaining slots.
 for(const tier of [pool.filter(p=>p.ageVerification!=='required'),pool.filter(p=>p.ageVerification==='required')]){
 // Every supported interest gets a turn before filling the remaining positions.
 for(const area of plan.interests)if(picked.length<3&&!picked.some(p=>p.areas.includes(area))){
  let choices=tier.filter(p=>distinct(p)&&p.areas.includes(area));
  // With at most two selected interests, look ahead one card so a preferred
  // variant cannot consume the only distinct candidate for the other interest.
  if(plan.ranking&&picked.length<2&&choices.length){
   const compatible=(a,b)=>a.asin!==b.asin&&(!a.parentAsin||a.parentAsin!==b.parentAsin)&&!a.functions.some(k=>b.functions.includes(k))&&!PUBLIC_RULES.bookDuplicate(a,b);
   const potential=p=>new Set([...picked.flatMap(x=>x.areas),...p.areas,...tier.filter(x=>distinct(x)&&compatible(p,x)).flatMap(x=>x.areas)]).size;
   const maximum=Math.max(...choices.map(potential));choices=choices.filter(p=>potential(p)===maximum);
  }
  pick(choices);
 }
 // Prefer an uncovered subcategory when several ideas are from one interest.
 while(picked.length<3){const remaining=tier.filter(distinct);if(!remaining.length)break;if(plan.ranking){pick(remaining);continue;}const represented=new Set(picked.flatMap(p=>p.matches.map(m=>m.area+':'+m.subId)));const eventTier=Math.max(...remaining.map(p=>Number(p.eventPriorityScore)||0));const eventPool=remaining.filter(p=>(Number(p.eventPriorityScore)||0)===eventTier);const fresh=eventPool.filter(p=>p.matches.some(m=>!represented.has(m.area+':'+m.subId)));pick(fresh.length?fresh:eventPool);}
 }
 const finalSelection=[...rejections.map(p=>({asin:p.asin,status:'rejected',reason:p.reason})),...pool.map(p=>{
  const trace={ranking:p.ranking||null,queryMatches:p.matches.map(m=>({queryId:m.queryId,area:m.area,subId:m.subId,family:m.family,match:m.score})),eventEvidence:p.eventEvidence||null,occasionUse:p.occasionUse||null,contextEvidence:p.contextEvidence||null};
  if(picked.includes(p))return {asin:p.asin,status:'selected',reason:'selected_after_filters_priority_and_coverage',position:picked.indexOf(p)+1,...trace};
  const duplicate=picked.find(chosen=>chosen.asin===p.asin||(p.parentAsin&&chosen.parentAsin===p.parentAsin)||PUBLIC_RULES.bookDuplicate(p,chosen)||p.functions.some(key=>chosen.functions.includes(key)));
  const reason=duplicate?(duplicate.asin===p.asin?'duplicate_asin':p.parentAsin&&duplicate.parentAsin===p.parentAsin?'same_parent_variant':PUBLIC_RULES.bookDuplicate(p,duplicate)||'equivalent_function'):'not_selected_after_priority_and_coverage';
  return {asin:p.asin,status:'not_selected',reason,...(duplicate?{duplicateOf:duplicate.asin}:{}),...trace};
 })];
 return {finalSelection,products:picked.map(({features,matches,relevance,concept,functions,reviews,researchQueryIds,...p})=>({...p,features,...(plan.profile.age!=='adult'?{ageNotice:p.ageVerification==='required'?p.ageNotice:MINOR_AGE_NOTICE}:{}),verifiedListingChecks:[...new Map(matches.flatMap(m=>checkProductRequirements(p,queryMap.get(m.queryId)).checks).map(c=>[c.key,c])).values()],requirementsToVerify:[...new Set(matches.flatMap(m=>queryMap.get(m.queryId)?.profileRequirements||[]))],reason:'Coerente con '+p.areas.map(a=>catalogAreas.get(a).label.toLowerCase()).join(' e ')+'. Prezzo nella fascia richiesta.'})),eligibleCount:pool.length,rejections,missing:plan.interests.filter(a=>!picked.some(p=>p.areas.includes(a))),reviewSelection:{appliedComparisons:decisions.filter(x=>x==='applied').length,unavailableComparisons:decisions.filter(x=>x==='missing_data').length}};
}
