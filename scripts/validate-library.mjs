// Checks library/concepts.json against the questionnaire vocabulary read from index.html.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const values = name => new Set([...html.matchAll(new RegExp(`name="${name}" value="([^"]+)"`, "g"))].map(m => m[1]));

const vocab = {
  ages: values("ageRange"),
  relations: values("relation"),
  interests: values("interest"),
  subinterests: values("subinterest"),
  tones: values("tone"),
  occasions: new Set([...values("occasion"), "any"]),
  avoidFlags: values("avoid"),
};
const genders = new Set(["any", ...values("recipientPreference")].filter(g => g !== "unisex"));
const stages = values("childStage");
const kinds = new Set(["object", "experience", "subscription", "consumable"]);
const statuses = new Set(["draft", "approved", "rejected"]);

const concepts = JSON.parse(fs.readFileSync(path.join(root, "library/concepts.json"), "utf8"));
const errors = [];
const ids = new Set();
for (const c of concepts) {
  const where = c.id || "(senza id)";
  if (!/^c\d{3}-[a-z0-9-]+$/.test(c.id || "")) errors.push(`${where}: id non valido`);
  if (ids.has(c.id)) errors.push(`${where}: id duplicato`);
  ids.add(c.id);
  if (!statuses.has(c.status)) errors.push(`${where}: status non valido`);
  for (const field of ["title", "pitch", "whyItWorks", "amazonQuery"])
    if (typeof c[field] !== "string" || !c[field].trim()) errors.push(`${where}: ${field} mancante`);
  for (const [field, allowed] of Object.entries(vocab)) {
    if (!Array.isArray(c[field])) { errors.push(`${where}: ${field} deve essere una lista`); continue; }
    for (const v of c[field]) if (!allowed.has(v)) errors.push(`${where}: ${field} contiene "${v}"`);
  }
  for (const field of ["ages", "relations", "interests", "tones", "occasions"])
    if (!c[field]?.length) errors.push(`${where}: ${field} vuoto`);
  if (!genders.has(c.gender)) errors.push(`${where}: gender non valido`);
  if (!kinds.has(c.kind)) errors.push(`${where}: kind non valido`);
  if (typeof c.lastMinute !== "boolean") errors.push(`${where}: lastMinute deve essere true o false`);
  // 0–6 concepts name the child stages they suit, so a newborn toy never reaches a five-year-old.
  if (c.ages.includes("earlyChild") && !c.stages?.length) errors.push(`${where}: stages mancante per 0–6 anni`);
  for (const s of c.stages || []) if (!stages.has(s) || s === "all") errors.push(`${where}: stages contiene "${s}"`);
  if (!(c.price?.min > 0 && c.price.max >= c.price.min)) errors.push(`${where}: fascia di prezzo non valida`);
  for (const field of ["notFor", "checkBefore"]) {
    if (c[field] !== undefined && (typeof c[field] !== "string" || !c[field].trim())) errors.push(`${where}: ${field} vuoto`);
    if (c.status === "approved" && c[field] === undefined) errors.push(`${where}: ${field} mancante per un'idea approvata`);
  }
  if (c.boost !== undefined && !Number.isFinite(c.boost)) errors.push(`${where}: boost deve essere un numero`);
}

const count = (field) => {
  const m = {};
  for (const c of concepts) for (const v of c[field]) m[v] = (m[v] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ");
};
console.log(`${concepts.length} concetti`);
for (const field of ["ages", "relations", "interests", "tones", "occasions"]) console.log(`${field}: ${count(field)}`);
const uncovered = [...vocab.interests].filter(i => !i.startsWith("early") && !i.startsWith("kids") && !concepts.some(c => c.interests.includes(i)));
if (uncovered.length) console.log(`aree adulte senza concetti: ${uncovered.join(", ")}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
