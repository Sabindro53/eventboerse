# Event-Assistent-Portraits

Die zehn WebP-Portraits `avatar-01` bis `avatar-10` werden vom QA-Event-Assistenten
und der Profil-Auswahl verwendet. Die zentrale Konfiguration `EB_AVATARE` und
`ebAvatarBildUrl()` liegen in `js/modules/ui/22-inserat-settings-uploads.js`.

## Herkunft und Nutzungsrechte

Die Bilder wurden am 08.10.2026 vom Inhaber als `ki_avatar_paket.zip`
bereitgestellt. Das Archiv enthielt zehn WebP-Dateien sowie eine Demo-HTML und
einen kurzen README-Hinweis. **Im Archiv ist keine Urheber-/Generator- oder
Lizenzangabe enthalten.** Die Assets sind daher als nutzerbereitgestellte
Dateien dokumentiert; kommerzielle Nutzungsrechte wurden nicht unabhängig
verifiziert. Vor einer Veröffentlichung muss der Inhaber die Nutzungsrechte
bestätigen. Das Archiv bleibt als Original hier liegen; seine Demo-HTML wird
nicht in die Seite eingebunden.

## Format und Freistellung

- Quelldateien: 10 WebPs, je ca. 13–22 KB; 218/219 × 390/394 px.
- Ausgelieferte Freisteller: `avatar-NN-freigestellt.webp`, 512 × 768 px,
  zusammen ca. 512 KB; RGBA-WebP mit transparentem Hintergrund.
- Kartenränder und der in Avatar 1 eingebrannte Auswahlhaken wurden
  abgeschnitten. Die Personenmaske wurde lokal mit `rembg 2.0.67`, Modell
  `u2net_human_seg`, alpha-matting-frei und mit leichter Maskenerosion erzeugt;
  Randfarben wurden aus dem nächsten deckenden Personenpixel übernommen.
  Kein Bild wurde an einen externen Dienst hochgeladen.
- Die Hut-Dekoration liegt als CSS über jedem Portrait; Grund- und Akzentfarbe
  sind pro Charakter in `EB_AVATARE` festgelegt. Der Launcher-Hut trägt ein
  gebogenes Band am Haaransatz; Auswahlkacheln haben keinen Pompon.
- Das Archiv bezeichnet die Motive als 3D-Illustrationen und sagt ausdrücklich,
  dass sie keine 3D-Modelle sind. Maus und Touch verschieben das ganze
  Portrait leicht per CSS-Parallaxe; es rotiert nicht, und Kopf/Augen bewegen
  sich nicht unabhängig. Es gibt kein Blinzeln und kein Lip-Sync.
- Es wurden keine Apple-Memoji-Dateien verwendet.

## Verwendung

Beim ersten Öffnen erscheint **„Wähle deinen Event-Assistenten“**. Die
gespeicherte Wahl verwendet `eb_qa_assistant_avatar` und wird nur über
`ebSpeichern()` bei funktionaler Einwilligung persistent; ohne Einwilligung
gilt sie bis zum Neuladen der Seite. Das Profilbild und die Assistentenwahl
sind getrennte Zustände.
