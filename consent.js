(() => {
  "use strict";
  const KEY = "3gifts.analytics-consent", VERSION = 1, MAX_AGE = 183 * 86400000;
  const en = document.documentElement?.lang?.startsWith("en");
  const tr = (it, english) => en ? english : it;
  const scriptUrl = document.currentScript?.src || "";
  const cookieUrl = scriptUrl ? new URL(en ? "en/cookie.html" : "cookie.html", scriptUrl).href : "cookie.html";
  let choice = null, savedAt = 0, pageviewSent = false, returnFocus = null;
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "null"), age = Date.now() - value?.savedAt;
      if (value?.version === VERSION && ["accepted", "rejected"].includes(value.choice) && Number.isFinite(age) && age >= 0 && age < MAX_AGE) return value;
      localStorage.removeItem(KEY);
    } catch {}
    return null;
  }
  function allowed() {
    const age = Date.now() - savedAt;
    const nav = window.navigator || {};
    return choice === "accepted" && age >= 0 && age < MAX_AGE && !["1", "yes"].includes(nav.doNotTrack || window.doNotTrack) && nav.globalPrivacyControl !== true;
  }
  // Final gate covers revocation while the script is loading. Autotracking is off.
  window.giftsBeforeSend = (type, payload) => {
    if (!allowed() || type !== "event") return false;
    const clean = { ...payload };
    for (const key of ["url", "referrer"]) {
      if (clean[key]) { try { const u = new URL(clean[key], window.location?.href || scriptUrl); clean[key] = key === "referrer" ? u.origin : u.pathname; } catch { clean[key] = ""; } }
    }
    return clean;
  };
  function pageview() {
    if (!allowed() || pageviewSent || !window.umami?.track) return;
    pageviewSent = true;
    try { window.umami.track()?.catch?.(() => {}); } catch {}
  }
  function load() {
    if (!allowed()) return;
    if (document.querySelector('script[data-3gifts-analytics="umami"]')) { pageview(); return; }
    const script = document.createElement("script");
    script.src = "https://cloud.umami.is/script.js";
    script.async = true;
    script.dataset.websiteId = "21e4b44c-09bd-42d5-b142-a7974acd4e4b";
    script.dataset.autoTrack = "false";
    script.dataset.doNotTrack = "true";
    script.dataset.excludeSearch = "true";
    script.dataset.excludeHash = "true";
    script.dataset.beforeSend = "giftsBeforeSend";
    script.setAttribute("data-3gifts-analytics", "umami");
    script.onload = pageview;
    script.onerror = () => script.remove();
    document.head.append(script);
  }
  function status() {
    if (choice === "accepted" && !allowed()) return tr("Analytics disattivati dalle impostazioni privacy del browser o per consenso scaduto.", "Analytics are off because of your browser privacy settings or expired consent.");
    if (choice === "accepted") return tr("Stato attuale: analytics accettati.", "Current choice: analytics accepted.");
    if (choice === "rejected") return tr("Stato attuale: analytics rifiutati.", "Current choice: analytics rejected.");
    return tr("Nessuna preferenza analytics è ancora salvata.", "No analytics preference has been saved yet.");
  }
  function showPreferences(focus = true) {
    let banner = document.getElementById("privacyPreferences");
    if (!banner) {
      banner = document.createElement("section");
      banner.id = "privacyPreferences";
      banner.className = "privacy-banner";
      banner.setAttribute("role", "region");
      banner.setAttribute("aria-label", tr("Preferenze privacy", "Privacy preferences"));
      banner.innerHTML = `<div class="privacy-banner__layout"><div><strong class="privacy-banner__title">${tr("Analytics sotto il tuo controllo", "Your analytics choice")}</strong><p>${tr("Usiamo Umami, senza cookie, solo se lo accetti. Le risposte e le note restano nel browser.", "We use Umami, cookie-free, only if you accept. Your answers and notes stay in your browser.")} <a href="${cookieUrl}">${tr("Leggi la Cookie Policy", "Read the Cookie Policy")}</a>.</p><span class="privacy-banner__status" data-consent-status></span></div><div class="privacy-banner__actions"><button class="privacy-banner__button privacy-banner__button--reject" type="button" data-consent-choice="rejected">${tr("Rifiuta analytics", "Reject analytics")}</button><button class="privacy-banner__button privacy-banner__button--accept" type="button" data-consent-choice="accepted">${tr("Accetta analytics", "Accept analytics")}</button></div></div>`;
      document.body.append(banner);
    }
    const node = banner.querySelector("[data-consent-status]");
    if (node) node.textContent = status();
    banner.hidden = false;
    if (focus) { returnFocus = document.activeElement; banner.querySelector("button")?.focus({ preventScroll: true }); }
  }
  function setChoice(value) {
    if (!["accepted", "rejected"].includes(value)) return;
    choice = value; savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify({ choice, savedAt, version: VERSION })); } catch {}
    // Keep a loaded tracker inert after rejection; never duplicate its initialization.
    if (choice === "accepted") load();
    const banner = document.getElementById("privacyPreferences");
    if (banner) banner.hidden = true;
    returnFocus?.focus?.({ preventScroll: true }); returnFocus = null;
    document.dispatchEvent(new CustomEvent("3gifts:analytics-consent", { detail: { choice } }));
  }
  function refresh() {
    const value = read(); choice = value?.choice || null; savedAt = value?.savedAt || 0;
    if (choice === "accepted") load();
    if (!choice) showPreferences(false);
    else { const banner = document.getElementById("privacyPreferences"); if (banner) banner.hidden = true; }
  }
  function init() {
    refresh();
    document.addEventListener("click", event => {
      if (event.target.closest?.("[data-privacy-preferences]")) { event.preventDefault(); showPreferences(); return; }
      const button = event.target.closest?.("[data-consent-choice]");
      if (button) setChoice(button.dataset.consentChoice);
    });
    window.addEventListener?.("storage", event => { if (event.key === KEY || event.key === null) refresh(); });
    window.addEventListener?.("pageshow", refresh);
  }
  window.GiftsPrivacy = { accept: () => setChoice("accepted"), reject: () => setChoice("rejected"), showPreferences, hasAnalyticsConsent: allowed };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
