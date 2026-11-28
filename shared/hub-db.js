/**
 * Family hub — opslag.
 *
 * Biedt dezelfde aanroepen als de `db`-opslag van Claude-artefacts:
 *   const db = await claude.use("db");
 *   db.collection("fruit").orderBy("volgorde").onSnapshot(snap => ...);
 *   await db.doc("week/huidig").set({...});
 *
 * Achter de schermen gaat alles naar Google Apps Script (een Google Sheet).
 * Zonder serveradres draait het in proefmodus: alles blijft in deze browser.
 *
 * Instellen: shared/config.js (serveradres) en éénmalig ?k=<sleutel> in de URL.
 */
(function () {
  'use strict';

  const CFG = window.HUB_CONFIG || {};
  const POLL_MS = CFG.pollMs || 5000;
  const SEGMENT = /^[A-Za-z0-9_\-.~:@+]+$/;

  /* ---------- kleine opslag in de browser (kan ontbreken) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* geen opslag */ } },
  };

  // Sleutel éénmalig via ?k=... ; daarna onthouden en uit de adresbalk halen.
  (function readKeyFromUrl() {
    try {
      const url = new URL(location.href);
      const k = url.searchParams.get('k');
      if (k) {
        store.set('hub.key', k);
        url.searchParams.delete('k');
        history.replaceState(null, '', url.toString());
      }
    } catch (e) { /* ok */ }
  })();

  const endpoint = CFG.endpoint || '';
  const mode = endpoint ? 'server' : 'proef';

  /* ---------- hulpfuncties ---------- */
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  function deepFreeze(o) {
    if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); }
    return o;
  }
  function merge(base, patch) {
    const out = isObj(base) ? clone(base) : {};
    Object.keys(patch).forEach((k) => {
      out[k] = isObj(patch[k]) && isObj(out[k]) ? merge(out[k], patch[k]) : clone(patch[k]);
    });
    return out;
  }
  function dbError(code, message) { return { code, message }; }
  function checkPath(path, kind) {
    if (typeof path !== 'string' || !path) throw new TypeError('Pad ontbreekt');
    const parts = path.split('/');
    parts.forEach((s) => {
      if (!SEGMENT.test(s) || s === '.' || s === '..') throw new TypeError('Ongeldig padsegment in "' + path + '"');
    });
    if (parts.length > 16) throw new TypeError('Pad te lang');
    const even = parts.length % 2 === 0;
    if (kind === 'doc' && !even) throw new TypeError('Documentpad heeft een even aantal delen nodig (nu ' + parts.length + ')');
    if (kind === 'coll' && even) throw new TypeError('Collectiepad heeft een oneven aantal delen nodig (nu ' + parts.length + ')');
    return path;
  }
  const tabOf = (path) => path.split('/')[0];
  const parentOf = (path) => path.split('/').slice(0, -1).join('/');
  function newId() {
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    const r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(20)) : null;
    for (let i = 0; i < 20; i++) s += abc[(r ? r[i] : Math.floor(Math.random() * 256)) % abc.length];
    return s;
  }

  /* ---------- transport: server (Apps Script) of proefmodus ---------- */
  async function serverCall(req) {
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        // text/plain: zo vraagt de browser geen CORS-preflight, die Apps Script niet kent.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ key: store.get('hub.key') || '' }, req)),
      });
    } catch (e) {
      throw dbError('unavailable', 'Geen verbinding met de server');
    }
    let body;
    try { body = await res.json(); } catch (e) { throw dbError('unavailable', 'Onverwacht antwoord van de server'); }
    if (!body.ok) throw dbError(body.code || 'unavailable', body.message || 'Fout');
    return body.result;
  }

  // Proefmodus: zelfde opdrachten, alles in localStorage van deze browser.
  const local = {
    load() { try { return JSON.parse(store.get('hub.proef') || '{"docs":{},"revs":{}}'); } catch (e) { return { docs: {}, revs: {} }; } },
    save(s) { store.set('hub.proef', JSON.stringify(s)); },
    async call(req) {
      const s = local.load();
      const p = req.path;
      switch (req.op) {
        case 'revs': return s.revs;
        case 'get': return p in s.docs ? { exists: true, data: s.docs[p] } : { exists: false };
        case 'list': {
          const docs = Object.keys(s.docs).filter((k) => parentOf(k) === p).sort()
            .map((k) => ({ id: k.split('/').pop(), data: s.docs[k] }));
          return { docs, rev: s.revs[tabOf(p)] || 0 };
        }
        case 'set': s.docs[p] = clone(req.data); break;
        case 'update':
          if (!(p in s.docs)) throw dbError('invalid_argument', 'Document bestaat niet: ' + p);
          s.docs[p] = merge(s.docs[p], req.data); break;
        case 'delete': delete s.docs[p]; break;
        case 'agenda': return { events: [] }; // proefmodus heeft geen Google Agenda
        case 'pakjes': { // proefmodus heeft geen Gmail: twee voorbeelden
          const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
          return { proef: true, bijgewerkt: (() => { const n = new Date(); return new Date(n - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); })(), pakjes: [
            { id: 'proef1', winkel: 'Zara', wat: '', status: 'klaar', verwacht: '', tot: d(12), ordernr: '54544683533', link: 'https://www.zara.com/', volgen: true, datum: d(-1) },
            { id: 'proef2', winkel: 'bol', wat: 'Voorbeeldpakje', status: 'verzonden', verwacht: d(2), ordernr: '', link: 'https://www.bol.com/', volgen: true, code: '3SIMBG990061560', datum: d(0) },
          ] };
        }
        case 'foto': {
          const id = 'proef' + Date.now() + Math.floor(Math.random() * 1e4);
          s.fotos = s.fotos || {}; s.fotos[id] = req.data; local.save(s); return { id };
        }
        case 'fotos': {
          const out = {}; (req.ids || []).forEach((id) => { if (s.fotos && s.fotos[id]) out[id] = s.fotos[id]; }); return { fotos: out };
        }
        case 'fotoWeg': if (s.fotos) { delete s.fotos[req.id]; local.save(s); } return true;
        default: throw dbError('invalid_argument', 'Onbekende opdracht');
      }
      s.revs[tabOf(p)] = (s.revs[tabOf(p)] || 0) + 1;
      local.save(s);
      return true;
    },
  };

  async function call(req, retry) {
    const fn = mode === 'server' ? serverCall : local.call;
    try {
      const out = await fn(req);
      setStatus('ok');
      return out;
    } catch (e) {
      const err = e && e.code ? e : dbError('unavailable', String(e));
      if (err.code === 'unavailable') setStatus('offline');
      if (err.code === 'not_granted') setStatus('sleutel');
      if (retry && err.code === 'unavailable') {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 800));
        return call(req, false);
      }
      throw err;
    }
  }

  /* ---------- status (voor het bolletje op het startscherm) ---------- */
  let status = mode === 'proef' ? 'proef' : 'laden';
  const statusFns = new Set();
  function setStatus(s) {
    if (mode === 'proef') s = 'proef';
    if (s === status) return;
    status = s;
    statusFns.forEach((fn) => { try { fn(s); } catch (e) { /* ok */ } });
  }

  /* ---------- cache: snelle eerste weergave na herstart ---------- */
  const CACHE_KEY = 'hub.cache.' + (endpoint ? 'server' : 'proef');
  let cache = {};
  try { cache = JSON.parse(store.get(CACHE_KEY) || '{}'); } catch (e) { cache = {}; }
  let cacheTimer = null;
  function putCache(k, v) {
    cache[k] = v;
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(() => store.set(CACHE_KEY, JSON.stringify(cache)), 500);
  }

  /* ---------- eigen schrijfacties die nog onderweg zijn ---------- */
  const DELETED = {};
  const pending = new Map(); // pad -> gegevens of DELETED
  const known = new Map();   // pad -> laatst gekende gegevens (voor update)

  function overlayDoc(path, data) {
    if (pending.has(path)) { const v = pending.get(path); return v === DELETED ? undefined : v; }
    return data;
  }
  function overlayList(coll, docs) {
    const map = new Map(docs.map((d) => [d.id, d.data]));
    pending.forEach((v, p) => {
      if (parentOf(p) !== coll) return;
      const id = p.split('/').pop();
      if (v === DELETED) map.delete(id); else map.set(id, v);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([id, data]) => ({ id, data }));
  }
  const hasPendingIn = (prefix) => [...pending.keys()].some((p) => p === prefix || parentOf(p) === prefix);

  /* ---------- snapshots ---------- */
  function docSnap(id, data, meta) {
    const d = data === undefined ? undefined : deepFreeze(clone(data));
    return Object.freeze({ id, exists: d !== undefined, data: () => d, metadata: Object.freeze(meta) });
  }

  function applyQuery(docs, q) {
    let out = docs.slice();
    q.filters.forEach(([f, op, v]) => {
      out = out.filter((d) => {
        const x = d.data ? d.data[f] : undefined;
        switch (op) {
          case '==': return JSON.stringify(x) === JSON.stringify(v);
          case '!=': return x !== undefined && JSON.stringify(x) !== JSON.stringify(v);
          case '<': return x < v;
          case '<=': return x <= v;
          case '>': return x > v;
          case '>=': return x >= v;
          case 'in': return Array.isArray(v) && v.some((y) => JSON.stringify(y) === JSON.stringify(x));
          case 'not-in': return Array.isArray(v) && x !== undefined && !v.some((y) => JSON.stringify(y) === JSON.stringify(x));
          case 'array-contains': return Array.isArray(x) && x.some((y) => JSON.stringify(y) === JSON.stringify(v));
          default: throw dbError('invalid_argument', 'Onbekende operator: ' + op);
        }
      });
    });
    if (q.order) {
      const [f, dir] = q.order;
      const sign = dir === 'desc' ? -1 : 1;
      out.sort((a, b) => {
        const x = a.data[f], y = b.data[f];
        if (x === undefined && y === undefined) return 0;
        if (x === undefined) return 1;
        if (y === undefined) return -1;
        return x < y ? -sign : x > y ? sign : 0;
      });
    }
    if (q.limit) out = out.slice(0, q.limit);
    return out;
  }

  function querySnap(coll, docs, q, prev, meta) {
    const result = applyQuery(docs, q);
    const snaps = result.map((d) => {
      const old = prev && prev.byId.get(d.id);
      // Onveranderd document = hetzelfde object, zoals bij artefacts.
      if (old && JSON.stringify(old.data()) === JSON.stringify(d.data)) return old;
      return docSnap(d.id, d.data, meta);
    });
    const byId = new Map(snaps.map((s) => [s.id, s]));
    const changes = [];
    const prevIdx = new Map((prev ? prev.docs : []).map((s, i) => [s.id, i]));
    (prev ? prev.docs : []).forEach((s, i) => {
      if (!byId.has(s.id)) changes.push({ type: 'removed', doc: s, oldIndex: i, newIndex: -1 });
    });
    snaps.forEach((s, i) => {
      if (!prevIdx.has(s.id)) changes.push({ type: 'added', doc: s, oldIndex: -1, newIndex: i });
      else if (prev.byId.get(s.id) !== s) changes.push({ type: 'modified', doc: s, oldIndex: prevIdx.get(s.id), newIndex: i });
    });
    const snap = Object.freeze({
      docs: snaps, size: snaps.length, empty: snaps.length === 0,
      docChanges: () => changes, metadata: Object.freeze(meta),
    });
    return { snap, docs: snaps, byId };
  }

  /* ---------- luisteraars en de poller ---------- */
  const listeners = new Set();
  let revs = null;
  let pollTimer = null;

  function deliver(L, fromCache) {
    if (!L.active || L.raw === undefined) return;
    const meta = { fromCache: !!fromCache, hasPendingWrites: hasPendingIn(L.kind === 'doc' ? L.path : L.path) };
    try {
      if (L.kind === 'doc') {
        const data = overlayDoc(L.path, L.raw.exists ? L.raw.data : undefined);
        const key = JSON.stringify([data, meta]);
        if (key === L.lastKey) return;
        L.lastKey = key;
        L.next(docSnap(L.path.split('/').pop(), data, meta));
      } else {
        const docs = overlayList(L.path, L.raw);
        const r = querySnap(L.path, docs, L.q, L.prev, meta);
        const key = JSON.stringify([r.docs.map((s) => [s.id, s.data()]), meta]);
        if (key === L.lastKey) return;
        L.lastKey = key;
        L.prev = r;
        L.next(r.snap);
      }
    } catch (e) {
      if (e && e.code) fail(L, e); else console.error(e);
    }
  }

  function fail(L, e) {
    if (!L.active) return;
    L.active = false;
    listeners.delete(L);
    if (L.error) L.error(e); else console.error('db:', e);
  }

  async function refresh(L) {
    try {
      if (L.kind === 'doc') {
        L.raw = await call({ op: 'get', path: L.path }, true);
        known.set(L.path, L.raw.exists ? L.raw.data : undefined);
      } else {
        const res = await call({ op: 'list', path: L.path }, true);
        L.raw = res.docs;
        res.docs.forEach((d) => known.set(L.path + '/' + d.id, d.data));
      }
      putCache(L.kind + ':' + L.path, L.raw);
      deliver(L, false);
    } catch (e) {
      if (e.code !== 'unavailable') fail(L, e);
      // 'unavailable': stil blijven proberen bij de volgende ronde.
    }
  }

  async function poll() {
    if (!listeners.size) return;
    try {
      const fresh = await call({ op: 'revs' }, false);
      const changed = new Set();
      Object.keys(fresh).forEach((t) => { if (!revs || fresh[t] !== revs[t]) changed.add(t); });
      const firstRun = !revs;
      revs = fresh;
      listeners.forEach((L) => {
        if (firstRun || changed.has(tabOf(L.path)) || L.raw === undefined) refresh(L);
      });
    } catch (e) { /* offline: volgende ronde opnieuw */ }
  }

  function ensurePolling() {
    if (pollTimer || !listeners.size) return;
    pollTimer = setInterval(() => {
      if (!listeners.size) { clearInterval(pollTimer); pollTimer = null; return; }
      poll();
    }, POLL_MS);
  }

  function subscribe(L) {
    L.active = true;
    listeners.add(L);
    const cached = cache[L.kind + ':' + L.path];
    if (cached !== undefined) { L.raw = cached; setTimeout(() => deliver(L, true), 0); }
    refresh(L);
    ensurePolling();
    return () => { L.active = false; listeners.delete(L); };
  }

  function refreshTab(tab) {
    listeners.forEach((L) => { if (tabOf(L.path) === tab) refresh(L); });
  }
  function redeliverTab(tab) {
    listeners.forEach((L) => { if (tabOf(L.path) === tab) deliver(L, false); });
  }

  /* ---------- schrijven, één per document tegelijk ---------- */
  const chains = new Map();
  function write(path, op, data) {
    const before = chains.get(path) || Promise.resolve();
    // Meteen tonen (latency compensation), daarna bevestigen.
    if (op === 'set') pending.set(path, clone(data));
    else if (op === 'delete') pending.set(path, DELETED);
    else if (op === 'update') {
      const base = pending.has(path) ? pending.get(path) : known.get(path);
      if (base && base !== DELETED) pending.set(path, merge(base, data));
    }
    redeliverTab(tabOf(path));
    const p = before.catch(() => {}).then(() => call({ op, path, data }, true)).then(
      () => {
        if (op === 'delete') known.delete(path); else if (pending.has(path)) known.set(path, pending.get(path));
      },
    ).finally(() => {
      if (chains.get(path) === p) { chains.delete(path); pending.delete(path); }
      refreshTab(tabOf(path));
    });
    chains.set(path, p);
    return p.then(() => undefined);
  }

  /* ---------- de publieke vorm, zoals bij artefacts ---------- */
  function docRef(path) {
    checkPath(path, 'doc');
    return Object.freeze({
      id: path.split('/').pop(),
      path,
      async get() {
        const raw = await call({ op: 'get', path }, true);
        known.set(path, raw.exists ? raw.data : undefined);
        return docSnap(path.split('/').pop(), overlayDoc(path, raw.exists ? raw.data : undefined),
          { fromCache: false, hasPendingWrites: pending.has(path) });
      },
      set(data) {
        if (!isObj(data)) return Promise.reject(dbError('invalid_argument', 'set() verwacht een object'));
        return write(path, 'set', data);
      },
      update(data) {
        if (!isObj(data)) return Promise.reject(dbError('invalid_argument', 'update() verwacht een object'));
        return write(path, 'update', data);
      },
      delete() { return write(path, 'delete'); },
      async acquire() { return { acquired: true }; }, // één keukenscherm: geen wedstrijd
      onSnapshot(next, error) { return subscribe({ kind: 'doc', path, next, error }); },
      collection(sub) { return collRef(path + '/' + sub); },
    });
  }

  function makeQuery(path, q) {
    return {
      where(f, op, v) { return Object.freeze(makeQuery(path, { ...q, filters: q.filters.concat([[f, op, v]]) })); },
      orderBy(f, dir) { return Object.freeze(makeQuery(path, { ...q, order: [f, dir || 'asc'] })); },
      limit(n) { return Object.freeze(makeQuery(path, { ...q, limit: n })); },
      async get() {
        const res = await call({ op: 'list', path }, true);
        res.docs.forEach((d) => known.set(path + '/' + d.id, d.data));
        return querySnap(path, overlayList(path, res.docs), q, null,
          { fromCache: false, hasPendingWrites: hasPendingIn(path) }).snap;
      },
      onSnapshot(next, error) { return subscribe({ kind: 'query', path, q, next, error }); },
    };
  }
  function collRef(path) {
    checkPath(path, 'coll');
    const base = makeQuery(path, { filters: [], order: null, limit: 0 });
    return Object.freeze(Object.assign(base, {
      path,
      doc(id) { return docRef(path + '/' + (id || newId())); },
      async add(data) { const ref = docRef(path + '/' + newId()); await ref.set(data); return ref; },
    }));
  }

  const db = Object.freeze({
    doc: docRef,
    collection: collRef,
  });

  // Eén keukenscherm, één "gebruiker".
  const user = Object.freeze({
    async id() { return 'keuken'; },
    async me() { return { id: 'keuken', name: 'Keuken' }; },
    async profiles(ids) { const o = {}; (ids || []).forEach((i) => { o[i] = { id: i, name: '' }; }); return o; },
    isOwner: () => true,
    canEdit: () => true,
    can: () => true,
  });

  window.hubDb = Object.freeze({
    db,
    mode,
    status: () => status,
    onStatus(fn) { statusFns.add(fn); fn(status); return () => statusFns.delete(fn); },
    hasKey: () => !!store.get('hub.key'),
    ping: () => call({ op: 'revs' }, false),
    // Eigen opdrachten van de server, bv. de gezinsagenda: hubDb.rpc('agenda', {van, tot}).
    rpc: (op, args) => call(Object.assign({}, args, { op }), op === 'agenda' || op === 'fotos' || op === 'pakjes'),
  });

  // Zelfde ingang als in Claude-artefacts, zodat hun code hier zo goed als ongewijzigd draait.
  if (!window.claude) {
    window.claude = Object.freeze({
      use: async (name) => (name === 'db' ? db : name === 'user' ? user : null),
    });
  }
})();
