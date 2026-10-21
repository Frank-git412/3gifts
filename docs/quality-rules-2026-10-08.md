# Regole di qualità — 8 ottobre 2026

Revisione del motore: 20261008-4. Interfaccia e dizionario invariati.

## Compatibilità del destinatario

Usare titolo, caratteristiche e dati della variante disponibili; la query non prova il destinatario del prodotto. Distinguere donna, uomo, unisex esplicito e non determinato. Ignorare le formulazioni riconosciute che indicano chi fa il regalo. Segnali maschili e femminili contraddittori non dimostrano unisex. Escludere una variante esplicitamente incompatibile. Per abbigliamento, gioielli e accessori personali, escludere anche il destinatario indeterminato; un libro o una lampada generici non richiedono un genere. Non dedurre gusti dal genere. L'API attuale fornisce titolo e caratteristiche: altri dettagli di variante sono utilizzabili se presenti, non vengono inventati.

## Pertinenza d'uso

Applicare i requisiti prima del punteggio lessicale e delle preferenze. Una ricerca di sciarpe d'abbigliamento esclude giocoleria, danza e uso didattico. Una ricerca di borse personali esclude buste commerciali monouso/compostabili. Una ricerca di lettura generica esclude oggetti a forma di libro e manuali per giochi di ruolo non richiesti, oltre a testi scolastici/professionali espliciti, quaderni da compilare e oggetti che includono un ebook; una richiesta esplicita di testi scolastici rimane possibile. I controlli coprono formulazioni italiane e inglesi riconosciute, non costituiscono comprensione semantica universale.

## Diversità

Portafogli e portacarte appartengono alla stessa funzione, indipendentemente dalla famiglia della query. Anche sciarpe, borse, puzzle, kit di esperimenti e romanzi sono raggruppati per funzione. Creme viso descritte come antirughe/giorno/notte condividono la funzione; i kit skincare occupano anche le funzioni di siero/crema/maschera/contorno occhi dichiarate nel titolo. Conservare un turno per ogni interesse selezionato con candidati validi, poi privilegiare sottocategorie non rappresentate. Non riempire un posto con una seconda idea equivalente: restituire meno di tre proposte se necessario. Conservare esclusioni ASIN, genitore, budget e contesto nell'affinamento.

Il recupero mantiene le query alternative esistenti e il limite di 12 richieste: non indebolisce i vincoli per raggiungere tre proposte.

## Verifica

`node scripts/build-worker.mjs`

`node --test tests/research-quality-rules.mjs tests/refinement-context.mjs tests/research-live-regressions.mjs tests/research-public.mjs`

`node tests/research-questionnaire.cjs`

I dodici nuovi test includono coppie accettato/rifiutato e i casi osservati nell'audit M1; gli altri diciotto test verificano integrazione e regressioni. Sono controlli deterministici, distinti dalle successive richieste reali Amazon. La build propaga le regole comuni al browser e al Worker e aggiorna la versione degli asset per evitare cache obsolete.
