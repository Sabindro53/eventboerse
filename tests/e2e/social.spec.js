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

  test('jede Route verlangt eine Anmeldung', async () => {
    const d = stand();
    expect(d.routen.length, 'es sind gar keine Routen registriert').toBeGreaterThanOrEqual(14);
    for (const r of d.routen) {
      expect(r.erlaubnis, `${r.methoden} ${r.pfad} ist offen`).toBe('is_user_logged_in');
    }
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
    expect(fn, 'eb_create_tables() legt die Social-Tabellen nicht an')
      .toMatch(/foreach\s*\(\s*eb_social_tabellen_sql\(\)\s*as/);
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
    expect(block,
      'die Social-Tabellen werden bei der Migration nicht nachgeprüft — '
      + 'dann gilt sie als erledigt, auch wenn eine Tabelle fehlt')
      .toMatch(/foreach\s*\(\s*eb_social_tabellen_sql\(\)\s*as/);
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
