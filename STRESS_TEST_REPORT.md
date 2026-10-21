# TreRegali: riequilibrio e verifiche del 16 settembre 2026

## Aggiornamento successivo: problemi ad alta priorità

Le correzioni descritte in `VERIFICATION.md` sono integrate con il catalogo 120/120. La suite `tests/high-priority.cjs` usa il codice distribuito e distingue offerte verificate da esplorazione esplicita di idee. Il catalogo non contiene ancora gli oggetti `offer` necessari per attestare costo totale, disponibilità e consegna: in modalità verificata il recupero è l'esito previsto, non vengono inventate tre offerte. La suite di catalogo sotto riportata ora verifica la copertura **in esplorazione esplicita**, non l'acquistabilità entro prezzo/data. Il nuovo output in `catalog-validation-results.json` lo indica nel campo `validationMode`.

Sono corretti perdita delle esclusioni, corrispondenze parziali delle note, budget fuori intervallo/passo, urgenza permissiva, attributi sconosciuti trattati come assenza di vincoli, risposte inviate ad analytics e pannelli `hidden` sovrascritti dal CSS. I controlli sono funzionali/statici, non un collaudo visuale o un test di utenti simultanei.

Il catalogo contiene 240 proposte: 120 Amazon (incluso Kindle Unlimited) e 120 Etsy. Ogni macroarea conserva 20 proposte e al massimo quattro sottocategorie. I risultati del questionario non hanno quote per marketplace.

## Verifiche eseguite

`node stress-catalog-real.mjs` esegue direttamente `app.js`, `catalog.js` e `catalog-health.js` in un contesto JavaScript con DOM minimo. Non replica l'algoritmo di ranking. Non è un test visuale nel browser o un test di carico del server.

- Tre tranche di 20, 20 e 19 sostituzioni: 4.428 profili iniziali per tranche, nessun profilo con meno di tre risultati ai prezzi registrati.
- Verifica finale: 4.428 profili iniziali, 864 passaggi complessivi di selezione/affinamento, 72 simulazioni con il 30% dei prodotti economici indisponibile, 48 profili con esclusioni esplicite.
- I 4.428 profili includono le due prospettive, tutte le macroaree, cinque fasce di età, sei toni e budget di 15, 20, 50, 100 e 300 euro; includono anche sottocategorie singole e tutte le coppie di macroaree. Non sono tutte le combinazioni possibili del questionario.
- Nessun risultato oltre il budget registrato, escluso dalle preferenze, ripetuto nello stesso gruppo o già scartato negli affinamenti.
- Nessuna carenza iniziale nelle 72 simulazioni di indisponibilità. Tra 10 e 16 prodotti per area hanno un prezzo registrato non superiore a 15 euro.
- Cambiare soltanto l'etichetta del marketplace non cambia le scelte del motore. Il riequilibrio riguarda il catalogo, non impone quote nelle raccomandazioni.
- ID, nomi e URL distinti, URL HTTPS dei marketplace, corrispondenza tra sorgenti e file pubblicati. I 59 ID rimossi non sono stati riutilizzati.

## Correzione di pertinenza e limite residuo

Il ranking precedente allargava la scelta a tutto il catalogo quando rimanevano meno di tre prodotti pertinenti. Ora mantiene il filtro degli interessi e usa il recupero già presente nel sito.

Con questo controllo più rigoroso, 12 passaggi sui 864 testati non trovano tre alternative dopo ripetuti scarti. Il sito invita a modificare budget o direzione invece di riempire il gruppo con articoli estranei. Nei 18 profili iniziali che includono un prodotto fuori dalla macroarea principale, tale prodotto condivide una sottocategoria esplicitamente selezionata.

## Limiti commerciali

I test usano i prezzi del catalogo, inclusi quelli indicativi. Non certificano prezzo finale, variante, spese di spedizione, disponibilità, consegna o qualità commerciale delle inserzioni. Le soglie basse di alcune inserzioni Etsy già presenti possono riferirsi a varianti o quantità minime e restano da verificare.

Dei 59 nuovi Amazon, 25 hanno pagine prodotto italiane individuate e 34 link di ricerca per modello esatto. Per 10 sono stati osservati rating e quantità di valutazioni nell'indice web; per gli altri questi valori restano non verificati. Le valutazioni non sono acquisti. Non è dimostrata un'ottimizzazione globale del rapporto qualità/volume per tutti i prodotti. I rating di ricerca sono conservati per revisione e non alimentano il ranking né le stelle mostrate sul sito.

Il monitor settimanale richiede ancora `catalogHealthEndpoint`; il tag affiliato richiede ancora il codice Amazon Associates. Entrambi sono attualmente segnaposti o vuoti. La disponibilità non è pertanto verificata automaticamente in produzione.

Risultati numerici: `catalog-validation-results.json`. Storico delle sostituzioni e fonti: `catalog-rebalance-2026-09-16.json`.
