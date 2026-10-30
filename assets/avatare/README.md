# Event-Assistent-Figuren

Zehn Figuren für den Event-Assistenten unten rechts (`#qaLauncher`). Wer den
Assistenten zum ersten Mal öffnet, wählt eine aus; Vorgabe ist Figur 1.
Logik: `js/modules/ui/33-assistent-figur.js`, Test: `tests/e2e/assistent-figur.spec.js`.

## Herkunft und Nutzungsrechte

Vom Inhaber am 08.10.2026 als Bildpaket bereitgestellt. Das Paket nennt weder
Urheber noch Lizenz. **Nutzungsrechte vom Inhaber am 16.10.2026 bestätigt** (kommerzielle Nutzung).
Laut Inhaber (30.10.2026) hat er die Bilder selbst mit einem KI-Bildgenerator erzeugt.

Die Motive sind 3D-Illustrationen, keine 3D-Modelle. Für die **Blickfolge**
(der Kopf dreht sich zum Zeiger) wölbt `scripts/avatar-blick.py` in Blender
jede Figur aus ihrer Silhouette zu einer Büste und rendert sie aus 7 × 3
Richtungen (±14° seitlich, ±7° auf und ab). Ergebnis: `avatar-NN-blick.webp`,
1120 × 720 px, 90–140 KB, geladen erst bei der ersten Zeigerbewegung. Die
Augen drehen mit dem Kopf; eigene Augenbewegung, Blinzeln und Mund gibt es
nicht — dafür bräuchte es die Figuren als echte 3D-Modelle.

Neu erzeugen (nach jeder geänderten Figur):

    /Applications/Blender.app/Contents/MacOS/Blender --background \
        --python scripts/avatar-blick.py -- assets/avatare

## Geplant: echte 3D-Figuren

Der Inhaber will die Figuren in Blender zu 3D-Elementen umbauen. **Erster
Schritt erledigt (30.10.2026):** die Blickfolge oben arbeitet mit einer
gewölbten Büste je Figur, nicht mit einem Modell. Echte 3D-Köpfe — mit eigener
Augenbewegung, Blinzeln und größeren Drehwinkeln — sind weiter offen.

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
