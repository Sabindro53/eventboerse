// CSS-Duplikat-Analyse: findet Selektoren, die im SELBEN Media-Kontext
// mehrfach definiert sind UND dieselbe Property auf unterschiedliche Werte
// setzen — genau die Klasse Fehler, bei der eine spätere Regel eine frühere
// still aushebelt (Feuerwerk-Positionen, Verlaufsschrift …).
//
//   node tests/audit/css-duplicates.js            Konflikt-Report
//   node tests/audit/css-duplicates.js --alle     auch harmlose Duplikate
const fs = require('fs');

const css = fs.readFileSync('styles.css', 'utf8');
const showAll = process.argv.includes('--alle');

// Kommentare entfernen, Zeilennummern erhalten
let clean = '';
let inComment = false;
for (let i = 0; i < css.length; i++) {
  if (!inComment && css[i] === '/' && css[i + 1] === '*') { inComment = true; i++; clean += '  '; continue; }
  if (inComment && css[i] === '*' && css[i + 1] === '/') { inComment = false; i++; clean += '  '; continue; }
  clean += inComment && css[i] !== '\n' ? ' ' : css[i];
}

// Regeln mit Media-Kontext und Zeilennummer extrahieren
const rules = []; // { selector, media, props: Map, line }
let ctx = [];     // Stack von @media/@supports/@keyframes
let buf = '';
let line = 1;
let ruleStartLine = 1;
for (let i = 0; i < clean.length; i++) {
  const ch = clean[i];
  if (ch === '\n') line++;
  if (ch === '{') {
    const head = buf.trim();
    buf = '';
    if (head.startsWith('@')) {
      ctx.push(head);
    } else {
      ctx.push(null); // normale Regel — Body sammeln
      ruleStartLine = line;
      // Body bis zur passenden schließenden Klammer lesen
      let depth = 1, body = '';
      while (++i < clean.length && depth > 0) {
        if (clean[i] === '\n') line++;
        if (clean[i] === '{') depth++;
        else if (clean[i] === '}') { depth--; if (depth === 0) break; }
        if (depth > 0) body += clean[i];
      }
      ctx.pop();
      const media = ctx.filter(Boolean).join(' ∧ ') || '(global)';
      if (media.includes('@keyframes')) continue;
      const props = new Map();
      body.split(';').forEach((decl) => {
        const idx = decl.indexOf(':');
        if (idx === -1) return;
        const p = decl.slice(0, idx).trim().toLowerCase();
        const v = decl.slice(idx + 1).trim();
        if (p) props.set(p, v);
      });
      head.split(',').forEach((sel) => {
        rules.push({ selector: sel.trim().replace(/\s+/g, ' '), media, props, line: ruleStartLine });
      });
    }
    continue;
  }
  if (ch === '}') { if (ctx.length) ctx.pop(); buf = ''; continue; }
  buf += ch;
}

// Gruppieren nach selector+media
const byKey = new Map();
rules.forEach((r) => {
  const key = r.media + ' :: ' + r.selector;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(r);
});

let conflicts = 0, dups = 0;
[...byKey.entries()].forEach(([key, group]) => {
  if (group.length < 2) return;
  dups++;
  // Properties, die mehrfach mit UNTERSCHIEDLICHEN Werten gesetzt werden
  const seen = new Map(); // prop → { value, line }
  const clashes = [];
  group.forEach((r) => {
    r.props.forEach((v, p) => {
      if (seen.has(p) && seen.get(p).value !== v) {
        clashes.push({ prop: p, a: seen.get(p), b: { value: v, line: r.line } });
      }
      seen.set(p, { value: v, line: r.line });
    });
  });
  if (clashes.length) {
    conflicts++;
    console.log('⚠ KONFLIKT ' + key + '  (' + group.map((g) => 'Z' + g.line).join(', ') + ')');
    clashes.forEach((c) => {
      console.log('    ' + c.prop + ': "' + c.a.value.slice(0, 60) + '" (Z' + c.a.line + ')  →  "' + c.b.value.slice(0, 60) + '" (Z' + c.b.line + ')');
    });
  } else if (showAll) {
    console.log('· doppelt (ohne Wertkonflikt): ' + key + '  (' + group.map((g) => 'Z' + g.line).join(', ') + ')');
  }
});
console.log('\nSelektoren gesamt: ' + byKey.size + ' | mehrfach definiert: ' + dups + ' | mit Wert-Konflikt: ' + conflicts);
