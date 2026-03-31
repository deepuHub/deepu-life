/**
 * deepu-life — Google Apps Script Backend
 * =========================================
 * Read-only API: serves your Sheets data to the app.
 * You add/edit data directly in Google Sheets.
 *
 * Sheet tabs expected (created by setupSheets below):
 *   Runs  → id | date | dist | time | note
 *   Books → id | title | author | cat | status | added | quotes
 *   Plants → id | name | date | system | status | note
 *   Rides → id | week | date | type | duration | zone | note | dist | status
 */
// ─── CORS / response helper ───────────────────────────────────────────────────
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
// ─── GET: serve all four sheets ──────────────────────────────────────────────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return respond({
      runs:    sheetToObjects(ss.getSheetByName('Runs')),
      books:   sheetToObjects(ss.getSheetByName('Books')),
      plants:  sheetToObjects(ss.getSheetByName('Plants')),
      cycling: sheetToObjects(ss.getSheetByName('Rides'), { cleanRide: true }),
    });
  } catch (err) {
    return respond({ error: err.message });
  }
}
// ─── Convert sheet rows → array of objects (row 1 = headers) ─────────────────
function sheetToObjects(sheet, opts) {
  opts = opts || {};
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim().toLowerCase()); 
  return data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        let strVal = (val !== undefined && val !== null) ? String(val) : '';
        
        // Training Plan Parsing for Rides
        if (opts.cleanRide) {
          // dist: "7-9 km" or "25 km" -> take high number
          if (h === 'dist') {
            const matches = strVal.match(/(\d+)(?:-(\d+))?/);
            if (matches) {
              strVal = matches[2] || matches[1]; // Use high end of range if exists
            }
          }
          // duration: integer minutes (35) -> HH:MM:SS
          if (h === 'duration') {
            const mins = parseInt(strVal);
            if (!isNaN(mins)) {
              const hh = Math.floor(mins / 60);
              const mm = mins % 60;
              strVal = hh + ':' + String(mm).padStart(2,'0') + ':00';
            }
          }
        }
        obj[h] = strVal;
      });
      return obj;
    });
}
// ─── ONE-TIME SETUP: creates tabs ───────────────────────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabDefs = {
    'Runs':   ['id','date','dist','time','note'],
    'Books':  ['id','title','author','cat','status','added','quotes'],
    'Plants': ['id','name','date','system','status','note'],
    'Rides':  ['id','week','date','type','duration','zone','note','dist','status'],
  };
  Object.entries(tabDefs).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (!sheet.getRange(1,1).getValue()) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  });
  SpreadsheetApp.getUi().alert('✅ Headers updated for all tabs.');
}
