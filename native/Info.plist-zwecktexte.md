# Zwecktexte für `Info.plist`

Diese Texte in Xcode übernehmen, **nicht neu erfinden**. Apple lehnt leere und
nichtssagende Begründungen ab („Diese App benötigt Zugriff auf die Kamera") —
das ist einer der häufigsten Ablehnungsgründe und einer der am leichtesten zu
vermeidenden.

Drei Regeln, an denen sich die Formulierungen orientieren:

1. **Was passiert konkret**, nicht welche Berechtigung technisch nötig ist.
   Der Nutzer liest den Satz in dem Moment, in dem er entscheidet.
2. **Warum es ihm nützt.** Eine Begründung, die nur den Entwickler nennt
   („damit die App funktioniert"), ist keine.
3. **Kein Zwang behaupten.** Alle vier Berechtigungen sind optional; die App
   bleibt ohne sie benutzbar. Wer das Gegenteil suggeriert, verliert Zustimmung
   und riskiert die Ablehnung.

Deutsch ist der Hauptmarkt; die englischen Fassungen gehören in
`en.lproj/InfoPlist.strings`.

---

## Standort — `NSLocationWhenInUseUsageDescription`

Für den Radar (Umkreissuche). `WhenInUse`, **nicht** `Always`: die App liest
den Standort nur, während sie offen ist. `Always` zu erbitten, ohne es zu
brauchen, ist ein sicherer Ablehnungsgrund.

> **DE:** Eventbörse zeigt dir Dienstleister und Events in deiner Nähe. Ohne
> Standort kannst du deinen Ort weiterhin von Hand eingeben.

> **EN:** Eventbörse shows you service providers and events near you. Without
> location access you can still enter your area manually.

## Kamera — `NSCameraUsageDescription`

Zum Aufnehmen von Inseratsbildern.

> **DE:** Damit fotografierst du direkt Bilder für dein Inserat, ohne den Umweg
> über die Galerie.

> **EN:** Lets you take photos for your listing directly, without going through
> your photo library.

## Fotomediathek — `NSPhotoLibraryUsageDescription`

Zum Auswählen vorhandener Bilder.

> **DE:** Damit wählst du vorhandene Fotos für dein Inserat oder dein Profil
> aus. Es werden nur die Bilder hochgeladen, die du auswählst.

> **EN:** Lets you pick existing photos for your listing or profile. Only the
> images you select are uploaded.

Der zweite Satz ist kein Beiwerk: die verbreitetste Sorge bei dieser
Berechtigung ist, dass die App die ganze Mediathek liest.

## Face ID / Touch ID — `NSFaceIDUsageDescription`

Für die Anmeldung per Passkey (`webauthn.php`).

> **DE:** Damit meldest du dich mit Face ID statt mit einem Passwort an. Dein
> Passkey bleibt auf dem Gerät.

> **EN:** Lets you sign in with Face ID instead of a password. Your passkey
> stays on your device.

---

## Mikrofon — nur wenn das HQ in der App erreichbar bleibt

`NSMicrophoneUsageDescription` wird **nur** gebraucht, wenn der EB Circle im
HQ aus der App heraus benutzt werden soll. Die Zuordnungsdatei schließt `/hq/*`
von den Universal Links aus, aber erreichbar bleibt es im WebView trotzdem.

**Empfehlung: nicht aufnehmen.** Eine Mikrofon-Berechtigung, die 99 % der
Nutzer nie brauchen, kostet Vertrauen im Erstkontakt und lädt zu Rückfragen im
Review ein. Das HQ ist ein Werkzeug für den Betrieb, kein Nutzer-Feature.

Falls doch:

> **DE:** Nur für die Sprachsteuerung im internen Bereich. Aufnahmen werden
> nicht gespeichert.

> **EN:** Only for voice control in the internal area. Recordings are not
> stored.

---

## Nicht eintragen

- **`NSLocationAlwaysAndWhenInUseUsageDescription`** — die App braucht den
  Standort nie im Hintergrund.
- **`NSContactsUsageDescription`** — es wird kein Adressbuch gelesen.
- **`NSPhotoLibraryAddUsageDescription`** — die App schreibt nichts in die
  Mediathek.
- **`NSUserTrackingUsageDescription`** — es gibt kein Tracking über fremde Apps
  hinweg. `NSPrivacyTracking` steht im Privacy-Manifest auf `false`; hier
  trotzdem einen Text einzutragen wäre ein Widerspruch, den Apple findet.

Eine erbetene und nie genutzte Berechtigung ist kein neutraler Zustand: sie
steht in der App-Store-Beschreibung, sie erscheint im Dialog, und sie muss zum
Privacy-Manifest passen.
