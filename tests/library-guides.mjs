// Christmas guides and shared selections: content, freshness, share previews and indexing.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {database} from './d1-fixture.mjs';
import {guideConcepts,libraryGuidePage,libraryShareSelection} from '../server/library-guides.mjs';

const concepts=JSON.parse(fs.readFileSync('library/concepts.json','utf8')).filter(c=>c.status==='approved');
const guides=JSON.parse(fs.readFileSync('library/guides.json','utf8'));
const id=prefix=>concepts.find(c=>c.id.startsWith(prefix)).id;

async function withProduct(conceptId,checkedAt){
  const {binding}=database();
  await binding.prepare('INSERT INTO library_products (concept_id,asin,rank,title,price,image_url,detail_url,available,matched_at,checked_at) VALUES (?,?,?,?,?,?,?,1,?,?)').bind(conceptId,'B000000001',1,'Set sommelier di prova',29,null,'https://www.amazon.it/dp/B000000001?tag=3gifts-21',checkedAt,checkedAt).run();
  return binding;
}

test('every guide has at least six ideas and respects its price limit', () => {
  for(const g of guides){
    const ideas=guideConcepts(g,concepts,new Map());
    assert.ok(ideas.length>=6,g.slug+' has '+ideas.length+' ideas');
    if(g.filter.maxPrice)assert.ok(ideas.every(x=>x.concept.price.min<=g.filter.maxPrice),g.slug+' price');
  }
});

test('guide pages show fresh prices with time, otherwise a search link, and carry share previews', async () => {
  const now=Date.now();
  const fresh=await (await libraryGuidePage('/idee/regali-natale-per-chi-ama-cucinare',{DB:await withProduct(id('c001'),now)},concepts,guides,now)).text();
  assert.match(fresh,/29,00/);assert.match(fresh,/Prezzo Amazon aggiornato il/);
  assert.match(fresh,/<meta property="og:image" content="https:\/\/3gifts.it\/og-image.png">/);
  assert.doesNotMatch(fresh,/noindex/);
  const stale=await (await libraryGuidePage('/idee/regali-natale-per-chi-ama-cucinare',{DB:await withProduct(id('c001'),now-25*3600000)},concepts,guides,now)).text();
  assert.doesNotMatch(stale,/29,00/,'a price older than 24 hours is never shown');
  assert.match(stale,/amazon\.it\/s\?k=/);
  assert.equal(await libraryGuidePage('/idee/non-esiste',{},concepts,guides,now),null);
});

test('a shared selection shows only library ideas and stays out of search results', async () => {
  const now=Date.now(),db=await withProduct(id('c001'),now);
  const page=await libraryShareSelection(new URL('https://3gifts.it/scelta?idee='+id('c001')+','+id('c010')+',inventata'),{DB:db},concepts,now);
  const html=await page.text();
  assert.match(html,/Set da sommelier in legno/);assert.match(html,/Macinacaffè manuale/);
  assert.equal((html.match(/class="idea"/g)||[]).length,2,'unknown ids are ignored');
  assert.match(html,/<meta name="robots" content="noindex">/);
  assert.equal(await libraryShareSelection(new URL('https://3gifts.it/scelta?idee=nulla'),{DB:db},concepts,now),null);
});
