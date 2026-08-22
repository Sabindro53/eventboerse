#!/usr/bin/env python3
"""Schneidet die Material-Icons-Schrift auf die wirklich benutzten Symbole zu.

    node scripts/icons.mjs        # erzeugt die Auswahlliste
    python3 scripts/icons-subset.py

Braucht `pip install fonttools brotli`. Bewusst NICHT im PR-Check: der Zuschnitt
ist ein seltener, bewusster Schritt, und eine Schrift bei jedem Lauf neu zu
erzeugen hiesse, sie bei jedem Lauf neu vertrauen zu muessen. Das Tor gegen
Drift ist `node scripts/icons.mjs --check` — es faellt, sobald der Code ein
Icon benutzt, das nicht mehr in der Schrift steht.

ZWEI DINGE, DIE DABEI SCHIEFGEHEN KOENNEN, BEIDE STILL:

1. Die Ligaturen liegen bei dieser Schrift unter `rlig`, nicht unter `liga`.
   Wer nur `liga` behaelt, bekommt eine Schrift, in der jeder Knopf den
   Iconnamen als Wort zeigt ("chevron_left" statt des Pfeils).

2. Ohne `layout_closure=False` zieht der Subsetter ueber die Ligaturregeln
   fast alle 2200 Symbole wieder herein: die Buchstaben a-z bleiben ja
   erhalten, also bleibt jede Regel "anwendbar". Ergebnis waren 157 KB statt
   32 KB — technisch korrekt und nutzlos.

Beides prueft `tests/e2e/icons.spec.js` am gerenderten Ergebnis nach.
"""
import os
import pathlib
import sys

try:
    from fontTools.ttLib import TTFont
    from fontTools import subset
except ImportError:
    sys.exit('fonttools fehlt: pip install fonttools brotli')

WURZEL = pathlib.Path(__file__).resolve().parent.parent
QUELLE = WURZEL / 'scripts' / 'lib' / 'material-icons-quelle.woff2'
AUSWAHL = WURZEL / 'scripts' / 'lib' / 'material-icons-benutzt.txt'
ZIEL = WURZEL / 'assets' / 'fonts' / 'material-icons-round.woff2'
NAMEN = WURZEL / 'scripts' / 'lib' / 'material-icons-namen.txt'


def ligaturen(font):
    """Ligaturname -> (Zielglyph, beteiligte Buchstabenglyphen)."""
    raus = {}
    for lookup in font['GSUB'].table.LookupList.Lookup:
        if lookup.LookupType != 4:
            continue
        for st in lookup.SubTable:
            for erster, ligs in st.ligatures.items():
                for lig in ligs:
                    raus[erster + ''.join(lig.Component)] = (
                        lig.LigGlyph, [erster, *lig.Component])
    return raus


def main():
    if not QUELLE.exists():
        sys.exit(f'Quellschrift fehlt: {QUELLE}')
    if not AUSWAHL.exists():
        sys.exit('Auswahlliste fehlt — zuerst `node scripts/icons.mjs`.')

    quelle = TTFont(QUELLE)
    alle = ligaturen(quelle)
    # Die vollstaendige Namensliste mitschreiben: sie ist die Grundlage, auf der
    # icons.mjs erkennt, welches Wort im Code ueberhaupt ein Iconname ist.
    NAMEN.write_text('\n'.join(sorted(alle)) + '\n')

    gewuenscht = [z.strip() for z in AUSWAHL.read_text().splitlines() if z.strip()]
    unbekannt = [n for n in gewuenscht if n not in alle]
    if unbekannt:
        sys.exit('Unbekannte Iconnamen in der Auswahl: ' + ', '.join(unbekannt[:10]))

    glyphen = set()
    for name in gewuenscht:
        ziel, teile = alle[name]
        glyphen.add(ziel)
        glyphen.update(teile)

    opts = subset.Options()
    # rlig ist die Ligaturklasse DIESER Schrift. liga/dlig/ccmp stehen daneben,
    # damit ein spaeterer Schriftstand nicht still die Ligaturen verliert.
    opts.layout_features = ['rlig', 'liga', 'dlig', 'ccmp']
    # Siehe Kopfkommentar (2): sonst kommt fast die ganze Schrift zurueck.
    opts.layout_closure = False
    opts.flavor = 'woff2'

    font = subset.load_font(str(QUELLE), opts)
    s = subset.Subsetter(options=opts)
    s.populate(glyphs=sorted(glyphen))
    s.subset(font)
    subset.save_font(font, str(ZIEL), opts)

    geblieben = set(ligaturen(TTFont(ZIEL)))
    fehlt = sorted(set(gewuenscht) - geblieben)
    if fehlt:
        sys.exit('Ligaturen im Ergebnis verloren: ' + ', '.join(fehlt[:10]))

    vorher = os.path.getsize(QUELLE) / 1024
    nachher = os.path.getsize(ZIEL) / 1024
    print('── Icon-Schrift zugeschnitten ───────────────────')
    print(f'Symbole   : {len(alle)} → {len(geblieben)}')
    print(f'Groesse   : {vorher:.1f} KB → {nachher:.1f} KB '
          f'({100 - nachher * 100 / vorher:.0f} % kleiner)')
    print('─────────────────────────────────────────────────')


if __name__ == '__main__':
    main()
