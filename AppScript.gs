/**
 * deepu-life — Google Apps Script Backend
 * =========================================
 * Read-only API: serves your Sheets data to the app.
 * You add/edit data directly in Google Sheets.
 *
 * Sheet tabs expected (created by setupSheets below):
 *   Runs   → id | date | dist | time | note
 *   Books  → id | title | author | cat | status | added | quotes
 *   Plants → id | name | date | system | status | note
 *
 * Books > Quotes column: pipe-separated strings
 *   e.g.  "First insight.|Second great line.|Third quote."
 */

// ─── CORS / response helper ───────────────────────────────────────────────────
function respond(data) {
  // Note: Apps Script's ContentService does NOT support .setHeader().
  // CORS is handled automatically when the Web App is deployed with "Anyone" access.
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── GET: serve all three sheets ─────────────────────────────────────────────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return respond({
      runs:   sheetToObjects(ss.getSheetByName('Runs')),
      books:  sheetToObjects(ss.getSheetByName('Books')),
      plants: sheetToObjects(ss.getSheetByName('Plants')),
    });
  } catch (err) {
    return respond({ error: err.message });
  }
}

// ─── Convert sheet rows → array of objects (row 1 = headers) ─────────────────
function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        obj[h] = (val !== undefined && val !== null) ? String(val) : '';
      });
      return obj;
    });
}

// ─── ONE-TIME SETUP: creates tabs + seeds all your data ──────────────────────
// Run this ONCE from Apps Script editor: select setupSheets → click ▶ Run
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // Tab definitions: name → headers
  const tabDefs = {
    'Runs':   ['id','date','dist','time','note'],
    'Books':  ['id','title','author','cat','status','added','quotes'],
    'Plants': ['id','name','date','system','status','note'],
  };

  // Create or verify each tab
  Object.entries(tabDefs).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (!sheet.getRange(1,1).getValue()) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1a2a1a')
        .setFontColor('#c8f04a');
      sheet.setFrozenRows(1);
    }
  });

  // Seed data
  _seedRuns(ss.getSheetByName('Runs'));
  _seedBooks(ss.getSheetByName('Books'));
  _seedPlants(ss.getSheetByName('Plants'));

  ui.alert('✅ Done!\n\nTabs Runs, Books, and Plants are ready with your data.\nNow deploy as a Web App (Deploy → New deployment).');
}

function _seedRuns(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2,1,4,5).setValues([
    ['1','2015-12-01','3.1', '', '5K race 🏅 First ever race!'],
    ['2','2018-12-01','6.2', '', '10K race 🏅 Chased it down with a 4-week plan'],
    ['3','2020-01-25','6.2', '', '10K race 🏅 Jan 2020 — beat the previous time!'],
    ['4','2024-12-01','13.1','', 'Half Marathon 🏅🥇 Finally did it after years of "planning"!'],
  ]);
}

function _seedBooks(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2,1,26,7).setValues([
    ['1', 'Learning How to Learn',                     'Dr. Barbara Oakley & Dr. Terrence Sejnowski','Learning',   'done',    '2016-05-21',''],
    ['2', 'Calculus One',                              'Jim Fowler @ Coursera',                       'Math',       'done',    '2016-09-26',''],
    ['3', 'Playing It My Way',                         'Sachin Tendulkar',                            'Biography',  'done',    '2016-05-25',''],
    ['4', 'Machine Learning is Fun! Part 1-8',         'Adam Geitgey @ Medium',                       'AI/ML',      'done',    '2017-11-18','Machine learning people call 128 measurements of each face an embedding — once trained, it works on any new face.|Sequence-to-sequence learning rewrote machine translation overnight.'],
    ['5', 'Bitcoin will come to bad end (Buffett)',    'Dominic Rushe',                               'Article',    'done',    '2018-03-25',''],
    ['6', 'Visualizing the $15.7 Trillion Impact of AI','Jeff Desjardins',                            'Article',    'done',    '2018-05-25',''],
    ['7', '10 skills to survive the rise of automation','Jeff Desjardins',                            'Article',    'done',    '2018-07-07','Top skills needed: complex problem solving, critical thinking, creativity, emotional intelligence, judgment and decision making.'],
    ['8', 'Machine Learning (Week 5/11)',               'Andrew Ng @ Coursera',                       'AI/ML',      'done',    '2018-07-22','The core idea: teaching a computer to learn using data — without being explicitly programmed.|Regularization prevents models from overfitting the training data.'],
    ['9', 'The DevOps Handbook',                       'Gene Kim, Patrick Debois et al.',             'Tech',       'done',    '2019-07-31',"Stop starting. Start finishing.|When failures occur, treat them as opportunities for learning — not as causes for punishment and blame.|Don't fight stupid, make more awesome. — Jesse Robbins, Amazon."],
    ['10','Factfulness',                               'Hans Rosling, Ola Rosling, Anna Rosling Rönnlund','Non-Fiction','done','2019-08-17',"When only 14 children die per 1,000 in Malaysia, this number measures the quality of the entire society: food, sewage, health care, literacy.|The world cannot be understood without numbers — and not with numbers alone.|The blame instinct stops us finding the real cause — once we blame someone, we stop looking for explanations elsewhere."],
    ['11',"Let's Talk Money",                          'Monika Halan',                                'Finance',    'done',    '2020-05-25',''],
    ['12','Raja Shivchhatrapati — Volume 1',           'Babasaheb Purandare',                         'History',    'done',    '2020-04-05',''],
    ['13','Raja Shivchhatrapati — Volume 2',           'Babasaheb Purandare',                         'History',    'done',    '2021-04-07',''],
    ['14','Life 3.0: Being Human in the Age of AI',    'Max Tegmark',                                 'AI/ML',      'done',    '2021-12-23',''],
    ['15','Health in Your Hands: v.1',                 'Devendra Vora',                               'Health',     'done',    '2022-06-23',''],
    ['16','Elements of Indic Knowledge Systems',       'Dr. Mohan Raghavan et al.',                   'Philosophy', 'done',    '2023-12-28','Heritage is our inheritance from generations gone by — tangible (land, architecture) and intangible (language, philosophy, rituals).|Sense organs are the doors through which we take in our environment — the foundation of Indic understanding of consciousness.'],
    ['17','The Almanack of Naval Ravikant',            'Eric Jorgenson',                              'Self',       'done',    '2025-02-13','Specific knowledge cannot be trained — it can only be discovered.|Value your time at an hourly rate and ruthlessly spend to save it at that rate — no one will value you more than you value yourself.'],
    ['18',"Let's Talk Mutual Funds",                   'Monika Halan',                                'Finance',    'done',    '2025-03-26',''],
    ['19','Men Are from Mars, Women Are from Venus',   'John Gray',                                   'Self',       'done',    '2025-04-11',''],
    ['20','Zero to One',                               'Peter Thiel with Blake Masters',              'Business',   'done',    '2025-06-11',''],
    ['21','The Art of Doing Twice the Work in Half the Time','Jeff Sutherland & J.J. Sutherland',    'Productivity','reading','2025-07-01',''],
    ['22','For the Love of Physics',                   'Walter Lewin',                                'Science',    'planned', '2025-07-01',''],
    ['23','The Better Angels of Our Nature',           'Steven Pinker',                               'Non-Fiction','planned', '2025-07-01',''],
    ['24','Enlightenment Now',                         'Steven Pinker',                               'Non-Fiction','planned', '2025-07-01',''],
    ['25','Educated',                                  'Tara Westover',                               'Biography',  'planned', '2025-07-01',''],
    ['26','Army of None',                              'Paul Scharre',                                'AI/ML',      'planned', '2025-07-01',''],
  ]);
}

function _seedPlants(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2,1,5,6).setValues([
    ['1','Basil',    '2025-02-10','Kratky','growing',   'Week 4, smells amazing'],
    ['2','Spinach',  '2025-02-20','DWC',   'growing',   'Day 18, dense leaves'],
    ['3','Lettuce',  '2025-01-20','NFT',   'harvested', 'Great yield — 2 heads'],
    ['4','Mint',     '2024-11-10','Kratky','harvested', 'Harvested 3 times!'],
    ['5','Cilantro', '2024-10-01','DWC',   'failed',    'Bolted too fast'],
  ]);
}
