const CONFIG=window.TRE_REGALI_CONFIG||{};
const RULES=window.TRE_REGALI_RULES;
const HEALTH=window.TRE_REGALI_HEALTH||{merge:(items)=>({products:items,meta:{active:false,matched:0,excluded:0,pricesUpdated:0,staleOrMissing:items.length}}),isEligible:()=>true};
const products=(window.TRE_REGALI_CATALOG||[]).filter(RULES.marketplaceEligible);
const displayText=value=>window.GiftsEnglishCatalog?.[value]||value;
let displayedProducts=[];
let step=1,currentMode="recipient",currentJourney="direct",lastProfile=null,refinementCount=0,rejectedProductKeys=new Set(),rejectedConceptKeys=new Set(),rejectedParentAsins=new Set(),stepEnteredAt=null,stepActiveMs=0,stepTimerOpen=false;const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const form=$("#giftForm"),deadline=$("#deadline"),budget=$("#budget"),budgetOut=$("#budgetOut");
deadline.min=RULES.localDate();
function syncBudget(changed){
  const minimum=$("#minBudget");
  if(changed===minimum&&Number(minimum.value)>Number(budget.value))budget.value=minimum.value;
  if(changed===budget&&Number(budget.value)<Number(minimum.value))minimum.value=budget.value;
  budgetOut.value=String(Number(budget.value));$("#minBudgetOut").value=String(Number(minimum.value));$("#minBudgetSummary").value=String(Number(minimum.value));
  for(const slider of [minimum,budget]){
    const fill=`${(Number(slider.value)-Number(slider.min))/(Number(slider.max)-Number(slider.min))*100}%`;
    if(slider.style.setProperty)slider.style.setProperty("--budget-fill",fill);else slider.style["--budget-fill"]=fill;
  }
}
budget.addEventListener("input",()=>syncBudget(budget));$("#minBudget").addEventListener("input",()=>syncBudget($("#minBudget")));syncBudget();
$("#startQuestionnaire").addEventListener("click",event=>{event.preventDefault();$(".hero-concept").hidden=true;$(".finder").hidden=false;step=1;renderStep();$(".finder").scrollIntoView({behavior:motionBehavior(),block:"start"});track("questionnaire_started",{visible_steps:visibleSteps().length})});
function syncPerspective(){const child=["earlyChild","child"].includes($('input[name="ageRange"]:checked')?.value);$("#interestsLegend").textContent=child?"Con cosa ama giocare o cosa ama scoprire?":currentMode==="giver"?"Cosa ti piace davvero?":"Cosa ama davvero?";document.querySelector('.step[data-step-key="interests"] .hint').textContent=child?"Scegli fino a due categorie per bambini e fino a quattro sottocategorie in totale.":currentMode==="giver"?"Scegli fino a due aree che parlano di te e fino a quattro sottocategorie in totale.":"Scegli fino a due aree principali e fino a quattro sottocategorie in totale.";}
function syncInterestFlow(){
  const age=$('input[name="ageRange"]:checked')?.value,audience=["earlyChild","child"].includes(age)?age:"general",stage=$('input[name="childStage"]:checked')?.value||"all";
  const stageAllowed=node=>audience!=="earlyChild"||stage==="all"||!node.dataset.stages||node.dataset.stages.split(" ").includes(stage);
  $$('input[name="interest"]').forEach(input=>{
    const group=input.closest(".interest-group"),panel=group.querySelector(".subinterests");
    const visible=(group.dataset.audience||"general")===audience&&stageAllowed(group);
    group.hidden=!visible;input.disabled=!visible;if(!visible)input.checked=false;
    panel.hidden=!visible||!input.checked;
    panel.querySelectorAll("input").forEach(sub=>{
      const allowed=visible&&stageAllowed(sub)&&!(sub.value==="wine"&&(RULES.isMinor(age)||age==="unknown"));
      sub.closest("label").hidden=!allowed;sub.disabled=!allowed;
      if(!allowed||!input.checked)sub.checked=false;
    });
  });
  $("#childInterestHint").hidden=audience==="general";
}
function syncAgeFlow(){
  const relation=$('input[name="relation"]:checked')?.value,adultOnly=["partner","couple","colleague"].includes(relation),couple=relation==="couple";
  // Partners, couples and colleagues are adults: the minor bands are hidden before the age is chosen.
  for(const value of ["earlyChild","child","teen"]){
    $("#age-"+value).hidden=adultOnly;
    const input=$(`input[name="ageRange"][value="${value}"]`);input.disabled=adultOnly;if(adultOnly)input.checked=false;
  }
  const age=$('input[name="ageRange"]:checked')?.value,minor=RULES.isMinor(age);
  $("#ageLabel").textContent=couple?"Quanti anni hanno, più o meno?":"Quanti anni ha?";
  // A couple shares one gift: no per-person product preference.
  $("#recipientPreferenceQuestion").hidden=couple;
  $$('input[name="recipientPreference"]').forEach(input=>{input.disabled=couple;if(couple)input.checked=input.value==="unisex"});
  $("#perspectiveQuestion").hidden=minor;
  $$('input[name="perspective"]').forEach(input=>{input.disabled=minor;if(minor)input.checked=input.value==="recipient"});
  if(minor)currentMode="recipient";
  $("#womenPreferenceText").textContent=minor?"Bambina / ragazza":"Da donna";
  $("#menPreferenceText").textContent=minor?"Bambino / ragazzo":"Da uomo";
  $("#childCatalogNotice").hidden=!["earlyChild","child"].includes(age);
  $("#childStageQuestion").hidden=age!=="earlyChild";
  $$('input[name="childStage"]').forEach(input=>{input.disabled=age!=="earlyChild";if(age!=="earlyChild")input.checked=input.value==="all"});
  $("#childBandQuestion").hidden=age!=="child";
  $$('input[name="childBand"]').forEach(input=>{input.disabled=age!=="child";if(age!=="child")input.checked=input.value==="all"});
  // Wine products are excluded for minors and for an undisclosed age, so the choice is hidden for both.
  const noWine=minor||age==="unknown",wine=$('input[name="subinterest"][value="wine"]');wine.disabled=noWine;if(noWine)wine.checked=false;$("#wineInterest").hidden=noWine;
  for(const value of ["anniversary","graduation","newhome","wedding","newbaby","thanks"]){
    const hide=value==="newbaby"?age==="teen":value==="thanks"?age==="earlyChild":minor;
    $("#occasion-"+value).hidden=hide;
    const input=$(`input[name="occasion"][value="${value}"]`);input.disabled=hide;if(hide)input.checked=false;
  }
  $("#newbabyLabel").textContent=age==="earlyChild"?"🍼 Nascita / battesimo":age==="child"?"Battesimo / comunione":"🍼 Nascita: regalo per un genitore";
  syncInterestFlow();syncPerspective();
}
form.addEventListener("change",event=>{showError("");if(["relation","ageRange","childStage","childBand"].includes(event.target.name)){invalidateResults();syncAgeFlow();renderStep();return}if(event.target.name!=="perspective")return;currentMode=event.target.value;syncPerspective()});
form.addEventListener("input",()=>showError(""));
$$('input[name="interest"]').forEach(x=>x.addEventListener("change",()=>{limit(x,"interest",2);syncInterestFlow()}));
$$('input[name="subinterest"]').forEach(x=>x.addEventListener("change",()=>limit(x,"subinterest",4)));
$$('input[name="timing"]').forEach(x=>x.addEventListener("change",()=>{const exact=x.checked&&x.value==="exact";$("#exactDatePanel").hidden=!exact;deadline.required=exact;if(!exact)deadline.value=""}));
function limit(input,name,max){const chosen=new Set($$(`input[name="${name}"]:checked`).map(x=>x.value));if(chosen.size>max){input.checked=false;showError(name==="subinterest"?"Puoi scegliere al massimo 4 sottocategorie.":`Puoi sceglierne al massimo ${max}.`)}else showError("")}
function showError(t){$("#formError").textContent=t}
function visibleSteps(){return $$('.step').filter(x=>!x.hidden)}
function currentStep(){return visibleSteps().find(x=>+x.dataset.step===step)}
function valid(){
  showError("");const current=currentStep();
  if(current?.dataset.stepKey==="interests"&&!current.querySelector('input[name="interest"]:checked')){showError("Scegli almeno un’area di interesse.");return false}
  const required=[...(current?.querySelectorAll("[required]")||[])];
  if(required.some(x=>!x.value||x.type==="radio"&&!current.querySelector(`input[name="${x.name}"]:checked`))){showError("Completa questa risposta per continuare.");return false}
  if(current?.dataset.stepKey==="budget_timing_details"){
    if(!RULES.validBudget(budget.value)){showError("Indica un budget da 15 a 500 €, a incrementi di 5 €.");budget.focus?.();return false}
    if(!RULES.validBudgetRange(budget.value,$("#minBudget").value)){showError("La spesa minima deve essere tra 0 € e il massimo scelto, a incrementi di 5 €.");$("#minBudget").focus?.();return false}
    if(deadline.required&&(!Number.isFinite(RULES.calendarDay(deadline.value))||RULES.calendarDay(deadline.value)<RULES.calendarDay(RULES.localDate()))){showError("Indica una data valida, non precedente a oggi.");deadline.focus?.();return false}
  }
  const invalid=required.find(input=>input.checkValidity&&!input.checkValidity());
  if(invalid){showError("Controlla il valore inserito prima di continuare.");invalid.reportValidity?.();return false}
  return true;
}
function pauseStepTiming(){if(stepEnteredAt!==null){stepActiveMs+=Math.max(0,performance.now()-stepEnteredAt);stepEnteredAt=null}}
function resumeStepTiming(){if(stepTimerOpen&&!$(".finder").hidden&&document.visibilityState!=="hidden"&&stepEnteredAt===null)stepEnteredAt=performance.now()}
function trackStepTiming(direction){const current=currentStep();if(!current||!stepTimerOpen)return;pauseStepTiming();const steps=visibleSteps(),position=steps.indexOf(current)+1;track("questionnaire_step_timing",{step_key:current.dataset.stepKey,seconds:Math.round(stepActiveMs/1000),direction,position,visible_steps:steps.length});stepTimerOpen=false;stepActiveMs=0}
function motionBehavior(){return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth"}
function focusHeading(node){node?.setAttribute?.("tabindex","-1");node?.focus?.({preventScroll:true})}
function renderStep(){syncAgeFlow();const steps=visibleSteps();let current=steps.find(x=>+x.dataset.step===step);if(!current){current=steps[0];if(!current)return;step=+current.dataset.step}$$('.step').forEach(x=>x.classList.toggle("active",x===current));const position=steps.indexOf(current)+1,pct=Math.round(position/steps.length*100);$("#stepLabel").textContent=`Passo ${position} di ${steps.length}`;$("#progressPct").textContent=`${pct}%`;$("#progressBar").style.width=`${pct}%`;$("#progressTrack").setAttribute("aria-valuenow",String(pct));$("#backBtn").hidden=position===1;$("#nextBtn").innerHTML=position===steps.length?'Trova i tre regali <span>✨</span>':'Continua <span>→</span>';stepEnteredAt=null;stepActiveMs=0;stepTimerOpen=!$(".finder").hidden;resumeStepTiming();showError("");if(!$(".finder").hidden){focusHeading(current.querySelector("legend"));$(".finder").scrollIntoView({behavior:motionBehavior(),block:"start"})}}
$("#nextBtn").addEventListener("click",()=>{if(!valid())return;const steps=visibleSteps(),current=currentStep(),position=steps.indexOf(current);trackStepTiming("forward");track("questionnaire_step_completed",{step_key:current.dataset.stepKey,position:position+1,visible_steps:steps.length});if(position<steps.length-1){step=+steps[position+1].dataset.step;renderStep()}else showResults()});
$("#backBtn").addEventListener("click",()=>{const steps=visibleSteps(),current=currentStep(),position=steps.indexOf(current);if(position>0){invalidateResults();trackStepTiming("back");step=+steps[position-1].dataset.step;renderStep()}});
form.addEventListener("keydown",event=>{if(event.key!=="Enter"||event.target.matches("textarea"))return;event.preventDefault();$("#nextBtn").click()});
function dateAfter(days){return RULES.dateAfter(days)}
function formData(){const fd=new FormData(form),timing=fd.get("timing"),ageRange=fd.get("ageRange"),minor=RULES.isMinor(ageRange);currentMode=minor?"recipient":fd.get("perspective")||currentMode;currentJourney=fd.get("journey")||"direct";const deadlineByTiming={urgent2:dateAfter(2),week:dateAfter(7),month:dateAfter(30),none:dateAfter(3650)};return{mode:currentMode,journey:currentJourney,relation:minor?"child":fd.get("relation"),recipientPreference:fd.get("recipientPreference")||"unisex",occasion:fd.get("occasion"),ageRange,childStage:ageRange==="earlyChild"?fd.get("childStage")||"all":ageRange==="child"?fd.get("childBand")||"all":null,interests:fd.getAll("interest"),subinterests:[...new Set(fd.getAll("subinterest"))],tone:fd.get("tone"),avoid:fd.getAll("avoid"),budget:+fd.get("budgetChoice"),minBudget:+fd.get("minBudget"),timing,deadline:timing==="exact"?fd.get("deadline"):deadlineByTiming[timing],note:fd.get("note")}}
function analyseNote(note,origin='note'){const fd=new FormData(form);return RULES.analyseNote(note,{areas:fd.getAll('interest'),subIds:fd.getAll('subinterest'),language:document.documentElement.lang==='en'?'en':'it',origin})}
function normalizeProduct(p){
  if(!p||typeof p!=="object"||Array.isArray(p))p={};
  const price=Number(p.price?.amount??p.price);
  const result={id:String(p.id||""),asin:String(p.asin||""),name:String(p.title||p.name||"Prodotto"),store:String(p.store||"Amazon"),type:String(p.type||"product"),instant:Boolean(p.instant),price:Number.isFinite(price)?price:0,priceStatus:String(p.priceStatus||"unknown"),rating:Number(p.rating)||0,reviewCount:Number(p.reviewCount)||0,imageUrl:String(p.imageUrl||""),imageSource:String(p.imageSource||p.store||""),imageUpdatedAt:String(p.imageUpdatedAt||""),url:String(p.url||""),directUrl:String(p.directUrl||""),emoji:p.emoji||"🎁",tags:Array.isArray(p.tags)?p.tags.filter(x=>typeof x==="string"):[],why:String(p.why||"Una proposta da valutare per gli interessi indicati."),query:String(p.query||p.title||p.name||"idea regalo"),macro:String(p.macro||""),subcategory:String(p.subcategory||""),availabilityStatus:String(p.availabilityStatus||p.availability||""),monitorStatus:String(p.monitorStatus||p.status||""),catalogStatus:String(p.catalogStatus||""),checkedAt:String(p.checkedAt||p.lastChecked||""),monitorEligible:p.monitorEligible!==false,isLive:Boolean(p.asin||p.url),linkStatus:String(p.linkStatus||""),offer:p.offer&&typeof p.offer==="object"?p.offer:null};
  result.parentAsin=/^[A-Z0-9]{10}$/.test(p.parentAsin||'')?p.parentAsin:null;
  result.conceptId=/^c\d{3}-[a-z0-9-]+$/.test(p.conceptId||'')?p.conceptId:'';
  // Keep listing facts for the same exclusion checks after server selection.
  result.features=String(p.features||'');
  result.productGroup=String(p.productGroup||'');
  const bm=p.bookMetadata||{};
  result.bookMetadata={authors:Array.isArray(bm.authors)?bm.authors.filter(x=>typeof x==='string'):[],isbns:Array.isArray(bm.isbns)?bm.isbns.filter(x=>typeof x==='string'):[],binding:String(bm.binding||''),edition:String(bm.edition||''),language:String(bm.language||'')};
  result.researchMethod=p.researchMethod===true;
  result.ageVerification=p.ageVerification==='required'?'required':p.ageVerification==='declared'?'declared':null;
  if(result.researchMethod&&document.documentElement.lang.startsWith('en'))result.why='Matches the selected interests and price range. Check the variant and suitability on Amazon before buying.'+(p.ageNotice?' Check the manufacturer’s age guidance and warnings.':'');
  result.amazonPrice=p.amazonPrice===true;result.amazonCheckedAt=String(p.amazonCheckedAt||"");
  result.recipientTarget=RULES.productRecipientTarget(p);
  result.ageSuitability=p.ageSuitability&&typeof p.ageSuitability==="object"?p.ageSuitability:null;
  result.adultOnly=p.adultOnly===true;
  result.conceptFamily=String(p.conceptFamily||"");
  // Historical macroarea expansion tagged wallets and jewelry as skincare.
  // Keep explicit product interests; do not let those broad tags defeat subcategories.
  if(result.tags.includes("styleBeauty")&&(["Gioielli","Pelletteria"].includes(result.subcategory)||(result.subcategory==="Borse"&&!/cosmetic|trucco|trousse|beauty case/i.test(result.name))))result.tags=result.tags.filter(tag=>tag!=="beauty");
  result.deviceModel=String(p.deviceModel||"");
  result.requiredNoteSignals=Array.isArray(p.requiredNoteSignals)?p.requiredNoteSignals.filter(x=>typeof x==="string"):[];
  result.constraints=RULES.productConstraints({...result,constraints:p.constraints});
  if(HEALTH.isBlocking?.(p))result.monitorEligible=false;
  if(result.constraints.tech&&!result.tags.includes("tech"))result.tags.push("tech");
  return result;
}
async function fetchJSON(endpoint,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeoutMs||4500);
  try{const response=await fetch(endpoint,{...options,signal:controller.signal});if(!response.ok)throw new Error("service_unavailable");return await response.json()}finally{clearTimeout(timer)}
}
function researchRequest(profile,analysis=analyseNote(profile.note),rejectConcepts=false){
  const safeProfile={};
  for(const key of ['relation','occasion','ageRange','childStage','recipientPreference','interests','subinterests','avoid','tone','timing','budget','minBudget','excludedInterests','isRefinement','refinementDirection','refinementReason','refinementSurprise','searchPriority','allowTypeBroadening'])safeProfile[key]=profile[key];
  const constraints={};for(const key of ['signals','requiredSignals','specificIntents','optionalIntents','noteConstraints','exclusions','requiredTypes','needsClarification'])constraints[key]=analysis[key];
  // Relationship and occasion are controlled choices; raw notes, names and the exact deadline stay local.
  const note=String(profile.note||''),connections=[];
  for(const sentence of note.split(/[.;!?\n]/))if(!/\b(non|senza|no|not|without)\b/i.test(sentence)&&/\b(supporta|ha|dispone|compatibile|supports|has)\b/i.test(sentence)){
    if(/bluetooth/i.test(sentence))connections.push('bluetooth');if(/usb[ -]?c/i.test(sentence))connections.push('usb_c');if(/usb[ -]?a/i.test(sentence))connections.push('usb_a');
  }
  constraints.recipientContext={connections:[...new Set(connections)],deviceModel:analysis.requestedDevices?.[0]||''};
  return {profile:safeProfile,constraints,rejectedAsins:profile.isRefinement?[...rejectedProductKeys].filter(x=>x.startsWith('amazon:')).map(x=>x.slice(7)):[],rejectedBookKeys:profile.isRefinement?[...rejectedProductKeys].filter(x=>/^book(?:work|series|isbn|title):/.test(x)):[],rejectedConcepts:rejectConcepts?[...rejectedConceptKeys]:[],seenConcepts:profile.isRefinement?[...rejectedConceptKeys]:[],rejectedParentAsins:profile.isRefinement?[...rejectedParentAsins]:[]};
}
async function fetchResearchSelection(profile,analysis=analyseNote(profile.note),rejectConcepts=false){
  const payload=await fetchJSON(CONFIG.amazonProductsEndpoint,{method:'POST',timeoutMs:85000,headers:{'Content-Type':'application/json'},body:JSON.stringify(researchRequest(profile,analysis,rejectConcepts))});
  if(!Array.isArray(payload?.products)||payload.method!=='research-20261007')throw new Error('research_invalid');
  const selected=payload.products.map(p=>normalizeProduct({...p,researchMethod:true})).filter(p=>RULES.marketplaceEligible(p)&&!wasShown(p)&&!RULES.violatesExclusions(p,profile,analysis)&&RULES.recipientEligible(p,profile));
  return {...payload,products:selected};
}
async function fetchMarketplaceProducts(profile){return (await fetchResearchSelection(profile)).products}
let lastSearchArgs=[];
function showResearchRecovery(profile,analysis,failed=false){
  activeCatalogProducts=[];showZeroRecovery({...profile,allowUnverified:true},0,analysis);
  // A service failure is not a constraint problem: offer the same search again.
  $("#retryRecovery").hidden=!failed;
  $('#zeroRecoveryTitle').textContent=failed?'Ricerca momentaneamente non disponibile.':'Non abbiamo trovato prodotti compatibili.';
  $('#zeroRecoveryText').textContent=failed?'Amazon non ha risposto in tempo. Riprova la ricerca: manteniamo le tue risposte.':analysis.needsClarification?'Precisare i vincoli nella nota: alcuni non sono verificabili con i dati disponibili.':profile.ageRange==='earlyChild'&&profile.childStage==='all'?'Indica la fase di età già presente nel questionario prima di cercare.':profile.ageRange==='child'&&profile.childStage==='all'?'Indica se ha 7–9 o 10–12 anni: molti prodotti sono adatti solo a una delle due fasce.':'Rivedi interessi, dettagli o fascia di spesa. Non aggiungiamo prodotti fuori dai criteri scelti.';
  $('#recommendationStatus').textContent='La ricerca rispetta i vincoli; prezzo finale, variante e consegna vanno controllati su Amazon.';
  const missingCompatibility=RULES.m3ContextChecks(analysis.specificIntents).filter(c=>c.status==='unknown');
  if(!failed&&missingCompatibility.length){
    const en=/^en(?:-|$)/i.test(document.documentElement.lang);
    const labels=en?{audioConnection:'the connection supported by the device (Bluetooth, USB or jack)',desktopOs:'the computer operating system',phoneOs:'the phone operating system',wifi:'whether Wi-Fi and internet are available',frameo:'whether the Frameo app is available',usb:'the supported USB connection',usb_c:'whether the device supports USB-C',pd45:'whether the device supports USB PD at 45 W',video4k30:'whether USB-C video output supports 4K at 30 Hz'}:{audioConnection:'il collegamento supportato dal dispositivo (Bluetooth, USB o jack)',desktopOs:'il sistema operativo del computer',phoneOs:'il sistema operativo del telefono',wifi:'se sono disponibili Wi-Fi e internet',frameo:'se è disponibile l’app Frameo',usb:'il collegamento USB supportato',usb_c:'se il dispositivo supporta USB-C',pd45:'se il dispositivo supporta USB PD a 45 W',video4k30:'se l’uscita video USB-C supporta 4K a 30 Hz'};
    $('#zeroRecoveryTitle').textContent=en?'A compatibility detail is needed.':'Serve un dettaglio di compatibilità.';
    $('#zeroRecoveryText').textContent=(en?'Add these details to the note: ':'Indica nella nota: ')+missingCompatibility.map(c=>labels[c.key]||(en?'the device compatibility':'la compatibilità del dispositivo')).join('; ')+'.';
  }
}

function mergeCatalogProducts(remote,local){
  const seen=new Set(),merged=[];
  // Remote observations override local copies, including negative availability
  // and prices outside the budget. Never revive a stale copy of that identity.
  const blocked=p=>!HEALTH.isEligible(p)||p.offer?.available===false;
  for(const group of [[...remote].sort((a,b)=>Number(blocked(b))-Number(blocked(a))),local])for(const p of group){
    const keys=RULES.productKeys(p),duplicate=keys.some(key=>seen.has(key));
    keys.forEach(key=>seen.add(key));if(keys.length&&!duplicate)merged.push(p);
  }
  return merged;
}
function wasShown(product){return RULES.productKeys(product).some(key=>rejectedProductKeys.has(key))}
function wasConceptShown(product){return RULES.productConceptKeys(product).some(key=>rejectedConceptKeys.has(key))}
function rememberProducts(selected){selected.forEach(p=>{if(p.parentAsin)rejectedParentAsins.add(p.parentAsin);RULES.productKeys(p).forEach(key=>rejectedProductKeys.add(key));RULES.productConceptKeys(p).forEach(key=>rejectedConceptKeys.add(key))})}
let healthSnapshotPromise=null,activeCatalogProducts=products.map(normalizeProduct),activeHealthMeta={active:false,matched:0,excluded:0,pricesUpdated:0,staleOrMissing:products.length};
async function fetchCatalogHealth(){
  if(!CONFIG.catalogHealthEndpoint)return null;
  if(healthSnapshotPromise)return healthSnapshotPromise;
  healthSnapshotPromise=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(CONFIG.catalogHealthTimeoutMs)||4500);try{const response=await fetch(CONFIG.catalogHealthEndpoint,{method:"GET",headers:{Accept:"application/json"},signal:controller.signal,cache:"no-store"});if(!response.ok)throw new Error("health_unavailable");const payload=await response.json();if(!Array.isArray(payload?.products))throw new Error("health_invalid");return payload}finally{clearTimeout(timer)}})().catch(()=>{healthSnapshotPromise=null;return null});
  return healthSnapshotPromise;
}
async function applyCatalogHealth(candidates){const snapshot=await fetchCatalogHealth();if(!snapshot)return{products:candidates,meta:{active:false,matched:0,excluded:0,pricesUpdated:0,staleOrMissing:candidates.length}};return HEALTH.merge(candidates,snapshot,{maxAgeHours:Number(CONFIG.catalogHealthMaxAgeHours)||192})}
async function enrichWithAI(profile,candidates,localSignals){if(!CONFIG.aiRankingEndpoint)return{signals:localSignals,rankedAsins:[],reasons:{},source:"local"};const payload=await fetchJSON(CONFIG.aiRankingEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile,candidates:candidates.map(({asin,name,price,rating,reviewCount,tags})=>({asin,name,price,rating,reviewCount,tags}))})});return{signals:Array.isArray(payload.signals)?payload.signals.filter(x=>typeof x==="string"):localSignals,rankedAsins:Array.isArray(payload.rankedAsins)?payload.rankedAsins.map(String):[],reasons:payload.reasons&&typeof payload.reasons==="object"?payload.reasons:{},source:"ai"}}
const interestSignals={techGaming:["tech","gaming"],culture:["books","comics","culture"],mediaAudio:["music","cinema","audio"],foodDrink:["food","wine","coffeeTea"],travelOutdoor:["travel","outdoor","autoMoto"],sportFitness:["sport","fitness","running"],artPhoto:["creative","photo","craft"],homeGarden:["home","garden","organization"],styleBeauty:["style","beauty","jewelry"],animalsNature:["pets","nature","sustainable"],gamesCollecting:["boardGames","puzzle","collecting"],newsBusiness:["news","finance","learning"]};
const toneSignals={sentimental:["personalized","partner","family","photo","symbolic"],useful:["practical","tech","home","service"],elegant:["style","beauty","home","craft"],funny:["funny","social","gaming"],surprising:["adventurous","creative","experience","recurring","symbolic"],neutral:[]};
// Editorial soft tie-breakers, never eligibility or guarantees about a person.
// Explicit interests/notes and hard constraints remain the primary signals.
const ageSignals={teen:["gaming","tech","music","sport"],youngAdult:["learning","travel","creative"],adult:["organization","practical","home"],mature:["craft","calm","garden"],unknown:[]};
const relationContext={partner:["sentimental","symbolic","personalized"],friend:["social","funny"],family:["sentimental","photo","home"],colleague:["practical","organization","writing"],couple:["home","social","symbolic"]};
const occasionContext={birthday:["creative","personalized"],anniversary:["sentimental","symbolic"],christmas:["social","calm"],thanks:["practical","craft"],graduation:["learning","writing"],newhome:["organization","smartHome","home"],wedding:["symbolic","couple","home"],newbaby:["photo","sentimental"],event:["experience","social"]};
const contextFit=(tags,signals)=>signals?.some(tag=>tags.includes(tag))?1.5:0;
function expandedInterests(profile){return[...new Set([...(profile.interests||[]),...(profile.subinterests||[])])]}
function excludedByPreference(product,profile){return RULES.violatesExclusions(product,profile,{exclusions:[]})}
function budgetFit(price,budget){if(!Number.isFinite(price)||price<=0||!Number.isFinite(budget)||budget<=0)return 0;const target=budget<=25?.7:budget<=75?.6:.52,ratio=Math.min(1,price/budget);return Math.max(0,2.5-Math.abs(Math.log(Math.max(.01,ratio)/target))*1.35)}
const HIGH_BUDGET_MIN=150,UPPER_BUDGET_RATIO=.6,MIDDLE_BUDGET_RATIO=.5,PRICE_RELEVANCE_MARGIN=3;
const isFirstHighBudget=(profile,analysis)=>profile.budget>=HIGH_BUDGET_MIN&&!analysis.refinement;
const effectiveProductPrice=product=>RULES.verifiedOffer(product)?product.offer.total.amount:product.price;
function preferUpperBudget(pool,profile,analysis){
  if(!pool.length||profile.budget<HIGH_BUDGET_MIN||analysis.refinement)return pool[0];
  // Price may break a close relevance tie, never buy its way past a clear
  // preference (+5 for a note signal, +7 for an explicit subinterest).
  const best=Math.max(...pool.map(p=>p.affinity));
  const comparable=pool.filter(p=>p.affinity>=best-PRICE_RELEVANCE_MARGIN);
  const requestedFloor=Math.max(Number(profile.minBudget||0),profile.budget*UPPER_BUDGET_RATIO);
  const upperBand=comparable.filter(p=>effectiveProductPrice(p)>=requestedFloor);
  const upper=upperBand.length?upperBand:comparable;
  const upperScore=p=>p.score-p.budgetFit+4*Math.min(1,effectiveProductPrice(p)/(profile.budget*.8));
  return upper.sort((a,b)=>upperScore(b)-upperScore(a)||b.score-a.score||String(a.id).localeCompare(String(b.id)))[0];
}
const refinementDirectionMeta={
 personal:{tags:[],interestBoost:2,label:"idee più personali"},
 practical:{tags:["practical"],tone:"useful",label:"idee utili"},experience:{tags:["experience","social","adventurous"],types:["experience","service"],tone:"surprising",label:"esperienze da vivere"},creative:{tags:["creative","personalized","craft"],tone:"sentimental",label:"idee originali e personali"},funny:{tags:["funny","social"],tone:"funny",label:"idee capaci di far sorridere"},
 memory:{tags:["personalized","photo","symbolic"],tone:"sentimental",label:"ricordi e significati condivisi"},passion:{tags:[],interestBoost:2,tone:"neutral",label:"la passione indicata"},personalized:{tags:["personalized","creative","craft"],tone:"sentimental",label:"personalizzazioni riconoscibili"},differentType:{tags:[],differentType:true,tone:"neutral",label:"formati diversi"},differentCategory:{tags:[],differentCategory:true,tone:"neutral",label:"categorie nuove"},digital:{tags:["audio","books"],types:["digital","subscription","giftcard"],tone:"useful",label:"proposte digitali"}
};
function refinementAdjustment(product,profile,analysis,confidence,surprise){const ref=analysis.refinement;if(!ref)return 0;const meta=refinementDirectionMeta[ref.direction]||{tags:[],types:[]};let score=0;(meta.tags||[]).forEach(tag=>{if(product.tags.includes(tag))score+=3.5});if((meta.types||[]).includes(product.type))score+=4;if(meta.interestBoost)expandedInterests(profile).forEach(tag=>{if(product.tags.includes(tag))score+=meta.interestBoost});const rejected=ref.rejectedProducts||[],sameSub=rejected.some(x=>x.subcategory&&x.subcategory===product.subcategory),sameMacro=rejected.some(x=>x.macro&&x.macro===product.macro),sameType=rejected.some(x=>x.type===product.type),unusualTags=product.tags.filter(tag=>["adventurous","funny","symbolic","experience","digital"].includes(tag)).length;if(ref.reason==="banal"){if(product.tags.some(tag=>["creative","personalized","adventurous","funny"].includes(tag))||product.type!=="product")score+=4;if(sameSub)score-=5;if(sameType)score-=1}if(ref.reason==="impersonal"){if(product.tags.includes("personalized"))score+=6;if(product.tags.some(tag=>["photo","symbolic","creative"].includes(tag)))score+=3}if(ref.reason==="price"){if(product.price<=profile.budget*.65)score+=4;if(product.price>profile.budget*.85)score-=2}if(ref.reason==="unsuitable"){if(sameSub)score-=7;else if(sameMacro)score-=2}if(ref.reason==="owned"){if(sameSub)score-=8;if(sameType)score-=4}if(meta.differentType&&sameType)score-=7;if(meta.differentCategory){if(sameSub)score-=9;else if(sameMacro)score-=5}if(ref.surprise==="safe"){if(product.tags.includes("practical"))score+=7;if(product.type==="product")score+=2;score+=confidence*3-unusualTags*2;if(!sameMacro)score-=2}if(ref.surprise==="balanced")score+=confidence+surprise+(sameSub?-1:1);if(ref.surprise==="bold"){score+=surprise*3+unusualTags*4-confidence;if(product.type!=="product")score+=5;if(!sameSub)score+=4;if(!sameMacro)score+=3;if(product.tags.includes("practical"))score-=5}return score}
function rankProducts(candidates,profile,analysis){
  const relationSignals=profile.relation==="couple"?["partner","family","home","social"]:[],interestTags=expandedInterests(profile),noteTags=analysis.signals||[],ageTags=ageSignals[profile.ageRange]||[],toneTags=toneSignals[profile.tone]||[],subinterests=profile.subinterests||[];
  const seen=new Set();
  const eligible=candidates.filter(p=>{
    const keys=RULES.productKeys(p);
    if(keys.some(key=>seen.has(key))||!RULES.eligible(p,profile,analysis,HEALTH.isEligible))return false;
    // A high maximum expresses intended spending on the first search. Do not
    // silently replace a missing 250–300 EUR middle option with 90 EUR at 500.
    if(profile.budget>=HIGH_BUDGET_MIN&&effectiveProductPrice(p)<profile.budget*MIDDLE_BUDGET_RATIO)return false;
    keys.forEach(key=>seen.add(key));return true;
  });
  const meaningfulFloor=profile.budget>=HIGH_BUDGET_MIN?0:profile.budget>=100?profile.budget*.04:0;
  const meaningful=meaningfulFloor?eligible.filter(p=>(RULES.verifiedOffer(p)?p.offer.total.amount:p.price)>=meaningfulFloor||p.requiredNoteSignals?.length&&p.requiredNoteSignals.every(tag=>noteTags.includes(tag))):eligible;
  // Very small entry prices often describe a component or base option. They
  // are skipped only when at least three equally eligible alternatives exist.
  // A compatible accessory explicitly requested in the note may cost much less.
  const preservesAreas=(profile.interests||[]).every(area=>!eligible.some(p=>p.tags.includes(area))||meaningful.some(p=>p.tags.includes(area)));
  const rankedPool=preservesAreas&&new Set(meaningful.flatMap(p=>RULES.productConceptKeys(p))).size>=3?meaningful:eligible;
  const ranked=rankedPool.map(p=>{
    let affinity=0;
    interestTags.forEach(tag=>{if(p.tags.includes(tag))affinity+=3});
    subinterests.forEach(tag=>{if(p.tags.includes(tag))affinity+=4});
    [profile.relation,profile.occasion,...relationSignals].forEach(tag=>{if(p.tags.includes(tag))affinity+=1.5});
    affinity+=contextFit(p.tags,relationContext[profile.relation])+contextFit(p.tags,occasionContext[profile.occasion]);
    toneTags.forEach(tag=>{if(p.tags.includes(tag)||p.type===tag)affinity+=2.5});
    if(ageTags.some(tag=>p.tags.includes(tag)))affinity+=.35;
    let noteMatches=0;noteTags.forEach(tag=>{if(p.tags.includes(tag)){affinity+=5;noteMatches+=1}});
    if(noteMatches>=2)affinity+=2;
    if(profile.occasion==="event"&&["experience","giftcard","subscription"].includes(p.type))affinity+=1.5;
    const aiPosition=(analysis.rankedAsins||[]).indexOf(p.asin);if(p.asin&&aiPosition>=0)affinity+=Math.max(1,5-aiPosition*1.5);
    const confidence=(p.reviewCount>0?(p.rating>=4.5?2:p.rating>=4?1:0):0)+(p.reviewCount>=1000?2:p.reviewCount>=100?1:0),surprise=(p.type!=="product"?2:0)+(p.tags.some(tag=>["creative","adventurous","funny","personalized"].includes(tag))?2:0)+(profile.tone==="surprising"?2:0),refinement=refinementAdjustment(p,profile,analysis,confidence,surprise),effectivePrice=RULES.verifiedOffer(p)?p.offer.total.amount:p.price,spendFit=budgetFit(effectivePrice,profile.budget);
    return{...p,affinity:affinity+refinement,budgetFit:spendFit,score:affinity+confidence+refinement+spendFit,aiReason:(analysis.reasons||{})[p.asin]||(analysis.reasons||{})[p.name]||""};
  }).sort((a,b)=>b.score-a.score||b.affinity-a.affinity||b.budgetFit-a.budgetFit||b.rating-a.rating||b.reviewCount-a.reviewCount||String(a.id).localeCompare(String(b.id)));
  // Preserve relevance order, taking the best candidate for each distinct idea.
  // No marketplace quotas, repeated concepts, or incompatible fillers.
  const selected=[],concepts=new Set();
  const add=product=>{if(!product||selected.includes(product)||selected.length===3)return;const keys=RULES.productConceptKeys(product);if(keys.some(key=>concepts.has(key)))return;selected.push(product);keys.forEach(key=>concepts.add(key))};
  // Reserve the 50–60% middle band before filling the upper-price options.
  // The pool has already passed every recipient and preference constraint.
  let middle;
  if(isFirstHighBudget(profile,analysis)){
    const middlePool=ranked.filter(p=>effectiveProductPrice(p)>=profile.budget*MIDDLE_BUDGET_RATIO&&effectiveProductPrice(p)<=profile.budget*UPPER_BUDGET_RATIO);
    if(middlePool.length){
      const best=Math.max(...ranked.map(p=>p.affinity));
      middle=middlePool.find(p=>p.affinity>=best-PRICE_RELEVANCE_MARGIN);
      add(middle);
    }
  }
  // Reserve a relevant idea for each requested area before filling the third slot.
  // All candidates have already passed budget, age, notes and subcategory gates.
  for(const area of profile.interests||[]){
    if(selected.some(p=>p.tags.includes(area)))continue;
    add(preferUpperBudget(ranked.filter(p=>p.tags.includes(area)&&!RULES.productConceptKeys(p).some(key=>concepts.has(key))),profile,analysis));
  }
  while(selected.length<3){
    const available=ranked.filter(p=>!selected.includes(p)&&!RULES.productConceptKeys(p).some(key=>concepts.has(key)));
    if(!available.length)break;
    add(preferUpperBudget(available,profile,analysis));
  }
  if(profile.budget>=HIGH_BUDGET_MIN&&!analysis.refinement){
    const ordered=[],others=selected.filter(p=>p!==middle);
    while(ordered.length<others.length)ordered.push(preferUpperBudget(others.filter(p=>!ordered.includes(p)),profile,analysis));
    if(middle)ordered.splice(Math.min(1,ordered.length),0,middle);
    return ordered;
  }
  return selected.sort((a,b)=>ranked.indexOf(a)-ranked.indexOf(b));
}
function storeUrl(product){
  const value=RULES.verifiedOffer(product)?product.offer.url:product.directUrl||product.url;
  const safe=RULES.productLink(value)?RULES.httpsUrl(value):"";if(safe){const direct=new URL(safe),tag=CONFIG.amazonAffiliateTag||"";if((direct.hostname==="amazon.it"||direct.hostname.endsWith(".amazon.it"))&&tag&&!tag.startsWith("INSERISCI"))direct.searchParams.set("tag",tag);return direct.href}
  return "";
}
function categoryFor(profile){if(["earlyChild","child"].includes(profile.ageRange)){
 const input=$$('input[name="interest"]').find(x=>x.value===profile.interests?.[0]);
 const group=input?.closest(".interest-group");
 return{icon:"🧸",title:group?.querySelector("span")?.textContent||"Giochi e scoperte per la sua età",options:[...(group?.querySelectorAll(".subinterests label")||[])].filter(x=>!x.hidden).map(x=>x.textContent.trim()),reason:"Una direzione scelta tra le categorie per bambini, in base all’età e agli interessi indicati."};
}const key=profile.interests?.[0],categories={techGaming:{icon:"💻",title:"Tecnologia e gaming scelti con criterio",options:["Tecnologia quotidiana","Accessori gaming","Smart home"]},culture:{icon:"📚",title:"Storie, cultura e passioni da approfondire",options:["Libri e fumetti","Corsi e musei","Oggetti da collezione"]},mediaAudio:{icon:"🎵",title:"Musica, cinema e ascolto",options:["Vinili e concerti","Cinema e serie","Podcast e audiolibri"]},foodDrink:{icon:"🍝",title:"Sapori da preparare o condividere",options:["Kit di cucina","Degustazioni","Box selezionate"]},travelOutdoor:{icon:"✈️",title:"Viaggi e avventure da ricordare",options:["Accessori utili","Esperienze outdoor","Diari e mappe"]},sportFitness:{icon:"⚽",title:"Sport e benessere in movimento",options:["Allenamento","Sport preferito","Recupero e comfort"]},artPhoto:{icon:"🎨",title:"Creatività e fotografia personali",options:["Fatto a mano","Fotografia","Corsi creativi"]},homeGarden:{icon:"🏠",title:"Casa, design e piccoli progetti verdi",options:["Design utile","Piante e giardino","Organizzazione"]},styleBeauty:{icon:"⌚",title:"Stile, beauty e dettagli personali",options:["Accessori","Skincare e beauty","Gioielli e orologi"]},animalsNature:{icon:"🐾",title:"Animali, natura e scelte sostenibili",options:["Per chi ama gli animali","Esperienze nella natura","Regali simbolici"]},gamesCollecting:{icon:"🎲",title:"Giochi, hobby e collezionismo",options:["Giochi da tavolo","Puzzle e modellismo","Oggetti da collezione"]},newsBusiness:{icon:"📰",title:"Informazione e crescita che durano",options:["Attualità","Economia e finanza","Formazione e lavoro"]}};const fallback=profile.tone==="funny"?{icon:"😄",title:"Idee leggere che fanno sorridere",options:["Gadget ironici","Giochi da condividere","Personalizzati divertenti"]}:{icon:"🎁",title:"Regali pensati per creare un ricordo",options:["Esperienze","Personalizzati","Scelte utili"]};const selected=categories[key]||fallback;return{...selected,reason:"Questa direzione nasce dall’incrocio tra interessi, occasione ed effetto desiderato."}}
function safeUrl(value,fallback){return RULES.httpsUrl(value)||RULES.httpsUrl(fallback)}
function esc(value){return String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char])}
function productVisual(product,productUrl){const image=safeUrl(product.imageUrl,"");if(!image)return"";return`<a class="gift-image-link" href="${esc(productUrl)}" target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label="Apri ${esc(displayText(product.name))} su ${esc(product.store)}"><img src="${esc(image)}" alt="${esc(displayText(product.name))}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span>Immagine da ${esc(product.imageSource||product.store)}</span></a>`}
function bindProductImageFallbacks(){$$(".gift-image-link img").forEach(img=>img.addEventListener("error",()=>{const wrap=img.closest(".gift-visual");wrap.innerHTML="";wrap.closest(".gift-card")?.setAttribute("data-no-image","true");track("product_image_error")},{once:true}))}
function shortProductName(product){const full=displayText(product.name),first=full.split(/[,|]/)[0].trim();return first.length<=105?first:first.slice(0,102).replace(/\s+\S*$/,"")+"…"}
function budgetDescription(profile){return profile.minBudget>0?`Fascia di spesa: ${profile.minBudget}–${profile.budget} €.`:`Budget massimo: ${profile.budget} €.`}
function suggestedBudget(current,profile=lastProfile,analysis=analyseNote(profile?.note||"")){
  if(!profile)return null;
  const candidates=activeCatalogProducts.filter(p=>RULES.eligible(p,{...profile,budget:500},analysis,HEALTH.isEligible)&&p.tags.some(tag=>[...expandedInterests(profile),...(analysis.signals||[])].includes(tag)));
  const prices=[...new Set(candidates.map(p=>Math.ceil((profile.allowUnverified?p.price:p.offer.total.amount)/5)*5))].filter(value=>value>current&&value<=500).sort((a,b)=>a-b);
  return prices.find(budget=>rankProducts(activeCatalogProducts,{...profile,budget},analysis).length===3)||null;
}
function openResultsShell(){$(".finder").hidden=true;$(".hero-concept").hidden=true;$("#giftUniverse").hidden=true;$("#results").hidden=false;focusHeading($("#results").querySelector("h2"));scrollTo({top:0,behavior:motionBehavior()})}
function showZeroRecovery(profile,candidateCount,analysis=analyseNote(profile.note)){
  const strictBudget=suggestedBudget(profile.budget,profile,analysis);
  const exploratoryBudget=!profile.allowUnverified&&strictBudget===null?suggestedBudget(profile.budget,{...profile,allowUnverified:true},analysis):null;
  const budget=strictBudget??exploratoryBudget,canIncrease=budget!==null,budgetNeedsExploration=strictBudget===null&&exploratoryBudget!==null;
  const canChangeDate=profile.timing!=="none"&&rankProducts(activeCatalogProducts,{...profile,timing:"none",allowUnverified:true},analysis).length>0;
  const canCheckDelivery=profile.timing!=="none"&&!profile.allowUnknownDelivery&&rankProducts(activeCatalogProducts,{...profile,allowUnverified:true,allowUnknownDelivery:true},analysis).length>0;
  const canExplore=!profile.allowUnverified&&rankProducts(activeCatalogProducts,{...profile,allowUnverified:true},analysis).length>0;
  const typeRestricted=(analysis.requiredTypes||[]).length>0&&!profile.allowTypeBroadening;
  const canBroadenType=typeRestricted&&rankProducts(activeCatalogProducts,{...profile,allowTypeBroadening:true},analysis).length>0;
  const report=analysis.constraintReport||{applied:[],unsatisfied:[],unclear:[]};
  $("#zeroRecovery").hidden=false;$("#categoryExploration").hidden=true;$("#productSelection").hidden=true;$("#resultGrid").innerHTML="";
  $("#resultsEyebrow").textContent="La selezione richiede una verifica";
  $("#resultsTitle").textContent="Rivediamo la ricerca";
  $("#resultSummary").textContent=budgetDescription(profile)+" "+deliveryLabel(profile);
  const title=$("#zeroRecoveryTitle"),text=$("#zeroRecoveryText");
  if(canCheckDelivery){title.textContent="Abbiamo idee compatibili, ma la consegna va verificata.";text.textContent="Non possiamo confermare l’arrivo entro la data richiesta. Puoi vedere le idee e controllare disponibilità, prezzo finale e consegna sul venditore. Età, interessi e fascia di spesa restano applicati.";$("#recommendationStatus").textContent="La consegna entro la scadenza scelta non è confermata. Scegli se verificarla personalmente sul venditore."}
  else if(["earlyChild","child"].includes(profile.ageRange)){title.textContent="Non restano prodotti verificati per questa ricerca.";text.textContent=profile.ageRange==="earlyChild"&&profile.childStage==="all"?"Per la fascia 0–6 serve indicare una fase più precisa: meno di 1 anno, 1–2 anni oppure 3–6 anni. Evitiamo di proporre un gioco non adatto all’età reale.":profile.ageRange==="child"&&profile.childStage==="all"?"Nessun prodotto documentato è adatto a tutta la fascia 7–12 con questi interessi e questo budget. Indica se ha 7–9 o 10–12 anni: molti giochi sono pensati per una sola delle due fasce.":"Il catalogo bambini è attivo, ma nessun prodotto documentato rispetta insieme età, interessi, budget e tempi indicati. Non lo sostituiamo con articoli per adulti."}
  else if(report.unsatisfied.length){title.textContent="Serve una verifica prima di proporre i regali.";text.textContent="Abbiamo riconosciuto un vincolo di sicurezza, ma il catalogo non contiene dati sufficienti per verificarlo. Precisalo o usa i filtri disponibili: non lo ignoriamo e non proponiamo prodotti potenzialmente incompatibili."}
  else if(report.unclear.length){title.textContent="Serve un chiarimento sul vincolo inserito.";text.textContent="Un vincolo nei dettagli non è interpretabile con sicurezza. Precisalo nella nota o usa i filtri disponibili: finché resta ambiguo non mostriamo proposte che potrebbero contraddirlo."}
  else if(profile.minBudget>0){title.textContent="Non abbiamo idee compatibili in questa fascia di spesa.";text.textContent="Il minimo e il massimo restano entrambi vincolanti. Puoi rivedere la fascia o gli interessi: non mostriamo articoli fuori fascia per riempire i risultati."}
  else if(canBroadenType){title.textContent="Non abbiamo tre esperienze coerenti.";text.textContent="La richiesta “esperienza” è stata applicata come tipologia vincolante. Gli oggetti restano esclusi; puoi includerli soltanto scegliendo esplicitamente l’opzione qui sotto."}
  else if(canIncrease){title.textContent="Il budget attuale non consente tre proposte coerenti.";text.textContent=`Con ${profile.budget} € non troviamo tre proposte abbastanza affidabili con questi vincoli. Portando il budget a ${budget} € possiamo mostrarti 3 idee coerenti${budgetNeedsExploration?" da verificare sul venditore":""}. Il budget cambia solo se scegli questa opzione.`}
  else if((report.applied||[]).length){title.textContent="I vincoli sono stati applicati, ma restano meno di tre idee.";text.textContent="Le esclusioni indicate sono attive. Con il budget, la scadenza e le preferenze attuali non restano tre proposte coerenti: puoi modificare i vincoli, ma non li allentiamo automaticamente."}
  else if(canExplore){title.textContent="Non abbiamo tre offerte completamente verificate.";text.textContent="Puoi esplorare idee indicative: spedizione, varianti, personalizzazione e consegna dovranno essere controllate sul venditore."}
  else if(isFirstHighBudget(profile,analysis)){title.textContent="Mancano idee nella fascia di spesa desiderata.";text.textContent="Per la prima ricerca partiamo dalla metà del massimale. Il catalogo non contiene idee compatibili in questa fascia: puoi abbassare il massimo o rivedere gli interessi."}
  else{title.textContent="Con questi vincoli non abbiamo tre proposte affidabili.";text.textContent="Con i dati e i vincoli attuali non restano tre proposte ammissibili. Rivedi i dettagli e le esclusioni: non li allentiamo automaticamente."}
  const increase=$("#increaseBudgetRecovery");increase.hidden=!canIncrease;increase.dataset.budget=canIncrease?String(budget):"";increase.dataset.allowUnverified=String(profile.allowUnverified||budgetNeedsExploration);increase.textContent=canIncrease?`Porta il budget${profile.allowUnverified||budgetNeedsExploration?" indicativo":""} a ${budget} €`:"";
  $("#changeDateRecovery").hidden=!canChangeDate;$("#changeDateRecovery").textContent="Rivedi la scadenza";
  $("#checkDeliveryRecovery").hidden=!canCheckDelivery;
  $("#specifyAgeRecovery").hidden=!(["earlyChild","child"].includes(profile.ageRange)&&(!profile.childStage||profile.childStage==="all"));$("#retryRecovery").hidden=true;
  $("#exploreUnverifiedRecovery").hidden=!canExplore;
  $("#broadenTypeRecovery").hidden=!canBroadenType;
  openResultsShell();track("recommendation_zero_results",{candidate_count:candidateCount});
}
function renderProductCards(selected,profile,reasonIntro=""){
  displayedProducts=selected;
  $("#resultsTitle").textContent=selected.length===3?"Le nostre 3 proposte":"Le idee disponibili";
  $("#resultsEyebrow").textContent=selected.some(p=>p.ageVerification==="required")?"Le proposte disponibili · alcune età da verificare":selected.length<3?"Le proposte disponibili":profile.allowUnverified?"Le 3 idee scelte per te":"Le 3 offerte più adatte e verificate";
  $("#resultGrid").innerHTML=selected.map((p,i)=>{
    const url=storeUrl(p),verified=RULES.verifiedOffer(p),price=verified?p.offer.total.amount:p.price;
    const priceText=`${verified?"Totale verificato: ":p.amazonPrice?"Prezzo Amazon: ":"Prezzo indicativo: "}${price.toLocaleString("it-IT",{style:"currency",currency:"EUR"})}`;
    const amazonNote=p.amazonPrice?`Amazon · ${new Date(p.amazonCheckedAt).toLocaleString(document.documentElement.lang==='en-US'?'en-GB':'it-IT',{dateStyle:'short',timeStyle:'short'})}. ${document.documentElement.lang==='en-US'?'Prices and availability may change. The price on Amazon at purchase applies. Shipping and delivery must be checked on Amazon.':'Prezzi e disponibilità possono cambiare. Fa fede il prezzo su Amazon al momento dell’acquisto. Spedizione e consegna da verificare su Amazon.'}`:"";
    const conditions=amazonNote|| (verified?"Variante e costi inclusi nella verifica; conferma sul venditore prima dell’acquisto.":"Totale da verificare: spedizione, variante e personalizzazione possono aumentare il costo.");
    const delivery=profile.timing==="none"?"":RULES.deliveryEligible(p,profile)?`Consegna verificata entro ${p.offer.delivery.by}`:"Controlla la consegna su Amazon";
    const reason=reasonIntro+(p.aiReason||(profile.mode==="giver"?giverReason(p,profile):displayText(p.why)));
    const storeClass=p.store.toLowerCase().replace(/[^a-z0-9]+/g,"-");
    const shortName=shortProductName(p),fullName=displayText(p.name);
    const ageReview=p.ageVerification==="required"?'<p class="age-review-notice"><strong>Età consigliata da verificare</strong><br>La scheda non indica chiaramente l’età consigliata. Controllala su Amazon o sul sito dell’editore prima dell’acquisto.</p>':"";
    return `<article class="gift-card" data-no-image="${!safeUrl(p.imageUrl,"")}"><div class="gift-visual">${productVisual(p,url)}</div><div class="gift-body"><div class="card-top"><span class="match">${esc(p.ageVerification==="required"?"Idea da verificare":["La nostra scelta","Ottima alternativa","Un’idea diversa"][i])}</span><span class="store-badge ${storeClass}">${esc(p.store)}</span></div><h3 title="${esc(fullName)}">${esc(shortName)}</h3>${ageReview}<p>${esc(reason)}</p>${p.amazonPrice?"":`<p>${esc(conditions)}</p>`}<div class="gift-meta"><strong>${esc(priceText)}</strong>${p.amazonPrice?`<small class="price-time">${esc(priceTime(p))}</small>`:""}${delivery?`<span class="delivery">${esc(delivery)}</span>`:""}</div><a href="${esc(url)}" target="_blank" rel="sponsored nofollow noopener noreferrer" data-product="${esc(fullName)}" data-position="${i+1}" data-area="${esc(p.tags[0]||"")}">${verified?"Verifica l’offerta sul venditore":"Verifica prezzo e opzioni"}</a>${p.imageUrl?"":'<span class="product-photo-note">Foto disponibili sulla pagina del venditore.</span>'}</div></article>`;
  }).join("");bindProductImageFallbacks();renderShare(selected);
}
function priceTime(p){const en=document.documentElement.lang==='en-US';return (en?'Updated ':'Aggiornato ')+new Date(p.amazonCheckedAt).toLocaleString(en?'en-GB':'it-IT',{dateStyle:'short',timeStyle:'short'})}
// Shares a 3gifts.it page with the same ideas (never an Amazon link, never the answers or the note).
function renderShare(selected){
  let box=$("#shareResults");
  const ids=selected.map(p=>p.conceptId).filter(Boolean);
  if(!box){box=document.createElement("div");box.id="shareResults";box.className="share-results";$("#resultGrid").after(box);}
  box.hidden=ids.length<1;if(box.hidden)return;
  const url="https://3gifts.it/scelta?idee="+ids.join(",");
  box.innerHTML='<p>Regalo di gruppo? Manda le idee agli altri.</p><a class="share-whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent("Guarda queste idee regalo: "+url)+'">Manda su WhatsApp</a><button type="button" class="share-copy">Copia il link</button>';
  box.querySelector(".share-whatsapp").addEventListener("click",()=>track("results_shared",{channel:"whatsapp"}));
  box.querySelector(".share-copy").addEventListener("click",async e=>{const b=e.currentTarget;try{await navigator.clipboard.writeText(url);b.textContent="Link copiato";track("results_shared",{channel:"copy"})}catch{b.textContent=url}});
}
function setResultSummary(profile){
  if(profile.researchMethod){
    $('#resultSummary').textContent=budgetDescription(profile)+' '+deliveryLabel(profile)+' I prezzi Amazon possono cambiare: fa fede il prezzo al momento dell’acquisto. Controlla anche la consegna.';
    if(profile.budget>=150)$('#resultSummary').textContent+=' Ricerca da '+Math.max(profile.minBudget||0,profile.budget*.5)+' € al massimale.';
    if((profile.interests||[]).some(a=>!(profile.excludedInterests||[]).includes(a)&&!displayedProducts.some(p=>p.tags.includes(a))))$('#resultSummary').textContent+=' Una categoria selezionata non ha prodotti compatibili disponibili.';
    return;
  }
  $("#resultSummary").textContent=budgetDescription(profile)+" "+(profile.allowUnverified?`Il prezzo indicativo non è il totale garantito. ${deliveryLabel(profile)} La consegna resta da verificare.`:`Costo totale verificato per le proposte mostrate. ${deliveryLabel(profile)}`);
  const missing=(profile.interests||[]).filter(area=>!(profile.excludedInterests||[]).includes(area)&&!displayedProducts.some(p=>p.tags.includes(area)));
  if(missing.length)$("#resultSummary").textContent+=" Per una delle categorie scelte non abbiamo proposte compatibili con questi vincoli.";
  if(profile.allowUnknownDelivery)$("#resultSummary").textContent+=" Hai scelto di controllare la consegna sul venditore: l’arrivo entro la scadenza non è confermato.";
  if(profile.subinterests?.includes("skincare")&&!displayedProducts.some(p=>p.tags.includes("skincare")))$("#resultSummary").textContent+=" Non abbiamo ancora creme e sieri compatibili: gli accessori beauty non li sostituiscono.";
  if(profile.budget>=HIGH_BUDGET_MIN&&displayedProducts.length){
    if(profile.isRefinement)$("#resultSummary").textContent+=" Negli affinamenti manteniamo la fascia di ricerca. Puoi cambiarla indicando un nuovo budget massimo.";
    else {
      $("#resultSummary").textContent+=` Prima ricerca: proposte da ${Math.max(profile.minBudget||0,profile.budget*MIDDLE_BUDGET_RATIO)} € al massimale; fascia intermedia desiderata ${profile.budget*MIDDLE_BUDGET_RATIO}–${profile.budget*UPPER_BUDGET_RATIO} €.`;
      if(!displayedProducts.some(p=>effectiveProductPrice(p)<=profile.budget*UPPER_BUDGET_RATIO))$("#resultSummary").textContent+=" Non abbiamo una proposta intermedia compatibile: non la sostituiamo con un prodotto molto più economico.";
      if(displayedProducts.length<3)$("#resultSummary").textContent+=" Il catalogo non offre abbastanza idee pertinenti in questa fascia. Con «Non sono convinto» puoi indicare un nuovo budget massimo.";
    }
  }
}
let resultsBusy=false,resultRequestVersion=0;
function invalidateResults(){resultRequestVersion+=1;resultsBusy=false;$("#nextBtn").disabled=false}
async function showResults(allowUnverified=false,allowTypeBroadening=false,allowUnknownDelivery=false){
  if(resultsBusy)return;
  lastSearchArgs=[allowUnverified,allowTypeBroadening,allowUnknownDelivery];
  const d={...formData(),allowUnknownDelivery:allowUnverified===true&&allowUnknownDelivery===true,allowUnverified:allowUnverified===true,allowTypeBroadening:allowTypeBroadening===true};
  if(!RULES.validBudget(d.budget)){showError("Indica un budget da 15 a 500 €, a incrementi di 5 €.");return}
  if(!RULES.validBudgetRange(d.budget,d.minBudget)){showError("La spesa minima deve essere tra 0 € e il massimo scelto, a incrementi di 5 €.");return}
  lastProfile=d;displayedProducts=[];refinementCount=0;rejectedProductKeys=new Set();rejectedConceptKeys=new Set();rejectedParentAsins=new Set();
  const requestVersion=++resultRequestVersion,isCurrent=()=>requestVersion===resultRequestVersion;
  const next=$("#nextBtn");resultsBusy=true;next.disabled=true;next.textContent="Cerco le idee migliori…";
  try{
    const analysis=analyseNote(d.note),live=await fetchResearchSelection(d,analysis);
    if(!isCurrent())return;
    const resultProfile={...d,researchMethod:true,allowUnverified:true},selected=live.products;
    lastProfile=resultProfile;activeCatalogProducts=selected;
    $('#recommendationStatus').textContent=live.partial?'Ricerca parziale: mostriamo i prodotti compatibili ricevuti da Amazon.':'Scelti in base alle tue risposte.';
    track('questionnaire_completed');
    if(!selected.length){showResearchRecovery(resultProfile,analysis);return}
    $("#zeroRecovery").hidden=true;$("#refinementForm").hidden=true;
    $("#resultsEyebrow").textContent=resultProfile.allowUnverified?"Le 3 idee scelte per te":"Le 3 offerte più adatte e verificate";
    if(selected.length<3)$("#resultsEyebrow").textContent="Le proposte disponibili";
    renderProductCards(selected,resultProfile);setResultSummary(resultProfile);rememberProducts(selected);
    const exploring=resultProfile.journey==="explore";$("#categoryExploration").hidden=!exploring;$("#productSelection").hidden=exploring;$("#revealProducts").hidden=false;
    if(exploring){const category=categoryFor(resultProfile);$("#categoryIcon").textContent=category.icon;$("#categoryTitle").textContent=category.title;$("#categoryReason").textContent=category.reason;$("#categoryOptions").innerHTML=category.options.map((item,i)=>`<div><span>0${i+1}</span><strong>${esc(item)}</strong></div>`).join("")}
    $("#refinementTitle").textContent="Nessuno ti ha convinto?";$("#refinementText").textContent="Aiutaci a capire meglio: bastano altre 2–3 domande.";$("#refineBtn").hidden=false;$("#refineBtn").textContent="Non sono convinto";openResultsShell();if(!exploring)track("recommendations_viewed");
  }catch{
    if(!isCurrent())return;
    $("#recommendationStatus").textContent="Non siamo riusciti a completare la verifica. Rivedi i dettagli e riprova.";
    showResearchRecovery(d,analyseNote(d.note),true);
  }finally{if(isCurrent()){resultsBusy=false;next.disabled=false;next.innerHTML='Trova i tre regali <span>✨</span>'}}
}
$("#increaseBudgetRecovery").addEventListener("click",event=>{
  if(event.currentTarget.hidden||resultsBusy)return;
  const budget=Number(event.currentTarget.dataset.budget),allowUnverified=event.currentTarget.dataset.allowUnverified==="true";
  if(!RULES.validBudget(budget))return;
  $("#budget").value=String(budget);syncBudget();
  track("zero_results_recovery",{choice:"budget"});showResults(allowUnverified,lastProfile?.allowTypeBroadening===true);
});
function editRecovery(focusSelector,choice){
  if(resultsBusy)return;
  $("#zeroRecovery").hidden=true;$("#results").hidden=true;$(".finder").hidden=false;
  step=choice==="age"?1:+$('.step[data-step-key="budget_timing_details"]').dataset.step;renderStep();
  if(choice==="constraints")$("#avoidDetails").open=true;
  $(focusSelector).scrollIntoView({behavior:motionBehavior(),block:"center"});track("zero_results_recovery",{choice});
}
$("#specifyAgeRecovery").addEventListener("click",()=>editRecovery(lastProfile?.ageRange==="child"||formData().ageRange==="child"?"#childBandQuestion":"#childStageQuestion","age"));
$("#retryRecovery").addEventListener("click",()=>{
  if($("#retryRecovery").hidden||resultsBusy)return;
  track("zero_results_recovery",{choice:"retry"});showResults(...lastSearchArgs);
});
$("#checkDeliveryRecovery").addEventListener("click",()=>{
  if($("#checkDeliveryRecovery").hidden||resultsBusy)return;
  track("zero_results_recovery",{choice:"check_delivery"});showResults(true,lastProfile?.allowTypeBroadening===true,true);
});
$("#changeDateRecovery").addEventListener("click",()=>editRecovery("#timingQuestion","date"));
$("#editConstraintsRecovery").addEventListener("click",()=>editRecovery("#avoidDetails","constraints"));
$("#exploreUnverifiedRecovery").addEventListener("click",()=>{
  if($("#exploreUnverifiedRecovery").hidden||resultsBusy)return;
  track("zero_results_recovery",{choice:"explore_unverified"});showResults(true,lastProfile?.allowTypeBroadening===true);
});
$("#broadenTypeRecovery").addEventListener("click",()=>{
  if($("#broadenTypeRecovery").hidden||resultsBusy)return;
  track("zero_results_recovery",{choice:"type"});showResults(lastProfile?.allowUnverified===true,true);
});
const defaultRefineOptions=[{value:"practical",label:"Qualcosa di utile"},{value:"experience",label:"Un’esperienza"},{value:"creative",label:"Originale e personale"},{value:"funny",label:"Qualcosa di divertente"}],reasonDirectionConfig={oneCategory:{label:"Come vuoi cambiare le proposte?",hint:"Cercheremo nelle altre categorie che hai selezionato, mantenendo i tuoi vincoli.",options:[{value:"differentCategory",label:"Esplora l’altra categoria selezionata"}]},banal:{label:"Che tipo di originalità cerchi?",hint:"Scegli una direzione meno prevedibile.",options:[{value:"creative",label:"Creativa o artigianale"},{value:"experience",label:"Un’esperienza da vivere"},{value:"funny",label:"Ironica e divertente"},{value:"practical",label:"Utile, ma meno scontata"}]},impersonal:{label:"Cosa dovrebbe renderlo più personale?",hint:"Indica il legame che il regalo dovrebbe raccontare.",options:[{value:"memory",label:"Un ricordo condiviso"},{value:"passion",label:"Una sua passione precisa"},{value:"personalized",label:"Una personalizzazione visibile"},{value:"experience",label:"Un momento da vivere insieme"}]},price:{label:"Che direzione preferisci nel nuovo budget?",hint:"Indica anche il nuovo tetto di spesa qui sotto.",options:defaultRefineOptions},unsuitable:{label:"Quale direzione sembra più adatta?",hint:"Cambieremo categoria e tipo di proposta.",options:defaultRefineOptions},owned:{label:"Quanto deve essere diverso?",hint:"Eviteremo anche le tipologie già mostrate.",options:[{value:"differentType",label:"Un formato completamente diverso"},{value:"differentCategory",label:"Un’altra categoria"},{value:"experience",label:"Meglio un’esperienza"},{value:"digital",label:"Meglio qualcosa di digitale"}]}};
let experienceBroadeningApproved=false;
function resetExperienceBroadening(){experienceBroadeningApproved=false;$("#broadenExperience").hidden=true}
function configureRefinement(reason){resetExperienceBroadening();const config=reasonDirectionConfig[reason]||{label:"Quale direzione preferisci?",hint:"Scegli come correggere la prossima selezione.",options:defaultRefineOptions},select=$("#refineDirection"),budget=$("#refineBudget"),priceReason=reason==="price";$("#refineDirectionLabel").textContent=config.label;$("#refineDirectionHint").textContent=config.hint;select.innerHTML='<option value="">Scegli una risposta</option>'+[...config.options,...(['wedding','newbaby','anniversary'].includes(lastProfile?.occasion)&&!(lastProfile?.occasion==='newbaby'&&lastProfile?.ageRange==='child')?[{value:'personal',label:'Più personale'}]:[])].map(x=>`<option value="${x.value}">${x.label}</option>`).join("");budget.required=priceReason;$("#refineBudgetOptional").textContent=priceReason?"(obbligatorio)":"(facoltativo)"}
$("#refineReason").addEventListener("change",event=>configureRefinement(event.currentTarget.value));
$("#refineDirection").addEventListener("change",event=>{resetExperienceBroadening();if(event.currentTarget.value==="personal")$("#refineDirectionHint").textContent="Diamo priorità alle categorie scelte, senza il peso dell’occasione.";else $("#refineDirectionHint").textContent=(reasonDirectionConfig[$("#refineReason").value]||{hint:"Scegli come correggere la prossima selezione."}).hint;});
$("#refinementForm").addEventListener("input",()=>{$("#refinementError").textContent=""});
$("#refinementForm").addEventListener("change",()=>{$("#refinementError").textContent=""});
$("#refineBtn").addEventListener("click",()=>{if(refinementCount>=3)return;configureRefinement($("#refineReason").value);resetExperienceBroadening();$("#refineBtn").hidden=true;$("#refinementForm").hidden=false;$("#refinementForm").scrollIntoView({behavior:motionBehavior(),block:"center"});track("refinement_started",{round:refinementCount+1})});
$("#cancelRefine").addEventListener("click",()=>{resetExperienceBroadening();$("#refinementForm").hidden=true;$("#refineBtn").hidden=refinementCount>=3;$("#refinementError").textContent=""});
$("#broadenExperience").addEventListener("click",()=>{if(resultsBusy||$("#broadenExperience").hidden)return;experienceBroadeningApproved=true;$("#broadenExperience").hidden=true;$("#refinementForm").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))});
$("#refinementForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!lastProfile||resultsBusy||refinementCount>=3)return;$("#refinementError").textContent="";
  const refinementForm=event.currentTarget;
  const fd=new FormData(refinementForm),reason=fd.get("refineReason"),direction=fd.get("refineDirection"),surprise=fd.get("refineSurprise"),newBudget=Number(fd.get("refineBudget")),detail=String(fd.get("refineDetail")||"");
  if(!reason||!direction||!surprise){$("#refinementError").textContent="Rispondi alle tre domande per continuare.";return}
  if((reason==="price"||fd.get("refineBudget"))&&!RULES.validBudget(newBudget)){$("#refinementError").textContent="Indica un budget da 15 a 500 €, a incrementi di 5 €.";return}
  if(fd.get("refineBudget")&&!RULES.validBudgetRange(newBudget,lastProfile.minBudget||0)){$("#refinementError").textContent="Il nuovo massimo non può essere inferiore alla spesa minima. Rivedi la fascia nel questionario.";return}
  const allProducts=activeCatalogProducts,directionMeta=refinementDirectionMeta[direction]||{tags:[],tone:lastProfile.tone,label:"la nuova direzione"},wantsExperience=(directionMeta.types||[]).some(type=>["experience","service"].includes(type)),profile={...lastProfile,budget:newBudget>=15&&newBudget<=500?newBudget:lastProfile.budget,tone:directionMeta.tone||lastProfile.tone,note:[lastProfile.note,detail].filter(value=>String(value||"").trim()).join("\n")},analysis=analyseNote(profile.note),noteRequiredSignals=[...(analysis.requiredSignals||[])],rejectedProducts=allProducts.filter(wasShown);
  const feedback=analyseNote(detail).feedback;
  analysis.noteConstraints=[...(lastProfile.noteConstraints||analyseNote(lastProfile.note).noteConstraints),...analyseNote(detail,'refinement').noteConstraints];
  profile.noteConstraints=analysis.noteConstraints;
  if(direction!=="personal"&&(direction==="differentCategory"||reason==="oneCategory"||feedback?.changeCategory)){
    const areas=profile.interests||[],counts=areas.map(area=>({area,count:displayedProducts.filter(p=>p.tags.includes(area)).length}));
    const named=areas.filter(area=>displayedProducts.some(p=>p.tags.includes(area)&&feedback?.mentioned?.some(tag=>p.tags.includes(tag))));
    const highest=Math.max(0,...counts.map(x=>x.count));
    const dominant=counts.filter(x=>x.count===highest&&x.count>0);
    const excluded=named.length?named:dominant.length===1&&areas.length>1?dominant.map(x=>x.area):[];
    profile.excludedInterests=[...new Set([...(lastProfile.excludedInterests||[]),...excluded])];
  }
  if(direction==='personal')profile.searchPriority='personal';
  profile.isRefinement=true;profile.refinementSurprise=surprise;profile.refinementDirection=direction;profile.refinementReason=reason;
  analysis.refinement={reason,direction,surprise,rejectedProducts};// Refinement style changes search priority, never the hard requirements parsed from the note.
  if(directionMeta.types?.length)analysis.requiredTypes=directionMeta.types;
  if(wantsExperience){analysis.requiredTypes=["experience","service"];profile.allowTypeBroadening=experienceBroadeningApproved;if(experienceBroadeningApproved)analysis.requiredSignals=noteRequiredSignals.filter(tag=>tag!=="experience")}
  const rejectConcepts=!(wantsExperience&&experienceBroadeningApproved)&&direction==="differentType";
  let alternatives;
  resultsBusy=true;const refinementRequest=++resultRequestVersion;
  const submit=refinementForm.querySelector('button[type="submit"]'),submitLabel=submit?.innerHTML;
  if(submit){submit.disabled=true;submit.textContent='Cerco nuove alternative…';}
  try{const live=await fetchResearchSelection(profile,analysis,rejectConcepts);if(refinementRequest!==resultRequestVersion)return;alternatives=live.products;activeCatalogProducts=[...activeCatalogProducts,...alternatives];}
  catch{if(refinementRequest===resultRequestVersion)$('#refinementError').textContent='Ricerca momentaneamente non disponibile. Riprova tra poco.';return}
  finally{if(refinementRequest===resultRequestVersion)resultsBusy=false;if(submit){submit.disabled=false;submit.innerHTML=submitLabel;}}

  if(!alternatives.length){if(wantsExperience&&!experienceBroadeningApproved){$("#refinementError").textContent="Non abbiamo esperienze nuove coerenti con gli altri vincoli. Gli oggetti restano esclusi finché non scegli esplicitamente di includerli.";$("#broadenExperience").hidden=false}else $("#refinementError").textContent=analysis.needsClarification?"La nota contiene un vincolo che non sappiamo verificare. Rivedi i dettagli: non mostriamo alternative potenzialmente incompatibili.":profile.excludedInterests?.length?"Non restano proposte nelle altre categorie selezionate. Rivedi gli interessi nel questionario: non ti riproponiamo la categoria scartata.":"Non restano nuove idee compatibili. Rivedi le risposte: non allentiamo automaticamente le esclusioni.";return}
  alternatives=alternatives.slice(0,3);rememberProducts(alternatives);refinementCount+=1;
  const reasonIntro={banal:"Una nuova idea tra gli interessi scelti. ",impersonal:"Una nuova proposta basata sui dettagli indicati. ",price:profile.allowUnverified?"Prezzo indicativo più contenuto; totale da verificare. ":"Dentro il nuovo limite di spesa. ",unsuitable:"Una direzione diversa dalle proposte scartate. ",owned:"Un’alternativa alle proposte già viste. "}[reason]||"Una proposta ricalibrata. ";
  renderProductCards(alternatives,profile,reasonIntro);setResultSummary(profile);
  lastProfile=profile;$("#recommendationStatus").textContent=`Affinamento ${refinementCount} di 3: esclusi i prodotti già visti e mantenuti i vincoli.${profile.allowTypeBroadening?" Hai scelto di includere anche oggetti coerenti.":""}${profile.allowUnverified?" Restano idee da verificare: costo totale e consegna non sono garantiti.":""}`;refinementForm.reset();configureRefinement("");refinementForm.hidden=true;const finished=refinementCount>=3;$("#refineBtn").hidden=finished;$("#refineBtn").textContent="Affina ancora";if(finished){$("#refinementTitle").textContent="Hai completato i 3 affinamenti";$("#refinementText").textContent="Per esplorare una direzione completamente nuova, rifai il test modificando una risposta."}$("#resultGrid").scrollIntoView({behavior:motionBehavior(),block:"start"});track("recommendations_refined",{round:refinementCount})
});
$("#revealProducts").addEventListener("click",()=>{$("#productSelection").hidden=false;$("#revealProducts").hidden=true;$("#productSelection").scrollIntoView({behavior:motionBehavior(),block:"start"});track("recommendations_viewed")});
function labelTag(tag){return({tech:"tecnologia",gaming:"gaming",food:"cucina",travel:"viaggi",books:"lettura",news:"attualità",audio:"audiolibri e podcast",wellness:"benessere",sport:"sport",music:"musica",photo:"fotografia",home:"casa",garden:"giardinaggio",pets:"animali",style:"stile e beauty",creative:"creatività",social:"socialità",calm:"relax",adventurous:"avventura",funny:"regali divertenti"})[tag]||tag}
function giverReason(product,data){const effects={sentimental:"sensibile",useful:"concreto",funny:"ironico",surprising:"inaspettato",elegant:"ricercato",neutral:"personale"};return`Fa pensare al tuo gusto ${effects[data.tone]||"personale"}: chi lo riceve riconoscerà qualcosa di te nella scelta.`}
function label(r){return({partner:"il tuo partner",friend:"un amico o un'amica",family:"un familiare",colleague:"un collega",couple:"una coppia"})[r]||"questa persona"}
function labelAge(value){return({earlyChild:"0–6 anni",child:"7–12 anni",teen:"13–17 anni",youngAdult:"18–34 anni",adult:"35–54 anni",mature:"55+ anni",unknown:"non indicata"})[value]||"non indicata"}
function deliveryLabel(profile){return({urgent2:"Serve entro 2 giorni.",week:"Serve entro una settimana.",month:"Serve entro un mese.",none:"Non hai indicato una scadenza precisa."})[profile.timing]||`Serve entro il ${new Date(profile.deadline+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"})}.`}
$("#restartBtn").addEventListener("click",()=>{
  invalidateResults();if(!$(".finder").hidden)trackStepTiming("restart");
  form.reset();deadline.value="";deadline.required=false;syncBudget();
  currentMode="recipient";currentJourney="direct";syncPerspective();refinementCount=0;displayedProducts=[];rejectedProductKeys=new Set();rejectedConceptKeys=new Set();rejectedParentAsins=new Set();lastProfile=null;
  activeCatalogProducts=products.map(normalizeProduct);activeHealthMeta={active:false,matched:0,excluded:0,pricesUpdated:0,staleOrMissing:products.length};
  $("#refinementForm").reset();configureRefinement("");$("#refinementForm").hidden=true;$("#refinementError").textContent="";
  $("#refinementTitle").textContent="Nessuno ti ha convinto?";$("#refinementText").textContent="Aiutaci a capire meglio: bastano altre 2–3 domande.";
  $("#refineBtn").hidden=false;$("#refineBtn").textContent="Non sono convinto";
  $("#exactDatePanel").hidden=true;$("#avoidDetails").open=false;$("#minBudgetDetails").open=false;$("#zeroRecovery").hidden=true;
  $$('.subinterests').forEach(x=>x.hidden=true);$("#resultGrid").innerHTML="";$("#recommendationStatus").textContent="";$("#resultSummary").textContent="";
  $("#results").hidden=true;$(".finder").hidden=true;$("#categoryExploration").hidden=true;$("#productSelection").hidden=false;$("#revealProducts").hidden=false;
  step=1;renderStep();$(".hero-concept").hidden=false;$("#giftUniverse").hidden=false;focusHeading($("#main-title"));scrollTo({top:0,behavior:motionBehavior()});
});
// Which of the three proposals is opened, its area and the engine: aggregate counts, never the product.
document.addEventListener("click",e=>{const a=e.target.closest("a[data-product]");if(a)track("external_link_click",{position:Number(a.dataset.position)||0,area:a.dataset.area||"",engine:String(CONFIG.amazonProductsEndpoint||"").includes("/v2/")?"v2":"v1"})});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")pauseStepTiming();else resumeStepTiming()});
window.addEventListener("pagehide",()=>{if(!$(".finder").hidden)trackStepTiming("exit")});
window.addEventListener("pageshow",event=>{if(event.persisted&&!$(".finder").hidden){stepEnteredAt=null;stepActiveMs=0;stepTimerOpen=true;resumeStepTiming()}});
 const analyticsFields={questionnaire_started:["visible_steps"],questionnaire_step_completed:["step_key","position","visible_steps"],questionnaire_step_timing:["step_key","seconds","direction","position","visible_steps"],questionnaire_completed:[],recommendation_zero_results:["candidate_count"],zero_results_recovery:["choice"],recommendations_viewed:[],refinement_started:["round"],recommendations_refined:["round"],external_link_click:["position","area","engine"],results_shared:["channel"],product_image_error:[]};
 function track(event,data={}){
   if(!window.GiftsPrivacy?.hasAnalyticsConsent()||!window.umami?.track||!Object.hasOwn(analyticsFields,event))return;
   const safe=Object.fromEntries(analyticsFields[event].filter(key=>typeof data[key]==="string"||typeof data[key]==="number").map(key=>[key,data[key]]));
   try{const sent=window.umami.track(event,safe);sent?.catch?.(()=>{})}catch{}
 }
 const dialog=$("#infoDialog"),content=$("#dialogContent");const copy={how:`<h2>Come funziona</h2><p>Scegli se esplorare prima la categoria oppure ricevere direttamente fino a tre prodotti. Interessi, destinatario e occasione guidano le parole cercate su Amazon. Controlliamo pertinenza, fascia di spesa ed esclusioni.</p><p>Le proposte privilegiano la pertinenza e la varietà tra gli interessi selezionati. Le recensioni non sono ancora usate per ordinare. Età, compatibilità, variante, prezzo finale e consegna vanno confermati su Amazon. Gli affinamenti cercano nuovi prodotti: stile e originalità orientano la scelta, mentre budget, età ed esclusioni restano vincolanti.</p>`,privacy:`<h2>Privacy</h2><p>Le note libere e la data precisa restano nel browser. Il server riceve solo criteri strutturati per cercare i prodotti; non li salva in un database. Amazon riceve parole di ricerca e fascia di prezzo. Le risposte non vengono inviate a Umami.</p><p>ChatGPT Sites gestisce hosting e metriche aggregate integrate. Umami Cloud viene caricato soltanto se accetti gli analytics e riceve esclusivamente visualizzazioni ed eventi generici, mai ciò che inserisci nel questionario.</p><p>Il titolare è Francesco Nota; per richieste puoi scrivere a <a href="mailto:info@3gifts.it">info@3gifts.it</a>. Consulta la <a href="privacy.html">Privacy Policy completa</a> o modifica la scelta da “Preferenze privacy” nel piè di pagina.</p>`,affiliate:`<h2>Link esterni</h2><p>Alcuni collegamenti ad Amazon sono link affiliati e possono generare una commissione per 3Gifts senza costi aggiuntivi per chi acquista. In qualità di Affiliato Amazon io ricevo un guadagno dagli acquisti idonei.</p><p>Anche i collegamenti a Kindle Unlimited e Audible su Amazon sono link affiliati. Le commissioni non determinano la selezione o l’ordine delle proposte.</p>`,terms:`<h2>Condizioni essenziali</h2><p>I suggerimenti hanno finalità informativa. Prezzi, disponibilità, caratteristiche e tempi di consegna sono stabiliti dal venditore e devono essere verificati prima dell'acquisto.</p><p>3Gifts è gestito da Francesco Nota. Per domande scrivi a <a href="mailto:info@3gifts.it">info@3gifts.it</a>.</p>`};
function openDialog(key){content.innerHTML=copy[key];dialog.showModal()}$("#howBtn").addEventListener("click",()=>openDialog("how"));$$('[data-modal]').forEach(b=>b.addEventListener("click",()=>openDialog(b.dataset.modal)));$(".dialog-close").addEventListener("click",()=>dialog.close());dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
const menuBtn=$("#menuBtn"),siteMenu=$("#siteMenu");function closeMenu(){siteMenu.hidden=true;menuBtn.setAttribute("aria-expanded","false")}menuBtn.addEventListener("click",e=>{e.stopPropagation();const willOpen=siteMenu.hidden;siteMenu.hidden=!willOpen;menuBtn.setAttribute("aria-expanded",String(willOpen))});document.addEventListener("click",e=>{if(!e.target.closest(".menu-wrap"))closeMenu()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});$("[data-menu-how]").addEventListener("click",()=>{closeMenu();openDialog("how")});
