import {pilotEventEvidence,PILOT_EVENT_RULES,PILOT_EVENT_FAMILIES} from './pilot-context.mjs';
import {pilotContextEvidence,PILOT_DICTIONARY_RULES,PILOT_QUERY_SOURCES} from './pilot-dictionary.mjs';
import {expandedContextEvidence,EXPANDED_RULES} from './expanded-context.mjs';
import {relaxUseContext} from './relax-use-context.mjs';
import {occasionUseContext} from './occasion-use-context.mjs';
const ALL_CONTEXT_RULES=[...PILOT_DICTIONARY_RULES,...EXPANDED_RULES];
// Editorial context, not measured search volumes. These modifiers guide search
// and break relevance ties; they never relax product or recipient constraints.
export const RELATION_CONTEXT=Object.freeze({
 partner:{term:'partner',hints:['memory'],pattern:/romantic|coppia|personalizz|ricord|album|foto/},
 friend:{term:'amico',hints:['together'],pattern:/amic|divert|umoris|gioco|party|condivid/},
 family:{term:'familiare',hints:['memory','care'],pattern:/famigli|ricord|album|foto|benessere|relax/},
 colleague:{term:'collega',hints:['practical','study'],pattern:/scrivania|ufficio|agenda|penna|taccuino|organizz|profession/},
 couple:{term:'coppia',hints:['together','home'],pattern:/coppia|per due|condivid|gioco|casa|cucin/}
});
export const OCCASION_CONTEXT=Object.freeze({
 birthday:{term:'compleanno',hints:['celebration'],pattern:/compleanno|birthday|auguri|festa/},
 anniversary:{term:'anniversario',hints:['memory'],pattern:/anniversario|romantic|ricord|album|personalizz/},
 christmas:{term:'Natale',hints:['celebration'],pattern:/natale|natalizi|christmas|cofanetto|confezione regalo/},
 thanks:{term:'ringraziamento',hints:['gratitude'],pattern:/grazie|ringrazi|pensiero|confezione regalo/},
 graduation:{term:'laurea',hints:['study'],pattern:/laurea|dottor|penna|agenda|studio|profession/},
 newhome:{term:'casa nuova',hints:['home'],pattern:/casa|arredo|cucin|tazza|teiera|piant|organizz/},
 wedding:{term:'matrimonio',hints:['home','together'],pattern:/matrimonio|sposi|coppia|per due|casa|condivid/},
 newbaby:{term:'neogenitori',hints:['care'],pattern:/neogenitor|genitori|nascita|battesimo|ricord|album|relax|benessere/},
 event:{term:'occasione speciale',hints:['celebration'],pattern:/occasione|speciale|regalo|confezione/}
});
const EFFECT_PATTERN={funny:/ironic|divert|umoris|comico|scherz|party|gioco/,useful:/organizz|scrivania|ufficio|supporto|agenda|borraccia|strument/,sentimental:/ricord|album|personalizz|foto|romantic/,elegant:/design|elegant|stilograf|pelle|cofanetto/,surprising:/creativ|costruzion|esperiment|puzzle|original|insolit/,relax:/relax|rilass|benessere|yoga|tisana|puzzle|lettura/};
export const EVENT_FIRST_OCCASIONS=Object.freeze(['wedding','newbaby','anniversary']);
// Bounded editorial search variants, not evidence about products. Each uses
// an already qualified family and keeps that family's listing requirements.
const ANNIVERSARY_SEARCHES={
 'books-anniversary':[
  {family:'narrativa',words:'romanzo amicizia ricordi',coupleWords:'romanzo amore ricordi',otherWords:'romanzo famiglia ricordi'},
  {family:'illustrati',words:'libri illustrati ricordi'}
 ],
 'tech-anniversary':[
  {family:'foto_ricordi',words:'cornice digitale foto ricordi'}
 ],
 'skincare-anniversary':[
  {family:'creme_viso',words:'set crema viso idratante'},
  {family:'maschere_viso',words:'set maschere viso routine'}
 ]
};
export function giftContext(profile={}){
 const relation=Object.hasOwn(RELATION_CONTEXT,profile.relation)?profile.relation:null;
 const originalOccasion=Object.hasOwn(OCCASION_CONTEXT,profile.occasion)?profile.occasion:null;
 const personal=profile.searchPriority==='personal'||(profile.isRefinement===true&&profile.refinementDirection==='personal');
 const occasion=personal?null:originalOccasion;
 const eventFirst=!personal&&EVENT_FIRST_OCCASIONS.includes(occasion)&&!(occasion==='newbaby'&&profile.ageRange==='child');
 const r=RELATION_CONTEXT[relation],o=OCCASION_CONTEXT[occasion];
 const babyTerm=occasion==='newbaby'?(profile.ageRange==='earlyChild'?'nascita':profile.ageRange==='child'?'comunione':o.term):o?.term;
 return {relation,occasion,originalOccasion,interests:profile.interests||[],searchPriority:personal?'personal':eventFirst?'event':'category',eventFirst,suffix:[(r||o)?'regalo':'',babyTerm,r?'per '+r.term:''].filter(Boolean).join(' '),hints:[...new Set([...(r?.hints||[]),...(o?.hints||[])])]};
}
export function contextPreference(product,context,effect){
 const text=String(product.title+' '+(product.features||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const matches=[];
 const matchesWords=pattern=>!!pattern&&new RegExp('\\b(?:'+pattern.source+')','i').test(text);
 const contextEvidence=pilotContextEvidence(product,context,effect)||expandedContextEvidence(product,context,effect);
 if(effect==='relax'&&contextEvidence&&['absent','partial'].includes(contextEvidence.effect.status)){
  const use=relaxUseContext(product);
  if(use&&contextEvidence.effect.status==='absent')contextEvidence.effect=use;
 }
 if(contextEvidence?contextEvidence.relation.status==='supported':matchesWords(RELATION_CONTEXT[context.relation]?.pattern))matches.push('recipient');
 const eventEvidence=context.eventFirst?(contextEvidence?.scope==='expanded'?contextEvidence.occasion:pilotEventEvidence(product,context)):null;
 if(context.eventFirst?eventEvidence.status==='supported':contextEvidence?contextEvidence.occasion.status==='supported':matchesWords(OCCASION_CONTEXT[context.occasion]?.pattern))matches.push('occasion');
 if(contextEvidence?contextEvidence.effect.status==='supported':matchesWords(EFFECT_PATTERN[effect]))matches.push('effect');
 const title=String(product.title||'').toLowerCase();
 const documentedAdvent=contextEvidence?.occasion.status==='supported'&&contextEvidence.occasion.rule==='skin-christmas-advent';
 const bulk=!documentedAdvent&&/\b(?:[1-9]\d{1,3})\s*(?:crem[ae]|penne|mini saponi|portachiavi|pezzi|pcs)\b/.test(title)&&/crem[ae]|penna a sfera|penne|portachiavi|saponi/.test(title);
 // In the pilot a generic gift-box claim must not bypass occasion evidence.
 const giftPack=!contextEvidence&&!!context.occasion&&/\b(astuccio regalo|confezione regalo|scatola regalo|cofanetto)\b/.test(text);
 const eventPriorityScore=context.eventFirst&&matches.includes('occasion')&&!bulk?1:0;
 const occasionUse=eventEvidence?.status!=='supported'&&!bulk?occasionUseContext(product,context):null;
 return {eventPriorityScore,eventEvidence,occasionUse,contextEvidence,score:matches.reduce((sum,m)=>sum+(m==='effect'?3:2),0)+(giftPack?2:0)-(bulk?6:0),matches};
}
export function contextualizeQueries(queries,context,{refinement=false,effect='any'}={}){
 // Reserve a context search for every selected area, then original qualified
 // product searches. Base searches recover sparse occasion-specific results.
 const contextual=[],areas=new Set();
 // Event-first ranking needs event-first retrieval. Reserve a qualified query
 // per selected scope; search words never become evidence about a listing.
 const eventQueries=[],eventAlternatives=[];
 if(context.eventFirst){
  const eventTerms={
   'books-wedding':'ricette ricordi per due',
   'books-newbaby':'guida neogenitori',
   'books-anniversary':'ricordi coppia anniversario',
   'tech-wedding':'musica cinema foto condivisi coppia',
   'tech-newbaby':'lettura notturna mani libere neogenitori',
   'tech-anniversary':'foto ricordi coppia anniversario',
   'skincare-wedding':'set routine per due',
   'skincare-newbaby':'cura personale neogenitori',
   'skincare-anniversary':'set routine condivisa coppia'
  };
  for(const rule of PILOT_EVENT_RULES.filter(r=>r.event===context.occasion)){
   if(ANNIVERSARY_SEARCHES[rule.id]){
    const variants=ANNIVERSARY_SEARCHES[rule.id].flatMap((variant,index)=>{
     const base=queries.find(q=>q.area===rule.area&&q.subId===rule.sub&&q.family===variant.family);
     const words=['partner','couple'].includes(context.relation)?variant.coupleWords||variant.words:context.relation==='friend'?variant.words:variant.otherWords||variant.words;
     return base?[{...base,id:base.id+'-event-'+index,searchKeywords:words,contextual:true,contextRule:rule.id,eventTargeted:true}]:[];
    });
    if(variants.length){eventQueries.push(variants[0]);eventAlternatives.push(...variants.slice(1));}
    continue;
   }
   const q=queries.find(q=>(q.associations||[q]).some(a=>a.area===rule.area&&a.subId===rule.sub&&PILOT_EVENT_FAMILIES[rule.id].includes(a.family)));
   if(q)eventQueries.push({...q,id:q.id+'-event',searchKeywords:[q.keywords,eventTerms[rule.id],context.suffix].filter(Boolean).join(' '),contextual:true,contextRule:rule.id,eventTargeted:true});
  }
  for(const rule of ALL_CONTEXT_RULES.filter(r=>r.signal==='occasion'&&r.values.includes(context.occasion))){
   if(eventQueries.some(q=>q.area===rule.area&&q.subId===rule.subId))continue;
   const q=queries.find(q=>(q.associations||[q]).some(a=>a.area===rule.area&&a.subId===rule.subId&&rule.families.includes(a.family)));
   if(q)eventQueries.push({...q,id:q.id+'-event',searchKeywords:[q.keywords,rule.query,context.suffix].filter(Boolean).join(' '),contextual:true,contextRule:rule.id,eventTargeted:true});
  }
 }
 const modifier=refinement?{funny:'divertente',useful:'utile',sentimental:'personalizzato',elegant:'elegante',surprising:'originale',relax:'relax'}[effect]:'';
 const applicable = q => ALL_CONTEXT_RULES.filter(rule =>
  rule.signal!=='occasion'&&rule.values.includes(rule.signal==='relation'?context.relation:effect) &&
  (q.associations||[q]).some(a=>a.area===rule.area&&a.subId===rule.subId&&rule.families.includes(a.family)));
 for(const first of queries){
  if(areas.has(first.area))continue;areas.add(first.area);
  // Choose only from qualified queries; never reintroduce an incompatible family.
  const candidates=queries.filter(q=>q.area===first.area);
  const qualified=candidates.find(q=>applicable(q).some(r=>r.signal==='effect'))||(!context.eventFirst&&candidates.find(q=>applicable(q).length));
  const q=qualified||first;
  const rule=qualified&&applicable(q).sort((a,b)=>(a.signal==='effect'?-1:1)-(b.signal==='effect'?-1:1))[0];
  const styleFits=effect!=='funny'||/culture|games|media|creative|characters|music/i.test(q.area);
  const searchKeywords=rule?[q.keywords,rule.query,context.suffix].filter(Boolean).join(' '):[q.keywords,styleFits?modifier:'',context.suffix].filter(Boolean).join(' ');
  if(searchKeywords!==q.keywords&&(!context.eventFirst||rule))contextual.push({...q,id:q.id+'-context',searchKeywords,contextual:true,...(rule?{contextRule:rule.id,lexicalSource:PILOT_QUERY_SOURCES[rule.id]||null}:{} )});
 }
 const occasions=[];
 if(!context.eventFirst&&context.occasion){
  for(const area of areas){
   const pair=queries.filter(q=>q.area===area).map(q=>({q,rule:ALL_CONTEXT_RULES.find(r=>r.signal==='occasion'&&r.values.includes(context.occasion)&&(q.associations||[q]).some(a=>a.area===r.area&&a.subId===r.subId&&r.families.includes(a.family)))})).find(x=>x.rule);
   if(pair){const {q,rule}=pair;occasions.push({...q,id:q.id+'-occasion',searchKeywords:[q.keywords,rule.query,context.suffix].filter(Boolean).join(' '),contextual:true,contextRule:rule.id});}
  }
 }
 return [...eventQueries,...eventAlternatives,...contextual,...occasions,...queries];
}
