import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as R} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate,sufficientIdeas,occasionCoverage} from '../server/research/public-adapter.mjs';
import {contextPreference,giftContext} from '../server/research/gift-context.mjs';
import {weightedRanking} from '../server/research/weighted-ranking.mjs';
import {relaxUseContext} from '../server/research/relax-use-context.mjs';
import {occasionUseContext} from '../server/research/occasion-use-context.mjs';
import {primaryProductType} from '../server/research/product-identity.mjs';
import {matchResearchProduct,selectResearchIdeas} from '../server/research/research-engine.mjs';
import {checkProductRequirements,queryContextChecks} from '../server/research/product-requirements.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createRuntime}=require('./published-runtime.cjs');
const base={ageRange:'adult',relation:'friend',occasion:'birthday',interests:['techGaming'],subinterests:['tech'],budget:60,minBudget:15};
const plan=(profile=base,note='')=>publicPlan({profile,constraints:R.analyseNote(note)});
test('Hyphen-separated explicit book series retain one gift slot',()=>{
 const a={title:'Per 100 Giorni (Serie 100 - Libro 1): Un romanzo rosa',productGroup:'Libro',bookMetadata:{authors:['Autrice A']}},b={...a,title:'Per 100 Notti (Serie 100 – Libro 2): Un romanzo rosa'};
 assert.equal(R.bookDuplicate(a,b),'same_book_series');
 assert.equal(R.bookDuplicate(a,{...b,title:'Altra storia (Serie Mare - Libro 2)'}),null);
});
for(const title of ['Segnalibro regalo 60° compleanno','Segnalibro 60th birthday'])test('Explicit birthday variant respects the recipient age band: '+title,()=>{
 const ctx=plan({...base,interests:['culture'],subinterests:['books']}),q=ctx.plan.queries.find(q=>/segnalibro/.test(q.keywords));assert.ok(q);
 const p={asin:'B000000001',title,features:'Segnalibro per lettura',price:20,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]},reasons={};
 assert.equal(publicCandidate(p,ctx,reasons),null);assert.equal(reasons.birthday_age_conflict,1);
 assert.ok(publicCandidate({...p,title:'Segnalibro regalo 40° compleanno'},ctx));
 assert.ok(publicCandidate({...p,title:'Segnalibro 100 giorni di lettura'},ctx));
});
for(const title of ['Set di 2 occhiali e maschere per metà viso in rete acciaio per airsoft','Tactical face mask for paintball','Maschera viso FFP2','Maschera Halloween'])test('Protective or costume masks cannot enter skincare: '+title,()=>{
 assert.equal(checkProductRequirements({title,features:'Applicazione sul viso'}, {area:'styleBeauty',subId:'skincare',keywords:'maschera viso'}).passed,false);
 assert.equal(checkProductRequirements({title:'Maschera viso in tessuto idratante',features:'Applicare sulla pelle'}, {area:'styleBeauty',subId:'skincare',keywords:'maschera viso'}).passed,true);
});
test('A personalized and a plain bookmark consume one idea slot',()=>{
 const ctx=plan({...base,interests:['culture'],subinterests:['books']}),qs=[...ctx.plan.queries,...ctx.plan.fallbackQueries].filter(q=>/segnalibr/.test(q.keywords));assert.ok(qs.length);
 const products=['Segnalibro metallo','Segnalibro personalizzato foto e testo'].map((title,i)=>({asin:'B00000000'+i,title,features:'Segnalibro per lettura, personalizzazione foto e testo',price:20,researchQueryIds:qs.map(q=>q.id)}));
 assert.equal(selectResearchIdeas(products,ctx.plan).products.length,1);
});
test('Observed anniversary scrapbook stays out of reading even when its title says illustrated book',()=>{
 const q={area:'culture',subId:'books',family:'illustrati',keywords:'libri illustrati'};
 const p={title:'Gesteh DIY Scrapbook Album Fotografico in Legno di Libro Illustrato con Pagine Nere per Anniversario Nozze Libro degli Ospiti per Coppie',features:''};
 assert.equal(matchResearchProduct(p,q),0);
 assert.ok(matchResearchProduct({title:'Guida illustrata allo scrapbooking',features:'Libro con tecniche e progetti illustrati',productGroup:'Book'},q)>0);
});
for(const title of ['JoyZap Mini Smartphone XS18pro, miglior regalo per i bambini (oro)','Mini Smartphone, best gift for children'])test('An explicit child device at the end of a title is not an adult suggestion: '+title,()=>{
 const ctx=plan(),q=[...ctx.plan.queries,...ctx.plan.fallbackQueries].find(q=>q.keywords==='smartphone');assert.ok(q);
 const item={asin:'B000000001',title,features:'Telefono smartphone',price:30,researchQueryIds:[q.id],url:'https://www.amazon.it/dp/B000000001'};
 const reasons={};assert.equal(publicCandidate(item,ctx,reasons),null);assert.equal(reasons.child_device_for_adult,1);
 assert.ok(publicCandidate({...item,title:'Smartphone compatto per adulti'},ctx));
});
for(const [title,features,independent] of [
 ['Glow Addict Maschera Ufo Maschera Viso Idratante','Compatibile con tutti i dispositivi UFO. Perfezionate per essere usate con qualsiasi modello UFO e UFO mini.','Utilizzabile anche senza dispositivo'],
 ['Face mask refill','Compatible with UFO devices. Use with the device.','Usable without a device']
])test('A mask for a device needs documented independent use: '+title,()=>{
 const q={area:'styleBeauty',subId:'skincare',keywords:'maschera viso',family:'maschere_viso'};
 assert.equal(checkProductRequirements({title,features},q).passed,false);
 assert.equal(checkProductRequirements({title,features:features+'. '+independent},q).passed,true);
 assert.equal(checkProductRequirements({title:'Maschera viso argilla',features:'Applicare con le dita'},q).passed,true);
});
for(const [area,sub] of [['culture','books'],['techGaming','tech'],['styleBeauty','skincare']])test('Anniversary retrieval reserves concise qualified event searches: '+area,()=>{
 const ctx=plan({...base,occasion:'anniversary',interests:[area],subinterests:[sub]});
 const all=[...ctx.plan.queries,...ctx.plan.fallbackQueries],events=all.filter(q=>q.eventTargeted);
 const count=area==='techGaming'?1:2;
 assert.equal(events.length,count);assert.ok(all.length<=12);
 assert.equal(new Set(events.map(q=>q.searchKeywords)).size,count);
 for(const q of events){assert.ok(q.searchKeywords.split(' ').length<=5);assert.ok(!q.searchKeywords.includes('amico'));assert.ok(ctx.plan.candidateQueries.some(base=>base.id===q.id.replace(/-event-\d+$/,'')));}
 const generic={products:Array.from({length:3},()=>({areas:[area],tags:[sub]})),missing:[]};
 assert.equal(sufficientIdeas(generic,ctx.plan,[events.at(-1)]),false);
 assert.equal(sufficientIdeas(generic,ctx.plan,[]),true);
});
test('Anniversary book search preserves illustrated-book requirements and ignores search words as evidence',()=>{
 const ctx=plan({...base,occasion:'anniversary',interests:['culture'],subinterests:['books']}),q=ctx.plan.queries.find(q=>q.family==='illustrati');
 assert.equal(q.family,'illustrati');
 const item={asin:'B000000001',title:'Libro illustrato dei ricordi di coppia',features:'Storie illustrate di una coppia nel tempo.',price:25,productGroup:'Book',url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]};
 const candidate=publicCandidate(item,ctx);assert.ok(candidate);assert.equal(candidate.eventEvidence.status,'supported');
 assert.equal(publicCandidate({...item,title:'Libro dei ricordi di coppia',features:'Pagine bianche da compilare'},ctx),null);
 assert.equal(publicCandidate({...item,title:'Libro illustrato sulla fotografia',features:'Tecniche fotografiche'},ctx).eventEvidence.status,'absent');
 assert.equal(publicCandidate({...item,title:'Cornice digitale ricordi coppia'},ctx),null);
});
for(const [title,features,tags,conceptFamily] of [
 ['Mini proiettore cinema','Film a casa',['techGaming','tech'],'techGaming:cinema'],
 ['Cornice digitale foto','Visualizza le tue fotografie in slideshow',['techGaming','tech'],'techGaming:foto_ricordi'],
 ['Set crema viso','Routine idratante',['styleBeauty','skincare'],'styleBeauty:creme_viso'],
 ['Romanzo ricordi di amicizia','Storia di amici nel tempo',['culture','books'],'culture:narrativa']
])test('Anniversary possible use earns half credit but never documented event priority: '+title,()=>{
 const p={title,features,tags,conceptFamily},ctx=plan({...base,occasion:'anniversary',interests:[tags[0]],subinterests:[tags[1]]});
 const pref=contextPreference(p,ctx.gift,'any');assert.equal(pref.eventEvidence.status,'absent');assert.equal(pref.occasionUse.status,'partial');assert.equal(pref.occasionUse.humanValidated,false);
 const rank=weightedRanking({...p,...pref},[{score:1}],ctx.plan.ranking);assert.equal(rank.signals.occasion.value,.5);assert.equal(rank.eventTier,0);
 assert.equal(occasionCoverage([{...p,...pref}],ctx.gift).supported,0);
 assert.equal(occasionUseContext(p,giftContext({...base,occasion:'anniversary',searchPriority:'personal'})),null);
 assert.equal(occasionUseContext(p,giftContext(base)),null);
});
for(const p of [
 {title:'Mini proiettore cinema',features:'Non riproduce film a casa',tags:['techGaming','tech'],conceptFamily:'techGaming:cinema'},
 {title:'Lampada proiettore',features:'Film a casa',tags:['techGaming','tech'],conceptFamily:'techGaming:illuminazione'},
 {title:'Cornice digitale foto',features:'Non visualizza fotografie',tags:['techGaming','tech'],conceptFamily:'techGaming:foto_ricordi'},
 {title:'Power bank',features:'Visualizza foto ricordi',tags:['techGaming','tech'],conceptFamily:'techGaming:powerbank'},
 {title:'Set crema viso',features:'Routine opzionale',tags:['styleBeauty','skincare']},
 {title:'Crema viso',features:'Idratante',tags:['styleBeauty','skincare']},
 {title:'Romanzo amore',features:'Ricordi romantici',tags:['culture','books']},
 {title:'Libro fotografia',features:'Ricordi di viaggio',tags:['culture','books']}
])test('No fabricated anniversary use from generic, incompatible or negative text: '+p.title+' '+p.features,()=>assert.equal(occasionUseContext(p,giftContext({...base,occasion:'anniversary'})),null));
test('Anniversary book queries do not infer romance or a photography hobby for friends',()=>{
 const profile={...base,occasion:'anniversary',interests:['culture'],subinterests:['books']};
 const friend=plan(profile).plan.queries.filter(q=>q.eventTargeted);assert.ok(friend.some(q=>q.searchKeywords==='romanzo amicizia ricordi'));assert.ok(friend.every(q=>!/coppia|amore|fotografia/.test(q.searchKeywords)));
 const partner=plan({...profile,relation:'partner'}).plan.queries.filter(q=>q.eventTargeted);assert.ok(partner.some(q=>q.searchKeywords==='romanzo amore ricordi'));
});
test('A second anniversary family is omitted when excluded instead of reintroduced',()=>{
 const ctx=publicPlan({profile:{...base,occasion:'anniversary',interests:['styleBeauty'],subinterests:['skincare']},rejectedConcepts:['concept:styleBeauty:maschere_viso']});
 const events=[...ctx.plan.queries,...ctx.plan.fallbackQueries].filter(q=>q.eventTargeted);
 assert.equal(events.length,1);assert.equal(events[0].family,'creme_viso');
});
test('Occasion coverage reports missing listing support without certifying suitability',()=>{
 const context=giftContext({...base,occasion:'anniversary'}),yes={eventEvidence:{status:'supported'}},no={eventEvidence:{status:'absent'}};
 assert.equal(occasionCoverage([],context).status,'no_products');
 assert.equal(occasionCoverage([no,no,no],context).status,'absent');
 const partial=occasionCoverage([yes,no,no],context,[{eventTargeted:true},{eventTargeted:true},{}]);
 assert.equal(partial.status,'partial');assert.equal(partial.supported,1);assert.equal(partial.targetedSearches,2);assert.equal(partial.humanValidated,false);
 assert.equal(occasionCoverage([yes],context).status,'supported');
 assert.equal(occasionCoverage([yes],giftContext({...base,occasion:'anniversary',searchPriority:'personal'})).status,'not_prioritized');
});
test('An observed framed poster cannot become a digital photo frame through brand text',()=>{
 const q={keywords:'cornice digitale',area:'techGaming',subId:'tech'};
 assert.equal(matchResearchProduct({title:'Pixel artigiani digitali - Mappa Personalizzata con Cornice - Poster regalo fidanzati',features:'Cornice foto personalizzata stampata su carta'},q),0);
 assert.ok(matchResearchProduct({title:'Cornice digitale WLAN 10,1 pollici',features:'Foto e video sullo schermo'},q)>0);
});
test('Ebook reader spelling does not create a book identity or two gift slots',()=>{
 const ctx=plan(),q=[...ctx.plan.queries,...ctx.plan.fallbackQueries].find(q=>q.keywords==='lettore ebook');assert.ok(q);
 const products=['Hiraith INK EBOOK LETTORE E PLAYER MP3','Schermo Ink Ebook Reader, 2 in 1 E Book Reader MP3 Player','Hidyliu Lettore di Libri Elettrico Schermo a Inchiostro'].map((title,i)=>({title,features:'Lettore ebook per lettura',price:35,asin:'B00000000'+i,researchQueryIds:[q.id]}));
 for(const p of products)assert.equal(R.bookIdentity(p),null);
 assert.equal(selectResearchIdeas(products,ctx.plan).products.length,1);
});
test('A cream without a stated body area does not count as distinct from a face cream',()=>{
 const ctx=plan({...base,interests:['styleBeauty'],subinterests:['skincare']},'Cerco qualcosa di rilassante.'),qs=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
 const products=[['Crema viso idratante','crema viso'],['Crema-Gel Rimpolpante per una Pelle Idratata','crema idratante'],['Relief Cream niacinamide cura della pelle','crema idratante'],['Crema corpo idratante','crema corpo'],['Balsamo Olio Riparatore Notte Crème Prodigieuse','crema idratante']].map(([title,keyword],i)=>{const q=qs.find(q=>q.keywords===keyword);assert.ok(q,keyword);return {title,features:'Crema idratante. Applicare sulla pelle.',price:20,asin:'B00000000'+i,researchQueryIds:[q.id]};});
 const selected=selectResearchIdeas(products,ctx.plan);assert.equal(selected.products.length,2);assert.ok(selected.products.some(p=>p.title.includes('corpo')));
});
for(const [title,type,wrong,right,features,connections] of [
 ['Power Bank 24000mAh con USB C Carica Batterie Portatile per Cellulare iphone','powerbank','smartphone','power bank','Ricarica USB C',['usb_c']],
 ['RIENOK Cassa Bluetooth Potente Portatile 30W Impermeabile Supporta TF e AUX','speaker','supporto notebook','cassa bluetooth','Supporta notebook e computer, riproduzione musica Bluetooth',['bluetooth']]
])test('Primary product prevents an unrelated query from bypassing compatibility: '+type,()=>{
 const p={title,features},q=keywords=>({keywords,area:'techGaming',subId:'tech',recipientContext:{connections}});
 assert.equal(primaryProductType(title),type);assert.equal(matchResearchProduct(p,q(wrong)),0);
 assert.ok(matchResearchProduct(p,q(right))>0);
 assert.equal(matchResearchProduct(p,{...q(right),recipientContext:{connections:[]}}),0);
});
test('A real notebook stand remains eligible without a connection requirement',()=>{
 const q={keywords:'supporto notebook',area:'techGaming',subId:'tech',recipientContext:{connections:[]}};
 assert.ok(matchResearchProduct({title:'Supporto notebook regolabile in alluminio',features:'Stand per laptop'},q)>0);
});
test('Power bank synonyms retain the same functional identity',()=>{
 for(const title of ['Powerbank USB C','Batteria portatile per smartphone','Batteria esterna per cellulare','Caricabatterie portatile per smartphone'])assert.equal(primaryProductType(title),'powerbank');
});
test('Headphones cannot enter through a microphone query, including an intervening qualifier',()=>{
 const p={title:'JLab Go Work Cuffie wireless con Microfono',features:'Microfono dinamico USB, Bluetooth'};
 const q={keywords:'microfono dinamico usb',area:'techGaming',subId:'tech',recipientContext:{connections:['bluetooth']}};
 assert.equal(matchResearchProduct(p,q),0);
 assert.equal(queryContextChecks(q,{}).find(c=>c.kind==='connection').status,'unknown');
 assert.ok(matchResearchProduct({title:'Microfono dinamico USB C',features:'USB C'}, {...q,recipientContext:{connections:['usb_c']}})>0);
});
test('Known connected product retains its context requirement even under a secondary query',()=>{
 const p={title:'Cuffie Bluetooth',features:'Bluetooth con microfono'};
 const q={keywords:'accessorio audio',area:'techGaming',subId:'tech'};
 assert.equal(checkProductRequirements(p,q).passed,false);
 assert.equal(checkProductRequirements(p,{...q,recipientContext:{connections:['bluetooth']}}).passed,true);
});
for(const note of ['Cerco qualcosa di rilassante.','Vorrei qualcosa di rilassante.','I want something relaxing.','I am looking for something relaxing.'])test('A requested mood ranks without excluding an otherwise eligible interest: '+note,()=>{
 const a=R.analyseNote(note),ctx=publicPlan({profile:base,constraints:a});
 assert.ok(a.signals.includes('calm'));assert.ok(!a.requiredSignals.includes('calm'));
 assert.ok(a.noteConstraints.some(n=>n.type==='request'&&n.value==='calm'));
 assert.equal(ctx.plan.effect,'relax');assert.equal(ctx.plan.ranking.active.note,false);assert.equal(ctx.plan.ranking.active.effect,true);
 assert.ok(R.interestEligible({tags:['techGaming','tech']},base,a));
});
for(const note of ['Deve essere rilassante.','Solo prodotti rilassanti.','It must be relaxing.','Only relaxing products.'])test('Explicit mood obligation is retained: '+note,()=>{
 const a=R.analyseNote(note);assert.ok(a.requiredSignals.includes('calm'));
 assert.equal(R.interestEligible({tags:['techGaming','tech']},base,a),false);
});
for(const [occasion,area,sub,family] of [
 ['anniversary','culture','books','illustrati'],['anniversary','techGaming','tech','foto_ricordi'],['anniversary','styleBeauty','skincare','creme_viso'],
 ['wedding','culture','books','libri_cucina'],['newbaby','culture','books','psicologia']
])test('Priority occasion has its own qualified search: '+occasion+' '+area,()=>{
 const ctx=plan({...base,occasion,interests:[area],subinterests:[sub]}),q=ctx.plan.queries[0];
 assert.equal(q.eventTargeted,true);assert.ok(q.contextRule.endsWith(occasion));
 assert.ok(q.associations.some(a=>a.area===area&&a.subId===sub));
 assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].length<=12);
 const personal=plan({...base,occasion,interests:[area],subinterests:[sub],searchPriority:'personal'});
 assert.ok(![...personal.plan.queries,...personal.plan.fallbackQueries].some(q=>q.eventTargeted));
});
test('An explicit requested type replaces occasion retrieval in the same scope',()=>{
 const ctx=plan({...base,occasion:'anniversary',interests:['culture'],subinterests:['books']},'Luce da lettura a luce calda con luminosità regolabile.');
 assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].every(q=>q.lexicalTermIds?.length));
});
test('Two selected interests each keep their event search within the shared cap',()=>{
 const ctx=plan({...base,occasion:'anniversary',interests:['culture','styleBeauty'],subinterests:['books','skincare']});
 for(const a of ctx.plan.interests)assert.ok(ctx.plan.queries.some(q=>q.area===a&&q.eventTargeted));
 assert.ok(ctx.plan.queries.length+ctx.plan.fallbackQueries.length<=12);
});
test('Three generic cards cannot end search before the scheduled occasion query',()=>{
 const ctx=plan({...base,occasion:'anniversary'}),selected={products:Array.from({length:3},(_,i)=>({asin:String(i),areas:['techGaming'],tags:['tech']})),missing:[]};
 assert.equal(sufficientIdeas(selected,ctx.plan,ctx.plan.queries),false);
 assert.equal(sufficientIdeas(selected,ctx.plan,[]),true);
});
for(const [title,features,tags] of [
 ['Mini proiettore','Cinema in casa',['techGaming','tech']],['Video projector','Watch movies',['techGaming','tech']],
 ['Cassa Bluetooth','Riproduzione musica',['techGaming','tech']],['Bluetooth speaker','Music playback',['techGaming','tech']],
 ['Cornice digitale foto','Slideshow delle proprie foto',['techGaming','tech']],['Digital photo frame','Personal photos slideshow',['techGaming','tech']],
 ['Crema viso','Applicazione quotidiana per la routine',['styleBeauty','skincare']],['Face serum','Apply daily',['styleBeauty','skincare']]
])test('Possible use receives limited credit, not proof of relaxation: '+title,()=>{
 const p={title,features,tags},e=relaxUseContext(p);assert.equal(e.status,'partial');assert.equal(e.source,'editorial_possible_use_from_listing');
 const ctx=plan({...base,interests:[tags[0]],subinterests:[tags[1]]},'Cerco qualcosa di rilassante.');
 const pref=contextPreference(p,ctx.gift,'relax');assert.equal(pref.contextEvidence.effect.status,'partial');
 const rank=weightedRanking({...p,...pref},[{score:1}],ctx.plan.ranking);assert.equal(rank.signals.effect.value,.5);assert.equal(rank.signals.note.active,false);
});
for(const p of [
 {title:'Mini proiettore',features:'Non riproduce film',tags:['techGaming','tech']},
 {title:'Projector',features:'Movies not supported',tags:['techGaming','tech']},
 {title:'Power bank',features:'Regalo rilassante per ascoltare musica',tags:['techGaming','tech']},
 {title:'Cassa Bluetooth',features:'Non riproduce musica',tags:['techGaming','tech']},
 {title:'Speaker',features:'Music playback not supported',tags:['techGaming','tech']},
 {title:'Crema viso',features:'Routine opzionale venduta separatamente',tags:['styleBeauty','skincare']},
 {title:'Romanzo thriller',features:'Regalo relax',tags:['culture','books']}
])test('Irrelevant or negative use cannot manufacture mood evidence: '+p.title+' '+p.features,()=>assert.equal(relaxUseContext(p),null));
test('A soft mood never relaxes compatibility or an explicit product property',()=>{
 const ctx=plan(base,'Cerco qualcosa di rilassante.');
 assert.ok(![...ctx.plan.queries,...ctx.plan.fallbackQueries].some(q=>/cassa bluetooth|cuffie bluetooth/.test(q.keywords)));
 const strict=plan({...base,interests:['styleBeauty'],subinterests:['skincare']},'Cerco qualcosa di rilassante. Solo prodotti senza profumo.');
 const q=strict.plan.queries[0];assert.ok(q);
 assert.equal(publicCandidate({asin:'B000000001',title:'Crema viso',features:'Applicazione quotidiana',price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]},strict),null);
});
for(const language of ['it','en'])test('Actual questionnaire serializes model as context, keeps raw note local: '+language,()=>{
 const r=createRuntime(language);r.seed();r.set('interest',['techGaming']);r.set('subinterest',['tech']);r.set('note',language==='it'?'Usa un iPhone 15.':'Uses an iPhone 15.');
 const payload=JSON.parse(JSON.stringify(r.eval('researchRequest(formData())'))),ctx=publicPlan(payload);
 assert.equal(payload.constraints.recipientContext.deviceModel,'iphone15');assert.ok(!('note' in payload.profile));
 assert.ok(payload.constraints.noteConstraints.some(n=>n.type==='context'&&n.value==='iphone15'));
 assert.equal(ctx.plan.ranking.active.note,false);
 assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].some(q=>q.family==='protezioni_smartphone'));
 assert.ok(!ctx.plan.profile.recipientContext.connections.length);
});
