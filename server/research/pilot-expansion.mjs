// M3 block 3: editorial context hypotheses, not popularity or suitability claims.
// These examples are synthetic. Actual listings must independently pass all properties.
const expansionRule=(id,area,subId,families,signal,values,titlePattern,properties,query,it,en,negative,property)=>Object.freeze({
 id,area,subId,families,signal,values,titlePattern,properties,query,examples:{it,en,negative},property,
 source:'M2 v3 / editorial context expansion 2026-10-09',verification:'synthetic_examples_only',
 recipient:'Declared interests only; no demographic or clinical inference',
 incompatibilities:['Existing budget, age, exclusions, compatibility and product-type checks remain mandatory']
});
export const PILOT_EXPANSION_RULES=Object.freeze([
 expansionRule('books-family-story','culture','books',['narrativa','narrativa_storica'],'relation',['family'],/\b(romanzo|novel)\b/,
  [/\b(saga familiare|storia familiare|family saga|family story)\b/,/\b(generazioni|generations)\b/],'saga familiare generazioni',
  'Romanzo saga familiare attraverso tre generazioni','Novel family saga across three generations','Romanzo regalo per familiare','Contenuto narrativo familiare attraverso più generazioni'),
 expansionRule('tech-family-photos','techGaming','tech',['foto_ricordi'],'relation',['family'],/\b(cornice digitale|digital photo frame)\b/,
  [/\b(invio|inviare|invia|send|sending)\b/,/\b(foto|photos)\b/,/\b(familiari|family members)\b/],'invio foto familiari',
  'Cornice digitale invio foto da familiari','Digital photo frame sending photos from family members','Cornice digitale regalo famiglia','Invio di fotografie da parte di familiari dichiarato'),
 expansionRule('skin-family-individual','styleBeauty','skincare',['creme_mani','maschere_viso'],'relation',['family'],/\b(creme mani|maschere viso|hand creams|face masks)\b/,
  [/\b(confezioni individuali|individually packaged)\b/,/\b(da condividere|to share)\b/,/\b(adulti|adults)\b/],'confezioni individuali da condividere adulti',
  'Creme mani in confezioni individuali da condividere tra adulti','Hand creams individually packaged to share among adults','Crema mani per tutta la famiglia','Unità individuali condivisibili tra adulti; nessuna compatibilità cutanea presunta'),
 expansionRule('books-surprise-puzzles','culture','books',['gialli','thriller','illustrati'],'effect',['surprising'],/\b(libro|romanzo|book|novel)\b/,
  [/\b(enigmi|puzzles|riddles)\b/,/\b(da risolvere|to solve)\b/,/\b(lettore|reader)\b/],'enigmi da risolvere lettore',
  'Libro con enigmi da risolvere per il lettore','Book with puzzles for the reader to solve','Romanzo con finale sorprendente','Partecipazione del lettore alla soluzione di enigmi'),
 expansionRule('tech-surprise-colour','techGaming','tech',['lettura_digitale'],'effect',['surprising'],/\b(lettore ebook|e reader|e-reader|ereader)\b/,
  [/\b(e ink|e-ink|inchiostro elettronico|electronic ink)\b/,/\b((?:schermo|display|inchiostro elettronico) a colori|colou?r display|colou?r screen)\b/],'inchiostro elettronico a colori',
  'Lettore ebook con schermo a inchiostro elettronico a colori','E-reader with E Ink colour display','Lettore ebook con custodia colorata','Display a inchiostro elettronico a colori, non colore della scocca'),
 expansionRule('skin-surprise-transform','styleBeauty','skincare',['oli_struccanti'],'effect',['surprising'],/\b(balsamo struccante|cleansing balm)\b/,
  [/\b(da solido a olio|si trasforma in olio|solid to oil|transforms into oil)\b/],'balsamo struccante si trasforma in olio',
  'Balsamo struccante che si trasforma in olio','Cleansing balm transforms into oil','Olio struccante sorprendente','Trasformazione della texture dichiarata; nessuna promessa di efficacia clinica'),
 expansionRule('books-relax-short','culture','books',['narrativa','letteratura_viaggio'],'effect',['relax'],/\b(libro|racconti|book|stories)\b/,
  [/\b(racconti brevi|short stories)\b/,/\b(tono leggero|lettura leggera|light tone|light reading)\b/],'racconti brevi lettura leggera',
  'Libro di racconti brevi dal tono leggero','Book of short stories with a light tone','Libro breve thriller intenso','Racconti brevi e tono leggero entrambi dichiarati; nessuna promessa terapeutica'),
 expansionRule('tech-relax-reading','techGaming','tech',['lettura_digitale'],'effect',['relax'],/\b(lettore ebook|e reader|e-reader|ereader)\b/,
  [/\b(luce calda|warm light)\b/,/\b(regolabile|adjustable)\b/,/\b(lettura|reading)\b/],'lettura luce calda regolabile',
  'Lettore ebook per lettura con luce calda regolabile','E-reader for reading with adjustable warm light','Lettore ebook retroilluminato','Luce di lettura calda regolabile; nessuna deduzione sul sonno'),
 expansionRule('skin-relax-massage','styleBeauty','skincare',['creme_corpo','burri_corpo'],'effect',['relax'],/\b(crema corpo|burro corpo|body cream|body butter)\b/,
  [/\b(massaggio|massage)\b/,/\b(rituale serale|routine serale|evening ritual|evening routine)\b/],'massaggio rituale serale',
  'Crema corpo per massaggio nel rituale serale','Body cream for massage in an evening ritual','Crema corpo rilassante antistress','Applicazione con massaggio in un rituale serale dichiarato, senza effetto clinico'),
 // Ordinary occasions use a soft tie-break only, never the special-event tier.
 ...[
  ['books','culture','books',['segnalibri','protezioni_libri'],/\b(segnalibro|custodia libro|bookmark|book sleeve)\b/,'Segnalibro','Bookmark'],
  ['tech','techGaming','tech',['foto_ricordi'],/\b(cornice digitale|digital photo frame)\b/,'Cornice digitale','Digital photo frame'],
  ['skin','styleBeauty','skincare',['creme_mani','maschere_viso'],/\b(creme mani|maschere viso|hand creams|face masks)\b/,'Creme mani','Hand creams']
 ].map(([id,area,sub,families,title,it,en])=>expansionRule(id+'-occasion-dedication',area,sub,families,'occasion',['birthday','thanks','event'],title,
  [/\b(biglietto|card)\b/,/\b(dedica personalizzabile|customi[sz]able message)\b/,/\b(incluso|included)\b/],'biglietto incluso dedica personalizzabile',
  it+' con biglietto incluso e dedica personalizzabile',en+' with included card and customizable message',it+' regalo compleanno ringraziamento speciale','Biglietto incluso con dedica personalizzabile; idoneità alla consegna come regalo, non gusto dedotto')),
 expansionRule('books-christmas-stories','culture','books',['narrativa','illustrati'],'occasion',['christmas'],/\b(libro|racconti|book|stories)\b/,
  [/\b(racconti natalizi|storie di natale|christmas stories)\b/],'racconti natalizi',
  'Libro di racconti natalizi','Book of Christmas stories','Romanzo regalo Natale','Contenuto esplicitamente natalizio'),
 expansionRule('tech-christmas-card','techGaming','tech',['foto_ricordi'],'occasion',['christmas'],/\b(cornice digitale|digital photo frame)\b/,
  [/\b(biglietto natalizio|christmas card)\b/,/\b(incluso|included)\b/],'biglietto natalizio incluso',
  'Cornice digitale con biglietto natalizio incluso','Digital photo frame with included Christmas card','Cornice digitale regalo Natale','Biglietto natalizio effettivamente incluso, non semplice destinazione pubblicitaria'),
 expansionRule('skin-christmas-advent','styleBeauty','skincare',['creme_mani','maschere_viso','balsami_labbra'],'occasion',['christmas'],/\b(calendario dell.avvento|advent calendar)\b/,
  [/\b(creme mani|maschere viso|balsami labbra|hand creams|face masks|lip balms)\b/,/\b(24)\b/],'calendario avvento 24 skincare',
  'Calendario dell’avvento con 24 creme mani','Advent calendar with 24 hand creams','Calendario avvento cosmetici contenuto non indicato','Calendario con 24 unità e contenuti skincare espliciti'),
 expansionRule('books-graduation-interview','culture','books',['psicologia'],'occasion',['graduation'],/\b(libro|manuale|guida|book|guide)\b/,
  [/\b(colloqui di lavoro|job interviews)\b/,/\b(esercizi|esempi pratici|exercises|practical examples)\b/],'colloqui di lavoro esercizi',
  'Libro sui colloqui di lavoro con esercizi','Book on job interviews with exercises','Libro regalo laurea','Preparazione pratica ai colloqui, ipotesi editoriale e non obbligo di carriera'),
 expansionRule('tech-graduation-calls','techGaming','tech',['videochiamate'],'occasion',['graduation'],/\b(webcam)\b/,
  [/\b(microfono|microphone)\b/,/\b(videochiamate|video calls)\b/,/\b(otturatore privacy|privacy shutter)\b/],'microfono videochiamate otturatore privacy',
  'Webcam con microfono per videochiamate e otturatore privacy','Webcam with microphone for video calls and privacy shutter','Webcam regalo laurea','Videochiamate con microfono e chiusura fisica per la privacy; compatibilità resta obbligatoria'),
 expansionRule('books-newhome-bookends','culture','books',['fermalibri'],'occasion',['newhome'],/\b(fermalibri|bookends)\b/,
  [/\b(coppia|paio|pair)\b/,/\b(antiscivolo|non slip|non-slip)\b/],'coppia antiscivolo',
  'Fermalibri in coppia con base antiscivolo','Pair of bookends with non-slip base','Fermalibri regalo casa nuova','Coppia di fermalibri con base antiscivolo per sistemare i libri'),
 expansionRule('tech-newhome-frame','techGaming','tech',['foto_ricordi'],'occasion',['newhome'],/\b(cornice digitale|digital photo frame)\b/,
  [/\b(montaggio a parete|wall mount|wall mounting)\b/,/\b(foto personali|personal photos)\b/],'foto personali montaggio a parete',
  'Cornice digitale per foto personali con montaggio a parete','Digital photo frame for personal photos with wall mounting','Cornice digitale design casa','Visualizzazione di fotografie personali e montaggio a parete dichiarati')
]);
export const PILOT_CONTEXT_DECISIONS=Object.freeze([
 {area:'styleBeauty',subId:'skincare',occasion:'graduation',status:'no_automatic_bonus',reason:'La laurea non stabilisce esigenze o preferenze cutanee; restano interesse e altri contesti espliciti.'},
 {area:'styleBeauty',subId:'skincare',occasion:'newhome',status:'no_automatic_bonus',reason:'Una casa nuova non stabilisce esigenze cosmetiche; restano interesse e altri contesti espliciti.'}
]);
