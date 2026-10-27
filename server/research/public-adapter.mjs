import {planResearchAnswers,selectResearchIdeas,matchResearchProduct,researchTaxonomy,RESEARCH_LIMITS,normalizeText,researchFamilyId} from './research-engine.mjs';
import {normalizeCandidates,mergeCandidates} from './engine.mjs';
import {declaredMinimumAge,declaredAgeRange} from './product-requirements.mjs';
import {primaryProductType} from './product-identity.mjs';
import {PUBLIC_RULES,CHILD_STAGE_RULES} from './public-rules.mjs';
import {amazonApi} from '../amazon-transport.mjs';
import {giftContext,contextPreference,contextualizeQueries} from './gift-context.mjs';
import {rankingProfile,RANKING_VERSION} from './weighted-ranking.mjs';
import {prioritizeIntentQueries,intentSearchProbes} from './intent-search.mjs';
const rules=PUBLIC_RULES;

export const METHOD_VERSION='research-20261007';
export const QUERY_STRATEGY_VERSION='20261017-m5-relevance';
const taxonomy=researchTaxonomy();
const list=(v,n=40)=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&/^[a-zA-Z0-9_:-]{1,80}$/.test(x)))].slice(0,n):[];
export function publicPlan(data={}){
 const p=data.profile||{},c=data.constraints||{};
 if(!rules.validBudgetRange(p.budget,p.minBudget))throw Error('budget');
 if(!['earlyChild','child','teen','youngAdult','adult','mature','unknown'].includes(p.ageRange))throw Error('age');
 const originalInterests=list(p.interests,2);
 if(!originalInterests.length)throw Error('interests');
 const remainingInterests=originalInterests.filter(x=>!list(p.excludedInterests).includes(x));
 const allInterestsExcluded=!remainingInterests.length;
 const interests=allInterestsExcluded?originalInterests:remainingInterests;
 const subs=list(p.subinterests,4),subcategories={};
 for(const area of interests)subcategories[area]=subs.filter(s=>taxonomy.categories.find(c=>c.id===area)?.subcategories.some(x=>x.id===s));
 const analysis={exclusions:list(c.exclusions),signals:list(c.signals),requiredSignals:list(c.requiredSignals),specificIntents:list(c.specificIntents),optionalIntents:list(c.optionalIntents),requiredTypes:list(c.requiredTypes),needsClarification:c.needsClarification===true};
 // Accept only normalized enums and recognized signal values, never note text.
 const knownValues=new Set([...analysis.signals,...analysis.requiredSignals,...analysis.specificIntents,...analysis.optionalIntents,...analysis.exclusions,'preference_unknown']);
 analysis.noteConstraints=(Array.isArray(c.noteConstraints)?c.noteConstraints:[]).slice(0,80).filter(x=>x&&knownValues.has(x.value)&&['preference','request','requirement','exclusion','context','uncertain'].includes(x.type)).map(x=>({type:x.type,value:x.value,scope:'selected_interests',origin:x.origin==='refinement'?'refinement':'note',language:['it','en'].includes(x.language)?x.language:'und',status:x.status==='unknown'?'unknown':'interpreted'}));
 const profile={ageRange:p.ageRange,childStage:(p.ageRange==='child'?['middle','preteen','all']:['infant','toddler','preschool','all']).includes(p.childStage)?p.childStage:'all',budget:Number(p.budget),minBudget:Number(p.minBudget||0),interests,subinterests:subs,avoid:list(p.avoid),recipientPreference:['women','men'].includes(p.recipientPreference)?p.recipientPreference:'unisex',allowTypeBroadening:p.allowTypeBroadening===true};
 const effect=p.isRefinement&&p.refinementSurprise==='safe'?'useful':p.isRefinement&&p.refinementSurprise==='bold'?'surprising':analysis.signals.includes('calm')?'relax':['useful','sentimental','funny','surprising','elegant'].includes(p.tone)?p.tone:'any';
 // Public adult labels differ from the pilot's labels. No demographic inference.
 const age=['earlyChild','child','teen'].includes(p.ageRange)?p.ageRange:p.ageRange==='mature'?'senior':'adult';
 const context=c.recipientContext||{};
 const lexical=rules.m3Requirements(analysis.specificIntents);
 const lexicalContext=rules.m3ContextChecks(analysis.specificIntents);
 const connections=[...new Set([...list(context.connections,7),...rules.m3HostKeys(analysis.specificIntents).filter(k=>['usb_c','usb_a','bluetooth','jack_35'].includes(k))])];
 const deviceModel=/^iphone\s?\d{1,2}(?:\s?(?:pro|plus|max)){0,2}$/i.test(context.deviceModel||'')?context.deviceModel:'';
 const gift=giftContext(p),excludedFamilies=list(data.rejectedConcepts,120),seenFamilies=list(data.seenConcepts,120);
 const plan=planResearchAnswers({age,sex:profile.recipientPreference==='unisex'?'any':profile.recipientPreference,min:profile.minBudget,max:profile.budget,premium:true,interests,subcategories,effect,selectionHints:[...new Set([...gift.hints,...list(c.selectionHints,6)])],excludedFamilies,deprioritizedFamilies:p.isRefinement?seenFamilies:[],recipientContext:{deviceModel,connections}});
 // The same questionnaire's exclusions and note constraints apply before any
 // Amazon call, and again to the actual product text below.
 const stageMismatch=profile.ageRange==='earlyChild'&&profile.childStage!=='all'&&[...interests,...subs].some(id=>CHILD_STAGE_RULES[id]&&!CHILD_STAGE_RULES[id].includes(profile.childStage));
 let blocked=stageMismatch||allInterestsExcluded||analysis.needsClarification||lexicalContext.some(c=>c.status==='unknown')||!rules.typeEligible({type:'product'},profile,analysis)||(p.ageRange==='earlyChild'&&profile.childStage==='all');
 const queryAllowed=q=>{
  const tags=[...new Set(q.associations.flatMap(a=>[a.area,a.subId]))];
  const stub={name:q.keywords,title:q.keywords,tags,type:'product'};
  if(profile.ageRange==='unknown'&&rules.productConstraints(stub).wine)return false;
  // Size/space are assessed on the listing; other exclusions can prune queries.
  const listingOnly=['sizes','bulky','retinol','exfoliatingAcids','wifi','wirelessCharging','coolLight','subscription','fragranceFree','noRinse','nonGreasy','bookPhysical','bookItalian','bookSeries',...analysis.exclusions.filter(k=>k.startsWith('bookread:')),...(tags.includes('skincare')?['perfume']:[])];
  return !rules.violatesExclusions(stub,{...profile,avoid:profile.avoid.filter(x=>!listingOnly.includes(x))},{...analysis,specificIntents:analysis.specificIntents.filter(i=>!i.startsWith('m3:')),exclusions:analysis.exclusions.filter(x=>!listingOnly.includes(x))});
 };
 const compatibleQueries=plan.candidateQueries.filter(queryAllowed).filter(q=>profile.ageRange!=='earlyChild'||q.associations.every(a=>!CHILD_STAGE_RULES[a.subId]||CHILD_STAGE_RULES[a.subId].includes(profile.childStage)));
 const requestedProperties=rules.skincarePropertyQueries([...profile.avoid,...analysis.exclusions]);
 const preferredFamily=requestedProperties.some(p=>p.key==='noRinse')?'acque_micellari':requestedProperties.some(p=>p.key==='nonGreasy')?'creme_mani':null;
 const propertyQuery=preferredFamily&&compatibleQueries.find(q=>q.area==='styleBeauty'&&q.subId==='skincare'&&q.family===preferredFamily);
 const intentContext={profile,analysis,gift,effect};
 const prioritized=prioritizeIntentQueries(compatibleQueries,intentContext);
 const contextualQueries=contextualizeQueries(prioritized,gift,{refinement:p.isRefinement===true,effect});
 const probes=intentSearchProbes(prioritized,intentContext);
 // Event searches keep precedence; concise use probes run before generic
 // fallbacks. A probe can share a base query but never its evidence.
 const withProbes=[...contextualQueries.filter(q=>q.eventTargeted),...probes,...contextualQueries.filter(q=>!q.eventTargeted&&!probes.some(probe=>probe.id===q.id+'-intent'&&probe.searchKeywords===q.keywords))];
 let targetedQueries=propertyQuery?[propertyQuery,...withProbes.filter(q=>q.id!==propertyQuery.id)]:withProbes;
 // Optional lexical preferences target an existing selected scope, but do not
 // replace its other families or add a new interest. Matching stays unchanged.
 const optionalRows=rules.m3Requirements(analysis.optionalIntents);
 analysis.optionalIntents=optionalRows.filter(r=>!analysis.specificIntents.includes(r.id)).map(r=>r.id);
 const optionalQueries=optionalRows.flatMap(r=>{
  const base=compatibleQueries.find(q=>q.area===r.area&&q.subId===r.subId&&q.family===r.family);
   return base?[{...base,id:base.id+':optional:'+r.id,searchKeywords:r.it,optionalTermId:r.id,...(r.type==='book'?{keywords:r.base,originalKeyword:r.base,lexicalTermIds:[r.id],lexicalIntents:analysis.specificIntents}: {})}]:[];
 });
 targetedQueries=[...optionalQueries,...targetedQueries];
 if(lexical.length){
  const groups=[...new Set(lexical.map(r=>r.area+':'+r.subId+':'+r.family))].map(key=>lexical.filter(r=>r.area+':'+r.subId+':'+r.family===key));
  const derived=groups.flatMap(rows=>{
   const r=rows[0],base=compatibleQueries.find(q=>q.area===r.area&&q.subId===r.subId&&q.family===r.family);
   if(!base){blocked=true;return [];}
   const q={...base,id:base.id+':'+rows.map(r=>r.id).join(':'),keywords:r.base,originalKeyword:r.base,searchKeywords:rows.map(r=>r.it).join(' '),intentDecision:null,lexicalTermIds:rows.map(r=>r.id),lexicalIntents:analysis.specificIntents,associations:base.associations.filter(a=>a.area===r.area&&a.subId===r.subId&&a.family===r.family)};
   if(!queryAllowed(q)){blocked=true;return [];}
   return [q];
  });
  // A specific family request cannot silently fall back to another product in
  // the same subcategory. Other selected interests/subcategories keep their turn.
  targetedQueries=[...derived,...targetedQueries.filter(q=>!lexical.some(r=>q.associations.some(a=>a.area===r.area&&a.subId===r.subId)))];
 }
 const queries=targetedQueries.map(q=>{
  // Search targeting is never copied into product age evidence or matching keywords.
  if(q.associations.some(a=>a.area==='styleBeauty'&&a.subId==='skincare')){
   const required=rules.skincarePropertyQueries([...profile.avoid,...analysis.exclusions]);
   if(required.length)q={...q,searchKeywords:[q.searchKeywords||q.keywords,...required.map(p=>p.term)].join(' '),requiredListingProperties:required.map(p=>p.key)};
  }
  if(!['earlyChild','child'].includes(profile.ageRange))return q;
  const words=q.searchKeywords||q.keywords;
  const agePhrase=profile.ageRange==='child'?(profile.childStage==='preteen'?'dai 10 anni':'dai 7 anni'):{infant:'dalla nascita',toddler:'da 12 mesi',preschool:'dai 3 anni'}[profile.childStage];
  return agePhrase&&!/\b\d+\s*(?:anni|mesi)\b|neonat|nascita/i.test(words)?{...q,searchKeywords:words+' '+agePhrase,ageTargeted:true}:q;
 });
 plan.queries=blocked?[]:queries.slice(0,RESEARCH_LIMITS.initialQueries);
 plan.fallbackQueries=blocked?[]:queries.slice(RESEARCH_LIMITS.initialQueries,RESEARCH_LIMITS.maxRequests);
 plan.ranking=rankingProfile(analysis,gift,effect);
 return {plan,profile,analysis,blocked,stageMismatch,lexicalContext,gift,seenFamilies:new Set(seenFamilies),rejectedAsins:new Set(list(data.rejectedAsins,24)),rejectedBookKeys:new Set(list(data.rejectedBookKeys,120).filter(k=>/^book(?:work|series|isbn|title):/.test(k))),rejectedParentAsins:new Set(list(data.rejectedParentAsins,24)),rejectedConcepts:new Set(excludedFamilies),refinement:p.isRefinement===true};
}

export function publicCandidate(product,ctx,diagnostics=null){
 const reject=reason=>{if(diagnostics)diagnostics[reason]=(diagnostics[reason]||0)+1;return null;};
 const queries=[...ctx.plan.queries,...ctx.plan.fallbackQueries].filter(q=>product.researchQueryIds?.includes(q.id)&&matchResearchProduct(product,q));
 const tags=[...new Set(queries.flatMap(q=>q.associations.flatMap(a=>[a.area,a.subId])))];
 const text=normalizeText(product.title+' '+(product.features||''));
 const deviceTitle=normalizeText(product.title),deviceType=primaryProductType(product.title);
 // Explicit birthday numerals in the title identify the offered variant.
 // Do not interpret a number in a book title as the recipient's age.
 const birthdayAges=[...String(product.title||'').matchAll(/\b(\d{1,3})\s*(?:[°ºª]|(?:st|nd|rd|th))?\s*(?:compleanno|birthday)\b/gi)].map(m=>Number(m[1]));
 const recipientBand={teen:[13,17],youngAdult:[18,34],adult:[35,54],mature:[55,130]}[ctx.profile.ageRange];
 if(recipientBand&&birthdayAges.length&&birthdayAges.every(age=>age<recipientBand[0]||age>recipientBand[1]))return reject('birthday_age_conflict');
 const childTitle=/\b(?:tablet|smartphone|computer|notebook)\s+(?:per\s+)?(?:bambin\w*|kids|children)\b|\b(?:kids|children)\s+(?:tablet|computer|laptop)\b/.test(deviceTitle)||['smartphone','tablet','laptop'].includes(deviceType)&&[...deviceTitle.matchAll(/\b(?:per (?:i |le |gli )?(?:bambin\w*|bimbi)|for (?:kids|children))\b/g)].some(m=>! /\b(?:non|not|no)\b/.test(deviceTitle.slice(0,m.index).split(' ').slice(-3).join(' ')));
 if(['youngAdult','adult','mature'].includes(ctx.profile.ageRange)&&childTitle)return reject('child_device_for_adult');
 // A generic noun or an advertising word cannot satisfy an explicit mood
 // obligation. Soft requests are ranked separately from hard requirements.
 if(/organizz|organizer|supporto|borraccia|agenda|taccuino|strument/.test(text))tags.push('practical');
 if(/personalizza|incision|inciso|personalized/.test(text))tags.push('personalized');
 const p={...product,id:product.asin,name:product.title,store:'Amazon',type:'product',tags,priceStatus:'amazon-api',amazonPrice:true,amazonCheckedAt:product.observedAt||new Date().toISOString(),imageUrl:product.image||'',imageSource:'Amazon',directUrl:product.url,why:product.reason||'',query:product.queries?.[0]||'',macro:queries[0]?.from?.[0]||'',subcategory:queries[0]?.from?.[1]||'',conceptFamily:queries[0]?researchFamilyId(queries[0].area,queries[0].family):''};
 p.recipientTarget=rules.productRecipientTarget(p);
 const preference=contextPreference(p,ctx.gift,ctx.plan.effect);
 if(ctx.plan.effect==='relax'&&preference.contextEvidence?.effect.status==='supported')tags.push('calm');
 p.preferenceScore=preference.score+(ctx.refinement&&!ctx.seenFamilies.has('concept:'+p.conceptFamily)?4:0);
 p.contextMatches=preference.matches;
 p.eventPriorityScore=preference.eventPriorityScore;
 p.eventEvidence=preference.eventEvidence;
 p.occasionUse=preference.occasionUse;
 p.contextEvidence=preference.contextEvidence;
 // Product-card age notes describe evidence; they never manufacture a verified
 // ageSuitability object from an Amazon title.
 if(['earlyChild','child'].includes(ctx.profile.ageRange)){
  const lower=ctx.profile.ageRange==='child'?(ctx.profile.childStage==='preteen'?10:7):{infant:0,toddler:1,preschool:3}[ctx.profile.childStage];
  const upper=ctx.profile.ageRange==='child'?(ctx.profile.childStage==='middle'?9:12):{infant:1,toddler:2,preschool:6}[ctx.profile.childStage];
  const range=declaredAgeRange(product);
  if(range.conflict)return reject('age_evidence_conflict');
  if(range.maximumMonths!==null&&range.maximumMonths<upper*12)return reject('age_range_too_young');
  const minimum=range.minimumMonths===null?null:range.minimumMonths/12;
  if(!Number.isFinite(minimum)){
   const reviewable=ctx.allowAgeReview===true&&ctx.profile.ageRange==='child'&&/^(?:book|books|libro|libri)$/i.test(product.productGroup||'')&&queries.some(q=>q.area==='kidsBooks')&&range.maximumMonths===null;
   if(!reviewable)return reject('age_evidence_missing');
   p.ageVerification='required';
   p.ageNotice='Età consigliata non indicata chiaramente: verifica su Amazon o sul sito dell’editore prima dell’acquisto.';
  }else p.ageVerification='declared';
  if(minimum>lower)return reject('minimum_age_above_cohort_start');
 }
 if(!tags.length)return reject('product_query_mismatch');
 p.listingPropertyEvidence=rules.skincarePropertyChecks(p,[...ctx.profile.avoid,...ctx.analysis.exclusions]);
 p.lexicalEvidence=rules.m3ProductChecks(p,ctx.analysis.specificIntents);
 p.optionalLexicalEvidence=ctx.plan.ranking.optionalIntents.map(id=>({signal:id,checks:rules.m3ProductChecks(p,[id])}));
 if(p.lexicalEvidence.some(c=>c.status!=='supported_by_listing'))return reject('required_lexical_property_missing_or_conflicting');
 if(p.listingPropertyEvidence.some(c=>c.status!=='supported_by_listing'))return reject('required_skincare_property_missing_or_conflicting');
 if(ctx.rejectedAsins.has(p.asin)||ctx.rejectedParentAsins.has(p.parentAsin)||rules.productConceptKeys(p).some(k=>ctx.rejectedConcepts.has(k)))return reject('previously_rejected');
 if(rules.bookIdentity(p)?.keys.some(k=>ctx.rejectedBookKeys?.has(k)))return reject('previously_rejected_book');
 if(!rules.marketplaceEligible(p))return reject('marketplace');
 if(!rules.recipientEligible(p,ctx.profile))return reject('recipient');
 if(!rules.editorialEligible(p,ctx.profile,ctx.analysis))return reject('editorial_explicit_content_without_adult_preference');
 if(rules.violatesExclusions(p,ctx.profile,ctx.analysis))return reject('exclusions');
 if(!rules.typeEligible(p,ctx.profile,ctx.analysis))return reject('product_type');
 if(!rules.interestEligible(p,ctx.profile,ctx.analysis))return reject('interests');
 if(ctx.profile.ageRange==='unknown'&&rules.productConstraints(p).wine)return reject('unknown_age_alcohol');
 return p;
}

let active=0;
async function searchAmazon(query,ctx,env,deadline,metrics){
 return amazonApi('searchItems',{keywords:query.searchKeywords||query.keywords,searchIndex:'All',condition:'New',marketplace:'www.amazon.it',partnerTag:env.AMAZON_PARTNER_TAG,itemCount:10,...(query.min>0?{minPrice:Math.round(query.min*100)}:{}),maxPrice:Math.round(query.max*100),resources:['itemInfo.title','itemInfo.features',...(['kidsBooks','earlyBooks'].includes(query.area)||query.associations?.some(a=>a.area==='culture'&&['books','comics'].includes(a.subId))||/^(?:libri?|romanz[oi]|fumetti?|manga|enciclopedi)/i.test(query.keywords)?['itemInfo.classifications','itemInfo.byLineInfo','itemInfo.contentInfo','itemInfo.externalIds']:[]),...(ctx.plan.profile.age!=='adult'?['itemInfo.productInfo']:[]),'images.primary.medium','parentASIN','offersV2.listings.price','offersV2.listings.availability','offersV2.listings.isBuyBoxWinner']},env,deadline,metrics);
}
// Round-robin interests before additional alternatives.
export function efficientQueries(plan){
 const pending=[...plan.queries,...plan.fallbackQueries],ordered=[];
 while(pending.length){
  for(const area of plan.interests){
   const index=pending.findIndex(q=>q.area===area);if(index<0)continue;
   const [q]=pending.splice(index,1);ordered.push(q);
  }
  if(pending.length&&!pending.some(q=>plan.interests.includes(q.area)))break;
 }
 return ordered;
}
const queryScopes=q=>q.associations?.length?q.associations:[{area:q.area,subId:q.subId}];
const queryFamilyKey=q=>JSON.stringify([q.area,q.subId,q.family||q.id]);
const targetedQuery=q=>!!(q.lexicalTermIds?.length||q.optionalTermId||q.requiredListingProperties?.length||q.contextual||q.qualityProbe);
// Reorder the existing bounded plan using only the current search's evidence.
// No query is removed; an unsuccessful family is still available if needed.
export function nextResearchQuery(pending,plan,selected,observations=[],{diversify=false}={}){
 if(!pending.length)return null;
 const products=selected.products||[];
 const missingAreas=plan.interests.filter(area=>!products.some(p=>p.areas?.includes(area)));
 const requested=Object.entries(plan.subcategories||{}).flatMap(([area,subs])=>subs.map(sub=>({area,sub})));
 const missingSubs=requested.length<=3?requested.filter(({area,sub})=>!products.some(p=>p.areas?.includes(area)&&p.tags?.includes(sub))):[];
 // A failed targeted search does not predict failure of its broader base query.
 const lastFamily=new Map(observations.filter(o=>!targetedQuery(o.query)).map(o=>[queryFamilyKey(o.query),o.gained]));
 const ranked=pending.map((query,index)=>{
  const scopes=queryScopes(query);
  const missingArea=scopes.some(s=>missingAreas.includes(s.area));
  const missingSub=scopes.some(s=>missingSubs.some(m=>m.area===s.area&&m.sub===s.subId));
  const coverage=missingArea?0:missingSub?1:2;
  // Preserve explicit requirements, optional-note targeting and contextual
  // queries within the same coverage need before generic exploration.
  const targeted=targetedQuery(query);
  const stalled=!targeted&&lastFamily.get(queryFamilyKey(query))===false;
  const freshFamily=diversify&&scopes.some(s=>s.area===query.area&&s.subId===query.subId)&&!products.some(p=>p.conceptFamily===researchFamilyId(query.area,query.family));
  return {query,index,coverage,stalled,missingArea,missingSub,freshFamily};
 }).sort((a,b)=>a.coverage-b.coverage||Number(b.freshFamily)-Number(a.freshFamily)||Number(a.stalled)-Number(b.stalled)||a.index-b.index);
 const chosen=ranked[0];
 return {query:chosen.query,index:chosen.index,reason:chosen.missingArea?'missing_interest':chosen.missingSub?'missing_subcategory':chosen.freshFamily?'explore_family_variety':chosen.index>0?'explore_after_no_gain':'planned_order',missingAreas,missingSubcategories:missingSubs};
}
export function needsFamilyExploration(selected,plan,pending=[]){
 if(!plan.ranking||selected.products.length!==3)return false;
 const families=new Set(selected.products.map(p=>p.conceptFamily));
 if(families.size!==1)return false;
 const family=[...families][0];
 if(!family?.startsWith('culture:')||!selected.products.every(p=>p.tags?.includes('books')))return false;
 return pending.some(q=>q.area==='culture'&&q.subId==='books'&&researchFamilyId(q.area,q.family)!==family);
}
export function sufficientIdeas(selected,plan,pending=[],{diversitySearches=0}={}){
 if(selected.products.length!==3||selected.missing.length)return false;
 // Do not stop on three generic ideas before the scheduled occasion search.
 if(plan.ranking?.eventFirst&&pending.some(q=>q.eventTargeted))return false;
 if(pending.some(q=>q.qualityProbe))return false;
 if(diversitySearches<2&&needsFamilyExploration(selected,plan,pending))return false;
 const requested=Object.entries(plan.subcategories||{}).flatMap(([area,subs])=>subs.map(sub=>[area,sub]));
 // Up to three requested subcategories can be represented by three cards.
 return requested.length>3||requested.every(([area,sub])=>selected.products.some(p=>p.areas?.includes(area)&&p.tags?.includes(sub)));
}
export function occasionCoverage(products,context,searches=[]){
 if(!context.eventFirst)return {status:'not_prioritized',occasion:context.originalOccasion,selected:products.length,supported:0,targetedSearches:0};
 const supported=products.filter(p=>p.eventEvidence?.status==='supported').length;
 return {status:!products.length?'no_products':supported===products.length?'supported':supported?'partial':'absent',occasion:context.occasion,selected:products.length,supported,targetedSearches:searches.filter(s=>s.eventTargeted).length,source:'listing_title_features',humanValidated:false};
}
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// withCandidates: engine v3 also receives every listing that passed the public filters, for Claude to judge.
export async function publicRecommendation(request,env,{withCandidates=false}={}){
 if(request.method!=='POST')return respond({code:'MethodNotAllowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return respond({code:'OriginNotAllowed'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return respond({code:'InvalidContentType'},415);
 if(Number(request.headers.get('Content-Length'))>12000)return respond({code:'RequestTooLarge'},413);
 let ctx;try{const raw=await request.text();if(raw.length>12000)return respond({code:'RequestTooLarge'},413);ctx=publicPlan(JSON.parse(raw));}catch{return respond({code:'InvalidProfile'},400);}
 const base={method:METHOD_VERSION,methodRevision:RANKING_VERSION,queryStrategy:QUERY_STRATEGY_VERSION,rankingPolicy:ctx.plan.ranking,noteConstraints:ctx.analysis.noteConstraints,reviewData:'not_connected',effectiveMin:ctx.plan.profile.effectiveMin};
 if(ctx.blocked||!ctx.plan.queries.length)return respond({...base,products:[],code:ctx.blocked?'ConstraintsNeedReview':'NoCompatibleQueries',searched:0,...(ctx.stageMismatch?{reason:'ChildStageMismatch'}:{}),efficiency:{amazonCalls:0,cacheHits:0,stopReason:'preflight'}});
 if(active>=4)return respond({...base,code:'SearchBusy'},429);
 active++;const started=Date.now(),deadline=started+RESEARCH_LIMITS.maxSeconds*1000,groups=[],searches=[],normalization=[];let searched=0,failures=0,received=0,diversitySearches=0,stopReason='exhausted';const metrics={amazonCalls:0,cacheHits:0},failureReasons=[];
 const select=(allowAgeReview=false)=>selectResearchIdeas(mergeCandidates(groups).map(p=>publicCandidate(p,{...ctx,allowAgeReview})).filter(Boolean),ctx.plan);
 try{
  let selected=select();
  const pending=efficientQueries(ctx.plan),observations=[];
  while(pending.length){
   if(sufficientIdeas(selected,ctx.plan,pending,{diversitySearches})){stopReason='sufficient';break;}
   if(Date.now()+1000>=deadline){stopReason='deadline';break;}
   const diversify=diversitySearches<2&&needsFamilyExploration(selected,ctx.plan,pending)&&sufficientIdeas(selected,ctx.plan,pending,{diversitySearches:2});
   if(diversify)diversitySearches++;
   const decision=nextResearchQuery(pending,ctx.plan,selected,observations,{diversify}),q=pending.splice(decision.index,1)[0];
   const before=new Set(selected.products.map(p=>p.asin));
   const trace={queryId:q.id,keywords:q.searchKeywords||q.keywords,associations:q.associations,contextual:q.contextual===true,eventTargeted:q.eventTargeted===true,qualityProbe:q.qualityProbe===true,contextRule:q.contextRule||null,priorityReason:decision.reason,missingAreasBefore:decision.missingAreas,missingSubcategoriesBefore:decision.missingSubcategories};
   searched++;searches.push(trace);
   try{const observation=await searchAmazon(q,ctx,env,deadline,metrics);if(observation.partial){failures++;failureReasons.push('upstream_item_errors');}received+=observation.data.searchResult.items?.length||0;groups.push(normalizeCandidates(observation.data,q,ctx.plan.profile,normalization).map(p=>({...p,observedAt:observation.observedAt})));selected=select();
    const gained=selected.products.some(p=>!before.has(p.asin));observations.push({query:q,gained});trace.selectionChanged=gained;trace.selectedAfter=selected.products.length;
   }
   catch(e){failures++;failureReasons.push(/^(upstream_\d{3}|invalid_response|ConfigurationMissing|AuthenticationFailed|daily_quota_exhausted|request_quota_exhausted|quota_storage_unavailable|quota_configuration_invalid)$/.test(e.message)?e.message:/timeout/i.test(e.message)?'timeout':'upstream_unavailable');stopReason='upstream_error';break;}
  }
  console.info(JSON.stringify({event:'amazon_recommendation',durationMs:Date.now()-started,searched,...metrics,stopReason,failureReasons}));
  // Exhaust the bounded search for age-documented ideas before allowing book alternatives.
  selected=select(true);
  const finalContext={...ctx,allowAgeReview:true};
  const merged=mergeCandidates(groups),filterRejections={};
  const publicDecisions=[];
  const diagnosticEligible=merged.map(p=>{const reasons={};const candidate=publicCandidate(p,finalContext,reasons);for(const [reason,n] of Object.entries(reasons))filterRejections[reason]=(filterRejections[reason]||0)+n;if(!candidate)publicDecisions.push({asin:p.asin,status:'rejected',stage:'public_filters',reason:Object.keys(reasons)[0]});return candidate;}).filter(Boolean);
  const diagnostics={durationMs:Date.now()-started,normalization,failureReasons,receivedRows:received,normalizedRows:groups.reduce((n,g)=>n+g.length,0),uniqueCandidates:merged.length,eligibleAfterPublicFilters:diagnosticEligible.length,finalSelection:[...publicDecisions,...selected.finalSelection],ageReviewCandidates:diagnosticEligible.filter(p=>p.ageVerification==='required').length,filterRejections};
  const products=selected.products.map(p=>publicCandidate({...merged.find(x=>x.asin===p.asin),...p},finalContext)).filter(Boolean).map(({queries,researchQueryIds,checks,verifiedListingChecks,requirementsToVerify,...p})=>({...p,why:p.reason+(p.ageNotice?' '+p.ageNotice:''),url:(()=>{const u=new URL(p.url);u.searchParams.set('tag',env.AMAZON_PARTNER_TAG);return u.href;})()}));
  const tagged=u=>{const x=new URL(u);x.searchParams.set('tag',env.AMAZON_PARTNER_TAG);return x.href;};
  const candidates=withCandidates?diagnosticEligible.slice(0,30).map(({queries,researchQueryIds,checks,verifiedListingChecks,requirementsToVerify,...p})=>({...p,why:p.reason+(p.ageNotice?' '+p.ageNotice:''),url:tagged(p.url)})):undefined;
  return respond({...base,products,...(candidates?{candidates}:{}),searched,received,searches,occasionCoverage:occasionCoverage(products,ctx.gift,searches),context:{relation:ctx.gift.relation,occasion:ctx.gift.originalOccasion,searchPriority:ctx.gift.searchPriority},missingAreas:selected.missing,partial:failures>0||stopReason==='deadline',efficiency:{...metrics,diversitySearches,stopReason},diagnostics,checkedAt:new Date().toISOString(),code:failures&&!products.length?'AmazonTemporarilyUnavailable':products.length?'Results':'NoCompatibleProducts'},failures&&!products.length?503:200);
 }finally{active--;}
}
