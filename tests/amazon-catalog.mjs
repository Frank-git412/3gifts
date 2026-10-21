import {database} from './d1-fixture.mjs';
const {db,binding}=database();
import assert from 'node:assert/strict';
import {amazonCatalogue} from '../server/amazon-catalog.mjs';
let calls=0;
globalThis.fetch=async(url,options)=>{
 calls++;const body=JSON.parse(options.body);
 if(url.includes('/auth/'))return Response.json({access_token:'TEST-SECRET-TOKEN',expires_in:3600});
 assert.equal(body.marketplace,'www.amazon.it');assert.equal(body.partnerTag,'3gifts-21');assert.ok(!('profile' in body));
 return Response.json({itemsResult:{items:[{asin:'B0DMT42CFL',detailPageURL:'https://www.amazon.it/dp/B0DMT42CFL?tag=3gifts-21',images:{primary:{large:{url:'https://m.media-amazon.com/images/I/test.jpg'}}},offersV2:{listings:[{price:{money:{amount:29.99,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}},{asin:'B000000002',offersV2:{listings:[]}}]}});
};
const curated=[{asin:'B0DMT42CFL',price:10,tags:['tech'],ageSuitability:{min:13}},{asin:'B000000002',price:15},{asin:'B000000003',price:25}];
const env={DB:binding,AMAZON_CREATORS_CLIENT_ID:'TEST-CLIENT',AMAZON_CREATORS_CLIENT_SECRET:'TEST-SECRET',AMAZON_CREATORS_VERSION:'3.2',AMAZON_PARTNER_TAG:'3gifts-21'};
const request=new Request('https://3gifts.it/api/amazon/catalog');
const results=await Promise.all([amazonCatalogue(request,env,curated),amazonCatalogue(request,env,curated)]);
assert.equal(calls,2);const text=await results[0].text();assert.ok(!text.includes('TEST-SECRET'));const data=JSON.parse(text);
assert.equal(data.products[0].price,29.99);assert.deepEqual(data.products[0].ageSuitability,{min:13});assert.equal(data.products[0].offer,null);assert.equal(data.products[1].monitorEligible,false);assert.equal(data.products[2].amazonPrice,false);assert.equal(data.meta.partial,true);
assert.equal((await amazonCatalogue(new Request(request,{method:'POST'}),env,curated)).status,405);
console.log('Amazon catalogue: fresh price, unavailable exclusion, editorial fallback, preserved age rules, no secrets, coalescing passed.');

db.close();
