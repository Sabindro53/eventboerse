/**
 * EBSafeHTML  — defensiver innerHTML-Ersatz fuer Eventboerse.
 *
 * Datei: assets/js/security/sanitize.js
 * Einbindung: <script src="/assets/js/security/sanitize.js"></script>
 * VOR app.js laden.
 *
 * Audit-Issue: #13 (P0.2  — XSS durch unkontrolliertes innerHTML).
 *
 * Strategie:
 * 1. Wenn DOMPurify global verfuegbar ist (zB via CDN-Script), nutzen wir es.
 * 2. Sonst Fallback auf eine konservative Allow-List, die fuer Listing-Beschreibungen,
 *    Reviews und Chat-Messages reicht. Inline-Scripts/Event-Handler werden hart entfernt.
 *
 * API:
 *   EBSafeHTML.set(el, html, opts?)   ersetzt innerHTML mit sanitisiertem Wert
 *   EBSafeHTML.text(el, str)          shortcut fuer textContent (volle Sicherheit)
 *   EBSafeHTML.sanitize(html, opts?)  liefert sanitisierten String zurueck
 *
 * Empfohlene Migrations-Patterns in app.js:
 *   detailEl.innerHTML = listing.description;
 *      detailEl.innerHTML = EBSafeHTML.sanitize(listing.description);
 *      EBSafeHTML.set(detailEl, listing.description);
 *
 *   messageEl.innerHTML = chat.message;
 *      EBSafeHTML.text(messageEl, chat.message);  // wenn nur Text gewuenscht
 *
 *   container.innerHTML = `<a href="${u}">${name}</a>`;
 *      container.replaceChildren(linkEl);  // sauberster Weg via DOM-API
 */
(function (global) {
  "use strict";

  // ----- Konfiguration -----------------------------------------------------
  var ALLOWED_TAGS = [
    "a", "abbr", "b", "blockquote", "br", "code", "em", "figcaption",
    "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
    "li", "mark", "ol", "p", "pre", "small", "span", "strong", "sub",
    "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul", "div"
  ];

  var ALLOWED_ATTRS = {
    a:    ["href", "title", "rel", "target"],
    img:  ["src", "alt", "title", "width", "height", "loading"],
    span: ["class"],
    div:  ["class"],
    code: ["class"]
  };

  // Schemes die in Hrefs/Srcs erlaubt sind. Alles andere (data:, javascript:, vbscript:) raus.
  var SAFE_URL = /^(https?:|mailto:|tel:|#|/)/i;

  // ----- Sanitizer ---------------------------------------------------------
  function sanitizeWithFallback(html) {
    var doc = new DOMParser().parseFromString(
      "<div>" + String(html) + "</div>",
      "text/html"
    );
    var root = doc.body.firstChild;
    walk(root);
    return root.innerHTML;
  }

  function walk(node) {
    var children = Array.from(node.childNodes);
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === Node.ELEMENT_NODE) {
        var tag = child.tagName.toLowerCase();
        if (ALLOWED_TAGS.indexOf(tag) === -1) {
          // Tag entfernen, Inhalte aber behalten (defensive Default).
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
          continue;
        }
        // Attribute filtern
        var allowed = ALLOWED_ATTRS[tag] || [];
        var attrs = Array.from(child.attributes);
        for (var j = 0; j < attrs.length; j++) {
          var a = attrs[j];
          var name = a.name.toLowerCase();
          if (name.startsWith("on") || allowed.indexOf(name) === -1) {
            child.removeAttribute(a.name);
            continue;
          }
          if ((name === "href" || name === "src") && !SAFE_URL.test(a.value)) {
            child.removeAttribute(a.name);
          }
        }
        // Externe Links sicher machen.
        if (tag === "a" && child.getAttribute("target") === "_blank") {
          child.setAttribute("rel", "noopener noreferrer");
        }
        walk(child);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child);
      }
    }
  }

  function sanitize(html, opts) {
    if (html == null) return "";
    var src = String(html);
    if (typeof global.DOMPurify !== "undefined" && typeof global.DOMPurify.sanitize === "function") {
      var cfg = {
        ALLOWED_TAGS: ALLOWED_TAGS,
        ALLOWED_ATTR: Object.keys(ALLOWED_ATTRS).reduce(function (acc, k) {
          ALLOWED_ATTRS[k].forEach(function (a) { if (acc.indexOf(a) === -1) acc.push(a); });
          return acc;
        }, []),
        ALLOW_DATA_ATTR: false
      };
      if (opts && opts.profile === "text") {
        cfg.ALLOWED_TAGS = [];
        cfg.KEEP_CONTENT = true;
      }
      return global.DOMPurify.sanitize(src, cfg);
    }
    if (opts && opts.profile === "text") return src.replace(/<[^>]*>/g, "");
    return sanitizeWithFallback(src);
  }

  function setSafe(el, html, opts) {
    if (!el) return;
    el.innerHTML = sanitize(html, opts);
    return el;
  }

  function setText(el, str) {
    if (!el) return;
    el.textContent = (str == null) ? "" : String(str);
    return el;
  }

  global.EBSafeHTML = {
    sanitize: sanitize,
    set: setSafe,
    text: setText,
    _allowedTags: ALLOWED_TAGS.slice(),
    _allowedAttrs: ALLOWED_ATTRS
  };
})(typeof window !== "undefined" ? window : this);
