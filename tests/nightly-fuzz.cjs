// Seeded, local-only invariant testing of the complete application, not the landing page.
const {createRuntime}=require('./published-runtime.cjs');
const seed=Number(process.argv[2]||2026091801)>>>0;
let state=seed||1;
const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
const pick=a=>a[Math.floor(random()*a.length)];
const runtimes={it:createRuntime(),en:createRuntime('en')};
Object.values(runtimes).forEach(r=>r.seed());
const areas=['techGaming','culture','mediaAudio','foodDrink','travelOutdoor','sportFitness','artPhoto','homeGarden','styleBeauty','animalsNature','gamesCollecting','newsBusiness'];
const notes=[['',''],['niente abbonamenti','no subscriptions'],['niente profumi','no perfume'],['niente oggetti ingombranti','no bulky items'],['allergico alle noci','allergic to nuts'],['senza glutine','gluten-free'],['<img src=x onerror=alert(1)>','<img src=x onerror=alert(1)>'],['😀 '.repeat(100),'😀 '.repeat(100)],['non solo libri ma anche musica','not only books but also music']];
const avoids=[[],['bulky'],['sizes'],['foodAlcohol'],['subscriptions'],['experiences'],['gadgets'],['bulky','sizes','gadgets']];
const failures=[];let assertions=0,profiles=0,blocked=0,maxRankMs=0;
function check(ok,label,detail){assertions++;if(!ok&&failures.length<80)failures.push({label,...detail});}
for(let i=0;i<2000;i++){
 const lang=i%2?'en':'it',r=runtimes[lang];
 const interest=pick(areas),interest2=pick(areas),timing=pick(['urgent2','week','month','none','exact']);
 const notePair=pick(notes),note=notePair[lang==='en'?1:0];
 const profile={...r.a.formData(),interests:[...new Set([interest,interest2])],subinterests:[],budget:15+5*Math.floor(random()*58),timing,deadline:r.R.dateAfter(Math.floor(random()*366)),mode:pick(['recipient','giver']),avoid:pick(avoids),note,allowUnverified:true};
 const degradation=pick([0,0,0,.3,.7,1]);
 const catalog=r.products.filter(()=>random()>=degradation);
 const analysis=r.a.analyseNote(note),start=performance.now();
 let selected;
 try{selected=r.a.rankProducts(catalog,profile,analysis);}catch(error){failures.push({label:'ranking-exception',i,lang,profile,error:String(error)});continue;}
 maxRankMs=Math.max(maxRankMs,performance.now()-start);profiles++;if(selected.length<3)blocked++;
 const detail={i,lang,profile,catalogSize:catalog.length,ids:selected.map(p=>p.id)};
 check(selected.length<=3,'maximum-three',detail);
 check(new Set(selected.map(p=>p.id)).size===selected.length,'unique-ids',detail);
 check(selected.every(p=>Number.isFinite(p.price)&&p.price>0&&p.price<=profile.budget),'price-budget',detail);
 check(selected.every(p=>r.H.isEligible(p)),'availability',detail);
 check(selected.every(p=>!r.R.violatesExclusions(p,profile,analysis)),'structured-exclusions',detail);
 check(selected.every(p=>catalog.some(candidate=>candidate.id===p.id)),'no-invented-products',detail);
 const again=r.a.rankProducts(catalog,profile,analysis);
 check(JSON.stringify(selected.map(p=>p.id))===JSON.stringify(again.map(p=>p.id)),'determinism',detail);
 if(analysis.needsClarification)check(selected.length===0,'ambiguous-or-safety-note-fails-closed',detail);
 if(!note){const other=runtimes[lang==='it'?'en':'it'];const translatedCatalog=other.products.filter(p=>catalog.some(c=>c.id===p.id));const comparison=other.a.rankProducts(translatedCatalog,profile,other.a.analyseNote(''));check(JSON.stringify(selected.map(p=>p.id))===JSON.stringify(comparison.map(p=>p.id)),'language-parity',detail);}
}
console.log(JSON.stringify({seed,profiles,assertions,blockedProfiles:blocked,maxRankingMs:Math.round(maxRankMs*100)/100,failures,totalFailures:failures.length,browserQA:false,liveNetworkRequests:0},null,2));
if(failures.length)process.exitCode=1;
