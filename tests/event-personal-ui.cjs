const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 for(const language of ['it','en']){
  const r=createRuntime(language);r.seed();r.set('occasion','wedding');r.set('interest',['culture']);r.set('subinterest',['books']);
  const calls=[];r.c.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({method:'research-20261007',products:[1,2,3].map(n=>({asin:'B'+String(calls.length*10+n).padStart(9,'0'),parentAsin:'B'+String(1000+calls.length*10+n).padStart(9,'0'),name:'Romanzo avventura',store:'Amazon',type:'product',tags:['culture','books'],price:30,amazonPrice:true,url:'https://www.amazon.it/dp/B'+String(calls.length*10+n).padStart(9,'0')+'?tag=3gifts-21',conceptFamily:'culture:book'+n,researchMethod:true}))})}};
  await r.a.showResults();
  r.el('#refineBtn').listeners.click[0]();
  assert.match(r.el('#refineDirection').innerHTML,language==='it'?/Più personale/:/More personal/);
  const form=r.el('#refinementForm');
  r.set('refineReason','oneCategory');r.set('refineDirection','personal');r.set('refineSurprise','balanced');
  await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
  assert.equal(calls[1].profile.searchPriority,'personal');assert.equal(calls[1].profile.occasion,'wedding');assert.deepEqual(calls[1].profile.interests,['culture']);assert.equal(calls[1].profile.budget,calls[0].profile.budget);assert.equal(calls[1].rejectedAsins.length,3);assert.ok(!calls[1].profile.excludedInterests?.length);
  r.set('refineReason','banal');r.set('refineDirection','funny');r.set('refineSurprise','balanced');
  await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
  assert.equal(calls[2].profile.searchPriority,'personal');assert.equal(calls[2].rejectedAsins.length,6);
 }
 console.log('Event/personal UI IT/EN: option, request, constraints and persistence passed.');
})().catch(e=>{console.error(e);process.exit(1)});
