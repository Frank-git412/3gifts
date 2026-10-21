# Audit notturno 3Gifts - 18 settembre 2026

Il proprietario richiede test severi ogni ora fino alle 07:00 Europe/Rome, PDF finale e lista completa dei problemi. Sono programmati sei cicli 02, 03, 04, 05, 06, 07. Un primo ciclo viene svolto nella conversazione di preparazione. Il PDF finale viene creato dopo i test dell'ultimo ciclo; non simulare esecuzioni mancanti.

## Separazione obbligatoria

- Il sito completo IT/EN viene costruito da `node scripts/build-locales.mjs` in `dist/` per i test.
- La sola pagina pubblica temporanea è generata da `node scripts/build-maintenance.mjs` in `build/`.
- `.openai/hosting.json` indica **build**, NON dist. Non cambiarlo e non esporre il prodotto completo durante l'audit.
- Sorgenti e versione completa precedente sono conservati. Il manifest potrà essere riportato a dist solo su richiesta esplicita di lancio; allora rivalutare pubblico, dominio e informative.
- Non pubblicare, non modificare audience/DNS e non fare push durante i cicli di test. Non correggere il prodotto senza richiesta: scrivere prove e raccomandazioni.

## Esecuzione

Leggere le skill Sites, PDF (quando si crea il PDF) e Library. Configurare il profilo di esecuzione prima dei comandi di progetto. Se lo scratch manca, recuperare il repository dello **stesso** Site dalle funzioni Sites e leggere questo file dal checkout appena ottenuto. Non creare un altro Site.

Eseguire `node scripts/nightly-audit.mjs SEED OUTPUT_ASSOLUTO_ESTERNO_AL_REPO` con seed diverso e registrato per ogni ciclo. Il runner salva JSON con output integrale, log delle suite e report Markdown fuori dal checkout. Le suite sono locali: non simulano un vero browser, non fanno carico sulla rete, non certificano prezzi/consegne o conformità legale.

Ogni ciclo deve approfondire aspetti nuovi oltre ai test esistenti: note ambigue, negazioni IT/EN, input ostili e Unicode, limiti numerici/date, percorsi avanti/indietro/reset, cataloghi degradati e duplicati, affinamenti, errori storage/rete e revoca consenso, accessibilità e mobile ove gli strumenti approvati lo consentano. Non riciclare i vecchi conteggi come esecuzioni attuali. Verificare manualmente nel codice che i fallimenti non siano difetti del test stesso.

Per Sites managed-linux, il progetto statico non ha un server preview compatibile: seguire le skill, non improvvisare browser alternativi. Dichiarare eventuale QA visuale non eseguita. Solo poche richieste a domini propri sono ammesse; niente carico, scansioni invasive o scraping dei venditori. Budget circa 25 minuti per ciclo, senza task figli.

## Persistenza e consegna

Salvare ogni ciclo in Library come `3Gifts_Audit_Notturno_2026-09-18_HHMM.md`. Cercare e leggere gli altri cicli prima di deduplicare. Assegnare ID stabili a difetti confermati, con gravità, riproduzione, atteso/osservato, impatto, evidenze e soluzione. Separare rischi non verificati e limiti d'infrastruttura.

Nel ciclo delle 07:00: raccogliere SOLO le esecuzioni effettive, creare `3Gifts_Audit_Notturno_2026-09-18.pdf`, renderizzare e controllare tutte le pagine, salvare in Library e consegnare link più elenco delle criticità in chat. Segnalare i cicli mancanti/bloccati. Non proseguire la ricorrenza oltre questa finestra.
