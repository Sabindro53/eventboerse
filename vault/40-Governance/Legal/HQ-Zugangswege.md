---
tags: [layer/L4, domain/governance, share/internal]
layer: L4
domain: governance
share: internal
---

# HQ-Zugangswege

> Wer an `/hq` kommt, auf welchem Weg, und warum es dafür **kein** zweites Geheimnis gibt.

## Zwei Wege, beide über die WordPress-Identität

| Weg | Bedingung | Zweiter Faktor |
|---|---|---|
| **Administrator** | `manage_options` | nur wenn selbst eingerichtet — dann Pflicht |
| **Mitarbeiter** | `eb_hq_access` | **immer Pflicht** |

Ein Administrator ist durch seine Anmeldung bereits ausgewiesen und kommt ohne weitere
Eingabe hinein. Hat er sich selbst einen Authenticator eingerichtet, muss er ihn auch
benutzen — sonst wäre die Einrichtung Zierrat.

Für Mitarbeiter ohne Adminrecht ist der zweite Faktor **nicht** verhandelbar. Ohne ihn
wäre `eb_hq_access` nur ein Passwortzugang mit Extraschritten.

Zugänge vergibt `POST /wp-json/eventboerse/v1/hq/mitarbeiter` — ausschließlich ein
angemeldeter Administrator (`eb_hq_verwaltung_darf`). Angelegt werden Konten dort
bewusst nicht: ein Zugang, der aus einer API entsteht, ist schwerer nachzuvollziehen als
einer, den ein Mensch in WordPress angelegt hat.

## Der Weg hinein

`/hq` stand nirgends verlinkt — man musste die Adresse kennen. **Das war das eigentliche
Problem**, nicht die Anmeldung. Es gibt jetzt zwei Einstiege, beide nur für Berechtigte
sichtbar:

- **Admin-Leiste** oben (`admin_bar_menu`) — im Backend *und* auf der Website
- **Admin-Menü**, gleich unter dem Dashboard (`admin_menu`)

Beide hängen an `eb_hq_grundrecht()`. Ein Menüpunkt, der auf eine 404 führt, behauptet
ein Recht, das nicht existiert — und verrät nebenbei, dass es `/hq` gibt.

## Eine Stelle, nicht drei

Seite, Datendateien (`/assets/*.json`, `/audit/*.json`) und alle HQ-REST-Routen fragen
dieselbe Funktion `eb_hq_zugang_offen()`.

Vorher war die Bedingung an den Datendateien von Hand nachgebaut — und ließ dadurch einen
Administrator durch, der den zweiten Faktor **noch nicht vorgelegt** hatte. Die Seite war
zu, der Selbstcheck und der Connector-Katalog dahinter nicht. Stünden die Bedingungen an
drei Stellen, träfe die nächste Änderung zwei davon; die dritte wäre dann das Loch.

## Der Generalzugang — 15.08. eingeführt, 20.08. wieder entfernt

Fünf Tage lang gab es hier ein geteiltes Passwort (`EB_HQ_PASSWORT_HASH` in
`wp-config.php`). Es wurde nie scharf geschaltet: die Konstante war zu keinem Zeitpunkt
gesetzt, `/hq` verhielt sich durchgehend wie vorher.

**Warum es kam:** Der Inhaber und ein Kollege wollten ins HQ, ohne dass jeder ein Konto
mit zweitem Faktor führt.

**Warum es ging:** Weil der Bedarf ein anderer war. Wer ins HQ soll, bekommt ein Konto
mit Adminrecht und ist durch die WordPress-Anmeldung ohnehin ausgewiesen — die Sitzung
läuft im Hintergrund bereits. Was fehlte, war nicht die Authentifizierung, sondern der
sichtbare Weg dorthin. Ein zweites Geheimnis daneben hätte nichts geleistet, das die
Anmeldung nicht schon leistet, aber gepflegt, gewechselt und widerrufen werden müssen.

Was der Verzicht zurückgewinnt:

- **Eine Person hinter jeder Anmeldung.** Bei einem geteilten Passwort ließ sich nicht
  sagen, wer im HQ war.
- **Gezieltes Entziehen.** Scheidet jemand aus, wird sein Konto entzogen — nicht das
  Passwort für alle gewechselt.
- **Der zweite Faktor bleibt möglich.** Ein geteiltes Passwort hatte keinen.
- **`/hq` bleibt unauffindbar.** Die Passwortseite hätte die Existenz der Adresse
  bestätigt; die 404 tut das nicht.

**Der Preis:** Wer ins HQ soll, braucht ein WordPress-Konto mit Adminrecht — und das ist
eine größere Berechtigung als `eb_hq_access`. Für einen Kollegen, der nur mitlesen soll,
ist `eb_hq_access` + Authenticator die kleinere und darum bessere Wahl. Das bleibt eine
Abwägung des Inhabers pro Person, keine technische Vorgabe.

Der Test *„Administratoren kommen ohne zweites Geheimnis hinein"* in
`tests/e2e/verbindungen.spec.js` hält fest, dass der Generalzugang nicht zurückkehrt —
mutationsgeprüft.

## Offen

- [ ] **Passkey am HQ-Tor.** `webauthn.php` liegt im Projekt, ist aber nur an die SPA
      verdrahtet. Damit entfiele auch der Authenticator-Code: Face-ID oder Fingerabdruck,
      phishing-resistent, und weiterhin eine Person hinter jeder Anmeldung.
- [ ] **Kein Protokoll**, wer wann im HQ war.

## Verknüpft

- [[40-Governance/Legal/Cookie-Liste]]
- [[30-Betrieb/Verbindungen]]
- [[40-Governance/Security/Permissions]]
