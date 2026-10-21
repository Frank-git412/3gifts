# M3 quinto blocco: le 22 espressioni residue

9 ottobre 2026. Implementate K003, K004, K009–K017, K019, K020, K022, K023, K025, K027, K028, K031, K032, K034 e K035. Il registro delle 36 espressioni ora comprende 4 sinonimi consolidati, 5 collegamenti contestuali e 27 espressioni con controlli di proprietà, di cui 22 in questo blocco. Nessuna candidata rimane pendente in quell’elenco. M3 nel suo insieme resta in corso.

## Comportamento

Le formulazioni revisionate italiane e inglesi diventano requisiti soltanto quando espresse positivamente nelle note. Le query derivate usano le famiglie già qualificate; i limiti rimangono sei query iniziali e dodici complessive. La richiesta specifica non ripiega su famiglie diverse della stessa sottocategoria. Altre sottocategorie/interessi selezionati mantengono spazio; più attributi della stessa famiglia si combinano, famiglie diverse sono alternative.

Titolo e caratteristiche della singola scheda devono provare il tipo di prodotto e ogni attributo richiesto. Mancanza, negazione, variante opzionale o contraddizione bloccano il candidato. La query, il marchio e la nota dell’utente non sono prove delle proprietà del prodotto.

| Gruppo | Espressioni | Distinzioni verificate |
|---|---:|---|
| Lettura | 6 | Natura come contenuto; romanzo di viaggio diverso da guida; luce esplicitamente portatile; elastico, illustrazioni e carta plastificata verificati separatamente. |
| Tecnologia | 9 | Cavo integrato o retrattile diverso da porta; 45 W su singola uscita e protocollo PD; USB audio diverso da USB di ricarica; riduzione rumore sul microfono diversa da ANC; invio smartphone diverso da remoto; HDMI 4K/30 Hz; lettori SD e microSD distinti dalle schede incluse. |
| Skincare | 7 | Crema-schiuma; ceramidi nella formula del prodotto; azione struccante; applicazione viso e occhi; uso quotidiano; rapido assorbimento. Nessuna deduzione da marchio, età, genere o tipo di pelle. |

## Compatibilità delimitata

Le nove espressioni tecniche richiedono informazioni esplicite sul destinatario prima della ricerca. Il percorso attuale dei cavi retrattili è USB-C; il percorso 45 W richiede USB-C e USB PD 45 W dichiarati. Le cuffie richiedono collegamento e sistema operativo compatibili, con USB cablata quando il collegamento è USB. Gli hub richiedono USB-C e sistema operativo; il caso HDMI è delimitato a uscita video USB-C 4K a 30 Hz dichiarata. Una menzione generica di USB-C non dimostra supporto video e una scheda 4K non dimostra 60 Hz.

I due casi cornice sono delimitati a Frameo, app/invio foto gratuiti esplicitamente dichiarati, Android o iOS compatibile e disponibilità WiFi/internet. Modelli, app, condizioni economiche o capacità non documentati non vengono equiparati automaticamente. Questi limiti mantengono verificabile il sottoinsieme supportato; non certificano ogni dispositivo o configurazione.

Le note originali restano nel browser. Il server riceve identificativi di requisiti e capacità enumerate. Dopo la selezione, le caratteristiche e la classificazione del prodotto restano disponibili per il ricontrollo nel browser.

## Correzioni e verifiche

Il blocco corregge un limite del checkpoint v121: la selezione server conservava le caratteristiche, ma la serializzazione finale HTTP le eliminava. I test precedenti aggiravano quel passaggio; la precedente dichiarazione di copertura completa del trasporto era troppo ampia. Il nuovo test attraversa il Worker assemblato, il JSON reale e la schermata del questionario. Corretto anche il controllo generico delle negazioni: frammenti come «no» dentro «microfono» o «noise» non costituiscono negazioni.

- 93 test specifici del blocco, con coppie IT/EN, assenza, contraddizione, oggetto sbagliato, caratteristiche simili e contesto non dichiarato.
- 169 test server di regressione delle dodici suite precedenti.
- 44 scenari completi IT/EN delle 22 espressioni nel questionario, attraverso il Worker assemblato e la risposta HTTP, più 44 verifiche di raffinamento. 44 chiamate Amazon simulate, nessuna reale.
- Regressioni linguistiche: 100 asserzioni; questionario IT/EN; localizzazione di 42 pagine e 720 profili, con 3.662 asserzioni.
- Manifest dei 120 input immutato: 118 pianificabili; T32 e T36 richiedono chiarimenti.

Comandi principali: `node scripts/build-worker.mjs`; `node --test tests/m3-block5.mjs`; `node tests/m3-block5-ui.cjs`; `node tests/m3-block5-audit.mjs`. Le suite precedenti sono elencate nel documento del blocco 4; il suo audit fotografa lo stato storico e non va rigenerato con il nuovo registro.

## Residuo M3

La base rimane a 353 associazioni e 65 famiglie. La copertura relazione/effetto è 33/65, oppure 38/65 includendo occasioni ordinarie: i nuovi controlli non sono nuovi bonus o famiglie. Restano copertura delle altre famiglie, equivalenza inglese completa oltre le formulazioni delimitate, riconciliazione degli otto casi di proprietà già preparati, deduplicazione di opere/edizioni/saghe e la valutazione su prodotti reali prevista in M5. Nessuna misura di domanda o disponibilità Amazon e nessun nuovo collaudo visivo su browser reale.
