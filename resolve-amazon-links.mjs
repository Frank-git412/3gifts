import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Only apply product identities supported by the reviewed evidence manifest.
// An ASIN is never evidence of a current purchasable offer.
const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'catalog-asin-links-2026-09-16.json'), 'utf8'));
const catalogPath = path.join(root, 'catalog-products.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const byId = new Map(catalog.products.map(p => [p.id, p]));
for (const change of manifest.changes) {
  const p = byId.get(change.id);
  if (!p || p.store !== 'Amazon' || ![change.originalName, change.name].includes(p.name)) throw Error(`Unexpected product ${change.id}`);
  if (!/^[A-Z0-9]{10}$/.test(change.asin) || change.directUrl !== `https://www.amazon.it/dp/${change.asin}`) throw Error(`Invalid identity ${change.id}`);
  if (p.asin && p.asin !== change.asin) throw Error(`Conflicting ASIN ${change.id}`);
  Object.assign(p, {
    name: change.name,
    asin: change.asin,
    directUrl: change.directUrl,
    linkStatus: change.evidenceKind === 'amazon-it-product-result' ? 'direct-product-indexed' : 'direct-asin-indexed',
    linkCheckedAt: change.linkCheckedAt,
    catalogStatus: 'indexed-product',
    linkEvidence: { kind: change.evidenceKind, sourceUrl: change.sourceUrl, note: change.note }
  });
  if (change.variantPriceReviewRequired) p.variantPriceReviewRequired = true;
}
const amazon = catalog.products.filter(p => p.store === 'Amazon');
const direct = amazon.filter(p => /\/dp\/[A-Z0-9]{10}(?:\/|$)/.test(new URL(p.directUrl).pathname)).length;
const searches = amazon.filter(p => /\/s\?/.test(p.directUrl)).length;
catalog.updatedAt = manifest.date;
catalog.methodology = `Catalogo 120 Amazon / 120 Etsy. Amazon: ${direct} pagine prodotto/ASIN, ${searches} ricerche ancora da risolvere e Kindle Unlimited. Identità rilevate nell'indice web, non verifica live delle offerte. Prezzi indicativi; disponibilità, variante acquistabile, spedizione e consegna richiedono un'offerta verificata. Rating di ricerca separati dal feed del sito; valutazioni e acquisti non sono equivalenti.`;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
const runtimePath = path.join(root, 'catalog.js');
const runtime = fs.readFileSync(runtimePath, 'utf8');
const start = runtime.indexOf('  const products=');
const end = runtime.indexOf('  const macroMeta');
if (start < 0 || end < start) throw Error('Catalog runtime boundaries not found');
const updated = runtime.slice(0, start) + '  const products=' + JSON.stringify(catalog.products, null, 2) + ';\n' + runtime.slice(end);
fs.writeFileSync(runtimePath, updated);
fs.writeFileSync(path.join(root, 'dist/catalog.js'), updated);
console.log(JSON.stringify({ total: catalog.products.length, amazon: amazon.length, direct, searches, changes: manifest.changes.length }));
