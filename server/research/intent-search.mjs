// Retrieval priorities describe possible uses, never evidence about a listing.
// Only reorder qualified queries; do not invent interests or bypass requirements.
export function prioritizeIntentQueries(queries,{profile,analysis,gift,effect}){
 const signals=new Set([...(analysis.signals||[]),...(analysis.requiredSignals||[])]);
 const bookScope=profile.interests.includes('culture');
 const photo=signals.has('photo')||profile.subinterests.includes('photo');
 const food=signals.has('food')||profile.subinterests.includes('cooking');
 const orders={};
 if(bookScope&&(effect==='relax'||gift.occasion==='anniversary'||photo||food)){
  orders['culture:books']=[...(photo?['libri_fotografia']:[]),...(food?['libri_cucina']:[]),
   'narrativa',...(effect==='relax'?['illuminazione_lettura','supporti_lettura','segnalibri','letteratura_viaggio']:['illustrati','segnalibri','illuminazione_lettura','fermalibri'])];
 }
 if(effect==='relax'||gift.occasion==='anniversary')orders['techGaming:tech']=effect==='relax'
  ?['lettura_digitale','audio','cinema','foto_ricordi','tablet']
  :['foto_ricordi','cinema','lettura_digitale','audio','tablet'];
 if(signals.has('filmUse'))orders['techGaming:tech']=['cinema','tablet','postazione',...(orders['techGaming:tech']||[])];
 if(signals.has('music'))orders['techGaming:tech']=['audio',...(orders['techGaming:tech']||[])];
 // An explicit device need retains priority over a suggested leisure use.
 if(signals.has('smartphone'))orders['techGaming:tech']=['telefonia',...(orders['techGaming:tech']||[])];
 const scopes=new Map();
 for(const q of queries){const key=q.area+':'+q.subId;if(orders[key]&&q.associations?.length===1){if(!scopes.has(key))scopes.set(key,[]);scopes.get(key).push(q);}}
 for(const [scope,rows] of scopes){
  const seen=new Map(),order=orders[scope];
  const sorted=rows.map((q,index)=>{
   const occurrence=seen.get(q.family)||0;seen.set(q.family,occurrence+1);
   const rank=order.indexOf(q.family);
   // One representative per family before its variants. Preserve the original
   // qualified order for all families not selected by the current intent.
   return {q,index,priority:(occurrence?200:0)+(rank<0?100:rank)};
  }).sort((a,b)=>a.priority-b.priority||a.index-b.index).map(x=>x.q);
  scopes.set(scope,sorted);
 }
 return queries.map(q=>scopes.has(q.area+':'+q.subId)&&q.associations?.length===1?scopes.get(q.area+':'+q.subId).shift():q);
}

// Concise use searches must be attempted before stopping at three cards. Only
// already-qualified queries may become probes (including host compatibility).
// Their search words are never listing evidence. The total cap stays unchanged.
export function intentSearchProbes(queries,{effect,gift,analysis}){
 const relax=effect==='relax',anniversary=gift?.occasion==='anniversary',film=(analysis?.signals||[]).includes('filmUse');
 if(!relax&&!anniversary&&!film)return [];
 const specs=[
  ...(relax?[
   ['culture','books','narrativa','romanzo breve'],
   ['culture','books','illuminazione_lettura','lampada lettura luce calda']
  ]:[]),
  ...(!film?[['techGaming','tech','lettura_digitale','lettore ebook']]:[]),
  ['techGaming','tech','cinema','mini proiettore'],
  ...(!film?[['techGaming','tech','audio',null]]:[])
 ];
 const probes=specs.flatMap(([area,subId,family,words])=>{
  const base=queries.find(q=>q.area===area&&q.subId===subId&&q.family===family);
  return base?[{...base,id:base.id+'-intent',searchKeywords:words||base.keywords,qualityProbe:true,contextRule:film?'film-use-search':relax?'relax-use-search':'anniversary-use-search'}]:[];
 });
 // A stated listening preference affects search order, not product eligibility.
 return (analysis?.signals||[]).includes('music')?probes.sort((a,b)=>Number(b.family==='audio')-Number(a.family==='audio')):probes;
}
