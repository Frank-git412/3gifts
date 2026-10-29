# Costi di 3Gifts

Registro dei costi del sito, aggiornato a ogni cambiamento. Importi in dollari dove il fornitore fattura in dollari.
Ultimo aggiornamento: 29 ottobre 2026.

## Riepilogo mensile

| Voce | Tipo | Costo al mese | Note |
|---|---|---|---|
| Cloudflare Workers Paid | fisso | 5,00 $ | Attivo dal 27/10/2026. Include 10 M richieste e 30 M ms di calcolo al mese: oggi ne usiamo una piccola frazione. |
| Anthropic (Claude) | a consumo | 0–20 $ | Crediti prepagati: 20 $ caricati il 27/10/2026. Ricarica automatica spenta (confermato): a credito finito la spesa si ferma e il sito usa il motore senza AI. |
| Amazon Creators API | gratuito | 0 $ | Resta gratuita finché l'account fa almeno 10 vendite idonee in 30 giorni. |
| GitHub | gratuito | 0 $ | |
| Umami Cloud (analytics) | gratuito | 0 € | Piano gratuito. |
| Domini Aruba (3gifts.it, 3regali.it) | annuale | 19 € all'anno (circa 1,60 € al mese) | Importo indicato da Francesco; data di rinnovo da annotare. |

**Totale fisso: circa 5 $ + 1,60 € al mese** (Cloudflare e domini), più il consumo di Claude.

## Costi già sostenuti (sviluppo)

| Voce | Importo | Note |
|---|---|---|
| ChatGPT, primo mese | 24 € | |
| ChatGPT, secondo mese | 124 € | |
| ChatGPT, crediti aggiuntivi | 80 € | |
| **Totale ChatGPT** | **228 €** | Spesa una tantum per la prima versione del sito: non è un costo mensile ricorrente. |

## Claude: come si misura

- Il sito conta da solo le chiamate e i token usati ogni giorno. Il totale del mese, con il costo stimato a prezzi di listino, è su **https://3gifts.it/api/claude/costs**.
- Il dato ufficiale resta la pagina **Costi** della Console Anthropic (platform.claude.com).
- Tetti di sicurezza giornalieri, separati: **500 chiamate per le ricerche dei visitatori** (`CLAUDE_DAILY_CALL_LIMIT`), cioè **250 questionari v4** (2 chiamate ciascuno); **150 chiamate per i lavori di sfondo** (controllo notturno dei prodotti e valutazioni, `CLAUDE_BACKGROUND_DAILY_CALL_LIMIT`). Superato il tetto, il sito usa il motore senza AI; il controllo prodotti riprende il giorno dopo.
- Spesa massima teorica al giorno: circa 8 $ per 250 questionari più circa 1,5 $ di lavori di sfondo.
- Prezzi di listino per milione di token (ingresso / uscita): Claude Opus 5.5 4 $ / 20 $; Claude Sonnet 5.5 2 $ / 10 $; Claude Haiku 5.5 0,10 $ / 0,50 $. Dal 29/10 il sito registra i token separati per modello.

### Stime per voce

| Uso | Costo stimato |
|---|---|
| Un questionario con il motore v3 | **misurato: circa 2,7 centesimi** (27/10) |
| Controllo AI di tutti i prodotti della libreria (circa 500, una volta) | **misurato: circa 1 centesimo per idea**, quindi circa 1 $ per tutte le 107 idee |
| Controllo dei prodotti nuovi nei giorni successivi | pochi centesimi al giorno |
| 1.000 questionari v3 al mese | circa 25 $ |
| 1.000 questionari v4 al mese (motore predefinito dal 29/10) | circa 32 $ |
| Un giudizio del giudice automatico (due ordini) | **misurato: circa 1,5 centesimi** |
| Un questionario con il motore v4 (due chiamate) | **misurato: circa 3,2 centesimi** (28/10) |
| Pianificazione del v4 con Haiku invece di Opus | **misurato: circa 0,05 centesimi** invece di circa 1 centesimo (Sonnet: circa 0,5 centesimi) |
| Un controllo degli errori oggettivi (una proposta) | **misurato: circa 0,4 centesimi** |

## Movimenti

| Data | Voce | Importo | Note |
|---|---|---|---|
| 27/10/2026 | Anthropic, crediti prepagati | 20,00 $ | Ricarica iniziale. |
| 27/10/2026 | Cloudflare Workers Paid | 5,00 $/mese | Attivato per eliminare gli errori "Worker exceeded resource limits". |
| 27/10/2026 | Claude, prova del motore v3 | circa 0,75 $ (stima) | Circa 30 risposte del v3 sui profili di prova, prima che il conteggio dei token fosse attivo. |
| 27/10/2026 | Claude, misurato dal sito | 0,33 $ | 19 chiamate contate (9 del v3, 10 del controllo prodotti): totale del giorno circa 1,10 $ con la stima sopra. |
| 27/10/2026 | Claude, taratura del giudice | circa 1,03 $ | 140 giudizi (70 confronti × 2 ordini): circa 0,7 centesimi a giudizio. Totale Claude del mese misurato: 1,36 $. |
| 28/10/2026 | Claude, controllo dei 505 prodotti della libreria e giudice v2 | 1,49 $ | Misurato dal sito. Totale Claude del mese: 3,20 $ su 20 $ di crediti. |
| 28/10/2026 | Claude, prova di v3 e v4 sui 40 profili e controllo errori | 2,68 $ | Misurato dal sito. Totale Claude del mese: 5,88 $ su 20 $ di crediti. |
| 29/10/2026 | Claude, miglioramenti v4 e nuova prova sui 40 profili | 1,97 $ | Misurato dal sito. Totale Claude del mese: 7,96 $ su 20 $ di crediti. |
| 29/10/2026 | Claude, prova della pianificazione v4 con Haiku e Sonnet sui 40 profili | circa 2,60 $ | Misurato dal sito (80 questionari: la scelta resta su Opus, ed è la parte che costa). Totale Claude del mese: 10,67 $ su 20 $ di crediti. |
