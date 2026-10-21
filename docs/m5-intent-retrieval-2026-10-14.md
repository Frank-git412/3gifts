# M5 Ricerca guidata dal bisogno

Intervento successivo ai 22 voti del secondo blocco. La v136 aveva 8/18 posizioni con voto 4–5; queste percentuali non sono nuovi voti della versione modificata.

## Diagnosi osservata

- L12 eseguiva due query anniversario, poi libri di fotografia. Tre volumi specialistici bastavano per interrompere la ricerca. Il segnale generico “ricordi” non dimostra interesse fotografico.
- T06 cercava un lettore ebook con una frase lunga, poi computer, lettore, supporto per computer e smartphone. La ricerca si fermava prima delle alternative cinema e tablet.
- I titoli a pari punteggio venivano ordinati per ASIN dopo la copertura delle sottocategorie: tre libri dello stesso argomento potevano prevalere su alternative di altre famiglie.
- Alcuni libri non dichiarano il genere nei dati disponibili. Questo limite resta aperto: non si deduce che siano romanzi dalla sola classificazione Book.

## Modifica

Riordino delle sole query già ammesse. Relax e anniversario hanno precedenza per famiglie con un uso plausibile; fotografia, cucina e bisogni telefonici espliciti conservano la priorità pertinente. Le altre famiglie restano nel pool qualificato, entro il limite operativo di 12 ricerche.

Due ricerche concise per relax nelle sottocategorie Lettura e Tecnologia precedono le alternative generiche. La ricerca non termina prima di questi tentativi; le query duplicate identiche a un tentativo sono riutilizzate una sola volta. Le parole cercate non diventano prove delle proprietà dei prodotti.

A parità di priorità evento, pertinenza, punteggio, completezza e copertura della sottocategoria, viene favorita una famiglia non ancora rappresentata in Lettura/Tecnologia. Non è un divieto sui libri specialistici. I cinque pesi M2 restano invariati. Nessuna lista di ASIN, nessun divieto per età sui telefoni semplici, nessuna modifica visuale.

Quando tre proposte di Lettura appartengono alla stessa famiglia, sono consentiti al massimo due tentativi aggiuntivi verso famiglie diverse. La verifica live della v137 aveva mostrato un arresto con tre libri illustrati. Il limite complessivo resta di 12 ricerche e la pertinenza conserva precedenza sulla varietà.

## Verifiche

3.129 test server esistenti e 14 nuovi test mirati superati, più 11 comandi di verifica del questionario e del Worker. Verifiche nuove: interesse fotografico positivo/negato, età adulte diverse, richieste di contenuto obbligatorie, evidenza separata dalle query, varietà a pari punteggio e preservazione delle associazioni.

Controllo dei piani sui 120 scenari congelati e replay ripetuto sui sei profili del secondo blocco più sei nuovi profili diagnostici. Il replay fornisce lo stesso pool a ogni query e non misura il recupero reale; i casi nuovi non sono un holdout finale. Non vengono assegnati voti automatici. Browser mobile non verificato in questa sessione.

Resta necessaria la valutazione umana dei risultati del nuovo rilascio e, dopo la calibrazione, il confronto indipendente con v113 per l'accettazione M5.
