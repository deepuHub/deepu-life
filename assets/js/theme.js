/* ══════════════════════════════════════════════════════════════════
   deepu-life — theme toggle
   Wires the nav's .theme-toggle button to flip data-theme on <html>
   and remember the choice. The FOUC-prevention snippet that reads
   this same localStorage key lives inline in each page's <head> —
   it has to run before first paint, before this file has loaded.
═══════════════════════════════════════════════════════════════════ */
const THEME_KEY = 'deepu-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.textContent = theme === 'light' ? '🌙' : '☀️';
    const label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  applyTheme(next);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(document.documentElement.dataset.theme || 'dark');
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);
});
