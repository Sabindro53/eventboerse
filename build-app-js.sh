#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# build-app-js.sh — baut app.js aus den Modulen in js/modules/
#
# app.js ist GENERIERT (wie index.html): Quelle sind ausschließlich die
# Module in js/modules/, Reihenfolge steht in js/modules/modules.list.
# Kein Bundler, kein Transpiler — reine Konkatenation. Das deployte
# Artefakt bleibt app.js, am Laufzeitverhalten ändert sich nichts.
#
#   ./build-app-js.sh           baut app.js neu
#   ./build-app-js.sh --check   prüft nur (CI): Module ↔ app.js in Sync?
# ════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

LIST="js/modules/modules.list"
OUT="app.js"

[[ -f "$LIST" ]] || { echo "FEHLER: $LIST fehlt."; exit 1; }

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

while IFS= read -r mod; do
  # Leerzeilen und Kommentare in der Liste überspringen
  [[ -z "$mod" || "$mod" == \#* ]] && continue
  f="js/modules/$mod"
  [[ -f "$f" ]] || { echo "FEHLER: Modul fehlt: $f"; exit 1; }
  cat "$f" >> "$TMP"
done < "$LIST"

if [[ "${1:-}" == "--check" ]]; then
  if cmp -s "$TMP" "$OUT"; then
    echo "✓ app.js ist in Sync mit js/modules/ ($(wc -l < "$OUT") Zeilen)"
  else
    echo "✗ DRIFT: app.js weicht von der Konkatenation der Module ab."
    echo "  app.js nie von Hand editieren — Module ändern, dann ./build-app-js.sh"
    diff <(head -c 2000 "$TMP") <(head -c 2000 "$OUT") | head -20 || true
    exit 1
  fi
else
  mv "$TMP" "$OUT"
  trap - EXIT
  echo "✓ app.js gebaut: $(wc -l < "$OUT") Zeilen aus $(grep -cv '^\s*\(#\|$\)' "$LIST") Modulen"
fi
