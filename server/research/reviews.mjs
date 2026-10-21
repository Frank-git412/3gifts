// Server-side tie breaker. These are pilot tuning values, not confidence levels.
export const REVIEW_POLICY=Object.freeze({priorRating:3,priorWeight:20});
export const REVIEW_CAPABILITY=Object.freeze({
 mode:'tie_breaker',dataStatus:'not_connected',
 description:'A parità di pertinenza, nella fascia di budget richiesta, preferenza per voto medio ponderato per il numero di valutazioni. Nessuna soglia di esclusione.',
 limitation:'Voto e numero di valutazioni Amazon non ancora collegati. Il criterio non è attivo sui risultati reali.'
});
// Internal contract for a future documented server adapter; never read from answers.
// Do not guess CustomerReviews response fields or use a search position as a rating.
export function reviewScore(reviews){
 if(!reviews||typeof reviews.source!=='string'||!reviews.source.trim()||
  !Number.isFinite(Date.parse(reviews.checkedAt))||
  !Number.isFinite(reviews.rating)||reviews.rating<1||reviews.rating>5||
  !Number.isSafeInteger(reviews.count)||reviews.count<1)return null;
 const {priorRating,priorWeight}=REVIEW_POLICY;
 return (reviews.rating*reviews.count+priorRating*priorWeight)/(reviews.count+priorWeight);
}
export function chooseCandidate(candidates){
 if(!candidates.length)return {product:null,status:'no_candidates'};
 // Event priority is assigned only after the public compatibility filters.
 // Personal mode sets every event score to zero, restoring category relevance.
 const eventPriority=Math.max(...candidates.map(p=>Number(p.eventPriorityScore)||0));
 const eventPeers=candidates.filter(p=>(Number(p.eventPriorityScore)||0)===eventPriority);
 const best=Math.max(...eventPeers.map(p=>p.relevance));
 const relevant=eventPeers.filter(p=>p.relevance===best);
 const preference=Math.max(...relevant.map(p=>Number(p.preferenceScore)||0));
 const peers=relevant.filter(p=>(Number(p.preferenceScore)||0)===preference).sort((a,b)=>a.asin.localeCompare(b.asin));
 if(peers.length===1)return {product:peers[0],status:'no_tie'};
 const scored=peers.map(product=>({product,score:reviewScore(product.reviews)}));
 // Incomplete evidence must not become zero stars or a bonus for known products.
 if(scored.some(p=>p.score===null))return {product:peers[0],status:'missing_data'};
 scored.sort((a,b)=>b.score-a.score||a.product.asin.localeCompare(b.product.asin));
 return {product:scored[0].product,status:'applied'};
}
