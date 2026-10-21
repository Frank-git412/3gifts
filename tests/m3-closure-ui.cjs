const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const worker=(await import('../dist/server/index.js?closure='+Date.now())).default;
 const {database}=await import('./d1-fixture.mjs');
 const original=globalThis.fetch;let scenarios=0,calls=0;
 try{for(const lang of ['it','en']){
  const {db,binding}=database();
  try{
   let phase=0;const requests=[],responses=[];
   const r=createRuntime(lang);r.seed();r.set('interest',['culture']);r.set('subinterest',['books']);r.set('budgetChoice','100');r.set('minBudget','10');
   r.set('note',lang==='it'?'Romanzo sulla natura. Solo libri cartacei.':'Novel about nature. Paper books only.');
   globalThis.fetch=async(url,options)=>{
    if(url.endsWith('/auth/o2/token'))return Response.json({access_token:'fixture',expires_in:3600});
    const request=JSON.parse(options.body);calls++;
    for(const resource of ['itemInfo.byLineInfo','itemInfo.contentInfo','itemInfo.externalIds','itemInfo.classifications'])assert.ok(request.resources.includes(resource));
    const titles=phase?['Il bosco (Terza edizione)','Alba (Le terre, vol. 3)','Il mare (Seconda edizione)','La vetta']:['Il bosco','Il bosco (Seconda edizione)','Alba (Le terre, vol. 1)','Tramonto (Le terre, vol. 2)','Il mare','Solo digitale','Formato ignoto'];
    return Response.json({searchResult:{items:titles.map((title,i)=>{
     const asin='B'+String((lang==='it'?100:200)+phase*10+i).padStart(9,'0');
     return {asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:title},features:{displayValues:[lang==='it'?'Romanzo sulla natura':'Novel about nature',/Le terre/.test(title)?'':'Autoconclusivo']},byLineInfo:{contributors:[{name:'Anna Rossi',roleType:'author'}]},classifications:{productGroup:{displayValue:'Books'},binding:{displayValue:title==='Solo digitale'?'Kindle eBook':title==='Formato ignoto'?'':'Paperback'}},contentInfo:{edition:{displayValue:'Reviewed fixture'},languages:{displayValues:[{displayValue:'Italian',type:'Published'}]}}},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}};
    })}});
   };
   r.c.fetch=async(url,options)=>{
    const request=JSON.parse(options.body);requests.push(request);assert.ok(!('note' in request.profile));
    const response=await worker.fetch(new Request('https://3gifts.it/api/amazon/recommend',{...options,signal:undefined,headers:{Origin:'https://3gifts.it','Content-Type':'application/json'}}),{DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'m3-closure-'+lang+'-'+phase,AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'3gifts-21'});
    const body=await response.json();responses.push(body);return {ok:response.ok,json:async()=>body};
   };
   await r.a.showResults();assert.equal(responses[0].products.length,3,JSON.stringify(responses[0]));
   assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,3);
   assert.deepEqual(responses[0].products.map(p=>p.title),['Il bosco','Alba (Le terre, vol. 1)','Il mare']);
   for(const p of responses[0].products){assert.deepEqual(p.bookMetadata.authors,['Anna Rossi']);assert.equal(p.bookMetadata.binding,'Paperback');}
   phase=1;r.set('refineReason','owned');r.set('refineDirection','passion');r.set('refineSurprise','balanced');
   const form=r.el('#refinementForm');await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
   assert.equal(requests.length,2);assert.ok(requests[1].rejectedBookKeys.some(k=>k.startsWith('bookwork:')));assert.ok(requests[1].rejectedBookKeys.some(k=>k.startsWith('bookseries:')));
   assert.deepEqual(responses[1].products.map(p=>p.title),['La vetta']);
   assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,1);
   scenarios++;
  }finally{db.close();}
 }}finally{globalThis.fetch=original;}
 console.log(JSON.stringify({scenarios,refinements:scenarios,simulatedAmazonCalls:calls,realAmazonCalls:0,bibliographicMetadataPreserved:true}));
})().catch(e=>{console.error(e);process.exit(1)});
