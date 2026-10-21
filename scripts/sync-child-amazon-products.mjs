import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "catalog-products.json");
const sourcePath = path.join(root, "catalog.js");
const additions = JSON.parse(fs.readFileSync(path.join(root, "child-amazon-products.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const ids = new Set(additions.map(product => String(product.id)));

for (const product of additions) {
  product.catalogStatus = "curated-child-product";
  product.rating = 0;
  product.reviewCount = 0;
  product.checkedAt = "2026-09-20";
  product.linkCheckedAt = "2026-09-20";
  product.linkStatus = "direct-product-identified";
  product.availabilityStatus = "unknown";
  product.recipientTarget = "unisex";
  product.researchNote = "Identità e fascia d'età controllate sulle fonti indicate. Prezzo editoriale indicativo per il matching; disponibilità, costo totale, variante e consegna devono essere confermati su Amazon.";
}

catalog.products = catalog.products.filter(product => !ids.has(String(product.id))).concat(additions);
catalog.updatedAt = "2026-09-20";
catalog.count = catalog.products.length;
const amazonCount = catalog.products.filter(product => product.store === "Amazon").length;
const etsyCount = catalog.products.filter(product => product.store === "Etsy").length;
catalog.methodology = catalog.methodology
  .replace(/Catalogo \d+ Amazon \/ \d+ Etsy\./, `Catalogo ${amazonCount} Amazon / ${etsyCount} Etsy.`)
  .replace(/ Aggiunti 13 prodotti Amazon per 0–6 e 7–12 anni[^.]*\./g, "")
  + " Aggiunti 13 prodotti Amazon per 0–6 e 7–12 anni con adeguatezza d'età verificata; prezzi, disponibilità, immagini e recensioni non sono presentati come correnti.";
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");

const source = fs.readFileSync(sourcePath, "utf8");
const start = source.indexOf("  const products=");
const marker = "\n  const macroMeta";
const end = source.indexOf(marker, start);
if (start < 0 || end < 0) throw new Error("catalog.js product array not found");
const rebuilt = source.slice(0, start) + "  const products=" + JSON.stringify(catalog.products, null, 2) + ";" + source.slice(end);
fs.writeFileSync(sourcePath, rebuilt);
console.log(JSON.stringify({count: catalog.count, childAmazonProducts: additions.length}));
