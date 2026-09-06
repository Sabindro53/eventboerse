#!/usr/bin/env bash
# Richtet das iOS-Projekt ein. Läuft NUR auf einem Mac mit Xcode.
#
#   cd <repo> && ./native/ios-einrichten.sh
#
# Wiederholbar: jeder Schritt prüft erst, ob er schon getan ist. Ein zweiter
# Lauf darf nichts kaputtmachen — sonst traut man sich beim ersten Fehler
# nicht mehr, ihn noch einmal zu starten.
#
# ── Warum am Ende nachgelesen wird ────────────────────────────────────────
# Das Skript sagt nicht „fertig". Es liest zum Schluss aus der ERZEUGTEN
# Info.plist zurück, was wirklich darin steht, und vergleicht mit dem, was
# hineingehört. Ein Einrichtungsskript, das seinen eigenen Erfolg behauptet,
# ist genau der Prüfer, der grün meldet, ohne geprüft zu haben — davon hatte
# dieses Projekt schon genug.
set -euo pipefail

cd "$(dirname "$0")/.."
WURZEL="$(pwd)"
IOS_APP="ios/App/App"

blau()  { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
gruen() { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
rot()   { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }

[ "$(uname)" = "Darwin" ] || { rot "Das hier läuft nur auf macOS."; exit 1; }
command -v xcodebuild >/dev/null 2>&1 || { rot "Xcode fehlt (xcodebuild nicht gefunden)."; exit 1; }
PB=/usr/libexec/PlistBuddy
[ -x "$PB" ] || { rot "PlistBuddy fehlt — untypisch für macOS."; exit 1; }

# ── 1. Capacitor ──────────────────────────────────────────────────────────
blau "Capacitor installieren"
if [ ! -d node_modules/@capacitor/ios ]; then
  npm install --save-dev @capacitor/core @capacitor/cli @capacitor/ios
else
  gruen "schon da"
fi

# ── 2. Xcode-Projekt ──────────────────────────────────────────────────────
# `cap add ios` liest capacitor.config.json. Die liegt in native/, Capacitor
# erwartet sie im Wurzelverzeichnis — deshalb wird sie für den Lauf verlinkt
# und danach wieder entfernt. Eine Kopie im Wurzelverzeichnis liegen zu
# lassen wäre eine zweite Fassung derselben Konfiguration.
blau "Xcode-Projekt anlegen"
if [ ! -d ios ]; then
  AUFGERAEUMT=nein
  if [ ! -e capacitor.config.json ]; then
    ln -s native/capacitor.config.json capacitor.config.json
    AUFGERAEUMT=ja
  fi
  npx cap add ios
  [ "$AUFGERAEUMT" = ja ] && rm -f capacitor.config.json
else
  gruen "ios/ besteht bereits"
fi
[ -d "$IOS_APP" ] || { rot "$IOS_APP fehlt — cap add ios ist nicht durchgelaufen."; exit 1; }

PLIST="$IOS_APP/Info.plist"
[ -f "$PLIST" ] || { rot "$PLIST fehlt."; exit 1; }

# ── 3. Privacy-Manifest ───────────────────────────────────────────────────
blau "Privacy-Manifest übernehmen"
cp native/PrivacyInfo.xcprivacy "$IOS_APP/PrivacyInfo.xcprivacy"
gruen "PrivacyInfo.xcprivacy kopiert"

# ── 4. Entitlements ───────────────────────────────────────────────────────
blau "Entitlements übernehmen"
cp native/App.entitlements "$IOS_APP/App.entitlements"
gruen "App.entitlements kopiert"
echo "   In Xcode noch verknüpfen: Build Settings → Code Signing Entitlements"
echo "   → App/App.entitlements. Ohne diesen Schritt liegt die Datei nur da."

# ── 5. Zwecktexte ─────────────────────────────────────────────────────────
# Aus Info.plist-zwecktexte.md abgeleitet, nicht hier abgeschrieben.
blau "Zwecktexte eintragen"
SCHLUESSEL=$(node native/zwecktexte.mjs --plist \
  | sed -n 's/.*<key>\(.*\)<\/key>.*/\1/p')
[ -n "$SCHLUESSEL" ] || { rot "zwecktexte.mjs hat nichts geliefert."; exit 1; }

while IFS= read -r k; do
  [ -n "$k" ] || continue
  TEXT=$(node -e '
    import("./native/zwecktexte.mjs").then(async (m) => {
      const e = (await m.zwecktexteLesen()).find((x) => x.schluessel === process.argv[1]);
      if (!e) { process.exit(3); }
      process.stdout.write(e.de);
    });' "$k")
  # Erst löschen, dann setzen: `Set` auf einen fehlenden Schlüssel scheitert,
  # `Add` auf einen vorhandenen ebenso. So bleibt der Lauf wiederholbar.
  "$PB" -c "Delete :$k" "$PLIST" >/dev/null 2>&1 || true
  "$PB" -c "Add :$k string $TEXT" "$PLIST"
done <<< "$SCHLUESSEL"
gruen "$(printf '%s\n' "$SCHLUESSEL" | grep -c .) Zwecktexte gesetzt"

# ── 6. Englische Fassungen ────────────────────────────────────────────────
blau "en.lproj/InfoPlist.strings schreiben"
mkdir -p "$IOS_APP/en.lproj"
node native/zwecktexte.mjs --strings > "$IOS_APP/en.lproj/InfoPlist.strings"
gruen "geschrieben"
echo "   In Xcode noch zum Ziel hinzufügen (File → Add Files to \"App\")."

# ── 7. Nachlesen, nicht behaupten ─────────────────────────────────────────
blau "Nachlesen, was wirklich in der Info.plist steht"
FEHLT=0
while IFS= read -r k; do
  [ -n "$k" ] || continue
  WERT=$("$PB" -c "Print :$k" "$PLIST" 2>/dev/null || true)
  if [ -z "$WERT" ]; then
    rot "$k fehlt in der Info.plist"
    FEHLT=$((FEHLT + 1))
  else
    printf '  %-40s %s\n' "$k" "$(echo "$WERT" | cut -c1-46)…"
  fi
done <<< "$SCHLUESSEL"

# Die Gegenprobe: was NICHT drinstehen darf. Eine erbetene und nie genutzte
# Berechtigung ist kein neutraler Zustand — sie erscheint im Dialog, steht in
# der Store-Beschreibung und muss zum Privacy-Manifest passen.
for k in NSMicrophoneUsageDescription NSLocationAlwaysAndWhenInUseUsageDescription \
         NSContactsUsageDescription NSPhotoLibraryAddUsageDescription \
         NSUserTrackingUsageDescription; do
  if "$PB" -c "Print :$k" "$PLIST" >/dev/null 2>&1; then
    rot "$k steht in der Info.plist und gehört dort nicht hin"
    FEHLT=$((FEHLT + 1))
  fi
done

echo
if [ "$FEHLT" -gt 0 ]; then
  rot "$FEHLT Abweichung(en) — nicht einreichen, bevor die geklärt sind."
  exit 1
fi
gruen "Info.plist stimmt mit native/Info.plist-zwecktexte.md überein."

cat <<'ENDE'

Was jetzt noch von Hand kommt — alles in Xcode:

  1. Signing & Capabilities → Team wählen
  2. + Capability → Push Notifications
  3. + Capability → Associated Domains   (Werte stehen in App.entitlements)
  4. Build Settings → Code Signing Entitlements → App/App.entitlements
  5. en.lproj/InfoPlist.strings zum Ziel hinzufügen

Danach:  npx cap sync ios && open ios/App/App.xcworkspace
Und in Xcode: Product → Archive → Distribute App → TestFlight.

Zum Verteilen siehe native/TestFlight.md — für einen Kollegen als INTERNEN
Tester braucht es keine Beta App Review.
ENDE
