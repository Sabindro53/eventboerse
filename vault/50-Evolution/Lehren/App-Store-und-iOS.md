---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: App Store, Apple-Zuordnung, Altersfreigabe

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Die App für den App Store
- Die Apple-Zuordnung wird ausgeliefert
- Die Stufe ist das Ergebnis, nicht die Eingabe

## Die App für den App Store

Alles, was ohne macOS entstehen kann, liegt in **`native/`**. Das Xcode-Projekt
erzeugt `npx cap add ios` und läuft nur auf einem Mac.

**Apple will hier keine Provision.** Guideline **3.1.3(e)**: eine Leistung, die
*außerhalb* der App erbracht wird — DJ, Catering, Location — **darf nicht**
über In-App-Kauf abgerechnet werden. Apple nennt die Kartenzahlung in der App
ausdrücklich als den vorgesehenen Weg und nimmt **0 %**. Stripe läuft in der
App wie im Web.

**Die Browser-Umleitung ist nicht verboten, sondern zwecklos.** Hier stand bis
zum 02.09.2026, **3.1.1(a)** verbiete sie außerhalb des US-Storefronts. Das war
zu stark: die Verbote in 3.1.1 gelten Apps mit **digitalen Inhalten**, die IAP
benutzen müssen. Ein Marktplatz für reale Leistungen fällt unter 3.1.3(e) und
liegt damit vollständig außerhalb dieses Regelwerks — es gibt nichts, worum
herumzuleiten wäre.

Der Grund gegen die Umleitung ist also kein regulatorischer, sondern ein
geschäftlicher: sie wirft den Kunden mitten in der Buchung aus der App in den
Browser und spart dabei **nichts**. Die Plattformprovision ist eine
`application_fee_amount` auf einer Stripe-Destination-Charge — Stripe zieht sie
vom Zahlbetrag ab und leitet sie weiter, in der App wie im Browser identisch.
**Apple sieht dieses Geld nie.**

PR #46 baut auf der Annahme auf, Apple wolle hier mitverdienen. Er ist damit
gegenstandslos, nicht gefährlich.

**Die App lädt die Website, sie bringt sie nicht mit** (`server.url`). Der
Grund ist die Anmeldung: die REST-API authentifiziert über das
WordPress-Cookie plus `X-WP-Nonce`. Ein gebündeltes Capacitor-App liefe unter
`capacitor://localhost` — jede Anfrage wäre **cross-site**, ohne Cookie und
ohne Nonce. Ein Bundle bräuchte ein **zweites Authentifizierungsverfahren für
alle 124 Routen**, parallel zum bestehenden. Zwei Wege in dieselbe Anwendung
hinein sind genau die Angriffsfläche, die man sich nicht ohne Not baut.

Der Preis, ehrlich benannt: kein Offline-Betrieb, und **Guideline 4.2** —
eine reine Website-Hülle wird abgelehnt. Das ist der wahrscheinlichste
Ablehnungsgrund und wird nicht durch Argumente ausgeräumt, sondern durch
Funktionen: **Push** (eine Buchungsanfrage muss ankommen, wenn die App zu
ist), **Kamera**, **Passkeys/Face ID** (`webauthn.php` ist da), **Standort**
(Radar). Ohne diese vier gar nicht erst einreichen.

**Das Privacy-Manifest ist Pflicht** (`native/PrivacyInfo.xcprivacy`, seit
2024). Jede Datenart darin ist am Code belegt, und
`vault/40-Governance/Legal/App-Store.md` führt dieselbe Liste mit der
Apple-Kennung als eigener Spalte. **`app-store.spec.js` vergleicht beide
Seiten und bricht bei Drift ab** — zwei gepflegte Listen derselben Sache
driften immer, und diese driftet unbemerkt bis zur Ablehnung.

`eb_taste_v1` läuft unter **Personalisierung**, nicht unter Funktion: es wird
aus Such- und Klickverhalten *abgeleitet* und ist in `Cookie-Liste.md` als
profilbildend geführt. Abrunden erzeugte einen Widerspruch zur eigenen
Datenschutzerklärung, den Apple findet.

**Neue erhobene Datenart → drei Orte, alle oder keiner:** Vault-Tabelle,
Privacy-Manifest, App Store Connect. Dazu die Datenschutzerklärung und bei
einem neuen Speicherschlüssel `Cookie-Liste.md`.

**`viewport-fit=cover` war die fehlende Zeile.** `styles.css` rechnet an sechs
Stellen mit `env(safe-area-inset-*)` — untere Navigation, Buchungsleiste,
Panels. Ohne das Attribut liefert **jede** dieser Abfragen 0, und zwar still:
das Layout sieht auf dem Schreibtisch richtig aus und liegt auf einem iPhone
mit Home-Indikator darunter. Die Behandlung war da und war wirkungslos.
`viewport-fit`, `apple-mobile-web-app-status-bar-style: black-translucent` und
die safe-area-Abstände gehören zusammen; einzeln ist jedes davon ein Fehler.

Nebenbei behoben: die Statusleisten-Farbe stand auf `#6C63FF` — eine Farbe,
die im ganzen Projekt sonst nur in `generate-icons.html` vorkommt, einem
Werkzeug, das nichts ausliefert. Die Marke ist `#FF385C` (62 Fundstellen).
Jetzt zwei Werte nach Farbmodus, wie in der Dev-Shell.

**Schon erfüllt:** **5.1.1(v)** Kontolöschung in der App
(`/settings/delete-account` plus Knopf in den Einstellungen — ohne das gibt es
keine Freigabe, und es ist leicht wegzurefaktorisieren) und die 15
Pflichtseiten.


## Die Apple-Zuordnung wird ausgeliefert

`/.well-known/apple-app-site-association` läuft über `eb_serve_theme_root_file()`,
denselben Weg wie `manifest.json` und `sw.js`. Ohne diese Datei bietet iOS in
der App **keinen gespeicherten Passkey der Domain an** — und `webauthn.php`
*ist* die Anmeldung. Das wäre keine Einschränkung, sondern eine App, in der man
sich nicht anmelden kann.

Apple ist in drei Punkten unnachgiebig: genau dieser Pfad **ohne Endung**
(`.json` anzuhängen ist der verbreitetste Fehler, und Apple meldet ihn nicht),
`Content-Type: application/json` **ohne Zusatz**, und keine Weiterleitung davor.

**Ohne gültige Team-ID wird nichts ausgeliefert.** `EB_APPLE_TEAM_ID` steht in
`wp-config.php`, nicht im Repo — sie gehört zur Bereitstellung wie
`EB_OPENAI_API_KEY`. Geprüft wird auf Apples Format (zehn alphanumerische
Zeichen); ein kopierter Platzhalter fällt damit durch.

Der Grund für diese Strenge: **Apple holt die Datei einmal beim Installieren ab
und merkt sich das Ergebnis.** Eine Zuordnung mit Platzhalter fällt deshalb
erst beim Nutzer auf, und dann ist sie schon zwischengespeichert. Fehlt die
Konstante, bleibt es beim 404 — nicht eingerichtet sieht dann anders aus als
eingerichtet.

**Die Reihenfolge der `components` ist die ganze Logik.** Apple wertet von oben
nach unten aus, der erste Treffer gewinnt. `/hq/*`, `/wp-admin/*`, `/wp-json/*`
und `/wp-login.php` stehen deshalb **vor** dem Auffangmuster `/*`; ein
Ausschluss danach wäre wirkungslos, und die Datei sähe trotzdem richtig aus.

**Die Bundle-ID steht an zwei Orten** — hier und in
`native/capacitor.config.json`. Driften sie, meldet Apple die Zuordnung als
ungültig, und beide Dateien sehen für sich weiterhin korrekt aus.
`aasa.spec.js` vergleicht sie.

```bash
npx playwright test tests/e2e/aasa.spec.js   # Testzahl: siehe CLAUDE.md · jeder Fall ein eigener Prozess
```

**Die Team-ID kommt über den Deploy**, nicht von Hand. `ionos-deploy.yml` hat
dafür einen eigenen Schritt — dasselbe Muster wie bei SMTP, Stripe und den
KI-Schlüsseln: Secret setzen, nächster Deploy schreibt `define()` nach
`wp-config.php`. Sie von Hand einzutragen hiesse, sich per SFTP anzumelden und
eine Datei mit allen Datenbank-Zugangsdaten zu öffnen.

**Opt-in und formatgeprüft.** Ohne Secret bleibt `wp-config.php` unangetastet
und die Route bei 404 — der ehrliche Zustand „nicht eingerichtet". Ein Wert,
der nicht Apples Format hat (zehn alphanumerische Zeichen), bricht den Schritt
ab, statt geschrieben zu werden. Der Grund ist derselbe wie bei der Route
selbst: Apple holt die Zuordnung einmal beim Installieren ab und merkt sich das
Ergebnis, ein Tippfehler fiele also erst beim Nutzer auf.

Die Prüfung steht damit an **zwei** Stellen — im Deploy und in
`eb_apple_app_id()`. `aasa.spec.js` hält fest, dass beide dasselbe verlangen;
driften sie, schriebe der Deploy einen Wert, den PHP anschliessend verwirft,
und meldete dabei Erfolg.

**Noch offen:** Zwecktexte in `Info.plist`, APNs-Schlüssel — beides nur in
Xcode bzw. im Entwicklerkonto zu machen.

**Der Händlerstatus blockiert TestFlight nicht.** Hier stand bis zum
06.09.2026, er sei „Pflicht für jede App im EU-App-Store" — als Vorbedingung
gelesen, und so war er auch als erster Punkt der Startreihenfolge geführt.
Apples eigene Hilfe sagt für genau diesen Fall das Gegenteil:

> *„If you don't distribute apps on the App Store in the EU (for example you
> only distribute apps through alternative distribution, or TestFlight, or on
> the App Store only outside the EU), you're not acting as a trader on the
> App Store."*

**Erklären** muss man den Status trotzdem immer („Even if you don't distribute
apps in the EU, you'll still need to declare a trader status"), **verifizieren**
nur für die öffentliche EU-Listung. Der Unterschied ist der ganze Punkt: die
Verifikation (Postfach, Telefon, E-Mail, je mit zweitem Faktor) läuft parallel
zum Bauen, Hochladen und Verteilen an Tester.

Für die Listung bleibt alles Bisherige richtig: erfüllbar als **natürliche
Person** (Adresse **oder Postfach**), eine Kapitalgesellschaft verlangt Apple
dafür nicht, und Apple veröffentlicht die verifizierten Angaben auf der
Produktseite — deshalb das Postfach.

**Eine stillschweigend behobene Vorbedingung sieht aus, als hätte sie nie
anders gelautet.** Deshalb steht hier, was vorher dastand.

**Die Erklärung, die durch Nichtstun falsch wird.** Für die TestFlight-Phase
ist *„kein Händler auf dem App Store"* die **zutreffende** Angabe — das folgt
aus Apples eigenem Satz, es ist keine Wahl. Sie verlangt weder persönliche
Daten noch Verifikation. Und sie wird **unwahr in dem Moment, in dem die App
öffentlich im EU-App-Store steht** — ohne dass jemand etwas ändert und ohne
dass irgendwo eine Warnung erscheint.

Das ist die gefährlichere Sorte: eine **fehlende** Erklärung blockiert und
fällt auf, eine stillschweigend falsch gewordene nicht. Vor jeder öffentlichen
EU-Listung ist der Status deshalb von *kein Händler* auf **Händler**
umzustellen **und** zu verifizieren — umstellen, nicht nur verifizieren.
`app-store.spec.js` hält den Vermerk in Vault und `native/TestFlight.md` fest;
wer ihn löscht, löscht die einzige Warnung, die es dafür gibt.


## Die Stufe ist das Ergebnis, nicht die Eingabe

„Altersfreigabe: 16+" ist die **Ausgabe** eines Fragebogens mit rund zwanzig
Einzelfragen in sieben Gruppen. Wer nur die Stufe kennt und vor dem Formular
sitzt, rät zwanzigmal. Deshalb steht in
`vault/40-Governance/Legal/App-Store.md` jetzt jede Frage mit ihrer Antwort
und ihrem Grund — und zwei davon sind nicht offensichtlich:

**Alkoholbezüge gibt es.** Die Merkmalsliste für Inserate führt *Cocktail-Bar*,
*Bier-Zapfanlage* und *Wein-Verkostung*, das Suchvokabular kennt *barkeeper*.
Die richtige Antwort ist **selten**, nicht „keine". Sie ergibt für sich
genommen 9+ und liegt damit weit unter unseren 16+ — **das Ergebnis ändert
sich also nicht, und genau deshalb ist die Versuchung gross, „keine"
anzukreuzen.** Geprüft wird später aber die Angabe, nicht das Ergebnis; eine
unwahre Angabe kann die App noch Monate danach aus dem Store nehmen.

Die Falle daneben: **„Alkoholfreie Cocktails"** steht in derselben Liste. Ein
Ausdruck auf „Alkohol" trifft ausgerechnet den Eintrag, der das Gegenteil
belegt — dieselbe Mechanik wie ein Muster, das den erklärenden Kommentar
trifft.

**Eine AGB-Klausel ist keine Alterskontrolle.** § 3 nennt 18 Jahre. Im Code
gibt es dafür **kein Feld und keine Prüfung** — die Registrierung fragt weder
Alter noch Geburtsdatum ab. Apples Fragen „Age Assurance" und „Social Media
Disabled for Users Under 13" zielen auf die Kontrolle, nicht auf die Zusage;
beide sind **nein**. Wer hier „ja" ankreuzt, erklärt eine Sperre, die es nicht
gibt. Kommt eine Altersabfrage dazu, bricht `app-store.spec.js` ab und nennt
die zwei Antworten, die nachzuziehen sind.

**Die Vault-Tabelle ist jetzt der Klickpfad, nicht die Übersetzung.** Die
erste Spalte nennt Apples Beschriftung wörtlich (*User Content › Photos or
Videos*), nicht mehr „Fotos". Eine übersetzte Zeile ist im Formular nicht
auffindbar, und wer sucht, klickt irgendwann daneben — dann widerspricht die
Angabe in App Store Connect dem Privacy-Manifest, und Apple vergleicht beide.
Der Test prüft jeden Pfad gegen Apples echte Kategorien und Datenarten, nicht
gegen unsere zehn Zeilen: eine erfundene Beschriftung in einer *gültigen*
Kategorie fällt damit auch auf.

**Beide Fragebögen blockieren den internen TestFlight-Test nicht** — aber die
Einreichung, und die Antworten stehen fertig da. Es gibt keinen Grund, damit
auf den Mac zu warten.
