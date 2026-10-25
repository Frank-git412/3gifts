// Reproductions of N1–N9 from the v45 audit, using the deployed source files.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createRuntime,ROOT}=require('./published-runtime.cjs');
let assertions=0;
function check(condition,label){assert.ok(condition,label);assertions++}
const plain=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function offer(r,id,extra={}){return r.a.normalizeProduct({id,name:'Fixture '+id,price:15,directUrl:'https://shop.example/product/'+id,tags:['techGaming','tech'],constraints:{bulky:false,sizes:false},offer:{url:'https://shop.example/product/'+id,checkedAt:new Date().toISOString(),available:true,giftable:true,variantConfirmed:true,destinationCountry:'IT',total:{amount:20,currency:'EUR',includesShipping:true,includesPersonalization:true},delivery:{verified:true,by:r.R.dateAfter(1)}},...extra})}

async function main(){
 const r=createRuntime();r.seed();const base=r.a.formData(),empty=r.a.analyseNote('');
 // N1: positive clauses, negative lists and modifiers must remain distinct.
 for(const note of ['non ama il vino e preferisce i libri','non ama il vino e gli piacciono i libri','non ama il vino, ama i libri','non ama il vino. Ama i libri']){
  const a=r.a.analyseNote(note);check(a.signals.includes('books')&&!a.exclusions.includes('books')&&a.exclusions.includes('wine')&&!a.needsClarification,note);
 }
 for(const note of ['non ama il vino e i libri gli piacciono','non ama il vino e i libri sì']){
  const a=r.a.analyseNote(note);check(a.signals.includes('books')&&!a.exclusions.includes('books')&&a.exclusions.includes('wine'),note);
 }
 for(const note of ['no tech, libri e vino','no tech e libri e vino']){
  const a=r.a.analyseNote(note);check(['tech','books','wine'].every(t=>a.exclusions.includes(t))&&a.signals.length===0,'negative list: '+note);
 }
 check(['books','wine'].every(t=>r.a.analyseNote('non ama il vino e non vuole libri').exclusions.includes(t)),'second negation stays negative');
 for(const note of ['non solo libri','non soltanto libri ma anche musica'])check(!r.a.analyseNote(note).exclusions.includes('books'),'not only: '+note);
 check(r.a.analyseNote('non solo non ama il vino').exclusions.includes('wine'),'nested explicit negative preserved');
 check(r.a.analyseNote('niente materiali ruvidi e ama i libri').needsClarification,'unknown restriction still needs clarification');
 // N2: accented drink / unaccented drink with context / pronoun.
 for(const note of ['regalo per te','qualcosa che parla di te','un ricordo con te'])check(!r.a.analyseNote(note).signals.includes('food'),'pronoun: '+note);
 for(const note of ['ama tè e caffè','ama TÈ','ama TE\u0300','ama il te','te verde'])check(r.a.analyseNote(note).signals.includes('food'),'drink: '+note);
 check(r.a.analyseNote('non ama il tè').exclusions.includes('food'),'tea exclusion');
 // N3: replay the exact failing UI refinement, with a real boundary inserted by the app.
 const f=createRuntime();f.seed();f.set('note','no tech');await f.a.showResults(true);
 f.set('refineReason','impersonal').dispatchEvent({type:'change'});f.set('refineDirection','passion');f.set('refineSurprise','balanced');f.set('refineDetail','Ama i libri');f.el('#refinementForm').dispatchEvent({type:'submit'});
 check(!f.el('#refinementError').textContent&&f.el('#recommendationStatus').textContent.includes('Affinamento 1 di 3'),'refinement succeeds with positive detail after exclusion');
 check(f.eval('lastProfile.note')==='no tech\nAma i libri','note contributions remain separate');
 check(f.eval('analyseNote(lastProfile.note).exclusions.includes("tech")&&!analyseNote(lastProfile.note).exclusions.includes("books")'),'original restriction retained, new preference positive');
 check((f.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length===3,'refinement renders three cards');
 check(f.events.filter(e=>e.name==='recommendations_refined').every(e=>Object.keys(e.data).join(',')==='round'),'refinement note remains private');
 // N4: block every declared negative state, including conflicting status fields.
 const statuses=['NON DISPONIBILE','OUT_OF_STOCK','out of stock','out-of-stock','unavailable','sold_out','NOT_AVAILABLE','ESAURITO','LINK ROTTO: 404'];
 for(const field of ['availabilityStatus','availability','monitorStatus','catalogStatus','status'])for(const status of statuses){
  const p=offer(r,'stock-'+field+'-'+status,{[field]:status});
  check(r.a.rankProducts([p],base,empty).length===0&&r.a.rankProducts([p],{...base,allowUnverified:true},empty).length===0,field+': '+status);
 }
 check(!r.H.isEligible({availabilityStatus:'AVAILABLE',status:'OUT_OF_STOCK'}),'negative field overrides positive field');
 check(r.H.itemKey({name:'A-B'})!==r.H.itemKey({name:'A B'}),'status normalization does not merge distinct product identities');
 check(!r.H.isEligible(r.a.normalizeProduct({availability:false})),'boolean unavailable survives normalization');
 check(r.a.rankProducts([offer(r,'valid')],base,empty).length===1,'valid offer is not overblocked');
 // N5: failed health fetch can retry, successful in-flight fetch is deduplicated.
 const n=createRuntime();n.c.window.TRE_REGALI_CONFIG.catalogHealthEndpoint='https://test.invalid/health';let calls=0;
 n.c.fetch=async()=>{calls++;if(calls===1)throw Error('offline');return{ok:true,json:async()=>({products:[]})}};
 check(await n.a.fetchCatalogHealth()===null,'first network failure recovers');check((await n.a.fetchCatalogHealth()).products.length===0&&calls===2,'second attempt reaches service');
 await n.a.fetchCatalogHealth();check(calls===2,'successful health snapshot reused');
 const concurrent=createRuntime();concurrent.c.window.TRE_REGALI_CONFIG.catalogHealthEndpoint='https://test.invalid/health';let healthResolve,healthCalls=0;
 concurrent.c.fetch=()=>{healthCalls++;return new Promise(resolve=>healthResolve=()=>resolve({ok:true,json:async()=>({products:[]})}))};
 const h1=concurrent.a.fetchCatalogHealth(),h2=concurrent.a.fetchCatalogHealth();healthResolve();await Promise.all([h1,h2]);check(healthCalls===1,'in-flight health requests deduplicated');
 // N6: reset must invalidate late success and failure in every async phase.
 for(const phase of ['catalog','health','ai'])for(const failed of [false,true]){
  const q=createRuntime();q.seed();await q.a.showResults();let release;
  const key={catalog:'catalogProductsEndpoint',health:'catalogHealthEndpoint',ai:'aiRankingEndpoint'}[phase];q.c.window.TRE_REGALI_CONFIG[key]='https://test.invalid/pending';
  q.c.fetch=()=>new Promise((resolve,reject)=>release=()=>failed?reject(Error('late error')):resolve({ok:true,json:async()=>phase==='ai'?{}:{products:[]}}));
  const pending=q.a.showResults(true);await tick();q.el('#restartBtn').click();release();await pending;
  check(q.el('#results').hidden&&!q.el('.hero-concept').hidden&&q.a.formData().relation===null,'reset beats late '+phase+' '+failed);
  check(q.el('#resultGrid').innerHTML===''&&q.el('#recommendationStatus').textContent==='','late response does not repopulate content');
 }
 // Old finally must not unlock or overwrite a newer request.
 const overlap=createRuntime();overlap.seed();overlap.c.window.TRE_REGALI_CONFIG.catalogProductsEndpoint='https://test.invalid/pending';const releases=[];
 overlap.c.fetch=()=>new Promise(resolve=>releases.push(()=>resolve({ok:true,json:async()=>({products:[]})})));
 const old=overlap.a.showResults(true);overlap.el('#restartBtn').click();overlap.seed();const fresh=overlap.a.showResults(true);releases[0]();await old;
 check(overlap.el('#nextBtn').disabled,'old finally does not unlock newer search');releases[1]();await fresh;check(!overlap.el('#nextBtn').disabled&&!overlap.el('#results').hidden,'new search completes after reset');
 // N7: deterministic active/hidden time and back-forward cache lifecycle.
 const t=createRuntime();t.el('#startQuestionnaire').click();t.clock.now+=2000;t.c.document.visibilityState='hidden';t.documentEvents.get('visibilitychange')();t.clock.now+=600000;t.c.document.visibilityState='visible';t.documentEvents.get('visibilitychange')();t.clock.now+=3000;t.set('relation','friend');t.el('#nextBtn').click();
 check(t.events.find(e=>e.name==='questionnaire_step_timing').data.seconds===5,'hidden 600 seconds excluded from 5 active seconds');
 t.clock.now+=2000;t.windowEvents.get('pagehide')();t.windowEvents.get('pagehide')();check(t.events.filter(e=>e.name==='questionnaire_step_timing').length===2,'pagehide emits once');
 t.clock.now+=100000;t.windowEvents.get('pageshow')({persisted:true});t.clock.now+=4000;t.windowEvents.get('pagehide')();check(t.events.at(-1).data.seconds===4,'BFCache restoration starts a fresh active segment');
 const zero=createRuntime();zero.clock.now=0;zero.el('#startQuestionnaire').click();zero.clock.now=1000;zero.windowEvents.get('pagehide')();check(zero.events.at(-1).data.seconds===1,'zero clock origin is valid');
 // N8: malformed records do not poison valid monitor records or create offers.
 const malformed=[null,{},[],1,'bad'];const freshTime=new Date().toISOString();
 const merged=r.H.merge(r.products,{products:[...malformed,{id:r.products[0].id,status:'OUT_OF_STOCK',checkedAt:freshTime}]});
 check(merged.products.length===240&&!r.H.isEligible(merged.products[0]),'mixed monitor data still applies valid negative check');
 check(merged.products.every(p=>!r.R.verifiedOffer(p)),'monitor never invents verified offers');
 const m=createRuntime();m.seed();m.c.window.TRE_REGALI_CONFIG.catalogHealthEndpoint='https://test.invalid/null';m.c.fetch=async()=>({ok:true,json:async()=>({products:[null]})});await m.a.showResults(true);
 check(!m.el('#productSelection').hidden&&(m.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length===3,'malformed monitor retains unverified local exploration');
 check(m.a.normalizeProduct(null).price===0,'malformed catalog record safely invalid');
 // N10: duplicate monitor rows are resolved by observation time, never array order.
 const monitoredProduct=offer(r,'ordered-update'),oldTime=new Date(Date.now()-3600000).toISOString(),newTime=new Date().toISOString();
 for(const rows of [
  [{id:monitoredProduct.id,status:'AVAILABLE',price:15,checkedAt:oldTime},{id:monitoredProduct.id,status:'OUT_OF_STOCK',price:16,checkedAt:newTime}],
  [{id:monitoredProduct.id,status:'OUT_OF_STOCK',price:16,checkedAt:newTime},{id:monitoredProduct.id,status:'AVAILABLE',price:15,checkedAt:oldTime}]
 ]){
  const result=r.H.merge([monitoredProduct],{products:rows}).products[0];
  check(!r.H.isEligible(result)&&result.price===16&&result.checkedAt===newTime,'new unavailable update wins in either order');
 }
 for(const rows of [
  [{id:monitoredProduct.id,status:'OUT_OF_STOCK',checkedAt:oldTime},{id:monitoredProduct.id,status:'AVAILABLE',price:17,checkedAt:newTime}],
  [{id:monitoredProduct.id,status:'AVAILABLE',price:17,checkedAt:newTime},{id:monitoredProduct.id,status:'OUT_OF_STOCK',checkedAt:oldTime}]
 ]){
  const result=r.H.merge([monitoredProduct],{products:rows}).products[0];
  check(r.H.isEligible(result)&&result.price===17&&result.checkedAt===newTime,'new available update wins in either order');
 }
 const sameTime=r.H.merge([monitoredProduct],{products:[{id:monitoredProduct.id,status:'AVAILABLE',checkedAt:newTime},{id:monitoredProduct.id,status:'OUT_OF_STOCK',checkedAt:newTime}]}).products[0];
 check(!r.H.isEligible(sameTime),'same-time conflict resolves conservatively');
 // N9: reset restores both state and derived copy; no hidden-step timer starts.
 const reset=createRuntime();reset.el('#startQuestionnaire').click();reset.set('perspective','giver').dispatchEvent({type:'change'});reset.el('#restartBtn').click();
 check(reset.a.formData().mode==='recipient'&&reset.el('#interestsLegend').textContent==='Cosa le piace davvero?','reset restores recipient heading');
 check(!reset.el('.step[data-step-key="interests"] .hint').textContent.includes('parlano di te'),'reset restores recipient hint');
 check(reset.eval('stepTimerOpen')===false&&reset.clock.focus==='#main-title','reset stops timer and focuses home');
 // Accessible focus, reduced motion and labels.
 const ui=createRuntime();ui.el('#startQuestionnaire').click();check(ui.clock.focus==='legend-relation_age','start focuses first question');ui.set('relation','friend');ui.set('ageRange','adult');ui.el('#nextBtn').click();check(ui.clock.focus==='legend-occasion','next focuses new question');
 ui.c.window.matchMedia=()=>({matches:true});check(ui.eval('motionBehavior()')==='auto','reduced motion applies to programmatic scrolling');
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');for(const name of ['refineReason','refineDirection','refineSurprise','refineBudget','refineDetail']){
  const control=html.match(new RegExp('<(?:select|input|textarea)\\b[^>]*name="'+name+'"[^>]*>'))[0],label=control.match(/aria-labelledby="([^"]+)"/)[1];check(html.includes('id="'+label+'"'),'accessible label resolves: '+name);
 }
 check(html.includes('<noscript>')&&fs.readFileSync(path.join(ROOT,'journey.css'),'utf8').includes('prefers-reduced-motion'),'no-JS guidance and reduced-motion CSS');
 console.log(JSON.stringify({assertions,errors:0,auditDefectsCovered:['N1','N2','N3','N4','N5','N6','N7','N8','N9','N10'],browserQA:false},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1});
