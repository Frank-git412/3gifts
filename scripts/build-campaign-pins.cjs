// Draws the v5 campaign images from pin/v5/campaign.json in three formats:
//   pinterest/ 1000x1500 (2:3)   instagram/ 1080x1350 (4:5, also for the Facebook feed)   stories/ 1080x1920 (9:16)
// and writes the Pinterest bulk-upload CSV. The images link to the site, not to Amazon,
// so they can also be promoted as ads. Text only, written by us: no Amazon photos or prices.
// Run: node scripts/build-campaign-pins.cjs
const fs = require("fs");
const path = require("path");
const os = require("os");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "pin/v5");
const data = JSON.parse(fs.readFileSync(path.join(dir, "campaign.json"), "utf8"));
const font = name => "file://" + path.join(root, "fonts", name);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const FORMATS = {
  pinterest: { w: 1000, h: 1500, pad: 80, head: 112, sub: 46, box: 210, top: 90 },
  instagram: { w: 1080, h: 1350, pad: 84, head: 108, sub: 44, box: 180, top: 76 },
  stories: { w: 1080, h: 1920, pad: 90, head: 124, sub: 50, box: 230, top: 250 }
};

function boxes(colors, size) {
  // Three wrapped gifts, numbered: the "three ideas" promise, drawn with CSS only.
  return colors.map((c, i) => `<div class="gift" style="--c:${c};--s:${size}px;transform:rotate(${[-6, 3, -2][i]}deg) translateY(${[0, -18, 6][i]}px)"><i></i><b>${i + 1}</b></div>`).join("");
}

function page(p, f) {
  const t = data.themes[p.theme];
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
@font-face{font-family:"DM Sans";font-weight:100 1000;src:url("${font("dm-sans-latin-opsz-normal.woff2")}") format("woff2-variations")}
@font-face{font-family:"Fraunces";font-weight:100 900;src:url("${font("fraunces-latin-opsz-normal.woff2")}") format("woff2-variations")}
*{box-sizing:border-box}html,body{margin:0;width:${f.w}px;height:${f.h}px}
body{background:${t.bg};color:${t.ink};font-family:"DM Sans",sans-serif;display:flex;flex-direction:column;overflow:hidden}
.top{padding:${f.top}px ${f.pad}px 0;flex:1;display:flex;flex-direction:column;gap:${Math.round(f.head * .42)}px}
.tag{align-self:flex-start;background:${t.accent};color:${p.theme === "notte" ? "#17132f" : "#fff"};font-weight:800;font-size:${Math.round(f.sub * .9)}px;padding:12px 30px;border-radius:999px;transform:rotate(-2deg)}
h1{font-family:"Fraunces",serif;font-weight:700;font-size:${f.head}px;line-height:1.02;margin:0;letter-spacing:-.02em;text-wrap:balance}
p{margin:0;font-size:${f.sub}px;line-height:1.32;color:${t.muted};text-wrap:pretty}
.gifts{display:flex;gap:${Math.round(f.box * .22)}px;justify-content:center;margin:auto 0;padding-top:${Math.round(f.box * .3)}px}
.gift{width:var(--s);height:var(--s);background:var(--c);border-radius:18px;position:relative;box-shadow:0 14px 0 rgba(0,0,0,.08)}
.gift::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:18%;transform:translateX(-50%);background:rgba(255,255,255,.55)}
.gift::after{content:"";position:absolute;top:50%;left:0;right:0;height:18%;transform:translateY(-50%);background:rgba(255,255,255,.55)}
.gift i::before,.gift i::after{content:"";position:absolute;top:-22%;width:34%;height:26%;border:calc(var(--s) * .06) solid var(--c);border-radius:50%;filter:brightness(.88)}
.gift i::before{right:50%;transform:rotate(-24deg);transform-origin:right bottom}
.gift i::after{left:50%;transform:rotate(24deg);transform-origin:left bottom}
.gift b{position:absolute;z-index:1;left:50%;top:50%;width:46%;height:46%;transform:translate(-50%,-50%);border-radius:50%;background:#fff;display:grid;place-items:center;font-family:"Fraunces",serif;font-weight:700;font-size:calc(var(--s) * .3);color:#17132f;box-shadow:0 4px 0 rgba(0,0,0,.12)}
.bar{background:#6952e8;color:#fff;padding:${Math.round(f.sub * .9)}px ${f.pad}px;display:flex;align-items:center;justify-content:space-between;gap:24px}
.cta{font-size:${Math.round(f.sub * 1.02)}px;font-weight:800;line-height:1.15}
.cta small{display:block;font-size:${Math.round(f.sub * .62)}px;font-weight:600;opacity:.85;margin-top:6px}
.brand{display:flex;align-items:center;gap:14px;font-size:${Math.round(f.sub * .86)}px;font-weight:800;white-space:nowrap}
.brand b{display:grid;place-items:center;width:${Math.round(f.sub * 1.18)}px;height:${Math.round(f.sub * 1.18)}px;border-radius:12px;background:#fff;color:#17132f}
${f === FORMATS.stories ? ".bar{padding-bottom:" + Math.round(f.sub * 3.4) + "px}" : ""}
</style></head><body>
<div class="top"><span class="tag">${esc(p.tag)}</span><h1>${esc(p.headline)}</h1><p>${esc(p.sub)}</p>
<div class="gifts">${boxes(t.box, f.box)}</div></div>
<div class="bar"><span class="cta">Tre idee in due minuti →<small>Gratis, senza registrazione</small></span><span class="brand">3gifts.it</span></div>
</body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const tmp = path.join(os.tmpdir(), "3gifts-campaign.html");
  for (const [name, f] of Object.entries(FORMATS)) {
    fs.mkdirSync(path.join(dir, name), { recursive: true });
    const tab = await browser.newPage({ viewport: { width: f.w, height: f.h } });
    for (const p of data.pins) {
      // Loaded from a file so the page may read the site's font files.
      fs.writeFileSync(tmp, page(p, f));
      await tab.goto("file://" + tmp, { waitUntil: "load" });
      await tab.evaluate(() => document.fonts.ready);
      await tab.screenshot({ path: path.join(dir, name, p.id + ".png") });
    }
    await tab.close();
  }
  await browser.close();

  const csv = [["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"]];
  for (const p of data.pins) csv.push([
    p.title.slice(0, 100),
    `https://3gifts.it/pin/v5/pinterest/${p.id}.png`,
    p.board,
    "",
    p.description.slice(0, 500),
    `${data.link}?utm_source=pinterest&utm_medium=pin&utm_campaign=${data.campaign}&utm_content=${p.id}`,
    p.publish,
    p.keywords
  ]);
  const cell = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  fs.writeFileSync(path.join(dir, "pinterest-v5.csv"), csv.map(r => r.map(cell).join(",")).join("\n") + "\n");
  console.log(`${data.pins.length} soggetti x ${Object.keys(FORMATS).length} formati e pinterest-v5.csv scritti in pin/v5`);
})();
