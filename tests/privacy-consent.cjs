const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', process.argv[2] || '');
const consentSource = fs.readFileSync(path.join(ROOT, 'consent.js'), 'utf8');
const STORAGE_KEY = '3gifts.analytics-consent';

class FakeElement {
  constructor(tagName, owner) {
    this.tagName = tagName.toUpperCase();
    this.owner = owner;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.hidden = false;
    this.parentNode = null;
    this.id = '';
    this.className = '';
    this.innerHTML = '';
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(child) {
    child.parentNode = this;
    this.children.push(child);
    if (child.id) this.owner.ids.set(child.id, child);
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }
  querySelector() { return null; }
}

function makeRuntime(savedValue = null, now = 2_000_000_000_000, options = {}) {
  const values = new Map();
  if (savedValue !== null) values.set(STORAGE_KEY, JSON.stringify(savedValue));
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const document = {
    documentElement: { lang: options.language || 'it' },
    readyState: 'complete',
    currentScript: { src: 'https://3gifts.example/consent.js' },
    ids: new Map(),
    listeners: new Map(),
    dispatched: [],
    createElement(tagName) { return new FakeElement(tagName, this); },
    getElementById(id) { return this.ids.get(id) || null; },
    querySelector(selector) {
      if (selector !== 'script[data-3gifts-analytics="umami"]') return null;
      return this.head.children.find(child => child.attributes['data-3gifts-analytics'] === 'umami') || null;
    },
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    dispatchEvent(event) { this.dispatched.push(event); return true; }
  };
  document.head = new FakeElement('head', document);
  document.body = new FakeElement('body', document);
  const windowEvents = new Map();
  const window = { navigator: options.navigator || {}, addEventListener: (type, callback) => windowEvents.set(type, callback) };
  const context = {
    window,
    document,
    localStorage: storage,
    URL,
    JSON,
    Number,
    CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    Date: class FixedDate extends Date { static now() { return now; } }
  };
  vm.createContext(context);
  vm.runInContext(consentSource, context, { filename: 'consent.js' });
  return { context, document, values, windowEvents, advance: ms => now += ms };
}

function trackerCount(runtime) {
  return runtime.document.head.children.filter(child => child.attributes['data-3gifts-analytics'] === 'umami').length;
}

let runtime = makeRuntime();
assert.equal(trackerCount(runtime), 0, 'Umami must not load before a choice');
assert.equal(runtime.document.getElementById('privacyPreferences')?.hidden, false, 'the choice panel must be visible without a saved preference');

runtime.context.window.GiftsPrivacy.accept();
assert.equal(trackerCount(runtime), 1, 'accepting must load one Umami script');
assert.equal(JSON.parse(runtime.values.get(STORAGE_KEY)).choice, 'accepted');
assert.equal(runtime.document.getElementById('privacyPreferences').hidden, true);

runtime.context.window.GiftsPrivacy.reject();
assert.equal(trackerCount(runtime), 1, 'already loaded script stays inert; rejection must not reinitialize tracking');
assert.equal(runtime.context.window.GiftsPrivacy.hasAnalyticsConsent(), false);
assert.equal(runtime.context.window.giftsBeforeSend('event', { url: '/' }), false, 'final sending gate rejects after withdrawal');
assert.equal(JSON.parse(runtime.values.get(STORAGE_KEY)).choice, 'rejected');

runtime = makeRuntime({ choice: 'accepted', savedAt: 1_999_999_000_000, version: 1 });
assert.equal(trackerCount(runtime), 1, 'a current saved consent must load Umami');

runtime = makeRuntime({ choice: 'rejected', savedAt: 1_999_999_000_000, version: 1 });
assert.equal(trackerCount(runtime), 0, 'a saved rejection must keep Umami disabled');
assert.equal(runtime.document.getElementById('privacyPreferences'), null, 'a current saved choice must not reopen the panel');

runtime = makeRuntime({ choice: 'accepted', savedAt: 1_900_000_000_000, version: 1 });
assert.equal(trackerCount(runtime), 0, 'expired consent must not load Umami');
assert.equal(runtime.values.has(STORAGE_KEY), false, 'expired consent must be removed');
assert.equal(runtime.document.getElementById('privacyPreferences')?.hidden, false, 'expired consent must prompt again');

const htmlFiles = [];
for (const name of fs.readdirSync(ROOT)) if (name.endsWith('.html')) htmlFiles.push(path.join(ROOT, name));
for (const name of fs.readdirSync(path.join(ROOT, 'guide'))) if (name.endsWith('.html')) htmlFiles.push(path.join(ROOT, 'guide', name));
if (fs.existsSync(path.join(ROOT, 'en'))) {
  for (const name of fs.readdirSync(path.join(ROOT, 'en'))) if (name.endsWith('.html')) htmlFiles.push(path.join(ROOT, 'en', name));
  for (const name of fs.readdirSync(path.join(ROOT, 'en', 'guide'))) if (name.endsWith('.html')) htmlFiles.push(path.join(ROOT, 'en', 'guide', name));
}
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  assert(!/fonts\.(googleapis|gstatic)\.com/.test(html), `${file} must not call Google Fonts`);
  assert(!/cloud\.umami\.is\/script\.js/.test(html), `${file} must not hardcode Umami`);
  assert(html.includes('consent.js'), `${file} must load consent.js`);
  assert(html.includes('consent.css'), `${file} must load consent.css`);
  assert(html.includes('fonts.css'), `${file} must load self-hosted fonts`);
  assert(html.includes('data-privacy-preferences'), `${file} must expose privacy preferences`);
}

console.log(`Privacy checks passed for ${htmlFiles.length} pages.`);

const valid = { choice: 'accepted', savedAt: 1_999_999_000_000, version: 1 };
for (const navigator of [{ doNotTrack: '1' }, { doNotTrack: 'yes' }, { globalPrivacyControl: true }]) {
 const r = makeRuntime(valid, 2_000_000_000_000, { navigator });
 assert.equal(trackerCount(r), 0, 'browser privacy signal blocks script request');
 assert.equal(r.context.window.GiftsPrivacy.hasAnalyticsConsent(), false);
}
for (const saved of [
 {...valid,savedAt:2_000_000_000_001}, {...valid,version:99}, {...valid,choice:'unknown'}
]) assert.equal(trackerCount(makeRuntime(saved)),0,'invalid/future consent fails closed');
runtime=makeRuntime();
runtime.context.window.GiftsPrivacy.accept();
const script=runtime.document.head.children[0];
assert.equal(script.dataset.autoTrack,'false');
assert.equal(script.dataset.beforeSend,'giftsBeforeSend');
runtime.context.window.GiftsPrivacy.reject();
let attempted=0;
runtime.context.window.umami={track(){attempted++;return Promise.resolve()}};
script.onload();
assert.equal(attempted,0,'late loading cannot send a pageview after rejection');
runtime.context.window.GiftsPrivacy.accept();
assert.equal(attempted,1,'reaccepting can send the first pageview');
runtime.context.window.GiftsPrivacy.accept();
assert.equal(attempted,1,'repeated accept cannot duplicate a pageview');
assert.equal(trackerCount(runtime),1,'reaccepting does not inject a second tracker');
const clean=runtime.context.window.giftsBeforeSend('event',{url:'https://site.example/en/?note=secret#details',referrer:'https://search.example/results?q=private'});
assert.equal(clean.url,'/en/');
assert.equal(clean.referrer,'https://search.example');
assert.equal(runtime.context.window.giftsBeforeSend('identify',{}),false,'no identity tracking');
runtime.advance(184*86400000);
assert.equal(runtime.context.window.GiftsPrivacy.hasAnalyticsConsent(),false,'consent can expire while page stays open');
assert.equal(runtime.context.window.giftsBeforeSend('event',{}),false);
runtime=makeRuntime(valid);
runtime.values.set(STORAGE_KEY,JSON.stringify({...valid,choice:'rejected'}));
runtime.windowEvents.get('storage')({key:STORAGE_KEY});
assert.equal(runtime.context.window.GiftsPrivacy.hasAnalyticsConsent(),false,'revocation propagates between tabs');
runtime=makeRuntime(valid);
runtime.values.clear();
runtime.windowEvents.get('storage')({key:null});
assert.equal(runtime.context.window.GiftsPrivacy.hasAnalyticsConsent(),false,'clearing storage revokes consent');
runtime=makeRuntime(null,2_000_000_000_000,{language:'en-US'});
assert(runtime.document.getElementById('privacyPreferences').innerHTML.includes('Reject analytics'));
assert(runtime.document.getElementById('privacyPreferences').innerHTML.includes('/en/cookie.html'));
assert(!runtime.document.getElementById('privacyPreferences').innerHTML.includes('Rifiuta'));
console.log('Late-load, withdrawal, reacceptance, expiry, cross-tab, DNT/GPC, URL minimization and English consent checks passed.');
