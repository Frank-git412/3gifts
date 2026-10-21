# Metodo pubblico 3Gifts — 7 ottobre 2026

Il motore del Laboratorio è integrato nell'interfaccia pubblica esistente. Il questionario, il DOM delle schede, CSS e immagini restano invariati. L'endpoint principale è POST /api/amazon/recommend. La vecchia libreria editoriale resta disponibile per le guide; non riempie i risultati se Amazon non risponde.

## Provenienza

- Sorgente pubblica precedente: b99f1fd6b277fc29ae28596df8d57945099d677a, versione Sites 95.
- Motore Laboratorio collaudato: 544136c8efbdaca18aec346b121ec09f1ca80497.
- Snapshot del vocabolario compilato: server/research/catalog-data.mjs, versione 1.2, 2.449 parole, 28 categorie e 88 sottocategorie. Non è una nuova verifica Trends né un elenco di volumi mensili.
- Importate le correzioni per scrivanie scambiate per computer, dock SATA scambiati per hub, età minima dichiarata e supporti computer duplicati.

## Adattamento al sito pubblico

Il browser trasforma la nota con il parser esistente. Invia solo criteri strutturati, connessioni esplicitamente dichiarate, eventuale modello iPhone riconosciuto e codici delle proposte precedenti. La nota integrale e la data precisa non sono inviate. Relazione e occasione producono modificatori delle ricerche Amazon e preferenze editoriali; prospettiva e percorso esplorativo restano gestiti nell'interfaccia. I sei effetti del questionario orientano la priorità delle parole senza prevalere sulle esclusioni.

Le categorie e sottocategorie sono validate rispetto all'età. Le fasce adulte pubbliche non vengono rinominate. Budget minimo e massimo sono vincolanti; da un massimale di 150 euro si parte dalla metà del massimo nella prima ricerca. Negli affinamenti vale il minimo esplicito dell'utente. Requisiti tecnici ignoti non vengono dedotti dal sesso o dall'età.

Le esclusioni del questionario e delle note, preferenza di variante, tipo richiesto e vincoli specifici sono controllati prima della selezione. Vincoli non interpretabili o di sicurezza non verificabili bloccano la ricerca. Esperienze e prodotti digitali non vengono sostituiti automaticamente con oggetti.

Per 0–6 è necessaria una fase (già presente nel questionario). Per i minori di 13 anni si richiede un'età minima esplicita non superiore all'inizio della fascia selezionata. Un intervallo esplicito più stretto della fascia viene escluso. Il testo non certifica l'idoneità: resta la verifica delle avvertenze del produttore.

La selezione controlla ASIN, link Amazon Italia, prezzo EUR e disponibilità restituiti dall'API, pertinenza del prodotto e requisiti testuali, quindi diversifica categorie, famiglie e ASIN padre. Voto e numero di recensioni non sono collegati e non sono usati per ordinare. Spedizione e arrivo entro la data non sono verificati. Prezzo finale, variante e idoneità restano da confermare su Amazon.

## Esecuzione e limiti operativi

Fino a 6 ricerche iniziali e 12 totali, entro 75 secondi; massimo 4 richieste attive per istanza. Le chiamate Amazon sono serializzate per istanza e distanziate di almeno 1,1 secondi. Cache in memoria delle sole risposte a query prodotto per 60 secondi (massimo 64 voci), nessuna persistenza di profili o note. Il limite per istanza non equivale a una quota globale tra istanze.

In caso di errore viene usata la schermata di recupero esistente. Risultati parziali sono indicati; non si reintroducono prezzi editoriali per raggiungere tre schede. Le credenziali di produzione e il tag 3gifts-21 restano sul server.

## Verifiche riproducibili

- node scripts/build-worker.mjs
- node --test tests/research-public.mjs tests/research-live-regressions.mjs
- node tests/research-questionnaire.cjs
- node tests/worker-routing.cjs
- node tests/privacy-consent.cjs
- node tests/localization.cjs

Confronto sorgenti: index.html e tutti i 16 file CSS/immagine di primo livello sono identici al commit pubblico precedente. Le pagine informative IT/EN e la finestra “Come funziona” descrivono il metodo attuale. La verifica dell'interfaccia è strutturale e tramite esecuzione del JavaScript con DOM simulato; non viene presentata come collaudo visuale in un browser.

## Correzione affinamento e contesto — revisione 20261007-2

Il feedback del 7 ottobre alle 23:08 ha evidenziato due problemi. L'affinamento aggiungeva `funny/social` (e analoghe etichette editoriali) ai requisiti obbligatori, benché tali etichette non fossero presenti nei risultati Amazon. Inoltre, banalità e prodotto posseduto escludevano automaticamente intere famiglie. Ora gli stili orientano query e preferenze, gli ASIN e le varianti padre già mostrate restano esclusi, e le famiglie viste ricevono una priorità minore. L'esclusione completa di una famiglia si applica alla scelta esplicita di un formato differente. Le note e le esclusioni restano vincoli separati.

Il riferimento al modulo viene conservato prima dell'attesa, perché `event.currentTarget` nel browser torna nullo dopo il gestore sincrono. Il pulsante indica la ricerca in corso. La selezione di un'altra categoria non esclude tutte le categorie in caso di pari rappresentanza. La soglia della metà del budget vale per la prima ricerca; negli affinamenti si conserva il minimo esplicito dell'utente.

`gift-context.mjs` associa parole editoriali alle cinque relazioni e alle nove occasioni. Queste opzioni controllate vengono inviate al server e diventano modificatori delle ricerche Amazon, ad esempio `regalo laurea per collega`. Nessuna misurazione Trends è attribuita alle combinazioni generate. Per ogni area viene riservata una ricerca contestuale, poi seguono le parole qualificate della categoria: se il contesto restringe troppo i risultati, le query di base mantengono la pertinenza senza cambiare i vincoli.

La corrispondenza del prodotto viene sempre controllata sulla parola di categoria originaria. A parità di pertinenza, i riscontri testuali del destinatario e dell'occasione assegnano 2 punti ciascuno, l'effetto 3; una famiglia nuova nell'affinamento riceve 4 punti. Questi sono pesi editoriali, non probabilità o indicatori di qualità. Recensioni ancora non collegate. La risposta API espone le parole effettivamente cercate per rendere verificabile l'influenza delle risposte; la grafica non mostra dettagli tecnici.

Verifiche aggiuntive: `node --test tests/refinement-context.mjs`, `node tests/research-questionnaire.cjs` (tre affinamenti IT/EN e durata reale di currentTarget), `node tests/worker-research.mjs` (richieste Amazon contestuali nel Worker compilato).

### Riscontri del collaudo live — revisione 20261007-3

Il flusso amico/compleanno, libri e skincare, 30–60 euro ha prodotto tre alternative in ciascuno dei tre affinamenti, senza ASIN o ASIN padre ripetuti. Il collaudo ha anche mostrato il kit pasticceria B0BW47F6KV accettato come libro perché includeva un ebook: aggiunto un controllo del prodotto principale con regressione sul titolo osservato. Un termine come “tranexamico” non deve corrispondere ad “amico”: i riscontri di contesto richiedono ora l'inizio della parola. Le confezioni dichiaratamente numerose di piccoli omaggi ricevono una penalità editoriale di 6 punti, le confezioni regalo dichiarate un bonus di 2. Le penne da scrittura rappresentano una sola idea nella stessa terna. “Divertente” viene aggiunto alle query di aree adatte a tale ricerca, conservando il contesto di destinatario e occasione nelle altre.

### Chiusura del collaudo — revisione 20261007-4

Il collaudo pubblico della revisione 3 ha confermato 12 ASIN distinti tra ricerca iniziale e tre affinamenti, tutti tra 30 e 60 euro, senza varianti padre ripetute. I tre affinamenti hanno segnalato risposte parziali da alcune query Amazon, recuperando comunque tre prodotti ciascuno. La ricerca collega/laurea ha restituito una penna e due taccuini invece di tre penne. Verificate le query effettive `libri cucina regalo compleanno per amico` e `taccuino regalo laurea per collega`.

Ulteriori riscontri circoscritti: il prodotto B0CNVVDG14 era un quaderno di ricette a pagine vuote, non un libro di cucina con contenuti; viene escluso dalle ricerche di libri, conservandone l'ammissibilità per una ricerca esplicita di quaderni. Il formato di titolo `120 pezzi` del prodotto B0H41GZ3W6 viene ora riconosciuto dalla penalità per confezioni numerose. La penalità resta una preferenza, non un'esclusione: non certifica la qualità del regalo. Aggiunti controlli di regressione sui due casi osservati.
