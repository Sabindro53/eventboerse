---
layer: L3
domain: betrieb
share: internal
tags: [layer/L3, domain/betrieb, share/internal, typ/anleitung]
---

# Aufträge für Cowork

Cowork bedient einen echten Browser und kommt damit an zwei Stellen hin, an
die diese Sitzung nicht kommt: **App Store Connect** und das **HQ auf der
Live-Seite**. Diese Datei ist der Auftrag. Sie ist zum Weitergeben gedacht —
der Abschnitt „Der Auftrag" unten kann wörtlich an Cowork gehen.

---

## Sechs Regeln, die über allem stehen

**1. Nichts raten.** Für jede Antwort in beiden App-Store-Fragebögen gibt es
eine belegte Vorgabe im Vault. Findest du eine Frage, die dort nicht steht:
**anhalten und fragen.** Eine geratene Angabe in einem Apple-Formular ist
später nicht von einer geprüften zu unterscheiden — bis Apple sie prüft.

**2. Nie aus dieser Datei abschreiben, immer aus der Quelle lesen.** Die
Antworten stehen **nicht** hier, mit Absicht. Zwei gepflegte Listen derselben
Sache driften immer, und diese hier würde unbemerkt driften: sie wird nie
gegen den Code geprüft, die Vault-Datei schon (`app-store.spec.js` bricht bei
Abweichung ab). Lies vor jedem Formular:

> https://github.com/Sabindro53/eventboerse/blob/main/vault/40-Governance/Legal/App-Store.md

Das Repository ist öffentlich, du brauchst keine Anmeldung dafür.

**3. Keine persönlichen oder rechtlichen Daten erfinden.** Adresse, Postfach,
Telefonnummer, E-Mail des Kollegen, Handelsregisterangaben: **niemals**
ausdenken, niemals aus dem Impressum ableiten und einsetzen. Diese Felder
füllt der Inhaber oder er gibt dir den Wert ausdrücklich.

**4. Ein Geheimnis geht nie durch den Chat.** Der APNs-Schlüssel (`.p8`) ist
eine Datei, die Push-Nachrichten in unserem Namen senden kann. Nicht öffnen,
nicht anzeigen, nicht abtippen, nicht hochladen, nicht ins Repository legen.
Nur sagen, **wo sie liegt** und wie die Key-ID lautet.

**5. Melde, was du gesehen hast — nicht, was du erwartet hast.** Wenn ein
Formular anders aussieht als hier beschrieben, ist das der interessante Teil
des Berichts. Apple ändert diese Masken ohne Ankündigung. „Wie beschrieben
ausgefüllt" ist kein Bericht, wenn du in Wahrheit drei Felder anders
vorgefunden hast.

**6. Nichts absenden, was du nicht rückgängig machen kannst, ohne zu fragen.**
Ausfüllen und speichern: ja. **„Submit for Review", „Release", „Publish",
Löschen von Buildern, Ändern von Preisen oder Verfügbarkeit: nein**, auch
wenn es der nächste logische Knopf ist.

---

## Was blockiert was

Die drei Punkte unter **A** brauchen niemanden ausser dir und sind sofort
machbar. **B** braucht je eine Angabe vom Inhaber. **C** ist Fleissarbeit auf
der Live-Seite und verbessert die Ladezeit.

Keiner dieser Punkte blockiert den internen TestFlight-Test mit dem Kollegen —
ausser der Einladung selbst (B3). Die beiden Fragebögen blockieren die
**Einreichung**, nicht den Test.

---

# Der Auftrag

## A — Sofort machbar, nichts fehlt dir

### A1. App Privacy ausfüllen

**Wo:** App Store Connect → unsere App (Apple-ID steht im Vault unter
*Registrierte Kennungen*) → **App Privacy**.

**Vorlage:** Vault-Abschnitt **„Erhobene Daten — Zuordnung zum Code"**.

Die erste Tabellenspalte ist bereits Apples **Klickpfad in seiner eigenen
Beschriftung**, englisch, mit `›` als Trenner. `User Content › Photos or
Videos` heisst: Kategorie *User Content* aufklappen, darin *Photos or Videos*
ankreuzen. Übersetze nichts — bis zum 07.09.2026 stand dort die deutsche
Fassung, und die ist im Formular schlicht nicht auffindbar.

Zehn Datenarten. Für **jede** stellt Apple danach dieselben Fragen; die
Antworten stehen im selben Abschnitt:

- *Is this data linked to the user's identity?* → für alle zehn **ja**
- *Do you or your third-party partners use this data for tracking?* → für alle
  zehn **nein**
- *Purposes* → **App Functionality**; bei **Usage Data › Product Interaction**
  zusätzlich **Product Personalization**

Der Vault nennt ausserdem **fünf Angaben, die ausdrücklich nein sind** —
Browsing History, Search History, Device ID, Crash/Performance Data, Payment
Info. Nicht anhaken. Sie stehen dort, damit niemand sie „sicherheitshalber"
mitnimmt.

**Warum das genau stimmen muss:** dieselbe Liste steht im Privacy-Manifest der
App (`native/PrivacyInfo.xcprivacy`). Apple vergleicht beide. Weicht das
Formular ab, ist das ein Ablehnungsgrund, und zwar einer, der erst nach dem
Hochladen des Builds auffällt.

### A2. Altersfreigabe ausfüllen

**Wo:** App Store Connect → App Information → **Age Rating** → *Edit*.

**Vorlage:** Vault-Abschnitt **„Der Fragebogen, Zeile für Zeile"** — jede
Frage mit Antwort und Begründung.

**16+ ist das Ergebnis, nicht die Eingabe.** Trag nirgends „16+" ein; das
Formular rechnet die Stufe aus rund zwanzig Einzelantworten aus. Wenn am Ende
etwas anderes als 16+ herauskommt, hast du entweder eine Frage anders
beantwortet als vorgegeben, oder Apple hat den Fragebogen geändert — **beides
ist ein Grund anzuhalten und zu melden**, nicht nachzujustieren.

Zwei Antworten sehen falsch aus und sind richtig. Wenn du der Versuchung
nachgeben willst, sie zu „korrigieren", lies erst die Begründung im Vault:

- **Alkohol: „selten/mild", nicht „keine".** Es gibt echte Alkoholbezüge im
  Produkt (Cocktail-Bar, Bier-Zapfanlage, Wein-Verkostung). Die Antwort hebt
  die Stufe nicht — sie ergäbe für sich 9+ — und genau deshalb ist die
  Versuchung gross, „keine" anzukreuzen. Geprüft wird später aber die Angabe,
  nicht das Ergebnis.
- **„Age Assurance" und „Social Media Disabled for Users Under 13": beide
  nein.** Die AGB verlangen 18 Jahre, aber die Registrierung fragt kein Alter
  ab. Apple fragt nach der technischen Kontrolle, nicht nach der Zusage. „Ja"
  wäre die Erklärung einer Sperre, die es nicht gibt.

### A3. Den Stand berichten

Nach A1 und A2: **Schnappschuss der ausgefüllten Masken**, dazu die Liste der
Fragen, bei denen das Formular von der Vorlage abwich (auch wenn du sie lösen
konntest). Nicht absenden — nur speichern.

---

## B — Braucht je eine Angabe vom Inhaber

### B1. APNs-Schlüssel erzeugen

**Wo:** developer.apple.com → Certificates, Identifiers & Profiles → **Keys**
→ **+** → Name vergeben → **Apple Push Notifications service (APNs)**
ankreuzen → Continue → Register → **Download**.

**Die Datei lädt sich genau einmal herunter.** Danach ist sie bei Apple nicht
mehr abrufbar; ein verlorener Schlüssel wird widerrufen und neu erzeugt, das
ist kein Drama, aber unnötig.

Handhabung, ohne Ausnahme:

- Datei liegen lassen, wo der Browser sie ablegt. Nicht umbenennen, nicht
  verschieben, nicht öffnen.
- **Inhalt nie anzeigen, nie zitieren, nie in eine Antwort schreiben.**
- Nicht ins Repository legen. Das Repository ist **öffentlich**.
- Melden: **Key-ID**, **Team-ID**, **Dateiname und Ablageort**. Mehr nicht.

**Frag den Inhaber vorher**, ob du diesen Schritt gehen sollst oder ob er ihn
selbst macht. Es ist ein Zugangsschlüssel; wer ihn erzeugt, gehört zur
Entscheidung.

### B2. Händlerstatus erklären

**Wo:** App Store Connect → Business / Agreements → **Trader Status**.

**Erklären** muss man ihn immer. **Verifizieren** nur für die öffentliche
EU-Listung — für TestFlight nimmt Apple uns ausdrücklich aus (Zitat und Quelle
im Vault-Abschnitt *Offen*).

**Du füllst hier nichts selbst aus.** Öffne das Formular und berichte:

1. Welche Felder verlangt werden (genau, wörtlich).
2. Welche Auswahl bei „Are you acting as a trader?" zur Wahl steht.
3. Ob und wo Apple ankündigt, welche Angaben **öffentlich auf der
   Produktseite** erscheinen.

Dann warte auf die Werte. Das ist eine rechtliche Erklärung mit den
persönlichen Daten des Inhabers — Punkt 3 der Regeln oben.

*Hintergrund, falls die Frage kommt:* erfüllbar ist das als **natürliche
Person**, eine Gesellschaft verlangt Apple nicht, und als Anschrift genügt ein
**Postfach** — deshalb das Postfach, denn die verifizierten Angaben stehen
später öffentlich im Store.

### B3. Den Kollegen einladen

**Braucht:** seine E-Mail-Adresse. Nicht raten, nicht aus einem Verlauf
zusammensuchen.

**Wo:** App Store Connect → **Users and Access** → **+** → Rolle **Developer**
oder **App Manager** → Einladung senden.

Danach: **TestFlight → Internal Testing** → Gruppe anlegen → ihn hinzufügen.
Er muss die Einladung erst **annehmen**; vorher taucht er dort nicht auf. Das
ist kein Fehler, sondern der Normalzustand — bitte nicht als Problem melden,
solange die Einladung noch offen ist.

Interne Tester brauchen **keine Beta App Review**. Sobald ein Build oben liegt,
kann er sofort installieren.

---

## C — Auf der Live-Seite, im HQ

Anmeldung als Administrator auf **eventbörse.de**, dann **eventbörse.de/hq**.
Wer nicht berechtigt ist, bekommt dort eine 404 — das ist Absicht und kein
Fehler.

### C1. Den CSP-Bericht ablesen — der wertvollste Punkt hier

Damit steht oder fällt der zweite Schritt beim XSS-Schutz der Seite.

Es gibt dafür **keinen Knopf im HQ**. Die Route ist admin-only und braucht
einen Nonce, ein blosser Aufruf der Adresse gibt 403. Öffne deshalb auf der
`/hq`-Seite die Browser-Konsole und führe aus:

```js
await (await fetch('/wp-json/eventboerse/v1/csp-report',
  { headers: { 'X-WP-Nonce': HQ_REST_NONCE } })).json()
```

`HQ_REST_NONCE` setzt die Seite selbst. Ist die Variable nicht definiert, bist
du nicht auf `/hq` oder nicht als Administrator angemeldet — dann **nicht
irgendeinen Nonce suchen**, sondern das melden.

**Melde die Antwort vollständig**, vor allem:

- den Wert von `bereit`
- **ob ein Eintrag mit `direktive: "script-src-elem"` und `quelle: "inline"`
  dabei ist** — das ist die eigentliche Frage
- den Wert von `voll` (ist der Deckel von 25 erreicht?)

Was das bedeutet: seit dem 07.09.2026 meldet die Seite nur noch **einen**
echten Fehlerfall — ein Inline-`<script>` ohne Nonce. Steht der Eintrag nicht
da, kann die CSP scharfgestellt werden. Steht er da, würde dasselbe Vorgehen
ein Stück der Seite still ausschalten, und wir wissen es **vorher**.

Der Bericht liegt in einem Transient mit sieben Tagen Laufzeit. Er ist kurz
nach einem Deploy dünn — wenn er fast leer ist, sag das dazu, statt es für ein
Ergebnis zu halten.

### C2. Bilder als WebP nachrüsten

**Wo:** HQ → **🗜️ Bilder als WebP**.

Der Ansichtsknopf zeigt den Stand, **ohne** etwas zu schreiben. **🗜️ Eine
Runde umsetzen** rechnet höchstens 40 Bilder bzw. 20 Sekunden um — der Deckel
ist Absicht, ein Durchlauf ins PHP-Zeitlimit bräche mitten in der Arbeit ab.

Also: Runde drücken, warten, `offen` ablesen, wiederholen, **bis `offen` 0
ist oder eine Runde keinen Fortschritt mehr bringt**. Zwei Runden ohne
Veränderung heissen: aufhören und melden, nicht weiterdrücken.

Bringt rund **660 KB** pro Erstbesuch. Kein Bild kann dabei verlorengehen —
fehlt die `.webp`-Datei, liefert Apache unverändert das Original aus.

### C3. Demo-Bilder in die eigene Mediathek holen

**Wo:** HQ → **🖼️ Demo-Bilder**.

Solange das nicht gelaufen ist, lädt die Startseite Bilder direkt von Pexels —
also geht bei jedem Besuch die IP-Adresse des Besuchers an einen Dritten.
Höchstens 15 Bilder je Runde. Gleiches Vorgehen wie bei C2: drücken, `offen`
ablesen, wiederholen, bei ausbleibendem Fortschritt aufhören.

---

## Was der Bericht enthalten muss

Für jeden erledigten Punkt:

1. **Was du wirklich gesehen hast** — abweichende Feldnamen, zusätzliche
   Fragen, geänderte Reihenfolgen. Das ist der wertvollste Teil.
2. **Was du eingetragen hast**, Feld für Feld, bei den Fragebögen mit
   Schnappschuss.
3. **Was du nicht konntest, und woran es lag.** Ein offener Punkt mit Grund
   ist ein Ergebnis. Ein übergangener Punkt ist keins.
4. **Alles, wozu du raten müsstest** — als Frage, nicht als Eintrag.

Der letzte Punkt ist der wichtigste. Ein Formular, das vollständig aussieht,
wird nicht noch einmal geprüft.
