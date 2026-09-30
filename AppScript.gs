/**
 * deepu-life — Google Apps Script Backend
 * =========================================
 * Serves your Sheets data to the app. You add/edit data directly in
 * Google Sheets. The one thing the site writes is the visitor counter.
 *
 * Sheet tabs expected (created by setupSheets below):
 *   Runs  → id | date | dist | time | note
 *   Books → id | title | author | cat | status | added | quotes
 *   Plants → id | name | date | system | status | note
 *   Rides → id | week | date | type | duration | zone | note | dist | status
 *   Plan  → id | week | day | type | target | status | date | note
 *           (status: planned/done/skipped — used by half-marathon.html)
 *   Visits → country | count | last_seen
 *           (index.html's visitor tile; created on the first visit)
 *
 * Endpoints (all GET):
 *   ?action=getAll            → every tab above (default)
 *   ?action=visits            → visitor totals
 *   ?action=hit&country=IN    → count one visit, then return visitor totals
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
    const action = (e && e.parameter && e.parameter.action) || 'getAll';
    if (action === 'hit')    return respond({ visits: recordVisit(ss, e.parameter.country) });
    if (action === 'visits') return respond({ visits: visitSummary(visitsSheet(ss)) });
    return respond({
      runs:    sheetToObjects(ss.getSheetByName('Runs')),
      books:   sheetToObjects(ss.getSheetByName('Books')),
      plants:  sheetToObjects(ss.getSheetByName('Plants')),
      cycling: sheetToObjects(ss.getSheetByName('Rides'), { cleanRide: true }),
      plan:    sheetToObjects(ss.getSheetByName('Plan')),
      // tab name → gid, so each page's "Add in Sheets" button opens its own tab
      gids:    Object.fromEntries(ss.getSheets().map(s => [s.getName(), s.getSheetId()])),
    });
  } catch (err) {
    return respond({ error: err.message });
  }
}
// ─── Visitor counter — one row per country, no IPs stored ────────────────────
function visitsSheet(ss) {
  let sheet = ss.getSheetByName('Visits');
  if (!sheet) {
    sheet = ss.insertSheet('Visits');
    sheet.getRange(1, 1, 1, 3).setValues([['country', 'count', 'last_seen']]).setFontWeight('bold');
  }
  return sheet;
}

function recordVisit(ss, rawCountry) {
  // The browser supplies an ISO 3166 alpha-2 code; anything else counts as "ZZ" (unknown).
  const country = /^[A-Za-z]{2}$/.test(String(rawCountry || '')) ? String(rawCountry).toUpperCase() : 'ZZ';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = visitsSheet(ss);
    const rows = sheet.getDataRange().getValues();
    const idx = rows.findIndex((r, i) => i > 0 && r[0] === country);
    if (idx > 0) {
      sheet.getRange(idx + 1, 2, 1, 2).setValues([[Number(rows[idx][1] || 0) + 1, new Date()]]);
    } else {
      sheet.appendRow([country, 1, new Date()]);
    }
    return visitSummary(sheet);
  } finally {
    lock.releaseLock();
  }
}

function visitSummary(sheet) {
  const countries = sheet.getDataRange().getValues().slice(1)
    .filter(r => r[0])
    .map(r => ({ country: String(r[0]), count: Number(r[1] || 0) }))
    .sort((a, b) => b.count - a.count);
  return { total: countries.reduce((s, c) => s + c.count, 0), countries };
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
    'Plan':   ['id','week','day','type','target','status','date','note'],
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
