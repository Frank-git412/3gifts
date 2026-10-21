import {PUBLIC_RULES} from './public-rules.mjs';
import {TECHNOLOGY_KEYWORDS,TECHNOLOGY_RESEARCH_NOTE} from './technology-keywords.mjs';
export const DICTIONARY = {
 reading:{label:'Lettura',terms:[['avventura','romanzo avventura'],['romantico','romanzo romantico'],['novel','romanzo contemporaneo'],['accessori','accessori lettura']]},
 skincare:{label:'Skincare',terms:[['siero','siero viso'],['crema','crema viso'],['maschera','maschera viso']]},
 technology:{label:'Tecnologia',terms:Object.entries(TECHNOLOGY_KEYWORDS.default)},
 relax:{label:'Relax',terms:[['calma','rilassante'],['pace','benessere'],['vacanza','viaggio']]}
};
export const PRESETS = [
 {label:'Il tuo esempio',age:'adult',sex:'any',min:30,max:60,terms:{reading:['avventura','romantico'],skincare:['siero','maschera'],relax:['calma','vacanza']},exclude:''},
 {label:'Tecnologia · 500 €',age:'adult',sex:'any',min:0,max:500,terms:{technology:['audio','lettore','viaggio'],relax:['calma']},exclude:''},
 {label:'Bambini · 7–12',age:'child',sex:'any',min:15,max:40,terms:{reading:['avventura'],relax:['vacanza']},exclude:''},
 {label:'Skincare · esclusioni',age:'adult',sex:'any',min:30,max:60,terms:{skincare:['siero','crema','maschera'],relax:['calma']},exclude:'profumo, retinolo'}
];
export function normalizeProfile(raw){
 const min=Number(raw.min),max=Number(raw.max);
 if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<15||max>500||min>max||min%5||max%5)throw Error('Indica una fascia tra 0 e 500 €, a passi di 5 €, con massimo almeno 15 €.');
 const age=['adult','teen','child','earlyChild'].includes(raw.age)?raw.age:'adult';
 const sex=['any','women','men'].includes(raw.sex)?raw.sex:'any';
 const terms={};for(const [key,d]of Object.entries(DICTIONARY)){const allowed=d.terms.map(t=>t[0]);terms[key]=[...new Set((Array.isArray(raw.terms?.[key])?raw.terms[key]:[]).filter(t=>allowed.includes(t)))];}
 if(!Object.values(terms).some(t=>t.length))throw Error('Seleziona almeno una parola.');
 const exclude=String(raw.exclude||'').slice(0,200).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,10);
 return {age,sex,min,max,terms,exclude,premium:raw.premium!==false,effectiveMin:raw.premium!==false&&max>=150?Math.max(min,max*.5):min};
}
const ageSuffix={adult:'',teen:'per ragazzi 13 17 anni',child:'per bambini 7 12 anni',earlyChild:'per bambini 0 6 anni'};
export function planSearch(raw,options={}){
 const p=normalizeProfile(raw),queries=[],warnings=[],seen=new Set();
 function add(text,area,from,kind='mirata'){
  const excluded=p.exclude.some(e=>text.toLowerCase().includes(e));if(excluded)return;
  const keyword=[text,ageSuffix[p.age]].filter(Boolean).join(' ');
  if(seen.has(keyword))return;seen.add(keyword);
  const url=new URL('https://www.amazon.it/s');url.searchParams.set('k',keyword);
  queries.push({id:'q'+queries.length,keywords:keyword,area,from,kind,searchIndex:'All',url:url.href,min:p.effectiveMin,max:p.max});
 }
 const selected=k=>DICTIONARY[k].terms.filter(([id])=>p.terms[k].includes(id));
 for(const area of ['reading','skincare','technology']){
  if(area==='skincare'&&p.age!=='adult'){if(p.terms.skincare.length)warnings.push('Skincare sospesa per i minori: il pilota non verifica ancora indicazioni d’età e ingredienti.');continue;}
  if(area==='technology'&&p.age==='earlyChild'){if(p.terms.technology.length)warnings.push('Tecnologia sospesa per la fascia 0–6: serve una selezione specifica per età.');continue;}
  for(const [id,base]of selected(area)){
   let text=base;if(area==='reading'&&p.age!=='adult'&&id!=='accessori')text=id==='avventura'?'libro avventura':id==='romantico'?'libro amicizia':'libro narrativa';
   add(text,area,[DICTIONARY[area].label,id]);
   for(const [effect]of selected('relax')){
    let crossed;
    if(area==='reading')crossed=id==='accessori'?(effect==='vacanza'?'supporto libro da viaggio':'lampada lettura luce calda'):(effect==='vacanza'?text+' vacanze':text+' lettura leggera');
    if(area==='skincare')crossed=effect==='vacanza'?text+' formato viaggio':id==='maschera'?'set maschere viso relax':text+' cofanetto regalo';
    if(area==='technology')crossed=TECHNOLOGY_KEYWORDS[effect==='vacanza'?'travel':'relax'][id];
    add(crossed,area,[DICTIONARY[area].label,id,'Relax',effect],'incrocio');
   }
  }
 }
 if(p.age==='adult'&&p.terms.reading.length&&p.terms.skincare.length)add('cofanetto regalo libro '+(p.terms.skincare.includes('maschera')?'maschere viso':p.terms.skincare.includes('crema')?'crema viso':'siero viso')+(p.terms.relax.length?' relax':''),'bridge',['Lettura','Skincare',...(p.terms.relax.length?['Relax']:[])],'esplorativa');
 if(!['reading','skincare','technology'].some(k=>p.terms[k].length))for(const [id]of selected('relax'))add(id==='vacanza'?'cuscino viaggio':id==='calma'?'libro esercizi rilassamento':'libro benessere','relax',['Relax',id]);
 if(p.age!=='adult')warnings.push('Le parole d’età orientano la ricerca. Ogni prodotto resta da controllare: il motore non certifica l’idoneità ai minori.');
 if(p.sex!=='any')warnings.push('La preferenza destinatario resta un controllo sulle varianti; non modifica automaticamente generi letterari o interessi.');
 if(p.exclude.length)warnings.push('Le esclusioni sono controllate sul testo disponibile; ingredienti, sinonimi e caratteristiche non dichiarate richiedono verifica.');
 // Round-robin preserves each selected interest within the bounded request budget.
 const areas=[...new Set(queries.filter(q=>q.area!=='bridge').map(q=>q.area))],ordered=[];
 const groups=areas.map(a=>queries.filter(q=>q.area===a).sort((a,b)=>(a.kind==='mirata')-(b.kind==='mirata')));
 while(groups.some(g=>g.length))for(const g of groups)if(g.length)ordered.push(g.shift());
 const bridges=queries.filter(q=>q.area==='bridge');
 const limit=Number.isInteger(options.limit)?Math.max(1,Math.min(60,options.limit)):18;
 return {profile:p,queries:[...ordered.slice(0,limit-bridges.length),...bridges],warnings,generated:queries.length,popularity:p.terms.technology.length?TECHNOLOGY_RESEARCH_NOTE:'Non misurata: dizionario editoriale, senza volumi di ricerca.'};
}
export function normalizeCandidates(data,query,profile,diagnostics=null){
 const out=[];
 for(const [rowIndex,item] of (data.searchResult?.items||[]).entries()){
  const decision=(status,reason)=>diagnostics?.push({queryId:query.id,rowIndex,asin:/^[A-Z0-9]{10}$/.test(item.asin||'')?item.asin:null,stage:'normalization',status,reason});
  const title=item.itemInfo?.title?.displayValue||'',features=item.itemInfo?.features?.displayValues||[];
  const text=[title,...features].join(' ').toLowerCase();
  if(!title){decision('rejected','missing_title');continue;}
  if(!/^[A-Z0-9]{10}$/.test(item.asin||'')){decision('rejected','invalid_asin');continue;}
  if(profile.exclude.some(x=>text.includes(x))){decision('rejected','explicit_exclusion');continue;}
  // An explicit adult-only flag excludes a result for minors. Its absence or
  // false value does not certify suitability for any particular child's age.
  if(profile.age!=='adult'&&item.itemInfo?.productInfo?.isAdultProduct?.displayValue===true){decision('rejected','adult_only');continue;}
  let url;try{url=new URL(item.detailPageURL);if(url.protocol!=='https:'||url.hostname!=='www.amazon.it'||url.username||url.password){decision('rejected','invalid_marketplace_url');continue;}}catch{decision('rejected','invalid_marketplace_url');continue;}
  const offers=(item.offersV2?.listings||[]).filter(l=>!l.violatesMAP&&l.price?.money?.currency==='EUR'&&Number(l.price.money.amount)>=profile.effectiveMin&&Number(l.price.money.amount)<=profile.max&&['INSTOCK','INSTOCKSCARCE'].includes(String(l.availability?.type||'').replaceAll('_','').toUpperCase()));
  const offer=offers.find(l=>l.isBuyBoxWinner)||offers[0];if(!offer){decision('rejected','no_eligible_offer');continue;}
  const amount=Number(offer.price.money.amount);if(!Number.isFinite(amount)||amount<=0){decision('rejected','invalid_price');continue;}
  const info=item.itemInfo||{};
  const bookMetadata={authors:(info.byLineInfo?.contributors||[]).filter(c=>/^(?:author|autore|autrice)$/i.test(c.roleType||c.role||'')).map(c=>String(c.name||'')).filter(Boolean),isbns:[...(info.externalIds?.isbns?.displayValues||[]),...(info.externalIds?.eans?.displayValues||[])].map(PUBLIC_RULES.validBookISBN).filter(Boolean),binding:String(info.classifications?.binding?.displayValue||''),edition:String(info.contentInfo?.edition?.displayValue||''),language:(info.contentInfo?.languages?.displayValues||[]).filter(l=>/^(?:published|pubblicato|pubblicata)$/i.test(l.type||'')).map(l=>String(l.displayValue||'')).join(', ')};
  if(!PUBLIC_RULES.recipientEligible({title,features:features.join(' ')},{recipientPreference:profile.sex})){decision('rejected','recipient');continue;}
  let image=null;try{const candidate=new URL(item.images?.primary?.medium?.url);if(candidate.protocol==='https:'&&['m.media-amazon.com','images-eu.ssl-images-amazon.com','images-na.ssl-images-amazon.com'].includes(candidate.hostname)&&!candidate.username&&!candidate.password)image=candidate.href;}catch{}
  out.push({asin:item.asin,parentAsin:/^[A-Z0-9]{10}$/.test(item.parentASIN||'')?item.parentASIN:null,title,bookMetadata,productGroup:String(item.itemInfo?.classifications?.productGroup?.displayValue||''),features:features.join('. '),price:amount,url:url.href,image,areas:[query.area],queries:[query.keywords],researchQueryIds:query.keywordId?[query.id]:[],status:'Da valutare',checks:['Pertinenza del prodotto',...(profile.age!=='adult'?['Idoneità per età']:[]),...(profile.exclude.length?['Esclusioni e ingredienti']:[]),'Variante e prezzo finale']});
  decision('normalized','eligible_offer_and_listing');
 }
 return out;
}
export function mergeCandidates(groups){const map=new Map();for(const p of groups.flat()){const old=map.get(p.asin);if(old){old.areas=[...new Set([...old.areas,...p.areas])];old.queries=[...new Set([...old.queries,...p.queries])];old.researchQueryIds=[...new Set([...(old.researchQueryIds||[]),...(p.researchQueryIds||[])])];}else map.set(p.asin,{...p});}return [...map.values()];}
