# deepu-life 🏃📚🌱

> Deepu's personal life tracker — Running · Reading · Hydroponics

**Live at:** https://deepuhub.github.io/deepu-life

---

## What it tracks

| Tab | What you log | Auto-calculated |
|-----|-------------|-----------------|
| 🏃 Run | Date, distance (mi), duration, notes | Pace (min/mile) |
| 📚 Read | Title, author, category, status, quotes | Books finished / reading / planned |
| 🌱 Grow | Plant, start date, hydro system, status, notes | Days growing |

---

## How it works

Data lives in **Google Sheets** — add a row in the sheet, reload the site, it appears.

```
Google Sheets  →  Apps Script Web App  →  deepu-life site
  (you edit)       (read-only API)         (displays it)
```

No forms in the app. No localStorage. No data loss. Works from any device.

---

## Features

- **Cinematic timeline** — full-screen slide view per tab, draggable scrubber, keyboard navigation (← →), touch swipe
- **List view** — sortable table on desktop, card layout on mobile
- **Quotes modal** — stored in Sheets, opens on click
- **Live sync status** — green dot in nav shows last sync time
- **"Add in Sheets" button** — deep-links directly to the right tab in your Sheet
- **Hero stats** — total miles, books finished, plants growing, live from Sheets
- Fully responsive — mobile, tablet, desktop
- Zero npm, zero build step — pure HTML/CSS/JS
- Google Analytics UA-139981219-1

---

## Repo structure

```
deepu-life/
├── index.html       ← the entire app (HTML + CSS + JS)
├── AppScript.gs     ← paste into Google Apps Script
├── _config.yml      ← GitHub Pages config
├── SETUP.md         ← step-by-step Google Sheets connection guide
└── README.md
```

---

## First-time setup

See **[SETUP.md](SETUP.md)** for the full walkthrough (~10 min, one-time).

Short version:
1. Create a Google Sheet
2. Paste `AppScript.gs` into Extensions → Apps Script
3. Run `setupSheets` — creates tabs, seeds your data
4. Deploy as Web App → copy the URL
5. Paste URL + Sheet ID into the two config lines in `index.html`
6. Push to GitHub → done

---

## Deploying to GitHub Pages

```bash
# Clone the repo
git clone https://github.com/deepuHub/deepu-life.git
cd deepu-life

# Copy files (after completing SETUP.md)
cp /path/to/index.html .
cp /path/to/AppScript.gs .
cp /path/to/_config.yml .
cp /path/to/SETUP.md .

# Push
git add .
git commit -m "Connect to Google Sheets"
git push origin main
```

Then in GitHub: **Settings → Pages → Source: main branch → / (root) → Save**

Site goes live at: `https://deepuhub.github.io/deepu-life`

---

## Daily workflow

**Add a run** → open Sheet → Runs tab → new row at bottom → reload site

**Add a book** → Books tab → new row → status: `planned` / `reading` / `done`

**Add quotes** → Books tab → quotes column → separate with `|`
```
First insight from the book.|Second great line.|Third quote.
```

**Update book status** → change the cell → reload site

**Add a plant** → Plants tab → new row → status: `growing` / `harvested` / `failed`

---

Hosted with ❤ on GitHub Pages · Data powered by Google Sheets
