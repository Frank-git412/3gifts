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
console.log('Questionnaire order IT/EN: relationship first, adult-only ages, couple preference, child bands, wine and duplicates passed.');
