# Event-Assistent-Figuren

Zehn Figuren für den Event-Assistenten unten rechts (`#qaLauncher`). Wer den
Assistenten zum ersten Mal öffnet, wählt eine aus; Vorgabe ist Figur 1.
Logik: `js/modules/ui/33-assistent-figur.js`, Test: `tests/e2e/assistent-figur.spec.js`.

## Herkunft und Nutzungsrechte

Vom Inhaber am 08.10.2026 als Bildpaket bereitgestellt. Das Paket nennt weder
Urheber noch Lizenz. **Nutzungsrechte vom Inhaber am 16.10.2026 bestätigt** (kommerzielle Nutzung).
Laut Inhaber (30.10.2026) hat er die Bilder selbst mit einem KI-Bildgenerator erzeugt.

Die Motive sind 3D-Illustrationen, keine 3D-Modelle: Es gibt keine Drehung,
kein Blinzeln und keine Mundbewegung.

## Geplant: echte 3D-Figuren

Der Inhaber will die Figuren in Blender zu 3D-Elementen umbauen, damit sich die
Köpfe später nach dem Mauszeiger ausrichten. Bis dahin bleiben die WebP-Bilder
die ausgelieferte Fassung; die 3D-Umsetzung ist noch nicht begonnen.

## Format

- `avatar-01.webp` … `avatar-10.webp`: 160 × 240 px, verlustbehaftetes WebP
  mit Transparenz, je 5–8 KB.
- Gerechnet aus den freigestellten Fassungen (512 × 768 px) mit PHP-GD
  (`imagecopyresampled`, Qualität 82). Der Knopf ist 64 × 80 px groß, die
  doppelte Pixeldichte reicht; die großen Fassungen hätten je 45–53 KB
  gekostet.
- Bekannt: An den Haarrändern steht stellenweise ein dunkler Saum aus dem
  ursprünglichen Hintergrund. In Knopfgröße fällt er nicht auf; für eine
  große Darstellung bräuchte es eine neue Freistellung.

Nicht im Repository: das Originalarchiv, das Übersichtsbild und Notizen aus
der Arbeitsumgebung. Hier liegen nur die ausgelieferten Dateien.
