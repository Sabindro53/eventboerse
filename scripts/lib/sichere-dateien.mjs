// Der freigegebene Rahmen des Autopiloten — kleine, nicht-sensible
// Frontend-Dateien.
//
// Warum eigene Datei: der Auftragsstrom (scripts/auftragsstrom.mjs) muss
// GENAU denselben Rahmen kennen wie der Autopilot. Eine Kopie waere ein
// Drift-Risiko mit Sicherheitsfolge: der Strom koennte eine Aufgabe
// anbieten, die der Autopilot gar nicht anfassen darf — und ein Vorschlag,
// der immer abgelehnt wird, ist schlimmer als keiner, weil er wie Arbeit
// aussieht.
export const SICHERE_DATEIEN = Object.freeze({
  'js/modules/core/00-basis.js': 'kleine gemeinsame Browser-Helfer und UI-Grundlagen',
  'js/modules/core/02-router-navigation.js': 'SPA-Routing und reversible Navigation',
  'js/modules/search/10-karten-home-feed.js': 'oeffentliche Karten, Startseite und Feed-Rendering',
  // Aufgenommen am 13.08. nach Messung und ausdruecklicher Freigabe des
  // Inhabers. 601 Zeilen, 47 eigene Tests in radar.spec.js — die beste
  // Abdeckung im Projekt. Ein Netzaufruf, kein Auth, kein Geld, kein Upload.
  //
  // Er verarbeitet allerdings Standortdaten und legt Koordinaten in
  // localStorage ab. Das ist genau der Grund, warum die Loeschpruefung in
  // patchPruefen() VOR dieser Aufnahme kam: ein Patch, der die Aufraeumzeile
  // `localStorage.removeItem(RADAR_SPEICHER)` entfernt, wird jetzt erkannt.
  'js/modules/search/13-event-radar.js': 'Umkreissuche und Radar-Feed; Standortdaten bleiben lokal',
  // Reine Demo-Daten, kein Sicherheitsbezug. Von 14 Spec-Dateien beruehrt.
  // Vorbehalt: der Inhalt steht sichtbar auf der Seite — ein unsinniges
  // Demo-Inserat waere peinlich, nicht gefaehrlich, und faellt im Review auf.
  'js/modules/core/01-demo-daten.js': 'Demo-Inserate und Beispieldaten der Startseite',
  'js/modules/ui/23-darkmode-staedte-picker.js': 'Darkmode und Ortsauswahl',
  'js/modules/ui/25-reviews.js': 'oeffentliche Bewertungsdarstellung',
  'js/modules/ui/31-modals-toast-qabot.js': 'Modals, Toasts und tokenfreie Hilfe',
  'js/modules/ui/32-consent-init-map.js': 'Consent-Oberflaeche und Karteninitialisierung',
  'js/modules/ui/43-showcase.js': 'rein visuelle Showcase-Interaktionen',
  'js/modules/ai/50-planungs-assistent.js': 'lokaler, tokenfreier Planungsassistent',
  'js/modules/ui/51-inserat-maske-kalender.js': 'Kalenderdarstellung der Inseratmaske',
  'ui-enhancements.css': 'kleine additive UI-Verbesserungen',
  'mobile-overrides.css': 'mobile, additive Darstellungsregeln',
  'eb-hq-evolution.css': 'additive, vom Zugang und den Datenpfaden getrennte HQ-Darstellung',
});
