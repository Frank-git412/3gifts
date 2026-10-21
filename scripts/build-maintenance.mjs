// Public pre-launch surface only. The complete application is built separately in dist/.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'build');
const favicon=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<link rel="icon"[^>]+>/)?.[0]||'';
const css=`:root{color-scheme:light;font-family:Arial,Helvetica,sans-serif;color:#17132f;background:#fbfaff}*{box-sizing:border-box}body{margin:0;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;background:radial-gradient(ellipse at 10% 10%,#ece6ff,transparent 50%),radial-gradient(ellipse at 95% 80%,#ffe3d1,transparent 45%),#fbfaff}header,footer{width:min(1120px,100%);margin-inline:auto;padding:28px clamp(20px,5vw,64px)}header{display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-size:1.35rem;font-weight:700;letter-spacing:-.03em;color:#17132f;text-decoration:none}.brand span{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;margin-right:6px;background:#17132f;color:#fff}.language{color:#4a35c7;text-decoration:none;font-size:1rem;padding:12px 16px;border:1px solid #d6d0e9;border-radius:999px;background:#ffffffa8}main{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;width:min(1120px,100%);margin:auto;padding:60px clamp(20px,5vw,64px) 90px}.eyebrow{font-size:.9rem;letter-spacing:.14em;text-transform:uppercase;color:#4a35c7;margin:0 0 28px;font-weight:700}h1{font-family:Georgia,serif;font-size:clamp(3rem,8vw,6.5rem);line-height:1.02;letter-spacing:-.045em;font-weight:500;max-width:900px;margin:0 0 30px}h1 em{font-style:normal;color:#4a35c7}.intro{font-size:clamp(1.1rem,2vw,1.35rem);line-height:1.65;color:#514d63;max-width:570px;margin:0}.tagline{font-size:1rem;color:#514d63;margin:22px 0 0}footer{display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;border-top:1px solid #e7e3f2;font-size:.9rem;color:#514d63}footer a{color:#4a35c7;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #4a35c7;outline-offset:5px}@media(max-width:450px){header,footer{padding:20px}main{padding-top:50px;padding-bottom:65px}.language{padding:12px}h1{font-size:3.25rem}}`;
function page(en=false,missing=false){
 const title=en?'3Gifts | Site under construction':'3Gifts | Sito in costruzione';
 const description=en?'We are preparing 3Gifts: three thoughtful gift ideas, without the endless search.':'Stiamo preparando 3Gifts: tre idee regalo pensate per te, senza ricerche infinite.';
 return `<!doctype html>
<html lang="${en?'en-US':'it'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#17132f"><meta name="description" content="${description}"><meta name="robots" content="${missing?'noindex,follow':'index,follow'}"><title>${title}</title><link rel="canonical" href="https://3gifts.it/${en?'en/':''}"><link rel="alternate" hreflang="it" href="https://3gifts.it/"><link rel="alternate" hreflang="en-US" href="https://3gifts.it/en/"><link rel="alternate" hreflang="x-default" href="https://3gifts.it/">${favicon}<style>${css}</style></head>
<body><header><a class="brand" href="${en?'/en/':'/'}" aria-label="3Gifts"><span>3</span> Gifts</a><a class="language" href="${en?'/':'/en/'}" lang="${en?'it':'en'}" hreflang="${en?'it':'en-US'}" aria-label="${en?'Passa a Italiano':'Switch to English'}"><span aria-hidden="true">${en?'🇮🇹':'🇺🇸'}</span> ${en?'IT':'EN'}</a></header><main><p class="eyebrow">${en?'Something thoughtful is on its way':'Le idee migliori meritano cura'}</p><h1>${en?'Site under<br><em>construction.</em>':'Sito in<br><em>costruzione.</em>'}</h1><p class="intro">${description}</p><p class="tagline">${en?'Three ideas. One gift. Zero stress.':'Tre idee. Un regalo. Zero stress.'}</p></main><footer><span>© 2026 3Gifts</span><a href="mailto:info@3gifts.it">info@3gifts.it</a></footer></body></html>\n`;
}
// Never delete an unknown build tree: fail closed if it contains anything unapproved.
const allowed=new Set(['index.html','404.html','en/index.html','robots.txt','sitemap.xml']);
function walk(dir,prefix=''){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]):[];}
for(const file of walk(out))if(!allowed.has(file))throw Error('Unexpected public build file; inspect before publishing: '+file);
fs.mkdirSync(path.join(out,'en'),{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),page());
fs.writeFileSync(path.join(out,'404.html'),page(false,true));
fs.writeFileSync(path.join(out,'en/index.html'),page(true));
fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://3gifts.it/sitemap.xml\n');
fs.writeFileSync(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://3gifts.it/</loc></url><url><loc>https://3gifts.it/en/</loc></url></urlset>\n');
for(const file of walk(out))if(/\.html$/.test(file)){
 const html=fs.readFileSync(path.join(out,file),'utf8');
 if(/<script\b|umami|catalog\.js|app\.js|giftForm|<form\b/i.test(html))throw Error('Application or tracking leaked into maintenance output: '+file);
}
console.log(JSON.stringify({mode:'maintenance',directory:out,files:walk(out),applicationExposed:false,optionalTracking:false}));
