/* ══════════════════════════════════════════════════════════════════
   deepu-life — DataStore
   A tiny fetch-and-cache helper for reading files out of /data.
   Same unframeworked style as the existing gsGet() in index.html —
   no build step, no dependency, just fetch() with a Map for a cache
   so a page that reads the same file twice doesn't re-request it.
═══════════════════════════════════════════════════════════════════ */
const DataStore = (() => {
  const cache = new Map();

  async function load(path) {
    if (cache.has(path)) return cache.get(path);
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    const json = await res.json();
    cache.set(path, json);
    return json;
  }

  function clear(path) {
    if (path) cache.delete(path);
    else cache.clear();
  }

  return { load, clear };
})();
