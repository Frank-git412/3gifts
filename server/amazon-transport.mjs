import {amazonToken} from './amazon-catalog.mjs';
// Only catalogue request bodies/results are cached; never visitor profiles or notes.
const transportFlights=new Map(),transportCache=new Map();
const API_GAP=1100,API_TTL=15*60*1000;
// Conservative application ceiling in a rolling 24h window, not an assumed Amazon reset.
export async function reserveAmazonRequest(env,metrics={},now=Date.now()){
 if(!env.DB)throw Error('quota_storage_unavailable');
 const limit=Number(env.AMAZON_DAILY_REQUEST_LIMIT??6912);
 if(!Number.isInteger(limit)||limit<1||limit>8640)throw Error('quota_configuration_invalid');
 if((metrics.amazonCalls||0)>=12)throw Error('request_quota_exhausted');
 const cutoff=now-86400000;
 // SQLite serializes this conditional insertion: independent Workers cannot
 // both consume the last slot. Failed upstream requests also consume a slot.
 const row=await env.DB.prepare(`INSERT INTO amazon_requests (id,created_at)
  SELECT ?,? WHERE (SELECT COUNT(*) FROM amazon_requests WHERE created_at>?)<?
  RETURNING id`).bind(crypto.randomUUID(),now,cutoff,limit).first();
 if(!row)throw Error('daily_quota_exhausted');
 await env.DB.prepare('DELETE FROM amazon_requests WHERE created_at<=?').bind(cutoff).run();
 metrics.amazonCalls=(metrics.amazonCalls||0)+1;
 metrics.dailyLimit=limit;
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function transportKey(path,body,env){
 const bytes=new TextEncoder().encode(JSON.stringify([path,body,env.AMAZON_CREATORS_CLIENT_ID]));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function acquireAmazon(env,deadline){
 const owner=crypto.randomUUID();
 while(Date.now()+1000<deadline){
  const now=Date.now();
  const row=await env.DB.prepare(`INSERT INTO amazon_gate (id, owner, lease_until, next_at, blocked_until)
   VALUES ('catalog', ?, ?, ?, 0)
   ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, lease_until=excluded.lease_until, next_at=excluded.next_at
   WHERE amazon_gate.lease_until<=? AND amazon_gate.next_at<=? AND amazon_gate.blocked_until<=?
   RETURNING owner`).bind(owner,now+15000,now+API_GAP,now,now,now).first();
  if(row)return async(started=0)=>{await env.DB.prepare("UPDATE amazon_gate SET lease_until=0,next_at=MAX(next_at,?) WHERE id='catalog' AND owner=?").bind(started+API_GAP,owner).run();};
  const state=await env.DB.prepare("SELECT blocked_until, next_at FROM amazon_gate WHERE id='catalog'").first();
  if(state?.blocked_until>Date.now())throw Error('upstream_429');
  await pause(Math.min(1100,Math.max(250,(state?.next_at||0)-Date.now())));
 }
 throw Error('timeout');
}
export async function amazonApi(path,body,env,deadline=Date.now()+12000,metrics={}){
 if(!env.DB)throw Error('quota_storage_unavailable');
 const key=await transportKey(path,body,env);
 const read=async()=>{
  const local=transportCache.get(key);if(local?.expires>Date.now())return local;
  if(!env.DB)return null;
  const row=await env.DB.prepare('SELECT value, expires FROM amazon_cache WHERE key=? AND expires>?').bind(key,Date.now()).first();
  return row?{...JSON.parse(row.value),expires:row.expires}:null;
 };
 const hit=await read();if(hit){metrics.cacheHits=(metrics.cacheHits||0)+1;return {...hit,cacheHit:true};}
 if(transportFlights.has(key)){metrics.cacheHits=(metrics.cacheHits||0)+1;return {...await transportFlights.get(key),cacheHit:true};}
 const flight=(async()=>{
  // Authenticate before acquiring the catalogue lease: auth latency must not
  // consume the lease or make two requests start together after token renewal.
  const token=await amazonToken(env);
  const release=await acquireAmazon(env,deadline);let sentAt=0;
  try{
   const shared=await read();if(shared){metrics.cacheHits=(metrics.cacheHits||0)+1;return {...shared,cacheHit:true};}
   if(Date.now()+100>=deadline)throw Error('timeout');
   await reserveAmazonRequest(env,metrics);
   sentAt=Date.now();
   const response=await fetch('https://creatorsapi.amazon/catalog/v1/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'x-marketplace':'www.amazon.it'},body:JSON.stringify(body),signal:AbortSignal.timeout(Math.max(1,Math.min(8000,deadline-Date.now())))});
   let data=await response.json().catch(()=>null);
   const codes=(data?.errors||data?.Errors||[]).map(e=>e.code||e.Code);
   const noResults=path==='searchItems'&&(
    (response.status===404&&data?.resourceType==='SearchResult')||
    ((response.ok||response.status===404)&&codes.length>0&&codes.every(c=>c==='NoResults'))
   );
   if(noResults){metrics.emptySearches=(metrics.emptySearches||0)+1;data={searchResult:{items:[],totalResultCount:0},emptySearch:true};}

   if(!response.ok&&!noResults){
    if(response.status===429||response.status>=500){
     const header=response.headers.get('Retry-After');
     const retry=Number(data?.retryAfterSeconds)||Number(header)||(header?Math.max(0,(Date.parse(header)-Date.now())/1000):0)||(response.status===429?60:5);
     const until=Date.now()+Math.max(1,retry)*1000;
     if(env.DB)await env.DB.prepare("UPDATE amazon_gate SET blocked_until=MAX(blocked_until,?) WHERE id='catalog'").bind(until).run();
    }
    throw Error('upstream_'+response.status);
   }
   if(!data||(path==='searchItems'?!data.searchResult:!data.itemsResult))throw Error('invalid_response');
   // Do not cache partial/error payloads as complete catalogue observations.
   const partial=!!(data.errors?.length||data.Errors?.length);
   const result={data,observedAt:new Date().toISOString(),expires:Date.now()+API_TTL,partial};
   if(partial)return {...result,cacheHit:false};
   if(env.DB)await env.DB.batch([
    env.DB.prepare('INSERT INTO amazon_cache (key,value,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires').bind(key,JSON.stringify(result),result.expires),
    env.DB.prepare('DELETE FROM amazon_cache WHERE expires<=?').bind(Date.now()),
    env.DB.prepare('DELETE FROM amazon_cache WHERE key IN (SELECT key FROM amazon_cache ORDER BY expires DESC LIMIT -1 OFFSET 512)')
   ]);
   transportCache.set(key,result);while(transportCache.size>128)transportCache.delete(transportCache.keys().next().value);
   return {...result,cacheHit:false};
  }finally{await release(sentAt);}
 })();
 transportFlights.set(key,flight);
 try{return await flight;}finally{transportFlights.delete(key);}
}
