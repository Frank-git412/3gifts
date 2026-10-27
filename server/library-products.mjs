import {amazonApi} from './amazon-transport.mjs';
import {claudeJson} from './claude.mjs';
// Matches approved library concepts to Amazon products and keeps their data fresh.
// Only ASINs are durable: Amazon titles, prices and images are refreshed daily and
// cleared once older than 24 hours, as the Associates policies require.
const LIBRARY_DAY=86400000;
const MATCH_EVERY=7*LIBRARY_DAY,REFRESH_AFTER=20*3600000;
// A concept whose search fails is retried a day later instead of blocking the queue.
const RETRY_AFTER_ERROR=LIBRARY_DAY;
// Matches made before the current selection rules are redone (recipient and drinking filters, 5 products).
const MATCH_RULES_SINCE=Date.parse('2026-10-26T22:00:00Z');
const REVIEWS_PER_RUN=10;
const MATCHES_PER_RUN=12,REFRESH_BATCHES_PER_RUN=6,PRODUCTS_PER_CONCEPT=5;
const LIBRARY_RESOURCES=['itemInfo.title','images.primary.large','parentASIN','offersV2.listings.price','offersV2.listings.availability','offersV2.listings.isBuyBoxWinner'];
// Accessories, spare parts and second-hand listings are not gifts in their own right.
const NOT_A_GIFT=/\b(?:ricambi?|sostituzione|di ricambio|compatibile con|pellicola|adesiv[oi]|usat[oa]|ricondizionat[oa]|cover per|custodia per)\b/i;

function libraryOffer(item){
 const listings=(item.offersV2?.listings||[]).filter(l=>!l.violatesMAP&&l.price?.money?.currency==='EUR'&&Number(l.price.money.amount)>0);
 const listing=listings.find(l=>l.isBuyBoxWinner)||listings[0];
 if(!listing)return null;
 const availability=String(listing.availability?.type||'').replaceAll('_','').toUpperCase();
 return {price:Number(listing.price.money.amount),available:['INSTOCK','INSTOCKSCARCE'].includes(availability)};
}
function libraryImage(item){
 try{const u=new URL(item.images?.primary?.large?.url);if(u.protocol==='https:'&&u.hostname.endsWith('.media-amazon.com'))return u.href;}catch{}
 return null;
}
function libraryDetailUrl(item){
 try{const u=new URL(item.detailPageURL);if(u.protocol==='https:'&&u.hostname==='www.amazon.it'&&!u.username&&!u.password)return u.href;}catch{}
 return null;
}
// Who a listing is made for, read from its title. A title naming both ("lui e lei") targets neither.
const FOR_MEN=/\b(?:uomo|uomini|maschile|maschio|per lui|men'?s?)\b/i;
const FOR_WOMEN=/\b(?:donna|donne|femminile|per lei|ragazza|women'?s?|lady)\b/i;
const FOR_KIDS=/\b(?:bambin[oie]|bimb[oie]|neonat[oie]|kids?|junior|infanzia|cameretta)\b/i;
const ALSO_ADULTS=/\b(?:adult[oie]?|adults?|tutta la famiglia)\b/i;
const DRINKING=/\b(?:bere|alcolic[io]|alcol|drinking|drink|shot|ubriac\w*|sbronz\w*)\b/i;
export function productTarget(title){
 const t=String(title||''),men=FOR_MEN.test(t),women=FOR_WOMEN.test(t);
 return {gender:men&&!women?'men':women&&!men?'women':null,kids:FOR_KIDS.test(t)&&!ALSO_ADULTS.test(t),drinking:DRINKING.test(t)};
}
// The same rules decide at matching time, in engine v2 and in the guides, so products already stored
// before a rule existed are held back too. recipient is 'women', 'men' or anything else for unknown.
export function productAllowed(title,concept,recipient){
 const target=productTarget(title);
 const ages=concept.ages||[],childIdea=ages.some(a=>a==='earlyChild'||a==='child'||a==='teen')||(concept.occasions||[]).includes('newbaby');
 if(target.kids&&!childIdea)return false;
 if(target.drinking&&!(concept.avoidFlags||[]).includes('alcohol'))return false;
 const wanted=concept.gender&&concept.gender!=='any'?concept.gender:recipient==='women'||recipient==='men'?recipient:null;
 if(wanted&&target.gender&&target.gender!==wanted)return false;
 return true;
}
// Amazon's relevance order is kept; we only drop what is not a giftable, available, in-budget product.
export function selectLibraryProducts(items,concept){
 const min=concept.price.min*0.8,max=concept.price.max*1.2,seen=new Set(),out=[];
 for(const item of items||[]){
  const title=String(item.itemInfo?.title?.displayValue||'').trim();
  if(!/^[A-Z0-9]{10}$/.test(item.asin||'')||!title||NOT_A_GIFT.test(title)||!productAllowed(title,concept))continue;
  const offer=libraryOffer(item),detailUrl=libraryDetailUrl(item);
  if(!offer?.available||offer.price<min||offer.price>max||!detailUrl)continue;
  const family=/^[A-Z0-9]{10}$/.test(item.parentASIN||'')?item.parentASIN:item.asin;
  if(seen.has(family))continue;
  seen.add(family);
  out.push({asin:item.asin,parentAsin:family===item.asin?null:family,title,price:offer.price,imageUrl:libraryImage(item),detailUrl});
  if(out.length===PRODUCTS_PER_CONCEPT)break;
 }
 return out;
}
async function matchConcept(concept,env,now){
 const {data}=await amazonApi('searchItems',{keywords:concept.amazonQuery,searchIndex:'All',condition:'New',marketplace:'www.amazon.it',partnerTag:env.AMAZON_PARTNER_TAG,itemCount:10,minPrice:Math.round(concept.price.min*80),maxPrice:Math.round(concept.price.max*120),resources:LIBRARY_RESOURCES},env,Date.now()+20000,{});
 const picked=selectLibraryProducts(data.searchResult?.items,concept);
 await env.DB.batch([
  env.DB.prepare('DELETE FROM library_products WHERE concept_id=?').bind(concept.id),
  ...picked.map((p,i)=>env.DB.prepare('INSERT INTO library_products (concept_id,asin,rank,parent_asin,title,price,image_url,detail_url,available,matched_at,checked_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)').bind(concept.id,p.asin,i+1,p.parentAsin,p.title,p.price,p.imageUrl,p.detailUrl,now,now)),
  env.DB.prepare('INSERT INTO library_matches (concept_id,matched_at,outcome,products) VALUES (?,?,?,?) ON CONFLICT(concept_id) DO UPDATE SET matched_at=excluded.matched_at,outcome=excluded.outcome,products=excluded.products').bind(concept.id,now,picked.length?'matched':'empty',picked.length)
 ]);
 return picked.length;
}
async function refreshProducts(asins,env,now){
 const {data}=await amazonApi('getItems',{itemIds:asins,itemIdType:'ASIN',marketplace:'www.amazon.it',partnerTag:env.AMAZON_PARTNER_TAG,resources:LIBRARY_RESOURCES},env,Date.now()+20000,{});
 const found=new Map((data.itemsResult?.items||[]).map(item=>[item.asin,item]));
 await env.DB.batch(asins.map(asin=>{
  const item=found.get(asin),offer=item&&libraryOffer(item);
  // An ASIN missing from the answer is not proof it is gone: keep it, unavailable and without
  // Amazon content (nothing was refreshed), until the next check.
  if(!item)return env.DB.prepare('UPDATE library_products SET title=NULL,price=NULL,image_url=NULL,available=0,checked_at=? WHERE asin=?').bind(now,asin);
  return env.DB.prepare('UPDATE library_products SET title=?,price=?,image_url=?,detail_url=COALESCE(?,detail_url),available=?,checked_at=? WHERE asin=?')
   .bind(String(item.itemInfo?.title?.displayValue||'').trim()||null,offer?.price??null,libraryImage(item),libraryDetailUrl(item),offer?.available?1:0,now,asin);
 }));
}
// One run: clear expired Amazon content, match a few concepts, refresh the oldest products.
// Quota and rate limiting stay with amazonApi, shared with the public questionnaire.
export async function runLibraryJob(env,concepts,now=Date.now()){
 if(!env.DB)return {matched:0,empty:0,refreshed:0,errors:['quota_storage_unavailable']};
 const report=await libraryJobSteps(env,concepts,now);
 await env.DB.prepare('INSERT INTO library_runs (id,ran_at,report) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET ran_at=excluded.ran_at,report=excluded.report').bind(now,JSON.stringify({...report,errors:report.errors.slice(0,10)})).run();
 return report;
}
async function libraryJobSteps(env,concepts,now){
 const report={matched:0,empty:0,refreshed:0,reviewed:0,rejectedByReview:0,errors:[]};
 await env.DB.prepare('UPDATE library_products SET title=NULL,price=NULL,image_url=NULL,available=0 WHERE checked_at<=?').bind(now-LIBRARY_DAY).run();
 const done=new Map(((await env.DB.prepare('SELECT concept_id,matched_at,outcome FROM library_matches').all()).results||[]).map(r=>[r.concept_id,r]));
 // A failed search waits its retry time; a real match is redone weekly and after a rules change.
 const fresh=row=>row&&row.matched_at>(row.outcome==='error'?now-MATCH_EVERY:Math.max(now-MATCH_EVERY,MATCH_RULES_SINCE));
 const due=concepts.filter(c=>!fresh(done.get(c.id))).slice(0,MATCHES_PER_RUN);
 for(const concept of due){
  try{(await matchConcept(concept,env,now))?report.matched++:report.empty++;}
  catch(e){
   report.errors.push(concept.id+':'+e.message);
   if(/429|quota|Authentication|Configuration/.test(e.message))return report;
   await env.DB.prepare("INSERT INTO library_matches (concept_id,matched_at,outcome,products) VALUES (?,?,'error',0) ON CONFLICT(concept_id) DO UPDATE SET matched_at=excluded.matched_at,outcome='error',products=0").bind(concept.id,now-MATCH_EVERY+RETRY_AFTER_ERROR).run();
  }
 }
 const stale=((await env.DB.prepare('SELECT DISTINCT asin FROM library_products WHERE checked_at<=? ORDER BY checked_at LIMIT ?').bind(now-REFRESH_AFTER,REFRESH_BATCHES_PER_RUN*10).all()).results||[]).map(r=>r.asin);
 for(let i=0;i<stale.length;i+=10){
  try{await refreshProducts(stale.slice(i,i+10),env,now);report.refreshed+=Math.min(10,stale.length-i);}
  catch(e){report.errors.push('refresh:'+e.message);break;}
 }
 await reviewProducts(env,concepts,report);
 return report;
}
// Claude reads each idea with its matched listings and marks the ones that do not fit the idea or the
// person it is meant for (a children's camera for an adult, a coffee grinder for a tea idea).
const REVIEW_SYSTEM=`Sei il redattore di 3Gifts, un sito italiano che propone idee regalo.
Ricevi un'idea regalo della nostra libreria e alcuni prodotti Amazon trovati per quell'idea.
Per ogni prodotto decidi se è un buon esempio di quell'idea per le persone a cui l'idea è destinata.
Scarta un prodotto se: è per un'età diversa (per bambini quando l'idea è per adulti o il contrario), è per un genere diverso da quello dell'idea, è un accessorio o un ricambio invece del regalo, riguarda un altro argomento, è di qualità o aspetto chiaramente scadente per un regalo, oppure ha a che fare con l'alcol quando l'idea non lo prevede.
Nel dubbio tienilo: scarta solo quando l'errore è evidente dal titolo.
Per ogni prodotto scrivi un motivo breve in italiano, al massimo 12 parole.`;
const REVIEW_SCHEMA={type:'object',additionalProperties:false,required:['products'],properties:{products:{type:'array',items:{type:'object',additionalProperties:false,required:['asin','fits','reason'],properties:{asin:{type:'string'},fits:{type:'boolean'},reason:{type:'string'}}}}}};
async function reviewConcept(concept,rows,env){
 const idea={idea:concept.title,perche:concept.whyItWorks,nonAdattoA:concept.notFor||'',eta:concept.ages,genere:concept.gender,interessi:[...concept.interests,...concept.subinterests],prezzo:concept.price};
 const user=`<idea>${JSON.stringify(idea)}</idea>\n<prodotti>${JSON.stringify(rows.map(r=>({asin:r.asin,titolo:r.title,prezzo:r.price})))}</prodotti>`;
 const {products}=await claudeJson(env,{system:REVIEW_SYSTEM,user,schema:REVIEW_SCHEMA,effort:'low',maxTokens:3000});
 const verdicts=new Map(products.map(p=>[p.asin,p]));
 await env.DB.batch(rows.filter(r=>verdicts.has(r.asin)).map(r=>env.DB.prepare('UPDATE library_products SET ai_verdict=?,ai_reason=? WHERE concept_id=? AND asin=?').bind(verdicts.get(r.asin).fits?1:0,String(verdicts.get(r.asin).reason).slice(0,160),concept.id,r.asin)));
 return products.filter(p=>!p.fits).length;
}
async function reviewProducts(env,concepts,report){
 if(!env.ANTHROPIC_API_KEY&&!env.ANTHROPIC_CLIENT)return;
 const pending=((await env.DB.prepare('SELECT DISTINCT concept_id FROM library_products WHERE ai_verdict IS NULL AND title IS NOT NULL LIMIT ?').bind(REVIEWS_PER_RUN).all()).results||[]).map(r=>r.concept_id);
 for(const id of pending){
  const concept=concepts.find(c=>c.id===id);if(!concept)continue;
  const rows=(await env.DB.prepare('SELECT asin,title,price FROM library_products WHERE concept_id=? AND ai_verdict IS NULL AND title IS NOT NULL').bind(id).all()).results||[];
  try{report.rejectedByReview+=await reviewConcept(concept,rows,env);report.reviewed++;}
  catch(e){report.errors.push('review:'+e.message);if(/quota|not_configured|401|403/.test(e.message))break;}
 }
}
// Aggregate counts only: no Amazon content, no visitor data.
export async function libraryStatus(env,concepts,now=Date.now()){
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(!env.DB)return json({ok:false,code:'quota_storage_unavailable'},503);
 const m=await env.DB.prepare("SELECT SUM(outcome!='error') AS runs, SUM(outcome='error') AS failed, SUM(outcome='matched') AS matched, SUM(outcome='empty') AS empty, MAX(CASE WHEN outcome!='error' THEN matched_at END) AS last FROM library_matches").first();
 const run=await env.DB.prepare('SELECT ran_at,report FROM library_runs WHERE id=1').first();
 const p2=await env.DB.prepare('SELECT MAX(checked_at) AS checked, SUM(ai_verdict IS NOT NULL) AS reviewed, SUM(ai_verdict=0) AS rejected FROM library_products').first();
 const p=await env.DB.prepare('SELECT COUNT(*) AS products, SUM(available=1 AND checked_at>?) AS fresh FROM library_products').bind(now-LIBRARY_DAY).first();
 return json({ok:true,approvedConcepts:concepts.length,conceptsSearched:m?.runs||0,conceptsWithProducts:m?.matched||0,conceptsWithoutProducts:m?.empty||0,products:p?.products||0,availableAndFresh:p?.fresh||0,conceptsFailed:m?.failed||0,productsReviewed:p2?.reviewed||0,productsRejectedByReview:p2?.rejected||0,lastMatchAt:m?.last?new Date(m.last).toISOString():null,lastRefreshAt:p2?.checked?new Date(p2.checked).toISOString():null,lastRun:run?{at:new Date(run.ran_at).toISOString(),...JSON.parse(run.report)}:null});
}
