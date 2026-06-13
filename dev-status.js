/* Eventboerse Dev-Status Dashboard
   Standalone, no framework. Reads improvements.json + runs live health checks.
   Persists user decisions in localStorage, exports JSON for the next Claude run. */

(function () {
  'use strict';

  // ---------- STATE ----------
  const STORE_KEY = 'eb_dev_status_decisions_v1';
  const FILTER_KEY = 'eb_dev_status_filters_v1';
  const LOG_KEY = 'eb_dev_status_log_v1';

  let manifest = null;
  let decisions = loadStore(STORE_KEY, {});
  let log = loadStore(LOG_KEY, []);
  let filters = loadStore(FILTER_KEY, { status: 'all', type: 'all' });

  // ---------- HELPERS ----------
  function loadStore(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (_) { return fallback; }
  }

  function saveStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtTime(ms) {
    const d = new Date(ms);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function fmtDate(ms) {
    const d = new Date(ms);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  // ---------- PULSE CHECKS ----------
  const PULSE_CHECKS = [
    {
      key: 'sw',
      label: 'Service Worker',
      run: async () => {
        if (!('serviceWorker' in navigator)) {
          return { state: 'warn', value: 'Nicht unterstützt', detail: '' };
        }
        const regs = await navigator.serviceWorker.getRegistrations();
        if (!regs.length) return { state: 'warn', value: 'Nicht registriert', detail: '' };
        const r = regs[0];
        const active = r.active ? 'active' : (r.installing ? 'installing' : 'waiting');
        return { state: r.active ? 'ok' : 'warn', value: active, detail: r.scope };
      }
    },
    {
      key: 'styles',
      label: 'styles.css',
      run: async () => {
        const t0 = performance.now();
        try {
          const r = await fetch('styles.css', { method: 'HEAD', cache: 'no-store' });
          const ms = Math.round(performance.now() - t0);
          return { state: r.ok ? 'ok' : 'bad', value: `HTTP ${r.status}`, detail: `${ms} ms` };
        } catch (e) {
          return { state: 'bad', value: 'Fehler', detail: String(e.message || e) };
        }
      }
    },
    {
      key: 'appjs',
      label: 'app.js',
      run: async () => {
        const t0 = performance.now();
        try {
          const r = await fetch('app.js', { method: 'HEAD', cache: 'no-store' });
          const ms = Math.round(performance.now() - t0);
          const size = r.headers.get('content-length');
          const sizeKb = size ? `${Math.round(size / 1024)} KB · ` : '';
          return { state: r.ok ? 'ok' : 'bad', value: `HTTP ${r.status}`, detail: `${sizeKb}${ms} ms` };
        } catch (e) {
          return { state: 'bad', value: 'Fehler', detail: String(e.message || e) };
        }
      }
    },
    {
      key: 'manifest',
      label: 'PWA Manifest',
      run: async () => {
        try {
          const r = await fetch('manifest.json', { cache: 'no-store' });
          if (!r.ok) return { state: 'bad', value: `HTTP ${r.status}`, detail: '' };
          const j = await r.json();
          return { state: 'ok', value: j.name || j.short_name || 'OK', detail: `${(j.icons || []).length} Icons` };
        } catch (e) {
          return { state: 'bad', value: 'Parse-Fehler', detail: String(e.message || e) };
        }
      }
    },
    {
      key: 'api',
      label: 'REST-API erreichbar?',
      run: async () => {
        const url = '/wp-json/eventboerse/v1/listings?per_page=1';
        const t0 = performance.now();
        try {
          const r = await fetch(url, { cache: 'no-store' });
          const ms = Math.round(performance.now() - t0);
          if (r.status === 404) return { state: 'info', value: 'Kein WP-Backend', detail: 'lokaler Static-Server' };
          if (!r.ok) return { state: 'bad', value: `HTTP ${r.status}`, detail: `${ms} ms` };
          return { state: 'ok', value: `HTTP ${r.status}`, detail: `${ms} ms` };
        } catch (e) {
          return { state: 'info', value: 'Offline', detail: 'kein WP-Backend' };
        }
      }
    },
    {
      key: 'localstorage',
      label: 'LocalStorage',
      run: async () => {
        try {
          const used = JSON.stringify(localStorage).length;
          const usedKb = Math.round(used / 1024);
          const keys = Object.keys(localStorage).length;
          return { state: 'ok', value: `${usedKb} KB`, detail: `${keys} Schlüssel` };
        } catch (e) {
          return { state: 'bad', value: 'Blockiert', detail: String(e.message || e) };
        }
      }
    },
    {
      key: 'jserr',
      label: 'JS-Fehler dieser Session',
      run: async () => {
        const n = window.__dsJsErrors || 0;
        return {
          state: n === 0 ? 'ok' : 'bad',
          value: n === 0 ? 'Keine' : `${n} Fehler`,
          detail: n === 0 ? 'sauber' : 'siehe DevTools-Konsole'
        };
      }
    },
    {
      key: 'perf',
      label: 'Page-Load (Navigation)',
      run: async () => {
        const nav = performance.getEntriesByType('navigation')[0];
        if (!nav) return { state: 'info', value: 'n/a', detail: '' };
        const total = Math.round(nav.duration);
        const dom = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
        const state = total < 1500 ? 'ok' : total < 3000 ? 'warn' : 'bad';
        return { state, value: `${total} ms`, detail: `DCL: ${dom} ms` };
      }
    }
  ];

  async function runPulse() {
    const host = document.getElementById('ds-pulse');
    host.innerHTML = '';
    const items = PULSE_CHECKS.map((c) => {
      const el = document.createElement('div');
      el.className = 'ds-pulse-item pending';
      el.innerHTML = `
        <span class="ds-pulse-label">${escapeHtml(c.label)}</span>
        <span class="ds-pulse-value"><span class="ds-dot pending"></span><span>läuft…</span></span>
        <span class="ds-pulse-detail"></span>`;
      host.appendChild(el);
      return el;
    });

    await Promise.all(PULSE_CHECKS.map(async (c, i) => {
      try {
        const res = await c.run();
        const el = items[i];
        el.className = `ds-pulse-item ${res.state}`;
        el.innerHTML = `
          <span class="ds-pulse-label">${escapeHtml(c.label)}</span>
          <span class="ds-pulse-value"><span class="ds-dot ${res.state}"></span><span>${escapeHtml(res.value)}</span></span>
          <span class="ds-pulse-detail">${escapeHtml(res.detail || '')}</span>`;
      } catch (e) {
        items[i].className = 'ds-pulse-item bad';
        items[i].innerHTML = `
          <span class="ds-pulse-label">${escapeHtml(c.label)}</span>
          <span class="ds-pulse-value"><span class="ds-dot bad"></span><span>Fehler</span></span>
          <span class="ds-pulse-detail">${escapeHtml(String(e.message || e))}</span>`;
      }
    }));
  }

  // ---------- ITEMS RENDERING ----------
  function effortLabel(e) {
    if (e === 'S') return 'klein';
    if (e === 'M') return 'mittel';
    if (e === 'L') return 'groß';
    return e || '?';
  }

  function statusOf(id) {
    const d = decisions[id];
    return d ? d.status : 'pending';
  }

  function renderItems() {
    const host = document.getElementById('ds-items');
    if (!manifest) {
      host.innerHTML = '<div class="ds-empty">Lade Vorschläge…</div>';
      return;
    }
    const items = manifest.items || [];
    const visible = items.filter((it) => {
      if (filters.status !== 'all' && statusOf(it.id) !== filters.status) return false;
      if (filters.type !== 'all' && it.type !== filters.type) return false;
      return true;
    });

    if (!visible.length) {
      host.innerHTML = '<div class="ds-empty">Keine Einträge mit diesem Filter.</div>';
      updateStats();
      return;
    }

    host.innerHTML = visible.map(renderItem).join('');
    bindItemActions();
    updateStats();
  }

  function renderItem(it) {
    const status = statusOf(it.id);
    const cls = status === 'pending' ? '' : `is-${status}`;
    const files = (it.files || []).map(f => `<code>${escapeHtml(f)}</code>`).join(', ');
    return `
      <div class="ds-item ${cls}" data-id="${escapeHtml(it.id)}">
        <div class="ds-item-head">
          <span class="ds-item-title">${escapeHtml(it.title)}</span>
          <span class="ds-item-id">${escapeHtml(it.id)}</span>
        </div>
        <div class="ds-item-badges">
          <span class="ds-badge ds-badge-${escapeHtml(it.type)}">${escapeHtml(it.type)}</span>
          <span class="ds-badge ds-badge-effort-${escapeHtml(it.effort)}">Aufwand: ${escapeHtml(effortLabel(it.effort))}</span>
          ${it.impact ? `<span class="ds-badge">Impact: ${escapeHtml(it.impact)}</span>` : ''}
        </div>
        <div class="ds-item-section"><strong>Befund:</strong> ${escapeHtml(it.evidence || '')}</div>
        <div class="ds-item-section"><strong>Warum:</strong> ${escapeHtml(it.why || '')}</div>
        <div class="ds-item-section"><strong>Was sich ändert:</strong> ${escapeHtml(it.what_changes || '')}</div>
        ${it.risk ? `<div class="ds-item-section"><strong>Risiko:</strong> ${escapeHtml(it.risk)}</div>` : ''}
        ${files ? `<div class="ds-item-section"><strong>Dateien:</strong> <span class="ds-item-files">${files}</span></div>` : ''}
        ${renderItemFooter(it, status)}
      </div>`;
  }

  function renderItemFooter(it, status) {
    if (status === 'pending') {
      return `
        <div class="ds-item-actions">
          <button class="ds-btn ds-btn-good" data-action="approve" data-id="${escapeHtml(it.id)}">✓ Annehmen</button>
          <button class="ds-btn ds-btn-warn" data-action="later" data-id="${escapeHtml(it.id)}">⏸ Später</button>
          <button class="ds-btn ds-btn-bad"  data-action="reject" data-id="${escapeHtml(it.id)}">✕ Ablehnen</button>
        </div>`;
    }
    const labels = { approved: '✓ Angenommen', rejected: '✕ Abgelehnt', later: '⏸ Später' };
    return `
      <div class="ds-item-actions">
        <span class="ds-item-status is-${status}">${labels[status]}</span>
        <button class="ds-btn ds-btn-ghost" data-action="reset" data-id="${escapeHtml(it.id)}">↺ Zurücksetzen</button>
      </div>`;
  }

  function bindItemActions() {
    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'reset') {
          delete decisions[id];
          appendLog(id, 'reset');
        } else {
          const map = { approve: 'approved', reject: 'rejected', later: 'later' };
          decisions[id] = { status: map[action], at: Date.now() };
          appendLog(id, map[action]);
        }
        saveStore(STORE_KEY, decisions);
        renderItems();
        renderLog();
      });
    });
  }

  function updateStats() {
    if (!manifest) return;
    const counts = { pending: 0, approved: 0, rejected: 0, later: 0 };
    (manifest.items || []).forEach((it) => { counts[statusOf(it.id)]++; });
    document.querySelectorAll('#ds-summary [data-key]').forEach((el) => {
      const k = el.getAttribute('data-key');
      el.querySelector('strong').textContent = counts[k] || 0;
    });
  }

  // ---------- LOG ----------
  function appendLog(id, decision) {
    log.unshift({ id, decision, at: Date.now() });
    log = log.slice(0, 100);
    saveStore(LOG_KEY, log);
  }

  function renderLog() {
    const host = document.getElementById('ds-log');
    if (!log.length) {
      host.innerHTML = '<p class="ds-log-empty">Noch keine Entscheidung getroffen.</p>';
      return;
    }
    host.innerHTML = log.map(e => `
      <div class="ds-log-entry">
        <span class="ds-log-time">${fmtTime(e.at)}</span>
        <span class="ds-log-id">${escapeHtml(e.id)}</span>
        <span class="ds-log-decision-${e.decision}">${decisionLabel(e.decision)}</span>
      </div>`).join('');
  }

  function decisionLabel(d) {
    return ({ approved: 'angenommen', rejected: 'abgelehnt', later: 'später', reset: 'zurückgesetzt' })[d] || d;
  }

  // ---------- FILTERS ----------
  function bindFilters() {
    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('ds-chip-active'));
        btn.classList.add('ds-chip-active');
        filters.status = btn.getAttribute('data-filter');
        saveStore(FILTER_KEY, filters);
        renderItems();
      });
    });
    document.querySelectorAll('[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('ds-chip-active'));
        btn.classList.add('ds-chip-active');
        filters.type = btn.getAttribute('data-type');
        saveStore(FILTER_KEY, filters);
        renderItems();
      });
    });
    // restore visual state
    const sBtn = document.querySelector(`[data-filter="${filters.status}"]`);
    if (sBtn) { document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('ds-chip-active')); sBtn.classList.add('ds-chip-active'); }
    const tBtn = document.querySelector(`[data-type="${filters.type}"]`);
    if (tBtn) { document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('ds-chip-active')); tBtn.classList.add('ds-chip-active'); }
  }

  // ---------- EXPORT ----------
  function exportDecisions() {
    const out = {
      schema: 1,
      exported_at: fmtDate(Date.now()),
      manifest_generated_at: manifest ? manifest.generated_at : null,
      decisions: (manifest && manifest.items || []).map(it => ({
        id: it.id,
        title: it.title,
        type: it.type,
        status: statusOf(it.id),
        decided_at: decisions[it.id] ? fmtDate(decisions[it.id].at) : null
      }))
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decisions.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  // ---------- INIT ----------
  window.addEventListener('error', () => { window.__dsJsErrors = (window.__dsJsErrors || 0) + 1; });
  window.addEventListener('unhandledrejection', () => { window.__dsJsErrors = (window.__dsJsErrors || 0) + 1; });

  async function init() {
    bindFilters();
    document.getElementById('ds-rerun').addEventListener('click', runPulse);
    document.getElementById('ds-export').addEventListener('click', exportDecisions);

    // run pulse
    runPulse();

    // load manifest
    try {
      const r = await fetch('improvements.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      manifest = await r.json();
    } catch (e) {
      document.getElementById('ds-items').innerHTML =
        `<div class="ds-empty">Konnte <code>improvements.json</code> nicht laden: ${escapeHtml(e.message || e)}</div>`;
      return;
    }
    renderItems();
    renderLog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
