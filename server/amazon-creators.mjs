import {amazonApi} from './amazon-transport.mjs';
// Server-only connection check. Never returns tokens, credentials or upstream bodies.
let cached, pending;
const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function check(env) {
  const version=String(env.AMAZON_CREATORS_VERSION||'').replace(/^v/,'');
  const hosts={'3.1':'api.amazon.com','3.2':'api.amazon.co.uk','3.3':'api.amazon.co.jp'};
  // Names only, never values: tells the owner which setting to fix in the hosting panel.
  const missing=['AMAZON_CREATORS_CLIENT_ID','AMAZON_CREATORS_CLIENT_SECRET','AMAZON_PARTNER_TAG'].filter(name=>!env[name]);
  if(!hosts[version])missing.push('AMAZON_CREATORS_VERSION');
  if(missing.length) return {ok:false,stage:'configuration',code:'MissingOrInvalidConfiguration',missing};
  const {data}=await amazonApi('getItems',{itemIds:['B0DMT42CFL'],itemIdType:'ASIN',marketplace:'www.amazon.it',partnerTag:env.AMAZON_PARTNER_TAG,resources:['itemInfo.title']},env);
  const response={ok:true,status:200};
  const rawCode=data.errors?.[0]?.code || data.Errors?.[0]?.Code || data.code;
  const safeCodes=new Set(['AssociateNotEligible','AccessDenied','TooManyRequests','InvalidPartnerTag','InvalidParameterValue','ItemsNotFound']);
  const count=data.itemsResult?.items?.length || 0;
  return {ok:response.ok && count>0,stage:'catalog',httpStatus:response.status,itemsReceived:count,code:count>0?'Connected':safeCodes.has(rawCode)?rawCode:'CatalogRequestFailed'};
}
export async function amazonConnection(request,env={}) {
  if(request.method!=='GET')return json({code:'MethodNotAllowed'},405);
  // One fixed request, shared in-flight and cached for 15 minutes, including failures.
  if(!cached || cached.until<Date.now()) {
    pending ||= check(env).catch(()=>({ok:false,stage:'connection',code:'UpstreamUnavailable'})).then(result=>{cached={until:Date.now()+900000,result:{...result,checkedAt:new Date().toISOString()}};pending=null;});
    await pending;
  }
  return json(cached.result);
}
