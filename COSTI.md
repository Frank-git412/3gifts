# Costi di 3Gifts

Registro dei costi del sito, aggiornato a ogni cambiamento. Importi in dollari dove il fornitore fattura in dollari.
Ultimo aggiornamento: 27 ottobre 2026.

## Riepilogo mensile

| Voce | Tipo | Costo al mese | Note |
|---|---|---|---|
| Cloudflare Workers Paid | fisso | 5,00 $ | Attivo dal 27/10/2026. Include 10 M richieste e 30 M ms di calcolo al mese: oggi ne usiamo una piccola frazione. |
| Anthropic (Claude) | a consumo | 0–20 $ | Crediti prepagati: 20 $ caricati il 27/10/2026. Limite di spesa mensile e ricarica automatica spenta: da confermare nella Console. |
| Amazon Creators API | gratuito | 0 $ | Resta gratuita finché l'account fa almeno 10 vendite idonee in 30 giorni. |
| GitHub | gratuito | 0 $ | |
| Umami Cloud (analytics) | da confermare | ? | Indicare il piano attivo. |
| Dominio 3gifts.it (Aruba) | annuale | ? | Indicare importo e data di rinnovo. |
| Dominio 3regali.it (Aruba) | annuale | ? | Indicare importo e data di rinnovo. |

**Totale fisso noto: 5 $ al mese**, più il consumo di Claude e i domini.

## Claude: come si misura

- Il sito conta da solo le chiamate e i token usati ogni giorno. Il totale del mese, con il costo stimato a prezzi di listino, è su **https://3gifts.it/api/claude/costs**.
- Il dato ufficiale resta la pagina **Costi** della Console Anthropic (platform.claude.com).
- Tetto di sicurezza: 400 chiamate al giorno (`CLAUDE_DAILY_CALL_LIMIT`). Superato il tetto, il sito usa il motore senza AI.
- Prezzi di listino di Claude Opus 5.5: 4 $ per milione di token in ingresso, 20 $ per milione in uscita, 0,20 $ per milione letti dalla cache.

### Stime per voce

| Uso | Costo stimato |
|---|---|
| Un questionario con il motore v3 | circa 2–3 centesimi |
| Controllo AI di tutti i prodotti della libreria (circa 500, una volta) | circa 1,5 $ |
| Controllo dei prodotti nuovi nei giorni successivi | pochi centesimi al giorno |
| 1.000 questionari v3 al mese | circa 25 $ |

## Movimenti

| Data | Voce | Importo | Note |
|---|---|---|---|
| 27/10/2026 | Anthropic, crediti prepagati | 20,00 $ | Ricarica iniziale. |
| 27/10/2026 | Cloudflare Workers Paid | 5,00 $/mese | Attivato per eliminare gli errori "Worker exceeded resource limits". |
| 27/10/2026 | Claude, prova del motore v3 | circa 0,75 $ (stima) | Circa 30 risposte del v3 sui profili di prova, prima che il conteggio dei token fosse attivo. |
