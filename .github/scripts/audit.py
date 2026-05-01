#!/usr/bin/env python3
"""Claude Auto-Audit fuer das Projekt Eventboerse.

Wird vom Workflow .github/workflows/claude-auto-audit.yml aufgerufen.
Erwartet folgende Umgebungsvariablen:
  - ANTHROPIC_API_KEY  (Secret)
  - APP_LINES, FUNC_LINES, STYLE_LINES (aus dem stats-Step)

Liest /tmp/todos.txt und /tmp/app-start.txt (vom Extract-Step erstellt) und
schreibt das Audit-Ergebnis nach /tmp/audit-result.txt.
"""

import json
import os
import sys
import urllib.error
import urllib.request

app_lines = os.environ.get("APP_LINES", "?")
func_lines = os.environ.get("FUNC_LINES", "?")
style_lines = os.environ.get("STYLE_LINES", "?")

with open("/tmp/todos.txt", "r") as f:
    todos = f.read()[:2000]
with open("/tmp/app-start.txt", "r") as f:
    app_start = f.read()[:3000]

prompt = f"""Du bist ein Code-Auditor fuer das Projekt "Eventboerse" (deutscher Event-Marktplatz, Vanilla JS + WordPress REST API).

Projekt-Ueberblick:
- app.js: {app_lines} Zeilen (Vanilla JS SPA)
- functions.php: {func_lines} Zeilen (WordPress REST API, ~67 Endpoints)
- styles.css: {style_lines} Zeilen

Beginn von app.js (erste 300 Zeilen, inkl. Demo-Daten):
{app_start}

TODO/FIXME im Code:
{todos}

Bekannte Baustellen:
1. LISTINGS/REVIEWS/CHATS-Arrays in app.js sind hardcodiert (Demo-Daten)
2. Messaging nutzt Polling alle 3s, kein WebSocket/SSE
3. Suche ist client-seitig, kein MySQL FULLTEXT Index
4. Stripe-Integration unvollstaendig (kein Webhook-Reconcile)
5. app.js ist eine monolithische Datei (~15 000 Zeilen)

Erstelle einen strukturierten Audit-Bericht auf Deutsch mit maximal 5 Punkten je Kategorie. Sei konkret: Dateinamen, Zeilen, und kurze Loesungsansaetze.

Format:
## P0 - Kritisch (Sicherheit / Datenverlust)
## P1 - Wichtig (diese Sprint)
## P2 - Nice-to-Have (naechste Sprints)
## Code-Qualitaet & Refactoring"""

payload = {
    "model": "claude-sonnet-4-6",
    "max_tokens": 2000,
    "messages": [{"role": "user", "content": prompt}],
}

req = urllib.request.Request(
    "https://api.anthropic.com/v1/messages",
    data=json.dumps(payload).encode(),
    headers={
        "x-api-key": os.environ["ANTHROPIC_API_KEY"],
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    },
)

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        audit_text = result["content"][0]["text"]
        with open("/tmp/audit-result.txt", "w") as f:
            f.write(audit_text)
        print("Audit abgeschlossen.")
except urllib.error.HTTPError as e:
    print(f"API-Fehler: {e.code} - {e.read().decode()}", file=sys.stderr)
    sys.exit(1)
