const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const {cases,compatibility}=await import('./m3-block5-fixtures.mjs');
 const {database}=await import('./d1-fixture.mjs');
 const worker=(await import('../dist/server/index.js?m3block5='+Date.now())).default;
 const words=JSON.parse(fs.readFileSync('docs/m3-lexical-review.json')).words;
 const original=globalThis.fetch;let scenarios=0,simulatedCalls=0;
 try{
  for(const lang of ['it','en'])for(const f of cases){
   const {db,binding}=database();
   try{
    const w=words.find(w=>w.id==='M3-'+f.id),compat=compatibility(f.id,lang),note=w[lang]+'. '+compat.note;
    const r=createRuntime(lang);r.seed();
    r.set('interest',[w.category==='Lettura'?'culture':w.category==='Tecnologia'?'techGaming':'styleBeauty']);
    r.set('subinterest',[w.category==='Lettura'?'books':w.category==='Tecnologia'?'tech':'skincare']);
    r.set('note',note);r.set('budgetChoice','100');r.set('minBudget','10');
    const requests=[],responses=[];
    globalThis.fetch=async(url,options)=>{
     const b=JSON.parse(options.body);assert.ok(!JSON.stringify(b).includes('Il dispositivo'));
     if(url.endsWith('/auth/o2/token'))return Response.json({access_token:'fixture',expires_in:3600});
     simulatedCalls++;
     const title=lang==='it'?f.titleIt:f.titleEn;
     const features=[lang==='it'?f.featureIt:f.featureEn,'',lang==='it'?f.trapIt:f.trapEn];
     return Response.json({searchResult:{items:features.map((feature,i)=>{
      const asin='B'+String(scenarios*10+i+1).padStart(9,'0');
      return {asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:title},features:{displayValues:[feature,compat.features]}},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}};
     })}});
    };
    r.c.fetch=async(url,options)=>{
     const data=JSON.parse(options.body);requests.push(data);assert.ok(!('note' in data.profile));
     const request=new Request('https://3gifts.it/api/amazon/recommend',{...options,signal:undefined,headers:{Origin:'https://3gifts.it','Content-Type':'application/json'}});
     const response=await worker.fetch(request,{DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'m3-block5-fixture-'+lang,AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'3gifts-21'});
     const body=await response.json();responses.push(body);
     return {ok:response.ok,json:async()=>body};
    };
    await r.a.showResults();assert.equal(requests.length,1,lang+' '+f.id);
    const response=responses[0];assert.equal(response.code,'Results',JSON.stringify(response));assert.equal(response.products.length,1);
    assert.ok(response.products[0].features.includes(lang==='it'?f.featureIt:f.featureEn),JSON.stringify({lang,id:f.id,request:requests[0],searches:response.searches,features:response.products[0].features}));
    assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,1,lang+' '+f.id+' actual serialized evidence survives frontend');
    assert.equal(response.searched,1);assert.equal(response.methodRevision,(await import('../server/research/weighted-ranking.mjs')).RANKING_VERSION);
    r.set('refineReason','owned');r.set('refineDirection','differentType');r.set('refineSurprise','balanced');
    const form=r.el('#refinementForm');await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
    assert.equal(requests.length,2);assert.deepEqual(requests[1].constraints.specificIntents,requests[0].constraints.specificIntents);
    assert.equal(responses[1].searched,0);assert.equal(responses[1].products.length,0,'no unrelated fallback after requested family is excluded');
    scenarios++;
   }finally{db.close();}
  }
 }finally{globalThis.fetch=original;}
 console.log(JSON.stringify({scenarios,simulatedCalls,realAmazonCalls:0,actualWorkerSerialization:true,refinementChecks:scenarios}));
})().catch(e=>{console.error(e);process.exit(1)});
