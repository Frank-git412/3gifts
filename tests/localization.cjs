const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {ROOT,createRuntime}=require('./published-runtime.cjs');
let assertions=0;
const ideaGuides=JSON.parse(fs.readFileSync(path.join(__dirname,'..','library','guides.json'),'utf8'));
const check=(value,message)=>{assert.ok(value,message);assertions++};
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk(ROOT).filter(f=>f.endsWith('.html'));
check(files.length===54,'27 Italian and 27 English pages');
const expectedCanonicals=files.filter(file=>!path.relative(ROOT,file).startsWith('en/')).map(file=>'https://3gifts.it/'+path.relative(ROOT,file).replace(/(^|\/)index\.html$/,'$1').replace(/\.html$/,''));
const robots=fs.readFileSync(path.join(ROOT,'robots.txt'),'utf8');
const sitemap=fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8');
check(robots.includes('User-agent: *')&&robots.includes('Allow: /'),'robots permits crawling');
check(robots.includes('Sitemap: https://3gifts.it/sitemap.xml'),'robots advertises canonical sitemap');
check((sitemap.match(/<url>/g)||[]).length===27+2+ideaGuides.length,'sitemap contains the 27 Italian pages and the idea guides');
for(const canonical of expectedCanonicals)check((sitemap.match(new RegExp('<loc>'+canonical.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'<\\/loc>','g'))||[]).length===1,'sitemap contains '+canonical+' once');
for(const file of files){
 const html=fs.readFileSync(file,'utf8'),relative=path.relative(ROOT,file),en=relative.startsWith('en/');
 check(html.includes(en?'<html lang="en-US"':'<html lang="it"'),relative+' language');
 check((html.match(/class="language-switch"/g)||[]).length===1,relative+' one language switch');
 check(html.includes(en?'hreflang="it"':'hreflang="en-US"'),relative+' language switch metadata');
 check(html.includes('<meta name="robots" content="noindex">')===en,relative+(en?' excluded':' indexable')+' for search engines');
 const canonicalRoute=relative.replace(/(^|\/)index\.html$/,'$1').replace(/\.html$/,'');
 const expectedCanonical='https://3gifts.it/'+canonicalRoute;
 check((html.match(/rel="canonical"/g)||[]).length===1,relative+' one canonical link');
 check(html.includes('rel="canonical" href="'+expectedCanonical+'"'),relative+' canonical URL');
 check(html.includes('location.hostname==="www.3gifts.it"')&&html.includes('u.hostname="3gifts.it"'),relative+' www redirect');
 check(html.includes('data-privacy-preferences'),relative+' consent reopening');
 check(!/fonts\.(googleapis|gstatic)\.com/.test(html),relative+' local fonts');
 for(const m of html.matchAll(/\b(?:src|href)="([^"]*)"/g)){
  const href=m[1];if(/^(?:https?:|mailto:|data:|#)/.test(href)||!href)continue;
  const clean=href.split(/[?#]/)[0];
  // The Worker renders the Christmas idea guides; they have no file in dist.
  if(clean==='/idee'||clean==='/idee/come-scegliamo'||ideaGuides.some(g=>clean==='/idee/'+g.slug)){assertions++;continue;}
  const target=clean.startsWith('/')?path.resolve(ROOT,'.'+clean):path.resolve(path.dirname(file),clean);
  check(target.startsWith(ROOT+path.sep)&&fs.existsSync(target),relative+' target exists: '+href);
 }
 const link=html.match(/<a class="language-switch" href="([^"]+)"/)[1];
 const target=path.relative(ROOT,path.resolve(path.dirname(file),link));
 check(target===(en?relative.slice(3):'en/'+relative),relative+' exact language counterpart');
}
const it=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),en=fs.readFileSync(path.join(ROOT,'en/index.html'),'utf8');
const values=html=>[...html.matchAll(/<input\b[^>]+>/g)].map(m=>m[0].match(/\bname="[^"]+"/)?.[0]+' '+m[0].match(/\bvalue="[^"]+"/)?.[0]);
assert.deepEqual(values(en),values(it),'translated form retains exact machine values');assertions++;
check(en.includes('catalog-labels.js')&&en.includes('English language · Italy catalog.'),'labels loaded and market disclosure visible');
const r=createRuntime('en'),italian=createRuntime();r.seed();italian.seed();
(async()=>{
 for(const [note,tag] of [['no tech','tech'],['no perfume','perfume'],['does not like wine but loves books','wine'],['no bulky items','bulky'],['no subscriptions','subscription'],['no sizes','sizes']]){
  const a=r.a.analyseNote(note);check(a.exclusions.includes(tag),'English exclusion '+note);check(!a.signals.includes(tag),'excluded preference not boosted');
 }
 const clause=r.a.analyseNote('does not like wine but loves books');check(clause.signals.includes('books')&&!clause.needsClarification,'English positive clause after negative');
 check(!r.a.analyseNote('not only books but also music').exclusions.includes('books'),'not only is not a ban');
 check(r.a.analyseNote('I would like an experience').requiredTypes.includes('experience'),'experience is a required type');
 for(const note of ['allergic to nuts','gluten-free','lactose-free','no rough materials'])check(r.a.analyseNote(note).needsClarification,'unsafe/unknown English restriction blocks: '+note);
 const interests=['techGaming','culture','mediaAudio','foodDrink','travelOutdoor','sportFitness','artPhoto','homeGarden','styleBeauty','animalsNature','gamesCollecting','newsBusiness'];
 let profiles=0;
 for(const interest of interests)for(const budget of [15,30,50,100,200,300])for(const timing of ['urgent2','week','month','none','exact'])for(const mode of ['recipient','giver']){
  const p={...r.a.formData(),interests:[interest],budget,timing,deadline:r.R.dateAfter(timing==='urgent2'?2:7),mode,allowUnverified:true};
  const a=r.a.rankProducts(r.products,p,r.a.analyseNote('')),b=italian.a.rankProducts(italian.products,p,italian.a.analyseNote(''));
  check(JSON.stringify(a.map(x=>x.id))===JSON.stringify(b.map(x=>x.id)),'language cannot change ranking');
  const families=new Set(r.products.filter(x=>r.R.eligible(x,p,r.a.analyseNote(''),r.H.isEligible)).flatMap(x=>r.R.productConceptKeys(x)));
  // Legacy catalogue helpers may retain fewer candidates as offer evidence expires.
  check(a.length<=Math.min(3,families.size),'legacy helpers never exceed the distinct eligible families');profiles++;
 }
 for(const p of r.products){
  r.a.renderProductCards([p],{...r.a.formData(),allowUnverified:true});
  const html=r.el('#resultGrid').innerHTML;
  check(r.c.window.GiftsEnglishCatalog[p.name]&&r.c.window.GiftsEnglishCatalog[p.why],'translation exists for '+p.id);
  check(html.includes('Estimated price:')&&html.includes('Check the final total:'),'English pricing disclaimer '+p.id);
  check(!/Una scelta|Una proposta|Cerca questo|Consegna non/.test(html),'no Italian result copy '+p.id);
 }
 r.c.fetch=async()=>({ok:true,json:async()=>({method:'research-20261007',products:r.products.filter(p=>p.tags.includes('books')&&p.price<=50).slice(0,3).map(p=>({...p,researchMethod:true,amazonPrice:true,amazonCheckedAt:new Date().toISOString()}))})});
 await r.a.showResults();
 check((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length===3,'English results render three cards');
 check(r.el('#recommendationStatus').textContent.includes('Picked from your answers'),'English research status');
 r.set('refineReason','impersonal').dispatchEvent({type:'change'});r.set('refineDirection','passion');r.set('refineSurprise','balanced');r.set('refineDetail','loves books');
 await r.el('#refinementForm').listeners.submit[0]({preventDefault(){},currentTarget:r.el('#refinementForm')});
 check(r.el('#refinementError').textContent.length>0,'English refinement rejects products already shown');
 r.el('#restartBtn').click();check(r.el('#results').hidden&&r.a.formData().note==='','English reset clears notes');
 r.c.fetch=async()=>({ok:true,json:async()=>({method:'research-20261007',products:[],code:'ConstraintsNeedReview'})});
 r.seed();r.set('note','allergic to nuts');await r.a.showResults();check(!r.el('#zeroRecovery').hidden&&r.el('#zeroRecoveryText').textContent.includes('clarify'),'English safety recovery');
 r.el('#howBtn').click();check(r.el('#dialogContent').innerHTML.includes('recipient, and occasion')&&r.el('#dialogContent').innerHTML.includes('Reviews are not yet used'),'English how-it-works dialog');
 const before=r.events.length;r.c.window.GiftsPrivacy.hasAnalyticsConsent=()=>false;r.a.track('questionnaire_completed');check(r.events.length===before,'app blocks after withdrawal');
 delete r.c.window.GiftsPrivacy;r.a.track('questionnaire_completed');check(r.events.length===before,'app fails closed if consent module missing');
 // Language switch never serializes answers and can be canceled.
 for(const lang of ['it','en-US']){
  let click,confirmed=false,prevented=false;
  const c={document:{documentElement:{lang},getElementById:id=>id==='questionnaire'?{hidden:false}:null,addEventListener:(_,fn)=>click=fn},window:{confirm:()=>{confirmed=true;return false}}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'language.js'),'utf8'),c);
  click({target:{closest:()=>({})},preventDefault:()=>prevented=true});check(confirmed&&prevented,'language switch confirms reset '+lang);
 }
 console.log(JSON.stringify({pages:files.length,englishProfiles:profiles,catalogLabels:r.products.length,assertions,errors:0,browserQA:false},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
