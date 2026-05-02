/**
 * EBSession  — Eventboerse Session-Wrapper mit Expiry.
 *
 * Datei: assets/js/security/session.js
 * Einbindung: <script src="/assets/js/security/session.js"></script>
 * VOR app.js laden — app.js darf dann window.EBSession nutzen.
 *
 * Audit-Issue: #13 (P0.5 — Auth-Token in localStorage ohne Expiry).
 *
 * API:
 *   EBSession.set(token, user, ttlMs?)  speichert verschluesselt-bundled mit Ablauf
 *   EBSession.get()                       null oder { token, user } wenn gueltig
 *   EBSession.getToken()                  null oder string
 *   EBSession.getUser()                   null oder object
 *   EBSession.clear()                     loescht und feuert eb:session:cleared
 *   EBSession.refresh(ttlMs?)             verlaengert Ablauf bei aktiver Session
 *   EBSession.onExpire(handler)           Callback wenn Session gerade abgelaufen
 *
 * Speicherformat (localStorage Key: eb_session):
 *   {"v":1,"token":"…","user":{…},"exp":<unix_ms>,"iat":<unix_ms>}
 *
 * Migration aus dem alten Muster:
 *   localStorage.setItem("eb_token", t)            EBSession.set(t, userObj)
 *   localStorage.setItem("eb_user", JSON.stringify(u))
 *   const t = localStorage.getItem("eb_token")     const t = EBSession.getToken()
 *   localStorage.removeItem("eb_token")            EBSession.clear()
 */
(function (global) {
  "use strict";

  var KEY = "eb_session";
  var DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  var expireHandlers = [];

  function now() { return Date.now(); }

  function readRaw() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      return obj;
    } catch (e) { return null; }
  }

  function writeRaw(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); }
    catch (e) { console.warn("[EBSession] localStorage write failed", e); }
  }

  function fireExpire() {
    for (var i = 0; i < expireHandlers.length; i++) {
      try { expireHandlers[i](); } catch (e) {}
    }
    try { window.dispatchEvent(new CustomEvent("eb:session:expired")); } catch (e) {}
  }

  function fireCleared() {
    try { window.dispatchEvent(new CustomEvent("eb:session:cleared")); } catch (e) {}
  }

  function isValid(s) {
    return !!(s && s.token && typeof s.exp === "number" && s.exp > now());
  }

  var EBSession = {
    set: function (token, user, ttlMs) {
      if (!token) throw new Error("EBSession.set: token required");
      var ttl = (typeof ttlMs === "number" && ttlMs > 0) ? ttlMs : DEFAULT_TTL_MS;
      var obj = {
        v: 1,
        token: String(token),
        user: user || null,
        iat: now(),
        exp: now() + ttl
      };
      writeRaw(obj);
      return obj;
    },
    get: function () {
      var s = readRaw();
      if (!s) return null;
      if (!isValid(s)) {
        // abgelaufene Session aufraeumen
        localStorage.removeItem(KEY);
        fireExpire();
        return null;
      }
      return { token: s.token, user: s.user, exp: s.exp };
    },
    getToken: function () {
      var s = this.get();
      return s ? s.token : null;
    },
    getUser: function () {
      var s = this.get();
      return s ? s.user : null;
    },
    refresh: function (ttlMs) {
      var s = readRaw();
      if (!isValid(s)) return null;
      var ttl = (typeof ttlMs === "number" && ttlMs > 0) ? ttlMs : DEFAULT_TTL_MS;
      s.exp = now() + ttl;
      writeRaw(s);
      return s;
    },
    clear: function () {
      localStorage.removeItem(KEY);
      fireCleared();
    },
    onExpire: function (handler) {
      if (typeof handler === "function") expireHandlers.push(handler);
    },
    // Diagnostik
    _debug: function () { return readRaw(); }
  };

  // Auto-Cleanup beim Laden, falls die alte Session schon abgelaufen ist.
  EBSession.get();

  // Cross-Tab Sync: wenn ein anderer Tab die Session loescht, hier auch reagieren.
  try {
    window.addEventListener("storage", function (e) {
      if (e.key === KEY && e.newValue === null) fireCleared();
    });
  } catch (e) {}

  global.EBSession = EBSession;
})(typeof window !== "undefined" ? window : this);
