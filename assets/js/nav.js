/* ══════════════════════════════════════════════════════════════════
   deepu-life — <deepu-nav> web component
   Single source of truth for the site nav: the pill row (mobile-only
   now), the persistent left sidebar (desktop), the mobile hamburger
   drawer, and the Public/Private grouping. Every page just drops in
   <deepu-nav active="key"></deepu-nav> — add a new page here once and
   it shows up everywhere, instead of hand-editing every HTML file's
   copy-pasted nav block.
═══════════════════════════════════════════════════════════════════ */
(() => {
  const LINKS = [
    { key: 'index',    href: 'index.html',                 icon: '🏠', label: 'Home',          group: 'public' },
    { key: 'run',      href: 'run.html',                    icon: '🏃', label: 'Run',           group: 'public',  desc: 'Race log, pace and timeline' },
    { key: 'read',     href: 'read.html',                   icon: '📚', label: 'Read',          group: 'public',  desc: 'Book list and saved quotes' },
    { key: 'cycle',    href: 'cycle.html',                  icon: '🚴', label: 'Cycle',         group: 'public',  desc: 'Ride log and training rides' },
    { key: 'todo',     href: 'todo.html',                   icon: '✅', label: 'To-Do',         group: 'public',  desc: 'Checklists, saved on this device' },
    { key: 'quotes',   href: 'quotes.html',                 icon: '💬', label: 'Quotes',        group: 'public',  desc: 'Quotes worth keeping' },
    { key: 'school',   href: '2026_school.html',            icon: '🏫', label: 'School',        group: 'public',  desc: 'Timings, menu, homework and notices' },
    { key: 'exam',     href: 'exam.html',                   icon: '🧮', label: 'Exams',         group: 'public',  desc: 'Practice tests, auto-scored' },
    { key: 'marathon', href: 'half-marathon.html',          icon: '🏅', label: 'Half Marathon', group: 'public',  desc: 'Training plan and race countdown' },
    { key: 'embers',   href: 'embers-tides-private.html',   icon: '🔥', label: 'Embers',        group: 'public',  desc: 'Coded intake index' },
    { key: 'piepoints',href: 'https://pie-pulse-play.lovable.app', icon: '🥧', label: 'PiePoints', group: 'public',  desc: 'Score tracker, opens in new tab', external: true },
    { key: 'kid',      href: 'kid-private.html',            icon: '🎒', label: 'Kid',           group: 'private', desc: 'Report cards and CA results' },
    { key: 'health',   href: 'health-private.html',         icon: '🩺', label: 'Health',        group: 'private', desc: 'Vitals, labs and trend flags' },
    { key: 'results',  href: 'results-private.html',        icon: '🎓', label: 'BEd Results',   group: 'private', desc: 'Semester results, subject by subject' },
    { key: 'apple',    href: 'apple-health-private.html',   icon: '🍎', label: 'Apple Health',  group: 'private', desc: 'Activity, sleep and heart trends' },
    { key: 'bucket',   href: 'bucket-private.html',         icon: '✶', label: 'Bucket List',   group: 'private', desc: 'Life list as constellations' },
    { key: 'carnatic', href: 'carnatic-private.html',       icon: '🎙️', label: 'Carnatic',      group: 'private', desc: 'Vocal journey at Artium' },
    { key: 'ideas',    href: 'ideas-private.html',          icon: '💡', label: 'Ideas',         group: 'private', desc: 'Ideas and projects, with verdicts' },
    { key: 'loans',    href: 'loans-private.html',          icon: '🏦', label: 'Loans',         group: 'private', desc: 'Car and house loans' },
    { key: 'trips',    href: 'trips-private.html',          icon: '🧳', label: 'Trips',         group: 'private', desc: 'Group trips from Splitwise, across years' },
  ];
  // index.html builds its launcher cards from this same list.
  window.DEEPU_LINKS = LINKS;

  function pillHTML(link, active) {
    const isActive = link.key === active;
    const ext = link.external ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${link.href}" class="nav-pill${isActive ? ' active' : ''}"${isActive ? ' aria-current="page"' : ''}${ext}>${link.icon} ${link.label}</a>`;
  }

  function groupHTML(group, label, active) {
    const items = LINKS.filter(l => l.group === group).map(l => pillHTML(l, active)).join('');
    return `<div class="nav-drawer-group">
      <div class="nav-drawer-label">${label}</div>
      <div class="nav-drawer-list">${items}</div>
    </div>`;
  }

  class DeepuNav extends HTMLElement {
    connectedCallback() {
      const active = this.getAttribute('active') || '';
      // Page-specific extras (e.g. todo.html's Trash button) authored as
      // light-dom children of <deepu-nav> get slotted into .nav-right.
      const extra = this.innerHTML.trim();

      this.innerHTML = `
<nav aria-label="Primary">
  <a class="nav-logo" href="index.html">deepu<span>-life</span></a>
  <div class="nav-right">
    <div class="nav-pills">${LINKS.map(l => pillHTML(l, active)).join('')}</div>
    ${extra}
    <button class="theme-toggle" aria-label="Toggle theme" title="Toggle theme">☀️</button>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰</button>
  </div>
</nav>
<div class="nav-drawer-backdrop"></div>
<div class="nav-drawer">
  <div class="nav-drawer-inner">
    ${groupHTML('public', 'Public', active)}
    ${groupHTML('private', '🔒 Private', active)}
  </div>
</div>
<aside class="nav-sidebar" aria-label="Sections">
  <div class="nav-sidebar-inner">
    ${groupHTML('public', 'Public', active)}
    ${groupHTML('private', '🔒 Private', active)}
  </div>
</aside>`.trim();

      this._wireDrawer();
    }

    _wireDrawer() {
      const toggle = this.querySelector('.nav-toggle');
      const drawer = this.querySelector('.nav-drawer');
      const backdrop = this.querySelector('.nav-drawer-backdrop');
      if (!toggle || !drawer) return;

      const close = () => {
        drawer.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      };
      const open = () => {
        drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      };

      toggle.addEventListener('click', () => {
        drawer.classList.contains('open') ? close() : open();
      });
      if (backdrop) backdrop.addEventListener('click', close);
      drawer.addEventListener('click', (e) => { if (e.target.closest('a,button')) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
  }

  customElements.define('deepu-nav', DeepuNav);
})();
