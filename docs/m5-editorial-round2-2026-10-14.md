# M5 Secondo blocco editoriale

Confronto operativo con v134, commit 1876858085e63a478465e2e91a83083b2332c85a. La baseline ufficiale di accettazione rimane v113.

## Correzioni

- Le query anniversario descrivono usi concreti. Lettura cerca storie di amicizia/ricordi per un amico, amore/ricordi per partner o coppia, famiglia/ricordi negli altri casi. Non deduce un interesse per la fotografia dalla sola categoria Lettura.
- Tecnologia ricerca visualizzazione di foto. Skincare ricerca set di cura personale senza imporre una routine di coppia.
- Le ipotesi di uso documentano le proprietà di partenza e ricevono mezzo credito nel solo segnale occasione. Non attivano la priorità evento e non cambiano `occasionCoverage`, i requisiti obbligatori o la priorità personale.
- Le maschere da softair, protezione e costume sono escluse dallo skincare. Segnalibri generici e personalizzati condividono una funzione e occupano una sola idea.
- La verifica della prima pubblicazione (v135) ha individuato un articolo per il 60° compleanno nel profilo 35–54 anni e due libri della stessa serie con separatore a trattino. La correzione finale confronta le età esplicite di compleanno con la fascia del destinatario e riconosce anche questa notazione della serie.
- Nessun ASIN è favorito o escluso tramite regole dedicate. Nessuna modifica visuale.

## Protocollo diagnostico

Sei profili scelti prima della prova: L06, L12, T06, T12, S06, S12 del manifest congelato. Due per categoria, compleanno con preferenza relax e anniversario. Confronto dal vivo precedente e successivo al rilascio, con cattura integrale delle risposte. Amazon può cambiare risultati e prezzi fra le acquisizioni: questo confronto misura il servizio osservato, non isola causalmente l'algoritmo.

Un prodotto identico nello stesso profilo viene votato una volta. Prodotti uguali con prezzo o testo diverso rimangono schede distinte. Ordine casuale entro profilo e versione nascosta. Il file da compilare contiene solo profilo, dati osservati e campi per voto 1–5, motivo, vincoli e commento. Nessun voto storico viene riportato come nuovo voto. Chiave separata dal file di compilazione.

Le 120 pianificazioni sono confrontate e sei replay anniversario/personale sono ripetuti sullo stesso pool congelato. Il pool viene fornito a tutte le query: il replay non dimostra la qualità del recupero reale. Le prove automatiche sono registrate in m5-editorial-round2-validation.json.

M5 rimane aperta. Questo blocco serve alla calibrazione. L'accettazione richiede il protocollo di 120 scenari, nuovi casi indipendenti, almeno 85% di voti 4–5 complessivi e 80% per categoria, confronto con v113, verifica dei vincoli e copertura 0/1/2/3 separata. Browser mobile non verificato in questa sessione.
