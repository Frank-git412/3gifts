import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

// Execute the production catalog, health rules and app functions, without a browser.
const node={value:'',hidden:false,dataset:{step:'1'},style:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},querySelectorAll(){return[]},querySelector(){return this},closest(){return this},scrollIntoView(){},reset(){}};
const context={window:{addEventListener(){}},document:{querySelector(){return node},querySelectorAll(){return[]},addEventListener(){}},URL,URLSearchParams,Date,performance,console,setTimeout,clearTimeout,AbortController,scrollTo(){}};
vm.createContext(context);
for(const file of ['config.js','catalog.js','catalog-health.js','recommendation-rules.js','app.js'])vm.runInContext(fs.readFileSync(new URL(file,import.meta.url),'utf8'),context,{filename:file});
vm.runInContext('globalThis.engine={rankProducts,normalizeProduct,analyseNote,excludedByPreference,expandedInterests,storeUrl,showZeroRecovery};',context);
const {engine}=context,health=context.window.TRE_REGALI_HEALTH;
const products=context.window.TRE_REGALI_CATALOG.map(engine.normalizeProduct);
const areas=['techGaming','culture','mediaAudio','foodDrink','travelOutdoor','sportFitness','artPhoto','homeGarden','styleBeauty','animalsNature','gamesCollecting','newsBusiness'];
const macros=[...new Set(products.map(p=>p.macro))];
const subMap={techGaming:['tech','gaming'],culture:['books','comics','culture'],mediaAudio:['music','cinema','audio'],foodDrink:['food','wine','coffeeTea'],travelOutdoor:['travel','outdoor','autoMoto'],sportFitness:['sport','fitness','running'],artPhoto:['creative','photo','craft'],homeGarden:['home','garden','organization'],styleBeauty:['style','beauty','jewelry'],animalsNature:['pets','nature','sustainable'],gamesCollecting:['boardGames','puzzle','collecting'],newsBusiness:['news','finance','learning']};
const tones=['sentimental','useful','funny','surprising','elegant','neutral'];
// This suite checks catalog coverage after explicit opt-in to unverified ideas.
// Strict verified-offer behavior is covered by tests/high-priority.cjs.
const base={mode:'recipient',allowUnverified:true,interests:['techGaming'],subinterests:[],tone:'neutral',ageRange:'adult',relation:'friend',occasion:'birthday',budget:15,timing:'week',deadline:'2099-01-01',note:'',avoid:[]};
const stats={products:products.length,marketplaces:{},profiles:0,shortResults:0,outsideSelectedMacro:0,refinementRounds:0,shortRefinements:0,unavailableProfiles:0,shortUnavailable:0,strictExclusionProfiles:0,lowBudget:{},failures:[]};
stats.validationMode='relevance-first-exploration-with-explicit-recovery';
const check=(ok,detail)=>{if(!ok)stats.failures.push(detail)};
check(products.length===240,'catalog-size');
for(const field of ['id','name','directUrl'])check(new Set(products.map(p=>p[field])).size===240,'unique-'+field);
for(const p of products){stats.marketplaces[p.store]=(stats.marketplaces[p.store]||0)+1;const u=new URL(p.directUrl);check(u.protocol==='https:'&&['www.amazon.it','www.etsy.com'].includes(u.hostname),'invalid-url:'+p.id);}
for(const macro of macros){const ps=products.filter(p=>p.macro===macro);check(ps.length===20,'macro-count:'+macro);check(new Set(ps.map(p=>p.subcategory)).size<=4,'subcategory-limit:'+macro);stats.lowBudget[macro]=ps.filter(p=>p.price<=15).length;check(stats.lowBudget[macro]>=6,'cheap-reserve:'+macro);}
const analysis={signals:[],exclusions:[],rankedAsins:[],reasons:{}};
const verify=(p,result,source=products)=>{
  check(result.length<=3,'too-many');check(new Set(result.map(x=>x.id)).size===result.length,'duplicate-picks');
  for(const x of result){check(x.price>0&&x.price<=p.budget,'over-budget:'+x.id);check(health.isEligible(x),'unavailable:'+x.id);check(!engine.excludedByPreference(x,p),'excluded-preference:'+x.id);check(source.some(y=>y.id===x.id),'unknown-product');check(engine.expandedInterests(p).some(t=>x.tags.includes(t)),'outside-profile:'+x.id);}
};
function test(profile){const result=engine.rankProducts(products,profile,analysis);stats.profiles++;if(result.length<3)stats.shortResults++;if(result.some(x=>!profile.interests.some(a=>x.tags.includes(a))))stats.outsideSelectedMacro++;verify(profile,result);return result;}
for(const area of areas)for(const mode of ['giver','recipient'])for(const ageRange of ['teen','youngAdult','adult','mature','unknown'])for(const tone of tones)for(const budget of [15,20,50,100,300])test({...base,mode,ageRange,tone,budget,interests:[area]});
for(const area of areas)for(const subinterest of subMap[area])for(const tone of tones)for(const budget of [15,20,50])test({...base,interests:[area],subinterests:[subinterest],tone,budget});
for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++)for(const budget of [15,50,100])test({...base,interests:[areas[i],areas[j]],subinterests:[...subMap[areas[i]].slice(0,2),...subMap[areas[j]].slice(0,2)],budget});
for(const area of areas)for(const tone of tones)for(const budget of [15,50,100]){
  const rejected=new Set();let previous=[];
  for(let round=0;round<4;round++){
    const pool=products.filter(p=>!rejected.has(p.name));
    const profile={...base,interests:[area],tone,budget};
    const a={...analysis,refinement:round?{reason:'owned',direction:'passion',surprise:'balanced',rejectedProducts:previous}:null};
    const result=engine.rankProducts(pool,profile,a);stats.refinementRounds++;if(result.length<3)stats.shortRefinements++;verify(profile,result,pool);
    for(const p of result){check(!rejected.has(p.name),'refinement-repeat');rejected.add(p.name);}previous=result;
  }
}
const now=new Date().toISOString();
for(const macro of macros){const cheap=products.filter(p=>p.macro===macro&&p.price<=15);const removed=cheap.slice(0,Math.ceil(cheap.length*.3));const snapshot={generatedAt:now,products:removed.map(p=>({id:p.id,availability:'NON DISPONIBILE',status:'NON DISPONIBILE',checkedAt:now}))};const source=health.merge(products,snapshot,{maxAgeHours:192}).products;const area=areas.find(a=>cheap.some(p=>p.tags.includes(a)));for(const tone of tones){const p={...base,interests:[area],tone};const result=engine.rankProducts(source,p,analysis);stats.unavailableProfiles++;if(result.length<3)stats.shortUnavailable++;verify(p,result,source);check(result.every(p=>!removed.some(x=>x.id===p.id)),'removed-product-returned');}}
for(const area of areas)for(const avoid of [['subscriptions'],['foodAlcohol'],['gadgets'],['bulky','sizes','foodAlcohol','subscriptions','experiences','gadgets']]){const p={...base,interests:[area],avoid};const result=engine.rankProducts(products,p,analysis);stats.strictExclusionProfiles++;verify(p,result);}
// Marketplace labels alone must not alter scores or selections.
for(const area of areas){const p={...base,budget:100,interests:[area]};const before=engine.rankProducts(products,p,analysis);const switched=products.map(x=>({...x,store:x.store==='Amazon'?'Etsy':'Amazon'}));const after=engine.rankProducts(switched,p,analysis);check(JSON.stringify(before.map(x=>x.id))===JSON.stringify(after.map(x=>x.id)),'marketplace-bias');}
const empty=engine.rankProducts([],base,analysis);check(empty.length===0,'empty-catalog');engine.showZeroRecovery(base,0);
// Prevent stale monitor records from following a reused identifier.
const manifest=JSON.parse(fs.readFileSync(new URL('catalog-rebalance-2026-09-16.json',import.meta.url)));
check(manifest.replacements.every(r=>r.added.id!==r.removed.id),'reused-monitor-id');
// Fewer than three is a valid, safer outcome when a selected subinterest has
// no three direct, compatible product pages. verify() above still guarantees
// that every returned card respects the profile instead of using fillers.
stats.intentionalRecoveryProfiles=stats.shortResults;
check(stats.shortUnavailable===0,'short-unavailable-results');
stats.failureCount=stats.failures.length;stats.failures=stats.failures.slice(0,20);
console.log(JSON.stringify(stats,null,2));
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(stats,null,2)+'\n');
assert.equal(stats.failureCount,0,'Catalog regression failure');
