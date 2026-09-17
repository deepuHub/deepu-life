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
| 🎙️ Carnatic (`carnatic-private.html`) | Carnatic vocal journey at Artium — badge medallions, lesson ladder, riyaaz log | Private — Google Sign-In |
| 💡 Ideas (`ideas-private.html`) | Ideas and projects — date each one turned up, status, AI verdict on whether to chase it, impact × effort matrix | Private — Google Sign-In |

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

**Kid page — one Sheet per grade.** Rather than one growing multi-grade Sheet, each grade gets its own Sheet named "<Student> — Report Cards - Grade N (Private)". `kid-private.html` keeps a `GRADE_SHEETS` map (`{ '1': spreadsheetId, '2': spreadsheetId, ... }`); clicking a grade chip lazy-loads that grade's Sheet (cached after the first fetch) rather than fetching everything up front. Add a new grade later by adding one line to `GRADE_SHEETS` — no other code changes.

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

Names and the Artium student id live in the Sheet's `meta` rows, never in the repo.

**Carnatic — one flat tab, many kinds.** `carnatic-private.html` reads a single tab, `Log`, whose columns
are `kind | group | seq | title | detail | date | value | status`. One row per thing; `kind` says what it
is — `meta` (hero facts, `title`=key/`value`=value), `level`, `lesson`, `topic` (`group` = the lesson
number it sits under), `class`, `assignment`, `badge` (`group` = Learn/Practice/Perform), `practice`.
Unknown kinds are ignored, so a new one can go in the Sheet before the page knows about it.
`data/carnatic.tsv` is the seed to paste in (gitignored with the rest of `data/*.tsv`).

The page **writes** only two things: an appended `practice` row, and an assignment's `status` cell —
both through the Sheets API as the signed-in user, same as the Bucket List. Lessons, classes and badges
are Artium's truth and only change on a sync.

**Syncing from Artium** — say *"Update carnatic"*. Claude reads `dashboard.artiumacademy.com` in the
logged-in browser (`/my-course`, `/my-classes`, `/assignmentlist`, `/my-badges`) and updates the Sheet,
then stamps the `synced_at` meta row — which is what the footer shows and what flags itself stale after
8 days. A sync must never overwrite an assignment `status` the family set on the page, same rule as the
School page's Homework & Notices tab.

There *is* a REST API behind that dashboard (`scholar.artiumacademy.com/api/...`), but it is Firebase-
authenticated, so an unattended script would need a stored refresh token granting full account access.
Deliberately not done: sync is browser-driven.

**Ideas — one flat tab.** `ideas-private.html` reads a single tab, `Ideas`, whose columns are
`id | kind | title | pitch | tags | date_added | status | impact | effort | verdict | confidence | rationale | next_step | link | reviewed`.
One row per idea. `kind` is `idea` or `project`; `status` is `spark | exploring | building | shipped |
parked | dropped`; `verdict` is Claude's call — `pursue | maybe | park | drop` — with a `confidence`
(0–100) and a one-or-two-sentence `rationale` behind it. `impact` and `effort` are 1–5 and place the
idea on the page's impact × effort matrix; rows missing either are simply left off it. Parsing is
header-driven, so columns can be reordered in the Sheet without touching the page.
`data/ideas.tsv` is the seed to paste in (gitignored with the rest of `data/*.tsv`).

The page **writes** two things: an idea's `status` cell, changed from the pill on its card, and a row
appended by the capture box at the top — which lands as a `spark` dated today with no verdict. Both go
through the Sheets API as the signed-in user, same as the Bucket List and Carnatic.

**Getting a verdict** — say *"Review ideas"*. Claude reads the rows with no verdict, weighs each against
what the rest of this site already does, and writes back `verdict`, `confidence`, `rationale`,
`next_step`, `impact`, `effort` and `reviewed`. A review must never touch `status` — that is the
family's call, the same rule as the School page's homework sync.

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
├── carnatic-private.html     ← Carnatic journey at Artium (private Sheet; seed in data/carnatic.tsv)
├── ideas-private.html        ← ideas & projects with AI verdicts (private Sheet; seed in data/ideas.tsv)
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
