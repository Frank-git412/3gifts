// Editorial pilot v1: linguistic rules, not measured popularity or commercial suitability.
// Each rule needs a product family plus a concrete use/recipient evidenced by its listing.
export const PILOT_CONTEXT_VERSION='20261009-pilot1';
const book=/\b(libr[oi]|romanzo|manuale|guida|quaderno|album|book|journal)\b/;
const tech=/\b(cornice digitale|digital photo frame|proiettore|projector|speaker|cassa bluetooth|auricolari|cuffie|headphones|lampada|monitor|lettore ebook|e-reader)\b/;
const skin=/\b(crema|creme|siero|skincare|skin care|maschera|cream|serum|mask)\b/;
const shared=/\b(coppia|per due|condivis\w*|couple|shared|for two)\b/;
const parent=/\b(neogenitor\w*|neo mamma|neo papa|new parents?|new mother|new father)\b/;
const memory=/\b(ricord\w*|memori\w*|foto\w*|photo\w*)\b/;
const infantCosmetic=/\b(crem\w*|cosmetic\w*|skin care|skincare)\b.{0,35}\b(neonat\w*|baby|infant|bambin\w*)\b/;
export const PILOT_EVENT_RULES=Object.freeze([
 {id:'books-wedding',area:'culture',sub:'books',event:'wedding',family:book,all:[/\b(cucin\w*|ricett\w*|cooking|recipe\w*|ricord\w*|memori\w*|relazion\w*|matrimonio|marriage)\b/,shared],property:'Lettura, ricette o ricordi da condividere in coppia',positive:'Libro di cucina per coppia',negative:'Romanzo ambientato in una casa'},
 {id:'books-newbaby',area:'culture',sub:'books',event:'newbaby',family:book,all:[/\b(neogenitor\w*|genitorial\w*|new parents?|parenting)\b/],property:'Contenuto rivolto al nuovo genitore',positive:'Manuale per neogenitori',negative:'Libro relax e benessere'},
 {id:'books-anniversary',area:'culture',sub:'books',event:'anniversary',family:book,all:[memory,/\b(anniversario|anniversary|coppia|couple|per due)\b/],property:'Ricordi della coppia o del suo anniversario',positive:'Libro dei ricordi anniversario',negative:'Romanzo romantico'},
 {id:'tech-wedding',area:'techGaming',sub:'tech',event:'wedding',family:tech,all:[shared,/\b(ascolt\w*|music\w*|cinema|film|foto\w*|photo\w*|video|proiezion\w*)\b/],property:'Fruizione condivisa di musica, immagini o film',positive:'Proiettore cinema per due',negative:'Lampada da scrivania per casa'},
 {id:'tech-newbaby',area:'techGaming',sub:'tech',event:'newbaby',family:tech,all:[parent,/\b(lettura|reading|mani libere|hands free|notturn\w*|night)\b/],property:'Uso pratico esplicito per il nuovo genitore',positive:'Lampada lettura notturna per neogenitori',negative:'Lampada relax benessere'},
 {id:'tech-anniversary',area:'techGaming',sub:'tech',event:'anniversary',family:tech,all:[memory,/\b(anniversario|anniversary|coppia|couple)\b/],property:'Foto o ricordi della coppia',positive:'Cornice digitale foto ricordi di coppia',negative:'Speaker dal design romantico'},
 {id:'skincare-wedding',area:'styleBeauty',sub:'skincare',event:'wedding',family:skin,all:[shared,/\b(kit|set|routine|duo)\b/],property:'Routine o set realmente condivisibile',positive:'Set skincare per due routine condivisa',negative:'Crema viso confezione regalo'},
 {id:'skincare-newbaby',area:'styleBeauty',sub:'skincare',event:'newbaby',family:skin,all:[parent],exclude:infantCosmetic,property:'Cura personale del genitore adulto, non del neonato',positive:'Crema mani per neogenitori',negative:'Crema per neonato regalo neogenitori'},
 {id:'skincare-anniversary',area:'styleBeauty',sub:'skincare',event:'anniversary',family:skin,all:[shared,/\b(kit|set|routine|duo)\b/],property:'Routine di cura condivisa in coppia',positive:'Set skincare routine di coppia',negative:'Siero elegante romantico'}
]);
export const PILOT_EVENT_FAMILIES=Object.freeze({
 'books-wedding':['libri_cucina','psicologia','illustrati'],
 'books-newbaby':['psicologia','illustrati','divulgazione_scientifica'],
 'books-anniversary':['illustrati','libri_fotografia'],
 'tech-wedding':['audio','cinema','foto_ricordi','schermi'],
 'tech-newbaby':['audio','lettura_digitale','schermi'],
 'tech-anniversary':['foto_ricordi'],
 'skincare-wedding':['creme_viso','creme_idratanti','sieri_viso','creme_mani','maschere_viso'],
 'skincare-newbaby':['creme_mani','creme_corpo'],
 'skincare-anniversary':['creme_viso','creme_idratanti','sieri_viso','creme_mani','maschere_viso']
});
export function pilotEventEvidence(product,context){
 const text=String(product.title+' '+(product.features||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const tags=product.tags||[],areas=tags.length?tags:(product.areas?.length?product.areas:context.interests||[]);
 const rules=PILOT_EVENT_RULES.filter(r=>r.event===context.occasion&&areas.includes(r.area)&&(!tags.length||tags.includes(r.sub)));
 const title=String(product.title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const propertySupported=pattern=>{
  let found=false,conflict=false;
  for(const match of text.matchAll(new RegExp(pattern.source,'g'))){
   const before=text.slice(0,match.index).split(/[.;!?\n]/).at(-1),after=text.slice(match.index+match[0].length).split(/[.;!?\n]/)[0];
   if(/\b(non|senza|not|no|without|optional|opzionale|variante|variant|se|if)\b/.test(before)||/^\s*(?:non|not|optional|opzionale|sold separately|vendut[oa] separat\w*)\b/.test(after))conflict=true;else found=true;
  }
  return found&&!conflict;
 };
 const matched=rules.find(r=>(!product.conceptFamily||PILOT_EVENT_FAMILIES[r.id].some(f=>product.conceptFamily===r.area+':'+f))&&r.family.test(title)&&r.all.every(propertySupported)&&!r.exclude?.test(text));
 if(matched)return {status:'supported',rule:matched.id,property:matched.property,source:'listing_title_features',version:PILOT_CONTEXT_VERSION};
 if(rules.length)return {status:'absent',rule:null,source:'listing_title_features',version:PILOT_CONTEXT_VERSION};
 // Non-pilot areas retain only explicit event references; generic lifestyle words never qualify.
 const explicit={wedding:/\b(matrimonio|sposi|wedding|newlyweds)\b/,newbaby:/\b(neogenitor\w*|nascita|new parents?|newborn)\b/,anniversary:/\b(anniversario|anniversary)\b/}[context.occasion];
 return {status:explicit?.test(text)?'supported':'absent',rule:explicit?.test(text)?'explicit-event-outside-pilot':null,source:'listing_title_features',version:PILOT_CONTEXT_VERSION};
}
