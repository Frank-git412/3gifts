import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
const {createRuntime}=createRequire(import.meta.url)('./published-runtime.cjs');
const profile={ageRange:'adult',relation:'friend',occasion:'birthday',recipientPreference:'unisex',minBudget:15,budget:60,interests:['culture'],subinterests:['books'],tone:'useful'};
function setup(note,lang='it'){
 const r=createRuntime(lang);r.seed();r.set('interest',profile.interests);r.set('subinterest',profile.subinterests);r.c.m5Profile={...profile,note};
 const request=JSON.parse(JSON.stringify(r.eval('researchRequest(m5Profile,analyseNote(m5Profile.note),false)')));
 assert.ok(!('note' in request.profile));const ctx=publicPlan(request);
 const product=(title,features='',extra={})=>({asin:'B000000001',title,features,price:25,url:'https://www.amazon.it/dp/B000000001?tag=3gifts-21',researchQueryIds:[...ctx.plan.queries,...ctx.plan.fallbackQueries].map(q=>q.id),...extra});
 return {request,ctx,product};
}
for(const [lang,note] of [
 ['it','Una lampada da lettura ricaricabile, niente libri.'],
 ['en','A rechargeable reading light, no books.'],
 ['it','Vorrei una luce per la lettura ricaricabile. Niente libri.']
])test('Reading accessory remains eligible while books and unsupported batteries are excluded: '+lang+' '+note,()=>{
 const {request,ctx,product}=setup(note,lang);assert.equal(ctx.blocked,false);assert.ok(request.constraints.exclusions.includes('books'));
 assert.ok(ctx.plan.queries.length);assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].every(q=>q.family==='illuminazione_lettura'));
 const good=publicCandidate(product('Lampada da lettura per libri','Batteria ricaricabile USB.'),ctx);assert.ok(good);
 assert.equal(rules.violatesExclusions(good,ctx.profile,request.constraints),false);
 for(const p of [product('Romanzo avventura','Batteria ricaricabile USB.'),product('Lampada da lettura',''),product('Lampada da lettura','Batteria non ricaricabile.'),product('Custodia per lampada da lettura ricaricabile'),product('Lampada da lettura','Ricaricabile solo con accessorio venduto separatamente.')])assert.equal(publicCandidate(p,ctx),null);
});
for(const [lang,note] of [
 ['it','Solo libri cartacei. Non desidera e-book né audiolibri.'],
 ['it','Solo libri cartacei. Niente e-book e niente audiolibri.'],
 ['en','Only paper books. No e-books or audiobooks.'],
 ['en','Only physical books. Does not want e-books nor audiobooks.']
])test('Redundant digital exclusion preserves physical book requirement: '+note,()=>{
 const {request,ctx,product}=setup(note,lang);assert.equal(ctx.blocked,false);assert.ok(request.constraints.exclusions.includes('bookPhysical'));assert.ok(!request.constraints.exclusions.includes('books'));
 const book=binding=>product('Un sentiero nel bosco','Romanzo di avventura.',{productGroup:'Books',bookMetadata:{binding,language:'Italiano',authors:['Autore']}});
 assert.ok(publicCandidate(book('Paperback'),ctx));
 for(const binding of ['Kindle eBook','Audiobook','','Paperback eBook'])assert.equal(publicCandidate(book(binding),ctx),null);
 assert.equal(publicCandidate(product('Lampada da lettura','Batteria ricaricabile'),ctx),null);
});
for(const [lang,note] of [
 ['it','Vorrei un libro ma non conosco i generi che preferisce.'],
 ['it','Non conosco i suoi generi preferiti. Vorrei un libro.'],
 ['en',"I want a book, but I don't know which genres they prefer."],
 ['en','I want a book. I do not know their favourite genres.']
])test('Unknown genre is context, not a ban or invented taste: '+note,()=>{
 const {request,ctx,product}=setup(note,lang);assert.equal(ctx.blocked,false);assert.ok(request.constraints.noteConstraints.some(c=>c.value==='preference_unknown'&&c.type==='uncertain'));
 assert.deepEqual(request.constraints.exclusions,[]);assert.ok(!request.constraints.signals.some(x=>['horror','thriller','adventurous'].includes(x)));
 assert.ok(publicCandidate(product('Romanzo Il ponte di carta','Romanzo di avventura.',{productGroup:'Books',bookMetadata:{binding:'Paperback',language:'Italiano'}}),ctx));
});
test('Book ban is based on actual product, not the broad reading subcategory',()=>{
 const {ctx,product}=setup('Niente libri.');assert.equal(ctx.blocked,false);
 assert.ok(publicCandidate(product('Lampada da lettura per libri','Luce calda.'),ctx));
 for(const p of [product('L’anno della lepre','',{productGroup:'Books',bookMetadata:{binding:'Paperback'}}),product('Romanzo avventura'),product('Fumetti avventura')])assert.equal(publicCandidate(p,ctx),null);
 // Missing classification and a generic title are not evidence of an accessory.
 assert.equal(rules.violatesExclusions({title:'Titolo senza classificazione',tags:['culture','books']},ctx.profile,ctx.analysis),true);
});
test('Unknown trailing restrictions, conditional requests and actual contradictions still block',()=>{
 for(const note of [
  'Solo libri cartacei. Non desidera e-book né audiolibri né oggetti misteriosi.',
  'Solo libri cartacei. Niente libri.',
  'Non voglio una lampada da lettura ricaricabile.',
  'Forse una lampada da lettura ricaricabile.',
  'Vorrei un libro ma non conosco i generi che preferisce e ha una allergia.',
  'Solo libri cartacei. Non escludere e-book né audiolibri.'
 ])assert.equal(publicPlan({profile,constraints:rules.analyseNote(note)}).blocked,true,note);
 const a=rules.analyseNote('Vorrei un libro ma non conosco i generi che preferisce. Niente horror.');assert.ok(a.exclusions.includes('horror'));assert.equal(a.needsClarification,false);
 const b=rules.analyseNote('Solo libri cartacei. Niente e-book né audiolibri. Niente horror.');assert.ok(b.exclusions.includes('horror'));assert.equal(b.needsClarification,false);
 for(const note of ['Vorrei un libro ma non conosco i generi che preferisce e non vuole horror.',"I want a book but I don't know which genres they prefer and no horror."]){
  const a=rules.analyseNote(note);assert.ok(a.exclusions.includes('horror'),'A trailing ban must not be swallowed');assert.ok(!a.signals.includes('horror'));
 }
});
