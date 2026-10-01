/* ==================== ASSISTENT: SPRECHEN UND HÖREN ====================
 *
 * Der Planungs-Assistent konnte bis zum 01.10.2026 nur getippt werden. Das
 * HQ sprach längst — über `/hq/stimme` und `/hq/gehoer`, serverseitig, mit
 * echtem Modell statt der blechernen Stimme des Betriebssystems. Für die
 * Website gab es davon nichts.
 *
 * Die Mechanik liegt auf dem Server (`includes/stimme/sprachdienst.php`) und
 * wird mit dem HQ geteilt; hier steht nur der Weg dorthin. Fünf
 * Entscheidungen tragen das, und sie sind alle an einem Fehler gelernt, der
 * in diesem Projekt schon einmal passiert ist.
 *
 * 1 · KEIN DAUERHAFT OFFENES MIKROFON. Ein Druck ist EINE Aufnahme: sie
 *     endet bei Stille, nach `MAX_MS`, oder beim zweiten Druck. Das HQ hat
 *     am 22.08.2026 die andere Variante gehabt — das Mikrofon ging 120 ms
 *     nach der Sprachausgabe von selbst wieder auf, hörte seinen eigenen
 *     Nachhall und antwortete darauf. Gemeldet wurde es als „redet einfach
 *     so, ohne dass ich was frage". Dort brauchte es danach eine
 *     Echo-Erkennung, eine Runden-Grenze und eine Eichung des Pegels, um
 *     den Zustand wieder einzufangen. Hier gibt es die Klasse nicht, weil
 *     es die Schleife nicht gibt.
 *
 * 2 · GESPROCHEN WIRD NUR AUF WUNSCH. Der Schalter ist aus, bis ihn jemand
 *     einschaltet, und die Wahl bleibt gespeichert. Ein Assistent, der
 *     unaufgefordert zu sprechen anfängt, ist in einem Büro oder einer Bahn
 *     ein Übergriff — und er kostet Geld für eine Ausgabe, die niemand
 *     wollte.
 *
 * 3 · DIE KONVERSATION STEHT IM CHAT. Das Gesprochene läuft durch
 *     `_aiUserSays()`, also durch denselben Weg wie das Getippte: eigene
 *     Sprechblase, Antwort darunter, im Verlauf gespeichert. Eine
 *     Sprachbedienung ohne Mitschrift ist nicht nachvollziehbar — man weiß
 *     hinterher nicht, ob falsch verstanden oder falsch geantwortet wurde.
 *
 * 4 · DER RÜCKFALL IST HÖRBAR. Fehlt der Serverschlüssel, ist das Konto
 *     abgemeldet oder greift der Tagesdeckel, spricht `speechSynthesis` des
 *     Betriebssystems. Dieselbe Begründung wie im HQ: eine Sprachausgabe,
 *     die still bleibt, ist für den Nutzer von einem Absturz nicht zu
 *     unterscheiden.
 *
 * 5 · DAS MIKROFON WIRD IMMER FREIGEGEBEN. Jeder Ausgang stoppt die Spuren
 *     des `MediaStream`. Ein Mikrofon, das nach dem Beenden weiterläuft,
 *     ist ein Datenschutzproblem und kein Schönheitsfehler.
 */

/** Längste Aufnahme. Eine Suchanfrage braucht fünf Sekunden, nicht fünf Minuten. */
var EB_STIMME_MAX_MS = 15000;
/** Ohne ein Wort passiert nach dieser Zeit nichts mehr — Stille kostet und liefert nichts. */
var EB_STIMME_LEER_MS = 6000;
/** So lange Ruhe nach dem letzten Laut gilt als „ausgesprochen". */
var EB_STIMME_STILLE_MS = 900;
/** Der Schalterzustand. Funktional, nicht profilbildend — siehe Cookie-Liste.md. */
var EB_STIMME_SCHLUESSEL = 'eb_assistent_stimme_v1';

// Der Schalterzustand DIESER Sitzung. Gemessen am 01.10.2026: ohne
// Cookie-Einwilligung verweigert `ebSpeichern()` den nicht-essenziellen
// Schlüssel — richtig, aber `localStorage` blieb dann leer, und
// `ebStimmeAn()` las weiter `false`. Der Knopf liess sich druecken und tat
// nichts: „sieht heil aus und tut nichts", die teuerste Schadensart dieses
// Projekts, und sie traf genau die Nutzer, die Speicherung abgelehnt haben.
//
// Jetzt traegt der Zustand die Sitzung, und `ebSpeichern()` entscheidet nur
// noch, ob er das Neuladen UEBERLEBT. Genau das bedeutet „keine
// Speicherung" — nicht „keine Funktion".
var _ebStimmeWunsch = null;     // null = noch nicht gefragt
var _ebStimmeAudio = null;      // laufende Serverausgabe
var _ebStimmeAufnahme = null;   // { rec, stream, timer, stilleTimer }
var _ebStimmeServer = null;     // null = ungefragt, true/false = gemessen

/* ─── Der Schalter ──────────────────────────────────────────── */

function ebStimmeAn() {
  if (_ebStimmeWunsch === null) {
    // Einmal nachsehen, ob eine frühere Sitzung das speichern durfte.
    try { _ebStimmeWunsch = localStorage.getItem(EB_STIMME_SCHLUESSEL) === '1'; }
    catch (e) { _ebStimmeWunsch = false; }
  }
  return _ebStimmeWunsch;
}

function ebStimmeUmschalten() {
  var neu = !ebStimmeAn();
  _ebStimmeWunsch = neu;
  // ebSpeichern(), nicht localStorage.setItem(): der Schlüssel ist nicht
  // essenziell, und ohne diesen Weg wäre die Einwilligung hier wirkungslos.
  // recht.spec.js bricht sonst ab. Ob es ankommt, entscheidet die
  // Einwilligung — die Funktion oben hängt nicht davon ab.
  ebSpeichern(EB_STIMME_SCHLUESSEL, neu ? '1' : '0');
  if (!neu) ebStimmeStoppen();
  ebStimmeKnopfAuffrischen();
  if (neu) {
    // Eine Bestätigung, die man HÖRT, belegt das Einschalten. Eine stille
    // Zusage wäre von einem defekten Schalter nicht zu unterscheiden.
    ebAssistentSprechen('Sprachausgabe ist an. Frag mich einfach.');
  }
  return neu;
}

function ebStimmeKnopfAuffrischen() {
  var k = document.getElementById('baiVoiceToggle');
  if (!k) return;
  var an = ebStimmeAn();
  k.classList.toggle('an', an);
  k.setAttribute('aria-pressed', an ? 'true' : 'false');
  k.setAttribute('title', an ? 'Sprachausgabe aus' : 'Sprachausgabe an');
  k.setAttribute('aria-label', an ? 'Sprachausgabe ausschalten' : 'Sprachausgabe einschalten');
  var ico = k.querySelector('.material-icons-round');
  if (ico) ico.textContent = an ? 'volume_up' : 'volume_off';
}

/* ─── Sprechen ──────────────────────────────────────────────── */

/**
 * Jede Stelle, die das Sprechen beendet, ruft DIESE Funktion.
 *
 * Nicht `speechSynthesis.cancel()` allein — dieselbe Regel wie im HQ: sonst
 * spricht die Serverstimme weiter, während der Browser schon still ist.
 */
function ebStimmeStoppen() {
  if (_ebStimmeAudio) {
    try { _ebStimmeAudio.pause(); } catch (e) {}
    _ebStimmeAudio = null;
  }
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
}

/**
 * HTML einer Chat-Antwort in SPRECHBAREN Text verwandeln.
 *
 * Die Ligaturen müssen raus. `<span class="material-icons-round">search</span>`
 * hat den Textinhalt „search" — vorgelesen würde der Assistent mitten im
 * Satz „search" sagen. Genau diese Falle stand am 15.09.2026 in der
 * Barrierefreiheit: vier Icon-Spans wurden von einem Screenreader
 * mitgelesen, nachdem die Beschriftungen repariert waren. Eine Reparatur,
 * die man zu Ende messen muss, statt sie zu beschliessen.
 *
 * UND DIE KNOEPFE MUESSEN RAUS. Gemessen am 01.10.2026 las die erste
 * Fassung „Max Beats 4.9 · 450–700€ / Event **Ansehen + Board**" vor — die
 * Beschriftungen der Schaltflächen. Gesprochen wird, was GESAGT wird, nicht
 * was klickbar ist: eine Stimme kann nicht klicken, und eine Aufforderung
 * zum Drücken, die man nur hört, ist eine Sackgasse. Die Knöpfe bleiben im
 * Chat sichtbar — das ist ihr Platz.
 *
 * Gearbeitet wird über einen abgetrennten DOM-Baum, nicht mit einem
 * Ausdruck über `<[^>]*>`: ein Ausdruck trifft auch ein `<` im Text und
 * wirft den Rest weg. Derselbe Griff wie bei den Kommentar-Entfernern.
 */
function ebStimmeTextAusHtml(html) {
  var huelle = document.createElement('div');
  huelle.innerHTML = String(html || '');
  huelle.querySelectorAll(
    '.material-icons-round, .bai-cat-emoji, .bai-lcard-img, ' +
    'button, .bai-actions, .bai-lcard-acts, script, style'
  ).forEach(function(n) { n.remove(); });
  // Blockgrenzen tragen die Satzzeichen. `textContent` kennt sie nicht —
  // ohne diesen Schritt wird aus „…für DJ & Musik:</b></div><div>Max Beats"
  // das Wort „MusikMax", und die Stimme stolpert mitten im Satz.
  // VON INNEN NACH AUSSEN. `querySelectorAll` liefert Dokumentreihenfolge,
  // also den Umschlag VOR seinen Karten — der Umschlag sah dann noch keinen
  // Punkt, hängte einen an, und der landete hinter dem der letzten Karte:
  // „… Event. .". Umgedreht sieht jeder Elternknoten die fertigen Kinder.
  Array.prototype.slice.call(huelle.querySelectorAll('div, p, li, h1, h2, h3, h4, tr'))
    .reverse().forEach(function(n) {
      var vorher = (n.textContent || '').trim();
      if (!vorher) return;
      // Trennzeichen DAVOR, nicht nur danach: der Fliesstext vor einer
      // Kartenliste ist ein blankes Textknoten-Geschwister und bekäme sonst
      // nichts — gemessen wurde „…für DJ & Musik:Max Beats".
      n.insertBefore(document.createTextNode(' '), n.firstChild);
      n.appendChild(document.createTextNode(/[.,:;!?]$/.test(vorher) ? ' ' : '. '));
    });
  var t = (huelle.textContent || '').replace(/\s+/g, ' ').trim();
  // Emojis vorzulesen ergibt „Pizzastück" mitten im Satz. Weg damit, aber
  // nur die Bildzeichen — Ziffern, Umlaute und Interpunktion bleiben.
  t = t.replace(/[←-⇿⌀-➿⬀-⯿️‍]/g, '')
       .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
       .replace(/\s+/g, ' ').trim();
  return t.slice(0, 600);
}

/**
 * Sprechen — zuerst über den Server, hörbar zurückfallend.
 *
 * Das Ergebnis der Serverfrage wird EINMAL gemerkt (`_ebStimmeServer`).
 * Sonst kostet jede Antwort einen Aufruf für einen Schlüssel, den es nicht
 * gibt — dieselbe Regel wie im HQ.
 */
function ebAssistentSprechen(text) {
  var t = String(text || '').trim();
  if (!t) return Promise.resolve(false);
  ebStimmeStoppen();

  if (_ebStimmeServer === false) return Promise.resolve(ebStimmeSystem(t));

  if (!isLoggedIn) {
    // Angemeldet ist Voraussetzung der Route (Kostenschutz). Das ist kein
    // Defekt, also wird es nicht als einer behandelt: es wird gesprochen,
    // nur mit der Stimme des Geräts.
    return Promise.resolve(ebStimmeSystem(t));
  }

  return _fetchWithTimeout(_apiUrl('assistent/stimme'), {
    method: 'POST',
    headers: _apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text: t })
  }, 20000).then(function(r) { return r.json(); }).then(function(d) {
    if (!d || !d.verfuegbar || !d.audio) {
      // Ein 429 ist VORÜBERGEHEND — den Server deswegen für die ganze
      // Sitzung abzuschreiben wäre derselbe Fehler wie ein gemerktes
      // abgelehntes Versprechen im Stripe-Lader: eine Minute Deckel
      // kostete dann die ganze Sitzung.
      if (!d || d.verfuegbar === false) {
        var dauerhaft = /nicht hinterlegt/i.test(String(d && d.grund || ''));
        if (dauerhaft) _ebStimmeServer = false;
      }
      return ebStimmeSystem(t);
    }
    _ebStimmeServer = true;
    var a = new Audio('data:audio/' + (d.format || 'mp3') + ';base64,' + d.audio);
    _ebStimmeAudio = a;
    // Scheitert das Abspielen (Autoplay-Sperre, kaputte Daten), darf nicht
    // einfach Stille bleiben.
    a.onerror = function() { if (_ebStimmeAudio === a) { _ebStimmeAudio = null; ebStimmeSystem(t); } };
    a.onended = function() { if (_ebStimmeAudio === a) _ebStimmeAudio = null; };
    var p = a.play();
    if (p && p.catch) p.catch(function() { if (_ebStimmeAudio === a) { _ebStimmeAudio = null; ebStimmeSystem(t); } });
    return true;
  }).catch(function() {
    // Netzfehler ist nicht „kein Schlüssel" — nicht merken, nur zurückfallen.
    return ebStimmeSystem(t);
  });
}

/** Der hörbare Rückfall. Gibt zurück, ob überhaupt etwas klingt. */
function ebStimmeSystem(text) {
  try {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return false;
    var u = new SpeechSynthesisUtterance(String(text || ''));
    u.lang = 'de-DE';
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

/** Antwort des Assistenten vorlesen — nur wenn der Schalter an ist. */
function ebAssistentAntwortSprechen(html) {
  if (!ebStimmeAn()) return;
  var t = ebStimmeTextAusHtml(html);
  if (t) ebAssistentSprechen(t);
}

/* ─── Hören ─────────────────────────────────────────────────── */

function ebStimmeHoertZu() {
  return !!_ebStimmeAufnahme;
}

function ebMikroKnopfAuffrischen() {
  var k = document.getElementById('baiMic');
  if (!k) return;
  var an = ebStimmeHoertZu();
  k.classList.toggle('hoert', an);
  k.setAttribute('aria-pressed', an ? 'true' : 'false');
  k.setAttribute('title', an ? 'Aufnahme beenden' : 'Per Sprache fragen');
  k.setAttribute('aria-label', an ? 'Aufnahme beenden' : 'Per Sprache fragen');
  var ico = k.querySelector('.material-icons-round');
  if (ico) ico.textContent = an ? 'stop_circle' : 'mic';
}

/**
 * Aufnahme in JEDEM Ausgang abbauen.
 *
 * Eine Funktion, nicht drei Stellen: beim HQ hing genau daran die Regel
 * „neue Stelle, die das Gespräch beendet → `aufnahmeBeenden()` mit
 * aufrufen". Wer hier einen Weg hinzufügt und das Aufräumen vergisst, lässt
 * das Mikrofon offen.
 */
function ebMikroAbbauen() {
  var a = _ebStimmeAufnahme;
  _ebStimmeAufnahme = null;
  if (!a) return;
  if (a.timer) clearTimeout(a.timer);
  if (a.stilleTimer) clearTimeout(a.stilleTimer);
  if (a.pegelTimer) clearInterval(a.pegelTimer);
  try { if (a.rec && a.rec.state !== 'inactive') a.rec.stop(); } catch (e) {}
  try { if (a.ctx && a.ctx.close) a.ctx.close(); } catch (e) {}
  // Die Spuren zuletzt: solange eine lebt, leuchtet die Aufnahme-Anzeige
  // des Browsers, und für den Nutzer hört das Gerät weiter zu.
  try { (a.stream.getTracks() || []).forEach(function(t) { t.stop(); }); } catch (e) {}
  ebMikroKnopfAuffrischen();
}

function ebAssistentMikro() {
  if (ebStimmeHoertZu()) { ebMikroAbbauen(); return; }
  ebStimmeStoppen();

  if (!isLoggedIn) {
    // Ein Mikrofon, das nichts tut und nichts sagt, ist von einem Defekt
    // nicht zu unterscheiden. Also wird der Grund genannt — und der Weg.
    _aiPushMsg('ai', 'Sprache braucht ein Konto — die Erkennung läuft über unseren Server, ' +
      'und ohne Anmeldung gibt es niemanden, dem die Nutzung zugeordnet wäre. ' +
      'Tippen funktioniert natürlich weiterhin.' +
      '<div class="bai-actions"><button type="button" class="bai-act primary" onclick="openModal(\'loginModal\')">' +
      '<span class="material-icons-round">login</span> Anmelden</button></div>');
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    _aiPushMsg('ai', 'Dieser Browser gibt kein Mikrofon her. Schreib mir einfach, was du suchst.');
    return;
  }

  navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true }
  }).then(function(stream) {
    var rec, stuecke = [];
    try { rec = new MediaRecorder(stream); }
    catch (e) {
      try { (stream.getTracks() || []).forEach(function(t) { t.stop(); }); } catch (e2) {}
      _aiPushMsg('ai', 'Die Aufnahme ließ sich nicht starten. Schreib mir einfach, was du suchst.');
      return;
    }

    var a = { rec: rec, stream: stream, timer: null, stilleTimer: null, pegelTimer: null, ctx: null, hatLaut: false };
    _ebStimmeAufnahme = a;
    ebMikroKnopfAuffrischen();

    rec.ondataavailable = function(ev) { if (ev.data && ev.data.size) stuecke.push(ev.data); };
    rec.onstop = function() {
      var blob = new Blob(stuecke, { type: (stuecke[0] && stuecke[0].type) || 'audio/webm' });
      // Nichts gesprochen: KEIN Aufruf. Stille erkennen zu lassen kostet
      // und liefert nichts — und Whisper erfindet bei Stille Text.
      if (!a.hatLaut || blob.size < 1200) return;
      ebMikroSenden(blob);
    };

    // Pegel messen, um Stille zu erkennen. GEEICHT statt fest: eine feste
    // Schwelle ist auf dem einen Gerät taub und auf dem anderen ein
    // Dauerauslöser — dieselbe Lehre wie beim Mithören im HQ.
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        var ctx = new AC();
        a.ctx = ctx;
        var an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(an);
        var buf = new Uint8Array(an.fftSize);
        var grund = null, proben = [];
        a.pegelTimer = setInterval(function() {
          if (!_ebStimmeAufnahme) return;
          an.getByteTimeDomainData(buf);
          var summe = 0;
          for (var i = 0; i < buf.length; i++) { var d = buf[i] - 128; summe += d * d; }
          var pegel = Math.sqrt(summe / buf.length);
          if (grund === null) {
            proben.push(pegel);
            if (proben.length >= 6) {
              grund = proben.reduce(function(x, y) { return x + y; }, 0) / proben.length;
            }
            return;
          }
          var schwelle = Math.max(grund * 3.5, 2.2);
          if (pegel > schwelle) {
            a.hatLaut = true;
            if (a.stilleTimer) { clearTimeout(a.stilleTimer); a.stilleTimer = null; }
          } else if (a.hatLaut && !a.stilleTimer) {
            a.stilleTimer = setTimeout(function() { ebMikroAbbauen(); }, EB_STIMME_STILLE_MS);
          }
        }, 100);
      } else {
        // Ohne Pegelmessung keine Stille-Erkennung — dann gilt der Laut als
        // gegeben, sonst käme nie etwas an. Lieber ein Aufruf zu viel als
        // ein Mikrofon, das grundsätzlich nichts liefert.
        a.hatLaut = true;
      }
    } catch (e) { a.hatLaut = true; }

    a.timer = setTimeout(function() { ebMikroAbbauen(); }, EB_STIMME_MAX_MS);
    // Wer gar nichts sagt, soll nicht fünfzehn Sekunden warten.
    setTimeout(function() { if (_ebStimmeAufnahme === a && !a.hatLaut) ebMikroAbbauen(); }, EB_STIMME_LEER_MS);
    rec.start();
  }).catch(function() {
    _ebStimmeAufnahme = null;
    ebMikroKnopfAuffrischen();
    _aiPushMsg('ai', 'Ich habe keinen Zugriff auf das Mikrofon bekommen. ' +
      'Du kannst die Freigabe in der Adressleiste erteilen — oder einfach schreiben.');
  });
}

function ebMikroSenden(blob) {
  _aiTyping(true);
  var leser = new FileReader();
  leser.onerror = function() { _aiTyping(false); };
  leser.onload = function() {
    var roh = String(leser.result || '');
    var komma = roh.indexOf(',');
    var b64 = komma >= 0 ? roh.slice(komma + 1) : '';
    if (!b64) { _aiTyping(false); return; }
    _fetchWithTimeout(_apiUrl('assistent/gehoer'), {
      method: 'POST',
      headers: _apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ audio: b64 })
    }, 35000).then(function(r) { return r.json(); }).then(function(d) {
      _aiTyping(false);
      if (!d || !d.verfuegbar) {
        _aiPushMsg('ai', 'Die Spracherkennung ist gerade nicht verfügbar' +
          (d && d.grund ? ' (' + _escHtml(String(d.grund)) + ')' : '') +
          '. Schreib mir einfach, was du suchst.');
        return;
      }
      var text = String(d.text || '').trim();
      if (!text) {
        // „Nichts verstanden" ist etwas anderes als „Störung", und der
        // Unterschied gehört dem Nutzer. Dasselbe Prinzip wie bei den vier
        // leeren Zuständen der Jetzt-Ansicht.
        _aiPushMsg('ai', d.phantom
          ? 'Da war nur Stille — ich habe nichts gezählt. Drück nochmal und sag einfach, was du suchst.'
          : 'Ich habe nichts verstanden. Probier es noch einmal, etwas näher am Mikrofon.');
        return;
      }
      // DURCH DEN NORMALEN WEG: eigene Sprechblase, Antwort darunter, im
      // Verlauf gespeichert. Ein zweiter Pfad für Sprache wäre eine zweite
      // Wahrheit, und das Gesagte stünde nicht im Chat.
      _aiUserSays(text);
    }).catch(function() {
      _aiTyping(false);
      _aiPushMsg('ai', 'Die Spracherkennung war nicht erreichbar. Schreib mir einfach, was du suchst.');
    });
  };
  leser.readAsDataURL(blob);
}
