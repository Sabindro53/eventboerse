const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');

test.describe('Board-Prozess', () => {
  test('Prozessstruktur bleibt fest und zeigt Erfüllt vor Bezahlt', async ({ page }) => {
    const errors = await openApp(page);

    const state = await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 4242, name: 'Board Test', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_locked';
      _boardProjects = [{
        id: 'bp_locked',
        name: 'Festes Board',
        date: '2026-09-12',
        budget: 1000,
        flowLayout: { bestaetigt: { x: 900, y: 420 } },
        flowLayouts: {
          desktop: {
            geplant: { x: 90, y: 350 },
            bestaetigt: { x: 900, y: 520 },
            abgeschlossen: { x: 300, y: 680 },
          },
        },
        cards: [
          { id: 'c_booked', name: 'Gebuchte Leistung', stage: 'angebot', providerAcceptedAt: '2026-08-13T10:00:00Z', _stageModel: 2 },
          { id: 'c_fulfilled', name: 'Erfüllte Leistung', stage: 'bestaetigt', fulfilledAt: '2026-08-13T11:00:00Z', _stageModel: 2 },
          { id: 'c_paid', name: 'Bezahlte Leistung', stage: 'abgeschlossen', fulfilledAt: '2026-08-13T11:00:00Z', paymentIntentId: 'pi_test', paymentStatus: 'paid', _stageModel: 2 },
        ],
      }];

      const view = document.getElementById('boardFlowView');
      view.style.display = 'block';
      renderBoardFlow();

      const stageLabels = [...document.querySelectorAll('.flow-node-stage .flow-node-hdr > span:nth-child(2)')]
        .map((el) => el.textContent.trim());
      const stageTops = [...document.querySelectorAll('.flow-col[data-col-id]:not([data-col-id="start"]):not([data-col-id="end"])')]
        .map((el) => el.style.top);
      return {
        stageLabels,
        stageTops,
        dragHandles: document.querySelectorAll('.flow-drag-handle').length,
        dragIcons: document.querySelectorAll('.flow-drag-icon').length,
        actions: [...document.querySelectorAll('.flow-prov-action-btn')].map((el) => el.textContent.trim()),
      };
    });

    expect(state.stageLabels).toEqual(['Geplant', 'Kontaktiert', 'Gebucht', 'Erfüllt', 'Bezahlt']);
    expect(new Set(state.stageTops).size, 'alte kaputte Koordinaten dürfen das Layout nicht beeinflussen').toBe(1);
    expect(state.dragHandles, 'Prozessspalten dürfen nicht verschiebbar sein').toBe(0);
    expect(state.dragIcons).toBe(0);
    expect(state.actions.some((label) => label.includes('Erbringung bestätigen'))).toBe(true);
    expect(state.actions.some((label) => label.includes('Jetzt bezahlen'))).toBe(true);
    expectNoPageErrors(errors, 'festes Board-Layout');
  });

  test('alte Karten werden in die neue Reihenfolge migriert', async ({ page }) => {
    const errors = await openApp(page);
    const migrated = await page.evaluate(() => {
      const projects = [{
        id: 'legacy',
        flowLayout: { bestaetigt: { x: 999, y: 999 } },
        flowLayouts: { desktop: { abgeschlossen: { x: 10, y: 700 } } },
        cards: [
          { id: 'paid_open', stage: 'bestaetigt', paymentIntentId: 'pi_old', paymentStatus: 'paid' },
          { id: 'fulfilled_paid', stage: 'abgeschlossen', fulfilledAt: '2026-08-12T10:00:00Z', paymentReference: 'pi_done', paymentStatus: 'paid' },
          { id: 'fulfilled_unpaid', stage: 'abgeschlossen', fulfilledAt: '2026-08-12T10:00:00Z' },
          { id: 'accepted_only', stage: 'bestaetigt', providerAcceptedAt: '2026-08-10T10:00:00Z', paidAt: '2026-08-10T10:00:00Z', paymentStatus: 'Bezahlt', paymentMethod: 'Stripe' },
        ],
      }];
      const changed = _migrateBoardStageModel(projects);
      return {
        changed,
        stages: projects[0].cards.map((card) => card.stage),
        fakePaidCleared: !projects[0].cards[3].paymentStatus && !projects[0].cards[3].paidAt,
        legacyLayoutRemoved: !projects[0].flowLayout && Object.keys(projects[0].flowLayouts).length === 0,
        versions: projects[0].cards.map((card) => card._stageModel),
      };
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.stages).toEqual(['angebot', 'abgeschlossen', 'bestaetigt', 'angebot']);
    expect(migrated.fakePaidCleared).toBe(true);
    expect(migrated.legacyLayoutRemoved).toBe(true);
    expect(migrated.versions).toEqual([2, 2, 2, 2]);
    expectNoPageErrors(errors, 'Board-Stage-Migration');
  });
});
