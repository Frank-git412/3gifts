# 3Regali — progetto app essenziale

Avvio: 28 settembre 2026. Prima versione: PWA sul dominio 3gifts.it.

## Obiettivo
Aprire dal telefono il questionario e ottenere tre proposte regalo, senza account, registrazione o richiesta di email.

## Perimetro iniziale
- Riutilizzare questionario, catalogo e algoritmo del sito: nessuna seconda banca dati.
- Avvio diretto del questionario in modalità installata o con `/?app=1`.
- Icona 3Regali nella schermata Home, dove supportata dal browser.
- Risultati e link Amazon con il tracciamento già configurato nel sito.
- Installazione facoltativa: il sito continua a funzionare dal browser.
- Nessun profilo, newsletter, notifica push o permesso del dispositivo aggiuntivo.
- Risposte in memoria durante la sessione; nessun nuovo salvataggio delle risposte.
- Nessuna cache persistente di catalogo, prezzi o risultati. Offline si mostra un messaggio per riconnettersi.
- Mantiene le preferenze privacy e le informative esistenti del sito.

## Tempi e metodo
Prima base tecnica realizzata in questa sessione. Prima di promuovere l’app: prova su iPhone/Safari e Android/Chrome reali, installazione, apertura, questionario completo e passaggio ad Amazon. La data del lancio promozionale resta da definire dopo tali verifiche.

## Criteri di accettazione
1. Nessuna schermata chiede email o registrazione.
2. Apertura dall’icona sul questionario.
3. Manifest, icone e service worker raggiungibili con il tipo MIME corretto.
4. Catalogo e raccomandazioni restano quelli del sito.
5. In assenza di connessione si informa l’utente senza mostrare prezzi memorizzati.
6. Il sito normale e la versione inglese restano utilizzabili.

## Fuori dalla prima versione
Store Apple/Google, preferiti, calendario ricorrenze, sincronizzazione, login e notifiche.
