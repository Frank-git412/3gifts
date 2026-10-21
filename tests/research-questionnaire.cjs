const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
// Distinct works, not several ASINs attached to the same generic book title.
const item=(id,title='Romanzo di avventura')=>({asin:'B'+String(id).padStart(9,'0'),name:title+': Storia '+id,productGroup:'Books',bookMetadata:{authors:['Autore di prova'],binding:'Paperback'},store:'Amazon',type:'product',tags:['culture','books'],price:30,amazonPrice:true,amazonCheckedAt:new Date().toISOString(),url:'https://www.amazon.it/dp/B'+String(id).padStart(9,'0')+'?tag=3gifts-21',imageUrl:'https://m.media-amazon.com/images/I/test.jpg',parentAsin:'B'+String(1000+id).padStart(9,'0'),conceptFamily:'culture:family'+id,why:'Coerente con libri, fumetti e cultura. Prezzo nella fascia richiesta.',researchMethod:true});
(async()=>{
 for(const language of ['it','en']){
  const r=createRuntime(language);r.seed();r.set('interest',['culture']);r.set('subinterest',['books']);r.set('note','INTERNAL PRIVATE NOTE');
  const calls=[];r.c.fetch=async(url,options)=>{calls.push({url,data:JSON.parse(options.body)});return {ok:true,json:async()=>({method:'research-20261007',products:[item(calls.length*10+1),item(calls.length*10+2),item(calls.length*10+3)]})}};
  await r.a.showResults();assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/amazon/recommend');assert.ok(!JSON.stringify(calls).includes('INTERNAL PRIVATE NOTE'));assert.ok(!('deadline' in calls[0].data.profile));assert.ok(!('note' in calls[0].data.profile));
  assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,3);assert.match(r.el('#resultGrid').innerHTML,/Prezzo Amazon|Amazon price/);assert.match(r.el('#recommendationStatus').textContent,language==='it'?/Scelti in base alle tue risposte/:/Picked from your answers/);
  if(language==='en')assert.ok(!r.el('#resultGrid').innerHTML.includes('Coerente con'));
  r.set('refineReason','owned');r.set('refineDirection','differentType');r.set('refineSurprise','balanced');
  const form=r.el('#refinementForm'),event={preventDefault(){},currentTarget:form};
  const pending=form.listeners.submit[0](event);event.currentTarget=null;await pending;
  assert.equal(calls.length,2);assert.equal(calls[1].data.rejectedAsins.length,3);assert.equal(calls[1].data.rejectedConcepts.length,3);assert.equal(calls[1].data.rejectedParentAsins.length,3);assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,3);
  assert.ok(!r.el('#resultGrid').innerHTML.includes('/dp/B000000011'));
  r.set('refineReason','banal');r.set('refineDirection','funny');r.set('refineSurprise','balanced');
  const funnyEvent={preventDefault(){},currentTarget:form};const funnyPending=form.listeners.submit[0](funnyEvent);funnyEvent.currentTarget=null;await funnyPending;
  assert.equal(calls[2].data.profile.refinementDirection,'funny');assert.equal(calls[2].data.rejectedConcepts.length,0);assert.equal(calls[2].data.rejectedAsins.length,6);assert.ok(!calls[2].data.constraints.requiredSignals.includes('funny'));assert.ok(!calls[2].data.constraints.requiredSignals.includes('social'));assert.equal(form.hidden,true);assert.match(r.el('#recommendationStatus').textContent,/2/);
  assert.equal(calls[0].data.profile.relation,'friend');assert.equal(calls[0].data.profile.occasion,'birthday');
  r.set('refineReason','banal');r.set('refineDirection','funny');r.set('refineSurprise','balanced');
  const lastEvent={preventDefault(){},currentTarget:form},lastPending=form.listeners.submit[0](lastEvent);lastEvent.currentTarget=null;await lastPending;
  assert.equal(calls[3].data.rejectedAsins.length,9);assert.equal(r.el('#refineBtn').hidden,true);assert.match(r.el('#recommendationStatus').textContent,/3/);
 }
 const failure=createRuntime('it');failure.seed();failure.c.fetch=async()=>({ok:false});await failure.a.showResults();assert.equal(failure.el('#resultGrid').innerHTML,'');assert.equal(failure.el('#zeroRecovery').hidden,false);assert.match(failure.el('#zeroRecoveryTitle').textContent,/momentaneamente/);
 console.log('Public questionnaire IT/EN: selection, notes staying local, Amazon cards, refinement exclusions and failure handling passed.');
})().catch(e=>{console.error(e);process.exit(1)});
