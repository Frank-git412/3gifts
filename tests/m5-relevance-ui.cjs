const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const {database}=await import('./d1-fixture.mjs'),worker=(await import('../dist/server/index.js?relevance')).default;
 const cases=[
  {id:'illustrated',area:'culture',sub:'books',it:'Vorrei un libro illustrato da sfogliare nella nuova casa.',en:'I want an illustrated book to browse in the new home.',rows:[['Libro illustrato Il viaggio','Libro con illustrazioni.'],['Romanzo storico Il ponte','Una storia di fantasia.']],expected:[0]},
  {id:'biography',area:'culture',sub:'books',it:'Le piacciono le biografie e le storie vere.',en:'She likes biographies and true stories.',rows:[['Biografia Una vita','Una storia vera.'],['Romanzo storico Il ponte','Una storia di fantasia.'],['Romanzo giallo Il porto','Un romanzo inventato.']],expected:[0,1,2]},
  {id:'film',area:'techGaming',sub:'tech',it:'Guarda film. Non cerco accessori per il telefono.',en:'Watches movies. I do not want phone accessories.',rows:[['Mini proiettore','Per guardare film. Cinema in casa.'],['Tablet grafico ugee S640','Tavoletta per tablet Android.'],['Tastiera wireless per computer portatile','Computer portatile laptop.'],['Hub USB-C HDMI per laptop e tablet','Hub con USB-C.']],expected:[0]}
 ];
 const original=globalThis.fetch;let flows=0,refinements=0,simulatedCalls=0;
 try{for(const lang of ['it','en'])for(const [index,c] of cases.entries()){
  const {db,binding}=database();try{
   const r=createRuntime(lang);r.seed();r.set('interest',[c.area]);r.set('subinterest',[c.sub]);r.set('budgetChoice','60');r.set('minBudget','15');r.set('note',c[lang]);
   const asin=n=>'B'+String(index*10+n+1).padStart(9,'0');
   const items=c.rows.map(([title,features],i)=>({asin:asin(i),detailPageURL:'https://www.amazon.it/dp/'+asin(i),itemInfo:{title:{displayValue:title},features:{displayValues:[features]},...(c.area==='culture'?{classifications:{productGroup:{displayValue:'Books'},binding:{displayValue:'Copertina flessibile'}},byLineInfo:{contributors:[{name:'Autore Test '+i,roleType:'author'}]},contentInfo:{languages:{displayValues:[{type:'Pubblicato',displayValue:'Italiano'}]}}}:{})},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}}));
   globalThis.fetch=async(url,options)=>{if(url.endsWith('/auth/o2/token'))return Response.json({access_token:'fixture',expires_in:3600});simulatedCalls++;return Response.json({searchResult:{items}});};
   const requests=[],responses=[];
   r.c.fetch=async(url,options)=>{
    const body=JSON.parse(options.body);requests.push(body);assert.ok(!('note' in body.profile));assert.ok(!JSON.stringify(body).includes(c[lang]));
    const response=await worker.fetch(new Request('https://3gifts.it/api/amazon/recommend',{...options,signal:undefined,headers:{Origin:'https://3gifts.it','Content-Type':'application/json'}}),{DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'m5-relevance-'+index+'-'+lang,AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'3gifts-21'});
    const data=await response.json();responses.push(data);return {ok:response.ok,json:async()=>data};
   };
   await r.a.showResults();assert.equal(requests.length,1);const products=responses[0].products;
   assert.equal(products[0]?.asin,asin(0),JSON.stringify(responses[0]));assert.deepEqual(products.map(p=>p.asin).sort(),c.expected.map(asin).sort());
   assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,c.expected.length);
   r.set('refineReason','owned');r.set('refineDirection','differentType');r.set('refineSurprise','balanced');
   const form=r.el('#refinementForm');await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
   assert.equal(requests.length,2);for(const field of ['specificIntents','optionalIntents','exclusions'])assert.deepEqual(requests[1].constraints[field],requests[0].constraints[field],c.id+' '+field);
   assert.ok(responses[1].products.every(p=>!products.some(old=>old.asin===p.asin)));
   flows++;refinements++;console.log('PASS '+lang+' '+c.id+' questionnaire and compiled Worker');
  }finally{db.close();}
 }}finally{globalThis.fetch=original;}
 console.log(JSON.stringify({flows,refinements,simulatedCalls,realAmazonCalls:0,browserQA:false,actualWorkerSerialization:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
