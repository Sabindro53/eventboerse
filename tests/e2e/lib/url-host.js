// „Ging eine Anfrage an diesen Host?" — am Hostnamen, nicht am Teilstring.
//
// CodeQL meldete am 02.09.2026 „Incomplete URL substring sanitization" an
// `r.url().includes('js.stripe.com')` in zahlung-laden.spec.js. Der Melder hat
// sachlich recht: die Zeichenfolge kann überall in der Adresse stehen.
//
//   https://boese.example/?ref=js.stripe.com   enthält sie, geht aber nicht an Stripe
//   https://js.stripe.com.boese.example/x      enthält sie, geht an einen anderen Host
//
// Für einen Test, der „an diesen Host ging NICHTS" behauptet, ist der
// Teilstring in beide Richtungen falsch: er meldet Anfragen, die es nicht gab,
// und er würde eine Weiterleitung auf eine Subdomain-Attrappe durchgehen
// lassen. Der Hostname ist die Frage, die wirklich gestellt wird.
//
// Dritter CodeQL-Befund in Folge an eigenem Testcode, und der dritte derselben
// Sorte: eine schnelle Zeichenketten-Prüfung, wo eine strukturierte gehört.
// Deshalb steht der Griff hier einmal, statt in jeder Suite neu.

/** Zeigt die Adresse genau auf diesen Host? */
function istHost(url, host) {
  try {
    return new URL(String(url)).hostname === host;
  } catch {
    // Keine absolute Adresse (data:, blob:, relativ) — also nicht dieser Host.
    return false;
  }
}

module.exports = { istHost };
