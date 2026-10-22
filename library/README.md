# Libreria di idee regalo

La libreria è la base del motore v2. Contiene **concetti** di regalo (non prodotti): testi nostri,
etichettati con lo stesso vocabolario del questionario. I prodotti Amazon si abbinano in un secondo
momento, con un job notturno che salva solo gli ASIN e aggiorna prezzo, disponibilità e immagine
ogni giorno (le regole Amazon consentono di conservare quei dati al massimo 24 ore).

## Flusso

1. **Concetti** (`concepts.json`): scritti con l'AI, approvati da Francesco.
2. **Prodotti abbinati**: 2–4 ASIN per concetto, scelti di notte e aggiornati ogni giorno.
3. **Al momento della ricerca**: il codice filtra i concetti con i vincoli rigidi (età, budget,
   esclusioni, relazione); l'AI sceglie 3 idee diverse tra i candidati e scrive il perché.
4. **Senza API Amazon**: i concetti e i link `amazon.it/dp/ASIN?tag=3gifts-21` restano validi;
   spariscono solo prezzo e foto.

## Campi di un concetto

| Campo | Significato |
|---|---|
| `id` | Identificativo stabile, `cNNN-slug` |
| `status` | `draft` → `approved` / `rejected` dopo la revisione |
| `title` | Nome del concetto, come lo leggerebbe l'utente |
| `pitch` | Una frase su che cos'è il regalo |
| `whyItWorks` | Perché funziona come regalo: base per la spiegazione dell'AI e per le pagine SEO |
| `ages` | Fasce d'età del questionario (`ageRange`) |
| `stages` | Solo per 0–6 anni: fasi del questionario (`childStage`) adatte al concetto |
| `relations` | Relazioni del questionario (`relation`) |
| `gender` | `any`, `women` o `men` (`recipientPreference`) |
| `interests` / `subinterests` | Aree e sottocategorie del questionario |
| `tones` | Effetti del questionario (`tone`) |
| `occasions` | Occasioni del questionario, oppure `["any"]` |
| `price` | Fascia tipica in euro, `{ "min", "max" }` |
| `kind` | `object`, `experience`, `subscription` o `consumable` |
| `avoidFlags` | Esclusioni del questionario che scartano il concetto (`avoid`) |
| `lastMinute` | `true` se esiste anche in versione digitale o con consegna rapida tipica |
| `amazonQuery` | Ricerca Amazon con cui il job notturno trova i prodotti |

`node scripts/validate-library.mjs` controlla che ogni etichetta appartenga al vocabolario del questionario.
