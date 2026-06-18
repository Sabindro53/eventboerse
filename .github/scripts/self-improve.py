#!/usr/bin/env python3
"""Claude Self-Improve fuer Eventboerse.

Wird vom Workflow .github/workflows/claude-self-improve.yml aufgerufen.

Liest /tmp/signals.txt (Repo-Signale) und einen optionalen $HINT,
fragt Claude nach genau EINEM kleinen, sicher anwendbaren Verbesserungs-Vorschlag,
und schreibt nach:
  - /tmp/proposal.json  (Metadaten: title, scope, body, branch, patch_path)
  - /tmp/proposal.patch (unified diff, leer wenn nur Dokumentation/PR-Body)

Sicherheitsleitplanken:
  - max 1 Datei in der Aenderung
  - keine Loeschungen ohne ausdruecklichen Ersatz
  - keine Schemata-Aenderungen (functions.php DB-Migrations bleiben tabu)
  - Aenderung muss als Patch zustellbar sein, sonst Markdown-only Vorschlag
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

HINT = os.environ.get("HINT", "").strip()
SIGNALS_PATH = "/tmp/signals.txt"
PATCH_PATH = "/tmp/proposal.patch"
PROPOSAL_PATH = "/tmp/proposal.json"

try:
    with open(SIGNALS_PATH, "r", encoding="utf-8") as f:
        signals = f.read()[:6000]
except FileNotFoundError:
    signals = "(keine Signale erfasst)"

allowed_files = [
    "app.js", "functions.php", "styles.css", "hq.html", "index.html", "index.php",
    "README.md", "manifest.json", "sw.js", "robots.txt",
]

hint_block = f"\n\nUser-Hinweis: {HINT}" if HINT else ""

prompt = f"""Du bist der Self-Improve Bot fuer Eventboerse — deutscher Event-Marktplatz, Vanilla JS SPA + WordPress REST API.

Deine Aufgabe: Schlage GENAU EINE kleine, sicher anwendbare Verbesserung am Code vor.
Der Vorschlag wird als Draft-PR geoeffnet — der User entscheidet im HQ per Klick: Approve (merge) oder Reject (close).

Strikte Regeln:
1. Aenderung beschraenkt sich auf EINE Datei aus dieser Liste: {", ".join(allowed_files)}
2. Maximal +/-50 Codezeilen Diff insgesamt
3. KEINE DB-Schema-Aenderungen, KEINE neuen API-Endpoints, KEINE Loeschung von Funktionen
4. Aenderung muss eigenstaendig sinnvoll sein (kein "Schritt 1 von 5")
5. Bevorzuge: kleine Bugs, fehlende Null-Checks, fehlende ARIA-Labels, Performance-Kleinigkeiten,
   doppelten Code, console.log Aufraeumung, fehlende Tooltips, defekte Links
6. KEIN Vorschlag, falls bereits in den letzten 5 Vorschlaegen aehnlich aufgetaucht
7. KEIN Versuch, das ganze app.js zu refactoren — das ist out of scope

Repo-Signale:
{signals}
{hint_block}

Antworte in EXAKT diesem JSON-Format (kein Markdown-Wrapper, nur das JSON):
{{
  "title": "Kurzer Titel (max 70 Zeichen, ohne Emoji-Praefix)",
  "scope": "ui|api|perf|a11y|security|docs|cleanup",
  "branch": "self-improve/<slug>-<YYMMDD>",
  "summary": "1-2 Saetze: was und warum.",
  "file": "app.js",
  "patch": "Ein vollstaendiger unified diff im Format `--- a/<datei>\\n+++ b/<datei>\\n@@ ...`. Muss sich auf den aktuellen main-Stand anwenden lassen.",
  "test_plan": "3-5 Punkte wie der User die Aenderung pruefen kann."
}}

Falls du keinen sauberen Patch erstellen kannst, gib stattdessen einen `patch`-Wert von "" zurueck und nutze `summary` + `test_plan`, um den Vorschlag als reines Konzept zu erklaeren.
"""

payload = {
    "model": "claude-opus-4-7",
    "max_tokens": 3500,
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
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        text = result["content"][0]["text"]
except urllib.error.HTTPError as e:
    print(f"API-Fehler: {e.code} - {e.read().decode()}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Fehler beim API-Call: {e}", file=sys.stderr)
    sys.exit(1)

# JSON aus der Antwort extrahieren (Claude haengt manchmal Fließtext drumherum)
m = re.search(r"\{[\s\S]*\}", text)
if not m:
    print(f"Konnte kein JSON aus der Antwort lesen:\n{text[:500]}", file=sys.stderr)
    sys.exit(1)
try:
    data = json.loads(m.group(0))
except json.JSONDecodeError as e:
    print(f"JSON-Parse-Fehler: {e}\n--- raw ---\n{text[:800]}", file=sys.stderr)
    sys.exit(1)

# Sicherheits-Check: Datei muss in der Liste stehen
file_target = (data.get("file") or "").strip()
if file_target and file_target not in allowed_files:
    print(f"Verbotene Datei im Vorschlag: {file_target!r}. Abbruch.", file=sys.stderr)
    sys.exit(1)

# Patch schreiben (auch wenn leer)
patch = data.get("patch", "") or ""
with open(PATCH_PATH, "w", encoding="utf-8") as f:
    f.write(patch)

# Branchname absichern
slug = re.sub(r"[^a-z0-9-]+", "-", (data.get("branch") or "").lower()).strip("-")
if not slug.startswith("self-improve/"):
    today = datetime.now(timezone.utc).strftime("%y%m%d")
    slug = f"self-improve/auto-{today}"
data["branch"] = slug

# Body fuer PR zusammenbauen
body_parts = [
    "## Vorschlag vom Self-Improve Bot",
    "",
    data.get("summary", "(kein Summary)"),
    "",
    f"**Scope:** `{data.get('scope', 'cleanup')}`  ·  **Datei:** `{file_target or '–'}`",
    "",
    "### So pruefst du das:",
    data.get("test_plan", "(kein Pruefplan)"),
    "",
    "---",
    "*Generiert von Claude Self-Improve. Im HQ Mission Control kannst du Approve (merge) oder Reject (close) klicken.*",
]
body = "\n".join(body_parts)

proposal = {
    "title": (data.get("title") or "Kleine Verbesserung")[:70],
    "scope": data.get("scope", "cleanup"),
    "branch": data["branch"],
    "body": body,
    "patch_path": PATCH_PATH,
}
with open(PROPOSAL_PATH, "w", encoding="utf-8") as f:
    json.dump(proposal, f, ensure_ascii=False, indent=2)

print(f"Proposal gespeichert: {proposal['title']!r} -> {proposal['branch']}")
