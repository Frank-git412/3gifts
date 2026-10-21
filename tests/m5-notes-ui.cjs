const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const {database}=await import('./d1-fixture.mjs');
 const worker=(await import('../dist/server/index.js?m5')).default;
 const cases=[...require('./fixtures/m5-composite.cjs'),
  {id:'L18-recovery',area:'culture',sub:'books',it:'Solo libri cartacei. Non desidera e-book né audiolibri.',en:'Only paper books. No e-books or audiobooks.',title:'Romanzo Il ponte di carta',features:'Romanzo di avventura.',book:true,bad:{binding:'Kindle eBook'}},
  {id:'L19-recovery',area:'culture',sub:'books',it:'Una lampada da lettura ricaricabile, niente libri.',en:'A rechargeable reading light, no books.',title:'Lampada da lettura per libri',features:'Batteria ricaricabile USB.',bad:{features:'Batteria non ricaricabile.'}},
  {id:'L24-recovery',area:'culture',sub:'books',it:'Vorrei un libro ma non conosco i generi che preferisce.',en:"I want a book, but I don't know which genres they prefer.",title:'Romanzo Il ponte di carta',features:'Romanzo di avventura.',book:true,bad:{title:'Romanzo erotico Il ponte di carta',features:'Romanzo erotico.'}},
  {id:'L32',area:'culture',sub:'books',it:'Solo libri cartacei in italiano.',en:'Only paper books in Italian.',title:'Romanzo Il ponte di carta',features:'Romanzo di avventura.',book:true,bad:{language:'English',binding:'Kindle eBook'}},
  {id:'L33',area:'culture',sub:'books',it:'Ha già letto L’anno della lepre.',en:'They have already read L’anno della lepre.',title:'Romanzo Il ponte di carta',features:'Romanzo di avventura.',book:true,bad:{title:'L’anno della lepre'}},
  {id:'L34',area:'culture',sub:'books',it:'Cerco un romanzo che parli di amicizia.',en:'I want a novel about friendship.',title:'Romanzo Il ponte di carta',features:'La trama racconta una storia di amicizia.',book:true,bad:{features:'La trama non tratta amicizia.'}},
  {id:'L35',area:'culture',sub:'books',it:'Luce da lettura a luce calda con luminosità regolabile.',en:'A warm reading light with adjustable brightness.',title:'Lampada da lettura',features:'Luce calda. Luminosità regolabile.',bad:{features:'Solo luce fredda. Luminosità regolabile.'}},
  {id:'T34',area:'techGaming',sub:'tech',it:'Cuffie con microfono per videochiamate. Il dispositivo supporta Bluetooth. Il dispositivo usa Windows.',en:'Headphones with microphone for video calls. The device supports Bluetooth. The device uses Windows.',title:'Cuffie con microfono',features:'Microfono per videochiamate. Bluetooth. Windows.',bad:{title:'Smartphone Android'}},
  {id:'T35',area:'techGaming',sub:'tech',it:'Cornice per inviare le mie foto a distanza. Il telefono usa Android. Il dispositivo supporta WiFi e internet.',en:'A frame to share my photos remotely. The phone uses Android. The device supports WiFi and internet.',title:'Cornice digitale WiFi',features:'Invio foto a distanza. App per inviare foto. Android. WiFi e internet.',bad:{title:'Smartphone Android'}},
  {id:'S19-new',area:'styleBeauty',sub:'skincare',it:'Solo crema mani senza profumo.',en:'Only hand cream, fragrance free.',title:'Crema mani senza profumo',features:'Senza profumo. Fragrance free.',bad:{title:'Crema corpo senza profumo'}},
  {id:'S23-new',area:'styleBeauty',sub:'skincare',it:'Detergente viso per pelle sensibile, senza profumo.',en:'Face cleanser for sensitive skin, fragrance free.',title:'Detergente viso senza profumo',features:'Senza profumo. Fragrance free.',bad:{title:'Crema viso senza profumo'}},
  {id:'S34',area:'styleBeauty',sub:'skincare',it:'Crema mani che si assorba rapidamente.',en:'Hand cream that absorbs quickly.',title:'Crema mani',features:'Si assorbe rapidamente.',bad:{title:'Siero viso'}},
  {id:'S35',area:'styleBeauty',sub:'skincare',it:'Due maschere viso da usare insieme.',en:'Two face masks to use together.',title:'Maschere viso in tessuto',features:'2 maschere viso individuali.',bad:{features:'Una sola maschera viso.'}}
 ];
 const original=globalThis.fetch;let simulatedCalls=0,flows=0,refinements=0,clarifications=0;
 try{for(const lang of ['it','en'])for(const [index,c] of cases.entries()){
  const {db,binding}=database();
  try{
   const r=createRuntime(lang);r.seed();r.set('interest',[c.area]);r.set('subinterest',[c.sub]);r.set('budgetChoice','60');r.set('minBudget','15');r.set('note',c[lang]);
   const goodAsin='B'+String(index*10+1).padStart(9,'0'),badAsin='B'+String(index*10+2).padStart(9,'0');
   const item=(bad=false)=>{
    const x={...c,language:'Italiano',binding:'Copertina flessibile',...(bad?c.bad:{})},asin=bad?badAsin:goodAsin;
    return {asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:x.title},features:{displayValues:[x.features]},...(c.book?{classifications:{productGroup:{displayValue:'Books'},binding:{displayValue:x.binding}},byLineInfo:{contributors:[{name:'Autore Test',roleType:'author'}]},contentInfo:{languages:{displayValues:[{type:'Pubblicato',displayValue:x.language}]}}}:{})},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}};
   };
   globalThis.fetch=async(url,options)=>{
    if(url.endsWith('/auth/o2/token'))return Response.json({access_token:'fixture',expires_in:3600});
    simulatedCalls++;return Response.json({searchResult:{items:[item(),item(true)]}});
   };
   const requests=[],responses=[];
   r.c.fetch=async(url,options)=>{
    const body=JSON.parse(options.body);requests.push(body);
    assert.ok(!('note' in body.profile));assert.ok(!JSON.stringify(body).includes('lepre'));
    const response=await worker.fetch(new Request('https://3gifts.it/api/amazon/recommend',{...options,signal:undefined,headers:{Origin:'https://3gifts.it','Content-Type':'application/json'}}),{DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'m5-fixture-'+index+'-'+lang,AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'3gifts-21'});
    const data=await response.json();responses.push(data);return {ok:response.ok,json:async()=>data};
   };
   if(c.id==='T34'||c.id==='T35'||c.id==='C-T17'||c.id==='C-T18'){
    r.set('note',c[lang].split('.')[0]+'.');const before=simulatedCalls;
    await r.a.showResults();assert.equal(responses[0].code,'ConstraintsNeedReview');assert.equal(simulatedCalls,before);
    const prompt=r.el('#zeroRecoveryText').textContent;if(c.id==='T34'||c.id==='T35')assert.ok(prompt.includes(lang==='en'?'operating system':'sistema operativo'),prompt);
    if(c.id==='T34'||c.id==='T35')assert.ok(prompt.includes(c.id==='T34'?'Bluetooth':'Wi-Fi'),prompt);
    else assert.ok(prompt.includes(c.id==='C-T18'?'USB-C':lang==='en'?'compatibility':'compatibilità'),prompt);
    r.set('note',c[lang]);requests.length=0;responses.length=0;clarifications++;
   }
   await r.a.showResults();assert.equal(requests.length,1,lang+' '+c.id);
   assert.deepEqual(responses[0].products.map(p=>p.asin),[goodAsin],lang+' '+c.id+' '+JSON.stringify(responses[0]));
   assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,1);
   if(c.id==='L32'||c.id==='L33'||c.id==='L18-recovery'||c.id==='L19-recovery'||c.id==='C-S17'||c.id==='C-T21'||c.id==='C-L17'){
    r.set('refineReason','owned');r.set('refineDirection','differentType');r.set('refineSurprise','balanced');
    const form=r.el('#refinementForm');await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
    assert.equal(requests.length,2);assert.deepEqual(requests[1].constraints.exclusions,requests[0].constraints.exclusions);
    assert.equal(responses[1].products.length,0);refinements++;
   }
   flows++;console.log('PASS '+lang+' '+c.id+' browser code → assembled Worker → product card');
  }finally{db.close();}
 }}finally{globalThis.fetch=original;}
 console.log(JSON.stringify({flows,refinements,clarifications,simulatedCalls,realAmazonCalls:0,actualWorkerSerialization:true,browserQA:false}));
})().catch(e=>{console.error(e);process.exitCode=1});
