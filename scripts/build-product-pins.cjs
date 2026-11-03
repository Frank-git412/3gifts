// Draws the v4 product pins (1000x1500) from pin/v4/products.json and writes the Pinterest bulk-upload CSV.
// The images are text only, written by us: Amazon product photos and prices are never used.
// Run: node scripts/build-product-pins.cjs
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "pin/v4");
const data = JSON.parse(fs.readFileSync(path.join(dir, "products.json"), "utf8"));
const font = name => "file://" + path.join(root, "fonts", name);


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
.hook{background:#fff;border-radius:36px;padding:70px 64px 64px;box-shadow:0 18px 0 rgba(23,19,47,.07);position:relative}
.hook::before{content:"“";position:absolute;top:-34px;left:46px;font-family:"Fraunces",serif;font-size:220px;line-height:1;color:var(--accent)}
.hook strong{display:block;font-family:"Fraunces",serif;font-weight:700;font-style:italic;font-size:104px;line-height:1.02;color:var(--accent);letter-spacing:-.015em;text-wrap:balance}
h1{font-family:"Fraunces",serif;font-weight:700;font-size:66px;line-height:1.04;margin:0;letter-spacing:-.01em;text-wrap:balance}
p{margin:0;font-size:44px;line-height:1.35;color:var(--muted);max-width:820px}
.bar{background:var(--violet);color:#fff;height:150px;padding:0 80px;display:flex;align-items:center;justify-content:space-between}
.cta{font-size:44px;font-weight:700}
.brand{display:flex;align-items:center;gap:14px;font-size:38px;font-weight:700}
.brand b{display:grid;place-items:center;width:52px;height:52px;border-radius:12px;background:#fff;color:var(--ink);font-size:32px}
.legal{font-size:24px;color:var(--muted);padding:0 80px 18px}
</style></head><body>
<div class="top"><span class="who">${esc(who.label)}</span>
<div class="hook"><strong>${esc(p.hook)}</strong></div>
<div class="text"><h1>${esc(p.title)}</h1><p>${esc(p.line)}</p></div></div>
<span class="legal">Link affiliato Amazon</span>
<div class="bar"><span class="cta">Scopri il prezzo su Amazon →</span><span class="brand"><b>3</b>Gifts</span></div>
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
