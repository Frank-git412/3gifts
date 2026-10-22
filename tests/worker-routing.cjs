const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
// Stands in for Cloudflare's asset storage: serves the built files from dist/.
const env = {STATIC: {async fetch(request) {
  const file = path.join(__dirname, "..", "dist", decodeURIComponent(new URL(request.url).pathname));
  return fs.existsSync(file) && fs.statSync(file).isFile() ? new Response(fs.readFileSync(file)) : new Response("Not Found", {status: 404});
}}};

(async () => {
  const worker = (await import("../dist/server/index.js?test=" + Date.now())).default;
  const blockedSearch=await worker.fetch(new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile:{ageRange:'adult',interests:['culture'],subinterests:['books'],budget:60,minBudget:30},constraints:{needsClarification:true}})}),{});
  assert.equal(blockedSearch.status,200);
  const blockedBody=await blockedSearch.json();assert.equal(blockedBody.method,'research-20261007');assert.equal(blockedBody.searched,0);

  const redirect = await worker.fetch(new Request("https://www.3gifts.it/guide?monitor=1"), env);
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), "https://3gifts.it/guide?monitor=1");

  const home = await worker.fetch(new Request("https://3gifts.it/"), env);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /^text\/html/);
  assert.match(await home.text(), /Tre idee\./);

  const guide = await worker.fetch(new Request("https://3gifts.it/guide"), env);
  assert.equal(guide.status, 200);
  assert.match(await guide.text(), /Guide regalo/);

  const english = await worker.fetch(new Request("https://3gifts.it/en/"), env);
  assert.equal(english.status, 200);
  assert.match(await english.text(), /Three ideas\./);

  const sitemap = await worker.fetch(new Request("https://3gifts.it/sitemap.xml"), env);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<urlset/);

  const missing = await worker.fetch(new Request("https://3gifts.it/not-a-real-page"), env);
  assert.equal(missing.status, 404);

  console.log("Worker routing: 12 assertions passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
