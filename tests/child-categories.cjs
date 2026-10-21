const {installResearchFixture,submitRefinement}=require('./research-api-fixture.cjs');
const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
let assertions=0;
const check=(ok,label)=>{assert.ok(ok,label);assertions++};
async function main(){
for(const language of ['it','en']){
 const r=createRuntime(language);r.seed();await installResearchFixture(r);
 const input=(name,value)=>r.inputs.find(x=>x.name===name&&x.value===value);
 const visible=()=>r.inputs.filter(x=>x.name==='interest'&&!x.disabled&&!x.group.hidden);
 const choose=(name,value)=>r.set(name,value).dispatchEvent({type:'change'});
 const select=(name,value)=>{const x=input(name,value);x.checked=true;x.dispatchEvent({type:'change'});return x};
 choose('ageRange','adult');choose('interest',['styleBeauty','foodDrink']);choose('subinterest',['beauty','wine']);
 choose('ageRange','earlyChild');
 check(visible().length===8&&visible().every(x=>x.value.startsWith('early')),language+': eight dedicated early-childhood categories');
 check(r.a.formData().interests.length===0&&r.a.formData().subinterests.length===0,language+': adult answers removed from the submitted profile');
 check(!r.el('#childStageQuestion').hidden&&r.a.formData().childStage==='all',language+': optional age detail starts unspecified');
 for(const age of ['earlyChild','child']){
  choose('ageRange',age);
  for(const x of r.inputs.filter(x=>x.name==='interest'&&(x.group.dataset.audience||'general')==='general')){
   check(x.disabled&&x.group.hidden&&!x.checked,language+': adult category inaccessible '+x.value);
   check(x.group.querySelector('.subinterests').controls.every(s=>s.disabled&&!s.checked),language+': adult subcategories excluded '+x.value);
  }
  check(visible().length===8,language+': complete child categories');
  r.eval('step=5');r.a.renderStep();check(!r.a.valid(),language+': child interest must be answered');
  const areas=visible();select('interest',areas[0].value);select('interest',areas[1].value);select('interest',areas[2].value);
  check(!areas[2].checked&&r.a.formData().interests.length===2,language+': two-area limit');
  const subs=areas.slice(0,2).flatMap(x=>x.group.querySelector('.subinterests').controls.filter(s=>!s.disabled));
  subs.slice(0,5).forEach(x=>select('subinterest',x.value));
  check(r.a.formData().subinterests.length===4&&!subs[4].checked,language+': four-subcategory limit');
  const before=JSON.stringify(r.a.formData().interests);r.a.renderStep();
  check(JSON.stringify(r.a.formData().interests)===before&&r.a.valid(),language+': navigation preserves applicable choices');
  areas[0].checked=false;areas[0].dispatchEvent({type:'change'});
  check(areas[0].group.querySelector('.subinterests').hidden&&areas[0].group.querySelector('.subinterests').controls.every(s=>!s.checked),language+': deselecting parent clears children');
  const direction=r.eval('categoryFor(formData())');
  check(!/Skincare|Produttività|Degustazioni|Gadget ironici/.test(JSON.stringify(direction))&&direction.options.length>0,language+': explore direction uses child choices');
  await r.a.showResults();
  if(age==='earlyChild')check(!r.el('#resultGrid').innerHTML&&!r.el('#zeroRecovery').hidden,language+': unspecified 0-6 stage remains conservative');
  else check(r.el('#resultGrid').innerHTML&&/Amazon/.test(r.el('#resultGrid').innerHTML),language+': documented child catalog produces age-appropriate Amazon ideas');
 }
 choose('ageRange','earlyChild');choose('childStage','preschool');choose('interest',['earlyCreative','earlyBooks']);choose('subinterest',['earlyCreative_firstDrawing','earlyBooks_storytelling']);
 choose('childStage','infant');
 check(visible().map(x=>x.value).join(',')==='earlySensory,earlyBooks,earlyMusic',language+': infant only gets appropriate categories');
 check(!input('interest','earlyCreative').checked&&input('interest','earlyCreative').disabled,language+': preschool choice removed');
 check(r.a.formData().subinterests.length===0,language+': preschool subchoices removed');
 check(input('subinterest','earlyBooks_softBooks').disabled===false&&input('subinterest','earlyBooks_storytelling').disabled,language+': book options adapt within same parent');
 choose('childStage','toddler');check(visible().length===7&&!visible().some(x=>x.value==='earlyCreative'),language+': toddler categories');
 choose('childStage','preschool');check(visible().length===7&&!visible().some(x=>x.value==='earlySensory'),language+': preschool categories');
 choose('ageRange','child');check(r.a.formData().childStage===null&&r.el('#childStageQuestion').hidden,language+': early stage cannot leak into school-age profile');
 choose('interest',['kidsScience']);choose('subinterest',['kidsScience_codingRobots']);
 const profile={...r.a.formData(),allowUnverified:true};
 // Synthetic Amazon URL for this isolated test only; never exported to the catalog.
 const product=r.a.normalizeProduct({id:'test-child-science',name:'Robot didattico per bambini',price:35,directUrl:'https://www.amazon.it/dp/B000000000',tags:['kidsScience','kidsScience_codingRobots'],ageSuitability:{minYears:7,maxYears:12,verified:true,sourceUrl:'https://maker.example/robot'}});
 check(r.a.rankProducts([product],profile,r.a.analyseNote('')).length===1,language+': dedicated category and subcategory reach ranking');
 check(!r.R.interestEligible({...product,tags:['techGaming','tech']},profile),language+': generic adult tech is not kids robotics');
 check(!r.R.ageEligible({...product,ageSuitability:null},profile),language+': child category never implies verified age suitability');
 check(!r.R.ageEligible({...product,ageSuitability:{...product.ageSuitability,minYears:9}},profile),language+': a 9+ toy does not cover all 7-12');
 choose('ageRange','earlyChild');choose('childStage','preschool');
 const pre={...product,ageSuitability:{...product.ageSuitability,minYears:3,maxYears:6}};
 check(r.R.ageEligible(pre,r.a.formData()),language+': verified preschool range accepted');
 choose('childStage','infant');check(!r.R.ageEligible(pre,r.a.formData()),language+': preschool product cannot enter infant results');
 choose('childStage','all');check(!r.R.ageEligible(pre,r.a.formData()),language+': unspecified early age remains conservative');
 for(const age of ['teen','adult','unknown']){
  choose('ageRange',age);check(visible().length===12&&visible().every(x=>!x.group.dataset.audience),language+': general path restored');
  check(r.inputs.filter(x=>x.name==='interest'&&x.group.dataset.audience).every(x=>x.disabled&&!x.checked),language+': child answers removed');
 }
 r.el('#restartBtn').click();check(r.a.formData().interests.length===0&&r.el('#childStageQuestion').hidden,language+': restart clears child flow');
}
console.log(JSON.stringify({assertions,languages:2,browserQA:false,errors:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
