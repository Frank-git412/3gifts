// Engine v2: picks three gift ideas from the approved library and the products matched to it.
// It answers in the same shape as /api/amazon/recommend, so the questionnaire needs no changes,
// and it never calls Amazon while the visitor waits: prices come from the hourly library job.
const V2_DAY=86400000;
const ADULT_AGES=['youngAdult','adult','mature'];

function v2Json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function list(value){return Array.isArray(value)?value.filter(x=>typeof x==='string'):[];}

// Hard constraints: anything that fails here is never shown, whatever its score.
export function v2Eligible(concept,profile){
 const age=profile.ageRange&&profile.ageRange!=='unknown'?profile.ageRange:null;
 if(age?!concept.ages.includes(age):!concept.ages.some(a=>ADULT_AGES.includes(a)))return false;
 if(age==='earlyChild'&&['infant','toddler','preschool'].includes(profile.childStage)&&!(concept.stages||[]).includes(profile.childStage))return false;
 if(profile.relation&&!concept.relations.includes(profile.relation))return false;
 const sex=profile.recipientPreference;
 if(concept.gender!=='any'&&concept.gender!==sex)return false;
 const avoid=new Set(list(profile.avoid));
 if(avoid.has('foodAlcohol')){avoid.add('food');avoid.add('alcohol');}
 if(concept.avoidFlags.some(flag=>avoid.has(flag)))return false;
 if(avoid.has('subscriptions')&&concept.kind==='subscription')return false;
 if(avoid.has('experiences')&&concept.kind==='experience')return false;
 if(list(profile.excludedInterests).some(i=>concept.interests.includes(i)))return false;
 return true;
}

// Soft preferences: interests weigh most, then the effect wanted, then the occasion.
export function v2Score(concept,profile){
 const subs=list(profile.subinterests),areas=list(profile.interests);
 const subHits=concept.subinterests.filter(s=>subs.includes(s)).length;
 const areaHits=concept.interests.filter(i=>areas.includes(i)).length;
 const interest=Math.min(2,subHits)*3+Math.min(2,areaHits)*2;
 const tone=profile.tone&&profile.tone!=='neutral'&&concept.tones.includes(profile.tone)?2:0;
 const occasion=concept.occasions.includes(profile.occasion)?1.5:concept.occasions.includes('any')?1:0;
 return {score:interest+tone+occasion,interestMatch:interest>0,toneMatch:tone>0};
}

// Stable per-profile tie-break, so equal scores do not always surface the same ideas.
function tieBreak(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

export function v2Select(concepts,productsByConcept,profile,rejectedAsins=[]){
 const max=Number(profile.budget)||50,min=Math.max(0,Number(profile.minBudget)||0);
 const rejected=new Set(rejectedAsins);
 // A refinement asks for new ideas: concepts whose products were already shown are left out.
 const seen=new Set(concepts.filter(c=>(productsByConcept.get(c.id)||[]).some(p=>rejected.has(p.asin))).map(c=>c.id));
 const key=JSON.stringify([profile.relation,profile.occasion,profile.ageRange,list(profile.interests),profile.tone,max]);
 const candidates=[];
 for(const concept of concepts){
  if(seen.has(concept.id)||!v2Eligible(concept,profile))continue;
  const product=(productsByConcept.get(concept.id)||[]).find(p=>p.price>=min&&p.price<=max&&!rejected.has(p.asin));
  if(!product)continue;
  const fit=v2Score(concept,profile);
  candidates.push({concept,product,...fit,tie:tieBreak(concept.id+key)});
 }
 const wantsInterests=list(profile.interests).length>0;
 // Ideas outside the chosen interests are used only to complete the three, never ahead of a match.
 const ordered=candidates.sort((a,b)=>(b.interestMatch-a.interestMatch)||(b.score-a.score)||(a.tie-b.tie));
 const picked=[],usedAreas=new Set();
 // Matching ideas from different areas first, then other matching ideas, then anything eligible.
 const passes=[c=>c.interestMatch&&!c.concept.interests.some(i=>usedAreas.has(i)),c=>c.interestMatch,c=>!c.concept.interests.some(i=>usedAreas.has(i)),()=>true];
 for(const allowed of passes){
  for(const c of ordered){
   if(picked.length===3)break;
   if(picked.includes(c)||!allowed(c))continue;
   picked.push(c);c.concept.interests.forEach(i=>usedAreas.add(i));
  }
 }
 return picked.map(c=>({...c,outsideInterests:wantsInterests&&!c.interestMatch}));
}

function v2Product(pick,checkedAt){
 const {concept,product}=pick;
 const minor=concept.ages.some(a=>a==='earlyChild'||a==='child');
 const why=pick.outsideInterests?'Un’idea fuori dagli interessi indicati, scelta per l’occasione e la persona. '+concept.whyItWorks:concept.whyItWorks;
 return {id:product.asin,asin:product.asin,parentAsin:product.parentAsin||null,title:product.title,name:product.title,store:'Amazon',type:'product',
  price:product.price,priceStatus:'amazon-api',amazonPrice:true,amazonCheckedAt:checkedAt(product),observedAt:checkedAt(product),
  url:product.detailUrl,directUrl:product.detailUrl,image:product.imageUrl||'',imageUrl:product.imageUrl||'',imageSource:product.imageUrl?'Amazon':'',
  tags:[...concept.interests,...concept.subinterests],areas:concept.interests,why,macro:concept.title,subcategory:'',query:concept.amazonQuery,
  conceptId:concept.id,conceptTitle:concept.title,features:'',
  // The library matches products by concept, not by a verified age label: children's ideas ask for a check.
  ...(minor?{ageVerification:'required'}:{})};
}

export async function recommendV2(request,env,concepts,now=Date.now()){
 if(request.method!=='POST')return v2Json({code:'MethodNotAllowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return v2Json({code:'OriginNotAllowed'},403);
 let body;try{body=await request.json();}catch{return v2Json({code:'InvalidProfile'},400);}
 const profile=body?.profile;
 if(!profile||typeof profile!=='object'||!profile.relation||!profile.occasion)return v2Json({code:'InvalidProfile'},400);
 if(!env.DB)return v2Json({code:'LibraryUnavailable'},503);
 const rows=(await env.DB.prepare('SELECT concept_id,asin,parent_asin,title,price,image_url,detail_url,checked_at FROM library_products WHERE available=1 AND price IS NOT NULL AND checked_at>? ORDER BY concept_id,rank').bind(now-V2_DAY).all()).results||[];
 const productsByConcept=new Map();
 for(const r of rows){if(!productsByConcept.has(r.concept_id))productsByConcept.set(r.concept_id,[]);productsByConcept.get(r.concept_id).push({asin:r.asin,parentAsin:r.parent_asin,title:r.title,price:r.price,imageUrl:r.image_url,detailUrl:r.detail_url,checkedAt:r.checked_at});}
 const picks=v2Select(concepts,productsByConcept,profile,list(body.rejectedAsins));
 const checkedAt=p=>new Date(p.checkedAt).toISOString();
 return v2Json({method:'research-20261007',methodRevision:'library-v2',engine:'library-v2',products:picks.map(p=>v2Product(p,checkedAt)),partial:picks.length<3,checkedAt:new Date(now).toISOString()});
}
