// Christmas idea guides (/idee/...): editorial pages built from approved library concepts and
// the products the hourly job keeps fresh. Amazon content older than 24 hours is never shown;
// without a fresh product the idea links to an Amazon search instead.
const GUIDE_DAY=86400000,GUIDE_LIMIT=8,GUIDE_TAG='3gifts-21';

function guideEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const overlaps=(a,b)=>!b?.length||a.some(x=>b.includes(x));

export function guideConcepts(guide,concepts,productsByConcept){
 const f=guide.filter||{},prefer=guide.prefer||{};
 const ideas=[];
 for(const c of concepts){
  if(!c.occasions.includes('christmas')&&!c.occasions.includes('any'))continue;
  if(f.gender&&c.gender!=='any'&&c.gender!==f.gender)continue;
  if(!overlaps(c.relations,f.relations)||!overlaps(c.ages,f.ages)||!overlaps(c.interests,f.interests)||!overlaps(c.tones,f.tones))continue;
  if(f.maxPrice&&c.price.min>f.maxPrice)continue;
  const product=(productsByConcept.get(c.id)||[]).find(p=>!f.maxPrice||p.price<=f.maxPrice)||null;
  const score=c.interests.filter(i=>(prefer.interests||[]).includes(i)).length*2+c.tones.filter(t=>(prefer.tones||[]).includes(t)).length+(product?3:0);
  ideas.push({concept:c,product,score});
 }
 return ideas.sort((a,b)=>b.score-a.score||a.concept.id.localeCompare(b.concept.id)).slice(0,guide.limit||GUIDE_LIMIT);
}

function amazonSearchUrl(query){return 'https://www.amazon.it/s?k='+encodeURIComponent(query)+'&tag='+GUIDE_TAG;}
function euro(n){return n.toLocaleString('it-IT',{style:'currency',currency:'EUR'});}
function stamp(ms){return new Date(ms).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Rome'});}

function ideaHtml({concept,product},i){
 const visual=product?.imageUrl?`<img src="${guideEscape(product.imageUrl)}" alt="" loading="lazy" width="132" height="132">`:`<span aria-hidden="true">${i+1}</span>`;
 const buy=product
  ?`<p class="product">Proposta: ${guideEscape(product.title.length>90?product.title.slice(0,88)+'…':product.title)}<br><strong>${euro(product.price)}</strong><span class="price-time">Prezzo Amazon aggiornato il ${stamp(product.checkedAt)}: può cambiare, fa fede quello al momento dell’acquisto.</span></p><a class="buy" href="${guideEscape(product.detailUrl)}" rel="sponsored nofollow noopener" target="_blank" data-product="${guideEscape(concept.title)}" data-position="${i+1}" data-area="${guideEscape(concept.interests[0])}">Vedi su Amazon</a>`
  :`<a class="buy" href="${guideEscape(amazonSearchUrl(concept.amazonQuery))}" rel="sponsored nofollow noopener" target="_blank" data-product="${guideEscape(concept.title)}" data-position="${i+1}" data-area="${guideEscape(concept.interests[0])}">Cerca su Amazon</a>`;
 return `<li class="idea"><div class="idea-visual">${visual}</div><div><h2>${guideEscape(concept.title)}</h2><p>${guideEscape(concept.whyItWorks)}</p>${buy}</div></li>`;
}

function guideShell({title,description,canonical,body,jsonLd}){
 return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${guideEscape(title)} | 3Gifts</title><meta name="description" content="${guideEscape(description)}"><link rel="canonical" href="${canonical}"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/editorial.css"><link rel="stylesheet" href="/idee.css"><link rel="stylesheet" href="/footer.css"><link rel="stylesheet" href="/consent.css"><script defer src="/consent.js"></script>${jsonLd?`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,'\\u003c')}</script>`:''}</head>
<body class="editorial-body"><header class="editorial-topbar"><div class="topbar"><a class="back-link" href="/idee">← Idee di Natale</a><a class="brand" href="/" aria-label="3Gifts"><span>3</span> Gifts</a><span class="section-name">Natale 2026</span></div></header>
<main class="article-page">${body}<p class="article-disclosure">Le idee sono scelte dalla redazione di 3Gifts; i prodotti sono proposte da Amazon aggiornate ogni giorno. Alcuni collegamenti sono affiliati: in qualità di Affiliato Amazon io ricevo un guadagno dagli acquisti idonei. Le commissioni non determinano le idee o il loro ordine.</p></main>
<footer><span>© 2026 3Gifts</span><a href="/privacy">Privacy</a><a href="/cookie">Cookie</a><a href="/terms">Termini</a><a href="/affiliate">Link e affiliazioni</a><button type="button" data-privacy-preferences>Preferenze privacy</button></footer></body></html>`;
}

function guideResponse(html,status=200){return new Response(html,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=900','X-Content-Type-Options':'nosniff'}});}

async function freshProducts(env,now){
 const map=new Map();
 if(!env.DB)return map;
 const rows=(await env.DB.prepare('SELECT concept_id,asin,title,price,image_url,detail_url,checked_at FROM library_products WHERE available=1 AND price IS NOT NULL AND checked_at>? ORDER BY concept_id,rank').bind(now-GUIDE_DAY).all()).results||[];
 for(const r of rows){if(!map.has(r.concept_id))map.set(r.concept_id,[]);map.get(r.concept_id).push({asin:r.asin,title:r.title,price:r.price,imageUrl:r.image_url,detailUrl:r.detail_url,checkedAt:r.checked_at});}
 return map;
}

export async function libraryGuidePage(pathname,env,concepts,guides,now=Date.now()){
 if(pathname==='/idee'||pathname==='/idee/'){
  const items=guides.map(g=>`<li><a href="/idee/${g.slug}">${guideEscape(g.title)}</a></li>`).join('');
  return guideResponse(guideShell({title:'Idee regalo di Natale 2026',description:'Idee regalo di Natale divise per persona e budget, scelte una per una e con prezzi Amazon aggiornati ogni giorno.',canonical:'https://3gifts.it/idee',
   body:`<span class="category">Natale 2026</span><h1>Idee regalo di Natale</h1><p class="lead">Scegli per chi è il regalo: in ogni pagina trovi idee scelte una per una, il motivo per cui funzionano e il prezzo aggiornato.</p><ul class="guide-links">${items}</ul>${quizCta()}`}));
 }
 const slug=pathname.replace(/^\/idee\//,'').replace(/\/$/,'');
 const guide=guides.find(g=>g.slug===slug);
 if(!guide)return null;
 const ideas=guideConcepts(guide,concepts,await freshProducts(env,now));
 const jsonLd={'@context':'https://schema.org','@type':'ItemList',name:guide.title,itemListElement:ideas.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.concept.title}))};
 return guideResponse(guideShell({title:guide.title,description:guide.description,canonical:'https://3gifts.it/idee/'+guide.slug,jsonLd,
  body:`<span class="category">Natale 2026 · ${ideas.length} idee</span><h1>${guideEscape(guide.title)}</h1><p class="lead">${guideEscape(guide.intro)}</p>${quizCta()}<ol class="idea-list">${ideas.map(ideaHtml).join('')}</ol><a class="more-guides" href="/idee">Tutte le idee di Natale →</a>`}));
}

function quizCta(){return '<div class="quiz-cta"><p>Vuoi tre idee pensate solo per la tua persona?</p><a href="/">Fai il questionario: 2 minuti</a></div>';}
