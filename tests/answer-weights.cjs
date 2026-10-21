const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
let checks=0;const check=(ok,label)=>{assert.ok(ok,label);checks++};
const sensitivity=[];
for(const lang of ['it','en']){
 const r=createRuntime(lang);r.seed();
 const base={...r.a.formData(),ageRange:'unknown',relation:'none',occasion:'none',tone:'neutral',timing:'none',budget:500,minBudget:0,allowUnverified:true,interests:[],subinterests:[],avoid:[],note:''};
 const a=r.a.analyseNote('');
 const fixture=(id,tags,extra={})=>({...r.a.normalizeProduct({id,name:'Fixture '+id,store:'Amazon',price:300,directUrl:'https://www.amazon.it/dp/B0'+String(id).padStart(8,'0'),tags}),...extra,tags});
 const item=fixture(101,['techGaming','tech','photo','practical','friend','creative','home','birthday','sentimental','symbolic']);
 const score=(p={},analysis=a)=>r.a.rankProducts([item],{...base,...p},analysis)[0]?.affinity;
 check(score({interests:['techGaming']})===3,'area +3');
 check(score({subinterests:['tech']})===7,'subinterest effective +7');
 check(score({relation:'friend'})===1.5,'direct relation +1.5');
 check(score({relation:'family'})===1.5,'relation context +1.5');
 check(score({occasion:'birthday'})===3,'occasion direct and context +3');
 check(score({tone:'useful'})===7.5,'three tone signals +7.5');
 check(score({ageRange:'adult'})===.35,'adult age soft +0.35');
 check(score({}, {...a,signals:['photo']})===5,'note +5');
 check(score({}, {...a,signals:['photo','tech']})===12,'two note signals +12');
 check(score({mode:'giver'})===score({mode:'recipient'}),'perspective does not change ranking');
 const candidates=[fixture(110,['techGaming','tech','practical']),fixture(111,['culture','books','sentimental']),fixture(112,['artPhoto','photo','creative']),fixture(113,['homeGarden','home']),fixture(114,['mediaAudio','music'])];
 const ids=(p,analysis=a)=>r.a.rankProducts(candidates,{...base,...p},analysis).map(x=>x.id).join();
 check(ids({interests:['techGaming']})!==ids({interests:['culture']}),'changing significant area changes output');
 check(ids({subinterests:['tech']})!==ids({subinterests:['books']}),'changing subinterest changes output');
 check(ids({},r.a.analyseNote('Ama la fotografia'))!==ids({},r.a.analyseNote('Ama i libri')),'note changes output');
 check(ids({tone:'useful'})!==ids({tone:'sentimental'}),'emotion changes ordering');
 check(ids({occasion:'birthday'})!==ids({occasion:'newhome'}),'occasion changes ordering');
 check(ids({relation:'family'})!==ids({relation:'colleague'}),'relation changes ordering');
 const male=fixture(115,['styleBeauty'],{recipientTarget:'men'});
 check(r.a.rankProducts([male],{...base,recipientPreference:'women'},a).length===0,'recipient preference hard filter');
 check(r.a.rankProducts([male],{...base,recipientPreference:'men'},a).length===1,'recipient preference accepts matching target');
 check(r.a.rankProducts([male],{...base,ageRange:'earlyChild',childStage:'infant'},a).length===0,'age safety filter');
 check(r.a.rankProducts(candidates,{...base,interests:['techGaming']},r.a.analyseNote('no tech')).length===0,'negative note overrides positive area');
 const orderA=ids({interests:['techGaming','culture']}),orderB=ids({interests:['culture','techGaming']});
 check(orderA===orderB,'equally suitable area coverage independent of order');
 // One changed answer at a time on real catalog. A context answer need not
 // change the winning three when catalog coverage is sparse; record, not fake.
 if(lang==='it')for(const budget of [75,300,500]){
  const p={...base,budget,ageRange:'adult',relation:'friend',occasion:'birthday',interests:['techGaming','culture'],subinterests:[]};
  const run=q=>r.a.rankProducts(r.products,q,r.a.analyseNote(q.note)).map(x=>x.id).join();
  const original=run(p);
  for(const [field,value]of [['relation','family'],['ageRange','mature'],['occasion','newhome'],['tone','sentimental'],['interests',['mediaAudio','artPhoto']],['subinterests',['books']],['note','Ama i libri'],['avoid',['tech']],['recipientPreference','women']])sensitivity.push({budget,field,original,changed:run({...p,[field]:value})});
 }
}
console.log(JSON.stringify({checks,languages:2,errors:0,browserQA:false,...(process.argv.includes('--summary')?{}:{sensitivity})},null,2));
