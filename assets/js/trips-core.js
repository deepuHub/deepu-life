/* ══════════════════════════════════════════════════════════════════
   trips-core.js — the pure half of trips-private.html: Splitwise CSV
   parsing and the group arithmetic. No DOM, no network, so it can be
   run under node and tested on its own.

   Every expense is stored as the cost plus a `nets` string —
   "Ana=50.00;Ben=-50.00" — which is Splitwise's own signed column per
   person (paid minus owed). Nets are exact: summing them gives each
   person's balance with no rounding drift and no guess about who the
   expense was shared with.
═══════════════════════════════════════════════════════════════════ */
(function (root) {
  const round = n => Math.round(n * 100) / 100;
  const isPayment = e => String(e.category || '').toLowerCase() === 'payment';

  /* ── CSV ───────────────────────────────────────────────────────── */
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const rows = [];
    let row = [], cur = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = ''; rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function isoDate(value) {
    const s = String(value == null ? '' : value).trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
    if (dmy) {
      const y = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
      return `${y}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    return null;
  }

  function num(value) {
    if (typeof value === 'number') return isFinite(value) ? value : null;
    const v = parseFloat(String(value == null ? '' : value).replace(/,/g, ''));
    return isNaN(v) ? null : v;
  }

  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ── Splitwise export → trip details + expense rows ────────────────
     Splitwise has no group-name column, so the name comes from the
     filename: "Goa Trip_2024-05-01_export.csv" → "Goa Trip". */
  function parseSplitwise(text, fileName) {
    const rows = parseCSV(text).filter(r => r.some(c => String(c).trim() !== ''));
    const lowerOf = r => r.map(h => String(h).toLowerCase().trim());
    const hi = rows.findIndex(r => {
      const l = lowerOf(r);
      return l.includes('date') && l.includes('description') && l.includes('cost');
    });
    if (hi < 0) throw new Error('That is not a Splitwise export — it needs Date, Description and Cost columns.');

    const head = rows[hi].map(h => String(h).trim());
    const lower = lowerOf(rows[hi]);
    const at = k => lower.indexOf(k);
    const FIXED = ['date', 'description', 'category', 'cost', 'currency'];
    const people = head.map((name, i) => ({ name, i })).filter(p => p.name && !FIXED.includes(lower[p.i]));
    if (!people.length) throw new Error('No per-person columns found after Currency.');

    const out = [];
    let skipped = 0, currency = '';
    for (const r of rows.slice(hi + 1)) {
      const desc = String(r[at('description')] || '').trim();
      if (/^total balance$/i.test(desc)) continue;
      if (!currency && at('currency') > -1) currency = String(r[at('currency')] || '').trim();
      const date = isoDate(r[at('date')]);
      const cost = num(r[at('cost')]);
      if (!date || cost == null) { if (desc) skipped++; continue; }

      const category = String(at('category') > -1 ? r[at('category')] || '' : '').trim() || 'Other';
      const nets = people
        .map(p => ({ name: p.name, net: num(r[p.i]) || 0 }))
        .filter(n => Math.abs(n.net) > 0.004);
      const payer = nets.reduce((best, n) => (n.net > 0 && (!best || n.net > best.net) ? n : best), null);
      out.push({
        date, description: desc || category, category, cost: round(cost),
        payer: payer ? payer.name : '',
        nets: nets.map(n => `${n.name}=${n.net.toFixed(2)}`).join(';'),
      });
    }

    const dates = out.map(e => e.date).sort();
    const startDate = dates[0] || '';
    const name = String(fileName || '')
      .replace(/\.[^.]+$/, '')
      .replace(/[_ -]?\d{4}-\d{2}-\d{2}.*$/, '')
      .replace(/[_ -]?export(ed)?$/i, '')
      .replace(/_+/g, ' ')
      .trim() || 'Imported trip';

    return {
      info: {
        name, year: startDate ? Number(startDate.slice(0, 4)) : '',
        startDate, endDate: dates[dates.length - 1] || '',
        currency: (currency || 'INR').toUpperCase().slice(0, 3),
        people: people.map(p => p.name),
      },
      rows: out,
      skipped,
    };
  }

  /* ── arithmetic ────────────────────────────────────────────────── */
  function parseNets(s) {
    return String(s || '').split(';').filter(Boolean).map(part => {
      const k = part.lastIndexOf('=');
      return { name: part.slice(0, k), net: parseFloat(part.slice(k + 1)) || 0 };
    });
  }

  /* One trip. Settle-up payments (Splitwise category "Payment") move
     balances but are not spending, so they stay out of totals. */
  function tripSummary(trip, exps) {
    const spend = exps.filter(e => !isPayment(e));
    const total = round(spend.reduce((a, e) => a + e.cost, 0));
    const cats = new Map();
    spend.forEach(e => cats.set(e.category, round((cats.get(e.category) || 0) + e.cost)));

    const who = new Map();
    const person = n => { if (!who.has(n)) who.set(n, { name: n, paid: 0, share: 0, net: 0 }); return who.get(n); };
    (trip.people || []).forEach(person);
    exps.forEach(e => {
      const nets = parseNets(e.nets);
      nets.forEach(n => { person(n.name).net += n.net; });
      if (isPayment(e)) return;
      if (e.payer) person(e.payer).paid += e.cost;
      new Set([...nets.map(n => n.name), e.payer].filter(Boolean)).forEach(n => {
        const net = (nets.find(x => x.name === n) || { net: 0 }).net;
        person(n).share += (n === e.payer ? e.cost : 0) - net;
      });
    });
    const people = [...who.values()].map(p => ({
      name: p.name, paid: round(p.paid), share: round(p.share), net: round(p.net),
    }));
    return {
      trip, total, count: spend.length,
      perHead: people.length ? round(total / people.length) : 0,
      categories: [...cats.entries()].map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      people,
    };
  }

  /* Greedy minimum-transfer settle-up. */
  function settlements(people) {
    const owe = people.filter(p => p.net < -0.005).map(p => ({ name: p.name, amt: -p.net })).sort((a, b) => b.amt - a.amt);
    const get = people.filter(p => p.net > 0.005).map(p => ({ name: p.name, amt: p.net })).sort((a, b) => b.amt - a.amt);
    const out = [];
    let i = 0, j = 0;
    while (i < owe.length && j < get.length) {
      const pay = Math.min(owe[i].amt, get[j].amt);
      if (pay > 0.005) out.push({ from: owe[i].name, to: get[j].name, amount: round(pay) });
      owe[i].amt -= pay; get[j].amt -= pay;
      if (owe[i].amt < 0.005) i++;
      if (get[j].amt < 0.005) j++;
    }
    return out;
  }

  /* Category × trip matrix for the group-level charts. */
  function matrix(summaries) {
    const totals = new Map();
    summaries.forEach(s => s.categories.forEach(c => totals.set(c.category, round((totals.get(c.category) || 0) + c.amount))));
    const cats = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    return {
      cats, totals,
      rows: summaries.map(s => ({
        label: s.trip.name, total: s.total,
        values: cats.map(c => (s.categories.find(x => x.category === c) || { amount: 0 }).amount),
      })),
    };
  }

  /* Across every trip: who fronts the money, who is owed. */
  function groupPeople(summaries) {
    const m = new Map();
    summaries.forEach(s => s.people.forEach(p => {
      const g = m.get(p.name) || { name: p.name, paid: 0, share: 0, net: 0, trips: 0 };
      g.paid += p.paid; g.share += p.share; g.net += p.net; g.trips++;
      m.set(p.name, g);
    }));
    return [...m.values()].map(p => ({ ...p, paid: round(p.paid), share: round(p.share), net: round(p.net) }))
      .sort((a, b) => b.paid - a.paid);
  }

  const api = { parseCSV, parseSplitwise, parseNets, isoDate, num, slug, tripSummary, settlements, matrix, groupPeople, isPayment, round };
  root.TripsCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
