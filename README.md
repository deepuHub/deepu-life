# deepu-life 🏃📚🌱🚴

> Deepu's personal life tracker — Running · Reading · Hydroponics · Cycling

**Live at:** https://deepuhub.github.io/deepu-life

---

## What it tracks

| Tab | What you log | Auto-calculated |
|-----|-------------|------------------|
| 🏃 Run | Date, distance (mi), duration, notes | Pace (min/mile) |
| 📚 Read | Title, author, category, status, quotes | Books finished / reading / planned |
| 🌱 Grow | Plant, start date, hydro system, status, notes | Days growing |
| 🚴 Cycle | Date, distance (km), duration, route, notes | Pace (min/km), total km |

---

## How it works

Data lives in **Google Sheets** — add a row in the sheet, reload the site, it appears.

```
Google Sheets → Apps Script Web App → deepu-life site
  (you edit)       (read-only API)       (displays it)
```

No forms in the app. No localStorage. No data loss. Works from any device.

---

## Features

- **Cinematic timeline** — full-screen slide view per tab, draggable scrubber, keyboard navigation (← →), touch swipe
- **List view** — sortable table on desktop, card layout on mobile
- **Quotes modal** — stored in Sheets, opens on click
- **Live sync status** — green dot in nav shows last sync time
- **"Add in Sheets" button** — deep-links directly to the right tab in your Sheet
- **Hero stats** — total miles, books finished, plants growing, total km cycled, live from Sheets
- Fully responsive — mobile, tablet, desktop
- Zero npm, zero build step — pure HTML/CSS/JS
- Google Analytics UA-139981219-1

---

## Repo structure

```
deepu-life/
├── index.html            ← the tracker app (HTML + CSS + JS)
├── todo.html             ← to-do list
├── quotes.html           ← saved quotes, reads from a Sheet
├── 2026_school.html      ← school timings & food timetable
├── health_dashboard.html ← personal health metrics
├── AppScript.gs          ← paste into Google Apps Script
├── _config.yml           ← GitHub Pages config
├── .nojekyll             ← disables Jekyll processing (site is plain HTML)
├── README.md
└── SETUP.md              ← setup guide
```
