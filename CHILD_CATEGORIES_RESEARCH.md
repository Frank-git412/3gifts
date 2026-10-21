# Categorie bambini — ricerca e scelte editoriali

Consultazione: 20 settembre 2026. Ambito: questionario italiano e inglese, fasce 0–6 e 7–12 anni.

## Metodo e limiti

Sono stati incrociati segnali di vendita del settore giocattolo con le classificazioni per età di produttori attivi in Italia. Le fonti pubbliche consultate non forniscono una classifica italiana dei regali effettivamente ricevuti nelle due esatte fasce 0–6 e 7–12. Vendite, assortimenti, popolarità e idoneità per età non sono equivalenti. L'ordine delle opzioni è editoriale: non dichiara quote di mercato o una graduatoria dei più regalati. Le vendite aggregate includono adolescenti e adulti.

## Fonti primarie

| Fonte consultata | Evidenza utilizzabile | Limite e applicazione |
| --- | --- | --- |
| [Circana, Toy Industry Analytics & Consumer Insights](https://www.circana.com/industries/toys) | Il riquadro POS di luglio 2026 evidenzia giochi/puzzle, giochi outdoor/sportivi, giochi esplorativi e costruzioni. | Segnale aggregato, non una classifica italiana per età o per occasione regalo. Supporta la presenza di queste famiglie, non percentuali o primati nel questionario. |
| [Chicco, Giocattoli](https://www.chicco.it/prodotti/giocattoli) | Distingue sonagli, tappeti/palestrine, incastri/impilabili, giochi educativi, musicali, cavalcabili e bici senza pedali. Descrive separatamente prime attività sensoriali e gioco motorio. | Catalogo del produttore, non dati di vendita. Base per i percorsi prima infanzia; nessuna categoria rende automaticamente adatto ogni prodotto. |
| [LEGO, 18 mesi–3 anni](https://www.lego.com/it-it/age/1-plus-years) | Costruzioni educative e grandi mattoncini, con soglie d'età esplicite sulle singole confezioni. | LEGO DUPLO parte da 18 mesi nei set indicati: non viene presentato come regalo per neonati. Nel questionario la categoria è generica; un prodotto 18+ mesi non copre da solo tutta la fascia 1–2. |
| [LEGO, 6–8 anni](https://www.lego.com/it-it/age/6-plus-years) e [9–12 anni](https://www.lego.com/it-it/age/9-plus-years) | Due assortimenti separati di costruzioni per età scolare. | Conferma la necessità di controllare il singolo set: un prodotto 9+ non copre tutta la fascia 7–12. |
| [Clementoni, 0+ mesi](https://it.clementoni.com/collections/0) e [4–6 anni](https://it.clementoni.com/collections/4-6-anni) | Navigazione e assortimenti distinti per neonati e prescolari. | Evitare una sola proposta indistinta per l'intera fascia 0–6. |
| [Clementoni, 7–9 anni](https://it.clementoni.com/collections/7-9-anni) | Include giochi scientifici, modelli meccanici, robot, attività sulla natura, giochi di carte e da tavolo. | La presenza in catalogo non è una graduatoria. Le linee beauty presenti nella stessa pagina non sono state riprese: il questionario richiesto deve privilegiare gioco, creatività e scoperta. |
| [Clementoni, categorie ufficiali](https://it.clementoni.com/) | Separa prima infanzia, educativi, creativi, scientifici, puzzle e giochi da tavolo bambini/adulti. | Base per una tassonomia realmente separata da quella adulta. Libri, musica e personaggi completano editorialmente le possibilità di gioco; non vengono dichiarati bestseller. |

## Tassonomia applicata

| Fascia | Otto categorie |
| --- | --- |
| 0–6 | Primi giochi e sensi; incastri e prime costruzioni; gioco simbolico; primi libri e racconti; colori e manualità; movimento e outdoor; musica e suoni; puzzle e prime scoperte. |
| 7–12 | Costruzioni e veicoli; giochi da tavolo e puzzle; scienza/natura/robotica; arte e kit creativi; libri/fumetti/avventure; sport e outdoor; personaggi e mondi da inventare; musica e spettacolo. |

Per 0–6, un dettaglio facoltativo distingue meno di un anno, 1–2 e 3–6 anni. Le aree e sottocategorie cambiano: per esempio i neonati vedono sensorialità, primi libri e suoni, non monopattini o pasta da modellare. “Non so con precisione” mostra il panorama 0–6 senza dichiarare che ogni attività è adatta a ogni età.

Le categorie sono disponibili indipendentemente dalla preferenza bambina/bambino/unisex. La preferenza non crea una divisione stereotipata degli interessi.

## Comportamento e catalogazione futura

- Le dodici aree generali e tutte le loro sottocategorie sono nascoste, disabilitate e deselezionate per 0–12. Anche le scelte non più pertinenti passando da una fascia all'altra vengono cancellate.
- Restano i limiti di due categorie e quattro sottocategorie; il ritorno sulle domande conserva le risposte ancora valide.
- I nuovi identificatori sono specifici (`early…`, `kids…`); non sono alias di beauty, tecnologia adulta, accessori per animali o lavoro. Le sottocategorie usano il prefisso dell'area.
- La direzione esplorativa usa i nomi e le sottocategorie bambini, in entrambe le lingue.
- Nessun prodotto è stato aggiunto o riclassificato come adatto ai bambini sulla sola base del nome di categoria.
- I prodotti futuri devono portare tag corrispondenti e `ageSuitability` con `verified: true`, intervallo numerico e URL HTTPS della fonte. L'intervallo deve coprire tutta la fascia selezionata. Per il dettaglio infant si adotta conservativamente [0,1]; toddler [1,2]; preschool [3,6]. Senza dettaglio resta [0,6].
- Il catalogo locale include 13 prodotti Amazon con adeguatezza d'età verificata per queste fasce. La selezione resta conservativa: un prodotto compare soltanto quando l'intervallo documentato copre l'età richiesta. Prezzo, disponibilità, variante e consegna non sono verificati in tempo reale e devono essere confermati su Amazon.

## Verifica

`tests/child-categories.cjs` esegue l'app distribuita italiana/inglese con un simulatore DOM/rete: visibilità e disabilitazione, selezioni residue, cambi di fascia e fase, limiti di scelta, navigazione, percorso esplorativo, profilo inviato, collegamento al ranking, controllo dell'età e assenza di sostituti adulti. Non equivale a una prova visiva in browser.
