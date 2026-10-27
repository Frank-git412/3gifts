window.TRE_REGALI_CONFIG = {
  // Tracking ID Amazon Associates Italia. Viene aggiunto soltanto ai link amazon.it.
  amazonAffiliateTag: "3gifts-21",
  locale: "it-IT",
  currency: "EUR",
  // Endpoint server-side autorizzato che interroga Amazon Creators API.
  // Ricerca per criteri strutturati; note e data precisa restano nel browser.
  // Engine v2 (idea library) is opt-in with ?engine=v2 until it replaces the keyword engine.
  // Engine v3 (Claude picks among real candidates) is opt-in with ?engine=ai: only it receives the note.
  amazonProductsEndpoint: typeof location === "undefined" ? "/api/amazon/recommend" : /(?:^|[?&])engine=ai(?:&|$)/.test(location.search) ? "/api/v3/recommend" : /(?:^|[?&])engine=v2(?:&|$)/.test(location.search) ? "/api/v2/recommend" : "/api/amazon/recommend",
  // Endpoint catalogo unificato (Amazon, Etsy e altri partner autorizzati).
  // Ogni prodotto può includere imageUrl, imageSource e imageUpdatedAt.
  catalogProductsEndpoint: "",
  // Web App Apps Script che pubblica l'ultimo controllo settimanale.
  // I controlli più vecchi di 8 giorni non modificano prezzo o disponibilità.
  catalogHealthEndpoint: "",
  catalogHealthMaxAgeHours: 192,
  catalogHealthTimeoutMs: 4500,
  // Endpoint server-side per l'analisi generativa della nota e il riordino dei risultati.
  // Le chiavi AI devono restare sul server e non vanno mai inserite in questo file.
  aiRankingEndpoint: ""
};
