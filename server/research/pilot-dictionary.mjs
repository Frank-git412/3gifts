import {RESEARCH_CATALOG} from './catalog-data.mjs';
import {PILOT_EXPANSION_RULES} from './pilot-expansion.mjs';
import {PILOT_CLOSURE_RULES} from './pilot-closure-rules.mjs';
import {PILOT_BILINGUAL_LEXICON} from './pilot-lexicon-data.mjs';
import {PILOT_EVENT_RULES,PILOT_EVENT_FAMILIES} from './pilot-context.mjs';
import {PILOT_FAMILY_REVIEWS} from './pilot-family-reviews.mjs';

// M3 dictionary; second block connects qualified contextual queries. Editorial associations, not measured demand or verified offers.
export const PILOT_DICTIONARY_VERSION='20261009-m3-closure';
// Reviewed aliases point to existing associations: no extra family or API query.
export const PILOT_LEXICAL_ALIASES=Object.freeze([
 {termId:'M3-K005',canonicalId:'culture:books:kw_d49eeaab5847',it:'romanzo di avventura',en:'adventure novel'},
 {termId:'M3-K006',canonicalId:'culture:books:kw_ac451ad1204b',it:'luce lettura con clip',en:'clip-on reading light'},
 {termId:'M3-K008',canonicalId:'culture:books:kw_7c06874214c4',it:'luce lettura ricaricabile USB',en:'USB rechargeable reading light'},
 {termId:'M3-K024',canonicalId:'techGaming:tech:kw_3508321dc38d',it:'hub USB-C Ethernet',en:'USB-C Ethernet hub'}
]);
export const pilotAliasesFor=id=>PILOT_LEXICAL_ALIASES.filter(a=>a.canonicalId===id);
export const PILOT_PAIRS=Object.freeze([['culture','books'],['techGaming','tech'],['styleBeauty','skincare']]);
const pilotRule=(id,area,subId,families,signal,values,titlePattern,properties,query,examples,extra={})=>Object.freeze({
 id,area,subId,families,signal,values,titlePattern,properties,query,examples,
 source:'M2 v3 / editorial mapping 2026-10-09',verification:'synthetic_examples_only',
 recipient:'Declared interests only; no inferred gender, age, condition or donor preference',
 incompatibilities:['Existing budget, exclusions, age and compatibility filters remain mandatory'],...extra
});
export const PILOT_DICTIONARY_RULES=Object.freeze([
 pilotRule('books-friend-content','culture','books',['narrativa'],'relation',['friend'],/\b(romanzo|novel)\b/,
  [/\b(amicizia|friendship)\b/],'amicizia',
  {it:'Romanzo che racconta una storia di amicizia',en:'Novel about a story of friendship',negative:'Romanzo regalo per amico'},
  {property:'Il contenuto tratta esplicitamente un legame di amicizia'}),
 pilotRule('books-couple-recipes','culture','books',['libri_cucina'],'relation',['partner','couple'],/\b(libro|ricettario|cookbook|book)\b/,
  [/\b(ricette|cucina|recipes|cooking)\b/,/\b(per due|in coppia|for two|as a couple)\b/],'ricette per due',
  {it:'Libro di cucina con ricette per due',en:'Cookbook with recipes for two',negative:'Libro di cucina regalo romantico'},
  {property:'Ricette pensate per cucinare in due'}),
 pilotRule('books-funny-content','culture','books',['narrativa','romance','narrativa_storica','fantasy','gialli','thriller','fantascienza','avventura','horror','poesia','filosofia','storia','biografie','psicologia','letteratura_viaggio','libri_fotografia','libri_cucina','illustrati','divulgazione_scientifica'],'effect',['funny'],/\b(romanz[oi]|novels?|libr[oi]|books?)\b/,
  [/\b(umoristic\w*|comico|comic novel|humorous|humou?r)\b/],'umoristico divertente',
  {it:'Romanzo umoristico',en:'Humorous novel',negative:'Romanzo regalo divertente per amico'},
  {property:'Contenuto umoristico dichiarato'}),
 pilotRule('books-useful-light','culture','books',['illuminazione_lettura'],'effect',['useful'],/\b(lampada|luce|lamp|light)\b/,
  [/\b(lettura|reading)\b/,/\b(regolabile|adjustable|dimmable)\b/],'lettura regolabile',
  {it:'Lampada lettura con luminosità regolabile',en:'Reading lamp with adjustable brightness',negative:'Lampada regalo utile per lettori'},
  {property:'Luce da lettura regolabile'}),
 pilotRule('tech-colleague-calls','techGaming','tech',['audio'],'relation',['colleague'],/\b(cuffie|auricolari|headset|headphones|earbuds)\b/,
  [/\b(microfono|microphone)\b/,/\b(videochiamate|riunioni|conference calls|meetings|video calls)\b/],'microfono videochiamate',
  {it:'Cuffie con microfono per videochiamate',en:'Headset with microphone for conference calls',negative:'Cuffie regalo per collega'},
  {property:'Microfono e uso nelle chiamate documentati'}),
 pilotRule('tech-couple-cinema','techGaming','tech',['cinema'],'relation',['partner','couple'],/\b(proiettore|projector)\b/,
  [/\b(film|cinema|movies)\b/,/\b(per due|condivis\w*|for two|shared)\b/],'cinema condiviso',
  {it:'Proiettore cinema per due',en:'Projector for shared movies',negative:'Proiettore regalo romantico'},
  {property:'Fruizione condivisa di film descritta'}),
 pilotRule('tech-sentimental-photos','techGaming','tech',['foto_ricordi'],'effect',['sentimental'],/\b(cornice digitale|digital photo frame)\b/,
  [/\b(carica\w*|upload\w*|importa\w*)\b/,/\b(foto personali|proprie foto|personal photos|own photos)\b/],'caricamento foto personali',
  {it:'Cornice digitale per caricare le proprie foto',en:'Digital photo frame to upload personal photos',negative:'Cornice digitale regalo emozionante'},
  {property:'Caricamento delle proprie fotografie'}),
 pilotRule('tech-useful-powerbank','techGaming','tech',['ricarica'],'effect',['useful'],/\b(power ?bank|batteria portatile|portable battery)\b/,
  [/\b(ricaric\w*|recharg\w*|charging)\b/,/\b(usb c|usb-c|usb a|usb-a)\b/],'ricarica USB-C',
  {it:'Power bank per ricaricare tramite USB-C',en:'Power bank for recharging via USB-C',negative:'Power bank regalo utile'},
  {property:'Funzione di ricarica e connessione dichiarate; compatibilità da verificare'}),
 pilotRule('skin-shared-routine','styleBeauty','skincare',['creme_viso','creme_idratanti','sieri_viso'],'relation',['partner','couple'],/\b(set|kit)\b.*\b(skincare|skin care|viso|face)\b/,
  [/\b(routine)\b/,/\b(per due|condivis\w*|for two|shared)\b/],'routine condivisa per due',
  {it:'Set skincare routine condivisa per due',en:'Skincare set face routine shared for two',negative:'Set skincare confezione romantica'},
  {property:'Routine espressamente proposta come condivisibile'}),
 pilotRule('skin-friend-masks','styleBeauty','skincare',['maschere_viso'],'relation',['friend'],/\b(maschere viso|face masks)\b/,
  [/\b(due|two|duo)\b/,/\b(condivis\w*|da condividere|shared|to share)\b/],'duo da condividere',
  {it:'Due maschere viso da condividere',en:'Two face masks to share',negative:'Maschere viso regalo amica'},
  {property:'Due maschere individuali destinate a un uso condiviso'}),
 pilotRule('skin-useful-daily','styleBeauty','skincare',['creme_viso','creme_idratanti','creme_mani'],'effect',['useful'],/\b(crema|cream)\b/,
  [/\b(mani|viso|hand|face)\b/,/\b(idratant\w*|moisturiz\w*|moisturis\w*)\b/,/\b(quotidian\w*|daily|ogni giorno)\b/],'idratante uso quotidiano',
  {it:'Crema mani idratante per uso quotidiano',en:'Moisturizing hand cream for daily use',negative:'Crema mani utile regalo'},
  {property:'Formato e uso quotidiano idratante dichiarati, senza promessa clinica'}),
 pilotRule('skin-elegant-packaging','styleBeauty','skincare',['sieri_viso'],'effect',['elegant'],/\b(siero|serum)\b/,
  [/\b(flacone|bottle)\b/,/\b(vetro satinato|frosted glass)\b/],'flacone vetro satinato',
  {it:'Siero viso in flacone di vetro satinato',en:'Face serum in a frosted glass bottle',negative:'Siero elegante lusso premium'},
  {property:'Finitura in vetro satinato dichiarata, senza usare il prezzo come prova'}),
 ...PILOT_EXPANSION_RULES,...PILOT_CLOSURE_RULES
]);

export const PILOT_QUERY_SOURCES=Object.freeze({"books-funny-content": {"termId": "M3-K001", "term": "romanzo umoristico", "url": "https://iperborea.com/titolo/350/lanno-della-lepre/"}, "books-friend-content": {"termId": "M3-K002", "term": "romanzo amicizia", "url": "https://iperborea.com/titolo/350/lanno-della-lepre/"}, "books-useful-light": {"termId": "M3-K007", "term": "lampada lettura luminosità regolabile", "url": "https://www.legami.com/it-it/luce-led-da-lettura-VLEDMR0001.html"}, "tech-colleague-calls": {"termId": "M3-K018", "term": "cuffie per videochiamate", "url": "https://www.logitech.com/it-it/products/headsets/h570e-usb-noise-cancelling.981-000575.html"}, "tech-family-photos": {"termId":"M3-K021","term":"cornice digitale condivisione famiglia","url":"https://support.frameo.com/hc/en-us/articles/360021691160--How-to-Connect-Phone-to-a-Frame"}});

const pilotNormalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function pilotProductScope(product){
 const tags=product.tags||[];
 return PILOT_PAIRS.filter(([area,sub])=>tags.includes(area)&&tags.includes(sub));
}
// Each match records a listing field; search words and user notes never enter here.
export function pilotContextEvidence(product,context,effect){
 const pairs=pilotProductScope(product);
 if(!pairs.length)return null;
 const fields=[['title',pilotNormalize(product.title)],['features',pilotNormalize(product.features)]];
 const result={version:PILOT_DICTIONARY_VERSION,relation:{status:'absent',evidence:[]},effect:{status:'absent',evidence:[]},occasion:{status:'absent',evidence:[]}};
 for(const signal of ['relation','effect','occasion']){
  const value=signal==='relation'?context.relation:signal==='occasion'?context.occasion:effect;
  const rules=PILOT_DICTIONARY_RULES.filter(r=>r.signal===signal&&r.values.includes(value)&&pairs.some(([a,s])=>a===r.area&&s===r.subId));
  const candidates=[];
  for(const rule of rules){
   if(product.conceptFamily&&!rule.families.some(f=>product.conceptFamily===rule.area+':'+f))continue;
   if(!rule.titlePattern.test(fields[0][1]))continue;
   const evidence=[];let contradicted=false;
   for(const pattern of rule.properties){
    let found=false;
    for(const [field,text] of fields){
     for(const match of text.matchAll(new RegExp(pattern.source,'g'))){
      // Conservative clause-local negation; uncertain descriptions receive no bonus.
      const before=text.slice(0,match.index).split(/[.;!?\n]/).at(-1).replace(/\b(senza risciacquo|no rinse required|no-rinse|rinse-free)\b/g,'');
      const after=text.slice(match.index+match[0].length).split(/[.;!?\n]/)[0];
      const negated=/\b(non|senza|nessun\w*|not|no|without|optional|opzionale|variante|variant|se|if)\b/.test(before)||/^\s*(?:non|not|optional|opzionale|sold separately|vendut[oa] separat\w*)\b/.test(after);
      if(negated)contradicted=true;
      else {found=true;evidence.push({field,property:rule.property,matched:match[0],rule:rule.id,status:'supported',asin:product.asin||null,parentAsin:product.parentAsin||null});}
     }
    }
    if(!found)evidence.push({rule:rule.id,property:rule.property,status:'absent'});
   }
   const status=contradicted?'contradictory':evidence.every(e=>e.status==='supported')?'supported':evidence.some(e=>e.status==='supported')?'partial':'absent';
   candidates.push({status,rule:rule.id,evidence});
  }
  result[signal]=candidates.find(x=>x.status==='supported')||candidates.find(x=>x.status==='contradictory')||candidates.find(x=>x.status==='partial')||{status:'absent',evidence:[]};
 }
 return result;
}

// Inventory preserves canonical keyword IDs and all existing query variants.
// A registered family is not a claim that every context or offer is covered.
export function pilotDictionaryInventory(){
 return PILOT_PAIRS.flatMap(([area,subId])=>{
  const rows=RESEARCH_CATALOG.associations.filter(k=>k.area===area&&k.subId===subId);
  return [...new Set(rows.map(k=>k.family))].map(family=>{
   const words=rows.filter(k=>k.family===family),rules=PILOT_DICTIONARY_RULES.filter(r=>r.area===area&&r.families.includes(family));
   return {id:`m3:${area}:${subId}:${family}`,area,subId,family,
    keywordIds:words.map(k=>k.id),synonymsIT:[...new Set(words.flatMap(k=>[k.keyword,...pilotAliasesFor(k.id).map(a=>a.it)]))],baseQueries:words.map(k=>k.queryKeywords),
    bilingualTerms:PILOT_BILINGUAL_LEXICON.filter(t=>words.some(w=>w.id===t.id)),
    synonymsEN:[...new Set(PILOT_BILINGUAL_LEXICON.filter(t=>words.some(w=>w.id===t.id)).flatMap(t=>[t.en,...t.aliasesEN]))],
    contextDecisions:pilotFamilyContextDecisions(area,subId,family),
    reviewedAliases:words.flatMap(k=>pilotAliasesFor(k.id)),
    contextualQueries:rules.map(r=>({rule:r.id,query:words[0].queryKeywords+' '+r.query})),
    properties:rules.map(r=>r.property),rules:rules.map(r=>r.id),
    relations:[...new Set(rules.filter(r=>r.signal==='relation').flatMap(r=>r.values))],
    effects:[...new Set(rules.filter(r=>r.signal==='effect').flatMap(r=>r.values))],
    occasions:[...new Set(rules.filter(r=>r.signal==='occasion').flatMap(r=>r.values))],
    incompatibilities:[...new Set(words.flatMap(k=>k.profileRequirements||[]))],
    diversityKey:area==='culture'&&subId==='books'?'work_or_series_for_books; function_for_accessories':area==='styleBeauty'?'function_and_application_area':'primary_function_and_parentASIN',
    source:'Existing RESEARCH_CATALOG + M2 v3; editorial mapping, not search volumes',
    verification:'m3_reviewed_with_conditional_or_neutral_decisions',
    familyReview:PILOT_FAMILY_REVIEWS[area+':'+family],
    gaps:['Commercial and real-offer validation M5 pending']};
  });
 });
}
export const PILOT_CONTEXT_AXES=Object.freeze({relation:['partner','friend','family','colleague','couple'],effect:['useful','sentimental','funny','surprising','elegant','relax'],occasion:['birthday','anniversary','christmas','thanks','graduation','newhome','wedding','newbaby','event']});
export function pilotFamilyContextDecisions(area,subId,family){
 const review=PILOT_FAMILY_REVIEWS[area+':'+family];
 if(!review)throw Error('Unreviewed pilot family: '+area+':'+family);
 return Object.entries(PILOT_CONTEXT_AXES).flatMap(([signal,values])=>values.map(value=>{
  const ordinary=PILOT_DICTIONARY_RULES.filter(r=>r.area===area&&r.subId===subId&&r.families.includes(family)&&r.signal===signal&&r.values.includes(value));
  const special=signal==='occasion'?PILOT_EVENT_RULES.filter(r=>r.area===area&&r.sub===subId&&r.event===value&&PILOT_EVENT_FAMILIES[r.id].includes(family)):[];
  return {signal,value,status:ordinary.length||special.length?'conditional_rule':'no_automatic_bonus',rules:[...ordinary,...special].map(r=>r.id),reason:ordinary.length||special.length?'Richiede la proprietà della singola scheda; parole di ricerca e sola destinazione regalo non sono prove.':review.neutralReason};
 }));
}
