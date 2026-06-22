#!/usr/bin/env bash
# Baut die lokale Dev-Shell index.html aus der gemeinsamen Body-Quelle.
# index.php nutzt app-shell.html direkt per readfile — nur index.html muss gebaut werden.
# Nach jeder Änderung an app-shell.html ausführen und index.html committen.
set -euo pipefail
cd "$(dirname "$0")"
cat index.local-head.html app-shell.html index.local-foot.html > index.html
echo "index.html neu gebaut ($(wc -l < index.html) Zeilen)."
