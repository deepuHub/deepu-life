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
| 🎒 Kid (`kid-private.html`) | Report cards by grade/term + Continuous Assessment (CA) results, chip navigation | Private — Google Sign-In |
| 🩺 Health (`health-private.html`) | Vitals, lab panels, trend flags, action plan | Private — Google Sign-In |
| 🎓 BEd Results (`results-private.html`) | Semester results, subject-by-subject | Private — Google Sign-In |
| 🔥 Embers & Tides (`embers-tides-private.html`) | Coded intake index; every counterparty is a code | Private — Google Sign-In |
| ✶ Bucket List (`bucket-private.html`) | Life list as star charts — one constellation per section, one star per item | Private — Google Sign-In |

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

**Kid page — one Sheet per grade.** Rather than one growing multi-grade Sheet, each grade gets its own Sheet named "Udhbhav — Report Cards - Grade N (Private)". `kid-private.html` keeps a `GRADE_SHEETS` map (`{ '1': spreadsheetId, '2': spreadsheetId, ... }`); clicking a grade chip lazy-loads that grade's Sheet (cached after the first fetch) rather than fetching everything up front. Add a new grade later by adding one line to `GRADE_SHEETS` — no other code changes.

Each grade's Sheet has 5 tabs:
- `Report Meta` — `TermID | Grade | Division | Term | SchoolYear | House | AttendancePct | Present | Absent | Promoted | PreparedDate | AdvisorComment`
- `Subject Grades` — `TermID | Subject | TermGrade | EffortGrade`
- `Behavior Skills` — `TermID | Category | Skill | Rating`
- `CA Results` (optional — Continuous Assessments, fetched separately so the page still renders if this tab hasn't been added yet) — `CAID | CAName | Grade | Subject | MarksObtained | TotalMarks | Remark | Date`
- `CA Breakdown` (optional, same reason — question-level detail behind each CA Results row) — `CAID | Subject | Q# | What it covered | Marks Obtained | Max Marks`

`TermID` (e.g. `G2-T1`) and `CAID` (e.g. `G2-CA1`) are the join keys within a grade's tabs — same pattern as before, just scoped to one grade's Sheet instead of shared across all grades. One `CA Breakdown` tab holds every CA's questions (filtered by `CAID`), same as `CA Results` — not a separate tab per CA.

**Bucket List — one flat tab.** `bucket-private.html` reads a single tab, `List`, whose columns are
`section_id | section_name | section_sub | item | href | status`. Every row is one star; rows sharing a
`section_id` become one constellation, in the order the sections first appear. `section_id` seeds the
constellation's shape, so renaming one redraws that sky. `data/bucket-list.tsv` is the seed to paste
into the Sheet (gitignored along with the rest of `data/*.tsv` — the page reads the Sheet, never the
file).

Clicking a star writes `done` into that row's `status` cell through the Sheets API, as the signed-in
user — no Apps Script and no public write URL, unlike the School page's write-back, because this page
already holds an OAuth token. Progress therefore lives in the Sheet and follows you across devices; a
star is tied to its sheet row, so rows can be reordered freely. `GO DARK` clears the whole column and
asks first.

No forms, no localStorage sync, no third-party backend. Add a row in the Sheet, reload the page, it appears.

---

## Features

- **Cinematic timeline** — full-screen slide view, draggable scrubber, keyboard nav, touch swipe (shared across Tracker and Half Marathon)
- **Light / dark mode** — toggle in the nav, persisted, applied before first paint
- **Single source of truth nav** — `<deepu-nav active="page">` web component (`assets/js/nav.js`) renders the pill row and hamburger drawer from one link list; adding a new page means adding one entry, not editing every HTML file
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
├── bucket-private.html       ← bucket list as constellations (private Sheet; seed in data/bucket-list.tsv)
├── assets/
│   ├── css/
│   │   ├── tracker-theme.css ← shared design tokens, nav, light/dark palette
│   │   └── timeline.css      ← shared cinematic timeline styles
│   └── js/
│       ├── theme.js          ← light/dark toggle
│       ├── nav.js            ← <deepu-nav> web component: single source of truth for the nav (pill row + hamburger drawer)
│       └── timeline.js       ← shared cinematic timeline engine
├── AppScript.gs               ← paste into the public tracker's Apps Script
├── ExamAppScript.gs            ← paste into the private Exam Results Sheet's Apps Script
├── .nojekyll                  ← disables Jekyll processing (site is plain HTML)
└── README.md
```
