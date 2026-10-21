# Questionario e budget — 24 settembre 2026

## Correzione successiva richiesta dal titolare: fascia intermedia

Questa sezione sostituisce la regola iniziale 60–100% e il ripiego adattivo descritti nello storico sotto.

- Prima ricerca da massimo 150 €: nessuna proposta sotto il 50% del tetto; minimo esplicito, età, note, marketplace, disponibilità e vincoli rimangono applicati.
- Riservata una proposta intermedia tra 50% e 60% del massimo, se pertinente entro il margine di affinità già previsto; viene presentata come seconda quando esiste un'altra proposta. A 500 €: 250–300 € inclusi.
- Il catalogo incompleto produce meno risultati, con avviso della fascia mancante, invece di inserire articoli economici. Le aree scelte vengono coperte quando hanno candidati nella fascia iniziale.
- Affinamenti: prezzi inferiori nuovamente esplorabili, rispettando minimo/massimo, vincoli e assenza di ripetizioni. Sotto 150 € il comportamento precedente è preservato.
- Caso reale tecnologia, adulto, massimo 500 €, minimo zero: prima 450 / 90 / 45 €; ora solo iPhone 15 ricondizionato a 450 € indicativi, con avviso di assenza dell'intermedio. Nessun prezzo corrente Amazon verificato o nuova scheda inventata.
- Fixture dichiarate: con prodotti pertinenti a 320 / 400 / 480 € e candidato a 275 €, la seconda proposta è a 275 €; verificati anche i confini 250 e 300 €, copertura di due interessi, vincoli e affinamenti.
- Test del runtime distribuito con DOM/rete simulati: upper-budget 1.603 controlli / 324 confronti IT/EN; answer-weights 42; routing 12. Nessuna QA visuale browser. Il test pesi usa fixture a 300 € (anziché 100 €) per rimanere nella nuova fascia, mantenendo gli stessi valori attesi per tutti i pesi.

## Storico della prima modifica (superato dove indicato sopra)

Base: versione Sites 75, commit `95234f26b588a70fb8c92651b185d077cefd177c`. Verifica del runtime distribuito con DOM/rete simulati, non test visuale/browser o di carico. Nessun rilevamento di prezzi Amazon correnti.

## Pesi rilevati e preservati

Punti cumulativi, non percentuali:

| Risposta | Peso/regola |
| --- | --- |
| Area d'interesse | +3 per tag; filtro e copertura delle due aree, quando possibile |
| Sottocategoria | +7 effettivi (+3 nell'insieme interessi e +4 dedicati); filtro OR sulle sottocategorie |
| Relazione | +1,5 tag diretto e +1,5 contesto; coppia aggiunge +1,5 per ciascuno dei tag partner/family/home/social |
| Occasione | +1,5 diretto e +1,5 contesto; evento +1,5 per esperienza/giftcard/abbonamento |
| Emozione | +2,5 per ogni segnale corrispondente, quindi cumulativo |
| Età adulta | +0,35 editoriale; per minori idoneità e divieti sono filtri obbligatori |
| Nota libera | +5 per segnale, +2 aggiuntivi da due corrispondenze; richieste/esclusioni attivano anche filtri |
| Destinazione donna/uomo/unisex | Filtro, non bonus |
| Minimo/massimo, esclusioni, consegna, compatibilità | Filtri non compensabili con punti |
| Recensioni | Fino a +4, contributo attuale zero (nessun rating con conteggio utilizzabile) |
| AI | Fino a +5 per posizione, contributo zero (endpoint disattivato) |
| Prospettiva/percorso | Presentazione e motivazioni, nessun cambio della formula |
| Prezzo precedente | 0–2,5; bersaglio 70% fino a 25 €, 60% fino a 75 €, 52% oltre 75 € |

Le note usano un vocabolario locale, non comprensione universale. Più preferenze positive sono generalmente alternative OR, non tutte obbligatorie per ogni prodotto. I vincoli non interpretabili bloccano la ricerca. Il peso cumulativo dipende dai tag: non esiste una ripartizione percentuale fissa.

## Modifica

- Da massimo 150 € incluso, prima ricerca: fascia desiderata 60–100% del tetto, nel rispetto del minimo esplicito.
- Il confronto di prezzo avviene solo tra prodotti ammissibili distanti al massimo 3 punti di affinità dal migliore candidato rimasto. Un segnale forte di nota (+5) o sottocategoria (+7) non viene scavalcato solo per il prezzo.
- All'interno della fascia: affinità + qualità + bonus prezzo fino a 4, saturato all'80% del tetto. Nessun obbligo di spendere tutto.
- Se la fascia manca, soglia adattiva al 75% del massimo disponibile tra i candidati comparabili; questa fascia non viene spacciata per fascia alta del budget.
- Copertura delle due aree e unicità dei concetti preservate. Anche l'unico candidato economico di un'area rimane ammissibile. Se compare un prodotto sotto il 60% del budget, il riepilogo dichiara la copertura insufficiente in IT/EN.
- Sotto 150 €, risultati identici al riferimento nei confronti eseguiti.
- Negli affinamenti il nuovo ordinamento è disattivato: rimangono feedback, esclusioni e limiti. Il motivo prezzo mantiene +4 sotto il 65% e −2 sopra l'85%; le altre direzioni mantengono bonus/penalità originali. Nessuna ripetizione; esaurimento dichiarato; nuova ricerca ripristina la priorità alta.
- Nessun cambiamento a catalogo, tag affiliato `3gifts-21`, Amazon-only, privacy o audience. Aggiornata versione cache degli asset.

## Prima/dopo a parità di risposte

Adulto, amico, compleanno, neutro, unisex, minimo 0, nessuna scadenza, nota o sottocategoria. Importi editoriali indicativi, NON offerte Amazon verificate oggi; ordine delle schede:

| Interessi | Massimo | Prima | Dopo |
| --- | ---: | --- | --- |
| Tecnologia | 75 € | 25 / 45 / 20 € | 25 / 45 / 20 € |
| Audio/intrattenimento | 150 € | 50 / 45 / 25 € | 150 / 70 / 50 € |
| Tecnologia | 500 € | 450 / 25 / 90 € | 450 / 90 / 45 € |
| Tecnologia + cultura | 500 € | 450 / 25 / 4 € | 450 / 90 / 15 € |
| Cultura | 500 € | 4 / 15 / 15 € | 15 / 15 / 15 € |

Audio: dopo compaiono Edifier R1700BT, Fire TV Stick 4K Plus, JBL Go 4. L'area ampia comprende musica e cinema: sottocategorie e note specifiche restringono ulteriormente. In tecnologia iPhone ed Echo Show restano dichiarati ricondizionati.

## Test

- `node tests/upper-budget.cjs --summary`: 324 confronti reali, 1.511 controlli superati, IT/EN; nove budget 15–500 €, interessi singoli/multipli, minimo 0/positivo. Fixture Amazon per fascia alta disponibile, irrilevanza, nota forte, totale oltre tetto, unica alternativa economica. UI simulata: prima ricerca, affinamenti ripetuti, esaurimento, nuova ricerca e traduzioni.
- `node tests/answer-weights.cjs --summary`: 42 controlli superati su pesi, cambi isolati, età/destinatario/esclusioni. In 27 confronti reali a una risposta cambiata, interessi/sottocategorie/note/esclusioni cambiano i risultati; età adulta, emozione e relazione non sempre cambiano il podio, soprattutto con poca scelta.
- Nove suite esistenti superate: amazon-expansion, child-categories (176), delivery-choice (22), iphone-catalog, natural-language-exclusions (100), privacy-consent, relevance-marketplace (296), selected-audio-catalog, worker-routing (12).
- Matrice storica `--quick`: 1.680 profili ranking, 840 UI, 336 disponibilità, 2.688 esclusioni, 13.569 controlli. Stessi 20 fallimenti prima/dopo, nei testi/recuperi attesi per cucina e animali a 15 € senza idee ammissibili. Nessun fallimento aggiuntivo su budget/vincoli.
- Otto altre suite storiche falliscono anche sulla copia intatta precedente: audit-regressions, category-coverage, friends-feedback, high-priority, localization, night-audit-fixes, path-defects, recipient-preference. Stessi primi errori; night-audit-fixes conta 46 prima/dopo. Alcune assunzioni sono obsolete (255 schede, tre risultati garantiti, fixture non Amazon); altri casi richiedono manutenzione separata. Non sono state modificate per mascherare gli esiti.
- Build IT/EN e Worker riuscita; diff senza errori. Pubblicazione da confermare separatamente nello stato Sites.

## Limiti aperti

139 schede Amazon: 69 link prodotto diretti, 69 ricerche escluse dai risultati e un servizio. Zero offerte complete verificate; endpoint prezzi, monitoraggio e AI vuoti. Si rispettano importi noti/indicativi, ma il totale finale Amazon non è garantibile senza dati aggiornati comprensivi degli extra.

Nel profilo adulto unisex analizzato cultura arriva a 15 €, beauty offre una proposta da 8 €, audio a 150 €. Nessun algoritmo può produrre tre regali da 300–500 € in queste aree senza ampliare il catalogo. Nessun prodotto, prezzo, recensione o disponibilità è stato inventato.
