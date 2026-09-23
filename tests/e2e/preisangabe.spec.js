// § 3 PAngV: gegenueber Verbrauchern ist der GESAMTPREIS anzugeben.
//
// Befund vom 22.09.2026: die AGB fuer gewerbliche Eventplaner versprachen in
// § 5 „Preise werden vom Dienstleister angegeben (Brutto, USt ausgewiesen)" —
// und das Inseratsformular bot „Preisspanne (€)", sonst nichts. Kein
// Brutto/Netto, kein Steuersatz, kein Reverse-Charge-Hinweis. Gemessen:
// „inkl. USt" und „zzgl. USt" kamen im GANZEN Frontend nicht vor.
//
// Ein Rechtstext, der eine Eingabe beschreibt, die es nicht gibt — dieselbe
// Klasse wie das Impressum, das ein Zahlungsmodell nannte, das der Code
// nicht faehrt.
//
// „INKL. MWST." IST NICHT IMMER WAHR, und das ist der Kern dieser Suite. Ein
// Dienstleister, der als Kleinunternehmer nach § 19 UStG abrechnet, weist
// keine Umsatzsteuer aus; in seinem Preis steckt keine. Ihm „inkl. MwSt."
// unterzuschieben waere eine Falschaussage auf SEINEM Angebot. „Gesamtpreis"
// stimmt in beiden Faellen, der Zusatz kommt nur dazu, wenn er wirklich
// ausweist.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, warteAufAppBereit } = require('./helpers');
const { textAusHtml } = require('./lib/html-text');

const WURZEL = path.join(__dirname, '..', '..');
const SHELL = path.join(WURZEL, 'app-shell.html');

test.describe('Preisangaben nennen den Gesamtpreis', () => {
  test('der Helfer behauptet nur, was der Anbieter gesagt hat', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);

    const aus = await page.evaluate(() => ({
      weistAus: ebPreisHinweis({ smallBusiness: false }),
      klein: ebPreisHinweis({ smallBusiness: true }),
      unbekannt: ebPreisHinweis({}),
      garnichts: ebPreisHinweis(null),
    }));

    // Nur wer AUSDRUECKLICH ausweist, bekommt den Zusatz.
    expect(aus.weistAus).toBe('Gesamtpreis inkl. USt.');

    // Alle drei anderen Faelle bleiben bei der Aussage, die immer stimmt.
    // Im Zweifel nichts behaupten, was der Anbieter nicht gesagt hat.
    expect(aus.klein).toBe('Gesamtpreis');
    expect(aus.unbekannt).toBe('Gesamtpreis');
    expect(aus.garnichts).toBe('Gesamtpreis');

    // Gegenprobe: die zwei Fassungen sind wirklich verschieden. Ohne sie
    // waere „gib immer denselben Text" eine Erklaerung, die alles besteht.
    expect(aus.weistAus).not.toBe(aus.klein);
  });

  test('die Buchungskarte traegt den Hinweis ohne JavaScript', () => {
    // Markup kann nicht rechnen, also steht der Normalfall im HTML — wie
    // beim Provisionssatz. Eine Seite, die den Hinweis erst per Skript
    // bekommt, sagt ihn fuer jeden nicht, bei dem das Skript ausfaellt.
    const roh = fs.readFileSync(SHELL, 'utf8');
    const ab = roh.indexOf('id="bookingCard"');
    expect(ab, 'die Buchungskarte gibt es nicht mehr').toBeGreaterThan(-1);
    const karte = textAusHtml(roh.slice(ab, ab + 1200));
    expect(karte, 'neben dem Preis steht nicht, dass er der Gesamtpreis ist')
      .toContain('Gesamtpreis');
  });

  test('der Hinweis wird beim Rendern wirklich gesetzt', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);

    // Gemessen wird die WIRKUNG am gerenderten Element, nicht die Definition
    // der Funktion. Ein Helfer, den niemand ruft, ist der teuerste
    // wiederkehrende Fehler dieses Projekts.
    const text = await page.evaluate(() => {
      const el = document.getElementById('detailPreisHinweis');
      if (!el) return null;
      ebPreisHinweisSetzen({ smallBusiness: false });
      return el.textContent;
    });

    expect(text, '#detailPreisHinweis gibt es nicht').not.toBeNull();
    expect(text).toBe('Gesamtpreis inkl. USt.');
  });

  test('die Detailansicht ruft den Setzer', async ({ page }) => {
    // Der Weg hinein, nicht nur der Baustein. Ohne den Aufruf in
    // renderDetail() bliebe die Vorgabe aus dem Markup stehen, auch bei
    // einem Anbieter, der Umsatzsteuer ausweist — und der Hinweis waere
    // dauerhaft die unschaerfere Fassung.
    await openApp(page);
    await warteAufAppBereit(page);
    const quelle = fs.readFileSync(
      path.join(WURZEL, 'js', 'modules', 'search', '12-detail-provider.js'), 'utf8'
    );
    // Nach Abzug der Kommentare — der erklaerende Text daneben nennt den
    // Funktionsnamen, und genau daran sind hier schon neun Pruefungen
    // gescheitert.
    const { ohneJsKommentare } = require('./lib/js-code');
    expect(ohneJsKommentare(quelle), 'renderDetail() setzt den Preishinweis nicht')
      .toContain('ebPreisHinweisSetzen(');
  });

  test('das Formular verlangt den Gesamtpreis, wie die AGB es zusagen', () => {
    // Die Drift, um die es geht. Der AGB-Satz beschrieb eine Eingabe, die
    // es nicht gab; jetzt gibt es sie. Gemessen werden BEIDE Seiten — wer
    // eine davon aendert, muss die andere mitnehmen.
    const roh = fs.readFileSync(SHELL, 'utf8');

    const ab = roh.indexOf('id="clPriceHint"');
    expect(ab, 'der Preis-Hinweis im Formular gibt es nicht mehr').toBeGreaterThan(-1);
    const hinweis = textAusHtml(roh.slice(ab, roh.indexOf('</small>', ab)));
    expect(hinweis, 'das Formular sagt dem Anbieter nicht, dass er den '
      + 'Gesamtpreis eintragen soll').toMatch(/Gesamtpreis/);
    expect(hinweis, 'die Rechtsgrundlage fehlt').toMatch(/PAngV/);

    // Und die AGB-Zusage steht weiter da: verschwindet sie, hat diese
    // Prueferhaelfte kein Subjekt mehr und muesste still durchwinken.
    const agb = roh.indexOf('id="page-agb-planer-b2b"');
    if (agb > -1) {
      const text = textAusHtml(roh.slice(agb, agb + 12000));
      expect(text, 'die AGB sagen nichts mehr ueber die Preisangabe')
        .toMatch(/Brutto/);
    }
  });
});
