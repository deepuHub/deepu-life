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
| 🏦 Loans (`loans-private.html`) | The car and the house — burn-down of each schedule, the builder's construction-linked ladder, and who paid for what | Private — Google Sign-In |

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

**Every card is editable in place.** The status pill writes its own cell on change; the pencil next to
it turns the card into a form covering every other column except `id` and `reviewed` — title, pitch,
the date it came up, verdict, confidence, impact, effort, rationale, next step, tags and link. Saving
diffs the form against the row and sends only the cells that actually changed, as a single
`values:batchUpdate`, so a one-word fix is one cell rather than fifteen. Escape cancels, Cmd/Ctrl+Enter
saves, and only one card is open at a time. The capture box at the top appends a row instead, landing
as a `spark` dated today with no verdict. All of it goes through the Sheets API as the signed-in user,
same as the Bucket List and Carnatic.

Writes are RAW, not USER_ENTERED, so a date stays the literal text `2026-09-17`. Left to parse it,
Sheets makes it a date cell and hands it back in the sheet's own locale — `17/09/2026` on an Indian
sheet — which `new Date()` refuses, and the card loses its age and its idle flag. Import the seed with
*Convert text to numbers, dates, and formulas* set to **No** for the same reason.

**Getting a verdict** — say *"Review ideas"*. Claude reads the rows with no verdict, weighs each against
what the rest of this site already does, and writes back `verdict`, `confidence`, `rationale`,
`next_step`, `impact`, `effort` and `reviewed`. Rows that already have a verdict are left alone unless a
re-score is asked for by name — which is what makes a verdict overridden by hand on the page stick. A
review must never touch `status` either; that is the family's call, the same rule as the School page's
homework sync.

**Loans — a tab per schedule.** `loans-private.html` reads seven tabs, each with only the columns it
actually uses. Unlike Bucket List, Carnatic and Ideas — which are flat single tabs — the loans data is
genuinely heterogeneous, and the monthly job is two cells: did the car EMI go out, did the house one. A tab
per schedule puts this month's row next to last month's and nothing else:

- `Meta` — `key | value`: `synced_at`, `source`, `property_value`, `property_base`, `property_gst`
- `Loans` — `loan | name | lender | sanctioned | emi | rate_pct | tenure | first_due | balance | status`, one row per loan; `loan` is the slug (`car`, `house`) the schedule tabs below belong to
- `Car` / `House` — `instl | due | amount | principal | interest | balance | status | paid_on`, one row per instalment. `principal`, `interest` and `balance` may be left blank and are derived, so a row only needs the instalment number, its date, what was charged and the status. Car is a fixed amortisation table — the bank issued all 84 rows up front. House is not: it is still drawing down, so its instalment is pre-EMI interest on whatever has been released and steps up with every further tranche, and its rows run only as far as months that have actually happened
- `Disbursals` — `no | date | amount | status | note`, the bank releasing money to the builder
- `Milestones` — `no | stage | pct | principal | gst | total | status | date | note`, the builder's construction-linked payment plan
- `MoneyIn` — `no | type | name | date | amount | status | note`; `type` is `own` (paid to the builder ourselves) or `contribution` (money in from family)

Each tab is read header-first, so its columns can be reordered without touching the page, and all seven come
back in one `values:batchGet`. A tab the page does not know about is simply not read, so one can be added to
the Sheet first. Every parsed row remembers the tab it came from, its sheet row and where its `status` cell
sits — that trio is what a toggle writes back to.

`data/loans.xlsx` is the seed: upload it to Drive and open it with Google Sheets and all seven tabs arrive
correctly named, with dates stored as text so they survive the conversion (a date left for Sheets to parse
comes back in the sheet's own locale and stops parsing — the same trap as Ideas). The same content is in
`data/loans/*.tsv`, one file per tab, for building them by hand. Both are gitignored — the page reads the
Sheet, never the files.

Everything on the page is derived from those rows — nothing is hard-coded. **This month** sits at the top
and is the whole monthly ritual: the next unpaid instalment on each loan, with a MARK PAID pill that writes
straight to that loan's tab, and anything past its due date called out as overdue. Below it the hero adds up
what both banks are owed today and what the month costs; each loan gets a burn-down of its outstanding
principal, solid up to the last instalment marked paid and dashed for what is still to come, plus a bar
splitting the whole loan into principal retired, interest paid, principal left and interest still to come. A
loan whose instalments have retired no principal is called what it is — pre-EMI, interest only — and a
schedule whose last recorded instalment is more than 45 days old says so, because a tracker drifting is not
the loan pausing.

**The house loan is still drawing down**, and that is the thing the page is built to show. The bank funds
the milestones that carry a `pct` — a share of the agreement value — and has covered those in full so far;
the no-pct rows (booking, registration, and the charges at the end) came out of our own pocket. That rule is
read off the data rather than assumed, so the page can say what the remaining stages do to the monthly bill:
each 10% stage adds about ₹9,944 a month, and at full drawdown the interest alone is roughly ₹94,468 against
₹29,835 today. Until the principal starts amortising, none of it touches the balance.

**Nothing anyone can be expected to know has to be typed.** A blank `principal` is 0, a blank `interest` is
the rest of the instalment, and a blank `balance` is the previous one less what was just paid off — or,
while a loan is still drawing down, whatever the `Disbursals` tab says had been released by that date. So
the first three house instalments correctly show ₹17,07,837, ₹17,96,786 and ₹35,87,000 without anyone
working it out, and adding a tranche to `Disbursals` when it lands corrects every instalment after it.

**The page writes nothing.** It reads the Sheet and renders it, asking for a `spreadsheets.readonly` token
— so the guarantee is Google's rather than the page's: a bug here, or anything served in its place, still
cannot move a figure. Unlike Bucket List, Carnatic and Ideas, which write their own status cells, these are
loan schedules and a property ledger, and being wrong about them costs more than editing in place is worth.
Status is set in the Sheet.

**Syncing** — say *"Update loans"*. The source is a workbook in Drive (`Loans.xlsx`), one tab per schedule;
Claude re-reads it, refreshes the rows and stamps the `synced_at` meta row, which is what the footer shows.
A sync must never clobber a `status` set by hand on the page, same rule as the School page's homework sync.

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
├── loans-private.html        ← car & house loans, builder ladder (private Sheet; seed in data/loans.xlsx + data/loans/)
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
