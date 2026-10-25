// Relationship before age, couple and adult-only relationships, child bands and hidden dead-end choices.
const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
for(const language of ['it','en']){
  const r=createRuntime(language);r.seed();
  const change=(name,value)=>r.set(name,value).dispatchEvent({type:'change'});
  assert.equal(r.steps.map(s=>s.dataset.stepKey).join(','),'relation_age,occasion,interests,tone,budget_timing_details',language+': screen order');
  r.a.renderStep();assert.ok(/(Passo|Step) 1 (di|of) 5/.test(r.el('#stepLabel').textContent),language+': progress counts steps');

  change('ageRange','teen');change('relation','partner');
  for(const age of ['earlyChild','child','teen'])assert.ok(r.el('#age-'+age).hidden&&r.inputs.find(i=>i.name==='ageRange'&&i.value===age).disabled,language+': partner hides '+age);
  assert.equal(r.a.formData().ageRange,null,language+': stale minor age cleared for a partner');
  change('relation','couple');
  assert.ok(r.el('#recipientPreferenceQuestion').hidden,language+': couple hides product preference');
  assert.equal(r.a.formData().recipientPreference,'unisex',language+': couple searches unisex');
  change('relation','family');
  assert.ok(!r.el('#age-child').hidden&&!r.el('#recipientPreferenceQuestion').hidden,language+': family restores minors and preference');

  change('ageRange','child');
  assert.ok(!r.el('#childBandQuestion').hidden,language+': 7–12 asks the band');
  assert.equal(r.a.formData().childStage,'all',language+': band defaults to unknown');
  change('childBand','preteen');
  assert.equal(r.a.formData().childStage,'preteen',language+': band reaches the profile');
  assert.equal(r.a.formData().relation,'child',language+': minors keep the child relation');
  const ten={name:'Kit 10+',tags:[],ageSuitability:{verified:true,sourceUrl:'https://example.com',minYears:10,maxYears:99}};
  assert.ok(r.R.ageEligible(ten,{ageRange:'child',childStage:'preteen'}),language+': 10+ product allowed for 10–12');
  assert.ok(!r.R.ageEligible(ten,{ageRange:'child',childStage:'all'}),language+': 10+ product still excluded for undetermined 7–12');
  assert.ok(!r.R.ageEligible(ten,{ageRange:'child',childStage:'middle'}),language+': 10+ product excluded for 7–9');
  change('ageRange','earlyChild');
  assert.ok(r.el('#childBandQuestion').hidden&&r.el('#occasion-thanks').hidden,language+': 0–6 hides band and thank-you occasion');

  change('ageRange','unknown');
  assert.ok(r.el('#wineInterest').hidden&&r.inputs.find(i=>i.value==='wine').disabled,language+': wine hidden for undisclosed age');
  change('ageRange','adult');
  assert.ok(!r.el('#wineInterest').hidden,language+': wine available for adults');

  r.set('interest',['travelOutdoor','homeGarden']);r.eval('syncInterestFlow()');r.set('subinterest',['organization']);
  assert.equal(JSON.stringify(r.a.formData().subinterests),'["organization"]',language+': shared subcategory sent once');
}
(async()=>{for(const language of ['it','en']){
  // Service failure: a retry button repeats the same search; other recoveries keep it hidden.
  const r=createRuntime(language);r.seed();r.set('relation','family');r.set('ageRange','child');r.eval('syncAgeFlow()');
  r.set('interest',['kidsGames']);r.eval('syncInterestFlow()');
  let calls=0;r.c.fetch=async()=>{calls++;throw new Error('down')};
  await r.a.showResults();
  assert.ok(!r.el('#retryRecovery').hidden,language+': retry offered when the service fails');
  assert.ok(!r.el('#specifyAgeRecovery').hidden,language+': undetermined 7–12 offers the age band');
  const before=calls;r.el('#retryRecovery').click();await new Promise(x=>setTimeout(x,50));
  assert.ok(calls>before,language+': retry runs the search again');
  r.el('#specifyAgeRecovery').click();
  assert.equal(r.c.step??r.eval('step'),1,language+': age recovery returns to the first screen');
  assert.equal(r.clock.scroll,'#childBandQuestion',language+': age recovery points at the 7–12 band');
  r.a.showZeroRecovery({...r.a.formData(),allowUnverified:true},0,r.a.analyseNote(''));
  assert.ok(r.el('#retryRecovery').hidden,language+': no retry for an ordinary zero result');
  r.a.renderProductCards([r.products.find(p=>p.asin)],{...r.a.formData(),allowUnverified:true});
  assert.ok(r.el('#resultGrid').innerHTML.includes('rel="sponsored nofollow noopener noreferrer"'),language+': product links are marked sponsored');
}
console.log('Recovery IT/EN: retry, 7–12 band and sponsored links passed.')})().catch(e=>{console.error(e);process.exit(1)});
console.log('Questionnaire order IT/EN: relationship first, adult-only ages, couple preference, child bands, wine and duplicates passed.');
