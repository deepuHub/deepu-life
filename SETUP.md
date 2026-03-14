# deepu-life × Google Sheets Setup
## ~10 minutes · One-time · No coding

---

## How it works

```
Google Sheets  →  Apps Script Web App  →  deepu-life site
  (you edit)       (serves the data)       (displays it)
```

You add/edit everything in Google Sheets like a normal spreadsheet.  
Open the site → it fetches the latest data → displays your cinematic timeline.  
No syncing, no accounts, no third-party services. Just your Sheet and your site.

---

## Step 1 — Create the Google Sheet

1. Go to **[sheets.google.com](https://sheets.google.com)** → **Blank spreadsheet**
2. Rename it: click "Untitled spreadsheet" at top → type `deepu-life` → Enter
3. **Copy the Sheet ID from the URL** — it's the long string between `/d/` and `/edit`:
   ```
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_ID/edit
   https://docs.google.com/spreadsheets/d/1IqAAGq7i0MUtz1wwv23qfjjNGiIMIwigbpvK2zssUxE/edit
   ```
   Save this — you'll need it in Step 6.

---

## Step 2 — Open Apps Script

In your Sheet: **Extensions → Apps Script**

A new tab opens with the script editor. You should see a mostly empty file.

---

## Step 3 — Paste the backend code

1. Select all existing code in the editor (Ctrl/Cmd+A) → Delete
2. Open **AppScript.gs** from this folder → Copy everything
3. Paste it into the editor
4. Click **Save** (Ctrl/Cmd+S)
5. Rename the project: click "Untitled project" at top → type `deepu-life-api` → OK

---

## Step 4 — Run setupSheets (creates tabs + seeds your data)

1. In the function dropdown (shows "Select function"), choose **setupSheets**
2. Click **▶ Run**
3. **First time only:** Google asks for permissions
   - Click **Review permissions**
   - Choose your Google account
   - Click **Allow**
4. Click **▶ Run** again
5. A popup appears: *"✅ Done! Tabs Runs, Books, and Plants are ready…"*

Go back to your Sheet — you'll see three new tabs: **Runs · Books · Plants**  
All your real data is already in there.

---

## Step 5 — Deploy as a Web App

Still in the Apps Script editor:

1. Click **Deploy** (top right) → **New deployment**
2. Click the **gear icon ⚙** next to "Select type" → choose **Web app**
3. Set these options:
   ```
   Description:      deepu-life API
   Execute as:       Me
   Who has access:   Anyone
   ```
   *("Anyone" is safe — there's no sensitive data, and it only reads your Sheet)*
4. Click **Deploy**
5. Click **Authorize access** → choose your account → Allow
6. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycbXXXXXXXX/exec
   ```

---

## Step 6 — Connect the site to your Sheet

Open **index.html** in any text editor. Find these two lines near the top of the `<script>` block:

```javascript
const GS_URL      = '';  // Apps Script Web App URL
const GS_SHEET_ID = '';  // Google Sheet ID
```

Fill them in:

```javascript
const GS_URL      = 'https://script.google.com/macros/s/AKfycbXXXXX/exec';
const GS_SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
```

Save the file. Commit and push to GitHub.

---

## Step 7 — Test it

Open your site (`https://deepuhub.github.io/deepu-life`).

You'll see a spinner briefly, then all your data loads.  
The nav bar shows a small **green dot + "Synced at HH:MM"** — that's your live connection status.

✅ You're done.

---

## Your daily workflow

### Adding a new run
Open **Google Sheets → Runs tab** → add a new row at the bottom:

| id | date | dist | time | note |
|----|------|------|------|------|
| 5 | 2025-08-15 | 5.0 | 52 | First 5-miler! |

Reload the site → it appears in the list and timeline.

### Adding a book
**Books tab** → new row:

| id | title | author | cat | status | added | quotes |
|----|-------|--------|-----|--------|-------|--------|
| 27 | Thinking Fast and Slow | Daniel Kahneman | Psychology | reading | 2025-08-01 | |

Status options: `done` · `reading` · `planned`

### Adding quotes to a book
In the **quotes** column, separate multiple quotes with a pipe `|`:
```
System 1 is fast, automatic, and emotional.|System 2 is slow, deliberate, and logical.
```

### Updating a book status
Change `planned` → `reading` → `done` directly in the cell.  
Reload the site → badge updates instantly.

### Adding a plant
**Plants tab** → new row:

| id | name | date | system | status | note |
|----|------|------|--------|--------|------|
| 6 | Tomato | 2025-08-01 | DWC | growing | First time trying tomatoes |

Status options: `growing` · `harvested` · `failed`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Spinner never goes away | Check `GS_URL` is pasted correctly — no trailing space |
| "Could not load" error | Make sure "Who has access" is set to **Anyone** in the deployment |
| Data doesn't update after editing Sheet | Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac) |
| Old data still showing | Re-deploy: Apps Script → Deploy → Manage deployments → Edit → New version → Deploy |
| Sheet tabs missing | Run `setupSheets` again from Apps Script editor |
| Green dot missing | Check `GS_SHEET_ID` is set in index.html |

---

## Column reference

**Runs** — `id` · `date` (YYYY-MM-DD) · `dist` (miles, e.g. 3.1) · `time` (minutes, optional) · `note`

**Books** — `id` · `title` · `author` · `cat` · `status` (done/reading/planned) · `added` (YYYY-MM-DD) · `quotes` (pipe-separated, optional)

**Plants** — `id` · `name` · `date` (YYYY-MM-DD) · `system` (NFT/DWC/Kratky/etc) · `status` (growing/harvested/failed) · `note`

---

## Re-deploying after changing AppScript.gs

If you ever edit the script:
1. Apps Script editor → **Deploy → Manage deployments**
2. Click ✏ Edit on your deployment
3. Version → **New version**
4. Click **Deploy**

The URL stays the same — no changes needed in index.html.
