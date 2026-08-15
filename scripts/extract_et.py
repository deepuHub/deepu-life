#!/usr/bin/env python3
"""
Builds data/et.json from raw statement exports.

Run locally. The raw statements are never committed and no payee name ever
reaches the output — every vendor is reduced to a code (S1, P1, T1...) before
anything is written. See the leak check at the bottom of this file.

    python3 scripts/extract_et.py

No third-party deps: xlsx is a zip of XML, parsed with the stdlib.
"""

import datetime
import hashlib
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "et.json")



# ── local configuration ──────────────────────────────────────────────────────
# Every identifying pattern — payee names, venue names, statement paths — lives
# in a git-ignored config file, NOT in this script. This file is safe to commit;
# that one never is. Real people's names must not reach a public repo.

CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "et.config.local.json")


def load_config():
    if not os.path.exists(CONFIG):
        sys.exit(
            f"Missing {os.path.basename(CONFIG)}.\n"
            "It holds the payee patterns and statement paths and is deliberately\n"
            "git-ignored. See README for the shape."
        )
    with open(CONFIG) as f:
        cfg = json.load(f)
    return cfg


CFG = load_config()
SOURCE_A = os.path.expanduser(CFG["sources"]["paytm"])
SOURCE_B = os.path.expanduser(CFG["sources"]["card"])
VENDORS = [(c, ch, re.compile(p)) for c, ch, p in CFG["vendors"]]
PRICE_SCHEDULE = [(datetime.date.fromisoformat(d), v) for d, v in CFG["priceSchedule"]]
PACK_RATE = CFG["packRate"]
SHARED_MIN = CFG["sharedMin"]

FIRST_SEASON, LAST_SEASON = 2006, 2026
MEASURED_FROM = datetime.date(2024, 8, 1)   # first day any statement covers


def unit_price(d):
    p = PRICE_SCHEDULE[0][1]
    for start, price in PRICE_SCHEDULE:
        if d >= start:
            p = price
    return p


def classify(name):
    n = name.lower()
    for code, channel, pat in VENDORS:
        if pat.search(n):
            return code, channel
    return None, None


# ── source adapters ──────────────────────────────────────────────────────────
# Each returns a list of normalised rows so the classify/aggregate stage below
# never needs to know which statement a row came from.
#   {"date": date, "time": "HH:MM:SS", "amount": float(+ve), "name": str}

def _sheet_rows(z, member, shared):
    root = ET.fromstring(z.read(member))
    for row in root.iter(NS + "row"):
        cells = {}
        for c in row.findall(NS + "c"):
            col = re.match(r"[A-Z]+", c.get("r")).group()
            t, v, inline = c.get("t"), c.find(NS + "v"), c.find(NS + "is")
            if t == "s" and v is not None:
                val = shared[int(v.text)]
            elif inline is not None:
                val = "".join(x.text or "" for x in inline.iter(NS + "t"))
            else:
                val = v.text if v is not None else None
            cells[col] = val
        yield cells


def parse_paytm(path):
    """Paytm UPI statement (.xlsx). Sheet2 holds the ledger."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        si_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in si_root.findall(NS + "si"):
            shared.append("".join(t.text or "" for t in si.iter(NS + "t")))

    out = []
    for cells in list(_sheet_rows(z, "xl/worksheets/sheet2.xml", shared))[1:]:
        raw_date, raw_amt = cells.get("A"), cells.get("F")
        if not raw_date or not raw_amt:
            continue
        try:
            amt = float(raw_amt.replace(",", "").replace("+", ""))
        except ValueError:
            continue
        if amt >= 0:          # money in — not spend
            continue
        out.append({
            "date": datetime.datetime.strptime(raw_date, "%d/%m/%Y").date(),
            "time": cells.get("B") or "00:00:00",
            "amount": abs(amt),
            "name": cells.get("C") or "",
        })
    return out


CARD_TXN = re.compile(
    r"(\d{2}/\d{2}/\d{4})\s+(.+?)\s+(\d+)\s+([\d,]+\.\d{2})\s+(DR|CR)"
)
# Fees, settlements and reversals — money moved, nothing consumed.
CARD_SKIP = re.compile(
    r"SWIFTPAY|BBPS PAYMENT|SURCHARGE WAIVER|MARKUP FEE|PAYMENT RECEIVED|"
    r"AUTO DEBIT|EMI |INTEREST|LATE PAYMENT|GST|REVERSAL|CASHBACK|MEMBERSHIP FEE",
    re.I,
)


def parse_card(path):
    """Credit-card statement (decrypted PDF).

    The card carries no transaction time — only a date — so card rows cannot
    take part in coupling detection, which needs minutes. They still count
    toward Tide totals and the yearly series.

    Confirmed against the statements: the card records **no** Ember purchases
    at all. Single-stick vendors are QR shops that do not take cards.
    """
    try:
        import pdfplumber
    except ImportError:
        sys.exit(
            "pdfplumber needed for card statements:\n"
            "  python3 -m venv ~/.venv-pdf && ~/.venv-pdf/bin/pip install pdfplumber\n"
            "  ~/.venv-pdf/bin/python scripts/extract_et.py"
        )

    out = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for line in (page.extract_text() or "").split("\n"):
                m = CARD_TXN.search(line.strip())
                if not m:
                    continue
                raw_date, body, _rp, amt, drcr = m.groups()
                body = re.sub(r"\s+", " ", body.strip())
                if drcr == "CR" or CARD_SKIP.search(body):
                    continue
                out.append({
                    "date": datetime.datetime.strptime(raw_date, "%d/%m/%Y").date(),
                    "time": "",                      # not present on the card
                    "amount": float(amt.replace(",", "")),
                    "name": body,
                })
    return out


def load_sources():
    rows, sources = [], []

    if os.path.isdir(SOURCE_A):
        for f in sorted(os.listdir(SOURCE_A)):
            if f.endswith(".xlsx"):
                rows += parse_paytm(os.path.join(SOURCE_A, f))
                sources.append("A")

    card = []
    if os.path.isdir(SOURCE_B):
        seen_files = set()
        for f in sorted(os.listdir(SOURCE_B)):
            if not f.lower().endswith(".pdf"):
                continue
            path = os.path.join(SOURCE_B, f)
            # Several statements are byte-identical re-downloads, and every
            # transaction also reappears on the annual summary. Dedupe both.
            digest = hashlib.md5(open(path, "rb").read()).hexdigest()
            if digest in seen_files:
                continue
            seen_files.add(digest)
            card += parse_card(path)
            sources.append("B")
        before = len(card)
        card = [dict(t) for t in {tuple(sorted(r.items())) for r in card}]
        if before != len(card):
            print(f"  card: {before} rows -> {len(card)} after in-source dedupe")

    # Cross-source dedupe: one purchase can appear on both the card statement
    # and the UPI statement. Match on date + rounded amount and keep the UPI
    # row, which carries a time.
    upi_keys = {(r["date"], round(r["amount"])) for r in rows}
    kept = []
    for r in card:
        if any((r["date"], round(r["amount"]) + d) in upi_keys for d in range(-5, 6)):
            continue
        kept.append(r)
    if len(kept) != len(card):
        print(f"  card: dropped {len(card) - len(kept)} rows also present in UPI data")

    return rows + kept, sources


# ── aggregation ──────────────────────────────────────────────────────────────

def embers_for(row, channel):
    """How many Embers a payment represents. Sub-half-price payments are
    accessories (a matchbox, a balance top-up), not Embers."""
    amt = row["amount"]
    if channel == "night":
        return max(1, round(amt / PACK_RATE))
    price = unit_price(row["date"])
    if amt < price * 0.5:
        return 0
    return max(1, round(amt / price))


def build():
    rows, sources = load_sources()
    if not rows:
        sys.exit(f"No statements found. Looked in:\n  {SOURCE_A}\n  {SOURCE_B}")

    ledger = []
    for r in rows:
        code, channel = classify(r["name"])
        if not code:
            continue
        n = embers_for(r, channel) if channel in ("day", "night") else 0
        entry = {
            "d": r["date"].isoformat(),
            "t": (r["time"] or "")[:5],
            "code": code,
            "ch": channel,
            "amt": round(r["amount"], 2),
            "n": n,
        }
        # A single night purchase that converts to more than SHARED_MIN is not
        # one person's evening — it was bought for the table. Counted, but
        # flagged, so the headline number can be shown both ways instead of
        # quietly implying someone got through 39 in one night.
        if channel == "night" and n >= SHARED_MIN:
            entry["shared"] = True
        ledger.append(entry)
    ledger.sort(key=lambda x: (x["d"], x["t"]))

    spend = Counter()
    embers = Counter()
    per_year = defaultdict(lambda: Counter())
    active_days = defaultdict(set)
    dow = [0] * 7
    hours = Counter()
    seen_days = set()

    for e in ledger:
        if e["ch"] == "transfer":         # parsed, logged, never summed
            continue
        d = datetime.date.fromisoformat(e["d"])
        y = d.year
        spend[e["ch"]] += e["amt"]
        per_year[y]["spend_" + e["ch"]] += e["amt"]
        if e["ch"] == "tide":
            per_year[y]["tide_events"] += 1
        else:
            embers[e["ch"]] += e["n"]
            per_year[y]["e"] += e["n"]
            active_days[y].add(d)
            if (d, e["ch"]) not in seen_days:
                seen_days.add((d, e["ch"]))
            dow[d.weekday()] += 1
            hours[int(e["t"][:2])] += 1

    # Coupling: a Tide payment followed by a pack payment the same night.
    by_day = defaultdict(list)
    for e in ledger:
        if e["ch"] in ("tide", "night"):
            by_day[e["d"]].append(e)

    # One tab settled as two payments in the same minute is one event. Merge
    # them before pairing, or the coupling row shows whichever half sorted
    # first — which can be the trivial one.
    for day, evs in by_day.items():
        merged = {}
        for e in evs:
            key = (e["t"], e["ch"])
            if key in merged:
                merged[key] = dict(merged[key], amt=round(merged[key]["amt"] + e["amt"], 2))
            else:
                merged[key] = e
        by_day[day] = list(merged.values())
    coupling = []
    for day, evs in sorted(by_day.items()):
        evs.sort(key=lambda x: x["t"])
        paired = set()
        for i, a in enumerate(evs):
            if a["ch"] != "tide":
                continue
            for j, b in enumerate(evs[i + 1:], start=i + 1):
                if b["ch"] != "night" or j in paired:
                    continue
                gap = _minutes(b["t"]) - _minutes(a["t"])
                if 0 <= gap <= 90:
                    # One pairing per Ember purchase. A split payment on the
                    # Tide side (e.g. 350 then 10 a second apart) is one night
                    # out, not two.
                    paired.add(j)
                    coupling.append({
                        "d": day, "tideT": a["t"], "tideA": a["amt"],
                        "embT": b["t"], "embA": b["amt"], "gap": gap,
                        "n": b["n"], "shared": b.get("shared", False),
                    })
                    break

    total_embers = embers["day"] + embers["night"]
    # Transfers are excluded here too: a card bill payment is not an Ember and
    # must not stretch the span or inflate the coverage denominator.
    all_days = sorted(
        datetime.date.fromisoformat(e["d"]) for e in ledger if e["ch"] != "transfer"
    )
    span = (all_days[-1] - all_days[0]).days + 1
    covered = len(set(all_days))

    # Embers and Tides have different observation windows: the card reaches back
    # to Mar 2023 but records only Tides, while Embers first appear in the UPI
    # data in Aug 2024. Rating Embers over the full span would silently dilute
    # them across 17 months where no Ember could have been recorded.
    ember_days = sorted(
        datetime.date.fromisoformat(e["d"]) for e in ledger if e["ch"] in ("day", "night")
    )
    ember_span = (ember_days[-1] - ember_days[0]).days + 1
    ember_covered = len(set(ember_days))

    # A year is "measured" for a metric only if a source that can actually see
    # that metric covered it. The card reaches back to 2023 but records no
    # Embers at all — reporting 2023 as "0 Embers, measured" would state as
    # fact something the data cannot show.
    ember_years = {d.year for d in ember_days}
    tide_years = {
        datetime.date.fromisoformat(e["d"]).year for e in ledger if e["ch"] == "tide"
    }

    years = []
    for y in range(FIRST_SEASON, LAST_SEASON + 1):
        py = per_year.get(y)
        has_e, has_t = y in ember_years, y in tide_years
        if not py or not (has_e or has_t):
            years.append({"y": y, "e": None, "t": None, "confE": "guess",
                          "confT": "guess"})
            continue
        ad = len(active_days.get(y, ()))
        years.append({
            "y": y,
            "e": py["e"] if has_e else None,
            "t": py["tide_events"] if has_t else None,
            "confE": "measured" if has_e else "guess",
            "confT": "measured" if has_t else "guess",
            "spendE": round(py["spend_day"] + py["spend_night"]) if has_e else None,
            "spendT": round(py["spend_tide"]) if has_t else None,
            "activeDays": ad if has_e else None,
            "perActiveDay": round(py["e"] / ad, 1) if (has_e and ad) else None,
        })

    data = {
        "meta": {
            "generated": datetime.date.today().isoformat(),
            "sources": sorted(set(sources)),
            "priceSchedule": [[d.isoformat(), p] for d, p in PRICE_SCHEDULE],
            "packRate": PACK_RATE,
            "measuredFrom": all_days[0].isoformat(),
            "measuredTo": all_days[-1].isoformat(),
            "coverageDays": covered,
            "spanDays": span,
        },
        "totals": {
            "embers": total_embers,
            "day": embers["day"],
            "night": embers["night"],
            "spendE": round(spend["day"] + spend["night"]),
            "tideEvents": sum(1 for e in ledger if e["ch"] == "tide"),
            "spendT": round(spend["tide"]),
            "shared": sum(e["n"] for e in ledger if e.get("shared")),
            "soloEmbers": total_embers - sum(e["n"] for e in ledger if e.get("shared")),
            # Rated over the Ember observation window, not the full span.
            "perDay": round(total_embers / ember_span, 2),
            "emberSpanDays": ember_span,
            "emberCoverageDays": ember_covered,
            "emberFrom": ember_days[0].isoformat(),
            "emberTo": ember_days[-1].isoformat(),
            # pack-years = (per-day / 20) * years.
            "packYears": round(
                (total_embers / ember_span) / 20 * (ember_span / 365.25), 3
            ),
        },
        "channels": {"day": embers["day"], "night": embers["night"]},
        "dow": dow,
        "hours": {str(h): hours[h] for h in sorted(hours)},
        "coupling": coupling,
        "years": years,
        "ledger": ledger,
    }
    return data


def _minutes(hhmm):
    h, m = hhmm.split(":")[:2]
    return int(h) * 60 + int(m)


LEAK = re.compile(
    r"armaan|akhtar|hussain|anita|jadhav|z\s*plus|national|branco|vanashree|"
    r"ghule|abishek|preeti|yogeshwar|jhil|paytm|indusind|"
    r"cigarette|smok|tobacco|drink|alcohol|beer|wine|liquor",
    re.I,
)


def write_tsv(path, header, rows):
    with open(path, "w") as f:
        f.write("\t".join(header) + "\n")
        for r in rows:
            f.write("\t".join("" if v is None else str(v) for v in r) + "\n")


def main():
    data = build()
    blob = json.dumps(data, indent=1)

    outdir = os.path.dirname(OUT)
    os.makedirs(outdir, exist_ok=True)
    led = data["ledger"]

    embers_rows = [
        (e["d"], e["t"], e["ch"], e["code"], e["amt"], e["n"],
         "Y" if e.get("shared") else "")
        for e in led if e["ch"] in ("day", "night")
    ]
    tides_rows = [
        (e["d"], e["t"], e["code"], e["amt"]) for e in led if e["ch"] == "tide"
    ]
    seasons_rows = [
        (y["y"], y["e"], y["t"], y["confE"], y["confT"], y.get("spendE"), y.get("spendT"),
         y.get("activeDays"), y.get("perActiveDay"))
        for y in data["years"]
    ]

    artifacts = {
        os.path.join(outdir, "embers.tsv"):
            (["date", "time", "channel", "src", "inr", "embers", "shared"], embers_rows),
        os.path.join(outdir, "tides.tsv"):
            (["date", "time", "src", "inr"], tides_rows),
        os.path.join(outdir, "seasons.tsv"):
            (["season", "embers", "tides", "conf_e", "conf_t", "inr_e", "inr_t",
              "active_days", "per_active_day"], seasons_rows),
    }

    # Leak check runs over everything about to be written, not just the JSON.
    for path, (header, rows) in artifacts.items():
        probe = "\n".join("\t".join(str(v) for v in r) for r in rows)
        hit = LEAK.search(probe)
        if hit:
            sys.exit(f"LEAK CHECK FAILED in {os.path.basename(path)} — {hit.group(0)!r}")
    hit = LEAK.search(blob)
    if hit:
        sys.exit(f"LEAK CHECK FAILED — output contains {hit.group(0)!r}. Not written.")

    with open(OUT, "w") as f:
        f.write(blob)
    for path, (header, rows) in artifacts.items():
        write_tsv(path, header, rows)
        print(f"wrote {path}  ({len(rows)} rows)")

    t, m = data["totals"], data["meta"]
    print(f"wrote {OUT}  ({len(blob):,} bytes, leak check passed)")
    print(f"  Embers {t['embers']}  = day {t['day']} + night {t['night']}")
    print(f"  spend  E {t['spendE']:,}   T {t['spendT']:,}   Tide events {t['tideEvents']}")
    print(f"  Embers: {t['perDay']}/day over {t['emberSpanDays']}d "
          f"-> {t['packYears']} pack-years   "
          f"({t['emberCoverageDays']}/{t['emberSpanDays']} days recorded, "
          f"{t['emberFrom']} -> {t['emberTo']})")
    print(f"  Tides:  window {m['measuredFrom']} -> {m['measuredTo']} ({m['spanDays']}d)")
    if t["shared"]:
        print(f"  of the Embers, {t['shared']} came from group buys "
              f"-> {t['soloEmbers']} solo")
    print(f"  coupling events: {len(data['coupling'])}")


if __name__ == "__main__":
    main()
