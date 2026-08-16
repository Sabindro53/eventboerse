---
tags: [layer/L4, domain/governance, share/internal]
layer: L4
domain: governance
share: internal
---

# HQ-Generalzugang

> Ein geteiltes Passwort für `/hq`. Bewusste Entscheidung des Inhabers vom 15.08.2026,
> hier festgehalten, damit sie eine Entscheidung bleibt und nicht später wie ein
> Versehen aussieht.

## Was gewollt war

Der Inhaber und ein zweiter Kollege sollen an das HQ, ohne dass jeder ein
WordPress-Konto mit zweitem Faktor führt.

Der eingebaute Weg dafür existiert (`eb_hq_access` + TOTP, siehe
`eb_hq_darf_sehen()`) und bleibt unverändert bestehen. Der Generalzugang tritt
**daneben**, nicht an seine Stelle.

## Was das kostet — ehrlich benannt

Ein geteiltes Passwort ist schwächer als der Weg über Konten:

- **Keine Person hinter einer Anmeldung.** Wer im HQ war, lässt sich nicht sagen.
- **Kein gezieltes Entziehen.** Scheidet einer aus, muss das Passwort für alle wechseln.
- **Kein zweiter Faktor.** Wer das Passwort hat, ist drin.
- **Die Existenz von `/hq` wird zugegeben.** Bisher bekam jeder Unberechtigte eine
  gewöhnliche 404, und die Adresse war damit nicht bestätigt. Sobald die Konstante
  gesetzt ist, erscheint eine Passwortseite. Was vorher Unauffindbarkeit leistete,
  leisten jetzt Rate-Limit und Passwortlänge.

Diese Punkte sind kein Einwand gegen die Entscheidung — sie sind ihr Preis, und
sie stehen hier, damit der Preis bekannt bleibt.

## Wie es gebaut ist

| | |
|---|---|
| Geheimnis | `EB_HQ_PASSWORT_HASH` in `wp-config.php` — **bcrypt-Hash, nie Klartext, nie im Repository** |
| Vergleich | `password_verify()`, nie ein Zeichenkettenvergleich |
| Rate-Limit | 5 Versuche / 15 min je IP, **vor** der Passwortprüfung |
| CSRF | `wp_verify_nonce( …, 'eb_hq_tor' )` |
| Sitzung | Cookie `eb_hq_tor`, 12 h, HttpOnly + Secure + SameSite=Strict |
| Serverseitig | gespeichert wird nur `sha256(token)` — wer die Datenbank liest, hat keine Sitzung |
| Abmelden | `/hq?abmelden=1` löscht Cookie **und** Sitzung |

### Vier Eigenschaften, die der Code durchhält

1. **Das Passwort liegt nie im Repository.** Es steht als Hash in `wp-config.php`.
   Das Repository ist öffentlich; ein Klartextpasswort darin wäre am Tag des Commits
   verbrannt — auch nach dem Löschen, denn die Historie bleibt.
2. **Ohne Konstante ändert sich nichts.** Ist sie nicht gesetzt, verhält sich `/hq`
   exakt wie vorher: 404 für alle ohne Recht. Das Tor entsteht erst, wenn der Inhaber
   es aufmacht — nicht durch das Deployment.
3. **Das Tor vergibt keine weiteren Zugänge.** `/hq/mitarbeiter` bleibt angemeldeten
   Administratoren vorbehalten (`eb_hq_verwaltung_darf`). Ein geteiltes Passwort, mit
   dem man weitere Zugänge erteilen kann, wäre nicht mehr einzufangen.
4. **Es ist kein WordPress-Login.** Die Sitzung hängt an einem eigenen Cookie und
   öffnet ausschließlich das HQ. Kein `wp-admin`, keine Inhalte, keine
   Nutzerverwaltung, keine WordPress-Fähigkeit.

### Eine Stelle, nicht drei

Seite, Datendateien (`/assets/*.json`, `/audit/*.json`) und alle HQ-REST-Routen fragen
dieselbe Funktion `eb_hq_zugang_offen()`. Vorher war die Bedingung an den Datendateien
von Hand nachgebaut — und ließ dadurch einen Administrator durch, der den zweiten Faktor
noch nicht vorgelegt hatte. Die Seite war zu, die Daten dahinter nicht. Mit dieser
Änderung ist das mitbehoben.

## Einrichten

Das Passwort wird **nicht** hier, nicht im Repository und nicht in einem Chat
festgehalten. Hash lokal erzeugen:

```bash
php -r 'echo password_hash(trim(fgets(STDIN)), PASSWORD_BCRYPT), "\n";'
```

Die Ausgabe (beginnt mit `$2y$`) in `wp-config.php` eintragen, **oberhalb** von
`/* That's all, stop editing! */`:

```php
define( 'EB_HQ_PASSWORT_HASH', '$2y$10$…' );
```

Wieder abschalten: Zeile entfernen. `/hq` ist im selben Moment wieder eine 404.

**Passwortlänge ist hier die eigentliche Verteidigung.** Weil es keinen zweiten Faktor
gibt, gehören mindestens vier zufällige Wörter oder 20 Zeichen dazu. Das Rate-Limit
bremst Rateversuche, es ersetzt kein langes Passwort.

## Geprüft

`tests/php/hq-tor-pruefstand.php` schneidet die tatsächlichen Funktionen aus
`functions.php` heraus und ruft sie auf — 42 Prüfungen am ausgelieferten Code, nicht an
einer Nachbildung. Läuft in der Playwright-Suite mit (`verbindungen.spec.js`).

Acht Mutationen wurden einzeln eingebaut, jede fiel auf: gelockerter Passwortvergleich ·
Rate-Limit hinter die Prüfung geschoben · `httponly` entfernt · Token im Klartext
gespeichert · Verwaltung akzeptiert das Tor · CSRF-Prüfung entfernt · Token-Formprüfung
entfernt · Abmelden löscht die Sitzung nicht.

Die Token-Formprüfung überlebte den ersten Anlauf: ein erfundener Schlüssel findet
ohnehin nichts. Sie wird erst tragend, wenn jemand das Hashing anfasst. Gemessen wird
deshalb, ob der Speicher überhaupt befragt wurde.

## Offen

- [ ] Wechsel des Passworts hat keinen Weg außer „Konstante ändern" — laufende Sitzungen
      bleiben dann bis zu 12 h offen. Ein `EB_HQ_PASSWORT_STAND`, das alle Sitzungen
      verwirft, wäre die saubere Ergänzung.
- [ ] Kein Protokoll erfolgreicher Anmeldungen. Bei einem geteilten Passwort wäre
      wenigstens „wann, von welcher IP" sinnvoll.
- [ ] Der bessere Weg bleibt der bessere Weg: Passkey-Anmeldung ans HQ-Tor
      (`webauthn.php` liegt schon im Projekt, ist aber nur an die SPA verdrahtet).

## Verknüpft

- [[40-Governance/Legal/Cookie-Liste]] — das Cookie `eb_hq_tor`
- [[30-Betrieb/Verbindungen]]
- [[40-Governance/Security/Permissions]]
