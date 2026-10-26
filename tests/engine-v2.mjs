// Engine v2: hard constraints, scoring, variety, refinement and the response the questionnaire reads.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {database} from './d1-fixture.mjs';
import {v2Eligible,v2Select,recommendV2,similarTitles} from '../server/engine-v2.mjs';

const library=JSON.parse(fs.readFileSync('library/concepts.json','utf8')).filter(c=>c.status==='approved'||c.status==='draft');
const byId=id=>library.find(c=>c.id.startsWith(id));
const adult={relation:'partner',occasion:'christmas',ageRange:'adult',recipientPreference:'unisex',interests:['foodDrink'],subinterests:['wine'],tone:'elegant',budget:50,minBudget:0,avoid:[]};

test('hard constraints: age, child stage, relation, gender and exclusions', () => {
  assert.equal(v2Eligible(byId('c001'),adult),true);
  assert.equal(v2Eligible(byId('c001'),{...adult,avoid:['alcohol']}),false,'sommelier set hidden when alcohol is avoided');
  assert.equal(v2Eligible(byId('c001'),{...adult,avoid:['food']}),true,'sommelier set is not food');
  assert.equal(v2Eligible(byId('c009'),{...adult,avoid:['food']}),false,'tea box hidden when food is avoided');
  assert.equal(v2Eligible(byId('c001'),{...adult,avoid:['foodAlcohol']}),false,'former single choice still excludes both');
  assert.equal(v2Eligible(byId('c046'),{...adult,recipientPreference:'unisex'}),false,'women-only idea needs an explicit preference');
  assert.equal(v2Eligible(byId('c046'),{...adult,recipientPreference:'women'}),true);
  assert.equal(v2Eligible(byId('c035'),{...adult,relation:'colleague',ageRange:'mature'}),false,'relation must match');
  assert.equal(v2Eligible(byId('c099'),{...adult,ageRange:'earlyChild',childStage:'preschool',relation:'family'}),false,'newborn play mat not for 3-6');
  assert.equal(v2Eligible(byId('c099'),{...adult,ageRange:'earlyChild',childStage:'infant',relation:'family'}),true);
  assert.equal(v2Eligible(byId('c001'),{...adult,ageRange:'child'}),false,'adult idea never for a child');
  assert.equal(v2Eligible(byId('c026'),{...adult,avoid:['subscriptions']}),false);
  assert.equal(v2Eligible(byId('c099'),{...adult,ageRange:'earlyChild',childStage:'infant',relation:'child'}),true,'minors are sent with relation child');
});

const products=new Map(library.map((c,i)=>[c.id,[{asin:'B'+String(i).padStart(9,'0'),title:c.title+' prodotto',price:Math.min(c.price.max,Math.max(c.price.min,30)),detailUrl:'https://www.amazon.it/dp/B'+String(i).padStart(9,'0')+'?tag=3gifts-21',checkedAt:Date.now()}]]));

test('three different ideas, matching interests first and from different areas', () => {
  const picks=v2Select(library,products,{...adult,interests:['foodDrink','gamesCollecting'],subinterests:['wine'],budget:60});
  assert.equal(picks.length,3);
  assert.equal(new Set(picks.map(p=>p.concept.id)).size,3);
  assert.ok(picks.every(p=>p.interestMatch),'all three match the chosen interests');
  assert.ok(picks[0].concept.subinterests.includes('wine'),'the sub-interest match comes first');
  assert.ok(picks.some(p=>p.concept.interests.includes('gamesCollecting')),'second area represented');
});

test('budget is a hard limit and refinement brings new ideas', () => {
  const first=v2Select(library,products,{...adult,budget:25});
  assert.ok(first.every(p=>p.product.price<=25));
  const again=v2Select(library,products,{...adult,budget:25},first.map(p=>p.product.asin));
  assert.ok(again.every(p=>!first.some(f=>f.concept.id===p.concept.id)),'refinement never repeats a shown idea');
});

test('ideas outside the interests only complete the three and say so', () => {
  const picks=v2Select(library,products,{...adult,interests:['animalsNature'],subinterests:['pets'],tone:'funny',budget:40});
  assert.ok(picks[0].interestMatch);
  assert.ok(picks.filter(p=>!p.interestMatch).every(p=>p.outsideInterests));
});

test('endpoint answers in the shape the questionnaire reads', async () => {
  const {binding}=database();
  const now=Date.now();
  await binding.prepare('INSERT INTO library_products (concept_id,asin,rank,title,price,image_url,detail_url,available,matched_at,checked_at) VALUES (?,?,?,?,?,?,?,1,?,?)').bind(byId('c001').id,'B000000001',1,'Set sommelier',29,'https://m.media-amazon.com/x.jpg','https://www.amazon.it/dp/B000000001?tag=3gifts-21',now,now).run();
  await binding.prepare('INSERT INTO library_products (concept_id,asin,rank,title,price,image_url,detail_url,available,matched_at,checked_at) VALUES (?,?,?,?,?,?,?,1,?,?)').bind(byId('c002').id,'B000000002',1,'Kit cocktail vecchio',30,null,'https://www.amazon.it/dp/B000000002?tag=3gifts-21',now-2*86400000,now-2*86400000).run();
  const request=new Request('https://3gifts.it/api/v2/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile:adult,rejectedAsins:[]})});
  const response=await recommendV2(request,{DB:binding},library.filter(c=>c.status==='approved'),now);
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.method,'research-20261007');
  assert.deepEqual(body.products.map(p=>p.asin),['B000000001'],'stale prices are never served');
  const p=body.products[0];
  assert.equal(p.store,'Amazon');assert.equal(p.amazonPrice,true);assert.match(p.directUrl,/^https:\/\/www\.amazon\.it\//);
  assert.equal(p.why,byId('c001').whyItWorks);
  assert.equal(body.partial,true);
  const foreign=await recommendV2(new Request('https://3gifts.it/api/v2/recommend',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),{DB:binding},library,now);
  assert.equal(foreign.status,403);
});

test('a short delivery window favours instant gifts; a negative boost ranks an idea last', () => {
  const base={relation:'friend',occasion:'birthday',ageRange:'adult',recipientPreference:'unisex',interests:['culture'],subinterests:['books'],tone:'neutral',budget:60,minBudget:0,avoid:[]};
  const urgent=v2Select(library,products,{...base,timing:'urgent2'});
  assert.ok(urgent[0].concept.lastMinute,'an instant gift comes first with two days left');
  const boosted=library.map(c=>c.id.startsWith('c016')?{...c,boost:-20}:c);
  const picks=v2Select(boosted,products,{...base,interests:['gamesCollecting'],subinterests:['puzzle'],relation:'family',ageRange:'mature',budget:60});
  assert.ok(!picks.slice(0,1).some(p=>p.concept.id.startsWith('c016')),'a heavily lowered idea does not lead');
});

test('every age range gets three ideas, minors included', () => {
  const kids={relation:'child',occasion:'christmas',recipientPreference:'unisex',tone:'neutral',budget:40,minBudget:0,avoid:[]};
  for(const p of [{...kids,ageRange:'earlyChild',childStage:'toddler',interests:['earlyBuilding']},{...kids,ageRange:'child',interests:['kidsScience']},{...kids,ageRange:'teen',interests:['techGaming'],subinterests:['gaming']}])
    assert.equal(v2Select(library.filter(c=>c.status==='approved'),products,p).length,3,p.ageRange);
});

test('the recipient decides between gendered listings, near-identical titles are not shown twice, the budget is used', () => {
  const base={relation:'partner',occasion:'anniversary',ageRange:'youngAdult',recipientPreference:'women',interests:['styleBeauty'],subinterests:['jewelry'],tone:'elegant',budget:80,minBudget:0,avoid:[]};
  const watch=library.find(c=>c.id.startsWith('c086'));
  const only=new Map([[watch.id,[{asin:'B0WATCHMEN',title:'Festina Orologio Uomo in pelle',price:75,detailUrl:'https://www.amazon.it/dp/B0WATCHMEN',checkedAt:Date.now()}]]]);
  assert.equal(v2Select([watch],only,base).length,0,'a man\'s watch never reaches her');
  const both=new Map([[watch.id,[{asin:'B0WATCHMEN',title:'Festina Orologio Uomo',price:75,checkedAt:1},{asin:'B0WATCHANY',title:'Orologio minimal cinturino pelle',price:70,checkedAt:1}]]]);
  assert.equal(v2Select([watch],both,{...base,recipientPreference:'unisex'})[0].product.asin,'B0WATCHANY','unknown recipient: the neutral listing first');
  const games=library.filter(c=>['c013','c014','c015'].some(p=>c.id.startsWith(p)));
  const same=new Map(games.map((c,i)=>[c.id,[{asin:'B00000G00'+i,title:'Party game carte serate tra amici edizione '+i,price:20,checkedAt:1}]]));
  const picks=v2Select(games,same,{...base,relation:'friend',occasion:'christmas',ageRange:'adult',recipientPreference:'unisex',interests:['gamesCollecting'],subinterests:['boardGames'],tone:'funny',budget:40});
  assert.ok(picks.length<=3);
  assert.ok(similarTitles('Magma Games CARTE PER BERE Giochi da Tavolo Adulti','GLOP 400 Carte Pack Giochi da Tavolo Adulti per Bere'),'two drinking card packs are the same idea');
  assert.ok(!similarTitles('Set sommelier in legno','Macinacaffè manuale in ceramica'));
  const cheap=library.find(c=>c.id.startsWith('c046'));
  const prices=new Map([[cheap.id,[{asin:'B0CHEAP001',title:'Collana argento',price:15,checkedAt:1},{asin:'B0FAIR0001',title:'Collana argento 925',price:55,checkedAt:1}]]]);
  assert.equal(v2Select([cheap],prices,base)[0].product.asin,'B0FAIR0001','with an 80 € budget the 55 € listing beats the 15 € one');
});
