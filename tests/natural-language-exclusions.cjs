const {installResearchFixture,submitRefinement}=require('./research-api-fixture.cjs');
// Independent semantic expectations for G3-NLP-004, using shipped IT/EN JS.
const {createRuntime}=require('./published-runtime.cjs');
let assertions=0;const failures=[];
const check=(ok,label)=>{assertions++;if(!ok)failures.push(label)};
const exclusions=['Evitiamo i libri','Escludiamo i libri','Libri esclusi','Né libri né fumetti','Tutto, ad eccezione dei libri','Books are excluded','Anything other than books','Neither books nor comics'];
(async()=>{
 for(const lang of ['it','en']){
  const r=createRuntime(lang);r.seed();await installResearchFixture(r);
  for(const note of exclusions){
   const a=r.a.analyseNote(note);
   check(a.exclusions.includes('books')&&!a.signals.includes('books')&&!a.needsClarification,`${lang}: polarity ${note}`);
   r.set('interest',['culture']);r.set('budgetChoice','100');r.set('timing','week');r.set('note',note);await r.a.showResults();
   const html=r.el('#resultGrid').innerHTML;
   const links=[...html.matchAll(/<a href="([^"]+)"[^>]*data-product=/g)].map(m=>m[1]);
   const selected=Array.from(r.eval('displayedProducts'));
   check((links.length>=1&&links.length<=3&&selected.length===links.length&&/proposte disponibili|available suggestions/i.test(r.el('#resultsEyebrow').textContent))||(links.length===0&&!r.el('#zeroRecovery').hidden),`${lang}: available alternatives or explicit recovery ${note}`);
   check(selected.every(p=>!p.tags.includes('books')&&!/\b(libr[oi]|romanz[oi]|fumett[oi]|manga|books?|novels?|comics?)\b/i.test(p.name)),`${lang}: no excluded books ${note}`);
   r.set('interest',['culture','techGaming']);await r.a.showResults();
   check((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length===3,`${lang}: alternatives with another compatible interest ${note}`);
  }
  for(const note of ['Libri e profumi esclusi; ama musica','Books and perfumes are excluded; loves music']){
   const a=r.a.analyseNote(note);check(a.exclusions.includes('books')&&a.exclusions.includes('perfume')&&a.signals.includes('music')&&!a.exclusions.includes('music')&&!a.needsClarification,`${lang}: suffix-list scope ${note}`);
  }
  for(const note of ['Ama musica, libri esclusi','Loves music, books are excluded']){
   const a=r.a.analyseNote(note);check(a.exclusions.includes('books')&&a.signals.includes('music')&&!a.exclusions.includes('music')&&!a.needsClarification,`${lang}: comma scope ${note}`);
  }
  for(const note of ['Libri esclusi ma ama musica','Né libri né profumi, ma ama musica','Evitiamo libri ma ama musica','Anything other than books, but loves music']){
   const a=r.a.analyseNote(note);check(a.exclusions.includes('books')&&a.signals.includes('music')&&!a.exclusions.includes('music')&&!a.needsClarification,`${lang}: positive continuation ${note}`);
  }
  for(const note of ['Ama libri esclusivi','Gli piacciono i libri','Non solo libri ma anche musica','Not only books but also music','Ne vorrebbe uno: un libro']){
   const a=r.a.analyseNote(note);check(!a.exclusions.includes('books')&&a.signals.includes('books')&&!a.needsClarification,`${lang}: positive control ${note}`);
  }
  for(const note of ['Libri non esclusi','Books are not excluded','Oggetti misteriosi esclusi','Niente tranne libri']){
   const a=r.a.analyseNote(note);check(a.needsClarification,`${lang}: ambiguous/unknown asks clarification ${note}`);
  }
  // Refinement notes use the same parser and must preserve earlier exclusions.
  r.seed();await installResearchFixture(r);r.set('interest',['culture','mediaAudio']);r.set('budgetChoice','100');await r.a.showResults();
  r.set('refineReason','unsuitable');r.el('#refineReason').dispatchEvent({type:'change'});r.set('refineDirection','creative');r.set('refineSurprise','balanced');r.set('refineDetail','Evitiamo i libri');await submitRefinement(r);
  const updated=r.el('#resultGrid').innerHTML,urls=[...updated.matchAll(/<a href="([^"]+)"[^>]*data-product=/g)].map(m=>m[1]);
  if(!r.el('#refinementError').textContent)check(Array.from(r.eval('displayedProducts')).every(p=>!p.tags.includes('books')),`${lang}: refinement exclusion`);
  else check(r.eval('refinementCount')===0,`${lang}: refinement blocked explicitly`);
 }
 console.log(JSON.stringify({issue:'G3-NLP-004',assertions,failures,errors:failures.length,browserQA:false},null,2));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
