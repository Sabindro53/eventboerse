// Freunde und Gruppen — die Rechteprüfungen wirklich ausgeführt.
//
// ── WARUM DIESE SUITE PHP STARTET ───────────────────────────────────────
//
// Eine Rechteprüfung, die nur GELESEN wird, ist nicht geprüft. Der teure
// Fehler in dieser Ecke ist nicht der Syntaxfehler, sondern der Handler, der
// eine Prüfung vergisst — und der sieht im Diff genauso aus wie einer, der
// sie hat.
//
// `tests/e2e/social.php` bindet den echten Quelltext ein, stellt WordPress
// und `$wpdb`, und lässt die Handler laufen: fremder Nutzer, fremde Gruppe,
// abgelaufener Code. Dieselbe Anordnung wie `ratelimit-proxy.php`,
// `csp-nonce.php` und `aasa.php`.
//
// Die gestellte Datenbank BRICHT AB, sobald eine unbekannte Abfrage kommt.
// Ein Prüfstand, der eine unverstandene Abfrage mit `null` beantwortet, gibt
// Entwarnung für Code, den er nie ausgeführt hat.
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

/**
 * Aus welcher Funktion zieht `eb_create_tables()` seine Tabellen?
 *
 * Gesucht wird die QUELLE, nicht ein fester Name: sie darf umbenannt oder
 * erweitert werden, solange Anlegen und Nachpruefen dieselbe benutzen.
 */
function tabellenQuelle(fn) {
  const von = fn.indexOf('function eb_create_tables');
  if (von < 0) return null;
  const rumpf = fn.slice(von, fn.indexOf('\nadd_action', von));
  const m = rumpf.match(/foreach\s*\(\s*(\w+)\(\)\s*as/);
  return m ? m[1] : null;
}

test.describe('Handle: das Setzen ist die Einwilligung', () => {
  test('ein gültiger Handle wird gesetzt, ein ungültiger nicht', async () => {
    const d = stand();
    expect(d.handle_setzen.status).toBe(200);
    expect(d.handle_von_anna).toBe('anna.b');
    expect(d.handle_kurz.status, 'zwei Zeichen sind kein Handle').toBe(400);
    expect(d.handle_zeichen.status, 'Leerzeichen und Ausrufezeichen gehen durch').toBe(400);
  });

  test('Grossbuchstaben werden gesenkt, nicht abgewiesen', async () => {
    // „Anna" und „anna" wären sonst zwei Konten, die man verwechseln kann —
    // bei einer Freundesliste kein Schönheitsfehler, sondern der Weg an
    // fremde Planung.
    const d = stand();
    expect(d.handle_gross.status).toBe(200);
    expect(d.handle_gross.body.handle).toBe('anna');
  });

  test('reservierte und vergebene Namen gehen nicht', async () => {
    const d = stand();
    expect(d.handle_gesperrt.status, '„admin" ist zu haben').toBe(409);
    expect(d.handle_vergeben.status, 'ein fremder Handle liess sich übernehmen').toBe(409);
  });

  test('die Einwilligung ist zurücknehmbar', async () => {
    // Ohne diesen Weg wäre sie einmalig und unwiderruflich — und damit
    // keine Einwilligung.
    const d = stand();
    expect(d.handle_leeren.status).toBe(200);
    expect(d.handle_nach_leeren).toBe('');
  });
});

test.describe('Suche: kein Orakel', () => {
  test('gefunden wird, wer einen Handle gesetzt hat', async () => {
    const d = stand();
    expect(d.suche_treffer.body.results).toHaveLength(1);
    expect(d.suche_treffer.body.results[0].handle).toBe('ben_k');
  });

  test('wer keinen Handle hat, ist nicht auffindbar', async () => {
    // Auch nicht über den Anzeigenamen. Jeder hat einen, und niemand hat
    // ihm zugestimmt, gefunden zu werden.
    const d = stand();
    expect(d.suche_ohne_handle.body.results,
      'ein Nutzer ohne Handle wurde über seinen Namen gefunden').toEqual([]);
  });

  test('die E-Mail ist keine Suchanfrage', async () => {
    // „Gibt es hier ein Konto zu dieser Adresse" ist die Frage, die ein
    // Angreifer stellt — bei einem Marktplatz besonders wertvoll.
    const d = stand();
    expect(d.suche_email.body.results).toEqual([]);
  });

  test('zwei Zeichen sind keine Suche, sondern ein Abzug der Liste', async () => {
    const d = stand();
    expect(d.suche_kurz.body.results).toEqual([]);
  });

  test('sich selbst findet man nicht', async () => {
    const d = stand();
    expect(d.suche_selbst.body.results).toEqual([]);
  });

  test('eine Sperre lässt sich nicht umsuchen', async () => {
    const d = stand();
    // GEGENPROBE ZUERST: ohne sie belegte der Test nichts — „nicht
    // gefunden" wäre schon deshalb richtig, weil die Person nie
    // auffindbar war.
    expect(d.suche_vor_sperre.body.results,
      'die Person war schon vorher unauffindbar — der Test hätte kein Subjekt')
      .toHaveLength(1);
    expect(d.suche_gesperrt.body.results,
      'der Gesperrte findet den Sperrenden weiterhin').toEqual([]);
  });
});

test.describe('Freunde: nie ohne Zustimmung', () => {
  test('eine Anfrage macht noch keine Freundschaft', async () => {
    const d = stand();
    expect(d.anfrage.body.state).toBe('pending');
  });

  test('die eigene Anfrage kann man nicht annehmen', async () => {
    // Sonst schriebe sich der Anfragende selbst in fremde Freundeslisten.
    const d = stand();
    expect(d.selbst_annehmen.status).toBe(403);
    expect(d.nach_selbst, 'die Selbstannahme hat gegriffen').toBe(false);
  });

  test('sich selbst oder ein Phantom anzufragen geht nicht', async () => {
    const d = stand();
    expect(d.anfrage_selbst.status).toBe(404);
    expect(d.anfrage_geist.status).toBe(404);
  });

  test('erst die Antwort des Angefragten macht die Freundschaft', async () => {
    const d = stand();
    expect(d.annehmen.body.state).toBe('accepted');
    expect(d.sind_freunde).toBe(true);
  });

  test('eine abgelehnte Anfrage bleibt nicht liegen', async () => {
    const d = stand();
    expect(d.ablehnen.body.state).toBe('none');
    expect(d.nach_ablehnen, 'die abgelehnte Anfrage steht noch da').toBeNull();
  });

  test('die Gegenanfrage ist die Zustimmung', async () => {
    // Wer angefragt wird und selbst anfragt, hat zugestimmt. Alles andere
    // wäre eine Sackgasse, aus der nur ein Zufall herausführt.
    const d = stand();
    expect(d.nach_gegen).toBe(true);
  });
});

test.describe('Sperren: eine Grenze, keine Bitte', () => {
  test('der Gesperrte erfährt nichts', async () => {
    // Eine sichtbare Sperre ist eine Nachricht, und genau die wollte der
    // Sperrende nicht senden. Die Anfrage sieht deshalb aus wie gesendet.
    const d = stand();
    expect(d.anfrage_gesperrt.status).toBe(200);
    expect(d.anfrage_gesperrt.body.state).toBe('pending');
    expect(d.stand_gesperrt, 'die Sperre wurde von der Anfrage überschrieben').toBe('blocked');
    expect(d.liste_gesperrter.body.blocked,
      'der Gesperrte sieht die Sperre in seiner Liste').toEqual([]);
  });

  test('nur der Sperrende sieht die Sperre', async () => {
    const d = stand();
    expect(d.liste_sperrender.body.blocked).toHaveLength(1);
  });

  test('der Gesperrte kann die Sperre nicht wegräumen', async () => {
    const d = stand();
    expect(d.stand_danach, 'Entfernen hat die Sperre gelöscht').toBe('blocked');
    expect(d.entsperren_fremd.status).toBe(403);
  });

  test('der Sperrende kann sie aufheben', async () => {
    // Die Gegenprobe: ohne sie wäre „nie entsperren" der bequemste Weg zu
    // einem grünen Test, und eine Sperre wäre für immer.
    const d = stand();
    expect(d.entsperren.body.state).toBe('none');
    expect(d.nach_entsperren).toBeNull();
  });
});

test.describe('Gruppen: sehen, verwalten, beitreten', () => {
  test('fremder Text wird beim Anlegen entschärft', async () => {
    const d = stand();
    expect(d.gruppe_anlegen.status).toBe(201);
    expect(d.gruppe_anlegen.body.group.name).toBe('Hochzeit Anna & Ben');
    expect(d.gruppe_anlegen.body.group.name).not.toMatch(/[<>]/);
  });

  test('ohne Namen keine Gruppe, und ein erfundenes Datum wird nicht geraten', async () => {
    const d = stand();
    expect(d.gruppe_ohne_name.status).toBe(400);
    expect(d.gruppe_datum_muell.status).toBe(201);
    expect(d.gruppe_datum_muell.body.group.eventDate,
      'der 30. Februar wurde zu irgendeinem Datum').toBeNull();
  });

  test('ein Fremder erfährt nicht einmal, dass es die Gruppe gibt', async () => {
    // Ein Nein sagt nicht, warum: wer 403 von 404 unterscheiden kann,
    // kann Gruppen zählen.
    const d = stand();
    for (const fall of ['fremd_lesen', 'fremd_aendern', 'fremd_einladen',
      'fremd_code', 'fremd_entfernen']) {
      expect(d[fall].status, `${fall} verrät die Gruppe`).toBe(404);
    }
  });

  test('einladen kann man nur Freunde', async () => {
    // Ohne diese Grenze wäre eine Gruppe der Weg um die
    // Freundschaftsanfrage herum: Fremde einladen, bis einer zustimmt.
    const d = stand();
    expect(d.einladen_fremd.status).toBe(403);
    expect(d.einladen_fremd.body.error).toBe('nicht_befreundet');
    expect(d.einladen_freund.status, 'auch ein Freund kommt nicht hinein').toBe(200);
  });

  test('ein Eingeladener sieht die Gruppe, aber nicht die Mitglieder', async () => {
    // Sonst wäre eine Einladung ein Weg, die Freundesliste eines Fremden
    // auszulesen: einladen, Liste abholen, wieder ausladen — und niemand
    // hat je zugestimmt.
    const d = stand();
    const g = d.eingeladen_sicht.body.group;
    expect(d.eingeladen_sicht.status).toBe(200);
    expect(g.role).toBe('invited');
    expect(g.members, 'der Eingeladene bekommt die Mitgliederliste').toEqual([]);
    expect(g.memberCount, 'die Zahl fehlt — dann kann er nicht entscheiden')
      .toBeGreaterThan(0);
    expect(g.inviteCode, 'der Eingeladene bekommt den Einladungscode').toBeUndefined();
    // Und die Einladung steht getrennt von den eigenen Gruppen.
    expect(d.eingeladen_liste.body.invitations).toHaveLength(1);
    expect(d.eingeladen_liste.body.groups).toEqual([]);
  });

  test('erst die Annahme macht das Mitglied', async () => {
    const d = stand();
    expect(d.eingeladen_annehmen.body.group.role).toBe('member');
    expect(d.mitglied_sicht.body.group.members.length,
      'das Mitglied sieht die Liste immer noch nicht').toBeGreaterThan(1);
    expect(d.annehmen_ohne.status, 'ohne Einladung liess sich beitreten').toBe(404);
  });

  test('ein Mitglied verwaltet nicht', async () => {
    const d = stand();
    expect(d.mitglied_aendern.status).toBe(403);
    expect(d.mitglied_einladen.status).toBe(403);
    expect(d.mitglied_sicht.body.group.inviteCode,
      'ein Mitglied bekommt den Einladungscode').toBeUndefined();
  });

  test('der Code ist die Zustimmung — und ein falscher verrät nichts', async () => {
    const d = stand();
    expect(d.beitritt.status).toBe(200);
    expect(d.rolle_nach_code, 'über den Code wird man nur „eingeladen"').toBe('member');
    expect(d.beitritt_falsch.status).toBe(404);
    expect(d.beitritt_muell.status).toBe(404);
    // Beide sagen dasselbe: zu unterscheiden hiesse zu verraten, dass es
    // diese Gruppe gibt.
    expect(d.beitritt_falsch.body.error).toBe(d.beitritt_muell.body.error);
  });

  test('ein abgelaufener Code gilt nicht mehr', async () => {
    // Ein anderer Fall als der zurückgezogene: der alte Code steht dann gar
    // nicht mehr in der Tabelle, ein abgelaufener sehr wohl. Ohne diesen
    // Fall überlebte die Mutation „Ablauf ignoriert" — der Code wäre
    // unbegrenzt gültig, und die Zusicherung „gilt 14 Tage" unbelegt.
    const d = stand();
    expect(d.abgelaufener_code.status).toBe(404);
    expect(d.rolle_nach_ablauf, 'trotz Ablauf beigetreten').toBe('');
    // Gegenprobe: derselbe Code geht wieder, sobald der Ablauf stimmt —
    // sonst wäre „nie beitreten lassen" der bequemste Weg zu Grün.
    expect(d.code_wieder_gueltig.status).toBe(200);
  });

  test('ein neuer Code entwertet den alten', async () => {
    const d = stand();
    expect(d.code_neu.status).toBe(200);
    expect(d.alter_code.status, 'der zurückgezogene Code funktioniert weiter').toBe(404);
  });

  test('ein Handle ohne Konto dahinter fällt aus der Suche', async () => {
    // Ein gelöschtes Konto kann sein `user_meta` hinterlassen. Ohne den
    // Riegel stünde in der Trefferliste eine Person, die es nicht mehr
    // gibt — mit erfundenem Namen und erfundenem Bild.
    const d = stand();
    expect(d.suche_geist.body.results).toEqual([]);
  });
});

test.describe('Gruppen: Rollen und Nachfolge', () => {
  test('Rollen vergibt nur der Eigentümer', async () => {
    const d = stand();
    expect(d.rolle_durch_mitglied.status).toBe(403);
    expect(d.rolle_setzen.status).toBe(200);
    expect(d.rolle_von_3).toBe('admin');
  });

  test('„owner" ist nicht vergebbar, und Fremde bekommen keine Rolle', async () => {
    // Sonst gäbe es einen Weg, sich selbst zum Eigentümer zu machen — und
    // der müsste dann seinerseits bewacht werden.
    const d = stand();
    expect(d.rolle_owner_vergeben.status).toBe(400);
    expect(d.rolle_kein_mitglied.status).toBe(404);
  });

  test('ein Admin darf einladen, aber die Leitung nicht hinauswerfen', async () => {
    // Ohne diese Grenze reichte eine Beförderung, um den Eigentümer zu
    // enteignen.
    const d = stand();
    expect(d.admin_darf_einladen, 'die Beförderung hat nichts bewirkt').toBe(true);
    expect(d.admin_wirft_leitung.status).toBe(403);
    expect(d.leitung_noch_da).toBe('owner');
  });

  test('geht die Leitung, bleibt die Gruppe nicht führerlos', async () => {
    // Eine Gruppe ohne Leitung liesse sich nie wieder verwalten und stünde
    // für immer in den Listen aller Beteiligten.
    const d = stand();
    expect(d.leitung_geht.body.deleted).toBe(false);
    expect(d.neuer_owner, 'die Eigentümerschaft ist nicht übergegangen').toBe(2);
    expect(d.neue_rolle).toBe('owner');
  });

  test('geht der Letzte, verschwindet die Gruppe samt Mitgliederzeilen', async () => {
    const d = stand();
    expect(d.letzter_geht.body.deleted).toBe(true);
    expect(d.gruppe_weg).toBe(true);
    expect(d.zeilen_weg, 'die Mitgliederzeilen bleiben als Waisen liegen').toBe(0);
  });
});

test.describe('Der Rahmen: Deckel, Erlaubnis, Schema', () => {
  test('die Deckel hängen am Konto, nicht an der Leitung', async () => {
    // Hinter einem Proxy meint `REMOTE_ADDR` alle gemeinsam. Ein
    // IP-gebundener Deckel wäre dort entweder wirkungslos oder er sperrte
    // Unbeteiligte — genau der Befund vom 05.09.2026, eine Ebene höher.
    const d = stand();
    const eimer = Object.keys(d.rate_limits);
    expect(eimer.length, 'keine einzige Route zählt mit').toBeGreaterThanOrEqual(3);
    for (const [aktion, ident] of Object.entries(d.rate_limits)) {
      expect(ident, `der Eimer „${aktion}" hängt nicht am Konto`).toMatch(/^u\d+$/);
    }
  });

  // Genau EINE Route ist offen, und sie steht hier mit Grund: die
  // Registrierung prueft den Nickname, bevor es ein Konto gibt. Eine
  // Ausnahmeliste, die wachsen kann, waere das Ende der Regel — deshalb
  // ist sie ein fester Eintrag, und die Route darf nur LESEN.
  const OFFEN = { 'GET /social/handle/frei': 'Registrierung prueft vor der Anmeldung' };

  test('jede Route verlangt eine Anmeldung', async () => {
    const d = stand();
    expect(d.routen.length, 'es sind gar keine Routen registriert').toBeGreaterThanOrEqual(14);
    const offen = [];
    for (const r of d.routen) {
      const name = `${r.methoden} ${r.pfad}`;
      if (OFFEN[name]) { offen.push(name); continue; }
      expect(r.erlaubnis, `${name} ist offen`).toBe('is_user_logged_in');
    }
    expect(offen, 'die eine offene Route ist verschwunden — dann gehoert sie aus OFFEN').toEqual(Object.keys(OFFEN));
  });

  test('jede Route liegt unter /social/', async () => {
    // Damit ein Blick auf die Routenliste reicht, um zu sehen, was diese
    // Ecke anfasst.
    const d = stand();
    for (const r of d.routen) {
      expect(r.pfad, `${r.pfad} steht ausserhalb`).toMatch(/^\/social\//);
    }
  });

  test('die Tabellen werden auch wirklich angelegt', async () => {
    // Eine Tabellendefinition, die niemand ruft, ist eine Datei. Genau so
    // ist `localize-demo-images.mjs` gestorben: fertig, richtig, nie
    // gelaufen.
    const fn = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    // Gemessen wird die BEDINGUNG, nicht der Name. Seit dem 13.09.2026
    // speisen sich Anlegen und Nachpruefen aus `eb_zusatz_tabellen_sql()`,
    // damit eine fuenfte Tabelle (Storno) nicht angelegt, aber nicht
    // nachgewiesen wird. Welche Funktion die Quelle ist, darf sich aendern;
    // dass die Social-Tabellen darin ankommen, nicht.
    const quelle = tabellenQuelle(fn);
    expect(quelle, 'eb_create_tables() legt keine abgeleiteten Tabellen an — '
      + 'dann steht die Liste wieder von Hand da').toBeTruthy();
    const rumpf = fn.slice(fn.indexOf(`function ${quelle}(`));
    expect(rumpf.slice(0, rumpf.indexOf('\n}')),
      `${quelle}() fuehrt die Social-Tabellen nicht — dann werden sie nicht `
      + 'angelegt').toContain('eb_social_tabellen_sql()');
    expect(fn, 'die Includes fehlen')
      .toMatch(/includes\/social\/freunde-gruppen\.php/);
    expect(fn, 'die Routen werden nirgends eingebunden')
      .toMatch(/includes\/social\/routen\.php/);

    // Und der Versionssprung: ohne ihn läuft `dbDelta` nie, und die
    // Tabellen entstehen im Betrieb nicht.
    const m = fn.match(/define\(\s*'EB_DB_VERSION',\s*'([\d.]+)'\s*\)/);
    expect(m, 'EB_DB_VERSION ist nicht auffindbar').toBeTruthy();
    expect(parseFloat(m[1]),
      'die Schema-Version wurde nicht erhöht — dann läuft dbDelta nie')
      .toBeGreaterThanOrEqual(2.8);
  });

  test('jede Social-Tabelle kommt in eb_social_tabellen_sql() an', async () => {
    // ── DIE FORTSETZUNG DES BEFUNDS VOM 10.09.2026 ────────────────────
    //
    // Die Migration leitet ihre Nachweisliste aus `eb_social_tabellen_sql()`
    // ab — das ist behoben. Damit hängt jetzt alles daran, dass diese
    // Funktion VOLLSTÄNDIG ist. Wer eine Tabelle in einer anderen Datei
    // unter `includes/social/` definiert und hier nicht anhängt, bekäme sie
    // weder angelegt noch nachgewiesen, und `eb_db_version` spränge
    // trotzdem hoch: derselbe Fehler, nur eine Ebene höher.
    //
    // Gemessen wird gegen die AUSGEFÜHRTE Funktion, nicht gegen ihren
    // Quelltext: dass ein Name in der Datei steht, sagt nicht, dass er auch
    // zurückkommt.
    const d = stand();
    const geliefert = d.tabellen_sql;
    expect(Array.isArray(geliefert) && geliefert.length,
      'eb_social_tabellen_sql() liefert nichts — der Prüfer hat sein Subjekt verloren')
      .toBeTruthy();

    const ordner = path.join(ROOT, 'includes', 'social');
    const gefunden = new Set();
    for (const datei of fs.readdirSync(ordner).filter((f) => f.endsWith('.php'))) {
      const quelle = fs.readFileSync(path.join(ordner, datei), 'utf8');
      for (const t of quelle.matchAll(/CREATE TABLE\s+\{\$wpdb->prefix\}(\w+)/g)) {
        gefunden.add(t[1]);
      }
    }
    expect(gefunden.size, 'kein CREATE TABLE unter includes/social/ gefunden')
      .toBeGreaterThanOrEqual(4);
    expect([...geliefert].sort(),
      'eine Tabelle ist definiert, kommt aber nicht in eb_social_tabellen_sql() an')
      .toEqual([...gefunden].sort());
  });

  test('die Migration prüft ihre eigenen Tabellen nach', async () => {
    // ── DER FEHLER, DEN DIESER TEST FESTHÄLT ───────────────────────────
    //
    // `eb_maybe_create_tables()` setzt `eb_db_version` erst hoch, wenn
    // `$fehlt` leer ist — und `$fehlt` wurde von Hand aufgezählt. Mit 2.8
    // kamen drei Tabellen dazu, und keine stand in der Aufzählung.
    //
    // Wäre eine davon nicht entstanden, hätte `$fehlt` trotzdem leer
    // ausgesehen: Version auf 2.8, Migration NIE WIEDER angelaufen,
    // Datenbank kaputt, Anzeige grün. Genau die Kombination, vor der der
    // Kommentar zwanzig Zeilen darüber warnt — und die ich beim Anlegen
    // der Tabellen prompt neu erzeugt hatte.
    //
    // Geprüft wird deshalb die ABLEITUNG, nicht die Namen: wer eine
    // vierte Social-Tabelle anlegt, bekommt ihre Prüfung geschenkt, und
    // wer die Schleife durch eine Aufzählung ersetzt, fällt hier durch.
    const fn = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    const block = fn.slice(fn.indexOf('function eb_maybe_create_tables'),
      fn.indexOf('update_option( \'eb_db_version\', EB_DB_VERSION )'));
    expect(block, 'die Migrationsprüfung ist nicht auffindbar').toBeTruthy();
    // DIESELBE Quelle wie beim Anlegen — das ist die eigentliche Regel.
    // Pruefte die Migration eine andere Liste als die, die angelegt wird,
    // spraenge `eb_db_version` bei fehlender Tabelle, und die Migration
    // liefe nie wieder an. Genau der Fehler von 2.8, nur eine Ebene hoeher.
    const quelle2 = tabellenQuelle(fn);
    expect(block,
      'die Migration prüft eine ANDERE Liste als die, die angelegt wird — '
      + 'dann gilt sie als erledigt, auch wenn eine Tabelle fehlt')
      .toMatch(new RegExp(`foreach\\s*\\(\\s*${quelle2}\\(\\)\\s*as`));
    expect(block, 'die Prüfung trägt die Tabellen wieder als Handliste')
      .toMatch(/SHOW TABLES LIKE '\{\$tab_social\}'/);

    // Und die Gegenprobe am AUSGEFÜHRTEN SQL: der Ausdruck, mit dem die
    // Prüfung die Namen zieht, findet auch wirklich jede. Ein Muster, das
    // nichts trifft, prüfte still gar nichts.
    //
    // Gezählt wird gegen die Rückgabe der echten Funktion, nicht gegen eine
    // Zahl — die stünde beim nächsten Schema wieder falsch da, und dann
    // zöge jemand sie nach, statt hinzusehen.
    const d = stand();
    expect(d.tabellen_sql.length,
      'der Ausdruck der Migrationsprüfung findet die Tabellen nicht')
      .toBeGreaterThanOrEqual(4);
    for (const t of d.tabellen_sql) {
      expect(t, `aus dem SQL kam kein brauchbarer Tabellenname: ${t}`).toMatch(/^eb_\w+$/);
    }
  });

  test('das Paar steht nur einmal in der Tabelle', async () => {
    // `user_low`/`user_high` statt `requester`/`addressee`: eine
    // Freundschaft ist symmetrisch, und mit zwei Spalten in beliebiger
    // Reihenfolge stünde dasselbe Paar zweimal da — mit womöglich
    // widersprüchlichem Status.
    const quelle = fs.readFileSync(path.join(ROOT, 'includes', 'social', 'freunde-gruppen.php'), 'utf8');
    expect(quelle).toMatch(/UNIQUE KEY idx_paar \(user_low, user_high\)/);
    expect(quelle).toMatch(/UNIQUE KEY idx_mitglied \(group_id, user_id\)/);
    expect(quelle).toMatch(/UNIQUE KEY idx_code \(invite_code\)/);
  });

  test('der Einladungscode kommt aus random_bytes, nicht aus wp_create_nonce', async () => {
    // `wp_create_nonce` ist aus Nutzer, Aktion und Tageszeit ABGELEITET
    // und damit vorhersagbar, sobald man die Eingänge kennt. Für CSRF
    // richtig, für einen Schlüssel eine Tür — dieselbe Begründung wie
    // beim CSP-Nonce.
    const quelle = fs.readFileSync(path.join(ROOT, 'includes', 'social', 'freunde-gruppen.php'), 'utf8');
    const fn = quelle.slice(quelle.indexOf('function eb_einladungscode'));
    const koerper = fn.slice(0, fn.indexOf('\n}'));
    expect(koerper).toContain('random_bytes');
    expect(koerper).not.toContain('wp_create_nonce');
    expect(koerper).not.toContain('rand(');
  });
});

test.describe('Der Handle-Nachtrag ist opt-in — ausgeführt, nicht gelesen', () => {
  // ── WARUM DIESER SCHALTER EXISTIERT ───────────────────────────────────
  //
  // Die Doktrin zur Personensuche lautet seit dem 09.09.2026: „Das Setzen
  // IST die Einwilligung." Ein Nachtrag hebt genau das auf — bestehende
  // Konten werden auffindbar, ohne dass jemand etwas gesetzt hat. Das ist
  // eine Aussage in der Datenschutzerklärung, und sie gehört dorthin,
  // BEVOR sie zutrifft.
  //
  // Derselbe Opt-in-Weg wie bei `EB_APPLE_TEAM_ID`: ohne die Konstante
  // bleibt alles, wie es ist. Der Code ist fertig und wartet; er ist nicht
  // abgeschaltet. Eine Zeile in `wp-config.php` startet ihn.
  //
  // Geprüft wird das AUSGEFÜHRT. Ein Muster im Quelltext belegt nur, dass
  // das Wort dasteht — genau daran sind in diesem Projekt schon fünf
  // Prüfungen gescheitert.

  test('ohne die Konstante setzt der Nachtrag keinen einzigen Handle', async () => {
    const s = stand();
    expect(s.nachtrag_ohne_schalter, 'der Nachtrag lief ohne Freigabe').toBe(0);
    expect(s.handles_ohne_schalter, 'ein Bestandskonto wurde ohne Freigabe auffindbar')
      .toEqual(['', '']);
  });

  test('mit der Konstante läuft er wirklich — und die Gegenprobe gehört dazu', async () => {
    // Ohne diese Hälfte bestünde „tut nie etwas" beide Tests, und der
    // Schalter wäre ein Aus-Schalter statt eines Ein-Schalters.
    const s = stand();
    expect(s.nachtrag_mit_schalter, 'der Nachtrag tut auch mit Freigabe nichts')
      .toBeGreaterThanOrEqual(2);
    expect(s.handles_mit_schalter[0]).toBeTruthy();
    expect(s.handles_mit_schalter[1]).toBeTruthy();
  });

  test('Umlaute überleben die Umschrift — auch am Wortanfang', async () => {
    // ── DER FEHLER, DEN ERST DAS AUSFÜHREN GEZEIGT HAT ──────────────────
    //
    // `eb_handle_vorschlag` schrieb zuerst klein und übersetzte danach.
    // `strtolower()` arbeitet BYTEWEISE: „Ä" sind zwei UTF-8-Bytes, keines
    // davon ein ASCII-Großbuchstabe. Der Umlaut erreichte die Tabelle also
    // unverändert, die nur „ä" kannte, und fiel dem `[^a-z0-9._]`-Filter
    // zum Opfer:
    //
    //     „Änne Großmann"  ->  nne.grossmann
    //     „Bo Ötzi"        ->  bo.tzi
    //
    // Das traf jeden Namen, der mit einem Umlaut beginnt — und der Handle
    // ist genau das, wonach andere diese Person suchen.
    const s = stand();
    expect(s.handles_mit_schalter[0], 'der führende Umlaut ist verschwunden')
      .toBe('aenne.grossmann');
    expect(s.handles_mit_schalter[1], 'der Umlaut im zweiten Wort ist verschwunden')
      .toBe('bo.oetzi');
  });

  test('ein zweiter Lauf tut nichts mehr', async () => {
    // Ohne die Abschluss-Marke stünde bei JEDER Anfrage ein `get_users`
    // über alle Konten ohne Handle. Auf dem kleinen PHP-Pool von IONOS ist
    // das genau die Last, die am 22.08.2026 die Website hängen ließ.
    const s = stand();
    expect(s.nachtrag_marke).toBe('fertig');
    expect(s.nachtrag_zweiter_lauf).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Nickname für alle — auffindbar nur mit Zustimmung (15.10.2026)
   ══════════════════════════════════════════════════════════════════════ */

test.describe('Nickname für alle: Vergabe ist keine Zustimmung', () => {
  test('der Nachtrag vergibt Namen VERBORGEN — weder Teil- noch genauer Name findet sie', async () => {
    const n = stand().nick;
    expect(n.nachtrag_auffindbar).toEqual(['0', '0']);
    expect(n.suche_nachtrag_teil.body.results).toEqual([]);
    expect(n.suche_nachtrag_genau.body.results, 'der genaue Name umgeht die Zustimmung').toEqual([]);
  });

  test('wer selbst einschaltet, wird gefunden — ohne dass es als Namenswechsel zählt', async () => {
    const n = stand().nick;
    expect(n.einschalten.status).toBe(200);
    expect(n.einschalten.body.auffindbar).toBe(true);
    expect(n.einschalten_bremse, 'Umschalten verbraucht den Wechsel-Deckel').toBe(0);
    expect(n.suche_nach_einschalten.body.results.map((r) => r.id)).toEqual([900]);
    expect(n.ich_900.body.auffindbar).toBe(true);
  });

  test('ein Namenswechsel macht niemanden still sichtbar', async () => {
    const n = stand().nick;
    expect(n.wechsel_901.status).toBe(200);
    expect(n.wechsel_901.body.auffindbar).toBe(false);
    expect(n.wechsel_901_bleibt).toBe('0');
    expect(n.wechsel_901_bremse).toEqual({ action: 'social_handle', limit: 10, ident: 'u901' });
  });

  test('@ und Großschreibung werden normalisiert, irreführende Varianten sind reserviert', async () => {
    const n = stand().nick;
    expect(n.mit_at.body.handle).toBe('neu.mensch');
    expect(n.res_support.body.error).toBe('handle_gesperrt');
    expect(n.res_admin.body.error).toBe('handle_gesperrt');
    expect(n.res_frei.status, 'die Sperre trifft zu weit').toBe(200);
  });
});

test.describe('Nickname: genau einer bekommt den Namen', () => {
  test('wer die Sperre nicht bekommt, schreibt nichts', async () => {
    const n = stand().nick;
    expect(n.wettlauf_zweiter.status).toBe(503);
    expect(n.wettlauf_zweiter_name, 'geschrieben ohne Sperre').toBe('');
    expect(n.wettlauf_erster.status).toBe(200);
    expect(n.wettlauf_danach.body.error).toBe('handle_vergeben');
    expect(n.wettlauf_besitzer).toBe(951);
  });

  test('die Sperre wird immer wieder freigegeben — auch nach einem Konflikt', async () => {
    expect(stand().nick.sperren_offen).toBe(0);
  });

  test('eine Datenbank ohne Antwort ist „nicht prüfbar", nicht „vergeben"', async () => {
    const n = stand().nick;
    expect(n.sperre_kaputt.status).toBe(503);
    expect(n.sperre_kaputt.body.error).toBe('handle_sperre');
    expect(n.sperre_kaputt_name).toBe('');
  });

  test('die Bremse hält den Namenswechsel auf, nicht das Umschalten', async () => {
    const n = stand().nick;
    expect(n.bremse.status).toBe(429);
    expect(n.bremse_name).toBe('zwilling');
    expect(n.bremse_umschalten.status).toBe(200);
  });

  test('der genaue Treffer steht vorn, auch hinter zehn Teiltreffern', async () => {
    const r = stand().nick.genau_zuerst.body.results;
    expect(r[0].handle).toBe('lena');
    expect(r.length).toBeLessThanOrEqual(10);
  });
});

test.describe('Nickname: die offene Prüfroute', () => {
  test('sie sagt frei, vergeben, ungültig, reserviert — und nie, wem', async () => {
    const n = stand().nick;
    expect(n.frei_vergeben.body.status).toBe('vergeben');
    expect(n.frei_frei.body.status).toBe('frei');
    expect(n.frei_kurz.body.status).toBe('ungueltig');
    expect(n.frei_gesperrt.body.status).toBe('gesperrt');
    for (const k of ['frei_vergeben', 'frei_frei', 'frei_kurz', 'frei_gesperrt', 'frei_verborgen']) {
      expect(Object.keys(n[k].body).sort(), `${k} verrät mehr als den Zustand`).toEqual(['status', 'vorschlaege']);
    }
  });

  test('Vorschläge sind wirklich frei', async () => {
    const n = stand().nick;
    expect(n.frei_vergeben.body.vorschlaege.length).toBeGreaterThan(0);
    expect(n.frei_vorschlag_besitzer.every((b) => b === 0)).toBe(true);
    expect(n.frei_vergeben.body.vorschlaege, 'lena1 ist vergeben und wird trotzdem vorgeschlagen').not.toContain('lena1');
  });

  test('der eigene Name ist für einen selbst frei', async () => {
    expect(stand().nick.frei_eigener.body.status).toBe('frei');
  });

  test('abgemeldet hängt der Deckel an der Leitung', async () => {
    expect(stand().nick.frei_eimer).toEqual({ action: 'social_handle_frei', limit: 60, ident: null });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Probelauf der Nickname-Vergabe (Briefing N01) — zählt, plant, schreibt nichts
   ══════════════════════════════════════════════════════════════════════ */

test.describe('Nickname-Probelauf: erst sehen, dann umlegen', () => {
  test('er schreibt NICHTS — kein Meta, keine Option, keine Sperre', async () => {
    const p = stand().probe;
    expect(p.unveraendert, 'der Probelauf hat den Zustand verändert').toBe(true);
    expect(p.keine_sperre, 'der Probelauf hat die Namenssperre angefasst').toBe(true);
    expect(p.lauf.probelauf).toBe(true);
  });

  test('die Zählung geht auf: jedes Konto steht in genau einer Spalte', async () => {
    const { lauf, nutzer_gesamt, ohne_schluessel } = stand().probe;
    const z = lauf.zaehlung;
    expect(z.konten).toBe(nutzer_gesamt);
    expect(z.gueltig + z.fehlt + z.geleert + z.ungueltig).toBe(z.konten);
    expect(z.auffindbar + z.verborgen).toBe(z.gueltig);
    expect(z.fehlt).toBe(ohne_schluessel);
    expect(lauf.plan.wuerde_vergeben + lauf.plan.ohne_vorschlag).toBe(z.fehlt);
  });

  test('zwei gleiche Namen bekommen in der Planung zwei verschiedene Nicknames', async () => {
    const v = stand().probe.lauf.vorschau;
    const name = (id) => (v.find((e) => e.id === id) || {}).nickname;
    expect(name(1000)).toBe('max.mustermann');
    expect(name(1001)).toBe('max.mustermann1');
    const alle = v.map((e) => e.nickname);
    expect(new Set(alle).size, 'die Planung vergibt einen Namen doppelt').toBe(alle.length);
  });

  test('ohne brauchbaren Namen: Login-Rest oder neutral, nie leer, nie reserviert', async () => {
    const { lauf } = stand().probe;
    const name = (id) => (lauf.vorschau.find((e) => e.id === id) || {}).nickname;
    expect(name(1002)).toBe('u1002');
    expect(name(1003)).toBe('eventfan.1003');
    expect(lauf.plan.davon_neutral).toBeGreaterThanOrEqual(1);
  });

  test('Altlasten werden benannt: ungültige und doppelte Namen, mit Konto', async () => {
    const { lauf } = stand().probe;
    expect(lauf.ungueltig).toContain(1004);
    expect(lauf.doppelt).toContainEqual([1005, 1006]);
  });

  test('wer seinen Namen zurückzieht, behält den Schlüssel — und fällt aus der Planung', async () => {
    const p = stand().probe;
    expect(p.leeren.status).toBe(200);
    expect(p.leeren_schluessel, 'Leeren löscht den Schlüssel — der Nachtrag hielte das für „nie gehabt"').toBe(true);
    expect(p.lauf.vorschau.map((e) => e.id)).not.toContain(1010);
    expect(p.lauf.zaehlung.geleert).toBeGreaterThanOrEqual(1);
  });

  test('der Bericht nennt keine Anzeigenamen und keine E-Mail', async () => {
    const roh = JSON.stringify(stand().probe.lauf);
    for (const verboten of ['Max Mustermann', 'Support Team', 'Doppel A', '@', 'display_name', 'user_login']) {
      expect(roh, `der Bericht enthält „${verboten}"`).not.toContain(verboten);
    }
  });

  test('der Deckel greift und wird gemeldet', async () => {
    const g = stand().probe.gedeckelt;
    expect(g.abgeschnitten).toBe(true);
    expect(g.zaehlung.konten).toBe(3);
  });

  test('die Route ist nur für die Verwaltung, nur lesend', async () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const { phpOhneKommentare } = require('./lib/php-code');
    const php = phpOhneKommentare(fs.readFileSync(path.join(__dirname, '..', '..', 'functions.php'), 'utf8'));
    const m = php.match(/register_rest_route\(\s*'eventboerse\/v1',\s*'\/hq\/nicknames',\s*array\(([\s\S]*?)\)\s*\);/);
    expect(m, 'die Route /hq/nicknames ist nicht registriert').not.toBeNull();
    expect(m[1]).toMatch(/'methods'\s*=>\s*'GET'/);
    expect(m[1]).toMatch(/'permission_callback'\s*=>\s*'eb_hq_verwaltung_darf'/);
    expect(stand().probe.route).toBe(200);
  });
});
