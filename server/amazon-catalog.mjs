import {amazonApi} from './amazon-transport.mjs';
// Fixed curated ASIN catalogue: no visitor profiles or arbitrary queries leave the server.
let catalogueCache, catalogueFlight, authCache, authFlight;
export {amazonToken};
async function amazonToken(env) {
  if(authCache && authCache.until>Date.now())return authCache.token;
  if(authFlight)return authFlight;
  authFlight=(async()=>{
    const version=String(env.AMAZON_CREATORS_VERSION||'').replace(/^v/,'');
    const hosts={'3.1':'api.amazon.com','3.2':'api.amazon.co.uk','3.3':'api.amazon.co.jp'};
    if(!hosts[version]||!env.AMAZON_CREATORS_CLIENT_ID||!env.AMAZON_CREATORS_CLIENT_SECRET||!env.AMAZON_PARTNER_TAG)throw Error('ConfigurationMissing');
    const response=await fetch('https://'+hosts[version]+'/auth/o2/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'client_credentials',client_id:env.AMAZON_CREATORS_CLIENT_ID,client_secret:env.AMAZON_CREATORS_CLIENT_SECRET,scope:'creatorsapi::default'}),signal:AbortSignal.timeout(8000)});
    const data=await response.json();if(!response.ok||!data.access_token)throw Error('AuthenticationFailed');
    authCache={token:data.access_token,until:Date.now()+Math.max(0,(Number(data.expires_in)||3600)-120)*1000};return authCache.token;
  })().finally(()=>authFlight=null);
  return authFlight;
}
function amazonObservation(item,checkedAt){
  const listings=item.offersV2?.listings||[];
  const listing=listings.find(x=>x.isBuyBoxWinner)||listings[0];
  const money=listing?.price?.money;
  const availability=String(listing?.availability?.type||'UNKNOWN').replaceAll('_','').toUpperCase();
  const unavailable=['OUTOFSTOCK','UNAVAILABLE','PREORDER','AVAILABLEDATE'].includes(availability)||!listings.length;
  const price=money?.currency==='EUR'&&Number(money.amount)>0&&!listing?.violatesMAP?Number(money.amount):null;
  const image=item.images?.primary?.large?.url;
  let imageUrl='';try{const u=new URL(image);if(u.protocol==='https:'&&u.hostname.endsWith('.media-amazon.com'))imageUrl=u.href;}catch{}
  let directUrl='';try{const u=new URL(item.detailPageURL);if(u.protocol==='https:'&&u.hostname==='www.amazon.it')directUrl=u.href;}catch{}
  return {asin:item.asin,price,imageUrl,directUrl,amazonAvailability:availability,amazonCheckedAt:checkedAt,amazonPrice:price!==null,unavailable};
}
async function loadAmazonCatalogue(env,curated){
  const ids=[...new Set(curated.map(p=>p.asin).filter(x=>/^[A-Z0-9]{10}$/.test(x||'')))];
  const updates=new Map();let failedBatches=0;
  for(let offset=0;offset<ids.length;offset+=10){
    const batch=ids.slice(offset,offset+10);
    try{
      const {data,observedAt:checkedAt}=await amazonApi('getItems',{itemIds:batch,itemIdType:'ASIN',marketplace:'www.amazon.it',partnerTag:env.AMAZON_PARTNER_TAG,resources:['itemInfo.title','images.primary.large','offersV2.listings.price','offersV2.listings.availability','offersV2.listings.isBuyBoxWinner']},env,Date.now()+12000);
      for(const item of data.itemsResult?.items||[])if(batch.includes(item.asin))updates.set(item.asin,amazonObservation(item,checkedAt));
      // Missing ASINs are not proof of unavailability; preserve explicitly labelled editorial data.
    }catch{failedBatches++;break;}
  }
  if(!updates.size)throw Error('CatalogUnavailable');
  const products=curated.map(p=>{
    const u=updates.get(p.asin);if(!u)return {...p,amazonPrice:false};
    return {...p,price:u.price??p.price,priceStatus:u.amazonPrice?'amazon-api':'indicative',imageUrl:u.imageUrl,imageSource:'Amazon',imageUpdatedAt:u.amazonCheckedAt,directUrl:u.directUrl||p.directUrl,url:u.directUrl||p.url,offer:null,monitorEligible:u.unavailable?false:p.monitorEligible,amazonPrice:u.amazonPrice,amazonCheckedAt:u.amazonCheckedAt,amazonAvailability:u.amazonAvailability};
  });
  return {products,meta:{source:'amazon-creators',updatedAsins:updates.size,totalAsins:ids.length,partial:failedBatches>0||updates.size<ids.length,checkedAt:new Date().toISOString()}};
}
export async function amazonCatalogue(request,env,curated){
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(request.method!=='GET')return respond({code:'MethodNotAllowed'},405);
  if(catalogueCache?.until>Date.now())return respond(catalogueCache.body,catalogueCache.status);
  if(!catalogueFlight)catalogueFlight=loadAmazonCatalogue(env,curated).then(body=>{catalogueCache={body,status:200,until:Date.now()+900000};}).catch(()=>{catalogueCache={body:{code:'AmazonTemporarilyUnavailable'},status:503,until:Date.now()+60000};}).finally(()=>catalogueFlight=null);
  await catalogueFlight;return respond(catalogueCache.body,catalogueCache.status);
}
