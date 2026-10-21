// Semantic/identity oracles are specified independently of the implementation.
// Executes shipped IT/EN JavaScript with DOM/network doubles, not a browser.
const { createRuntime } = require('./published-runtime.cjs');
const fs = require('node:fs'), path = require('node:path');
let assertions = 0;
const failures = [], counts = {}, sensitivity = {};
function check(ok, issue, label) {
  assertions++; counts[issue] = (counts[issue] || 0) + 1;
  if (!ok) failures.push({ issue, label });
}
function fixture(r, id, extra = {}) {
  return r.a.normalizeProduct({ id, name: `Gift ${id}`, store: 'Test', price: 20,
    tags: ['techGaming', 'tech'], directUrl: `https://shop.example/products/${id}`,
    constraints: { bulky: false, sizes: false }, ...extra });
}
const cards = r => (r.el('#resultGrid').innerHTML.match(/class="gift-card"/g) || []).length;
const urls = r => [...r.el('#resultGrid').innerHTML.matchAll(/<a href="([^"]+)"[^>]*data-product=/g)].map(m => m[1]);
async function main() {
  for (const lang of ['it', 'en']) {
    const r = createRuntime(lang); r.seed();
    const base = { ...r.a.formData(), budget: 100, timing: 'none', allowUnverified: true };
    for (const note of ['ｎｏ tech', 'ＮＯ ＴＥＣＨ', 'n\u200bo tech', 'n\u200co tech', 'n\u200do tech', 'n\u2060o tech', 'n\ufeffo tech', 'ｄｏｅｓ ｎｏｔ ｌｉｋｅ tech']) {
      const a = r.a.analyseNote(note), selected = r.a.rankProducts(r.products, base, a);
      check(a.exclusions.includes('tech') && !a.signals.includes('tech') && !a.needsClarification, 'G3-NLP-002', `${lang}: ${JSON.stringify(note)} exclusion`);
      check(selected.length === 3 && selected.every(p => !p.constraints.tech), 'G3-NLP-002', `${lang}: ${JSON.stringify(note)} ranking`);
    }
    for (const note of ['n\u202eo tech', 'n\u2066o tech']) {
      const a = r.a.analyseNote(note);
      check(a.needsClarification && r.a.rankProducts(r.products, base, a).length === 0, 'G3-NLP-002', `${lang}: bidi ambiguity fails closed`);
    }
    for (const note of ['non gradisce libri', 'non adora libri', 'non preferisce libri']) {
      const a = r.a.analyseNote(note);
      check(a.exclusions.includes('books') && !a.needsClarification && !a.signals.includes('books'), 'G3-NLP-003', `${lang}: ${note}`);
      r.set('note', note); await r.a.showResults();
      check(cards(r) === 3, 'G3-NLP-003', `${lang}: ${note} journey`);
    }
    const empty = r.a.analyseNote(''), allowed = [fixture(r, 'alt-a'), fixture(r, 'alt-b'), fixture(r, 'alt-c')];
    const duplicateSets = [
      ['url', [0,1,2].map(i => fixture(r, `dup-${i}`, { directUrl: 'https://shop.example/item?utm_source='+i+'#photo' }))],
      ['asin', [0,1,2].map(i => fixture(r, `dup-${i}`, { asin: 'B012345678' }))],
      ['amazon-url', [fixture(r,'dup-a',{directUrl:'https://www.amazon.it/dp/B012345678?tag=test-21'}),fixture(r,'dup-b',{directUrl:'https://amazon.it/gp/product/B012345678/ref=abc'})]],
      ['etsy-url', [fixture(r,'dup-a',{directUrl:'https://www.etsy.com/it/listing/123456789/title?ref=a'}),fixture(r,'dup-b',{directUrl:'https://etsy.com/listing/123456789/other?ref=b'})]],
    ];
    for (const [kind, duplicates] of duplicateSets) {
      const selected = r.a.rankProducts(duplicates, base, empty);
      check(selected.length === 1, 'G3-RANK-001', `${lang}: one commercial identity (${kind})`);
      const filled = r.a.rankProducts([...duplicates,...allowed], base, empty);
      check(filled.length === 3 && filled.filter(p=>p.id.startsWith('dup-')).length <= 1, 'G3-RANK-001', `${lang}: alternatives fill slots (${kind})`);
    }
    const variants = [fixture(r,'v1',{directUrl:'https://shop.example/item?variant=1'}),fixture(r,'v2',{directUrl:'https://shop.example/item?variant=2'})];
    check(r.a.rankProducts(variants,base,empty).length===2,'G3-RANK-001',`${lang}: meaningful query variants preserved`);
    check(r.a.rankProducts([fixture(r,'same',{store:'Shop A'}),fixture(r,'same',{store:'Shop B',directUrl:'https://other.example/item'})],base,empty).length===2,'G3-RANK-001',`${lang}: retailer-local IDs do not collide`);

    const rr = createRuntime(lang); rr.seed();
    const sameNames = Array.from({length:6},(_,i)=>fixture(rr,`same-name-${i}`,{name:'Gift Card'}));
    rr.c.fixtures = sameNames;
    rr.eval('products.length=0;fetchMarketplaceProducts=async()=>globalThis.fixtures');
    await rr.a.showResults(true);
    const firstUrls = urls(rr);
    check(firstUrls.length===3,'G3-REFINE-001',`${lang}: initial three same-name products`);
    rr.set('refineReason','owned').dispatchEvent({type:'change'});
    rr.set('refineDirection','differentCategory'); rr.set('refineSurprise','balanced');
    rr.el('#refinementForm').dispatchEvent({type:'submit'});
    check(!rr.el('#refinementError').textContent && urls(rr).length===3 && urls(rr).every(u=>!firstUrls.includes(u)), 'G3-REFINE-001', `${lang}: unseen identities survive same name`);

    for (const size of [0,1,2]) {
      const cr = createRuntime(lang); cr.seed(); cr.set('interest',['techGaming']); cr.set('budgetChoice','100');
      cr.c.fixtures = Array.from({length:size},(_,i)=>fixture(cr,`live-${i}`));
      cr.eval('fetchMarketplaceProducts=async()=>globalThis.fixtures');
      await cr.a.showResults();
      check(cards(cr)===3,'G3-CATALOG-001',`${lang}: remote size ${size} retains three results`);
    }
    for (const extra of [{availabilityStatus:'unavailable'},{price:999}]) {
      const cr = createRuntime(lang); cr.seed(); cr.set('interest',['techGaming']); cr.set('budgetChoice','100');
      const target=cr.products.find(p=>p.id==='1');
      cr.c.window.TRE_REGALI_CONFIG.catalogProductsEndpoint='https://catalog.example/test';
      cr.c.fetch=async()=>({ok:true,json:async()=>({products:[{...target,id:'remote-alias',...extra}]})});
      await cr.a.showResults();
      const catalog=cr.eval('activeCatalogProducts');
      check(!catalog.some(p=>p.id===target.id),'G3-CATALOG-001',`${lang}: remote override removes stale local identity ${JSON.stringify(extra)}`);
      check(!urls(cr).includes(target.directUrl),'G3-CATALOG-001',`${lang}: no stale fallback resurrected ${JSON.stringify(extra)}`);
    }
    // Controlled products differ in one contextual trait, never eligibility.
    for (const [field, options] of Object.entries({
      occasion: {birthday:'creative',christmas:'social',newhome:'organization',wedding:'symbolic',newbaby:'photo'},
      relation: {friend:'social',family:'sentimental'},
      ageRange: {teen:'gaming',youngAdult:'learning',adult:'organization',mature:'craft'},
    })) {
      const neutral={...base,relation:'unknown',occasion:'unknown',ageRange:'unknown',tone:'neutral'};
      const pool=Object.entries(options).map(([choice,tag])=>fixture(r,choice,{tags:['techGaming',tag]}));
      for (const choice of Object.keys(options)) {
        const ranked=r.a.rankProducts(pool,{...neutral,[field]:choice},empty);
        check(ranked[0]?.id===choice,'G3-RANK-002',`${lang}: ${field}=${choice} selects relevant trait`);
      }
    }
  }
  // Real form values only: the original audit included some obsolete aliases.
  const sr=createRuntime();sr.seed();
  const values=name=>sr.inputs.filter(i=>i.name===name).map(i=>i.value);
  const groups={occasion:['birthday','christmas','newhome','wedding','newbaby'],ageRange:['youngAdult','adult','mature','unknown'],relation:['friend','family']};
  const empty=sr.a.analyseNote('');
  for(const [field,choices] of Object.entries(groups)){
    let compared=0,changed=0;
    for(const interest of values('interest'))for(const budget of [15,50,100,300])for(const tone of values('tone')){
      const p={...sr.a.formData(),interests:[interest],budget,tone,timing:'none',allowUnverified:true};
      const variants=choices.map(choice=>sr.a.rankProducts(sr.products,{...p,[field]:choice},empty).map(x=>x.id).join(','));
      compared++;if(new Set(variants).size>1)changed++;
    }
    sensitivity[field]={compared,changed,unchanged:compared-changed};
    check(changed>0,'G3-RANK-002',`${field}: real catalog responds where relevant`);
  }
  const root=path.resolve(__dirname,'../dist');
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
  for(const file of walk(root).filter(f=>f.endsWith('.html'))){
    const html=fs.readFileSync(file,'utf8'),head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
    const relative=path.relative(root,file).split(path.sep).join('/'),base=relative.replace(/^en\//,'');
    const alternates=[...head.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/g)].map(m=>({lang:m[0].match(/hreflang="([^"]+)"/)?.[1],href:m[0].match(/href="([^"]+)"/)?.[1]}));
    for(const [language,target] of [['it',base],['en-US','en/'+base]]){
      const links=alternates.filter(a=>a.lang===language);
      check(links.length===1 && path.resolve(path.dirname(file),links[0].href)===path.join(root,target),'G3-SEO-001',`${relative}: exact ${language} alternate`);
    }
  }
  console.log(JSON.stringify({assertions,counts,sensitivity,failures,errors:failures.length,browserQA:false,liveNetworkRequests:0},null,2));
  if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
