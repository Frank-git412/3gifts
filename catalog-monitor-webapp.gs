/**
 * Endpoint JSON per collegare il controllo settimanale al sito 3Gifts.
 *
 * Aggiungere questo file allo stesso progetto Apps Script che contiene
 * "Controllo prezi.gs", quindi distribuire il progetto come Web App con
 * accesso in lettura pubblico. Nel sito impostare catalogHealthEndpoint
 * in config.js con l'URL /exec restituito da Google.
 *
 * L'endpoint espone esclusivamente stato tecnico, prezzo e ID prodotto.
 * Non contiene risposte del questionario né dati personali.
 */
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const foglio = ss.getSheetByName(CONFIG.NOME_FOGLIO);
  if (!foglio) {
    return rispostaCatalogo_({
      generatedAt: new Date().toISOString(),
      products: [],
      error: 'catalog_sheet_not_found',
    });
  }

  const ultimaColonna = foglio.getLastColumn();
  const ultimaRiga = foglio.getLastRow();
  const intestazioni = foglio
    .getRange(CONFIG.RIGA_INTESTAZIONI, 1, 1, ultimaColonna)
    .getDisplayValues()[0]
    .map(normalizzaTesto);
  const colonne = mappaColonne_(intestazioni);
  const richieste = [
    CONFIG.COLONNA_ID,
    CONFIG.COLONNA_PREZZO_RILEVATO,
    CONFIG.COLONNA_DISPONIBILITA,
    CONFIG.COLONNA_ESITO,
    CONFIG.COLONNA_DATA_CHECK,
  ];

  richieste.forEach(function (nome) {
    if (colonne[nome] === undefined) {
      throw new Error('Colonna di monitoraggio mancante: ' + nome);
    }
  });

  if (ultimaRiga <= CONFIG.RIGA_INTESTAZIONI) {
    return rispostaCatalogo_({ generatedAt: new Date().toISOString(), products: [] });
  }

  const valori = foglio
    .getRange(CONFIG.RIGA_INTESTAZIONI + 1, 1, ultimaRiga - CONFIG.RIGA_INTESTAZIONI, ultimaColonna)
    .getValues();
  const products = valori
    .filter(function (riga) { return normalizzaTesto(riga[colonne[CONFIG.COLONNA_ID]]); })
    .map(function (riga) {
      const data = riga[colonne[CONFIG.COLONNA_DATA_CHECK]];
      const prezzo = numero_(riga[colonne[CONFIG.COLONNA_PREZZO_RILEVATO]]);
      return {
        id: normalizzaTesto(riga[colonne[CONFIG.COLONNA_ID]]),
        price: prezzo,
        availability: normalizzaTesto(riga[colonne[CONFIG.COLONNA_DISPONIBILITA]]),
        status: normalizzaTesto(riga[colonne[CONFIG.COLONNA_ESITO]]),
        checkedAt: data instanceof Date && !isNaN(data.getTime()) ? data.toISOString() : '',
      };
    });

  return rispostaCatalogo_({
    generatedAt: new Date().toISOString(),
    products: products,
  });
}

function rispostaCatalogo_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
