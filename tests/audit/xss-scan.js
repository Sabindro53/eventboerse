// XSS-Audit-Scanner: findet innerHTML/insertAdjacentHTML-Statements, in denen
// potenziell nutzerkontrollierte Ausdrücke OHNE Escaping interpoliert werden.
// Bewusst überempfindlich — jede Meldung wird manuell im Code verifiziert.
const fs = require('fs');
const src = fs.readFileSync('app.js', 'utf8');
const lines = src.split('\n');

const sites = [];
for (let i = 0; i < lines.length; i++) {
  if (!/\.(innerHTML\s*[+]?=|insertAdjacentHTML)/.test(lines[i])) continue;
  let stmt = '';
  let j = i;
  while (j < lines.length && j < i + 60) {
    stmt += lines[j] + '\n';
    if (/;\s*$/.test(lines[j])) break;
    j++;
  }
  const exprs = [];
  (stmt.match(/\$\{([^}]+)\}/g) || []).forEach((m) => exprs.push(m.slice(2, -1)));
  (stmt.match(/\+\s*([A-Za-z_$][\w.$]*(\([^()]*\))?)/g) || []).forEach((m) => exprs.push(m.replace(/^\+\s*/, '')));
  const danger = [...new Set(exprs)].filter((e) => {
    if (/_escHtml|escHtml|escapeHtml|_escAttr|encodeURIComponent|Number\(|parseInt|parseFloat|toFixed|Math\.|Date|_formatEuro|_fmt|\.length|\.id\b|Id\b|_dbId|index|idx|\bi\b/.test(e)) return false;
    if (/^\s*['"`]/.test(e)) return false;
    return /\b(title|name|text|body|message|msg\.|desc|description|location|region|label|query|search|term|content|comment|review|reply|question|answer|value|bio|company|author|heading|url|image|src|href)\b/i.test(e);
  });
  if (danger.length) sites.push({ line: i + 1, endLine: j + 1, exprs: danger.slice(0, 8) });
  i = j; // Statement nicht mehrfach zählen
}
console.log('Verdachtsstellen:', sites.length);
sites.forEach((s) => console.log(`${s.line}-${s.endLine}: ${s.exprs.join(' | ')}`));
