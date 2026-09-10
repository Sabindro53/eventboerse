// Der gemeinsame Plan einer Gruppe — die Regeln wirklich ausgeführt.
//
// ── WARUM DIESE SUITE PHP STARTET ───────────────────────────────────────
//
// Dieselbe Begründung wie bei `social.spec.js`: eine Rechteprüfung, die nur
// GELESEN wird, ist nicht geprüft. Hier kommt eine zweite dazu — die drei
// Konfliktarten des Plans (anlegen, übernehmen, bearbeiten) sind
// Nebenläufigkeit, und Nebenläufigkeit lässt sich nicht am Diff ablesen.
//
// Der Prüfstand ist `tests/e2e/social.php`: dieselbe gestellte Welt, in der
// die Gruppen schon stehen. Ein zweiter Prüfstand hieße, dreihundert Zeilen
// WordPress-Attrappe zu kopieren — und eine Kopie driftet.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

let _stand = null;
function stand() {
  if (_stand) return _stand;
  const roh = execFileSync('php', [path.join(__dirname, 'social.php')], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  _stand = JSON.parse(roh);
  return _stand;
}

test.describe('Wer den Plan überhaupt sieht', () => {
  test('ein Fremder erfährt nicht einmal, dass es die Gruppe gibt', () => {
    // 404 und nicht 403: wer die beiden unterscheiden kann, kann Gruppen
    // zählen. Dieselbe Regel wie bei der Gruppe selbst.
    const d = stand();
    expect(d.plan_fremder.status).toBe(404);
  });

  test('ein Eingeladener bekommt den Plan NICHT', () => {
    // Die heikle Stufe. Der Plan ist der Inhalt der Gruppe; bekäme ihn schon,
    // wer nur eingeladen ist, wäre eine Einladung ein Weg, ihn abzuholen und
    // danach abzulehnen — ohne je zugestimmt zu haben.
    //
    // Dieselbe Grenze wie bei der Mitgliederliste, aus demselben Grund.
    const d = stand();
    expect(d.plan_eingeladener.status, 'ein Eingeladener liest den Plan').toBe(404);
    expect(d.plan_eingeladener_schreibt.status, 'ein Eingeladener schreibt in den Plan').toBe(404);
  });

  test('ein Posten gehört zu SEINER Gruppe', () => {
    // Ohne diese Prüfung wäre jede Gruppen-ID, in der man Mitglied ist, ein
    // Schlüssel zu jedem Posten der ganzen Tabelle: Zweitgruppe anlegen,
    // fremde Posten-ID anhängen, fertig.
    const d = stand();
    expect(d.plan_fremder_posten.status).toBe(404);
  });
});

test.describe('Anlegen: der Fall ohne Konflikt', () => {
  test('ein Mitglied legt einen Posten an', () => {
    const d = stand();
    expect(d.plan_anlegen.status).toBe(201);
    expect(d.plan_anlegen.body.item.titel).toBe('DJ für die Feier');
    expect(d.plan_anlegen.body.item.status).toBe('offen');
    expect(d.plan_anlegen.body.item.rev, 'ein neuer Posten beginnt bei 1').toBe(1);
    expect(d.plan_anlegen.body.item.zustaendig, 'niemand ist zuständig, bevor jemand zusagt').toBeNull();
  });

  test('ohne Namen kein Posten', () => {
    const d = stand();
    expect(d.plan_ohne_titel.status).toBe(400);
  });

  test('fremder Text wird entschärft, nicht verworfen', () => {
    // Der Eintrag bleibt, das Markup geht. Ein Posten, der kommentarlos
    // verschwindet, lässt den Nutzer die Seite für kaputt halten — und ein
    // Titel, der als Markup durchgeht, ist die Einladung zum XSS.
    const d = stand();
    expect(d.plan_markup.status).toBe(201);
    expect(d.plan_markup.body.item.titel).toBe('Catering');
    expect(d.plan_markup.body.item.titel).not.toMatch(/</);
  });

  test('ein Inserat wird geprüft, nicht geglaubt', () => {
    // Beide Richtungen. Ein Test, der nur das Ablehnen zeigt, ließe
    // „lehnt IMMER ab" als Erklärung zu — dann wäre die Verknüpfung tot und
    // der Test trotzdem grün.
    const d = stand();
    expect(d.plan_geistinserat.body.item.listingId, 'ein erfundenes Inserat wird verknüpft').toBeNull();
    expect(d.plan_anlegen.body.item.listingId, 'ein echtes Inserat wird NICHT verknüpft').toBeTruthy();
  });

  test('ein negativer Betrag wird auf 0 gezogen', () => {
    const d = stand();
    expect(d.plan_negativ.body.item.betragCent).toBe(0);
  });

  test('der Deckel greift, und er greift wirklich', () => {
    // Gemessen wird BEIDES: die Absage und die Zahl der Zeilen. Eine Absage
    // allein könnte auch aus einem ganz anderen Grund kommen.
    const d = stand();
    expect(d.plan_deckel.status).toBe(409);
    expect(d.plan_deckel_zahl, 'der Deckel liegt nicht dort, wo er soll').toBe(60);
  });
});

test.describe('Bearbeiten: optimistisches Sperren', () => {
  test('mit der aktuellen Revision geht es durch, und die Revision steigt', () => {
    const d = stand();
    expect(d.plan_aendern.status).toBe(200);
    expect(d.plan_aendern.body.item.notiz).toBe('ab 19 Uhr');
    expect(d.plan_aendern.body.item.betragCent).toBe(85000);
    expect(d.plan_aendern.body.item.rev, 'ohne steigende Revision sperrt nichts')
      .toBeGreaterThan(d.plan_anlegen.body.item.rev);
  });

  test('mit einer veralteten Revision wird abgelehnt — MIT dem aktuellen Stand', () => {
    // Der zweite Teil ist der wichtigere. Eine Ablehnung ohne den aktuellen
    // Stand zwingt den Aufrufer zu einem zweiten Abruf, und bis dahin zeigt
    // er weiter den veralteten — für den Nutzer sieht das aus wie ein
    // Fehler statt wie „jemand war schneller".
    const d = stand();
    expect(d.plan_veraltet.status).toBe(409);
    expect(d.plan_veraltet.body.item, 'der aktuelle Stand fehlt in der Absage').toBeTruthy();
    expect(d.plan_veraltet.body.item.notiz, 'der zurückgegebene Stand ist nicht der aktuelle')
      .toBe('ab 19 Uhr');
    expect(d.plan_veraltet.body.item.rev).toBe(d.plan_aendern.body.item.rev);
  });

  test('ohne Revision wird gar nicht erst geschrieben', () => {
    // Sonst wäre das Sperren freiwillig: wer das Feld weglässt, überschreibt.
    const d = stand();
    expect(d.plan_ohne_rev.status).toBe(400);
  });

  test('ein erfundener Zustand kommt nicht in die Spalte', () => {
    const d = stand();
    expect(d.plan_status_muell.status).toBe(400);
  });
});

test.describe('Übernehmen: der Wettlauf um einen Platz', () => {
  test('wer zuerst zusagt, bekommt den Posten', () => {
    const d = stand();
    expect(d.plan_uebernehmen.status).toBe(200);
    expect(d.plan_uebernehmen.body.item.status).toBe('vergeben');
    expect(d.plan_uebernehmen.body.item.zustaendig, 'niemand steht als zuständig drin').toBeTruthy();
  });

  test('die zweite Zusage wird abgewiesen, nicht überschrieben', () => {
    // Das ist der Kern. Ohne die Bedingung IN der Abfrage
    // (`WHERE zustaendig_id = 0`) gewänne der zuletzt Angekommene, und der
    // erste erführe nie, dass seine Zusage weg ist.
    const d = stand();
    expect(d.plan_zweite_uebernahme.status).toBe(409);
    expect(d.plan_zweite_uebernahme.body.item, 'die Absage nennt nicht, wer schneller war').toBeTruthy();
    expect(d.plan_zweite_uebernahme.body.item.zustaendig).toBeTruthy();
  });

  test('freigeben darf, wer zugesagt hat — und die Verwaltung', () => {
    const d = stand();
    expect(d.plan_freigeben_leitung.status, 'die Leitung darf nicht freigeben').toBe(200);
    expect(d.plan_freigeben_leitung.body.item.status).toBe('offen');
    expect(d.plan_freigeben_selbst.status, 'der Zuständige darf sich selbst nicht abmelden').toBe(200);
  });

  test('ein Unbeteiligter kann keine fremde Zusage aufheben', () => {
    // Sonst wäre die Übernahme keine Zusage, sondern eine
    // Absichtserklärung, die jeder widerrufen kann.
    const d = stand();
    expect(d.plan_freigeben_fremd.status).toBe(403);
  });
});

test.describe('Löschen: nur der Urheber oder die Verwaltung', () => {
  test('ein fremdes Mitglied räumt nichts weg', () => {
    // Dürfte jeder jeden Posten entfernen, könnte einer die Arbeit aller
    // anderen löschen, und die Gruppe hätte keinen Weg zurück.
    const d = stand();
    expect(d.plan_loeschen_fremd.status).toBe(403);
  });

  test('der Urheber darf, und die Verwaltung auch', () => {
    const d = stand();
    expect(d.plan_loeschen_eigener.status).toBe(200);
    expect(d.plan_loeschen_leitung.status).toBe(200);
  });
});

test.describe('Lesen: Reihenfolge und Bilanz', () => {
  test('offene Posten stehen oben', () => {
    // Eine Liste, die Erledigtes obenauf zeigt, lässt die Gruppe fertiger
    // aussehen, als sie ist — und offen ist genau das, was noch jemand
    // übernehmen muss.
    const d = stand();
    const rang = { offen: 0, vergeben: 1, gebucht: 2, erledigt: 3 };
    const folge = d.plan_lesen.body.items.map((i) => rang[i.status]);
    expect(folge, 'die Reihenfolge ist nicht nach Zustand sortiert')
      .toEqual([...folge].sort((a, b) => a - b));
  });

  test('die Bilanz wird auf dem Server gerechnet', () => {
    // Zwei Rechenwege für dieselbe Zahl driften, und diese Zahl ist Geld.
    // Geprüft wird gegen die Summe der ausgelieferten Posten — nicht gegen
    // eine hier hingeschriebene Zahl, die beim nächsten Fixture bricht.
    const d = stand();
    const b = d.plan_lesen.body.bilanz;
    const items = d.plan_lesen.body.items;
    expect(b.posten).toBe(items.length);
    expect(b.summeCent).toBe(items.reduce((s, i) => s + i.betragCent, 0));
    expect(b.offen).toBe(items.filter((i) => i.status === 'offen').length);
  });
});

test.describe('Löst sich die Gruppe auf, geht der Plan mit', () => {
  test('kein Posten bleibt als verwaiste Zeile stehen', () => {
    // ── EIN FEHLER, DER ERST BEIM DATENSCHUTZTEXT AUFFIEL ──────────────
    //
    // Das Auflösen löschte Gruppe und Mitgliederzeilen — die Posten nicht.
    // Zurück blieben Bezeichnungen, freie Notizen und die Angabe, wer sich
    // um was kümmern wollte: persönliche Daten, deren Zusammenhang weg ist
    // und die niemand mehr erreichen kann.
    //
    // Aufgefallen ist es beim Schreiben von Abschnitt 10a der
    // Datenschutzerklärung — der Satz über die Löschung wäre unwahr
    // gewesen. Der Code folgt dem Text nicht; der Text hat den Code
    // geprüft.
    //
    // Gemessen wird an den ZEILEN, nicht an der Antwort: „success: true"
    // sagt nichts darüber, was liegen geblieben ist.
    const d = stand();
    expect(d.plan_vor_aufloesung, 'die Bühne war schon leer — der Test belegt nichts')
      .toBeGreaterThan(0);
    expect(d.plan_gruppe_weg, 'die Gruppe hat sich gar nicht aufgelöst').toBe(true);
    expect(d.plan_nach_aufloesung, 'Posten bleiben nach dem Auflösen zurück').toBe(0);
  });
});

test.describe('Der Rahmen', () => {
  test('der Deckel hängt am Konto, nicht an der Leitung', () => {
    // Hinter einem Proxy meint REMOTE_ADDR alle Besucher gemeinsam — ein
    // IP-gebundener Deckel wäre dort entweder wirkungslos oder er sperrte
    // Unbeteiligte.
    const d = stand();
    expect(d.rate_limits.social_plan, 'der Plan-Eimer wird nie gezogen').toBeTruthy();
    expect(d.rate_limits.social_plan).toMatch(/^u\d+$/);
  });

  test('jede Plan-Route verlangt eine Anmeldung', () => {
    // Die äussere Tür. Sie ersetzt die Mitgliedsprüfung nicht — angemeldet
    // zu sein sagt nichts darüber, in welcher Gruppe jemand ist —, aber ohne
    // sie stünde jede Route offen.
    const roh = fs.readFileSync(path.join(ROOT, 'includes', 'social', 'plan-routen.php'), 'utf8');
    const bloecke = roh.match(/register_rest_route\([\s\S]*?\) \);/g) || [];
    expect(bloecke.length, 'keine Plan-Route gefunden — der Prüfer hat sein Subjekt verloren')
      .toBeGreaterThanOrEqual(6);
    for (const b of bloecke) {
      expect(b, `Route ohne Anmeldepflicht:\n${b}`).toMatch(/'permission_callback'\s*=>\s*\$auf/);
    }
  });

  test('jeder Handler prüft die Mitgliedschaft selbst', () => {
    // Die Anmeldepflicht oben ist die äussere Tür. Ein Handler, der sich
    // darauf verlässt, gibt den Plan jedem Angemeldeten — also praktisch
    // jedem. Gemessen wird deshalb, dass JEDER Handler `eb_plan_zugang()`
    // ruft, nicht dass irgendeiner es tut.
    const roh = fs.readFileSync(path.join(ROOT, 'includes', 'social', 'plan-routen.php'), 'utf8');
    const namen = [...roh.matchAll(/'callback'\s*=>\s*'([a-z_]+)'/g)].map((m) => m[1]);
    expect(namen.length, 'keine Handler gefunden').toBeGreaterThanOrEqual(6);
    for (const n of new Set(namen)) {
      const rumpf = roh.match(new RegExp(`function ${n}\\([\\s\\S]*?\\n}`));
      expect(rumpf, `Handler ${n} nicht gefunden`).toBeTruthy();
      expect(rumpf[0], `${n} prüft die Mitgliedschaft nicht`).toMatch(/eb_plan_zugang\(/);
    }
  });
});
