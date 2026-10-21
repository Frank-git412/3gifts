# TreRegali

## Catalogo Amazon bambini — 20 settembre 2026

Il catalogo include ora 13 prodotti Amazon con link diretto e adeguatezza d'età documentata per le fasce 0–6 e 7–12. Per 0–6 il dettaglio facoltativo del questionario continua a distinguere meno di un anno, 1–2 e 3–6 anni; nessun prodotto viene proposto fuori dall'intervallo verificato. Prezzi, disponibilità, immagini, recensioni e tempi non vengono presentati come correnti: i valori di prezzo sono esclusivamente editoriali per il filtro del budget e vanno confermati su Amazon. Il tracking ID `3gifts-21` viene aggiunto al clic.

La fonte riproducibile è `child-amazon-products.json`; `node scripts/sync-child-amazon-products.mjs` aggiorna `catalog-products.json` e `catalog.js` senza duplicare gli ID 401–413.

## Pubblicazione corrente

Il sito completo è online su 3gifts.it, come richiesto dal titolare dopo il periodo di manutenzione. Pubblicare il Worker in **dist/** generato da `node scripts/build-worker.mjs`; **build/** contiene solo la vecchia pagina di manutenzione.

## Due prodotti richiesti dal titolare — 20 settembre 2026

Catalogo: 242 prodotti. Aggiunti Apple iPhone 15 128 GB giallo ricondizionato (B0CVJ8716B) e cover TAURI trasparente per iPhone 15 (B0DMT42CFL). Budget massimo e affinamento estesi a 500 €. Importi editoriali indicativi per il matching: 450 € e 15 €, non prezzi correnti verificati. Il tracking Amazon esistente viene applicato normalmente.

Percorso riproducibile: Amico/a → Su misura per chi lo riceve → Compleanno → 35–54 anni → Tecnologia e gaming / Tecnologia → Essere utile → Fino a 500 € → Nessuna scadenza precisa. Nessuna esclusione; nota: «Ama la tecnologia e cerca un iPhone 15 ricondizionato oppure una cover MagSafe compatibile.»

La cover richiede il modello iPhone 15 nella nota; entrambi vengono esclusi quando è indicato un altro modello. Nessun bonus per ASIN o marketplace. Il controllo `node tests/iphone-catalog.cjs` esegue il percorso e verifica budget, esclusioni, compatibilità e link sul codice distribuito con una simulazione DOM (non browser QA).

## Versione bilingue — 17 settembre 2026

Il sito è ora 3Gifts, con italiano alla radice e inglese americano in `/en/index.html`. Il selettore 🇺🇸 EN / 🇮🇹 IT è presente su tutte le 42 pagine. La lingua non cambia il mercato: catalogo Italia, EUR e link venditore originali. Non dedurre domanda commerciale USA dalle sole 55 visualizzazioni riferite dal titolare.

Eseguire `node scripts/build-worker.mjs` dopo ogni modifica: `dist/` è l’output pubblicato, non va modificato a mano. Il comando genera prima tutte le pagine bilingui e poi il Worker che serve gli asset e applica il redirect HTTP permanente da `www.3gifts.it` al dominio canonico, conservando percorso e parametri. I testi inglesi sono in `locales/`; la logica del questionario resta in `app.js` e quella dei vincoli in `recommendation-rules.js`. Il generatore crea l’app inglese dagli stessi sorgenti e mantiene identità, vincoli e ordinamento dei prodotti. Aggiornare insieme le informative IT e `locales/legal-en.mjs`. Le 15 guide hanno controparti editoriali inglesi e sono tutte raggiungibili dall’indice.

Controlli correnti: `node tests/localization.cjs`, `node tests/privacy-consent.cjs dist`, `node tests/path-defects.cjs`, `node tests/audit-regressions.cjs`, `node tests/high-priority.cjs`, `node tests/budget-timing-matrix.cjs`. Sono controlli statici e con simulazione DOM/rete, non QA visuale in browser.

Il sito mostra automaticamente tre idee indicative se non vi sono tre offerte verificate ma tutti i vincoli riconosciuti possono essere rispettati. Prezzo totale, disponibilità e consegna non sono garantiti. Note di sicurezza o vincoli ambigui bloccano i risultati anche in inglese. Umami è opzionale, bloccato prima del consenso e dopo la revoca, con invio manuale e controllo finale prima di ogni evento.

Restano da verificare fuori dal codice: contratto/ruoli e conservazione delle metriche e dei log Sites, identità e condizioni del fornitore della casella email, eventuali reindirizzamenti Aruba, condizioni aggiornate dei venditori e un futuro catalogo USA. La revisione tecnica non certifica la conformità legale. La visibilità del sito non è stata ampliata.

MVP mobile-first per suggerire tre regali in base a interessi, occasione, effetto desiderato, budget e tempi.

## Stato dopo l’audit del 16 settembre 2026

La selezione verificata è separata dall’esplorazione esplicita di idee indicative. Il catalogo attuale non contiene ancora offerte con costo totale e consegna certificati dal feed: il sito non le presenta come verificate. Schema, limiti e test correnti sono descritti in [VERIFICATION.md](VERIFICATION.md). Eseguire `node tests/high-priority.cjs` per le regressioni sulle funzioni distribuite; le vecchie suite di seguito restano parziali.

## Affiliazioni

Amazon Associates Italia è attivo con Tracking ID `3gifts-21`. Il codice aggiunge il tag soltanto ai collegamenti `amazon.it`; Etsy, Audible e gli altri servizi restano non affiliati finché non viene configurato il relativo programma. La homepage, i contenuti editoriali, i termini e l’informativa commerciale dichiarano l’affiliazione Amazon e precisano che le commissioni non influenzano il ranking.

## Catalogo Amazon e AI

La versione ibrida funziona anche senza servizi esterni. La nota libera viene analizzata localmente e influenza il punteggio; prezzi e recensioni non verificati non vengono mostrati come dati reali.

Per attivare i prodotti Amazon reali, configurare `amazonProductsEndpoint` con un endpoint server-side collegato alla Creators API, che ha sostituito la Product Advertising API. La risposta attesa è `{ products: [{ asin, title, price, rating, reviewCount, imageUrl, url, tags }] }`.

Per l'analisi generativa, configurare `aiRankingEndpoint`. Riceve profilo e candidati e restituisce `{ signals, rankedAsins, reasons }`. Le chiavi Amazon e AI devono restare esclusivamente sul server.

## Controllo settimanale prezzi e disponibilità

Il sito supporta il controllo Apps Script del catalogo senza rallentare il questionario:

1. aggiungere `catalog-monitor-webapp.gs` allo stesso progetto che contiene `Controllo prezi.gs`;
2. eseguire una volta `controllaPrezziEDisponibilita()` e `creaTriggerSettimanale()`;
3. distribuire il progetto Apps Script come Web App in sola lettura;
4. inserire l'URL `/exec` in `catalogHealthEndpoint` dentro `config.js`.

Il sito applica soltanto controlli risalenti a non più di otto giorni. Un articolo esplicitamente non disponibile o con link rotto/non valido viene escluso dal ranking. Se l'endpoint è lento o irraggiungibile, il questionario continua con il catalogo curato e mantiene l'avviso di verifica sul negozio. I link Amazon di ricerca restano nel dataset storico ma sono esclusi dai risultati: il questionario pubblica soltanto deep link a una scheda prodotto. Per riattivarli occorre sostituirli con ASIN/deep link o con dati della Creators API.

## Strategia multi-store

L'architettura deve poter associare ogni proposta al relativo negozio e link affiliato. Le integrazioni considerate sono Amazon Associates, Etsy tramite Awin, eBay Partner Network e, in una fase successiva, AliExpress. Prezzi, immagini, recensioni, disponibilità e tempi di consegna devono arrivare esclusivamente da API o feed autorizzati: niente scraping delle pagine dei negozi.

Per i contenuti audio a pagamento, la prima versione include collegamenti ordinari ad Audible. `Audiolibri e podcast` è un interesse del questionario e Audible deve comparire solo quando è coerente con il profilo. Eventuali affiliazioni future non potranno attribuirgli vantaggi nel ranking.

## Eventi analytics

Umami Cloud viene caricato solo dopo il consenso e registra visualizzazioni di pagina e questi eventi aggregati:

- `questionnaire_started`
- `questionnaire_step_completed` (chiave e posizione del passaggio, senza risposte)
- `questionnaire_step_timing` (chiave del passaggio, secondi trascorsi, posizione e direzione; mai le risposte)
- `questionnaire_completed`
- `recommendation_zero_results`
- `zero_results_recovery` (`budget` o `date`)
- `recommendations_viewed`
- `refinement_started`
- `recommendations_refined`
- `external_link_click`

Le risposte, la nota libera, il budget e i nomi dei prodotti non vengono inviati ad Umami. Il tracker rispetta “Do Not Track” ed esclude query string e frammenti URL. La preferenza è conservata nel local storage per sei mesi e può essere modificata dal piè di pagina.

## Lancio responsabile

Privacy Policy, Cookie Policy, termini e informativa sui collegamenti esterni sono allineati alla configurazione di lancio. Il questionario e il ranking restano locali nel browser, i font sono ospitati dal sito e Umami è subordinato al consenso. La consegna non viene garantita dall'MVP: il visitatore viene inviato al negozio per la conferma.


## Catalogo multi-marketplace, senza quote

Il dataset storico contiene 240 proposte, oggi ripartite incidentalmente in 120 Amazon e 120 Etsy. Questa proporzione non è un obiettivo e non entra mai nel punteggio: i tre prodotti con la compatibilità più alta vincono anche quando appartengono tutti allo stesso marketplace. Per le verifiche sul motore effettivo eseguire `node stress-catalog-real.mjs` e `node tests/relevance-marketplace.cjs`. Fonti, sostituzioni e relativi limiti sono documentati in `STRESS_TEST_REPORT.md` e `catalog-rebalance-2026-09-16.json`.

## Preferenza per i prodotti — 20 settembre 2026

Nella prima schermata è disponibile la scelta facoltativa “Da donna”, “Da uomo”, “Unisex / non so”, riferita sempre a chi riceve. La risposta non cambia gli interessi né i punteggi: esclude i prodotti destinati all’altro genere. Senza risposta restano i prodotti unisex o senza destinazione esplicita; gli orologi con variante non classificata sono sospesi fino alla verifica. La regola si applica a tutte le relazioni, entrambi i percorsi, risultati iniziali, recupero e ricalcolo. `recipientTarget` conserva la classificazione esplicita del catalogo/feed; in sua assenza si leggono solo le indicazioni esplicite del titolo, senza dedurre gusti da genere o categoria. Nessuna risposta è aggiunta agli eventi analytics.

Verifica mirata: `node tests/recipient-preference.cjs`, in italiano e inglese con DOM simulato.

## Correzioni feedback amici — 20 settembre 2026

- Prima domanda: età, con fasce non sovrapposte 0–6, 7–12, 13–17, 18–34, 35–54, 55+ e non indicata. Tutti i minori saltano relazione e prospettiva; il profilo riguarda chi riceve. Le vecchie risposte adulte vengono disattivate, il progresso passa a cinque step e torna a sette per gli adulti. Vino/birra non è selezionabile per minori. Nascita indica esplicitamente un regalo al genitore nel percorso adulto.
- Il catalogo 0–12 non è ancora verificato. Avviso iniziale ed esito specifico; nessun riempimento con prodotti adulti. Il contratto `ageSuitability` richiede minYears/maxYears, verified e sourceUrl HTTPS e deve coprire l’intera fascia. Anche una certificazione 3+ non copre automaticamente 0–6.
- Barra per il massimo preservata; minimo facoltativo 0–500 EUR a incrementi di 5, mai superiore al massimo. Entrambi vincolano offerte, idee indicative, recupero e affinamento. Un nuovo massimo inferiore al minimo viene respinto, non corretto silenziosamente.
- Selezione per pertinenza senza quote di marketplace, massimo un prodotto per famiglia concettuale. Medagliette, targhe, collane, portafogli e varianti simili non riempiono le tre posizioni. Una o due proposte valide sono mostrate come tali; zero mantiene un percorso di recupero. Non promettere sempre tre risultati.
- Classificazione conservativa degli oggetti compatti estesa a tracolle, mini treppiedi, gioielli, matite, spugne e piccole pochette. Ingombri sconosciuti restano esclusi quando il vincolo è attivo. Rimossa la falsa associazione beauty di portafogli e gioielli durante la normalizzazione.
- Schede mobile a larghezza piena, titoli brevi e nome originale espandibile. Nessuna foto inventata: se manca l’immagine, sparisce il riquadro e si rimanda alla pagina del venditore. Le immagini autorizzate sono ancora da integrare.
- Nuovi controlli: `node tests/friends-feedback.cjs`; matrice ridotta `node tests/budget-timing-matrix.cjs --quick` (sette budget, dodici aree, dieci tempistiche, entrambi i percorsi). I test precedenti sono aggiornati al contratto di risultati parziali distinti, senza rilassare i vincoli. Controlli con DOM/rete simulati; non costituiscono QA visuale su iPhone.

### Categorie dedicate 0–6 e 7–12

Il questionario ha ora otto categorie dedicate per ciascuna fascia bambini, con sottocategorie separate da quelle generali. Per 0–6 è disponibile un dettaglio facoltativo (<1, 1–2, 3–6): restringe sia le categorie sia l'intervallo richiesto alla verifica di idoneità del prodotto. Le risposte incompatibili vengono cancellate quando cambia l'età; il percorso 13+ mantiene le categorie generali e le regole già presenti per i minori. La ricerca, i limiti delle fonti e le istruzioni di catalogazione sono in `CHILD_CATEGORIES_RESEARCH.md`. Il catalogo bambini rimane in preparazione: questa modifica non aggiunge disponibilità o prodotti verificati.

### Copertura degli interessi e cambio categoria

La selezione riserva un candidato pertinente a ciascuna area richiesta, dopo tutti i filtri di idoneità, poi completa fino a tre idee distinte in ordine di rilevanza. Le preferenze di prezzo puramente editoriali non possono eliminare la sola alternativa di un'area. Le aree senza proposte compatibili vengono segnalate nel riepilogo.

L'affinamento distingue i commenti sulle proposte (es. “mi proponi solo libri”) dalle preferenze del destinatario. Un cambio categoria esplicito esclude l'area nominata oppure quella dominante nelle proposte attualmente visualizzate; l'esclusione persiste negli affinamenti successivi. Se non restano alternative nelle aree scelte, il sito lo dice e conserva i risultati precedenti senza presentarli come nuovi. Il nuovo motivo “Le proposte sono tutte della stessa categoria” rende disponibile questa scelta anche senza nota libera.

“Creme e sieri” è separato da “Accessori beauty e trucco”; le note riconoscono skincare, creme e sieri in italiano e inglese. Nessun accessorio viene riclassificato come crema. Il catalogo skincare resta da ampliare con prodotti reali verificati. `tests/category-coverage.cjs` verifica il caso segnalato, i vincoli, la copertura, la lingua e l'affinamento con l'app distribuita in un simulatore DOM/rete; non è un test visivo in browser.

### Verifica personale della consegna

Quando esistono idee compatibili ma manca la conferma della consegna urgente, il recupero offre un pulsante esplicito per controllarla sul venditore. Solo quel clic imposta `allowUnknownDelivery` insieme a `allowUnverified`; la scadenza richiesta resta nel profilo e nel riepilogo. I tempi già verificati e incompatibili restano esclusi, così come età, interessi, fascia di spesa ed esclusioni non rispettati. Una nuova ricerca azzera la scelta; gli affinamenti della ricerca corrente la mantengono. Per 0–6 senza fase precisa è disponibile il ritorno diretto alla domanda sull'età. Verifiche: `tests/delivery-choice.cjs` (DOM/rete simulati, IT/EN).

### Inserimento candidati Amazon — 21 settembre 2026

Il catalogo contiene 258 record: 138 Amazon e 120 Etsy. I prodotti Amazon con ASIN sono 66; gli altri record non sono tutti prodotti direttamente raccomandabili. Degli 80 candidati specifici nel piano di ricerca, 48 erano già presenti; aggiunti LONPOO LP-42MB (B0DD733WQG), Edifier R1700BT (B00MXY21LW) e Fosi Audio BT20A (B07BQC7GNL), con identità riletta sulle pagine Amazon. Rimangono fuori quattro ASIN con modello/edizione non risolti e 25 modelli ancora senza ASIN.

I tre nuovi prodotti sono riservati agli adulti. L'amplificatore richiede una dichiarazione positiva di possesso di diffusori passivi nella nota; la sola passione musicale non basta. I due diffusori appartengono alla stessa famiglia concettuale, quindi non occupano due delle tre idee. Importi editoriali di fascia (75/150/150 EUR), disponibilità sconosciuta: non sono offerte Amazon correnti. Conferma di prezzo, variante e consegna resta sul venditore. Nessuna recensione o immagine copiata dalla ricerca.

Corrette la condizione ricondizionata dell'Echo Show 5 e l'esclusione dai minori della SwissCard con lama. Aggiornate 17 evidenze d'identità senza trasformarle in verifiche dell'offerta. `tests/selected-audio-catalog.cjs` controlla percorsi IT/EN, link affiliati, fascia di spesa, età, compatibilità e distinzione delle idee nel runtime distribuito con DOM/rete simulati.

## Catalogo esclusivamente Amazon — 21 settembre 2026

Su richiesta del titolare: 138 schede Amazon nel catalogo attivo, 120 Etsy conservate in `catalog-etsy-paused.json` fuori dal pacchetto pubblico. Il filtro di ammissibilità e gli ingressi dei feed rifiutano Etsy e altri venditori anche nei recuperi e negli affinamenti. La pertinenza continua a ordinare i prodotti Amazon; nessun vincolo di qualità, prezzo, età o consegna viene allentato per completare tre risultati. Il servizio Kindle Unlimited rimane presente ma non viene forzato oltre il filtro esistente dei link prodotto.


## Lotto Amazon del 21 settembre 2026

139 schede attive Amazon, 69 con ASIN documentato, 69 collegamenti di ricerca non ammessi nei risultati e 1 servizio Kindle Unlimited. Aggiunti Clementoni 17042 e 17103 per la fascia 1–2 anni; prezzi di riferimento 9,90 EUR osservati sul produttore, non su Amazon. Risolti i link delle schede JBL Go 4 e Catit Flower Fountain; quest’ultima richiede una dichiarazione esplicita di possesso di un gatto. UNO classico ricondotto a una sola scheda con ASIN alternativo tracciato. 0 nuove offerte complete verificate. Le restanti identità del lotto restano nella ricerca, senza abilitazione automatica. L’obiettivo 4.040 non è raggiunto.

## Amazon Creators API — 1 ottobre 2026

Il questionario legge GET `/api/amazon/catalog`: prezzi EUR, immagini e disponibilità dei soli ASIN presenti nel catalogo curato. Le risposte e le note del questionario restano nel browser. Il server aggiorna in lotti fino a 10 ASIN, con richieste distanziate, token riutilizzato e risultati tenuti in memoria per 15 minuti. I prodotti esplicitamente indisponibili sono esclusi; i dati mancanti o gli errori lasciano le schede editoriali identificate come indicative. Una risposta parziale non equivale alla verifica dell’intero catalogo. Nessun dato API viene salvato in browser storage o nel repository.

Il prezzo API non è una certificazione del totale comprensivo di spedizione né della consegna: non produce un `verifiedOffer`. Età, restrizioni, interessi e budget continuano a essere applicati dal motore esistente. La ricerca libera SearchItems di nuovi prodotti non è inclusa in questa integrazione.

Verifiche: `node tests/amazon-catalog.mjs`, `node tests/amazon-questionnaire.cjs`, `node tests/worker-routing.cjs`. Le suite storiche audit-regressions, high-priority e path-defects falliscono anche sul commit base f911f59 (rispettivamente numero schede affinamento, dimensione catalogo e vecchio testo budget); non rappresentano regressioni introdotte qui.
