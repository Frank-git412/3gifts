// Draws the v4 product pins (1000x1500) from pin/v4/products.json and writes the Pinterest bulk-upload CSV.
// The images are our own drawings: Amazon product photos and prices are never used.
// Run: node scripts/build-product-pins.cjs
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "pin/v4");
const data = JSON.parse(fs.readFileSync(path.join(dir, "products.json"), "utf8"));
const font = name => "file://" + path.join(root, "fonts", name);

const ICONS = {
  candle: '<path d="M22 30h20v26H22z"/><path d="M32 30v-6"/><path d="M32 22c-4-4-2-9 0-12 2 3 4 8 0 12z"/><path d="M18 56h28"/>',
  flower: '<path d="M32 58V30"/><path d="M32 44c-6 0-10-4-11-9 6 0 10 4 11 9zM32 40c6 0 10-4 11-9-6 0-10 4-11 9z"/><circle cx="32" cy="20" r="5"/><path d="M32 15c-2-5 2-9 0-9s2 4 0 9M37 20c5-2 9 2 9 0s-4 2-9 0M27 20c-5-2-9 2-9 0s4 2 9 0M32 25c2 5-2 9 0 9s-2-4 0-9"/>',
  calendar: '<rect x="12" y="16" width="40" height="38" rx="4"/><path d="M12 26h40M22 10v10M42 10v10"/><path d="M20 34h6M29 34h6M38 34h6M20 42h6M29 42h6M38 42h6"/>',
  tv: '<rect x="8" y="14" width="48" height="30" rx="3"/><path d="M24 52h16M32 44v8"/><rect x="40" y="48" width="16" height="6" rx="2"/>',
  tumbler: '<path d="M20 18h22l-3 38H23z"/><path d="M42 24h6a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-7"/><path d="M18 18h26M34 18l4-10"/>',
  razor: '<rect x="27" y="22" width="10" height="34" rx="5"/><path d="M22 12h20v10H22z"/><path d="M24 17h16"/>',
  reader: '<rect x="16" y="8" width="32" height="48" rx="4"/><path d="M22 18h20M22 25h20M22 32h20M22 39h12"/><circle cx="32" cy="50" r="1.5"/>',
  frame: '<rect x="10" y="12" width="44" height="34" rx="3"/><path d="M14 40l12-12 8 8 6-5 10 9"/><circle cx="42" cy="22" r="4"/><path d="M28 46l-4 10M36 46l4 10"/>',
  thermometer: '<path d="M30 8h4v34h-4z"/><circle cx="32" cy="48" r="8"/><path d="M38 14h6M38 22h6M38 30h6"/><path d="M32 42v6"/>',
  speaker: '<path d="M12 40c0-12 9-20 20-20s20 8 20 20v4a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z"/><path d="M24 40h16"/><circle cx="32" cy="32" r="2"/>',
  cards: '<rect x="12" y="16" width="24" height="34" rx="3" transform="rotate(-10 24 33)"/><rect x="28" y="14" width="24" height="34" rx="3" transform="rotate(8 40 31)"/><path d="M38 26l4 6-4 6-4-6z"/>'
};

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function page(p) {
  const who = data.personas[p.persona];
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
@font-face{font-family:"DM Sans";font-weight:100 1000;src:url("${font("dm-sans-latin-opsz-normal.woff2")}") format("woff2-variations")}
@font-face{font-family:"Fraunces";font-weight:100 900;src:url("${font("fraunces-latin-opsz-normal.woff2")}") format("woff2-variations")}
:root{--ink:#17132f;--muted:#5d5873;--violet:#6952e8;--peach:#ffb37d;--bg:${who.bg};--accent:${who.accent}}
*{box-sizing:border-box}html,body{margin:0;width:1000px;height:1500px}
body{background:var(--bg);color:var(--ink);font-family:"DM Sans",sans-serif;display:flex;flex-direction:column}
.top{padding:84px 80px 60px;display:flex;flex-direction:column;gap:50px;flex:1;justify-content:space-between}
.text{display:flex;flex-direction:column;gap:30px}
.who{align-self:flex-start;background:var(--peach);color:var(--ink);font-weight:800;font-size:44px;padding:14px 34px;border-radius:22px;transform:rotate(-3deg);box-shadow:0 10px 0 rgba(23,19,47,.08)}
.icon{width:520px;height:520px;border-radius:50%;background:#fff;display:grid;place-items:center;align-self:center;border:6px solid var(--accent)}
.icon svg{width:310px;height:310px;fill:none;stroke:var(--accent);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
h1{font-family:"Fraunces",serif;font-weight:700;font-size:96px;line-height:1.04;margin:0;letter-spacing:-.01em;text-wrap:balance}
p{margin:0;font-size:44px;line-height:1.35;color:var(--muted);max-width:820px}
.bar{background:var(--violet);color:#fff;height:150px;padding:0 80px;display:flex;align-items:center;justify-content:space-between}
.cta{font-size:44px;font-weight:700}
.brand{display:flex;align-items:center;gap:14px;font-size:38px;font-weight:700}
.brand b{display:grid;place-items:center;width:52px;height:52px;border-radius:12px;background:#fff;color:var(--ink);font-size:32px}
.legal{font-size:24px;color:var(--muted);padding:0 80px 18px}
</style></head><body>
<div class="top"><span class="who">${esc(who.label)}</span>
<div class="icon"><svg viewBox="0 0 64 64">${ICONS[p.icon]}</svg></div>
<div class="text"><h1>${esc(p.title)}</h1><p>${esc(p.line)}</p></div></div>
<span class="legal">Link affiliato Amazon · immagine illustrativa</span>
<div class="bar"><span class="cta">Vedi su Amazon →</span><span class="brand"><b>3</b>Gifts</span></div>
</body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
  const csv = [["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"]];
  for (const p of data.products) {
    const who = data.personas[p.persona];
    // Loaded from a file so the page may read the site's font files.
    const tmp = path.join(require("os").tmpdir(), "3gifts-pin.html");
    fs.writeFileSync(tmp, page(p));
    await tab.goto("file://" + tmp, { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: path.join(dir, p.id + ".png") });
    const subject = who.label === "Secret Santa in ufficio" ? "Secret Santa in ufficio" : "Idea regalo " + who.label.toLowerCase();
    csv.push([
      `${subject}: ${p.title}`.slice(0, 100),
      `https://3gifts.it/pin/v4/${p.id}.png`,
      who.board,
      "",
      `${p.line} Altre idee per ogni persona su 3gifts.it. Link affiliato: in qualità di Affiliato Amazon, 3Gifts riceve un guadagno dagli acquisti idonei.`,
      `https://www.amazon.it/dp/${p.asin}?tag=${data.tag}`,
      "",
      p.keywords
    ]);
  }
  await browser.close();
  const cell = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  fs.writeFileSync(path.join(dir, "pinterest-v4.csv"), csv.map(r => r.map(cell).join(",")).join("\n") + "\n");
  console.log(`${data.products.length} pin e pinterest-v4.csv scritti in pin/v4`);
})();
