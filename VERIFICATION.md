# Verifica delle offerte e correzioni ad alta priorità

Aggiornamento del 17 settembre 2026.

## Inglese completo e revisione privacy

- 42 pagine controllate per lingua dichiarata, selettore reciproco, collegamenti interni, asset locali, consenso e metadati di lingua. Le 15 guide hanno controparti inglesi; i 240 prodotti hanno titolo e motivazione in inglese senza cambiare identità e vincoli interni.
- `tests/localization.cjs`: 3.296 asserzioni, 720 confronti IT/EN dell’ordinamento, 240 rendering prodotto, refinamento, reset, vincoli inglesi, fallback, dialogo e blocco eventi senza consenso. Nessun errore.
- `tests/privacy-consent.cjs dist`: 42 pagine e casi iniziale/rifiuto/accettazione/revoca/riaccettazione/caricamento tardivo, scadenza, timestamp futuro, schede multiple, storage cancellato, DNT/GPC e minimizzazione URL/referrer. Nessun errore. Non carica realmente lo script esterno: verifica il contratto documentato e il codice di integrazione.
- `tests/path-defects.cjs`: 226 verifiche, zero errori.
- `tests/audit-regressions.cjs`: 119 verifiche, zero errori.
- `tests/high-priority.cjs`: 103 asserzioni, 14.400 profili verificati, 14.400 esplorativi e 2.304 con esclusioni, zero errori.
- `tests/budget-timing-matrix.cjs`: 100.711 asserzioni, 58 budget da 15 a 300 EUR, 10 casi temporali, 12 aree; 13.920 profili ranking, 6.960 UI, 2.784 disponibilità, 22.272 esclusioni, zero errori.
- Corrette due DOI nella guida di ricerca e ridimensionate generalizzazioni non sostenute; corretto l’e-reader descritto come regalo digitale istantaneo. Tolto il catalogo legacy di riserva che includeva fornitori non previsti al lancio.
- Font senza richieste Google; nessuna immagine remota nel catalogo attuale; endpoint esterni del questionario vuoti; nessun tag affiliato configurato.

### Limiti della verifica

Questi risultati derivano da analisi statica e test DOM/rete simulati. Non sono una sessione browser reale, un test di carico simultaneo o una verifica degli acquisti. La struttura statica non dispone di un server compatibile con l’anteprima gestita, quindi la QA visuale browser resta da fare. Non sono state ricontrollate in tempo reale le 240 inserzioni, né è stata inventata disponibilità negli USA.

Privacy aggiornata, non certificata: restano da confermare ruoli/condizioni/tempi di conservazione dei fornitori Sites e posta e l’eventuale trattamento del reindirizzamento Aruba. Il pannello controlla soltanto Umami, non le metriche automatiche Sites. La pubblicazione conserva l’audience owner-only; non equivale ad apertura al pubblico.

Fonti di controllo: [configurazione ufficiale Umami](https://docs.umami.is/docs/tracker-configuration), [linee guida del Garante](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876), [sicurezza giocattoli UE](https://single-market-economy.ec.europa.eu/sectors/toys/toy-safety_en), [sicurezza giocattoli USA](https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Toys). Riferimenti bibliografici corretti: DOI `10.1016/j.jesp.2011.03.015` e `10.1093/jcr/ucw067`.

## Chiusura dei quattro difetti del percorso

| Difetto | Correzione applicata | Comportamento verificato |
|---|---|---|
| Negazioni che contaminavano la preferenza successiva | La polarità viene valutata per proposizione e per lista; una nuova costruzione positiva chiude la portata della negazione. | «Non ama il vino, gli piacciono i libri» esclude il vino e favorisce i libri. Liste come «no tech, libri e vino» restano interamente negative. |
| Vincoli non riconosciuti ignorati | Ogni vincolo libero riceve uno stato: applicato, non verificabile con i dati disponibili oppure non interpretabile. Gli ultimi due bloccano i risultati e chiedono un chiarimento. | Un vincolo sconosciuto, anche mescolato a uno riconosciuto, non viene scartato silenziosamente; allergie e restrizioni di sicurezza falliscono in modo conservativo. |
| Vicolo cieco con budget basso | Il recupero calcola il più piccolo incremento di 5 € che sblocca davvero tre proposte e lo presenta come scelta esplicita. | Un caso costruito con una proposta a 15 € e tre a 20 € resta a 15 € finché il visitatore non seleziona «Porta il budget a 20 €». |
| «Esperienza» trattata come bonus | La richiesta impone i tipi `experience`/`service`. Gli oggetti restano esclusi finché il visitatore non sceglie «Includi anche oggetti coerenti». | Con due esperienze e più oggetti il risultato stretto contiene soltanto le due esperienze; la terna con oggetti compare solo dopo consenso esplicito. Lo stesso vale nella nota libera e nell’affinamento. |

Suite mirata permanente:

```bash
node tests/path-defects.cjs
```

Esegue 226 verifiche, comprese 40 costruzioni generate con coppie di preferenze positive/negative e i recuperi reali dell’interfaccia simulata.

## Chiusura dei difetti del collaudo v45

Correzioni successive al rapporto `3Gifts-collaudo-completo-v45-2026-09-16.md`:

| ID | Correzione | Prova di regressione |
|---|---|---|
| N1 | Una nuova proposizione positiva dopo «e» non eredita la negazione; «non solo» non esclude la categoria. | Vino escluso e libri desiderati; conservati gli elenchi negativi e le esclusioni sconosciute da chiarire. |
| N2 | Il pronome «te» è distinto dalla bevanda «tè»; supportata la bevanda senza accento con contesto esplicito. | «Regalo per te» non favorisce il cibo; «ama tè», «ama il te» e «te verde» sì. |
| N3 | Le note di affinamento sono separate da un confine di frase. | Nota «no tech», poi motivo «più personale», direzione «passione» e dettaglio «Ama i libri»: tre alternative, esclusione tech conservata. |
| N4 | Stati negativi normalizzati tra campi, lingue e separatori; prevalenza dell'indisponibilità esplicita. | OUT_OF_STOCK, sold_out, NOT_AVAILABLE e varianti respinti anche in esplorazione. |
| N5 | La richiesta fallita al monitor non resta memorizzata; richieste simultanee ancora deduplicate. | Fallimento seguito da successo: due richieste; successo riutilizzato. |
| N6 | Riavvio e navigazione indietro invalidano i risultati delle ricerche precedenti. | Successi e fallimenti tardivi di catalogo, monitor e AI non ripopolano il sito dopo il reset. Una vecchia richiesta non sblocca quella nuova. |
| N7 | Conteggio dei soli intervalli con scheda visibile; ripresa dopo ripristino dalla cache del browser. | 5 secondi attivi + 600 nascosti = 5; uscita senza duplicati e nuova misura dopo ripristino. |
| N8 | Record nulli o privi di identità scartati dal monitor; normalizzazione robusta dei prodotti malformati. | Un record nullo non interrompe le idee locali e non impedisce di applicare un altro record negativo valido. |
| N9 | Reset sincronizzato di prospettiva, testi, risultati, messaggi e misurazione. | Ripristino della domanda sul destinatario e nessun timer attivo sulla homepage. |

Miglioramenti collegati: etichette accessibili esplicite per i cinque controlli di affinamento; focus sulla domanda corrente; gestione della preferenza di movimento ridotto anche negli scorrimenti JavaScript; messaggio e link alle guide quando JavaScript è disattivato. L'informativa ora descrive il tempo attivo escludendo la scheda nascosta.

Suite permanente aggiuntiva:

```bash
node tests/audit-regressions.cjs
```

Esegue 119 verifiche con il JavaScript di `dist` e un DOM simulato. Si affianca alle 103 verifiche principali e alle matrici di stress già documentate sotto. Non è una certificazione di comprensione universale del linguaggio, di accessibilità o di funzionamento in un browser reale.

Restano da completare dati commerciali/API autorizzati, predisposizione SEO per il dominio pubblico e collaudo reale su ulteriori dispositivi. Le informative di lancio, il titolare, i contatti, il consenso Umami e i collegamenti non affiliati sono ora allineati alla configurazione pubblicata. Queste correzioni non trasformano i prezzi indicativi in offerte verificate e non attivano nuovi endpoint.

## Due esiti distinti, mai un rilassamento silenzioso

Il primo invio del questionario usa la modalità verificata. Tre prodotti vengono mostrati solo se ciascuno ha una variante identificata, un URL di offerta (non di ricerca), disponibilità, acquistabilità come regalo e costo totale verificati di recente. Quando è richiesta una data, anche la consegna deve essere verificata entro quella data.

Il catalogo attuale contiene 240 idee e **zero offerte che soddisfano questi requisiti**. I vecchi prezzi non sono stati inventati, riconfermati o promossi a totali. Il sito apre quindi il recupero e propone, quando esistono tre idee compatibili, il pulsante esplicito «Esplora idee senza garanzia di budget o consegna». Le esclusioni rimangono vincoli anche in esplorazione. Un costo totale noto oltre budget, un prodotto noto come indisponibile/non regalabile o una consegna verificata tardiva non vengono mostrati come alternative.

Il recupero propone un budget diverso solo se può effettivamente sbloccare tre risultati nella stessa modalità; non propone più indiscriminatamente 15 → 50 €. Il vincolo data può essere rivisto solo se la sua rimozione risolve il problema con i dati disponibili.

## Schema per una fonte autorizzata o una verifica manuale documentata

Ogni prodotto può avere un oggetto `offer` come questo esempio **di schema, non offerta reale**:

```json
{
  "offer": {
    "url": "https://shop.example/products/variant-123",
    "checkedAt": "TIMESTAMP_ISO_DELLA_VERIFICA",
    "available": true,
    "giftable": true,
    "variantConfirmed": true,
    "destinationCountry": "IT",
    "total": {
      "amount": 30,
      "currency": "EUR",
      "includesShipping": true,
      "includesPersonalization": true
    },
    "delivery": {
      "verified": true,
      "by": "DATA_CONSEGNA_YYYY-MM-DD"
    }
  },
  "constraints": {
    "bulky": false,
    "sizes": false
  }
}
```

- Il totale deve coprire il regalo completo e la variante selezionata: quantità minima, personalizzazione e spedizione incluse; non un anticipo, un accessorio o un prezzo «a partire da».
- `giftable` va attestato, specialmente per abbonamenti che potrebbero non essere trasferibili/regalabili.
- `destinationCountry: IT` significa che le condizioni riportate devono essere valide per l’Italia nel contesto supportato. Se dipendono dal CAP o dall’indirizzo e questo non è noto, non marcare la verifica come valida. Il sito non raccoglie indirizzi in questa versione.
- La verifica commerciale dura al massimo 24 ore; date future o non valide sono respinte. La disponibilità finale resta da confermare dal venditore.
- Una richiesta senza scadenza non richiede `delivery`, ma richiede comunque costo totale e disponibilità verificati.
- Il controllo prezzi settimanale non certifica da solo variante, spedizione o consegna. Un cambio di prezzo rilevato dal monitor invalida l’oggetto `offer` precedente. Un vecchio controllo negativo non riabilita automaticamente un prodotto.
- URL non HTTPS, ricerche e schemi pericolosi non possono diventare offerte verificate.

I collegamenti ai servizi esterni restano vuoti: non sono state configurate credenziali o integrazioni non fornite. Prima di abilitare feed prodotti/AI, aggiornare l’informativa rispetto ai dati che verrebbero trasmessi al backend.

## Preferenze negative e attributi sconosciuti

`recommendation-rules.js` è condiviso dal codice applicativo e dai test. Usa parole intere, nega preferenze riconosciute e preserva le esclusioni dopo l’arricchimento AI o locale. Le parole delle note non sono mai inviate a Umami.

Il parser non è un interprete universale: esclusioni non riconosciute e restrizioni come allergie richiedono chiarimento anziché generare risultati presumibilmente sicuri. L’interfaccia rende esplicito questo limite.

Gli attributi `bulky` e `sizes` sono booleani a tre stati: vero, falso, sconosciuto. Quando la relativa esclusione è attiva, lo sconosciuto viene scartato. Il catalogo corrente usa anche una classificazione conservativa per tipologia dichiarata nel titolo (es. collare richiede misure, segnalibro compatto). Questa classificazione non pretende di essere una misura fisica del prodotto e può escludere più articoli del necessario. La fonte verificata dovrebbe fornire attributi espliciti.

## Privacy e interfaccia

- `recommendations_refined` contiene soltanto `round`. La funzione analytics applica una whitelist di eventi e campi; motivazione, direzione, sorpresa, budget e note non passano al tracker.
- Umami non è presente direttamente nelle pagine: `consent.js` lo carica soltanto dopo un consenso valido. Accettazione e rifiuto hanno controlli equivalenti, la scelta scade dopo 183 giorni e può essere modificata dal piè di pagina.
- DM Sans e Fraunces sono serviti da file locali; nessuna pagina richiama Google Fonts.
- La nota libera e il dettaglio di affinamento avvertono di non inserire nomi, recapiti o dati sensibili.
- I link di lancio sono ordinari, senza tag affiliato o attributo `sponsored`; l’evento aggregato è `external_link_click`.
- La visibilità dei pannelli è governata da `[hidden]{display:none!important}`, anche quando hanno `display:grid/flex`.
- Budget personalizzati: 15–300 €, incrementi di 5 €, anche nell’affinamento e nel ranking.
- URL di ricerca Amazon chiaramente etichettati come ricerche; prezzi indicativi distinti da totali verificati; nessuna promessa di verifica automatica prima del clic.

## Test canonici

```bash
node tests/high-priority.cjs
node tests/privacy-consent.cjs
```

Il primo comando esegue i file distribuiti di `dist`, non una reimplementazione del ranking. Copre parser, pipeline risultati, vincoli, urgenza, schema commerciale, recupero, budget, eventi analytics, limite degli affinamenti, URL e CSS hidden; poi 14.400 profili in modalità verificata, 14.400 in esplorazione esplicita e 2.304 combinazioni di esclusioni. Il secondo verifica il blocco di Umami prima del consenso, accettazione, rifiuto, revoca, scadenza e copertura delle risorse privacy su tutte le pagine.

La modalità verificata deve oggi recuperare tutti i 14.400 profili, perché non ci sono offerte commercialmente verificate: **questo è un comportamento corretto, non prova di 14.400 terne acquistabili**. I vecchi `stress-site.mjs` e `stress-low-budget.mjs` restano controlli parziali con modello semplificato e non certificano il comportamento completo.

Il DOM nei test è simulato. Non sono stati eseguiti screenshot/browser QA o test di utenti simultanei; il sito statico non ha un server di anteprima compatibile con il browser gestito disponibile.

La matrice budget/tempi completa (`node tests/budget-timing-matrix.cjs`) attraversa 58 budget, 10 condizioni temporali, 12 macroaree, entrambe le prospettive, indisponibilità simulate e combinazioni di esclusioni: 100.711 asserzioni, zero errori nell'ultima esecuzione.
