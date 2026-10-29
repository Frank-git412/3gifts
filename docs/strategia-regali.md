# Strategia regali di 3Gifts

Manuale con cui il motore sceglie i regali. Claude lo riceve come istruzioni fisse: lo applica alla singola persona, non lo esegue come tabella.
Origine: proposta di Francesco del 28 ottobre 2026, rivista insieme. Le regole marcate *ipotesi* si confermano o si scartano con il giudice automatico e il voto alla cieca.

## 1. Cosa sappiamo della persona

| Dato | Valori | Default |
|---|---|---|
| Rapporto con l'interesse | vuole iniziare · lo fa spesso · è esperto/ha già tutto · qualcosa non gli funziona | lo fa spesso |
| Effetto | emozionare · che userà davvero · far sorridere · sorprendere · elegante · nessuna preferenza | che userà davvero |
| Chi è per te | partner · amico · familiare · collega · coppia · **conoscente** | — |
| Il regalo parla di | chi lo riceve · anche di me | chi lo riceve |
| Nota libera | facoltativa | — |

"Conoscente" non aggiunge domande: è un'opzione in più di "Chi è per te?" e segnala che la vicinanza è bassa, qualunque sia il ruolo.

## 2. Archetipi

| Archetipo | Cos'è |
|---|---|
| Kit d'inizio | Tutto per cominciare bene, qualità medio-alta |
| Strumento chiave | L'attrezzo su cui i principianti risparmiano e se ne pentono |
| Upgrade | Versione migliore dell'oggetto che usa di solito |
| Accessorio del rituale | Rende più piacevole un momento che vive spesso |
| Consumabile pregiato | Versione di lusso di ciò che consuma: non duplica ciò che possiede |
| Pezzo raro | Edizione speciale, artigianale, da intenditori |
| Soluzione | Risolve un problema descritto nella nota |
| Personalizzato | Oggetto che usa, inciso o personalizzato |
| Ironico ma usabile | Fa sorridere e si usa davvero |
| Insider | Oggetto o battuta che capisce solo chi ha quella passione |
| Oggetto di design | La versione bella di un oggetto quotidiano |
| Adiacente | Un interesse vicino che non ha ancora esplorato |
| Esperienza | Cofanetto regalo su Amazon (Smartbox e simili): notte fuori, cena, spa, degustazione, corso, avventura. Solo per rapporti stretti, mai se l'utente ha escluso le esperienze |

## 3. Le tre posizioni

Le tre proposte sono tre ipotesi diverse, non tre varianti dello stesso prodotto.

**Sicura**: dipende solo dal rapporto con l'interesse.

| Rapporto | Archetipo |
|---|---|
| Vuole iniziare | Kit d'inizio |
| Lo fa spesso | Upgrade |
| Esperto/ha già tutto | Consumabile pregiato |
| Qualcosa non funziona | Soluzione (senza nota che descriva il problema: Upgrade) |

**Che colpisce**: rapporto × effetto. Se coincide con la sicura, si usa la seconda scelta.

| Rapporto \ Effetto | Emozionare | Che userà davvero | Far sorridere | Sorprendere | Elegante |
|---|---|---|---|---|---|
| Vuole iniziare | Esperienza, Personalizzato | Strumento chiave, Kit d'inizio | Ironico ma usabile, Kit d'inizio | Adiacente, Esperienza | Oggetto di design, Strumento chiave |
| Lo fa spesso | Personalizzato, Esperienza | Upgrade, Accessorio del rituale | Ironico ma usabile, Accessorio | Esperienza, Adiacente | Oggetto di design, Upgrade |
| Esperto | Pezzo raro, Esperienza | Consumabile pregiato, Accessorio | Insider, Consumabile pregiato | Pezzo raro, Esperienza | Pezzo raro, Oggetto di design |
| Qualcosa non funziona | Soluzione, Personalizzato | Soluzione, Upgrade | Ironico ma usabile, Soluzione | Soluzione, Adiacente | Oggetto di design, Soluzione |

"Nessuna preferenza" si comporta come "che userà davvero".

**Diversa**, nell'ordine, la prima disponibile:
1. Esperienza con un cofanetto (se non esclusa e se il rapporto è stretto: partner, coppia, famiglia, amico);
2. l'archetipo della posizione sicura applicato alla seconda area di interesse;
3. Adiacente.

La diversa resta legata alla persona: mai un regalo a caso.

## 4. Modificatori

- **Conoscente**: niente Personalizzato, Pezzo raro, Insider o Soluzione. Meglio un Consumabile pregiato o un Oggetto di design. È alto il rischio di sbagliare gusti.
- **Il regalo parla anche di me**: la posizione che colpisce va su un'esperienza da fare insieme o su un oggetto personalizzato con un ricordo condiviso; il biglietto è al plurale. (Chan e Mogilner, 2017.)
- **Casa nuova, nascita, matrimonio**: nella posizione sicura l'occasione prende il posto dell'interesse (la casa, il comfort dei genitori, la casa di coppia). L'interesse resta per la posizione che colpisce. Per una nascita, di norma due regali per il bambino e uno per i genitori. *Ipotesi.*
- **Budget stretto per l'archetipo**: si scende a una categoria più piccola, ma si prende il meglio di quella (da Upgrade ad Accessorio o Consumabile al top). Mai il peggio di una categoria grande. *Ipotesi coerente con Weaver, Garcia e Schwarz.*
- **Sempre**: niente set o aggiunte economiche attaccate a un prodotto. Un oggetto ottimo vale più dello stesso oggetto con extra. (Weaver, Garcia e Schwarz, "presenter's paradox".)
- **Esperto**: evitare l'attrezzatura base, perché probabilmente ce l'ha già. *Ipotesi.*
- **Uso reale, solo per gli oggetti**: un oggetto che si userà raramente (gadget da poche volte) non passa, qualunque sia l'effetto. Chi riceve valuta quanto userà il regalo nel tempo. (Galak e colleghi.) **Le esperienze non si giudicano sull'uso** ma su "lascerà un ricordo, rafforza il legame?".
- **Dettaglio mancante, ambiguità**: se l'informazione per scegliere un oggetto specifico manca (per esempio "ama il caffè" senza dire moka, espresso o filtro), si sceglie l'archetipo più robusto all'ambiguità: un consumabile o un accessorio che vada bene in tutti i casi. Mai un oggetto specifico scelto tirando a indovinare.

## 5. Vincoli del motore

1. **Claude sceglie solo tra prodotti che Amazon (o la libreria) ha restituito davvero**, indicandoli con il loro codice. Le idee pianificate servono a decidere cosa cercare, mai a proporre un prodotto che non esiste su Amazon.it.
2. **Rispetto rigido di età, genere, budget ed esclusioni.** Un prodotto il cui titolo indica un altro destinatario si scarta.
3. **Il costo si misura sempre.** Ogni versione del motore riporta il costo medio per questionario, misurato sui token reali. Il manuale fisso sta nella parte del prompt messa in cache, che costa una frazione dell'input normale.

## 6. Testi della scheda

Ogni scheda ha un **perché** (una o due frasi, riferite alla persona e alla nota) e un **biglietto** da copiare. Claude li scrive per la singola persona. Gli esempi qui sotto servono solo come tono, non si mostrano mai così.

| Archetipo | Perché (tono) | Biglietto (tono) |
|---|---|---|
| Kit d'inizio | Per partire col piede giusto. | Per quella cosa che dici sempre di voler iniziare. Ora non hai più scuse. |
| Upgrade | Lo usa spesso: merita la versione migliore. | Ho notato quanto ci tieni. |
| Consumabile pregiato | Ha già tutto: questo non lo duplica, lo coccola. | Hai già tutto, quindi ho pensato a qualcosa da goderti. |
| Soluzione | Risolve proprio ciò di cui si lamenta. | Ti ho ascoltato. |
| Esperienza | Un ricordo, non un oggetto. | Il regalo è il momento, non la scatola. |

## 7. Reazioni al "non mi convince"

| Motivo | Cosa cambia |
|---|---|
| Troppo generiche | La posizione che colpisce passa ad archetipi più specifici (Pezzo raro, Personalizzato, Soluzione); si invita a scrivere la nota |
| Poco personali | Come sopra, con gli esempi della nota in evidenza |
| Troppo costose | Modificatore del budget |
| Non adatte alla persona | Si chiede il rapporto con l'interesse: probabilmente l'errore è lì |
| Le ha già | Si passa a "esperto": Consumabile pregiato, Esperienza, Pezzo raro |
| Tutte della stessa categoria | Non deve succedere con le tre posizioni: si registra come errore |

Il 👍/👎 su ogni scheda ("Lo userebbe davvero?") sostituisce solo quella scheda e registra profilo, archetipo e prodotto: è la base per tarare il motore quando ci saranno abbastanza dati. Pesi numerici fissi non se ne usano finché quei dati non esistono.

## 8. Come si decide se una versione va in produzione

1. **Giudice automatico tarato**: Claude confronta due motori a coppie, ogni coppia due volte con l'ordine invertito. Prima di usarlo si misura quanto è d'accordo con i voti di Francesco (70 confronti, settembre e ottobre 2026). Se non è d'accordo nella netta maggioranza dei voti decisivi, le sue misure non valgono.
2. **Numeri obbligatori per ogni versione**:
   - costo medio per questionario;
   - accordo del giudice con i voti di Francesco;
   - vittorie contro il motore attuale;
   - quota di "nessuna proposta adatta";
   - doppioni;
   - tempo di risposta.
3. **Decisione finale**: voto alla cieca di Francesco tra le due versioni migliori.
