/**
 * deepu-life — Exams results backend
 * ====================================
 * Bind this to a NEW, separate Google Sheet (e.g. "Exam Results") that you
 * keep private — it only needs to accept writes from exam.html, nobody
 * needs to read it directly except you.
 *
 * SETUP:
 * 1. Create a new Google Sheet, name it "Exam Results".
 * 2. Extensions ▸ Apps Script ▸ paste this file in, replacing the placeholder.
 * 3. Run `setupSheet` once (Run ▸ setupSheet) to create the header row.
 *    Approve permissions when prompted.
 * 4. Deploy ▸ New deployment ▸ Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the /exec URL it gives you and paste it into RESULTS_GS_URL near
 *    the bottom of exam.html.
 *
 * Sheet tab "Results" columns: timestamp | name | test | score | max | pct | wrong questions
 * "Wrong questions" is a comma-separated list of question numbers the
 * student got wrong, e.g. "4,6,9" — empty if a perfect score.
 */

const RESULTS_SHEET_NAME = 'Results';

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RESULTS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(RESULTS_SHEET_NAME);
  if (!sheet.getRange(1, 1).getValue()) {
    const headers = ['Timestamp', 'Name', 'Test', 'Score', 'Max', 'Percent', 'Wrong Questions'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  SpreadsheetApp.getUi().alert('✅ Results sheet ready.');
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: append one result row (called by exam.html after every submit) ──
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(RESULTS_SHEET_NAME) || ss.insertSheet(RESULTS_SHEET_NAME);
    const body = JSON.parse(e.postData.contents);

    sheet.appendRow([
      body.date || new Date().toISOString(),
      body.name || '',
      body.test || '',
      body.score || 0,
      body.max || 0,
      body.pct || 0,
      body.wrong || '',
    ]);

    return respond({ status: 'ok' });
  } catch (err) {
    return respond({ status: 'error', message: err.message });
  }
}

// ── GET: optional — returns recent results if you want the page to show
//    cross-device history later (not wired into exam.html by default) ──
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(RESULTS_SHEET_NAME);
    if (!sheet) return respond({ results: [] });
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return respond({ results: [] });
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    }).reverse().slice(0, 50);
    return respond({ results: rows });
  } catch (err) {
    return respond({ status: 'error', message: err.message });
  }
}
