import {amazonApi} from './amazon-transport.mjs';
// Matches approved library concepts to Amazon products and keeps their data fresh.
// Only ASINs are durable: Amazon titles, prices and images are refreshed daily and
// cleared once older than 24 hours, as the Associates policies require.
const LIBRARY_DAY=86400000;
const MATCH_EVERY=7*LIBRARY_DAY,REFRESH_AFTER=20*3600000;
// A concept whose search fails is retried a day later instead of blocking the queue.
const RETRY_AFTER_ERROR=LIBRARY_DAY;
const MATCHES_PER_RUN=12,REFRESH_BATCHES_PER_RUN=6,PRODUCTS_PER_CONCEPT=3;
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
// Amazon's relevance order is kept; we only drop what is not a giftable, available, in-budget product.
export function selectLibraryProducts(items,concept){
 const min=concept.price.min*0.8,max=concept.price.max*1.2,seen=new Set(),out=[];
 for(const item of items||[]){
  const title=String(item.itemInfo?.title?.displayValue||'').trim();
  if(!/^[A-Z0-9]{10}$/.test(item.asin||'')||!title||NOT_A_GIFT.test(title))continue;
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
 const report={matched:0,empty:0,refreshed:0,errors:[]};
 await env.DB.prepare('UPDATE library_products SET title=NULL,price=NULL,image_url=NULL,available=0 WHERE checked_at<=?').bind(now-LIBRARY_DAY).run();
 const done=new Map(((await env.DB.prepare('SELECT concept_id,matched_at FROM library_matches').all()).results||[]).map(r=>[r.concept_id,r.matched_at]));
 const due=concepts.filter(c=>!(done.get(c.id)>now-MATCH_EVERY)).slice(0,MATCHES_PER_RUN);
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
 return report;
}
// Aggregate counts only: no Amazon content, no visitor data.
export async function libraryStatus(env,concepts,now=Date.now()){
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(!env.DB)return json({ok:false,code:'quota_storage_unavailable'},503);
 const m=await env.DB.prepare("SELECT SUM(outcome!='error') AS runs, SUM(outcome='error') AS failed, SUM(outcome='matched') AS matched, SUM(outcome='empty') AS empty, MAX(CASE WHEN outcome!='error' THEN matched_at END) AS last FROM library_matches").first();
 const run=await env.DB.prepare('SELECT ran_at,report FROM library_runs WHERE id=1').first();
 const p2=await env.DB.prepare('SELECT MAX(checked_at) AS checked FROM library_products').first();
 const p=await env.DB.prepare('SELECT COUNT(*) AS products, SUM(available=1 AND checked_at>?) AS fresh FROM library_products').bind(now-LIBRARY_DAY).first();
 return json({ok:true,approvedConcepts:concepts.length,conceptsSearched:m?.runs||0,conceptsWithProducts:m?.matched||0,conceptsWithoutProducts:m?.empty||0,products:p?.products||0,availableAndFresh:p?.fresh||0,conceptsFailed:m?.failed||0,lastMatchAt:m?.last?new Date(m.last).toISOString():null,lastRefreshAt:p2?.checked?new Date(p2.checked).toISOString():null,lastRun:run?{at:new Date(run.ran_at).toISOString(),...JSON.parse(run.report)}:null});
}
