// Library product job: selection rules, matching, refresh and 24-hour expiry, against a fake Amazon API.
import assert from 'node:assert/strict';
import test from 'node:test';
import {database} from './d1-fixture.mjs';
import {selectLibraryProducts,runLibraryJob,productAllowed} from '../server/library-products.mjs';

const item=(asin,title,price,extra={})=>({asin,detailPageURL:`https://www.amazon.it/dp/${asin}?tag=3gifts-21`,itemInfo:{title:{displayValue:title}},images:{primary:{large:{url:`https://m.media-amazon.com/images/I/${asin}.jpg`}}},offersV2:{listings:[{isBuyBoxWinner:true,price:{money:{amount:price,currency:'EUR'}},availability:{type:'IN_STOCK'}}]},...extra});
const concept={id:'c001-set-da-sommelier-in-legno',amazonQuery:'set sommelier cofanetto legno',price:{min:20,max:45}};
const env=db=>({DB:db,AMAZON_CREATORS_CLIENT_ID:'id',AMAZON_CREATORS_CLIENT_SECRET:'secret',AMAZON_CREATORS_VERSION:'3.2',AMAZON_PARTNER_TAG:'3gifts-21'});

test('keeps Amazon order and drops non-gifts, out-of-budget, unavailable and duplicate variants', () => {
  const picked=selectLibraryProducts([
    item('B000000001','Set sommelier in legno 5 pezzi',29),
    item('B000000002','Tappo di ricambio per cavatappi',9),
    item('B000000003','Set sommelier di lusso',90),
    item('B000000004','Set sommelier bambù',25,{offersV2:{listings:[{price:{money:{amount:25,currency:'EUR'}},availability:{type:'OUT_OF_STOCK'}}]}}),
    item('B000000005','Set sommelier nero',31,{parentASIN:'B0000000P1'}),
    item('B000000006','Set sommelier rosso',31,{parentASIN:'B0000000P1'}),
    item('B000000007','Cofanetto vino con cavatappi',22),
    item('B000000008','Kit sommelier professionale',40),
  ],concept);
  assert.deepEqual(picked.map(p=>p.asin),['B000000001','B000000005','B000000007','B000000008']);
  assert.equal(picked[1].parentAsin,'B0000000P1');
});

test('drops listings made for someone else: kids items for adults, drinking games, the other gender', () => {
  const adultIdea={...concept,ages:['adult'],occasions:['christmas'],avoidFlags:[],gender:'women'};
  const picked=selectLibraryProducts([
    item('B000000011','Macchina Fotografica Bambini Istantanea',29),
    item('B000000012','Carte per bere - gioco alcolico per adulti',25),
    item('B000000013','Festina Orologio Uomo in pelle',30),
    item('B000000014','Bracciali coppia lui lei',30),
    item('B000000015','Binocolo compatto per bambini e adulti',30),
  ],adultIdea);
  assert.deepEqual(picked.map(p=>p.asin),['B000000014','B000000015']);
  assert.equal(productAllowed('Festina Orologio Uomo',{...adultIdea,gender:'any'},'women'),false,'a man\'s watch is not offered to her');
  assert.equal(productAllowed('Festina Orologio Uomo',{...adultIdea,gender:'any'},'unisex'),true,'unknown recipient: allowed, ranked after neutral items');
  assert.equal(productAllowed('Copertina mussola neonato',{...adultIdea,gender:'any',occasions:['newbaby']}),true,'baby items are the point of a new-baby idea');
});

test('matches concepts, refreshes the next day and clears Amazon content after 24 hours', async () => {
  const {binding}=database();
  const calls=[];
  globalThis.fetch=async(url,init)=>{
    if(String(url).includes('/auth/o2/token'))return new Response(JSON.stringify({access_token:'t',expires_in:3600}),{status:200});
    const path=String(url).split('/').pop(),body=JSON.parse(init.body);calls.push(path);
    if(path==='searchItems')return new Response(JSON.stringify({searchResult:{items:[item('B000000001','Set sommelier in legno',29),item('B000000007','Cofanetto vino',22)]}}),{status:200});
    return new Response(JSON.stringify({itemsResult:{items:body.itemIds.filter(a=>a!=='B000000007').map(a=>item(a,'Set sommelier aggiornato',27))}}),{status:200});
  };
  const day0=Date.now();
  const first=await runLibraryJob(env(binding),[concept],day0);
  assert.deepEqual({matched:first.matched,errors:first.errors},{matched:1,errors:[]});
  let rows=(await binding.prepare('SELECT asin,rank,price,available FROM library_products ORDER BY rank').all()).results;
  assert.deepEqual(rows.map(r=>[r.asin,r.rank,r.price,r.available]),[['B000000001',1,29,1],['B000000007',2,22,1]]);

  // The next day the concept is not searched again; its products are refreshed instead.
  const day1=day0+21*3600000;
  const second=await runLibraryJob(env(binding),[concept],day1);
  assert.equal(second.matched,0);assert.equal(second.refreshed,2);
  assert.equal(calls.filter(c=>c==='searchItems').length,1);
  rows=(await binding.prepare('SELECT asin,price,available FROM library_products ORDER BY rank').all()).results;
  assert.deepEqual(rows.map(r=>[r.asin,r.price,r.available]),[['B000000001',27,1],['B000000007',null,0]]);

  // If refreshes stop, Amazon content older than 24 hours is cleared but the ASIN stays.
  // A different client id keeps the transport's 15-minute response cache out of this step.
  globalThis.fetch=async()=>new Response('{}',{status:503});
  await runLibraryJob({...env(binding),AMAZON_CREATORS_CLIENT_ID:'other'},[concept],day1+25*3600000);
  rows=(await binding.prepare('SELECT asin,title,price,image_url,available FROM library_products').all()).results;
  assert.ok(rows.every(r=>r.title===null&&r.price===null&&r.image_url===null&&r.available===0));
  assert.equal(rows.length,2);
});

test('a concept whose search fails is retried later and does not block the others', async () => {
  const {binding}=database();
  const other={...concept,id:'c002-kit-cocktail',amazonQuery:'kit cocktail'};
  globalThis.fetch=async(url,init)=>{
    if(String(url).includes('/auth/o2/token'))return new Response(JSON.stringify({access_token:'t',expires_in:3600}),{status:200});
    const body=JSON.parse(init.body);
    if(body.keywords===concept.amazonQuery)return new Response(JSON.stringify({errors:[{code:'InvalidParameterValue'}]}),{status:400});
    return new Response(JSON.stringify({searchResult:{items:[item('B000000009','Kit cocktail',30)]}}),{status:200});
  };
  const now=Date.now();
  const e={...env(binding),AMAZON_CREATORS_CLIENT_ID:'retry'};
  const report=await runLibraryJob(e,[concept,other],now);
  assert.equal(report.matched,1);assert.equal(report.errors.length,1);
  const again=await runLibraryJob(e,[concept,other],now+3600000);
  assert.equal(again.matched+again.empty+again.errors.length,0,'neither is searched again within the day');
  const {libraryStatus}=await import('../server/library-products.mjs');
  const status=await (await libraryStatus({DB:binding},[concept,other],now+3600000)).json();
  assert.equal(status.conceptsSearched,1);assert.equal(status.conceptsFailed,1);assert.equal(status.lastRun.matched,0);
});
