// Bild-Upload: Limit, Auto-Verkleinerung und Drag & Drop.
//
// Hintergrund: Ein Nutzer zog ein Foto auf die Upload-Fläche und bekam keine
// erkennbare Rückmeldung. Die Regeln, die das verhindern sollen:
//   1. Jeder Ausgang meldet sich — stiller Abbruch ist ein Bug.
//   2. Zu große JPG/PNG/WebP werden verkleinert statt abgelehnt.
//   3. Ein Drop landet genau einmal beim Handler (setupDragDrop läuft zweimal).
const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');

// Erzeugt im Browser ein echtes JPEG mit Rauschen — komprimiert schlecht,
// wird also bei großen Kantenlängen zuverlässig größer als das Limit.
const MAKE_JPEG = `(w, h, q, name) => new Promise((resolve) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const d = x.createImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i] = Math.random() * 255;
    d.data[i + 1] = Math.random() * 255;
    d.data[i + 2] = Math.random() * 255;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  c.toBlob((b) => resolve(new File([b], name || 'foto.jpg', { type: 'image/jpeg' })), 'image/jpeg', q);
})`;

test.describe('Bild-Upload', () => {
  test('Limit steht an einer Stelle und ist 15 MB', async ({ page }) => {
    const errors = await openApp(page);
    const konstanten = await page.evaluate(() => ({
      bytes: window.EB_MAX_IMAGE_BYTES,
      label: window.EB_MAX_IMAGE_LABEL,
    }));
    expect(konstanten.bytes).toBe(15 * 1024 * 1024);
    expect(konstanten.label).toBe('15 MB');
    expectNoPageErrors(errors, 'Upload-Konstanten');
  });

  test('Hinweistext nennt dasselbe Limit wie der Code', async ({ page }) => {
    await openApp(page);
    const hinweis = await page.evaluate(() =>
      document.querySelector('#uploadZone .upload-hint').textContent);
    expect(hinweis).toContain('15 MB');
  });

  test('Falscher Dateityp wird abgelehnt und begründet', async ({ page }) => {
    const errors = await openApp(page);
    const meldung = await page.evaluate(async () => {
      const gesehen = [];
      const orig = window.showToast;
      window.showToast = (m) => { gesehen.push(m); };
      const raus = await ebPrepareImageFile(new File([new Uint8Array(8)], 'vertrag.pdf', { type: 'application/pdf' }));
      window.showToast = orig;
      return { raus, gesehen };
    });
    expect(meldung.raus).toBeNull();
    expect(meldung.gesehen.join(' ')).toContain('vertrag.pdf');
    expectNoPageErrors(errors, 'Falscher Dateityp');
  });

  test('Zu großes JPEG wird verkleinert statt abgelehnt', async ({ page }) => {
    const errors = await openApp(page);
    const ergebnis = await page.evaluate(async (mkSrc) => {
      const mk = eval(mkSrc);
      const gross = await mk(6000, 4000, 1.0, 'strand.jpg');
      const gesehen = [];
      const orig = window.showToast;
      window.showToast = (m) => { gesehen.push(m); };
      const klein = await ebPrepareImageFile(gross);
      window.showToast = orig;
      return {
        vorher: gross.size,
        nachher: klein ? klein.size : null,
        typ: klein && klein.type,
        gesehen,
      };
    }, MAKE_JPEG);

    expect(ergebnis.vorher).toBeGreaterThan(15 * 1024 * 1024);
    expect(ergebnis.nachher).not.toBeNull();
    expect(ergebnis.nachher).toBeLessThanOrEqual(15 * 1024 * 1024);
    expect(ergebnis.typ).toBe('image/jpeg');
    expect(ergebnis.gesehen.join(' ')).toContain('verkleinert');
    expectNoPageErrors(errors, 'Auto-Verkleinerung');
  });

  test('Zu großes GIF wird ehrlich abgelehnt (Animation bliebe nicht erhalten)', async ({ page }) => {
    await openApp(page);
    const ergebnis = await page.evaluate(async () => {
      const gesehen = [];
      const orig = window.showToast;
      window.showToast = (m) => { gesehen.push(m); };
      const raus = await ebPrepareImageFile(
        new File([new Uint8Array(16 * 1024 * 1024)], 'party.gif', { type: 'image/gif' }));
      window.showToast = orig;
      return { raus, gesehen };
    });
    expect(ergebnis.raus).toBeNull();
    expect(ergebnis.gesehen.join(' ')).toContain('party.gif');
    expect(ergebnis.gesehen.join(' ')).toContain('15 MB');
  });

  test('Drop auf die Upload-Fläche erreicht den Handler genau einmal', async ({ page }) => {
    const errors = await openApp(page);
    const ergebnis = await page.evaluate(async (mkSrc) => {
      const mk = eval(mkSrc);
      const zone = document.getElementById('uploadZone');
      const dt = new DataTransfer();
      dt.items.add(await mk(300, 300, 0.8, 'klein.jpg'));
      let aufrufe = 0;
      const orig = window.handleUpload;
      window.handleUpload = function () { aufrufe++; };
      const ev = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
      zone.dispatchEvent(ev);
      await new Promise((r) => setTimeout(r, 300));
      window.handleUpload = orig;
      return { aufrufe, verhindert: ev.defaultPrevented };
    }, MAKE_JPEG);

    // Genau einmal: setupDragDrop() wird aus zwei Modulen aufgerufen —
    // doppelte Bindung würde jedes Bild zweimal einfügen.
    expect(ergebnis.aufrufe).toBe(1);
    expect(ergebnis.verhindert).toBe(true);
    expectNoPageErrors(errors, 'Drop auf Upload-Fläche');
  });

  test('Hover bleibt stabil, wenn die Maus über ein Kind-Element zieht', async ({ page }) => {
    await openApp(page);
    const ergebnis = await page.evaluate(() => {
      const zone = document.getElementById('uploadZone');
      const kind = zone.querySelector('h3');
      const drag = (typ) => {
        const d = new DataTransfer();
        d.items.add(new File([new Uint8Array(1)], 'a.png', { type: 'image/png' }));
        return new DragEvent(typ, { bubbles: true, cancelable: true, dataTransfer: d });
      };
      zone.dispatchEvent(drag('dragenter'));
      kind.dispatchEvent(drag('dragenter'));
      kind.dispatchEvent(drag('dragleave'));
      const nochAktiv = zone.classList.contains('dragover');
      zone.dispatchEvent(drag('dragleave'));
      return { nochAktiv, danachWeg: !zone.classList.contains('dragover') };
    });
    expect(ergebnis.nochAktiv).toBe(true);
    expect(ergebnis.danachWeg).toBe(true);
  });

  test('Drop neben die Fläche navigiert nicht weg', async ({ page }) => {
    await openApp(page);
    const verhindert = await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(1)], 'x.png', { type: 'image/png' }));
      const ev = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
      document.body.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(verhindert).toBe(true);
  });
});
