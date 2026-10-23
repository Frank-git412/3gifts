import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import legal from "../locales/legal-en.mjs";
import guides from "../locales/guides-en.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
function pairs(file) {
 const map = new Map();
 for (const line of read(file).trim().split("\n")) {
  const at = line.indexOf(" => ");
  if (at < 1) throw Error("Malformed translation: " + line);
  const a = line.slice(0, at), b = line.slice(at + 4);
  if (map.has(a)) throw Error("Duplicate translation: " + a);
  map.set(a,b);
 }
 return map;
}
const ui = pairs("locales/ui-en.txt");
const neutral = new Set(["3Gifts", "Gifts", "Privacy", "Cookie", "Privacy Policy", "Cookie Policy", "Smart home", "Fitness", "© 2026 3Gifts"]);
function text(s) {
 const trim = s.trim();
 if (!trim || neutral.has(trim) || !/\p{L}/u.test(trim)) return s;
 if (!ui.has(trim)) throw Error("Missing UI translation: " + trim);
 return s.replace(trim, ui.get(trim));
}
function translateHTML(html) {
 return html.split(/(<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>)/gi).map(part => {
  if (!part.startsWith("<")) return text(part);
  if (/^<(script|style)\b|^<!--/i.test(part)) return part;
  return part.replace(/(aria-label|placeholder|alt)="([^"]*)"/g,(_,a,v)=>a+'="'+text(v)+'"')
   .replace(/(<meta name="description" content=")([^"]*)(")/,(_,a,v,b)=>a+text(v)+b);
 }).join("");
}
function write(p, value) {
 const dest=path.join(out,p); fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,value);
}
function footer(prefix="") {
 return '<footer class="legal-footer"><span>© 2026 3Gifts</span><a href="'+prefix+'privacy.html">Privacy</a><a href="'+prefix+'cookie.html">Cookie</a><a href="'+prefix+'terms.html">Terms</a><a href="'+prefix+'affiliate.html">Links and affiliations</a><button type="button" data-privacy-preferences>Privacy preferences</button></footer>';
}
function shell({title,kicker,heading,body,updated},article=false) {
 const prefix=article?"../":"";
 return '<!doctype html>\n<html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+heading.replaceAll('"',"&quot;")+'"><title>'+title+'</title>'+["fonts.css","styles.css","editorial.css","legal.css","footer.css","consent.css"].map(f=>'<link rel="stylesheet" href="'+prefix+f+'">').join("")+'<script defer src="'+prefix+'consent.js"></script></head><body class="'+(article?"editorial":"legal")+'-body"><header class="editorial-topbar"><div class="topbar"><a class="back-link" href="'+prefix+(article?'guide.html">← All guides':'index.html">← Back to 3Gifts')+'</a><a class="brand" href="'+prefix+'index.html"><span>3</span> Gifts</a><span class="section-name">'+(article?"Guides":"3Gifts")+'</span></div></header><main class="'+(article?"article-page":"legal-main")+'"><span class="'+(article?"category":"legal-kicker")+'">'+kicker+'</span><h1>'+heading+'</h1>'+(article?"":'<p class="updated">Last updated: '+(updated||"September 17, 2026")+'</p>')+body+(!article?footer():"")+'</main>'+ (article?footer(prefix):"")+'</body></html>';
}
const notice = '<aside class="market-notice" aria-label="Catalog region"><strong>English language · Italy catalog.</strong> Prices are in euros (EUR). Seller links currently target Italy. US shipping, taxes, product language, and availability must be checked with the seller.</aside>';
function decorate(html,file,en) {
 const depth=file.split("/").length-1, asset="../".repeat(depth+(en?1:0));
 const other=path.posix.relative(path.posix.dirname((en?"en/":"")+file),(en?"":"en/")+file);
 const link='<a class="language-switch" href="'+other+'" hreflang="'+(en?"it":"en-US")+'" lang="'+(en?"it":"en")+'" title="'+(en?"Passa a Italiano":"Switch to English (United States)")+'"><span aria-hidden="true">'+(en?"🇮🇹":"🇺🇸")+'</span><span>'+(en?"IT":"EN")+'</span><span class="sr-only">'+(en?" — Italiano":" — English (United States)")+'</span></a>';
 if(file==="index.html") html=html.replace(/(<button class="quiet" id="howBtn"[^>]*>[\s\S]*?<\/button>)/,'<div class="topbar-actions">$1'+link+'</div>');
 else html=html.replace(/<span class="section-name">[^<]*<\/span>/,link);
 const clean=file==="index.html"?"":file.replace(/\.html$/,"");
 const canonical="https://3gifts.it/"+(en?"en/":"")+clean;
 const domainRedirect='<script>(function(){if(location.hostname==="www.3gifts.it"){var u=new URL(location.href);u.hostname="3gifts.it";location.replace(u.href)}})();</script>';
 const pageTitle=(html.match(/<title>([^<]*)<\/title>/)||[])[1]||"3Gifts",pageDescription=(html.match(/<meta name="description" content="([^"]*)"/)||[])[1]||"";
 const sharePreview='<meta property="og:type" content="website"><meta property="og:site_name" content="3Gifts"><meta property="og:locale" content="'+(en?'en_US':'it_IT')+'"><meta property="og:title" content="'+pageTitle+'"><meta property="og:description" content="'+pageDescription+'"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="https://3gifts.it/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">';
 html=html.replace("</head>",domainRedirect+sharePreview+'<link rel="canonical" href="'+canonical+'"><link rel="stylesheet" href="'+asset+'language.css"><script defer src="'+asset+'language.js"></script>'+(en?'<meta name="robots" content="noindex">':'')+'</head>');
 if(en) {
  html=html.replace(/(<html\b[^>]*\s)lang="[^"]*"/i,'$1lang="en-US"');
  // Shared assets move up one level; HTML links stay within the selected language.
  html=html.replace(/(href|src)="([^":#?]+\.(?:css|js|webp|png|jpg|svg))"/g,(whole,attr,url)=>{
   if(url.startsWith("/"))return whole;
   if(url.endsWith("language.css")||url.endsWith("language.js"))return whole;
   if(url==="app.js")return whole;
   return attr+'="../'+url+'"';
  });
  if(file==="index.html") html=html.replace('<script src="app.js"></script>','<script src="catalog-labels.js"></script><script src="app.js"></script>');
  if(file==="index.html"||file==="guide.html"||file.startsWith("guide/")) html=html.replace(/(<main[^>]*>)/,'$1'+notice);
 }
 // The questionnaire and its eligibility rules must update together for returning testers.
 if(file==="index.html") html=html.replace(/(src|href)="([^"?]*(?:app|catalog|catalog-labels|recommendation-rules|config)\.js|[^"?]*(?:journey|image-cards)\.css)"/g,'$1="$2?v=20261009-pilot1"');
 return html;
}
fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(root)) {
 if(/\.(css|js|webp|png|jpg|svg|ico|txt|webmanifest)$/.test(f) && fs.statSync(path.join(root,f)).isFile()) fs.copyFileSync(path.join(root,f),path.join(out,f));
}
fs.cpSync(path.join(root,"fonts"),path.join(out,"fonts"),{recursive:true});
const files=[...fs.readdirSync(root).filter(f=>f.endsWith(".html")),...fs.readdirSync(path.join(root,"guide")).filter(f=>f.endsWith(".html")).map(f=>"guide/"+f)];
for(const file of files) {
 const source=read(file);
 write(file,decorate(source,file,false));
 let english;
 if(legal[file])english=shell(legal[file]);
 else if(file.startsWith("guide/")) {
  const guide=guides[path.basename(file)]; if(!guide)throw Error("Missing guide: "+file);
  const words=(guide.intro+" "+guide.sections.flat().join(" ")).split(/\s+/).length;
  const body='<img src="../guide-hero.webp" width="1672" height="941" alt="Editorial still life with a gift, mug, and thoughtfully chosen objects"><p class="lead">'+guide.intro+'</p>'+guide.sections.map(([h,p])=>'<section><h2>'+h+'</h2>'+(p.startsWith("<ul>")?p:'<p>'+p+'</p>')+'</section>').join("")+'<p class="article-disclosure">This is an editorial guide. Some Amazon links may be affiliate links. As an Amazon Associate I earn from qualifying purchases. Commissions do not determine the recommendations or their order.</p><a class="more-guides" href="../guide.html">Explore more guides →</a>';
  english=shell({title:guide.title+" | 3Gifts",kicker:guide.category+" · "+Math.max(2,Math.ceil(words/200))+" min read",heading:guide.title,body},true);
 } else english=translateHTML(source);
 if(file==="guide.html")english=english.replace(/<article class="article-card">[\s\S]*?<\/article>/g,card=>{
  const slug=card.match(/href="guide\/([^"]+)"/)?.[1],guide=guides[slug];
  if(!guide)return card;
  const minutes=Math.max(2,Math.ceil((guide.intro+" "+guide.sections.flat().join(" ")).split(/\s+/).length/200));
  return card.replace(/· \d+ min read/,"· "+minutes+" min read");
 });
 write("en/"+file,decorate(english,file,true));
}
// English pages use the Italian Amazon catalog: available to visitors, excluded from the sitemap and from search results.
const canonicalRoutes=files.flatMap(file=>{
 const clean=file==="index.html"?"":file.replace(/\.html$/,"");
 return [clean];
});
// Christmas idea guides are rendered by the Worker from the library; list them for search engines too.
canonicalRoutes.push("idee",...JSON.parse(read("library/guides.json")).map(g=>"idee/"+g.slug));
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+canonicalRoutes.map(route=>'  <url><loc>https://3gifts.it/'+route+'</loc></url>').join("\n")+'\n</urlset>\n';
write("robots.txt","User-agent: *\nAllow: /\nSitemap: https://3gifts.it/sitemap.xml\n");
write("sitemap.xml",sitemap);
const strings=new Map([...ui,...pairs("locales/app-en.txt")]);
const escaped=[...strings.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&"));
// Longest-first, single-pass substitutions avoid translating an already translated value.
const app=read("app.js").replace(new RegExp(escaped.join("|"),"g"),s=>strings.get(s));
new vm.Script(app,{filename:"en/app.js"});
write("en/app.js","// Generated from app.js and locales/*-en.txt. Do not edit directly.\n"+app);
const c={window:{}};vm.runInNewContext(read("catalog.js"),c);
const products=c.window.TRE_REGALI_CATALOG, names=pairs("locales/catalog-names-en.txt"),reasons=pairs("locales/catalog-reasons-en.txt");
const macros={
"Tecnologia e gaming":"technology and gaming","Libri, fumetti e cultura":"books, comics, and culture","Musica, audio e intrattenimento":"music, audio, and entertainment","Cucina e bevande":"cooking and drinks","Viaggi e outdoor":"travel and the outdoors","Sport e benessere":"sports and wellness","Creatività e fotografia":"creativity and photography","Casa, design e giardino":"home, design, and gardening","Moda, beauty e accessori":"fashion, beauty, and accessories","Animali e natura":"pets and nature","Giochi, hobby e collezionismo":"games, hobbies, and collecting","Lavoro, studio e attualità":"work, study, and current affairs"
};
const labels={};
for(const p of products) {
 if(!names.has(String(p.id)))throw Error("Missing product name "+p.id);
 const why=reasons.get(String(p.id)) || (p.id===61 ? "A digital reading subscription. Check country, account, renewal, and gifting eligibility before buying." : "An idea for someone interested in "+(macros[p.macro]||"this hobby")+". Check the seller’s current options and availability.");
 labels[p.name]=names.get(String(p.id)); labels[p.why]=why;
}
if(names.size!==products.length)throw Error("Catalog translation count mismatch");
write("en/catalog-labels.js","window.GiftsEnglishCatalog="+JSON.stringify(labels,null,2)+";\n");
console.log("Built "+files.length+" Italian pages and "+files.length+" English pages; "+products.length+" product titles.");
