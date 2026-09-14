/* ═══════════════════════════════════════════════════════════════════════
   DIENSTLEISTER-TERMINE — „was steht wann an"
   ═══════════════════════════════════════════════════════════════════════

   ── DER BEFUND, AM 14.09.2026 IM ECHTEN BROWSER GEMESSEN ──────────────

   `/auftraege` ist die Tagesseite des Dienstleisters. Drei Aufträge
   gestellt (24.12., 20.09., 05.10.), dann nachgesehen, was dort steht:

     Reihenfolge der Karten : 24.12. → 20.09. → 05.10.   (unsortiert)
     Uhrzeit auf der Seite  : nirgends
     Wege zu einer Tagesansicht in der ganzen App : 0

   Die Reihenfolge ist die, in der die Projekte zufällig im Board-Blob
   liegen. Der nächste Termin stand in der Mitte, Heiligabend oben. Bei
   drei Aufträgen sortiert man im Kopf; bei fünfzehn nicht mehr, und
   dann übersieht man den von übermorgen.

   **Die Zeit war die ganze Zeit da.** `card.times` trägt sie seit den
   Mehrfachzeiten — Fotograf zur Trauung UND zur Party. Das Board zeigt
   sie, der Ablauf zeigt sie, und ausgerechnet der Mensch, der hinfahren
   muss, sah nur ein Datum. Dieselbe Klasse wie der Aktivitäten-Bestand,
   der neben einer erfundenen Terminliste lag: gebaut, geprüft,
   ausgeliefert — es fehlte allein die Verbindung.

   ── WARUM KEINE EIGENE SEITE /termine ─────────────────────────────────

   Eine zweite Seite wäre eine zweite Liste derselben Aufträge, also eine
   zweite Wahrheit — und die driftet. Dieselbe Begründung, aus der die
   Seitenleiste den Aktivitäten-Bestand liest, statt einen zweiten Lader
   zu bauen. Die Tagesansicht IST das Auftragsboard, richtig geordnet.

   ── DREI REGELN, AN DENEN DIE RICHTIGKEIT HÄNGT ───────────────────────

   1. **Kein Auftrag fällt heraus.** Auch einer ohne Datum nicht. Ein
      Auftrag, den eine Gruppierung verschluckt, ist schlimmer als eine
      schlechte Reihenfolge: er ist weg, und niemand bekommt eine
      Meldung. Deshalb hat „Ohne Datum" eine eigene Gruppe.
   2. **Vergangenes wird getrennt, nicht geworfen.** Ein Auftrag von
      gestern trägt weiter Knöpfe — Erbringung bestätigen, Zahlung,
      Storno. Ihn wegzufiltern nähme dem Dienstleister die Arbeit, die
      gerade ansteht. Er gehört nur nicht unter „als Nächstes".
   3. **„Heute" wird lokal gerechnet.** Ein Vergleich über
      `Date.parse()` misst UTC; wer um 00:30 deutscher Zeit nachsieht,
      bekäme sonst den gestrigen Tag als „heute" angeboten.
   ═══════════════════════════════════════════════════════════════════════ */

/** Wie viele Tage voraus eine Gruppe ihren Wochentag ausschreibt. */
var EB_TERMIN_WOCHE = 7;

var EB_TERMIN_WOCHENTAGE = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag',
];

/**
 * Der lokale Tag als `YYYY-MM-DD`.
 *
 * `toISOString()` wäre der kürzere Weg und der falsche: es rechnet nach
 * UTC um. In Deutschland liegt der Umschlag damit je nach Jahreszeit ein
 * oder zwei Stunden vor Mitternacht — wer abends um 23:30 nachsieht,
 * bekäme den morgigen Tag als „heute".
 */
function ebTerminTag(datum) {
  var d = datum instanceof Date ? datum : new Date();
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-'
    + ('0' + (d.getMonth() + 1)).slice(-2) + '-'
    + ('0' + d.getDate()).slice(-2);
}

/** Das Datum eines Auftrags, normalisiert — oder '' wenn keins da ist. */
function ebAuftragDatum(job) {
  if (!job || !job.project) return '';
  return (typeof _toIsoDate === 'function' ? _toIsoDate(job.project.date) : '') || '';
}

/**
 * Die Zeiten eines Auftrags.
 *
 * Gelesen wird über `ebKartenZeiten()`, den unterstützten Griff — nie
 * `card.startTime` direkt. Wer den Spiegel liest statt der Liste, zeigt
 * bei einer Position mit zwei Einsätzen nur den ersten an.
 */
function ebAuftragZeiten(job) {
  if (!job || !job.card) return [];
  if (typeof ebKartenZeiten !== 'function') return [];
  return ebKartenZeiten(job.card);
}

/**
 * Eine Zeitspanne als Text. Offenes Ende bleibt offen.
 *
 * „ab 20:00" ist die ehrliche Auskunft, wenn kein Ende eingetragen ist.
 * „20:00 – 20:00" wäre erfunden, und der Dienstleister plante danach.
 */
function ebTerminZeitText(zeit) {
  if (!zeit || !zeit.start) return '';
  return zeit.end ? zeit.start + '–' + zeit.end : 'ab ' + zeit.start;
}

/** Alle Zeiten eines Auftrags als eine Zeile. */
function ebAuftragZeitText(job) {
  var zeiten = ebAuftragZeiten(job);
  if (!zeiten.length) return '';
  var texte = [];
  for (var i = 0; i < zeiten.length; i++) texte.push(ebTerminZeitText(zeiten[i]));
  return texte.join(' · ');
}

/**
 * Sortierschlüssel: Datum, dann erste Uhrzeit.
 *
 * Ein Auftrag OHNE Datum bekommt einen Schlüssel, der hinten einsortiert
 * — nicht vorn. Ein leerer String sortierte vor jedem Datum und schöbe
 * ausgerechnet den Auftrag nach oben, über den am wenigsten bekannt ist.
 */
function ebAuftragSchluessel(job) {
  var datum = ebAuftragDatum(job);
  if (!datum) return '9999-99-99 99:99';
  var zeiten = ebAuftragZeiten(job);
  return datum + ' ' + (zeiten.length ? zeiten[0].start : '99:99');
}

/** Die Überschrift einer Tagesgruppe. */
function ebTerminTagTitel(iso, heute) {
  if (iso === heute) return 'Heute';
  var tag = new Date(iso + 'T12:00:00');
  var jetzt = new Date(heute + 'T12:00:00');
  if (isNaN(tag.getTime()) || isNaN(jetzt.getTime())) return iso;
  var tage = Math.round((tag - jetzt) / 86400000);
  var datum = typeof _formatDateDe === 'function' ? _formatDateDe(iso) : iso;
  if (tage === 1) return 'Morgen · ' + datum;
  if (tage > 1 && tage <= EB_TERMIN_WOCHE) {
    return EB_TERMIN_WOCHENTAGE[tag.getDay()] + ' · ' + datum;
  }
  return EB_TERMIN_WOCHENTAGE[tag.getDay()] + ', ' + datum;
}

/**
 * Aufträge zu Tagesgruppen ordnen.
 *
 * `jetzt` ist eine Naht für den Prüfstand: ohne sie müsste ein Test die
 * Systemuhr stellen oder mit echten Daten rechnen, und „Heute" wäre
 * morgen ein anderer Fall. Im Betrieb bleibt der Parameter leer.
 *
 * Reihenfolge der Gruppen: die nächsten Tage aufsteigend, danach die
 * ohne Datum, ganz zuletzt das Vergangene.
 */
function ebAuftraegeGruppieren(jobs, jetzt) {
  var liste = Array.isArray(jobs) ? jobs.slice() : [];
  var heute = ebTerminTag(jetzt);

  liste.sort(function (a, b) {
    var sa = ebAuftragSchluessel(a), sb = ebAuftragSchluessel(b);
    return sa < sb ? -1 : (sa > sb ? 1 : 0);
  });

  var kommend = [];
  var register = {};
  var ohneDatum = [];
  var vergangen = [];

  for (var i = 0; i < liste.length; i++) {
    var job = liste[i];
    var iso = ebAuftragDatum(job);
    if (!iso) { ohneDatum.push(job); continue; }
    if (iso < heute) { vergangen.push(job); continue; }
    if (!register[iso]) {
      register[iso] = { schluessel: iso, titel: ebTerminTagTitel(iso, heute), heute: iso === heute, jobs: [] };
      kommend.push(register[iso]);
    }
    register[iso].jobs.push(job);
  }

  if (ohneDatum.length) {
    kommend.push({ schluessel: 'ohne-datum', titel: 'Ohne Datum', heute: false, jobs: ohneDatum });
  }
  if (vergangen.length) {
    // Das Jüngste zuerst: was gerade vorbei ist, braucht am ehesten noch
    // einen Handgriff (Erbringung bestätigen, Zahlung, Storno).
    vergangen.reverse();
    kommend.push({ schluessel: 'vergangen', titel: 'Vergangen', heute: false, vergangen: true, jobs: vergangen });
  }
  return kommend;
}
