// Fixed listing examples through real server filters/selection; no network,
// no claims about Amazon stock, quality, or complete category coverage.
module.exports.installResearchFixture=async r=>{
 const {publicPlan,publicCandidate}=await import('../server/research/public-adapter.mjs');
 const {selectResearchIdeas}=await import('../server/research/research-engine.mjs');
 const titles=['Smartphone Android','Computer portatile notebook','Console portatile','Smart speaker','Telecamera wifi','Romanzo rosa','Fumetti avventura','Libri storia arte','Portacarte unisex','Pennelli trucco','Crema viso idratante','Collana donna','Gioco da tavolo bambini dai 7 anni','Rompicapo bambini dai 7 anni','Puzzle bambini dai 7 anni','Carte gioco bambini dai 7 anni'];
 const listings=titles.flatMap((title,i)=>[35,275,400].map((price,k)=>{const asin='B'+String(8000+i*3+k).padStart(9,'0');return {asin,title,price,features:title,url:'https://www.amazon.it/dp/'+asin,areas:[],queries:[]};}));
 const responses=[];
 r.c.fetch=async(url,options)=>{
  const data=JSON.parse(options.body),ctx=publicPlan(data);
  const candidates=ctx.blocked?[]:listings.map(p=>publicCandidate({...p,researchQueryIds:[...ctx.plan.queries,...ctx.plan.fallbackQueries].map(q=>q.id)},ctx)).filter(Boolean);
  const selected=selectResearchIdeas(candidates,ctx.plan);
  const result={method:'research-20261007',products:selected.products.map(p=>({...p,amazonPrice:true})),effectiveMin:ctx.plan.profile.effectiveMin};responses.push(result);
  return {ok:true,json:async()=>result};
 };
 return responses;
};
module.exports.submitRefinement=async r=>{const f=r.el('#refinementForm');await f.listeners.submit[0]({preventDefault(){},currentTarget:f});};
