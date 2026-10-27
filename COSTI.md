# Costi di 3Gifts

Registro dei costi del sito, aggiornato a ogni cambiamento. Importi in dollari dove il fornitore fattura in dollari.
Ultimo aggiornamento: 27 ottobre 2026, sera.

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
- Tetto di sicurezza: 400 chiamate al giorno (`CLAUDE_DAILY_CALL_LIMIT`). Superato il tetto, il sito usa il motore senza AI.
- Prezzi di listino di Claude Opus 5.5: 4 $ per milione di token in ingresso, 20 $ per milione in uscita, 0,20 $ per milione letti dalla cache.

### Stime per voce

| Uso | Costo stimato |
|---|---|
| Un questionario con il motore v3 | **misurato: circa 2,7 centesimi** (27/10) |
| Controllo AI di tutti i prodotti della libreria (circa 500, una volta) | **misurato: circa 1 centesimo per idea**, quindi circa 1 $ per tutte le 107 idee |
| Controllo dei prodotti nuovi nei giorni successivi | pochi centesimi al giorno |
| 1.000 questionari v3 al mese | circa 25 $ |

## Movimenti

| Data | Voce | Importo | Note |
|---|---|---|---|
| 27/10/2026 | Anthropic, crediti prepagati | 20,00 $ | Ricarica iniziale. |
| 27/10/2026 | Cloudflare Workers Paid | 5,00 $/mese | Attivato per eliminare gli errori "Worker exceeded resource limits". |
| 27/10/2026 | Claude, prova del motore v3 | circa 0,75 $ (stima) | Circa 30 risposte del v3 sui profili di prova, prima che il conteggio dei token fosse attivo. |
| 27/10/2026 | Claude, misurato dal sito | 0,33 $ | 19 chiamate contate (9 del v3, 10 del controllo prodotti): totale del giorno circa 1,10 $ con la stima sopra. |
