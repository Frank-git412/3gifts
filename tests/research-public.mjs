import {database} from './d1-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publicPlan,publicCandidate,publicRecommendation} from '../server/research/public-adapter.mjs';
import {researchTaxonomy} from '../server/research/research-engine.mjs';
const profile={ageRange:'adult',interests:['culture'],subinterests:['books'],tone:'neutral',budget:60,minBudget:15,avoid:[],recipientPreference:'unisex'};
const request=data=>new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify(data)});
test('All 28 categories and 88 subcategories map from the unchanged public inputs',()=>{
 const html=fs.readFileSync('index.html','utf8');let count=0;
 for(const c of researchTaxonomy().categories)for(const sub of c.subcategories){
  assert.ok(html.includes('value="'+sub.id+'"'));count++;
  const ctx=publicPlan({profile:{...profile,ageRange:c.audience==='general'?'adult':c.audience,childStage:'preschool',interests:[c.id],subinterests:[sub.id]}});
  assert.deepEqual(ctx.plan.subcategories[c.id],[sub.id]);
 }assert.equal(count,88);
});
test('Existing age labels, price range, effects, exclusions and unknown compatibility are preserved',()=>{
 for(const age of ['youngAdult','adult','mature','unknown'])assert.doesNotThrow(()=>publicPlan({profile:{...profile,ageRange:age}}));
 assert.equal(publicPlan({profile:{...profile,budget:500,minBudget:0}}).plan.profile.effectiveMin,250);
 for(const tone of ['sentimental','useful','funny','surprising','elegant'])assert.equal(publicPlan({profile:{...profile,tone}}).plan.effect,tone);
 const noTech=publicPlan({profile:{...profile,interests:['techGaming'],subinterests:['tech'],avoid:['gadgets']}});
 assert.ok(!noTech.plan.queries.some(q=>/bluetooth|usb|cuffie|power bank/i.test(q.keywords)));
 const unknown=publicPlan({profile:{...profile,interests:['techGaming'],subinterests:['tech']}});
 assert.ok(!unknown.plan.queries.some(q=>/cuffie|mouse|power bank|hub usb/i.test(q.keywords)));
});
test('Unclear notes, allergy flags, unsupported experiences and unspecified infant stages block calls',()=>{
 assert.equal(publicPlan({profile,constraints:{needsClarification:true}}).plan.queries.length,0);
 assert.equal(publicPlan({profile,constraints:{requiredTypes:['experience']}}).blocked,true);
 assert.equal(publicPlan({profile:{...profile,ageRange:'earlyChild',interests:['earlyLearning'],subinterests:[],childStage:'all'}}).blocked,true);
});
test('Child stage excludes 3+ toddler products and 8+ products in the 7–12 band',()=>{
 for(const [ageRange,childStage,interest,sub,minimum] of [['earlyChild','toddler','earlyLearning','earlyLearning_firstPuzzles',3],['child','all','kidsScience','kidsScience_scienceKits',8]]){
  const ctx=publicPlan({profile:{...profile,ageRange,childStage,interests:[interest],subinterests:[sub]}}),q=ctx.plan.queries[0];
  assert.ok(q);assert.equal(publicCandidate({asin:'B000000001',title:q.keywords+' dai '+minimum+' anni',features:'',researchQueryIds:[q.id],url:'https://www.amazon.it/dp/B000000001',price:30},ctx),null);
 }
});
test('Public endpoint validates origin, JSON, budget and method without upstream calls',async()=>{
 assert.equal((await publicRecommendation(new Request('https://3gifts.it/api/amazon/recommend'),{})).status,405);
 assert.equal((await publicRecommendation(new Request('https://3gifts.it/api/amazon/recommend',{method:'POST'}),{})).status,403);
 assert.equal((await publicRecommendation(request({profile:{...profile,budget:2}}),{})).status,400);
 const blocked=await publicRecommendation(request({profile,constraints:{needsClarification:true}}),{});assert.equal((await blocked.json()).searched,0);
});
test('Search API returns fresh product cards, distinct ideas, affiliate URLs and no raw note transfer',async()=>{
 const {db,binding}=database();const original=globalThis.fetch,calls=[];let id=0;
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push({url,body});
  if(url.endsWith('/auth/o2/token'))return Response.json({access_token:'test-token',expires_in:3600});
  const asin='B'+String(++id).padStart(9,'0');
  return Response.json({searchResult:{items:[{asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:body.keywords+' edizione regalo'},features:{displayValues:[body.keywords]}},images:{primary:{medium:{url:'https://m.media-amazon.com/images/I/test.jpg'}}},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'},isBuyBoxWinner:true}]}}]}});
 };
 try{
  const result=await publicRecommendation(request({profile,note:'SECRET RAW NOTE'}),{DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'test-id',AMAZON_CREATORS_CLIENT_SECRET:'test-secret',AMAZON_PARTNER_TAG:'3gifts-21'});
  const body=await result.json();assert.equal(result.status,200);assert.ok(body.products.length>0,JSON.stringify(body));assert.equal(body.method,'research-20261007');
  assert.equal(body.diagnostics.finalSelection.length,body.diagnostics.uniqueCandidates);
  assert.deepEqual(body.diagnostics.finalSelection.filter(p=>p.status==='selected').map(p=>p.asin).sort(),body.products.map(p=>p.asin).sort());
  assert.equal(new Set(body.products.map(p=>p.asin)).size,body.products.length);
  assert.equal(new Set(body.products.map(p=>p.conceptFamily)).size,body.products.length);
  for(const p of body.products){assert.equal(p.amazonPrice,true);assert.ok(p.price>=15&&p.price<=60);assert.equal(new URL(p.url).searchParams.get('tag'),'3gifts-21');assert.ok(p.imageUrl);}
  assert.ok(!JSON.stringify(calls).includes('SECRET RAW NOTE'));assert.ok(calls.filter(c=>c.url.includes('searchItems')).length<=12);
  for(const {body:b} of calls.filter(c=>c.url.includes('searchItems'))){assert.equal(b.condition,'New');assert.equal(b.minPrice,1500);assert.equal(b.maxPrice,6000);}
 }finally{globalThis.fetch=original;db.close();}
});
