import {amazonApi} from './amazon-transport.mjs';
const labGatewayResponse=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// A server-to-server entry point. The laboratory never receives Amazon secrets
// or OAuth tokens; all catalogue calls use this Site's D1 gate, cache and quota.
export async function amazonLabGateway(request,env){
 if(request.method!=='POST')return labGatewayResponse({code:'MethodNotAllowed'},405);
 if(!env.AMAZON_LAB_GATEWAY_KEY)return labGatewayResponse({code:'GatewayNotConfigured'},503);
 const presented=request.headers.get('Authorization')||'';
 const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [a,b]=await Promise.all([digest(presented),digest('Bearer '+env.AMAZON_LAB_GATEWAY_KEY)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
 if(difference)return labGatewayResponse({code:'Unauthorized'},401);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return labGatewayResponse({code:'InvalidContentType'},415);
 const raw=await request.text();if(raw.length>5000)return labGatewayResponse({code:'RequestTooLarge'},413);
 let input;try{input=JSON.parse(raw);}catch{return labGatewayResponse({code:'InvalidRequest'},400);}
 const p=input?.payload||{},max=Number(p.maxPrice),min=Number(p.minPrice||0);
 if(typeof p.keywords!=='string'||!p.keywords.trim()||p.keywords.length>300||!Number.isInteger(max)||!Number.isInteger(min)||max<1500||max>50000||min<0||min>max)return labGatewayResponse({code:'InvalidRequest'},400);
 const allowed=['itemInfo.title','itemInfo.features','itemInfo.productInfo','itemInfo.classifications','itemInfo.byLineInfo','itemInfo.contentInfo','itemInfo.externalIds','images.primary.medium','parentASIN','offersV2.listings.price','offersV2.listings.availability','offersV2.listings.isBuyBoxWinner'];
 const body={keywords:p.keywords,searchIndex:'All',condition:'New',marketplace:'www.amazon.it',partnerTag:env.AMAZON_PARTNER_TAG,itemCount:10,maxPrice:max,...(min>0?{minPrice:min}:{}),resources:allowed.filter(x=>Array.isArray(p.resources)&&p.resources.includes(x))};
 const now=Date.now(),requestedDeadline=Number(input.deadline),deadline=Number.isFinite(requestedDeadline)?Math.min(now+12000,requestedDeadline):now+12000;
 if(deadline<=now+100)return labGatewayResponse({code:'timeout'},504);
 const metrics={};
 try{
  const observation=await amazonApi('searchItems',body,env,deadline,metrics);
  return labGatewayResponse({data:observation.data,partial:observation.partial,observedAt:observation.observedAt,cacheHit:observation.cacheHit,efficiency:metrics});
 }catch(error){
  const code=/^(upstream_\d{3}|invalid_response|ConfigurationMissing|AuthenticationFailed|daily_quota_exhausted|request_quota_exhausted|quota_storage_unavailable|quota_configuration_invalid|timeout)$/.test(error.message)?error.message:'upstream_unavailable';
  return labGatewayResponse({code,efficiency:metrics},/quota_exhausted|upstream_429/.test(code)?429:code==='timeout'?504:503);
 }
}
