# M5 — Ricerche anniversario, 14 ottobre 2026

Baseline: v132, commit 110d0b31cdaa3e7b09556dc1984c27c2926a7d28.

La prova del 13 ottobre restituiva 0/9 proposte con evidenza dell’occasione. Le query sommavano famiglia, descrizione dell’uso, occasione ripetuta e relazione: per Lettura la prima famiglia era fotografia. Il recupero generico poteva quindi completare la ricerca con tre corsi fotografici.

Le query anniversario riservano ora due varianti brevi per ambito: libri illustrati/fotografia, cornici digitali, set crema viso/maschere viso. Ogni variante deriva da una famiglia già qualificata e conserva requisiti e compatibilità. Le esclusioni possono rimuoverla; la priorità personale e le richieste esplicite mantengono la precedenza prevista. Prima si riservano gli ambiti, poi le seconde varianti. Restano massimo 12 ricerche e 75 secondi. I termini cercati non diventano prove sul prodotto, e le regole di evidenza editoriale non sono state allargate.

La risposta API aggiunge `occasionCoverage`: supporto assente, parziale, completo, nessun prodotto o occasione non prioritaria. Questo diagnostico non certifica il gradimento. Non cambia la grafica del questionario.

Un test con metadati incoerenti ha inoltre riprodotto una cornice digitale classificata come libro. Un dispositivo esplicito nel titolo, in assenza di un titolo che identifica un libro/manuale, non può più sfruttare la classificazione Book per entrare nella ricerca libraria.

Validazione: 3.106 test server e 11 comandi questionario/Worker superati; zero chiamate Amazon reali nei test. Nessuna sessione browser. Il controllo dei piani sui 120 scenari mantiene profilo, analisi delle note, blocchi e limite delle query; cambiano soltanto 15 piani anniversario. Sei replay mirati (L12/T12/S12 e varianti personali), ciascuno ripetuto per entrambi i motori, cambiano soltanto L12. Il pool congelato è associato artificialmente a tutte le query: non prova la nuova capacità di recupero né la qualità editoriale. Nessun nuovo replay completo dei 120 scenari viene dichiarato.

La nuova prova pubblica sulla baseline v132 è stata interrotta al primo caso: HTTP 503 causato da Amazon 429 dopo due tentativi al catalogo. Il ciclo non continua sugli altri casi. I limiti personali Amazon rimangono una dipendenza aperta; non sono dedotti dal tetto applicativo.

M5 rimane aperta: servono prova reale completata, nuovi voti sulla versione aggiornata (85% complessivo, 80% per categoria e miglioramento sulla baseline), verifica completa dei vincoli e collaudo mobile. I 39 voti storici sono dati di calibrazione, non accettazione di questa versione. Le evidenze definitive della pubblicazione e della prova successiva saranno conservate insieme al report M1–M7.

## Controesempi reali successivi alla v133

La prova pubblica v133 ha completato 6 casi, 18 proposte, 19 chiamate Amazon e 5 riusi della cache. I controlli di budget, duplicati ASIN e affiliazione erano superati, ma la revisione delle schede ha trovato: uno scrapbook con pagine nere e libro degli ospiti fra i libri illustrati; uno smartphone che dichiara «regalo per i bambini» alla fine del titolo fra i prodotti per adulti; una maschera per dispositivi UFO senza prova di uso indipendente. L'unico supporto di occasione rilevato su 9 proposte era sullo scrapbook: non è un miglioramento valido.

La correzione successiva esclude album da comporre e libri degli ospiti dall'intento di lettura, conserva le guide illustrate allo scrapbooking, riconosce il destinatario bambino anche alla fine del titolo dei dispositivi ed esige uso indipendente documentato per maschere esplicitamente abbinate a un dispositivo. Le nuove regole hanno test italiani e inglesi, inclusi casi positivi. Il controllo offline finale ripete gli stessi 120 piani e sei replay contro la v132; non costituisce un confronto reale completo dei due motori.

Validazione finale dopo le correzioni delle schede reali: 3.111 test server e gli stessi 11 comandi questionario/Worker, tutti superati. Il replay finale conferma gli stessi risultati del replay v133 sul pool congelato; i tre controesempi sono conservati nelle risposte reali v133 e coperti dai test aggiunti. Nessuna nuova prova browser.
