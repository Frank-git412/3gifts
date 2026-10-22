import "./build-pilot-lexicon.mjs";
import "./build-expanded-dictionary.mjs";
import "./build-locales.mjs";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");
const server = path.join(out, "server");

const binaryExtensions = new Set([".woff2", ".webp", ".png", ".jpg", ".jpeg", ".gif", ".ico"]);
const excludedTopLevel = new Set([".openai", "server", "drizzle"]);

function collect(directory, prefix = "") {
  const assets = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!prefix && excludedTopLevel.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(assets, collect(absolute, relative));
    else if (entry.isFile()) {
      const buffer = fs.readFileSync(absolute);
      const binary = binaryExtensions.has(path.extname(entry.name).toLowerCase());
      assets["/" + relative] = binary
        ? { binary: true, body: buffer.toString("base64") }
        : { binary: false, body: buffer.toString("utf8") };
    }
  }
  return assets;
}

const assets = collect(out);
const amazonCode = fs.readFileSync(path.join(root,"server/amazon-creators.mjs"),"utf8").replace(/^import .*?;\n/gm, "").replace("export async function", "async function").replace(/^export \{.*?\};\n/gm, "");
const transportCode = fs.readFileSync(path.join(root,"server/amazon-transport.mjs"),"utf8").replace(/^import .*?;\n/gm, "").replace(/\bexport (?=(?:const|function|async function))/g, "");
const catalogueCode = fs.readFileSync(path.join(root,"server/amazon-catalog.mjs"),"utf8").replace(/^import .*?;\n/gm, "").replace("export async function", "async function").replace(/^export \{.*?\};\n/gm, "");
const curated = JSON.parse(fs.readFileSync(path.join(root,"catalog-products.json"),"utf8")).products;
const libraryCode=fs.readFileSync(path.join(root,'server/library-products.mjs'),'utf8').replace(/^import .*?;\n/gm,'').replace(/\bexport (?=(?:const|function|async function))/g,'');
const engineV2Code=fs.readFileSync(path.join(root,'server/engine-v2.mjs'),'utf8').replace(/^import .*?;\n/gm,'').replace(/\bexport (?=(?:const|function|async function))/g,'');
// Only approved concepts reach the Worker; editorial fields used by neither the job nor engine v2 stay out.
const libraryConcepts=JSON.parse(fs.readFileSync(path.join(root,'library/concepts.json'),'utf8')).filter(c=>c.status==='approved').map(({pitch,status,...c})=>c);
fs.writeFileSync(path.join(root,'server/research/public-rules.mjs'),'// Generated from recommendation-rules.js by build-worker.mjs.\nconst window={};\n'+fs.readFileSync(path.join(root,'recommendation-rules.js'),'utf8')+'\nexport const PUBLIC_RULES=window.TRE_REGALI_RULES;\n');
// Mirror stage restrictions from the questionnaire instead of maintaining two lists.
const childStages={};
for(const group of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<div class="interest-group"[^>]*data-audience="earlyChild"[^>]*>[\s\S]*?(?=<div class="interest-group"|<\/fieldset>)/g)){
 const opening=group[0].slice(0,group[0].indexOf('>')),stages=opening.match(/data-stages="([^"]+)"/)?.[1]?.split(' ');
 const area=group[0].match(/name="interest" value="([^"]+)"/)?.[1];
 if(area&&stages)childStages[area]=stages;
 for(const input of group[0].matchAll(/<input[^>]*name="subinterest"[^>]*>/g)){
  const id=input[0].match(/value="([^"]+)"/)?.[1],own=input[0].match(/data-stages="([^"]+)"/)?.[1]?.split(' ');
  if(id)childStages[id]=own||stages;
 }
}
fs.appendFileSync(path.join(root,'server/research/public-rules.mjs'),'\nexport const CHILD_STAGE_RULES='+JSON.stringify(childStages)+';\n');
const researchFiles=['reviews','weighted-ranking','technology-keywords','engine','age-policy','catalog-data','product-identity','product-requirements','research-engine','public-rules','pilot-context','pilot-expansion','pilot-closure-rules','pilot-lexicon-data','pilot-family-reviews','pilot-dictionary','expanded-data','expanded-context','relax-use-context','occasion-use-context','gift-context','intent-search','public-adapter'];
const researchCode='const researchRuntime=(()=>{\n'+researchFiles.map(f=>fs.readFileSync(path.join(root,'server/research/'+f+'.mjs'),'utf8').replace(/^import .*?;\n/gm,'').replace(/\bexport (?=(?:const|function|async function))/g,'')).join('\n')+'\nreturn {publicRecommendation};})();\n';
const worker = `${transportCode}\n${catalogueCode}\n${libraryCode}\n${engineV2Code}\nconst LIBRARY_CONCEPTS=${JSON.stringify(libraryConcepts)};\nconst CURATED=${JSON.stringify(curated)};\n${amazonCode}\n${researchCode}\nconst ASSETS=${JSON.stringify(assets)};
const CONTENT_TYPES={
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".webmanifest":"application/manifest+json; charset=utf-8",
  ".xml":"application/xml; charset=utf-8",
  ".txt":"text/plain; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".ico":"image/x-icon",
  ".woff2":"font/woff2"
};
function extension(pathname){const name=pathname.slice(pathname.lastIndexOf("/")+1);const at=name.lastIndexOf(".");return at<0?"":name.slice(at).toLowerCase()}
function route(pathname){
  let path;
  try{path=decodeURIComponent(pathname)}catch{return null}
  if(path==="/")return "/index.html";
  if(path.endsWith("/")){
    const index=path+"index.html";
    if(ASSETS[index])return index;
  }
  if(ASSETS[path])return path;
  if(!extension(path)&&ASSETS[path+".html"])return path+".html";
  return null;
}
function bytes(base64){const raw=atob(base64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function headersFor(assetPath,status){
  const ext=extension(assetPath),headers=new Headers({
    "Content-Type":CONTENT_TYPES[ext]||"application/octet-stream",
    "X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"strict-origin-when-cross-origin",
    "Vary":"Accept-Encoding"
  });
  if(status===200&&[".woff2",".webp",".png",".jpg",".jpeg",".gif",".ico"].includes(ext))headers.set("Cache-Control","public, max-age=31536000, immutable");
  else if(status===200&&[".css",".js"].includes(ext))headers.set("Cache-Control","public, max-age=3600, must-revalidate");
  else headers.set("Cache-Control","public, max-age=0, must-revalidate");
  if(assetPath==="/sw.js")headers.set("Cache-Control","no-cache");
  return headers;
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    // www and the secondary 3regali.it domain redirect permanently, straight to HTTPS.
    if(["www.3gifts.it","3regali.it","www.3regali.it"].includes(url.hostname.toLowerCase())){
      url.protocol="https:";
      url.hostname="3gifts.it";
      url.port="";
      return new Response(null,{status:301,headers:{Location:url.toString(),"Cache-Control":"public, max-age=3600"}});
    }
    if(url.pathname==="/api/amazon/recommend")return researchRuntime.publicRecommendation(request,env);
    if(url.pathname==="/api/amazon/catalog")return amazonCatalogue(request,env,CURATED);
    if(url.pathname==="/api/amazon/status")return amazonConnection(request,env);
    if(url.pathname==="/api/library/status")return libraryStatus(env,LIBRARY_CONCEPTS);
    if(url.pathname==="/api/v2/recommend")return recommendV2(request,env,LIBRARY_CONCEPTS);
    if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method Not Allowed",{status:405,headers:{Allow:"GET, HEAD"}});
    let assetPath=route(url.pathname),status=200;
    if(!assetPath){assetPath="/404.html";status=404}
    const asset=ASSETS[assetPath];
    if(!asset)return new Response("Not Found",{status:404});
    const body=request.method==="HEAD"?null:(asset.binary?bytes(asset.body):asset.body);
    return new Response(body,{status,headers:headersFor(assetPath,status)});
  },
  async scheduled(event,env,ctx){
    ctx.waitUntil(runLibraryJob(env,LIBRARY_CONCEPTS).then(report=>console.log("library job",JSON.stringify(report))));
  }
};
`;

fs.rmSync(server, { recursive: true, force: true });
fs.mkdirSync(server, { recursive: true });
fs.writeFileSync(path.join(server, "index.js"), worker);
fs.mkdirSync(path.join(out, ".openai"), { recursive: true });
fs.copyFileSync(path.join(root, ".openai", "hosting.json"), path.join(out, ".openai", "hosting.json"));

console.log(`Built Worker with ${Object.keys(assets).length} embedded assets.`);

fs.cpSync(path.join(root,'drizzle'),path.join(out,'.openai','drizzle'),{recursive:true});
