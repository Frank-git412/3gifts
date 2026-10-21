# M3 quarto blocco lessicale

9 ottobre 2026. Il blocco consolida K005, K006, K008 e K024 sulle quattro associazioni canoniche esistenti. L'inventario e i metadati delle query mantengono i sinonimi IT/EN e l'identificativo originale, senza aggiungere query o famiglie. Le equivalenze complete nel motore restano da verificare. K021 viene collegata come fonte lessicale alla regola tech-family-photos, già attiva nel blocco 3.

## Cinque espressioni e tre proprietà

K026, K029 e K033 condividono il requisito senza profumo; K030 usa senza risciacquo; K036 usa non grassa. Le note IT/EN producono requisiti espliciti, non esclusioni generiche del prodotto. Il targeting delle ricerche skincare incorpora i requisiti; micellare e crema mani possono ottenere una query iniziale dedicata. Restano sei query iniziali e dodici massime. Le parole nella query non costituiscono evidenza.

Il candidato skincare deve dichiarare la proprietà nel titolo o nelle caratteristiche. Dati mancanti, negazione della proprietà, variante opzionale o testo contrastante determinano lo scarto. Delicato non equivale a senza profumo; assorbimento rapido e oil-free non dimostrano non grassa. Più attributi devono essere verificati insieme. Il precedente vincolo di esclusione dei profumi richiede ora una dichiarazione di assenza anche per skincare; le altre categorie mantengono i controlli esistenti.

Le caratteristiche della scheda selezionata vengono conservate fino al filtro nel browser: una proprietà documentata solo nelle caratteristiche non si perde dopo la selezione server. Nessuna modifica visiva al questionario. Le note originali restano locali; vengono trasmessi i requisiti interpretati. Il parser rimane conservativo: descrizioni ambigue possono essere escluse o richiedere chiarimento. Non è una certificazione degli ingredienti o dell'idoneità personale.

## Verifiche riproducibili

- 169 test server PASS nelle dodici suite eseguite, inclusi 21 del nuovo blocco. Il numero si riferisce al gruppo eseguito oggi e non va sommato al checkpoint storico di 178.
- 12 scenari del nuovo test del questionario: entrambe le lingue dell'interfaccia, note IT/EN, evidenza solo nelle caratteristiche, nessuna evidenza, mantenimento del requisito al raffinamento.
- Prova del Worker assemblato con servizio Amazon simulato.
- Preflight dei 120 input originali: 118 pianificabili, T32 e T36 richiedono chiarimenti; hash del manifest invariato.

Comandi: node --test tests/m3-block4.mjs tests/m3-block3.mjs tests/m3-block2.mjs tests/pilot-dictionary.mjs tests/pilot-context.mjs tests/research-quality-rules.mjs tests/research-public.mjs tests/research-primary-age.mjs tests/research-age-review.mjs tests/refinement-context.mjs tests/event-personal.mjs tests/selection-diagnostics.mjs; node tests/m3-block4-ui.cjs; node tests/worker-research.mjs; node tests/m3-block4-audit.mjs.

## Stato residuo

Le 36 espressioni della ricerca sono ora registrate come 4 sinonimi consolidati, 5 collegamenti a regole esistenti, 5 espressioni con controlli proprietà e 22 candidate ancora da implementare. I controlli delle cinque espressioni condividono tre proprietà: non sono cinque nuove regole relazione/effetto. Base invariata a 353 associazioni e 65 famiglie; 33 famiglie con relazione/effetto, 38 includendo occasioni. Restano equivalenza inglese completa, copertura delle famiglie, gli otto casi di proprietà già preparati, deduplicazione opere/edizioni/saghe e M5. Nessuna nuova ricerca Amazon reale, misura di disponibilità o volume di ricerca. Non è stato eseguito un nuovo collaudo visivo su browser reale.
