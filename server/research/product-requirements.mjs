import {primaryProductType,requestedPrimaryType} from './product-identity.mjs';
import {PUBLIC_RULES} from './public-rules.mjs';
// Conservative listing checks, not a manufacturer certification. Unknown required
// capabilities exclude the candidate; taste, comfort and suitability stay manual.
const requirementText=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const CONNECTION_OPTIONS=['bluetooth','usb_c','usb_a','hdmi_arc','jack_35','qi','magsafe'];
const connectionPatterns={bluetooth:'\\b(bluetooth|bt)\\b',usb_c:'\\b(usb|type) c\\b',usb_a:'\\busb a\\b|ricevitore usb|dongle usb',hdmi_arc:'\\bhdmi (e ?arc|arc)\\b',jack_35:'jack.*3 5|aux.*3 5',qi:'\\bqi2?\\b',magsafe:'\\bmagsafe\\b'};
export function normalizeRecipientContext(raw={}){
 const value=raw&&typeof raw==='object'?raw:{};
 const deviceModel=String(value.deviceModel||'').trim().slice(0,90);
 return {deviceModel,connections:Array.isArray(value.connections)?[...new Set(value.connections.filter(x=>CONNECTION_OPTIONS.includes(x)))]:[]};
}
function contextRequirements(query){
 const s=requirementText(query.originalKeyword||query.keywords);
 const needs=[];
 if(/cover.*smartphone|cover per smartphone|pellicol.*(smartphone|tablet)|custodi.*(tablet|ebook|kindle|kobo)/.test(s))needs.push('device_model');
 if(/termostat|videocitofon|valvola termostat|serratura smart|interruttore smart|tapparella|lampadina smart|presa smart|hub zigbee|sensore.*(smart|wifi)|striscia led smart/.test(s))needs.push('installation');
 if(/\b(scarpe|scarponi|stivali|pattini|casco|cintura|costumi bambini|vestiti bambole|violino bambini|bicicletta|bici|balance bike)\b/.test(s))needs.push('fit');
 if(/\b(power bank|powerbank|cuffie|auricolari|cassa|speaker|mouse|tastiera|soundbar|caricatore|hub usb|ssd esterno|hard disk esterno|docking station|monitor pc|webcam|microfono|adattatore bluetooth|cavo usb|chiavetta usb)\b/.test(s)&&! /smart speaker/.test(s))needs.push('connection');
 if(/tracker bluetooth|smartwatch|smartband|braccialetto fitness/.test(s))needs.push('ecosystem');
 return needs;
}
export function queryContextChecks(query,context={}){
 const c=normalizeRecipientContext(context);
 return contextRequirements(query).map(kind=>({kind,status:kind==='device_model'?(c.deviceModel?'provided':'unknown'):kind==='connection'?(c.connections.length?'provided':'unknown'):'unknown',label:{device_model:'Modello esatto del dispositivo',connection:'Collegamento supportato dal dispositivo',installation:'Compatibilità dell’impianto e installazione',fit:'Misure, taglia o regolazione per il destinatario',ecosystem:'Sistema operativo e compatibilità del modello'}[kind]}));
}
function listingState(text,pattern){
 const positive=new RegExp(pattern,'i');
 if(!positive.test(text))return 'unknown';
 // Negation or an optional/separately sold feature is not positive evidence.
 const feature='(?:'+pattern+')';
 if(new RegExp('\\b(?:senza|non|not|cannot|optional|opzionale|non supporta|non compatibile|non include|non incluso|privo di|no|without|not included)\\b[a-z0-9 ]{0,26}'+feature,'i').test(text)||new RegExp(feature+'[a-z0-9 ]{0,22}\\b(?:non inclus|not included|not supported|opzional|optional|vendut[oaie] separat|sold separately)','i').test(text))return 'conflict';
 return 'supported_by_listing';
}
const explicitFeatures=[
 ['bluetooth','\\bbluetooth\\b','\\b(bluetooth|bt)\\b'],
 ['usb_c','\\b(usb|type) c\\b',connectionPatterns.usb_c],
 ['hdmi_arc','hdmi arc',connectionPatterns.hdmi_arc],
 ['magsafe','magsafe',connectionPatterns.magsafe],
 ['anc','\\banc\\b|cancellazione rumore attiva','\\banc\\b|cancellazione attiva|active noise cancell'],
 ['microfono','con microfono','microfono|microphone'],
 ['gps_integrato','gps integrato','gps integrato|built in gps|gps incorporato'],
 ['penna_inclusa','con (tastiera e )?penna','penna inclusa|include.{0,20}penna|con penna|stylus included'],
 ['tastiera_inclusa','con tastiera','tastiera inclusa|include.{0,20}tastiera|con tastiera|keyboard included'],
 ['power_delivery','power delivery','power delivery|\\bpd\\b'],
 ['ethernet','ethernet','ethernet|rj45'],
 ['layout_italiano','(layout italiano|bianca italiana)','layout italiano|qwerty italiano|tastiera italiana'],
 ['senza_display','senza (display|schermo)','senza display|senza schermo|screenless'],
 ['senza_pedali','senza pedali','senza pedali|balance bike'],
 ['alimentatore_incluso','con alimentatore','alimentatore incluso|con alimentatore|power supply included'],
 ['batteria','a batteria|ricaricabile','batteria|ricaricabile|rechargeable|battery'],
 ['5g','\\b5g\\b','\\b5g\\b'],
 ['sim','con sim','\\bsim\\b'],
 ['windows_11','windows 11','windows 11'],
 ['android','\\bandroid\\b','\\bandroid\\b'],
 ['impermeabilita','impermeabil','impermeabil|waterproof|\\bip[x0-9] ?[0-9]\\b']
];
export function checkProductRequirements(product,query){
 if(!query.lexicalTermIds?.length&&! [['culture','books'],['techGaming','tech'],['styleBeauty','skincare']].some(([a,s])=>query.area===a&&query.subId===s)){
  product={...product,title:PUBLIC_RULES.dictionaryTranslateTerms(product.title,query),features:PUBLIC_RULES.dictionaryTranslateTerms(product.features,query)};
  query={...query,keywords:PUBLIC_RULES.dictionaryTranslateTerms(query.keywords,query)};
 }
 if(!query.lexicalTermIds?.length&&[['culture','books'],['techGaming','tech'],['styleBeauty','skincare']].some(([a,s])=>query.area===a&&query.subId===s))product={...product,title:PUBLIC_RULES.pilotTranslateTerms(product.title),features:PUBLIC_RULES.pilotTranslateTerms(product.features)};
 const title=requirementText(product.title),text=title+' '+requirementText(product.features),s=requirementText(query.keywords),checks=[];
 const add=(key,status,label)=>checks.push({key,status,label});
 // A face covering for protection/sport/costumes is not a cosmetic mask.
 // Scope this to skincare so sport and costume searches remain unaffected.
 if(query.area==='styleBeauty'&&query.subId==='skincare'&&/\b(?:mascher\w*|masks?)\b/.test(title)&&/\b(?:airsoft|softair|paintball|tattic\w*|tactical|respirator\w*|ffp[123]|n95|carnevale|halloween|costume|saldatur\w*|welding)\b|rete (?:d )?acciaio|steel mesh/.test(title))add('cosmetic_mask_identity','conflict','Maschera protettiva o da costume, non skincare');
 // Explicit catalog attributes are requirements, not optional ranking hints.
 // Battery powered does not establish rechargeable; hand wash does not establish machine wash.
 const expandedAttributes=[
  ['rechargeable','ricaricabil|rechargeable','ricaricabil\\w*|rechargeable'],
  ['machine_washable','lavabil\\w* in lavatrice|machine washable','lavabil\\w* in lavatrice|machine washable'],
  ['washable','lavabil|washable','lavabil\\w*|washable'],
  ['folding','pieghevol|richiudibil|folding|foldable','pieghevol\\w*|richiudibil\\w*|folding|foldable'],
  ['adjustable','regolabil|adjustable','regolabil\\w*|adjustable'],
  ['wireless','wireless|senza fili','wireless|senza fili'],
  ['wood','\\b(?:in legno|wooden)\\b','\\b(?:in legno|wooden|legno massello|solid wood)\\b'],
  ['steel','\\b(?:acciaio inox|stainless steel)\\b','\\b(?:acciaio inox|stainless steel)\\b']
 ];
 if(!query.lexicalTermIds?.length&&! [['culture','books'],['techGaming','tech'],['styleBeauty','skincare']].some(([a,sub])=>query.area===a&&query.subId===sub))for(const [key,trigger,pattern] of expandedAttributes){
  if(new RegExp(trigger).test(s))add('expanded_'+key,listingState(text,pattern),key);
 }
 // Distinguish the requested device from furniture/accessories mentioning it.
 const original=requirementText(query.originalKeyword||query.keywords);
 const expected=requestedPrimaryType(query),actual=primaryProductType(product.title);
 if(expected)add('primary_object',actual===expected?'supported_by_listing':actual?'conflict':'unknown','Oggetto principale corrispondente alla ricerca');
 else if(['usb_hub','keyboard','graphics_tablet'].includes(actual))add('primary_object','conflict','Tipo principale non richiesto dalla ricerca; la compatibilità non identifica il prodotto');
 if(/\b(vinil\w*|dischi|records)\b/.test(original)&&! /decoraz|artigian|craft/.test(original)&&/\b(?:decorazion\w*|artigianato|craft\w*|non riproducibil\w*)\b/.test(text))add('record_use','conflict','Dischi per decorazione o artigianato, non ascolto');
 if(/^(notebook|computer portatile)\b/.test(original)){
  add('computer_type',/\b(notebook|laptop|computer portatile|pc portatile)\b/.test(title)?'supported_by_listing':'unknown','Computer portatile dichiarato come prodotto');
  if(/\b(scrivania|tavolino|supporto|stand|borsa|custodia|zaino|alimentatore|caricatore|batteria esterna|power bank)\b/.test(title))add('computer_accessory','conflict','Accessorio o supporto, non computer');
 }
 if(/^hub (usb|type) c\b/.test(original)&&/\b(sata|enclosure|bay|alloggiamenti|per dischi|hard disk docking)\b/.test(title))add('storage_dock','conflict','Stazione per dischi: tipo diverso dall’hub richiesto');
 if(/\b(sciarp\w*|foulard|scarf|scarves)\b/.test(original)&&! /giocoler|danza|ritmic|didattic/.test(original)&&/giocoler|juggling|danza|ritmic|asilo|scuola materna|kindergarten/.test(text))add('scarf_use','conflict','Accessorio per gioco o attività, non sciarpa di abbigliamento');
 if(/\b(bors\w*|shopper|tote|handbag)\b/.test(original)&&/\b(compostabil\w*|biodegradabil\w*|sacchetti monouso|buste (?:di carta|plastica)|shopping bags disposable)\b/.test(text))add('bag_use','conflict','Buste commerciali o monouso, non accessorio personale');
 if(/^(libr[oi]|romanzo|romanzi|narrativa|fumetti?|manga|enciclopedi\w*|ricettari\w*)\b/.test(original)){
  if(/\b(?:tiptoi|leapreader|tag reader)\b|(?:richiede|necessita|requires).{0,30}(?:penna|lettore|reader)/.test(text))add('interactive_book_device','unknown','Libro interattivo: dispositivo di lettura richiesto non verificato');
  if(!/gioco di ruolo|dungeons|dragons|role playing|\brpg\b|\bgdr\b/.test(original)&&(/dungeons.{0,10}dragons|gioco di ruolo|role playing/.test(title)&&/libro di avventure|manuale|campagna|campaign/.test(title)||/\b(rpg|gdr)\b/.test(title)))add('book_game_manual','conflict','Manuale per gioco di ruolo, non narrativa');
  if(!/scolastic|scuol|universit|profession|testo|studio|didattic/.test(original)&&/\b(scolastic\w*|scuole? superiori|scuola (?:primaria|secondaria|media)|scuole medie|per la scuola|triennio|biennio|libro di testo|testo universitario|alta professionalita|manuale professionale|manuale universitario|testo professionale|textbook)\b/.test(text))add('book_use','conflict','Testo di studio specialistico fuori dall’intento di lettura scelto');
  const bookAt=title.search(/\b(libr[oi]|e libro|ebook|romanzo|romanzi|manuale|ricettario|fumetti?|manga|enciclopedi\w*)\b/);
  // A provider classification cannot turn an explicitly named device into a
  // book. Keep books about devices when the title identifies a book/manual.
  if(actual&&bookAt<0)add('book_device_conflict','conflict','Il titolo identifica un dispositivo o accessorio, non un libro');
  const objectAt=title.search(/\b(vas[oi]|lampad\w*|decorazion\w*|kit|utensil\w*|beccucci|sac a poche|stampi|teglie?|tortier\w*|giradischi|robot|frullator\w*|macchina|supporto|leggio|custodia|cover|segnalibr[oi])\b/);
  if(objectAt>=0&&bookAt>objectAt)add('book_not_main_product','conflict','Il libro è incluso in un oggetto o kit, non è il prodotto principale');
  if(/\b(pagine (vuote|bianche)|da (scrivere|compilare|riempire)|blank (book|cookbook|journal)|quaderno di ricette|ricettario vuoto)\b/.test(text))add('blank_book','conflict','Quaderno da compilare, non libro con contenuti');
  const stationeryAt=title.search(/\b(?:scrapbook\w*|album fotografic\w*|photo album|libro degli ospiti|guest ?book)\b/);
  if(stationeryAt>=0&&!/\b(?:manuale|guida|guide|handbook|how to)\b/.test(title.slice(0,stationeryAt)))add('book_stationery','conflict','Album da comporre o libro degli ospiti, non lettura con contenuti');
 }
 if(query.area==='styleBeauty'&&query.subId==='skincare'&&/\b(?:mascher\w*|masks?)\b/.test(title)&&/\b(?:compatibil\w* con|compatible with|usat\w* con|usare con|use with)\b.{0,60}\b(?:dispositiv\w*|devices?|ufo)\b/.test(text)){
  const independent='(?:utilizzabil\\w*|usat\\w*|usare|applicabil\\w*) (?:anche )?senza (?:il |un |alcun )?dispositivo|(?:usable|use|apply) (?:also )?without (?:a |the |any )?device';
  add('skincare_device_usage',listingState(text,independent),'Uso senza dispositivo richiesto o compatibile da verificare');
 }

 for(const pattern of query.intentDecision?.titleMustMatch||[])add('intent_type',listingState(title,pattern),'Tipo di prodotto richiesto dalla qualificazione');
 for(const pattern of query.intentDecision?.titleMustNotMatch||[])if(new RegExp(pattern,'i').test(title))add('excluded_type','conflict','Tipo o intento escluso');
 for(const [key,trigger,pattern] of explicitFeatures)if(new RegExp(trigger,'i').test(s))add(key,['senza_display','senza_pedali'].includes(key)?(new RegExp(pattern,'i').test(text)?'supported_by_listing':'unknown'):listingState(text,pattern),key.replaceAll('_',' '));
 for(const match of s.matchAll(/\b(\d+(?: \d+)?)\s*(mah|gb|tb|w|pollici|metri)\b/g)){
  const [,value,unit]=match;const unitPattern={mah:'mah',gb:'gb',tb:'tb',w:'w|watt',pollici:'pollici|inch',metri:'metri|m'}[unit];
  add('dimension_'+value+'_'+unit,listingState(text,'\\b'+value+' ?(?:'+unitPattern+')\\b'),value+' '+unit);
 }
 const context=normalizeRecipientContext(query.recipientContext);
 const recipientChecks=queryContextChecks(query,context);
 // A secondary query cannot erase a known device's connection requirement.
 // Keep the existing smart-speaker exception for a standalone network product.
 if(['powerbank','speaker','headphones','microphone'].includes(actual)&&! /\bsmart speaker\b/.test(title)&&!recipientChecks.some(c=>c.kind==='connection'))recipientChecks.push({kind:'connection',status:context.connections.length?'provided':'unknown',label:'Collegamento richiesto dal prodotto principale'});
 for(const c of recipientChecks){
  if(c.status==='unknown'){add('recipient_'+c.kind,'unknown',c.label);continue;}
  if(c.kind==='device_model'){
   const model=requirementText(context.deviceModel);
   add('device_model',model.length>=3?listingState(text,model.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')):'unknown','Modello dichiarato nella scheda');
  }
  if(c.kind==='connection'){
   const requested=Object.entries(connectionPatterns).filter(([key,pattern])=>new RegExp(pattern,'i').test(s)&&key!=='usb_a').map(([key])=>key);
   const options=requested.length?requested:context.connections;
   const common=options.filter(k=>context.connections.includes(k));
   const statuses=common.map(k=>listingState(text,connectionPatterns[k]));
   add('recipient_connection',statuses.includes('supported_by_listing')?'supported_by_listing':statuses.includes('conflict')?'conflict':'unknown','Un collegamento comune esplicito tra dispositivo e prodotto');
  }
 }
 return {passed:checks.every(c=>c.status==='supported_by_listing'),checks,scope:'listing_text_only'};
}

// A declared minimum outside the chosen cohort is a hard conflict. Being inside
// the cohort is not certification for every age in that cohort.
function legacyMinimumAge(product){
 const text=String(product.title||'')+' '+String(product.features||'');
 const minima=[];
 const patterns=[
  /\b(?:dai?|dall[’']?|a partire da|eta minima|età minima|from|ages?)\s*(\d{1,2})(?:\s*(?:[-–]|a|ai|agli|to)\s*\d{1,2})?\s*\+?\s*(anni|years?|mesi|months?)\b/gi,
  /\b(?:bambin[ioae]|età|eta)\s+(?:di\s+)?(\d{1,2})\s*(anni|years?|mesi|months?)\b/gi,
  /\b(\d{1,2})\s*\+\s*(anni|years?|mesi|months?)\b/gi,
  /\b(?:age|ages|età|eta)\s*(\d{1,2})\s*\+(?!\d)/gi,
  /\b(?:not suitable for children under|non adatto ai bambini di eta inferiore a|non adatto a bambini di età inferiore a)\s*(\d{1,2})\s*(anni|years?|mesi|months?)\b/gi
 ];
 for(const pattern of patterns)for(const m of text.matchAll(pattern))minima.push(Number(m[1])/(/mesi|months?/i.test(m[2]||'')?12:1));
 return minima.length?Math.max(...minima):null;
}
export function declaredAgeRange(product){
 const text=String(product.title||'')+' '+String(product.features||'');
 const unit='(?:anni|years?|mesi|months?)';
 const bounds=[];
 const months=(n,u)=>Number(n)*(/mesi|months?/i.test(u)?1:12);
 const ranges=new RegExp('\\b(\\d{1,2})\\s*('+unit+')?\\s*(?:[-–—]|a|ai|agli|to)\\s*(\\d{1,2})\\s*('+unit+')\\b','gi');
 for(const m of text.matchAll(ranges))bounds.push({min:months(m[1],m[2]||m[4]),max:months(m[3],m[4])});
 const min=legacyMinimumAge(product);if(min!==null)bounds.push({min:min*12,max:null});
 // Explicit age lists commonly used on children's book listings.
 for(const m of text.matchAll(/(?:bambin[ioae]|eta|età|ages?)\s+(?:di\s+)?((?:\d{1,2}(?:\s*[,/]\s*|\s+)){1,8}\d{1,2})\s*(anni|years?|mesi|months?)\b/gi)){
  const ages=m[1].match(/\d+/g).map(n=>months(n,m[2]));bounds.push({min:Math.min(...ages),max:Math.max(...ages)});
 }
 const minima=bounds.map(b=>b.min),maxima=bounds.filter(b=>b.max!==null).map(b=>b.max);
 const minimumMonths=minima.length?Math.max(...minima):null,maximumMonths=maxima.length?Math.min(...maxima):null;
 return {minimumMonths,maximumMonths,conflict:minimumMonths!==null&&maximumMonths!==null&&minimumMonths>maximumMonths};
}
export function declaredMinimumAge(product){const age=declaredAgeRange(product);return age.minimumMonths===null?null:age.minimumMonths/12;}
export function ageListingConflict(product,band){
 const max={earlyChild:6,child:12,teen:17}[band],minimum=declaredMinimumAge(product);
 return {conflict:max!==undefined&&minimum!==null&&minimum>max,minimumYears:minimum,cohortMax:max??null};
}
