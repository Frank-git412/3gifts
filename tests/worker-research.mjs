import {database} from './d1-fixture.mjs';
const {db,binding}=database();
import assert from 'node:assert/strict';
const worker=(await import('../dist/server/index.js?workerTest='+Date.now())).default;
const original=globalThis.fetch;let calls=0;const searchTerms=[];
globalThis.fetch=async(url,options)=>{
 const b=JSON.parse(options.body);
 if(url.endsWith('/auth/o2/token'))return Response.json({access_token:'fixture',expires_in:3600});
 searchTerms.push(b.keywords);const asin='B'+String(++calls).padStart(9,'0');
 return Response.json({searchResult:{items:[{asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:b.keywords},features:{displayValues:[b.keywords]}},offersV2:{listings:[{price:{money:{amount:35,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}}]}});
};
try{
 const response=await worker.fetch(new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile:{ageRange:'adult',relation:'friend',occasion:'birthday',interests:['culture'],subinterests:['books'],budget:60,minBudget:30}})}),{DB:binding,AMAZON_CREATORS_CLIENT_ID:'fixture',AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_CREATORS_VERSION:'3.2',AMAZON_PARTNER_TAG:'3gifts-21'});
 const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.method,'research-20261007');assert.ok(result.products.length>0);assert.ok(calls>=1&&calls<=12);assert.ok(searchTerms.some(q=>q.includes('compleanno')&&q.includes('amico')));
 console.log(JSON.stringify({bundledWorker:true,searches:calls,products:result.products.length,status:response.status}));
}finally{globalThis.fetch=original;db.close();}
