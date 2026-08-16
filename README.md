# deepu-life 🏃📚🚴

> Deepu's personal life tracker & family dashboard

**Live at:** https://deepuhub.github.io/deepu-life

---

## Pages

| Page | What it is | Access |
|---|---|---|
| 🏃 Tracker (`index.html`) | Run / Read / Cycle logs, hero stats, cinematic timeline | Public |
| ✅ To-Do (`todo.html`) | Checklists, local-only storage | Public |
| 💬 Quotes (`quotes.html`) | Saved quotes, reads from a Sheet | Public |
| 🏫 School (`2026_school.html`) | School timings, food timetable, exam countdown | Public |
| 🏅 Half Marathon (`half-marathon.html`) | Training plan with live race-day countdown | Public |
| 🧮 Exams (`exam.html`) | Touch-friendly practice tests, Regular/Hulk-mode Harder, reads from a Sheet, auto-scores | Public |
| 🎒 Kid (`kid-private.html`) | Report cards by grade/term, chip navigation | Private — Google Sign-In |
| 🩺 Health (`health-private.html`) | Vitals, lab panels, trend flags, action plan | Private — Google Sign-In |
| 🎓 BEd Results (`results-private.html`) | Semester results, subject-by-subject | Private — Google Sign-In |
| 🔥 Embers & Tides (`embers-tides-private.html`) | Coded intake index; every counterparty is a code | Private — Google Sign-In |

Private pages render nothing until Google authenticates the one account with access to that page's Sheet — enforced by Google, not by the page.

---

## How it works

**Public tracker** — one shared Google Sheet + one Apps Script web app (`AppScript.gs`), read by `index.html`, `quotes.html`, and `half-marathon.html`:

```
Google Sheets  →  Apps Script Web App (doGet)  →  site fetches JSON
```

**Exams** — questions live in a Google Sheet (one tab per test), published to web as CSV and fetched
directly by `exam.html` (same CSV pattern as `quotes.html`). Grading happens client-side. Each submitted
result is saved to `localStorage` (so the in-page history always works) and also POSTed to a separate,
private results Sheet via `ExamAppScript.gs` for a durable record. See the setup comment block at the
top of `exam.html`'s `<script>` for the one-time publish/deploy steps.

**Private pages** — each has its own private Google Sheet (Restricted sharing) with no public web app. The page itself uses Google Identity Services (OAuth) to get an access token for the signed-in user, then reads the Sheet directly via the Sheets API. Each private Sheet also has its own Apps Script for auto-computed fields (e.g. Health's trend flags) — those scripts are bound to the Sheet itself and are not part of this repo, since they're personal.

No forms, no localStorage sync, no third-party backend. Add a row in the Sheet, reload the page, it appears.

---

## Features

- **Cinematic timeline** — full-screen slide view, draggable scrubber, keyboard nav, touch swipe (shared across Tracker and Half Marathon)
- **Light / dark mode** — toggle in the nav, persisted, applied before first paint
- **Mobile nav** — pill row on desktop collapses into a hamburger drawer below 860px, grouped into Public / 🔒 Private
- **Chip navigation** — Kid and BEd Results pages navigate by Grade/Term or Semester via pill chips instead of one long page
- Zero npm, zero build step — pure HTML/CSS/JS

---

## Repo structure

```
deepu-life/
├── index.html              ← tracker app (Run/Read/Cycle)
├── todo.html                ← to-do list
├── quotes.html               ← saved quotes, reads from a Sheet
├── 2026_school.html          ← school timings & food timetable (standalone theme)
├── half-marathon.html        ← training plan + race countdown
├── exam.html                  ← practice tests, hero-themed per test, reads from a Sheet
├── health-private.html       ← private health dashboard (Google Sign-In)
├── kid-private.html          ← private report-card dashboard (Google Sign-In)
├── results-private.html      ← private BEd results dashboard (Google Sign-In)
├── embers-tides-private.html ← coded intake index (private Sheet; seed built by scripts/)
├── assets/
│   ├── css/
│   │   ├── tracker-theme.css ← shared design tokens, nav, light/dark palette
│   │   └── timeline.css      ← shared cinematic timeline styles
│   └── js/
│       ├── theme.js          ← light/dark toggle
│       ├── nav.js            ← mobile hamburger drawer
│       └── timeline.js       ← shared cinematic timeline engine
├── AppScript.gs               ← paste into the public tracker's Apps Script
├── ExamAppScript.gs            ← paste into the private Exam Results Sheet's Apps Script
├── .nojekyll                  ← disables Jekyll processing (site is plain HTML)
└── README.md
```
