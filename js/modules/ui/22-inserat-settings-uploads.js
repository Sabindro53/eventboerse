// ========== CREATE LISTING ==========
function updateCreateFormForRole() {
  var title = document.querySelector('#page-create-listing .create-title');
  var subtitle = document.querySelector('#page-create-listing .create-subtitle');
  var titleInput = document.getElementById('createTitle');
  var titleLabel = titleInput ? titleInput.closest('.form-group').querySelector('label') : null;
  var descTextarea = document.getElementById('createDescription');
  var descLabel = descTextarea ? descTextarea.closest('.form-group').querySelector('label') : null;
  var priceInput = document.getElementById('createPrice');
  var priceLabel = priceInput ? priceInput.closest('.form-group').querySelector('label') : null;
  var submitBtn = document.querySelector('#step3 .btn-primary');
  var step3Title = document.querySelector('#step3 h2');
  var uploadZoneH3 = document.querySelector('#uploadZone h3');
  var uploadZoneP = document.querySelector('#uploadZone > p:not(.upload-hint)');

  if (isEventPlaner()) {
    if (title) title.textContent = 'Event erstellen';
    if (subtitle) subtitle.textContent = 'Beschreibe dein Event und finde die passenden Dienstleister.';
    if (titleLabel) titleLabel.textContent = 'Name deines Events';
    if (titleInput) titleInput.placeholder = 'z.B. Hochzeit von Anna & Tom, Firmen-Sommerfest...';
    if (descLabel) descLabel.textContent = 'Event-Beschreibung';
    if (descTextarea) descTextarea.placeholder = 'Beschreibe dein Event detailliert \u2013 was planst du, wie viele G\u00e4ste, welche Atmosph\u00e4re...';
    if (priceLabel) priceLabel.textContent = 'Budget (\u20ac)';
    if (priceInput) priceInput.placeholder = 'z.B. 5000';
    if (step3Title) step3Title.textContent = 'Fotos & Inspiration';
    if (uploadZoneH3) uploadZoneH3.textContent = 'Event-Bilder hochladen';
    if (uploadZoneP) uploadZoneP.textContent = 'Lade Bilder oder Inspirationen f\u00fcr dein Event hoch';
    if (submitBtn) submitBtn.innerHTML = '<span class="material-icons-round">event_available</span> <span id="clSubmitLabel">Event ver\u00f6ffentlichen</span>';
    _renderCreatePayoutNotice({ status: 'hidden' });
  } else {
    if (title) title.textContent = 'Inserat erstellen';
    if (subtitle) subtitle.textContent = 'Pr\u00e4sentiere deinen Service und erreiche tausende potenzielle Kunden.';
    if (titleLabel) titleLabel.textContent = 'Titel deines Services';
    if (titleInput) titleInput.placeholder = 'z.B. Professionelle DJ-Services f\u00fcr jedes Event';
    if (descLabel) descLabel.textContent = 'Beschreibung';
    if (descTextarea) descTextarea.placeholder = 'Beschreibe deinen Service detailliert...';
    if (priceLabel) priceLabel.textContent = 'Preis ab (\u20ac)';
    if (priceInput) priceInput.placeholder = 'z.B. 450';
    if (step3Title) step3Title.textContent = 'Fotos & Galerie';
    if (uploadZoneH3) uploadZoneH3.textContent = 'Bilder hochladen';
    if (uploadZoneP) uploadZoneP.textContent = 'Ziehe Bilder hierher oder klicke zum Ausw\u00e4hlen';
    if (submitBtn) submitBtn.innerHTML = '<span class="material-icons-round">publish</span> <span id="clSubmitLabel">Inserat ver\u00f6ffentlichen</span>';
    _renderCreatePayoutNotice({ status: 'loading' });
    if (typeof loadStripeConnectStatus === 'function') {
      loadStripeConnectStatus().then(function(data) {
        maybePromptStripeOnboarding('create-listing', data);
      }).catch(function(){});
    }
  }

  // Typ-Vorwahl nach Rolle: Event-Planer suchen Dienstleister (Gesuch),
  // Dienstleister bieten an. Beim Bearbeiten überschreibt editListing()
  // das anschließend mit dem echten Typ des Inserats.
  try { _clSetType(isEventPlaner() ? 'search' : 'offer'); } catch (e) {}

  // Nach jeder Rollen-Änderung auch die Board-Navigation neu ausrichten,
  // damit Dienstleister/Event-Planer sofort die richtige Ansicht sehen.
  _applyRoleNav();
}

// ========== SETTINGS ==========
function loadSettings() {
  if (!currentUser) return;
  var parts = (currentUser.name || '').split(' ');
  document.getElementById('settingsFirstName').value = parts[0] || '';
  document.getElementById('settingsLastName').value = parts.slice(1).join(' ') || '';
  document.getElementById('settingsEmail').value = currentUser.email || '';
  document.getElementById('settingsPhone').value = currentUser.phone || '';
  var companyField = document.getElementById('settingsCompanyField');
  var companyInput = document.getElementById('settingsCompany');
  if (companyField && companyInput) {
    if (isDienstleister()) {
      companyField.style.display = '';
      companyInput.value = currentUser.company || '';
    } else {
      companyField.style.display = 'none';
    }
  }
  var settingsRole = currentUser.role || 'Mitglied';
  if (currentUser.subRole && currentUser.role === 'Event-Planer') {
    settingsRole += ' (' + (currentUser.subRole === 'unternehmen' ? 'Unternehmen' : 'Privatperson') + ')';
  }
  document.getElementById('settingsRoleDisplay').textContent = settingsRole;
  document.getElementById('settingsSinceDisplay').textContent = currentUser.since || '–';

  // Admin-Button entfernt – Admins werden nur noch manuell vergeben
  var existingAdminBtn = document.getElementById('settingsMakeAdminBtn');
  if (existingAdminBtn) existingAdminBtn.remove();

  // Clear password fields
  document.getElementById('settingsCurrentPw').value = '';
  document.getElementById('settingsNewPw').value = '';
  document.getElementById('settingsConfirmPw').value = '';
  renderPasskeySettings(null);
  refreshPasskeySettings();

  // 2FA toggle
  var twoFaToggle = document.getElementById('settings2faToggle');
  var twoFaStatus = document.getElementById('settings2faStatus');
  if (twoFaToggle) twoFaToggle.checked = !!(currentUser && currentUser.twoFA);
  if (twoFaStatus) twoFaStatus.textContent = (currentUser && currentUser.twoFA) ? 'Aktiviert – Bei jedem Login wird ein E-Mail-Code angefordert.' : 'Deaktiviert – Login nur mit Passwort.';

  // Stripe Connect: nur für Dienstleister anzeigen + Status laden
  var connectCard = document.getElementById('stripeConnectCard');
  if (connectCard) {
    if (isDienstleister()) {
      loadStripeConnectStatus();
    } else {
      connectCard.style.display = 'none';
    }
  }
}

function renderPasskeySettings(data) {
  var statusEl = document.getElementById('settingsPasskeyStatus');
  var countEl = document.getElementById('settingsPasskeyCount');
  var listEl = document.getElementById('settingsPasskeyList');
  var noteEl = document.getElementById('settingsPasskeySupportNote');
  var addBtn = document.getElementById('settingsAddPasskeyBtn');
  if (!statusEl || !countEl || !listEl || !noteEl || !addBtn) return;

  if (!isWebAuthnAvailable()) {
    addBtn.disabled = true;
    noteEl.classList.add('is-warning');
    noteEl.textContent = 'Auf diesem Gerät können keine Passkeys eingerichtet werden. Der Login per E-Mail und zusätzlichem Code bleibt möglich.';
  } else {
    // Eventuell hängengebliebenen Loading-State vom Add-Button bereinigen,
    // falls eine vorherige Zeremonie nie ordentlich abgeschlossen hat.
    if (addBtn.classList.contains('btn-loading')) {
      _setBtnLoading(addBtn, false);
    }
    addBtn.dataset.passkeyBusy = '';
    addBtn.disabled = false;
    noteEl.classList.remove('is-warning');
    noteEl.textContent = 'Dieses Gerät unterstützt Passkeys. Du kannst zusätzliche biometrische Anmeldungen direkt hier verwalten.';
  }

  if (!data) {
    statusEl.textContent = currentUser && currentUser.hasPasskey ? 'Aktiv' : 'Noch nicht eingerichtet';
    statusEl.className = 'settings-info-value ' + ((currentUser && currentUser.hasPasskey) ? 'settings-status-passkey-on' : 'settings-status-passkey-off');
    countEl.textContent = currentUser && currentUser.passkeyCount ? String(currentUser.passkeyCount) : '0';
    listEl.innerHTML = '<div class="settings-passkey-empty">Passkeys werden geladen …</div>';
    return;
  }

  var credentials = Array.isArray(data.credentials) ? data.credentials : [];
  var hasPasskey = !!data.hasPasskey;
  var passkeyCount = typeof data.passkeyCount === 'number' ? data.passkeyCount : credentials.length;

  if (currentUser) {
    currentUser.hasPasskey = hasPasskey;
    currentUser.passkeyCount = passkeyCount;
  }

  statusEl.textContent = hasPasskey ? 'Aktiv' : 'Noch nicht eingerichtet';
  statusEl.className = 'settings-info-value ' + (hasPasskey ? 'settings-status-passkey-on' : 'settings-status-passkey-off');
  countEl.textContent = String(passkeyCount || 0);

  if (!credentials.length) {
    listEl.innerHTML = '<div class="settings-passkey-empty">Noch kein Passkey gespeichert. Richte hier Face ID, Fingerabdruck oder Geräte-PIN als Anmeldung ein.</div>';
    return;
  }

  listEl.innerHTML = credentials.map(function(credential) {
    var title = _escHtml(credential.label || 'Passkey');
    var created = credential.created_at ? _escHtml(credential.created_at) : 'unbekannt';
    var lastUsed = credential.last_used_at ? _escHtml(credential.last_used_at) : 'noch nicht verwendet';
    var transports = Array.isArray(credential.transports) && credential.transports.length ? _escHtml(credential.transports.join(', ')) : 'nicht angegeben';
    return '' +
      '<div class="settings-passkey-item">' +
        '<div class="settings-passkey-item-main">' +
          '<div class="settings-passkey-item-title">' + title + '</div>' +
          '<div class="settings-passkey-item-meta">Hinzugefügt: ' + created + '<br>Zuletzt verwendet: ' + lastUsed + '<br>Transport: ' + transports + '</div>' +
        '</div>' +
        '<button type="button" class="btn-outline btn-sm settings-passkey-remove" onclick="removePasskeyFromSettings(\'' + String(credential.credential_id).replace(/'/g, '\\&#39;') + '\', this)">Entfernen</button>' +
      '</div>';
  }).join('');
}

function refreshPasskeySettings() {
  if (!currentUser) return Promise.resolve();
  return loadPasskeyCredentials()
    .then(function(data) {
      renderPasskeySettings(data);
      return data;
    })
    .catch(function(err) {
      var listEl = document.getElementById('settingsPasskeyList');
      if (listEl) {
        listEl.innerHTML = '<div class="settings-passkey-empty">Passkeys konnten nicht geladen werden.</div>';
      }
      showToast(_friendlyPasskeyError(err, 'Passkeys konnten nicht geladen werden.'), 'error');
    });
}

async function addPasskeyFromSettings(btn) {
  // Wenn schon ein Lade-Zustand existiert (z.B. nach Reload), erst sauber zurücksetzen
  if (btn && (btn.classList.contains('btn-loading') || btn.dataset.passkeyBusy === '1')) {
    _abortPendingPasskey();
    _setBtnLoading(btn, false);
    btn.dataset.passkeyBusy = '';
  }
  if (btn) btn.dataset.passkeyBusy = '1';
  // Watchdog: Falls die WebAuthn-Zeremonie auf irgendeinem Gerät stillsteht
  // (z.B. iOS Safari schließt den Face-ID-Dialog ohne Reject), die Zeremonie
  // nach 75s hart abbrechen und den Button zurücksetzen.
  var watchdog = setTimeout(function() {
    _abortPendingPasskey();
    if (btn) {
      _setBtnLoading(btn, false);
      btn.dataset.passkeyBusy = '';
    }
    showToast('Passkey-Einrichtung wurde abgebrochen. Bitte erneut versuchen.', 'warning');
  }, 75000);
  try {
    if (btn) _setBtnLoading(btn, true);
    await registerPasskey('Zusätzliches Gerät');
    var storageKey = _passkeyPromptStorageKey();
    if (storageKey) localStorage.removeItem(storageKey);
    await refreshPasskeySettings();
    showToast('Neuer Passkey hinzugefügt', 'fingerprint');
  } catch (err) {
    showToast(_friendlyPasskeyError(err, 'Passkey konnte nicht hinzugefügt werden.'), 'error');
  } finally {
    clearTimeout(watchdog);
    _passkeyAbort = null;
    if (btn) {
      _setBtnLoading(btn, false);
      btn.dataset.passkeyBusy = '';
    }
  }
}

async function removePasskeyFromSettings(credentialId, btn) {
  if (!credentialId) return;
  if (!confirm('Diesen Passkey wirklich entfernen?')) return;

  try {
    if (btn) _setBtnLoading(btn, true);
    await deletePasskeyCredential(credentialId);
    await refreshPasskeySettings();
    showToast('Passkey entfernt', 'delete');
  } catch (err) {
    showToast(_friendlyPasskeyError(err, 'Passkey konnte nicht entfernt werden.'), 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

function toggleSettingsPw(inputId, btn) {
  var inp = document.getElementById(inputId);
  var icon = btn.querySelector('.material-icons-round');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.textContent = 'visibility';
  } else {
    inp.type = 'password';
    icon.textContent = 'visibility_off';
  }
}

function toggle2faSetting(checkbox) {
  var enabled = checkbox.checked;
  var statusEl = document.getElementById('settings2faStatus');

  fetch(_apiUrl('settings/2fa'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ enabled: enabled })
  })
    .then(function(r) { _refreshNonce(r); return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) {
        checkbox.checked = !enabled;
        showToast(res.data.message || 'Fehler beim Speichern', 'error');
        return;
      }
      if (currentUser) currentUser.twoFA = !!res.data.twoFA;
      if (statusEl) statusEl.textContent = res.data.twoFA ? 'Aktiviert – Bei jedem Login wird ein E-Mail-Code angefordert.' : 'Deaktiviert – Login nur mit Passwort.';
      showToast(res.data.twoFA ? 'E-Mail-2FA aktiviert' : 'E-Mail-2FA deaktiviert', res.data.twoFA ? 'verified_user' : 'shield');
    })
    .catch(function() {
      checkbox.checked = !enabled;
      showToast('Netzwerkfehler', 'error');
    });
}

function savePersonalSettings() {
  if (!currentUser) return;
  var firstName = document.getElementById('settingsFirstName').value.trim();
  var lastName = document.getElementById('settingsLastName').value.trim();
  var email = document.getElementById('settingsEmail').value.trim();
  var phone = document.getElementById('settingsPhone').value.trim();
  var companyInput = document.getElementById('settingsCompany');
  var company = companyInput ? companyInput.value.trim() : '';

  if (!firstName) { showToast('Vorname ist erforderlich', 'warning'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Bitte gib eine gültige E-Mail ein', 'warning'); return; }

  fetch(_apiUrl('settings'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ first_name: firstName, last_name: lastName, email: email, phone: phone, company: company })
  })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Fehler beim Speichern', 'error'); return; }
      currentUser.name = (firstName + ' ' + lastName).trim();
      currentUser.email = email;
      currentUser.phone = phone;
      currentUser.company = company;
      showToast('Daten gespeichert ✓', 'success');
      // Falls Rolle geändert wurde, UI aktualisieren
      if (res.data && res.data.role && res.data.role !== currentUser.role) {
        currentUser.role = res.data.role;
        updateCreateFormForRole();
      }
    })
    .catch(function() { showToast('Netzwerkfehler', 'error'); });
}

function savePasswordSettings() {
  var current = document.getElementById('settingsCurrentPw').value;
  var newPw = document.getElementById('settingsNewPw').value;
  var confirm = document.getElementById('settingsConfirmPw').value;

  if (!current) { showToast('Aktuelles Passwort eingeben', 'warning'); return; }
  if (newPw.length < 8) { showToast('Neues Passwort muss mind. 8 Zeichen haben', 'warning'); return; }
  if (newPw !== confirm) { showToast('Passwörter stimmen nicht überein', 'warning'); return; }

  fetch(_apiUrl('settings/password'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ current_password: current, new_password: newPw })
  })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Fehler beim Ändern', 'error'); return; }
      document.getElementById('settingsCurrentPw').value = '';
      document.getElementById('settingsNewPw').value = '';
      document.getElementById('settingsConfirmPw').value = '';
      showToast('Passwort geändert ✓', 'success');
    })
    .catch(function() { showToast('Netzwerkfehler', 'error'); });
}

function confirmDeleteAccount() {
  var password = prompt('Bitte gib dein Passwort ein, um dein Konto endgültig zu löschen:');
  if (!password) return;
  if (!confirm('Wirklich? Alle deine Daten, Inserate und Nachrichten werden unwiderruflich gelöscht.')) return;

  fetch(_apiUrl('settings/delete-account'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ password: password })
  })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Fehler', 'error'); return; }
      showToast('Konto gelöscht', 'success');
      setTimeout(function() { window.location.reload(); }, 1500);
    })
    .catch(function() { showToast('Netzwerkfehler', 'error'); });
}

// Einseitige Maske: alle Abschnitte sind sichtbar — "nextStep" scrollt nur
// noch zum jeweiligen Abschnitt (z. B. bei Validierungsfehlern).
function nextStep(step) {
  var el = document.getElementById('step' + step);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleFeatureTag(btn) {
  btn.classList.toggle('selected');
}

function addCustomFeature() {
  var input = document.getElementById('customFeatureInput');
  var text = input.value.trim();
  if (!text) return;
  var grid = document.getElementById('createFeatureTags');
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'feature-tag selected';
  btn.onclick = function() { toggleFeatureTag(btn); };
  btn.textContent = '✏️ ' + text;
  grid.appendChild(btn);
  input.value = '';
  showToast('Leistung hinzugefügt!', 'add_circle');
}

// ========== LEISTUNGEN SEARCH ==========
const ALL_FEATURES = [
  // Musik & DJ
  '🎵 Professionelle Ausrüstung','🎧 Wunschmusik-Absprache','🔊 Sound-System','🎶 Live-Band',
  '🎹 Pianist','🎷 Saxophonist','🎸 Gitarrist','🎻 Streichquartett','🥁 Schlagzeuger',
  '🎤 Sänger / Sängerin','🎙️ DJ-Set','🎚️ Mischpult & Equipment','📀 Playlist-Erstellung',
  '🪗 Akkordeon-Spieler','🎺 Trompeter','🪕 Banjo-Spieler',
  // Moderation & Entertainment
  '🎤 Moderation','🎭 Showeinlage','🤹 Zauberer / Magier','🎪 Bühne & Technik',
  '🎬 Unterhaltungsprogramm','🎯 Spiele & Aktivitäten','🃏 Karikaturist',
  '🎰 Casino-Tische','🧩 Quiz & Rätsel','🗣️ Comedian / Stand-Up','💃 Tanzshow',
  '🪩 Discokugel & Partybeleuchtung','🎊 Konfetti & Effekte','🫧 Seifenblasen-Show',
  '🤖 Roboter-Show','🧑‍🎤 Tribute-Band','🎠 Karussell / Fahrgeschäfte',
  // Foto & Video
  '📸 Foto-Dokumentation','🎥 Video-Produktion','📷 Fotograf','🎞️ Drohnenaufnahmen',
  '📹 Livestream','🖼️ Sofortbild-Station','📽️ Beamer & Leinwand','🤳 Selfie-Spiegel',
  '📓 Fotoalbum / Fotobuch','🎞️ After-Movie','🖨️ Sofortdruck vor Ort',
  // Licht & Technik
  '💡 Lichtanlage inklusive','✨ Spezialeffekte','🔥 Feuerwerkshow','🎆 Pyrotechnik',
  '💨 Nebelmaschine','🌈 LED-Beleuchtung','🔦 Spotlights & Moving Heads',
  '📺 LED-Wand / Bildschirme','🪞 Spiegelkugel','💜 UV-Schwarzlicht',
  '🕯️ Kerzen & Windlichter','🧊 Trockeneis-Effekte',
  // Catering & Essen
  '🍽️ Menü-Auswahl','🥂 Getränke-Service','👨‍🍳 Live-Cooking','🎂 Torte & Desserts',
  '🍕 Pizza-Station','🍣 Sushi-Bar','🥩 BBQ / Grill-Station','🍦 Eis-Bar',
  '🧁 Cupcake-Bar','🍿 Popcorn-Maschine','🥤 Cocktail-Bar','🍺 Bier-Zapfanlage',
  '☕ Kaffee-Bar / Barista','🫕 Fondue-Station','🧀 Käse-Platte',
  '🍫 Schokoladen-Brunnen','🥗 Veganes / Vegetarisches Menü','🌮 Food-Truck',
  '🍰 Candy-Bar','🧃 Alkoholfreie Cocktails','🥐 Brunch-Buffet',
  '🫖 Tee-Zeremonie','🍷 Wein-Verkostung','🥨 Brezel-Bar',
  // Blumen & Dekoration
  '🌸 Blumen-Arrangement','🎈 Dekoration','🌺 Brautstrauß','🕊️ Tauben',
  '🏵️ Tischdekoration','🎀 Stuhlhussen & Schleifen','🪴 Pflanzen-Deko',
  '🎋 Bambus-Deko','🌿 Greenery / Eukalyptus','🌹 Rosenbogen',
  '🪷 Lichterketten & Lampions','🎍 Themendekoration','🧵 Wandbehänge / Drapes',
  // Planung & Organisation
  '📋 Individuelle Planung','🏠 Location-Beratung','🗓️ Termin-Flexibilität',
  '⏰ Kurzfristig buchbar','📜 Kostenvoranschlag','🤝 Persönliche Beratung',
  '📑 Ablaufplanung','🗺️ Sitzplan-Erstellung','📊 Budget-Beratung',
  '📝 Verträge & Dokumente','🔄 Koordination aller Dienstleister',
  '🏗️ Komplett-Planung','📆 Save-the-Date Karten',
  // Transport & Logistik
  '🚗 Anfahrt inklusive','🔧 Auf- & Abbau','🚐 Shuttle-Service',
  '🏎️ Limousinen-Service','🐴 Kutsche','🚌 Bus-Transfer',
  '🚁 Helikopter-Transfer','🛶 Boots-Transfer','🧳 Equipment-Transport',
  // Beauty & Styling
  '👗 Styling & Outfit','💄 Make-up & Frisur','💅 Nageldesign',
  '👰 Braut-Styling','🪮 Barber-Service','🧖 Wellness-Bereich',
  '💆 Massage-Station','🎨 Bodypainting','✂️ Friseur vor Ort',
  // Kinder & Familie
  '🧒 Kinder-Programm','🎠 Hüpfburg','🎨 Kinderschminken',
  '🧸 Kinderbetreuung','🎪 Puppet-Show','🎈 Ballontiere',
  '🦸 Superhelden-Auftritt','👸 Prinzessinnen-Besuch','🧙 Zauberer für Kinder',
  // Sonstiges
  '🎁 Gastgeschenke','🌍 Mehrsprachig','♿ Barrierefreiheit',
  '🐾 Haustierfreundlich','🛡️ Security / Sicherheit','🅿️ Parkplatz-Service',
  '🧹 Reinigung danach','🏕️ Outdoor-Ausstattung','☂️ Regen-Plan B',
  '📢 Einlass-Management','🎟️ Ticket-System','🪑 Mobiliar-Verleih',
  '🍾 Champagner-Empfang','🔐 Garderobe','🚻 Mobile Toiletten',
  '📍 Wegweiser / Beschilderung','🧊 Kühlwagen','🔌 Stromversorgung',
  '🌡️ Heizstrahler / Klimaanlage','🎗️ Wohltätigkeits-Integration',
  '📖 Gästebuch','🖊️ Kalligraphie','💐 Trockenblumen-Deko',
  '🪄 Sand-Zeremonie','🕺 Tanzlehrer / Erster Tanz','🎼 Hochzeitslied',
  '🧲 Teambuilding-Aktivitäten','🏆 Award-Zeremonien','🎓 Abschlussfeier-Package',
  '📣 Social-Media Betreuung','🖥️ Technik-Support','🌐 WLAN-Bereitstellung'
];

function initFeatureSearch() {
  const input = document.getElementById('featureSearchInput');
  const list = document.getElementById('featureSearchList');
  const grid = document.getElementById('createFeatureTags');
  if (!input || !list || !grid) return;

  function getSelectedTexts() {
    const set = new Set();
    grid.querySelectorAll('.feature-tag').forEach(btn => {
      set.add(btn.textContent.trim());
    });
    return set;
  }

  function addFeatureTag(text) {
    const existing = grid.querySelectorAll('.feature-tag');
    for (const btn of existing) {
      if (btn.textContent.trim() === text) {
        btn.classList.add('selected');
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'feature-tag selected';
    btn.textContent = text;
    btn.onclick = function() { toggleFeatureTag(btn); };
    grid.appendChild(btn);
  }

  input.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    list.innerHTML = '';
    if (!q) { list.style.display = 'none'; return; }

    const inGrid = getSelectedTexts();
    const matches = ALL_FEATURES.filter(f => {
      const label = f.replace(/^.+?\s/, '').toLowerCase();
      return label.includes(q) || f.toLowerCase().includes(q);
    }).slice(0, 8);

    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'feature-search-item feature-search-custom';
      li.textContent = '✏️ „' + this.value.trim() + '" als eigene Leistung hinzufügen';
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        addFeatureTag('✏️ ' + input.value.trim());
        input.value = '';
        list.style.display = 'none';
        showToast('Leistung hinzugefügt!', 'add_circle');
      });
      list.appendChild(li);
      list.style.display = 'block';
      return;
    }

    matches.forEach(f => {
      const li = document.createElement('li');
      li.className = 'feature-search-item';
      if (inGrid.has(f)) li.classList.add('already');
      li.textContent = f;
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        addFeatureTag(f);
        input.value = '';
        list.style.display = 'none';
      });
      list.appendChild(li);
    });
    list.style.display = 'block';
  });

  input.addEventListener('blur', function() {
    setTimeout(() => { list.style.display = 'none'; }, 120);
  });
  input.addEventListener('focus', function() {
    if (this.value.trim()) this.dispatchEvent(new Event('input'));
  });

  input.addEventListener('keydown', function(e) {
    const items = list.querySelectorAll('.feature-search-item');
    if (!items.length) return;
    let active = list.querySelector('.feature-search-item.active');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!active) { items[0].classList.add('active'); }
      else { active.classList.remove('active'); const next = active.nextElementSibling; if (next) next.classList.add('active'); else items[0].classList.add('active'); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!active) { items[items.length - 1].classList.add('active'); }
      else { active.classList.remove('active'); const prev = active.previousElementSibling; if (prev) prev.classList.add('active'); else items[items.length - 1].classList.add('active'); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active) active.dispatchEvent(new MouseEvent('mousedown'));
      else if (items[0]) items[0].dispatchEvent(new MouseEvent('mousedown'));
    }
  });

  // Mobile collapse / expand
  var toggle = document.getElementById('featureTagsToggle');
  if (toggle && window.innerWidth <= 768) {
    grid.classList.add('collapsed');
    toggle.addEventListener('click', function() {
      var isCollapsed = grid.classList.toggle('collapsed');
      toggle.textContent = isCollapsed ? 'Mehr anzeigen ▾' : 'Weniger anzeigen ▴';
    });
  }
}

// Category → label mapping
const CATEGORY_LABELS = {
  dj: 'DJ & Musik', catering: 'Catering', foto: 'Fotografie',
  florist: 'Floristik', location: 'Location', licht: 'Licht & Technik',
  pyro: 'Pyrotechnik', deko: 'Dekoration', planung: 'Eventplanung',
  moderation: 'Moderation'
};

async function submitListing(e) {
  if (e && e.preventDefault) e.preventDefault();

  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um ein Inserat zu erstellen.', 'warning');
    openModal('loginModal');
    return;
  }

  var submitBtn = document.querySelector('#step3 .btn-primary');
  var now = Date.now();
  var startedAt = parseInt(window._ebListingSubmitStartedAt || 0, 10);
  // FIX 2026-05: Double-Submit-Guard. Ohne diesen Block kann der User während
  // des laufenden Uploads erneut auf "Veröffentlichen" klicken und das Inserat
  // doppelt anlegen (zwei POST /listings parallel). Mit globalem In-Flight-Flag
  // werden Folge-Klicks ignoriert, bis der erste Submit terminiert.
  if (window._ebListingSubmitInflight) {
    if (startedAt && now - startedAt > 90000) {
      window._ebListingSubmitInflight = false;
      window._ebListingSubmitStartedAt = 0;
      if (submitBtn) _setBtnLoading(submitBtn, false);
      showToast('Alter Speichervorgang wurde zurückgesetzt. Ich versuche es erneut.', 'sync');
    } else {
      showToast('Wird gerade gespeichert…', 'sync');
      return;
    }
  }
  window._ebListingSubmitInflight = true;
  window._ebListingSubmitStartedAt = now;

  var _releaseGuard = function() {
    window._ebListingSubmitInflight = false;
    window._ebListingSubmitStartedAt = 0;
    if (submitBtn) _setBtnLoading(submitBtn, false);
  };

  try {
    var requiredEl = function(id, label) {
      var el = document.getElementById(id);
      if (!el) throw new Error('Formularfeld fehlt: ' + (label || id));
      return el;
    };

  // Read form values with validation
  const listingType = ((document.getElementById('createListingType') || {}).value === 'search') ? 'search' : 'offer';
  const isSearch = listingType === 'search';
  const title = requiredEl('createTitle', 'Titel').value.trim();
  const category = requiredEl('createCategory', 'Kategorie').value;
  const description = requiredEl('createDescription', 'Beschreibung').value.trim();
  const price = parseInt(requiredEl('createPrice', 'Preis').value) || 0;
  const priceMaxRaw = parseInt((document.getElementById('createPriceMax')||{}).value) || 0;
  const priceMax = (priceMaxRaw > 0 && priceMaxRaw > price) ? priceMaxRaw : 0;
  const priceModel = requiredEl('createPriceModel', 'Preismodell').value;

  // Basic validation
  if (!title)       { _releaseGuard(); showToast('Bitte gib einen Titel ein', 'warning'); nextStep(1); return; }
  if (!category)    { _releaseGuard(); showToast('Bitte wähle eine Kategorie', 'warning'); nextStep(1); return; }
  if (!description) { _releaseGuard(); showToast('Bitte gib eine Beschreibung ein', 'warning'); nextStep(1); return; }
  if (!price)       { _releaseGuard(); showToast(isSearch ? 'Bitte gib dein Budget ein' : 'Bitte gib einen Preis ein', 'warning'); nextStep(1); return; }
  const region = document.getElementById('createRegionValue').value.trim()
    || document.getElementById('createRegion').value.trim() || 'Deutschland';
  const dateFrom = document.getElementById('createDateFrom').value;
  const dateTo = document.getElementById('createDateTo').value;
  const timeFrom = getTimeISO('createTimeFrom');
  const timeTo = getTimeISO('createTimeTo');
  const duration = parseFloat(document.getElementById('createDuration').value) || 0;
  const selectedTags = document.querySelectorAll('#createFeatureTags .feature-tag.selected');
  const features = selectedTags.length > 0
    ? Array.from(selectedTags).map(function(btn) { return btn.textContent.trim(); })
    : ['Individuelle Absprache'];

  // Tags from checkboxes
  const tagEls = document.querySelectorAll('#createTags input[type=checkbox]:checked');
  const tags = Array.from(tagEls).map(el => el.value);

  // Sofortbuchung + verfügbare Wochentage (nur Biete-Inserate)
  const canUseInstantBook = isDienstleister() && !isSearch;
  const instantBook = canUseInstantBook && !!(document.getElementById('createInstantBook') || {}).checked;
  const availableWeekdays = canUseInstantBook ? Array.from(
    document.querySelectorAll('#createWeekdayPicker .weekday-pill.selected')
  ).map(function(b) { return parseInt(b.getAttribute('data-day'), 10); })
   .filter(function(d) { return !isNaN(d) && d >= 0 && d <= 6; }) : [];
  if (instantBook && availableWeekdays.length === 0) {
    _releaseGuard();
    showToast('Bitte mindestens einen Wochentag für die Sofortbuchung wählen.', 'warning');
    _setBtnLoading && _setBtnLoading(document.querySelector('#step3 .btn-primary'), false);
    return;
  }

  const negotiableEl = document.getElementById('createNegotiable');
  const negotiable = negotiableEl ? !!negotiableEl.checked : false;

  // Extract city from region
  const city = region.split(/[,&·–-]/)[0].trim();

  // Build price label (range if max provided, else "ab X€"; Gesuch = Budget)
  const priceModelSuffix = priceModel.replace('Pro ','').replace('Pauschal','Pauschal');
  const priceLabel = price > 0
    ? (isSearch
        ? `Budget bis ${priceMax > 0 ? priceMax : price}€`
        : (priceMax > 0
            ? `${price}–${priceMax}€ / ${priceModelSuffix}`
            : `ab ${price}€ / ${priceModelSuffix}`))
    : 'Auf Anfrage';

  // Collect image files from upload preview
  const previewDivs = document.querySelectorAll('#uploadPreview .upload-preview-item');
  const imgEntries = Array.from(previewDivs).map(function(div) {
    var img = div.querySelector('img');
    return { src: img ? img.src : '', blob: div._croppedBlob || null };
  });

  var sessionOk = await _ensureWriteSessionMatchesCurrentUser(isEventPlaner() ? 'Event speichern' : 'Inserat speichern');
  if (!sessionOk) return;

  // Show loading
  _setBtnLoading(submitBtn, true);
  showToast('Wird gespeichert...', 'sync');

  // Upload images: cropped blobs first, then data URLs, keep existing URLs
  var uploadPromises = imgEntries.map(function(entry) {
    if (entry.blob) {
      var file = new File([entry.blob], 'listing-' + Date.now() + '-' + Math.random().toString(36).slice(2,6) + '.jpg', { type: 'image/jpeg' });
      return uploadFile(file).then(function(r) { return r.url; });
    }
    if (entry.src.startsWith('data:')) {
      var arr = entry.src.split(','), mime = arr[0].match(/:(.*?);/)[1];
      var bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      var file = new File([u8arr], 'listing-' + Date.now() + '.' + mime.split('/')[1], { type: mime });
      return uploadFile(file).then(function(r) { return r.url; });
    }
    return Promise.resolve(entry.src);
  });

  var imageUrls = await Promise.all(uploadPromises);
    // Require at least one image (Gesuche: Bilder optional)
    if (imageUrls.length === 0 && !isSearch) {
      showToast('Bitte lade mindestens ein Bild hoch', 'warning');
      nextStep(3);
      return;
    }

    var payload = {
      title: title,
      listingType: listingType,
      category: category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      description: '<p>' + description.replace(/\n/g, '</p><p>') + '</p>',
      price: price,
      priceMax: priceMax || null,
      priceModel: priceModel,
      priceLabel: priceLabel,
      location: city,
      region: region,
      features: features,
      tags: tags.length > 0 ? tags : ['Party'],
      images: imageUrls,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      timeFrom: timeFrom || null,
      timeTo: timeTo || null,
      duration: duration,
      negotiable: negotiable,
      availableWeekdays: availableWeekdays,
      instantBook: instantBook
    };

    var method = 'POST';
    var url = _apiUrl('listings');
    var editingDbId = null;

    // If editing an existing DB listing
    if (window._editingListingId) {
      var editListing = LISTINGS.find(function(l) { return l.id === window._editingListingId; });
      if (editListing && editListing._fromDb) {
        editingDbId = editListing._dbId;
        method = 'PUT';
        url = _apiUrl('listings/' + editingDbId);
      }
    }

    var resp = await _fetchWithTimeout(url, {
      method: method,
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify(payload)
    }, 35000);

    if (!resp.ok) {
      var apiErr = {};
      try { apiErr = await resp.json(); } catch (_) {}
      throw new Error(apiErr.message || apiErr.db_error || 'Speichern fehlgeschlagen (Status ' + resp.status + ')');
    }

    var saved = await resp.json();
      // Remove old from LISTINGS array if editing
      if (window._editingListingId) {
        var editIdx = LISTINGS.findIndex(function(l) { return l.id === window._editingListingId; });
        if (editIdx !== -1) LISTINGS.splice(editIdx, 1);
        window._editingListingId = null;
      }

      // Add/update normalized DB listing in local cache
      var savedDbId = _toPositiveInt(saved && saved.id);
      _mergeDbListingsIntoCache([saved]);
      var savedLocal = _findListingByAnyId(savedDbId) || saved;

      // Verfügbarkeitskalender speichern (nur Biete): geblockte Tage aus der
      // Maske per PUT an /listings/<id>/availability — fire-and-forget.
      if (!isSearch && savedDbId && typeof _clAvailBlockedList === 'function') {
        try {
          var _clBlockedOut = _clAvailBlockedList();
          fetch(_apiUrl('listings/' + savedDbId + '/availability'), {
            method: 'PUT', credentials: 'same-origin', headers: _apiHeaders(),
            body: JSON.stringify({ blockedDates: _clBlockedOut })
          }).then(function() {
            if (_availabilityCache) delete _availabilityCache[savedDbId];
          }).catch(function(){});
        } catch (e) {}
      }

      // Reset the form
      document.getElementById('createListingForm').reset();
      document.getElementById('uploadPreview').innerHTML = '';
      document.querySelectorAll('#createFeatureTags .feature-tag').forEach(function(t) { t.classList.remove('selected'); });
      document.querySelectorAll('#createFeatureTags .feature-tag-custom-item').forEach(function(t) { t.remove(); });
      try { _clSetType('offer'); } catch (e) {}
      try { _clAvailReset(); } catch (e) {}

      // Force reload from DB on next navigation
      _dbListingsLoaded = false;

      var successMsg = isEventPlaner() ? 'Event erfolgreich veröffentlicht! 🎉' : 'Inserat erfolgreich veröffentlicht! 🎉';
      showToast(successMsg, 'check_circle');
      setTimeout(function() { navigateTo('detail', savedLocal.id || (savedDbId + 10000)); }, 800);
  } catch (err) {
    var msg = err && err.name === 'AbortError'
      ? 'Speichern dauert zu lange. Bitte Internet/Session prüfen und erneut versuchen.'
      : (err && err.message ? err.message : 'Unbekannter Fehler');
    showToast('Fehler beim Speichern: ' + msg, 'error');
  } finally {
    _releaseGuard();
  }
}

function handleUpload(input) {
  const preview = document.getElementById('uploadPreview');
  const files = input.files;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5 MB
  const maxImages = 10;
  const existing = preview.querySelectorAll('.upload-preview-item').length;

  let queue = [];
  for (let file of files) {
    if (!allowedTypes.includes(file.type)) { showToast('Nur JPG, PNG, WebP oder GIF erlaubt', 'error'); continue; }
    if (file.size > maxSize) { showToast('Bild zu groß! Max. 5 MB', 'error'); continue; }
    if (existing + queue.length >= maxImages) { showToast('Max. ' + maxImages + ' Bilder erlaubt', 'warning'); break; }
    queue.push(file);
  }
  input.value = '';

  // Open crop modal for each image sequentially
  _lcropMode = 'listing';
  _lcropQueue = queue;
  _lcropQueueIdx = 0;
  if (queue.length > 0) _lcropProcessNext();
}

// ---- Listing Crop State ----
var _lcropImg = null;
var _lcropX = 0, _lcropY = 0, _lcropDragStart = null;
var _lcropQueue = [];
var _lcropQueueIdx = 0;
var _lcropEditTarget = null; // when re-cropping an existing preview item
var _lcropMode = 'listing'; // 'listing' or 'gallery'

function _lcropProcessNext() {
  if (_lcropQueueIdx >= _lcropQueue.length) { _lcropQueue = []; return; }
  var file = _lcropQueue[_lcropQueueIdx];
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      _lcropImg = img;
      _lcropX = 0; _lcropY = 0;
      _lcropEditTarget = null;
      document.getElementById('lcropZoom').value = 1;
      openModal('listingCropModal');
      setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function lcropDraw() {
  var canvas = document.getElementById('lcropCanvas');
  var cont = document.getElementById('lcropContainer');
  if (!canvas || !_lcropImg) return;
  var w = cont.offsetWidth;
  var h = Math.round(w * 3 / 4); // 4:3 aspect
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  var slider = document.getElementById('lcropZoom');
  var imgAspect = _lcropImg.width / _lcropImg.height;
  var frameAspect = w / h;
  // Minimum zoom = fit whole image within frame
  var minZoom = imgAspect > frameAspect ? frameAspect / imgAspect : imgAspect / frameAspect;
  minZoom = Math.round(minZoom * 100) / 100;
  slider.min = minZoom;
  var zoom = Math.max(minZoom, parseFloat(slider.value) || 1);
  var drawW, drawH;
  // Cover: fill the 4:3 frame
  if (imgAspect > frameAspect) {
    drawH = h * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = w * zoom;
    drawH = drawW / imgAspect;
  }

  // Clamp offsets so image covers the frame
  var maxOffX = Math.max(0, (drawW - w) / 2);
  var maxOffY = Math.max(0, (drawH - h) / 2);
  _lcropX = Math.max(-maxOffX, Math.min(maxOffX, _lcropX));
  _lcropY = Math.max(-maxOffY, Math.min(maxOffY, _lcropY));

  var dx = (w - drawW) / 2 + _lcropX;
  var dy = (h - drawH) / 2 + _lcropY;
  ctx.drawImage(_lcropImg, dx, dy, drawW, drawH);
}

function lcropBindEvents() {
  var cont = document.getElementById('lcropContainer');
  if (cont._lcropBound) return;
  cont._lcropBound = true;

  function startDrag(x, y) { _lcropDragStart = { x: x, y: y, ox: _lcropX, oy: _lcropY }; }
  function moveDrag(x, y) {
    if (!_lcropDragStart) return;
    _lcropX = _lcropDragStart.ox + (x - _lcropDragStart.x);
    _lcropY = _lcropDragStart.oy + (y - _lcropDragStart.y);
    lcropDraw();
  }
  function endDrag() { _lcropDragStart = null; }

  cont.addEventListener('mousedown', function(e) { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function(e) { if (_lcropDragStart) moveDrag(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function() { if (_lcropDragStart) endDrag(); });
  cont.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: false });
  window.addEventListener('touchmove', function(e) { if (_lcropDragStart) { var t = e.touches[0]; moveDrag(t.clientX, t.clientY); } });
  window.addEventListener('touchend', function() { if (_lcropDragStart) endDrag(); });
  cont.addEventListener('wheel', function(e) {
    e.preventDefault();
    var slider = document.getElementById('lcropZoom');
    var v = parseFloat(slider.value) + (e.deltaY < 0 ? 0.05 : -0.05);
    slider.value = Math.max(parseFloat(slider.min), Math.min(3, v));
    lcropDraw();
  }, { passive: false });
}

function lcropConfirm() {
  var canvas = document.getElementById('lcropCanvas');
  if (!canvas || !_lcropImg) return;
  var w = canvas.width, h = canvas.height;

  // Render cropped image at high resolution
  var out = document.createElement('canvas');
  var outW = 1200, outH = 900; // 4:3
  out.width = outW; out.height = outH;
  var octx = out.getContext('2d');

  var zoom = parseFloat(document.getElementById('lcropZoom').value) || 1;
  var imgAspect = _lcropImg.width / _lcropImg.height;
  var frameAspect = w / h;
  var drawW, drawH;
  if (imgAspect > frameAspect) {
    drawH = h * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = w * zoom;
    drawH = drawW / imgAspect;
  }

  var scaleX = outW / w, scaleY = outH / h;
  var dx = ((w - drawW) / 2 + _lcropX) * scaleX;
  var dy = ((h - drawH) / 2 + _lcropY) * scaleY;
  octx.drawImage(_lcropImg, dx, dy, drawW * scaleX, drawH * scaleY);

  out.toBlob(function(blob) {
    if (!blob) { showToast('Zuschneiden fehlgeschlagen – bitte erneut versuchen', 'error'); return; }
    closeModal('listingCropModal');
    var previewUrl = URL.createObjectURL(blob);

    if (_lcropEditTarget) {
      // Re-crop: update existing preview item
      var img = _lcropEditTarget.querySelector('img');
      if (img) img.src = previewUrl;
      _lcropEditTarget._croppedBlob = blob;
      var editTarget = _lcropEditTarget;
      _lcropEditTarget = null;
      if (_lcropMode === 'listing') _updateListingLivePreview();
      if (_lcropMode === 'gallery') {
        // Upload cropped gallery image to server
        uploadFile(blob).then(function(data) {
          // Find the item we just updated (by previewUrl)
          var items = document.querySelectorAll('#galleryPreview .upload-preview-item');
          items.forEach(function(item) {
            var im = item.querySelector('img');
            if (im && im.src === previewUrl) {
              im.src = data.url;
              item.setAttribute('data-url', data.url);
            }
          });
        }).catch(function() { showToast('Upload fehlgeschlagen', 'error'); });
      }
      if (_lcropMode === 'provider-portfolio') {
        // Re-crop portfolio image - upload and update
        var oldUrl = editTarget.getAttribute('data-url');
        uploadFile(blob).then(function(data) {
          editTarget.querySelector('img').src = data.url;
          editTarget.setAttribute('data-url', data.url);
          // Update gallery in memory
          if (currentUser) {
            if (!currentUser.gallery) currentUser.gallery = [];
            var gIdx = currentUser.gallery.indexOf(oldUrl);
            if (gIdx > -1) {
              currentUser.gallery[gIdx] = data.url;
            } else {
              // listing image not yet in gallery — add new URL, remove old if present
              currentUser.gallery.push(data.url);
            }
          }
          // Update providerImages in memory (keeps lightbox in sync)
          var pIdx = providerImages.indexOf(oldUrl);
          if (pIdx > -1) providerImages[pIdx] = data.url;
          // Update LISTINGS cache so loadProvider won't revert
          LISTINGS.forEach(function(l) {
            if (l.images) {
              var lIdx = l.images.indexOf(oldUrl);
              if (lIdx > -1) l.images[lIdx] = data.url;
            }
          });
          showToast('Bild zugeschnitten!', 'crop');
        }).catch(function() { showToast('Upload fehlgeschlagen', 'error'); });
      }
    } else if (_lcropMode === 'provider-portfolio') {
      // New portfolio image from crop
      uploadFile(blob).then(function(data) {
        _provAddPortfolioItem(data.url);
        showToast('Bild hinzugefügt!', 'add_photo_alternate');
      }).catch(function() { showToast('Upload fehlgeschlagen', 'error'); });
    } else if (_lcropMode === 'gallery') {
      // New gallery image: add preview item and upload
      _addGalleryPreviewItem(previewUrl, blob);
    } else {
      // New listing image: add preview item
      _addListingPreviewItem(previewUrl, blob);
    }

    // Process next image in queue
    _lcropQueueIdx++;
    _lcropProcessNext();
  }, 'image/jpeg', 0.92);
}

function _addListingPreviewItem(src, blob) {
  var preview = document.getElementById('uploadPreview');
  var div = document.createElement('div');
  div.className = 'upload-preview-item';
  div.draggable = true;
  if (blob) div._croppedBlob = blob;
  var isFirst = preview.querySelectorAll('.upload-preview-item').length === 0;

  div.innerHTML =
    '<img src="' + _escHtml(src) + '" alt="Preview" />' +
    '<div class="upload-preview-actions">' +
      '<button type="button" class="upload-act-crop" title="Zuschneiden" aria-label="Zuschneiden"><span class="material-icons-round">crop</span></button>' +
      '<button type="button" class="upload-act-remove" title="Entfernen" aria-label="Entfernen"><span class="material-icons-round">close</span></button>' +
    '</div>' +
    (isFirst ? '<span class="upload-preview-badge">Titelbild</span>' : '');

  // Crop button
  div.querySelector('.upload-act-crop').onclick = function(e) {
    e.stopPropagation();
    var imgSrc = div.querySelector('img').src;
    var img = new Image();
    img.onload = function() {
      _lcropImg = img;
      _lcropX = 0; _lcropY = 0;
      _lcropEditTarget = div;
      _lcropMode = 'listing';
      _lcropQueue = []; _lcropQueueIdx = 0;
      document.getElementById('lcropZoom').value = 1;
      openModal('listingCropModal');
      setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
    };
    img.src = imgSrc;
  };

  // Remove button
  div.querySelector('.upload-act-remove').onclick = function(e) {
    e.stopPropagation();
    div.remove();
    _updateListingPreviewBadges();
  };

  // Drag&Drop reorder
  div.addEventListener('dragstart', function(e) {
    div.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  div.addEventListener('dragend', function() {
    div.classList.remove('dragging');
    _updateListingPreviewBadges();
  });
  div.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var dragging = preview.querySelector('.dragging');
    if (dragging && dragging !== div) {
      var rect = div.getBoundingClientRect();
      var mid = rect.left + rect.width / 2;
      if (e.clientX < mid) {
        preview.insertBefore(dragging, div);
      } else {
        preview.insertBefore(dragging, div.nextSibling);
      }
    }
  });

  preview.appendChild(div);
  _updateListingLivePreview();
}

function _updateListingPreviewBadges() {
  var items = document.querySelectorAll('#uploadPreview .upload-preview-item');
  items.forEach(function(item, idx) {
    var badge = item.querySelector('.upload-preview-badge');
    if (idx === 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'upload-preview-badge';
        badge.textContent = 'Titelbild';
        item.appendChild(badge);
      }
    } else {
      if (badge) badge.remove();
    }
  });
  _updateListingLivePreview();
}

// ---- Live Gallery Preview ----
var _livePreviewIdx = 0;

function _updateListingLivePreview() {
  var container = document.getElementById('listingLivePreview');
  var track = document.getElementById('livePreviewTrack');
  var dots = document.getElementById('livePreviewDots');
  var counter = document.getElementById('livePreviewCounter');
  if (!container || !track) return;

  var items = document.querySelectorAll('#uploadPreview .upload-preview-item img');
  if (items.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  // Build slides
  track.innerHTML = '';
  items.forEach(function(img) {
    var slide = document.createElement('div');
    slide.className = 'listing-live-preview-slide';
    var slideImg = document.createElement('img');
    slideImg.src = img.src;
    slideImg.alt = 'Vorschau';
    slide.appendChild(slideImg);
    track.appendChild(slide);
  });

  // Build dots
  dots.innerHTML = '';
  items.forEach(function(_, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'listing-live-preview-dot' + (i === 0 ? ' active' : '');
    dot.onclick = function() { livePreviewGoTo(i); };
    dots.appendChild(dot);
  });

  _livePreviewIdx = 0;
  _updateLivePreviewUI();

  // Init scroll-snap listener
  track.onscroll = function() {
    var w = track.offsetWidth;
    if (w === 0) return;
    var idx = Math.round(track.scrollLeft / w);
    if (idx !== _livePreviewIdx) {
      _livePreviewIdx = idx;
      _updateLivePreviewUI();
    }
  };
}

function _updateLivePreviewUI() {
  var dots = document.querySelectorAll('#livePreviewDots .listing-live-preview-dot');
  var counter = document.getElementById('livePreviewCounter');
  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === _livePreviewIdx);
  });
  if (counter) counter.textContent = (_livePreviewIdx + 1) + ' / ' + dots.length;
}

function livePreviewNav(dir) {
  var track = document.getElementById('livePreviewTrack');
  if (!track) return;
  var total = track.querySelectorAll('.listing-live-preview-slide').length;
  var next = _livePreviewIdx + dir;
  if (next < 0 || next >= total) return;
  livePreviewGoTo(next);
}

function livePreviewGoTo(idx) {
  var track = document.getElementById('livePreviewTrack');
  if (!track) return;
  var slides = track.querySelectorAll('.listing-live-preview-slide');
  if (slides[idx]) slides[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  _livePreviewIdx = idx;
  _updateLivePreviewUI();
}

// ========== PROFILE UPLOADS ==========
var _cropImg = null;
var _cropX = 0, _cropY = 0, _cropDragStart = null;

function handleProfilePhoto(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('Bild zu groß! Max. 5MB', 'error');
    input.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      _cropImg = img;
      _cropX = 0; _cropY = 0;
      document.getElementById('cropZoom').value = 1;
      openModal('avatarCropModal');
      setTimeout(function() { cropDraw(); cropBindEvents(); }, 50);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function cropDraw() {
  var canvas = document.getElementById('cropCanvas');
  var cont = document.getElementById('cropContainer');
  if (!canvas || !_cropImg) return;
  var size = cont.offsetWidth;
  canvas.width = size; canvas.height = size;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  var zoom = parseFloat(document.getElementById('cropZoom').value) || 1;
  var imgAspect = _cropImg.width / _cropImg.height;
  var drawW, drawH;
  if (imgAspect > 1) {
    drawH = size * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = size * zoom;
    drawH = drawW / imgAspect;
  }
  // Clamp offsets so image covers the circle area
  var circleR = size * 0.34;
  var minX = -(drawW - size) / 2 - (drawW / 2 - circleR - size / 2);
  var maxX = (drawW - size) / 2 + (drawW / 2 - circleR - size / 2);
  var minY = -(drawH - size) / 2 - (drawH / 2 - circleR - size / 2);
  var maxY = (drawH - size) / 2 + (drawH / 2 - circleR - size / 2);
  if (minX > maxX) { minX = 0; maxX = 0; }
  if (minY > maxY) { minY = 0; maxY = 0; }
  _cropX = Math.max(minX, Math.min(maxX, _cropX));
  _cropY = Math.max(minY, Math.min(maxY, _cropY));

  var dx = (size - drawW) / 2 + _cropX;
  var dy = (size - drawH) / 2 + _cropY;
  ctx.drawImage(_cropImg, dx, dy, drawW, drawH);
}

function cropBindEvents() {
  var cont = document.getElementById('cropContainer');
  if (cont._cropBound) return;
  cont._cropBound = true;

  function startDrag(x, y) {
    _cropDragStart = { x: x, y: y, ox: _cropX, oy: _cropY };
  }
  function moveDrag(x, y) {
    if (!_cropDragStart) return;
    _cropX = _cropDragStart.ox + (x - _cropDragStart.x);
    _cropY = _cropDragStart.oy + (y - _cropDragStart.y);
    cropDraw();
  }
  function endDrag() { _cropDragStart = null; }

  cont.addEventListener('mousedown', function(e) { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY); });
  window.addEventListener('mouseup', endDrag);
  cont.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: false });
  window.addEventListener('touchmove', function(e) { if (_cropDragStart) { var t = e.touches[0]; moveDrag(t.clientX, t.clientY); } });
  window.addEventListener('touchend', endDrag);

  cont.addEventListener('wheel', function(e) {
    e.preventDefault();
    var slider = document.getElementById('cropZoom');
    var v = parseFloat(slider.value) + (e.deltaY < 0 ? 0.05 : -0.05);
    slider.value = Math.max(1, Math.min(3, v));
    cropDraw();
  }, { passive: false });
}

function cropConfirm() {
  var canvas = document.getElementById('cropCanvas');
  if (!canvas || !_cropImg) return;
  var size = canvas.width;
  var circleR = size * 0.34;
  var cx = size / 2, cy = size / 2;

  // Draw cropped circle onto an output canvas
  var out = document.createElement('canvas');
  var outSize = 512;
  out.width = outSize; out.height = outSize;
  var octx = out.getContext('2d');

  // Clip to circle
  octx.beginPath();
  octx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
  octx.closePath();
  octx.clip();

  // Re-draw image at output resolution
  var zoom = parseFloat(document.getElementById('cropZoom').value) || 1;
  var imgAspect = _cropImg.width / _cropImg.height;
  var drawW, drawH;
  if (imgAspect > 1) {
    drawH = size * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = size * zoom;
    drawH = drawW / imgAspect;
  }
  var scale = outSize / (circleR * 2);
  var srcX = (size - drawW) / 2 + _cropX - (cx - circleR);
  var srcY = (size - drawH) / 2 + _cropY - (cy - circleR);

  octx.drawImage(_cropImg, srcX * scale, srcY * scale, drawW * scale, drawH * scale);

  out.toBlob(function(blob) {
    if (!blob) return;
    closeModal('avatarCropModal');
    var previewUrl = URL.createObjectURL(blob);
    var profileAv = document.getElementById('profileAvatar');
    if (profileAv) profileAv.src = previewUrl;
    var providerAv = document.getElementById('providerAvatar');
    if (providerAv) providerAv.src = previewUrl;
    var navAvatar = document.querySelector('#avatarBtn img');
    if (navAvatar) navAvatar.src = previewUrl;

    var croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
    uploadFile(croppedFile).then(function(data) {
      if (currentUser) currentUser.photoUrl = data.url;
      if (profileAv) profileAv.src = data.url;
      if (providerAv) providerAv.src = data.url;
      if (navAvatar) navAvatar.src = data.url;
      fetch(_apiUrl('profile'), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
        body: JSON.stringify({ photoUrl: data.url })
      }).catch(function(){});
      showToast('Profilbild aktualisiert!', 'camera_alt');
    }).catch(function() {
      showToast('Upload fehlgeschlagen', 'error');
    });
  }, 'image/png');
}

function handleCoverUpload(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('Bild zu groß! Max. 5MB', 'error');
    return;
  }
  // Show preview immediately
  var reader = new FileReader();
  reader.onload = function(e) {
    var cover = document.querySelector('.profile-cover');
    if (cover) {
      cover.style.backgroundImage = 'url(' + e.target.result + ')';
      cover.style.backgroundPosition = 'center 50%';
    }
  };
  reader.readAsDataURL(file);
  // Upload to server
  uploadFile(file).then(function(data) {
    if (currentUser) {
      currentUser.coverUrl = data.url;
      currentUser.coverPosY = 50;
    }
    var cover = document.querySelector('.profile-cover');
    if (cover) cover.style.backgroundImage = 'url(' + data.url + ')';
    fetch(_apiUrl('profile'), {
      method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
      body: JSON.stringify({ coverUrl: data.url, coverPosY: 50 })
    }).catch(function(){});
    showToast('Cover-Bild hochgeladen! Sichtbereich anpassen mit ↔', 'panorama');
  }).catch(function() {
    showToast('Upload fehlgeschlagen', 'error');
  });
}

// --- Cover Reposition (Drag to adjust visible area) ---
var _coverDrag = { active: false, startY: 0, startPosY: 50, currentPosY: 50, savedPosY: 50 };

function startCoverReposition() {
  var cover = document.querySelector('.profile-cover');
  if (!cover || !cover.style.backgroundImage || cover.style.backgroundImage === 'none') return;
  _coverDrag.savedPosY = currentUser?.coverPosY ?? 50;
  _coverDrag.currentPosY = _coverDrag.savedPosY;
  cover.classList.add('repositioning');

  cover.addEventListener('mousedown', onCoverDragStart);
  cover.addEventListener('touchstart', onCoverDragStart, { passive: false });
  document.addEventListener('mousemove', onCoverDragMove);
  document.addEventListener('touchmove', onCoverDragMove, { passive: false });
  document.addEventListener('mouseup', onCoverDragEnd);
  document.addEventListener('touchend', onCoverDragEnd);
}

function onCoverDragStart(e) {
  // Don't drag from buttons
  if (e.target.closest('button') || e.target.closest('.cover-reposition-actions')) return;
  e.preventDefault();
  _coverDrag.active = true;
  _coverDrag.startY = e.touches ? e.touches[0].clientY : e.clientY;
  _coverDrag.startPosY = _coverDrag.currentPosY;
}

function onCoverDragMove(e) {
  if (!_coverDrag.active) return;
  e.preventDefault();
  var clientY = e.touches ? e.touches[0].clientY : e.clientY;
  var cover = document.querySelector('.profile-cover');
  var coverHeight = cover ? cover.offsetHeight : 280;
  var deltaY = clientY - _coverDrag.startY;
  // Convert pixel delta to percentage (invert: drag down = move image down = lower %)
  var deltaPct = (deltaY / coverHeight) * 100;
  _coverDrag.currentPosY = Math.max(0, Math.min(100, _coverDrag.startPosY + deltaPct));
  if (cover) cover.style.backgroundPosition = 'center ' + _coverDrag.currentPosY + '%';
}

function onCoverDragEnd() {
  _coverDrag.active = false;
}

function saveCoverPosition() {
  var cover = document.querySelector('.profile-cover');
  if (cover) cover.classList.remove('repositioning');
  cleanupCoverDrag();
  if (currentUser) currentUser.coverPosY = _coverDrag.currentPosY;
  // Persist to backend
  fetch(_apiUrl('profile'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ coverPosY: _coverDrag.currentPosY })
  }).catch(function() {});
  showToast('Sichtbereich gespeichert! ✅', 'check_circle');
}

function cancelCoverReposition() {
  var cover = document.querySelector('.profile-cover');
  if (cover) {
    cover.classList.remove('repositioning');
    cover.style.backgroundPosition = 'center ' + _coverDrag.savedPosY + '%';
  }
  _coverDrag.currentPosY = _coverDrag.savedPosY;
  cleanupCoverDrag();
}

function cleanupCoverDrag() {
  var cover = document.querySelector('.profile-cover');
  if (cover) {
    cover.removeEventListener('mousedown', onCoverDragStart);
    cover.removeEventListener('touchstart', onCoverDragStart);
  }
  document.removeEventListener('mousemove', onCoverDragMove);
  document.removeEventListener('touchmove', onCoverDragMove);
  document.removeEventListener('mouseup', onCoverDragEnd);
  document.removeEventListener('touchend', onCoverDragEnd);
  _coverDrag.active = false;
}

function removeCover() {
  var cover = document.querySelector('.profile-cover');
  if (cover) cover.style.backgroundImage = '';
  document.getElementById('coverInput').value = '';
  if (currentUser) currentUser.coverUrl = '';
  showToast('Cover-Bild entfernt', 'delete');
}

function handleGalleryUpload(input) {
  var preview = document.getElementById('galleryPreview');
  var existingCount = preview.querySelectorAll('.upload-preview-item').length;
  var files = input.files;

  if (existingCount + files.length > 12) {
    showToast('Maximal 12 Galerie-Bilder erlaubt!', 'error');
    return;
  }

  var queue = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (file.size > 5 * 1024 * 1024) {
      showToast(file.name + ' ist zu groß (max. 5MB)', 'error');
      continue;
    }
    queue.push(file);
  }
  input.value = '';

  // Open crop modal for each image sequentially
  _lcropMode = 'gallery';
  _lcropQueue = queue;
  _lcropQueueIdx = 0;
  if (queue.length > 0) _lcropProcessNext();
}

function _addGalleryPreviewItem(src, blob) {
  var preview = document.getElementById('galleryPreview');
  var div = document.createElement('div');
  div.className = 'upload-preview-item';
  div.innerHTML = '<img src="' + _escHtml(src) + '" alt="Galerie" />' +
    '<div class="upload-preview-actions">' +
      '<button type="button" class="upload-act-crop" title="Zuschneiden" aria-label="Zuschneiden"><span class="material-icons-round">crop</span></button>' +
      '<button type="button" class="upload-act-remove" title="Entfernen" aria-label="Entfernen"><span class="material-icons-round">close</span></button>' +
    '</div>';

  // Crop button
  div.querySelector('.upload-act-crop').onclick = function(e) {
    e.stopPropagation();
    var imgSrc = div.querySelector('img').src;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      _lcropImg = img;
      _lcropX = 0; _lcropY = 0;
      _lcropEditTarget = div;
      _lcropMode = 'gallery';
      _lcropQueue = []; _lcropQueueIdx = 0;
      document.getElementById('lcropZoom').value = 1;
      openModal('listingCropModal');
      setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
    };
    img.src = imgSrc;
  };

  // Remove button
  div.querySelector('.upload-act-remove').onclick = function(e) {
    e.stopPropagation();
    div.remove();
    updateGalleryCount();
  };

  preview.appendChild(div);
  updateGalleryCount();

  // Upload cropped blob to server
  if (blob) {
    uploadFile(blob).then(function(data) {
      div.querySelector('img').src = data.url;
      div.setAttribute('data-url', data.url);
    }).catch(function() {
      showToast('Upload fehlgeschlagen', 'error');
    });
  }
}

function removeGalleryItem(btn) {
  btn.parentElement.remove();
  updateGalleryCount();
}

function updateGalleryCount() {
  var count = document.querySelectorAll('#galleryPreview .upload-preview-item').length;
  var zone = document.getElementById('galleryUploadZone');
  if (zone) {
    var p = zone.querySelector('p');
    if (count > 0) {
      p.textContent = count + ' Bild' + (count > 1 ? 'er' : '') + ' – weitere hinzufügen';
    } else {
      p.textContent = 'Galerie-Bilder hochladen';
    }
  }
}

// Drag & Drop support
function setupDragDrop() {
  var zones = document.querySelectorAll('.upload-zone');
  zones.forEach(function(zone) {
    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      var fileInput = zone.querySelector('input[type="file"]');
      if (fileInput && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });
  });
}

// ======== UNIVERSAL DRAG/SWIPE-SCROLL for horizontal containers ========
function _makeDraggable(el) {
  if (!el || el._dragInit) return;
  el._dragInit = true;

  var isDown = false, startX = 0, scrollLeft = 0, lastX = 0, lastTime = 0, velocity = 0, moved = false;
  var rafId = null;

  // ── Mouse drag (desktop) ──
  el.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    isDown = true; moved = false;
    el.classList.add('dragging');
    startX = e.pageX;
    scrollLeft = el.scrollLeft;
    lastX = e.pageX; lastTime = performance.now(); velocity = 0;
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    var dx = e.pageX - startX;
    if (Math.abs(dx) > 3) moved = true;
    var now = performance.now();
    var dt = now - lastTime;
    if (dt > 0) velocity = (e.pageX - lastX) / dt;
    lastX = e.pageX; lastTime = now;
    el.scrollLeft = scrollLeft - dx;
  });

  document.addEventListener('mouseup', function() {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('dragging');
    // Momentum coast
    if (Math.abs(velocity) > 0.5) {
      _momentumScroll(el, velocity);
    }
  });

  // Prevent click when dragged
  el.addEventListener('click', function(e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);

  // ── Touch (mobile) – native scrolling is fine, but add momentum feel ──
  var touchStartX = 0, touchScrollLeft = 0;
  el.addEventListener('touchstart', function(e) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = el.scrollLeft;
    velocity = 0; lastX = touchStartX; lastTime = performance.now();
    el.classList.add('dragging');
  }, { passive: true });

  el.addEventListener('touchmove', function(e) {
    var now = performance.now();
    var dt = now - lastTime;
    if (dt > 0) velocity = (e.touches[0].pageX - lastX) / dt;
    lastX = e.touches[0].pageX; lastTime = now;
  }, { passive: true });

  el.addEventListener('touchend', function() {
    el.classList.remove('dragging');
    if (Math.abs(velocity) > 0.4) {
      _momentumScroll(el, velocity);
    }
  }, { passive: true });

  function _momentumScroll(container, vel) {
    var speed = vel * 12;
    var decel = 0.95;
    function step() {
      if (Math.abs(speed) < 0.5) return;
      container.scrollLeft -= speed;
      speed *= decel;
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }
}

function initDragScroll() {
  // Apply to ALL horizontal-scroll containers
  var selectors = [
    '.category-scroll',
    '.browse-categories-inner',
    '.chip-group',

    '.testimonials-scroll',
    '.browse-filter-pills',
  ];
  selectors.forEach(function(sel) {
    document.querySelectorAll(sel).forEach(_makeDraggable);
  });
}

