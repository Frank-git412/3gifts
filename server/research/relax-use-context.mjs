// M5 editorial hypotheses for a requested moment of relaxation. These describe
// possible uses of an eligible product, never a calming/clinical product claim.
// They earn only partial preference credit and cannot satisfy a hard obligation.
const relaxUseNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const RELAX_USE_RULES=[
 {id:'relax-film-viewing',area:'techGaming',sub:'tech',title:/\b(?:proiettore|videoproiettore|projector)\b/,use:/\b(?:cinema|film|movies|home theater)\b/,property:'Guardare un film come possibile momento di pausa'},
 {id:'relax-listening',area:'techGaming',sub:'tech',title:/\b(?:cassa|speaker|cuffie|auricolari|headphones|earbuds)\b/,use:/\b(?:musica|music|ascolto|listening|riproduzione audio|audio playback|suono|sound)\b/,property:'Ascolto come possibile momento di pausa'},
 {id:'relax-photo-viewing',area:'techGaming',sub:'tech',title:/\b(?:cornice (?:digitale|foto)|digital photo frame)\b/,use:/\b(?:foto|fotografie|photos|slideshow)\b/,property:'Guardare le proprie fotografie come possibile momento di pausa'},
 {id:'relax-care-routine',area:'styleBeauty',sub:'skincare',title:/\b(?:crema|siero|mascher[ae]|cream|serum|mask)\b/,use:/\b(?:routine|applicare|applicazione|apply|application|quotidian\w*|daily|idrat\w*|moisturi\w*|massaggio|massage)\b/,property:'Routine di cura personale come possibile momento di pausa'}
];
export function relaxUseContext(product){
 const tags=product.tags||[],title=relaxUseNorm(product.title);
 for(const rule of RELAX_USE_RULES){
  if(!tags.includes(rule.area)||!tags.includes(rule.sub)||!rule.title.test(title))continue;
  const evidence=[];let conflict=false;
  for(const [field,value] of [['title',product.title],['features',product.features]]){
   const text=relaxUseNorm(Array.isArray(value)?value.join('. '):value);
   for(const match of text.matchAll(new RegExp(rule.use.source,'g'))){
    const before=text.slice(0,match.index).split(/[.;!?\n]/).at(-1),after=text.slice(match.index+match[0].length).split(/[.;!?\n]/)[0];
    if(/\b(?:non|no|not|senza|without|optional|opzionale|variante|variant|se|if)\b/.test(before)||/^\s*(?:playback\s+)?(?:non|not|optional|opzionale|sold separately|vendut[oa] separat\w*)\b/.test(after))conflict=true;
    else evidence.push({field,matched:match[0],status:'supported',property:rule.property,rule:rule.id});
   }
  }
  if(evidence.length&&!conflict)return {status:'partial',rule:rule.id,evidence,source:'editorial_possible_use_from_listing',claim:'possible_use_not_relaxation_effect'};
 }
 return null;
}
