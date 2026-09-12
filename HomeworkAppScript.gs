/**
 * deepu-life — Homework & Notices backend
 * ==========================================
 * Bind this to the same "School notifications" Sheet that 2026_school.html
 * already reads as CSV for the Homework & Notices tab (tab name "managebac").
 * Lets the page write the `status` column back to the sheet — e.g. tapping
 * "✅ Done" on a task — instead of opening Sheets by hand every time.
 *
 * SETUP:
 * 1. Open the "School notifications" Sheet ▸ Extensions ▸ Apps Script ▸
 *    paste this file in, replacing the placeholder.
 * 2. Deploy ▸ New deployment ▸ Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 * 3. Copy the /exec URL it gives you and paste it into HOMEWORK_GS_URL near
 *    the bottom of 2026_school.html.
 *
 * Tab "managebac" columns (row 1 header): date | date_label | type | subject
 * | title | detail | status
 * The page identifies a row by its sheet row number (2 = first data row —
 * matches the CSV export's row order 1:1) and only ever writes the `status`
 * cell for that row, nothing else.
 */

const HOMEWORK_TAB_NAME = 'managebac';
const HOMEWORK_STATUS_COL = 7; // column G

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: update one row's status (called when a task is marked done/pending) ──
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(HOMEWORK_TAB_NAME);
    if (!sheet) return respond({ status: 'error', message: 'Tab "' + HOMEWORK_TAB_NAME + '" not found' });

    const body = JSON.parse(e.postData.contents);
    const row = Number(body.row);
    const newStatus = String(body.status || '').trim().toLowerCase();

    if (!row || row < 2 || row > sheet.getLastRow()) {
      return respond({ status: 'error', message: 'Invalid row: ' + body.row });
    }
    if (newStatus !== 'done' && newStatus !== '') {
      return respond({ status: 'error', message: 'Invalid status: ' + body.status });
    }

    sheet.getRange(row, HOMEWORK_STATUS_COL).setValue(newStatus);
    return respond({ status: 'ok', row: row, newStatus: newStatus });
  } catch (err) {
    return respond({ status: 'error', message: err.message });
  }
}
