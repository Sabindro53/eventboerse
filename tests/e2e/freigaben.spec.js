// Freigaben-Panel im HQ.
//
// Der Auftrag aus dem Vault heisst nicht "der Autopilot liefert" — er heisst
// "der Autopilot liefert UND ich sage ja oder nein". Der zweite Teil scheiterte
// bisher, weil jeder Vorschlag nach github.com fuehrte und der Kontextwechsel
// die Reibung war. Diese Suite pinnt vier Eigenschaften, ohne die das Panel
// wieder zur Attrappe wird:
//
//   1. Ohne Token bleiben die Aktionsknoepfe abgeblendet MIT sichtbarer
//      Begruendung — ein toter Knopf ohne Grund liest sich als kaputt.
//   2. Die CI-Ampel liest die richtigen Workflows (`pr-check`, `security`,
//      `openrouter-autopilot`, `openrouter-auto-merge`) und den head_sha des
//      PRs. Ein PR mit rotem Lauf darf nicht als gruen dargestellt werden.
//   3. Draft- und rote/gelbe PRs koennen NICHT zugestimmt werden, auch mit
//      gueltigem Token — sonst wuerde das Panel unfertige Arbeit mergen.
//   4. Der Workflow-Streifen sortiert rot nach oben. Ein Ausfall unten in
//      einer alphabetischen Liste sieht wie kein Ausfall aus.
const { test, expect } = require('@playwright/test');

test.describe('Freigaben-Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hq.html', { waitUntil: 'domcontentloaded' });
    // Externe GitHub-Aufrufe abfangen, damit der Test tokenfrei laeuft.
    await page.evaluate(() => sessionStorage.removeItem('hq_pat'));
    await page.waitForFunction(() => typeof renderFreigaben === 'function');
  });

  test('Container und Funktionen sind verdrahtet', async ({ page }) => {
    const setup = await page.evaluate(() => ({
      freigaben: !!document.getElementById('freigaben'),
      wfstrip: !!document.getElementById('wfstrip'),
      fns: ['renderFreigaben', 'renderWfStrip', 'zustimmen', 'ablehnen', 'wfRetry', 'ciAmpel']
        .every(f => typeof window[f] === 'function'),
    }));
    expect(setup.freigaben).toBe(true);
    expect(setup.wfstrip).toBe(true);
    expect(setup.fns).toBe(true);
  });

  test('Ohne PAT: Zustimmen und Ablehnen abgeblendet mit Begruendung', async ({ page }) => {
    await page.evaluate(() => {
      state.freigaben = [{
        number: 101, title: 'Testvorschlag', body: 'Body', draft: false,
        updated_at: new Date().toISOString(),
        user: { login: 'bot' }, head: { sha: 'aaa', ref: 'x' },
        html_url: 'https://example.invalid/pr/101',
      }];
      state.runs = [{ path: '.github/workflows/pr-check.yml', head_sha: 'aaa',
        status: 'completed', conclusion: 'success',
        html_url: 'x', created_at: new Date().toISOString(), name: 'pr-check' }];
      renderFreigaben();
    });
    const ja = page.locator('[data-fg-ja="101"]');
    const nein = page.locator('[data-fg-nein="101"]');
    await expect(ja).toBeDisabled();
    await expect(nein).toBeDisabled();
    await expect(ja).toHaveAttribute('title', /Token verbinden/);
  });

  test('CI-Ampel: gruen bei Erfolg, rot bei Failure, gelb waehrend Lauf', async ({ page }) => {
    const farben = await page.evaluate(() => {
      const sha = 'sha1';
      const basis = { path: '.github/workflows/pr-check.yml', head_sha: sha };
      const gruen = ciAmpel({ head: { sha } });
      state.runs = [{ ...basis, status: 'completed', conclusion: 'success' }];
      const g = ciAmpel({ head: { sha } });
      state.runs = [{ ...basis, status: 'completed', conclusion: 'failure' }];
      const r = ciAmpel({ head: { sha } });
      state.runs = [{ ...basis, status: 'in_progress', conclusion: null }];
      const gelb = ciAmpel({ head: { sha } });
      return { keiner: gruen.klasse, gruen: g.klasse, rot: r.klasse, gelb: gelb.klasse };
    });
    expect(farben.keiner).toBe('fg-grau');
    expect(farben.gruen).toBe('fg-gruen');
    expect(farben.rot).toBe('fg-rot');
    expect(farben.gelb).toBe('fg-gelb');
  });

  test('Mit PAT: Draft-PR bleibt gesperrt, gruener PR wird freigegeben', async ({ page }) => {
    await page.evaluate(() => {
      sessionStorage.setItem('hq_pat', 'ghp_dummy');
      state.freigaben = [
        { number: 200, title: 'Draft', body: '', draft: true,
          updated_at: new Date().toISOString(),
          user: { login: 'x' }, head: { sha: 'd1', ref: 'a' },
          html_url: 'x' },
        { number: 201, title: 'Gruen', body: '', draft: false,
          updated_at: new Date().toISOString(),
          user: { login: 'x' }, head: { sha: 'g1', ref: 'b' },
          html_url: 'x' },
      ];
      state.runs = [
        { path: '.github/workflows/pr-check.yml', head_sha: 'g1',
          status: 'completed', conclusion: 'success',
          html_url: 'x', created_at: new Date().toISOString(), name: 'pr-check' },
      ];
      renderFreigaben();
    });
    await expect(page.locator('[data-fg-ja="200"]')).toBeDisabled();
    await expect(page.locator('[data-fg-ja="200"]')).toHaveAttribute('title', /Draft/);
    await expect(page.locator('[data-fg-ja="201"]')).toBeEnabled();
    await expect(page.locator('[data-fg-nein="201"]')).toBeEnabled();
  });

  test('Mit PAT: roter PR ist nicht zustimmbar', async ({ page }) => {
    await page.evaluate(() => {
      sessionStorage.setItem('hq_pat', 'ghp_dummy');
      state.freigaben = [{ number: 300, title: 'Rot', body: '', draft: false,
        updated_at: new Date().toISOString(),
        user: { login: 'x' }, head: { sha: 'r1', ref: 'a' }, html_url: 'x' }];
      state.runs = [{ path: '.github/workflows/pr-check.yml', head_sha: 'r1',
        status: 'completed', conclusion: 'failure',
        html_url: 'x', created_at: new Date().toISOString(), name: 'pr-check' }];
      renderFreigaben();
    });
    const ja = page.locator('[data-fg-ja="300"]');
    await expect(ja).toBeDisabled();
    await expect(ja).toHaveAttribute('title', /rot/i);
  });

  test('die PR-LISTE sortiert rot nach oben', async ({ page }) => {
    // Der Test darunter prueft den Workflow-Streifen. Die Sortierung der
    // PR-Liste selbst war ungetestet: eine Mutation, die den Vergleicher
    // durch `return 0` ersetzt, blieb gruen. Was kaputt ist, soll aber
    // zuerst auffallen — sonst scrollt man daran vorbei.
    await page.evaluate(() => {
      const t = (min) => new Date(Date.now() - min * 60000).toISOString();
      state.freigaben = [
        { number: 1, title: 'gruener PR', html_url: 'x', updated_at: t(30),
          user: { login: 'a' }, head: { ref: 'b', sha: 'sha-gruen' }, draft: false },
        { number: 2, title: 'roter PR', html_url: 'x', updated_at: t(60),
          user: { login: 'a' }, head: { ref: 'b', sha: 'sha-rot' }, draft: false },
      ];
      state.runs = [
        // `path` ist Pflicht, nicht `name`: ciAmpel filtert die Laeufe ueber
        // den Dateipfad. Mit nur `name` blieben beide PRs grau und wurden
        // nach Datum sortiert — der erste Entwurf dieses Tests fiel genau
        // daran, und zwar zu Recht.
        { head_sha: 'sha-gruen', path: '.github/workflows/pr-check.yml',
          status: 'completed', conclusion: 'success' },
        { head_sha: 'sha-rot', path: '.github/workflows/pr-check.yml',
          status: 'completed', conclusion: 'failure' },
      ];
      renderFreigaben();
    });
    const eintraege = page.locator('#freigaben .fg-eintrag .fg-kopf');
    await expect(eintraege.first(), 'der rote PR steht nicht oben')
      .toContainText('roter PR');
  });

  test('ohne Token bleibt Zustimmen gesperrt, auch bei gruener Pruefung', async ({ page }) => {
    // Vorher deckte kein Test die PAT-Bedingung an `kannJa` ab: die
    // Mutation, die `hasPat &&` entfernt, blieb gruen. Ein Knopf, der ohne
    // Token scharf aussieht, fuehrt zu einem Klick, der nur scheitert.
    await page.evaluate(() => {
      try { sessionStorage.removeItem('hq_pat'); } catch (e) {}
      state.freigaben = [{ number: 7, title: 'gruen und ohne Token', html_url: 'x',
        updated_at: new Date().toISOString(), user: { login: 'a' },
        head: { ref: 'b', sha: 'sha-ok' }, draft: false }];
      state.runs = [{ head_sha: 'sha-ok', path: '.github/workflows/pr-check.yml',
        status: 'completed', conclusion: 'success' }];
      renderFreigaben();
    });
    const ja = page.locator('#freigaben .fg-ja').first();
    await expect(ja, 'ohne Token ist Zustimmen scharf').toBeDisabled();
    await expect(ja).toHaveAttribute('title', /Token verbinden/);
  });

  test('das HQ laedt keine Icon-Schrift — deshalb stehen dort Emojis', () => {
    // Kein Versehen, sondern die Grenze der Seite: hq.html bindet
    // material-icons nicht ein. Ein <span class="material-icons-round">
    // bliebe dort leer. Faellt dieser Test, ist die Schrift dazugekommen
    // und die Emojis koennen weichen.
    const fs = require('node:fs');
    const path = require('node:path');
    const hq = fs.readFileSync(
      path.join(__dirname, '..', '..', 'hq.html'), 'utf8');
    expect(hq, 'die Icon-Schrift ist jetzt da — Emojis koennen ersetzt werden')
      .not.toMatch(/material-icons/);
  });

  test('Workflow-Streifen sortiert rot nach oben', async ({ page }) => {
    await page.evaluate(() => {
      const t = (min) => new Date(Date.now() - min * 60000).toISOString();
      state.runs = [
        { path: '.github/workflows/aaa.yml', name: 'aaa',
          status: 'completed', conclusion: 'success',
          html_url: 'x', created_at: t(10) },
        { path: '.github/workflows/zzz.yml', name: 'zzz',
          status: 'completed', conclusion: 'failure',
          html_url: 'x', created_at: t(20) },
        { path: '.github/workflows/mmm.yml', name: 'mmm',
          status: 'in_progress', conclusion: null,
          html_url: 'x', created_at: t(5) },
      ];
      renderWfStrip();
    });
    const kacheln = page.locator('#wfstrip .wf-kachel .wf-name');
    await expect(kacheln.first()).toHaveText(/zzz/);
    // Retry-Knopf nur bei dispatchable UND mit PAT (hier ohne PAT: keine Knoepfe).
    const retryOhnePat = await page.locator('#wfstrip .wf-retry').count();
    expect(retryOhnePat).toBe(0);
  });
});
