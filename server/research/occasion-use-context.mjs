// Editorial possibilities, not listing claims about an occasion or a person.
// Half credit only. Never satisfies eligibility, compatibility or event priority.
const occasionUseNorm=s=>String(Array.isArray(s)?s.join('. '):s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function occasionUseContext(product,context){
 if(!context.eventFirst||context.occasion!=='anniversary')return null;
 const title=occasionUseNorm(product.title),tags=product.tags||[];
 const relationship=['partner','couple'].includes(context.relation)?'couple':context.relation==='friend'?'friend':'other';
 const rules=[
  {id:'anniversary-film-viewing',area:'techGaming',sub:'tech',family:'techGaming:cinema',title:/\b(?:proiettore|videoproiettore|projector)\b/,patterns:[/\b(?:film|movies|cinema|home theater)\b/,/\b(?:casa|home|salotto|living room)\b/],property:'Possibile occasione per guardare un film a casa'},
  {id:'anniversary-photo-display',area:'techGaming',sub:'tech',family:'techGaming:foto_ricordi',title:/\b(?:cornice digitale|digital photo frame)\b/,patterns:[/\b(?:foto|fotografie|photos|photographs)\b/,/\b(?:visualizz\w*|mostra\w*|display\w*|slideshow|presentazione|riprodu\w*)\b/],property:'Possibile uso per mostrare fotografie e ricordi personali'},
  {id:'anniversary-care-set',area:'styleBeauty',sub:'skincare',title:/\b(?:crem[ae]|sier[oi]|mascher[ae]|skincare|skin care|cream|serum|mask)\b/,patterns:[/\b(?:set|kit|cofanetto|gift set)\b/,/\b(?:routine|applicazione|applicare|apply|application|idrat\w*|moisturi\w*)\b/],property:'Possibile pensiero di cura personale in un set'},
  {id:'anniversary-shared-stories',area:'culture',sub:'books',title:/\b(?:romanzo|racconti|libro|novel|stories|book)\b/,patterns:[/\b(?:ricordi|memorie|memories|reminisc\w*)\b/,relationship==='friend'?/\b(?:amicizia|amici|friendship|friends)\b/:relationship==='couple'?/\b(?:coppia|amore|couple|love)\b/:/\b(?:famiglia|family|amicizia|friendship)\b/],property:'Possibile lettura sul ricordo di una relazione'}
 ];
 for(const rule of rules){
  if(!tags.includes(rule.area)||!tags.includes(rule.sub)||!rule.title.test(title)||rule.family&&product.conceptFamily!==rule.family)continue;
  const evidence=[];let conflict=false;
  for(const pattern of rule.patterns){
   const found=[];
   for(const [field,value] of [['title',product.title],['features',product.features]]){
    const text=occasionUseNorm(value);
    for(const match of text.matchAll(new RegExp(pattern.source,'g'))){
     const before=text.slice(0,match.index).split(/[.;!?\n]/).at(-1),after=text.slice(match.index+match[0].length).split(/[.;!?\n]/)[0];
     if(/\b(?:non|no|not|senza|without|optional|opzionale|variante|variant|se|if)\b/.test(before)||/^\s*(?:non|not|optional|opzionale|sold separately|vendut[oa] separat\w*)\b/.test(after))conflict=true;
     else found.push({field,matched:match[0],status:'supported'});
    }
   }
   if(!found.length)conflict=true;
   evidence.push(...found);
  }
  if(!conflict&&evidence.length)return {status:'partial',rule:rule.id,property:rule.property,evidence,source:'editorial_possible_use_from_listing',claim:'possible_use_not_occasion_evidence',humanValidated:false};
 }
 return null;
}
