# Collegamenti Amazon — 16 settembre 2026

Aggiornamento parziale: 23 dei 94 link di ricerca sostituiti con un collegamento canonico basato su un ASIN identificato su Amazon.it. Per 20 prodotti è stata individuata una pagina prodotto nell'indice; per 3 l'ASIN era indicato nel risultato Amazon.it ma il motore restituiva la home. Il browser disponibile non può aprire Amazon.it per un blocco della policy URL. Nessun controllo HTTP/live delle offerte viene dichiarato.

Il catalogo rimane di 240 proposte: 120 Amazon (48 link prodotto/ASIN, 71 ricerche ancora irrisolte, 1 Kindle Unlimited) e 120 Etsy. Le 71 ricerche sono ancora presenti e segnalate in Excel: non considerare completata la richiesta di sostituirle tutte.

`catalog-asin-links-2026-09-16.json` registra corrispondenze, fonti, varianti e tutti gli ID ancora irrisolti. `node resolve-amazon-links.mjs` applica le sole corrispondenze revisionate, senza modificare offerte, prezzi, rating, categorie o filtri. Se si esegue lo script storico di riequilibrio del catalogo, riapplicare successivamente questa risoluzione.

Sono stati precisati i nomi delle varianti individuate. Per Il Piccolo Principe, Maus e Braun Silk-épil è segnalata la necessità di ricontrollare il prezzo della specifica edizione/modello. I prezzi registrati restano stime precedenti, non nuovi prezzi rilevati.

## Verifiche

- Catalogo, runtime e `dist/catalog.js` sincronizzati; nessun ASIN duplicato nei 48 collegamenti diretti.
- 120 Amazon / 120 Etsy, ID, prezzi, rating, categorie e tag preservati.
- `tests/high-priority.cjs`: 103 controlli, 14.400 profili con offerte verificate, 14.400 esplorazioni e 2.304 profili con esclusioni; zero errori.
- `tests/audit-regressions.cjs`: 112 controlli, zero errori.
- `stress-catalog-real.mjs`: 4.428 esplorazioni iniziali senza carenze; persistono 12 affinamenti con meno di 3 idee su 864. Le 72 simulazioni di indisponibilità non presentano carenze. Nessun errore di validazione.
- Excel: aggiornamento per ID, riepiloghi ricalcolati, nessun errore di formula rilevato e controlli di conservazione dei campi non interessati.

Questi sono test locali della logica, non test del traffico reale o del browser. Le offerte verificate restano zero: identificare un ASIN non conferma prezzo, disponibilità, variante acquistabile o consegna. Il recupero senza offerte e l'esplorazione esplicita restano attivi secondo le regole esistenti.
