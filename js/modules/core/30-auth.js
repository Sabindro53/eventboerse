// ========== AUTH ==========
var currentUser = null;
var _wpNonce = (typeof eventboerseApi !== 'undefined') ? eventboerseApi.nonce : '';
var _pendingOtpLogin = null;
var _pendingRegOtp = null;
var _LOGIN_OTP_STORAGE_KEY = 'eventboerse_pending_login_otp';
var _conditionalAbort = null;
var _backendAvailable = null; // null = not checked, true/false after check
var _stripeOnboardingPromptTimer = null;

function _savePendingLoginOtp() {
  try {
    if (_pendingOtpLogin && _pendingOtpLogin.email) {
      sessionStorage.setItem(_LOGIN_OTP_STORAGE_KEY, JSON.stringify({
        email: _pendingOtpLogin.email,
        resendToken: _pendingOtpLogin.resendToken || ''
      }));
    }
  } catch (e) {}
}

function _restorePendingLoginOtp() {
  if (_pendingOtpLogin && _pendingOtpLogin.email) return _pendingOtpLogin;
  try {
    var raw = sessionStorage.getItem(_LOGIN_OTP_STORAGE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (parsed && parsed.email) {
      _pendingOtpLogin = {
        email: String(parsed.email || '').trim(),
        resendToken: String(parsed.resendToken || '').trim()
      };
      return _pendingOtpLogin;
    }
  } catch (e) {}
  return null;
}

function _clearPendingLoginOtp() {
  _pendingOtpLogin = null;
  try { sessionStorage.removeItem(_LOGIN_OTP_STORAGE_KEY); } catch (e) {}
}

// ── Offline / Demo Auth (localStorage-based) ──────────────
function _demoUsers() {
  try { return JSON.parse(localStorage.getItem('eb_demo_users') || '[]'); } catch(e) { return []; }
}
function _saveDemoUsers(users) {
  localStorage.setItem('eb_demo_users', JSON.stringify(users));
}
function _demoSession() {
  try { return JSON.parse(localStorage.getItem('eb_demo_session') || 'null'); } catch(e) { return null; }
}
function _saveDemoSession(user) {
  localStorage.setItem('eb_demo_session', user ? JSON.stringify(user) : 'null');
}

// Check backend availability (cached for 60s)
var _backendCheckedAt = 0;
async function _checkBackend() {
  if (_backendAvailable !== null && (Date.now() - _backendCheckedAt < 60000)) return _backendAvailable;
  try {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, 3000);
    var r = await fetch(_apiUrl('me'), {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);
    _backendAvailable = true;
    _backendCheckedAt = Date.now();
    return true;
  } catch(e) {
    _backendAvailable = false;
    _backendCheckedAt = Date.now();
    return false;
  }
}

// Demo-mode: local login
function _demoLogin(email, password) {
  var users = _demoUsers();
  var user = users.find(function(u) { return u.email.toLowerCase() === email.toLowerCase(); });
  if (!user) return { ok: false, message: 'Kein Konto mit dieser E-Mail gefunden.' };
  if (user.password !== password) return { ok: false, message: 'Falsches Passwort.' };
  _saveDemoSession(user);
  return { ok: true, user: user };
}

// Demo-mode: local register
function _demoRegister(email, password, firstName, lastName, role, subRole, company, vatId) {
  var users = _demoUsers();
  if (users.find(function(u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
    return { ok: false, message: 'Diese E-Mail-Adresse wird bereits verwendet.' };
  }
  var displayRole = role === 'provider' ? 'Dienstleister' : 'Event-Planer';
  var user = {
    user_id: Date.now(),
    id: Date.now(),
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
    name: (firstName + ' ' + lastName).trim(),
    role: displayRole,
    baseRole: displayRole,
    subRole: role === 'user' ? (subRole || 'privat') : '',
    isAdmin: false,
    emailVerified: true,
    hasPasskey: false,
    passkeyCount: 0,
    twoFA: false,
    since: new Date().toISOString().split('T')[0],
    tagline: '', location: '', bio: '',
    company: company || '', vatId: vatId || '',
    gallery: [],
    coverUrl: '', coverPosY: 50, photoUrl: '', phone: ''
  };
  users.push(user);
  _saveDemoUsers(users);
  _saveDemoSession(user);
  return { ok: true, user: user };
}

// Demo-mode: passkey (WebAuthn)
function _demoPasskeyCredentials() {
  try { return JSON.parse(localStorage.getItem('eb_demo_passkeys') || '[]'); } catch(e) { return []; }
}
function _saveDemoPasskeys(creds) {
  localStorage.setItem('eb_demo_passkeys', JSON.stringify(creds));
}

async function _demoPasskeyRegister(label) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');
  if (!currentUser) throw new Error('Bitte zuerst anmelden.');

  var userId = new Uint8Array(16);
  crypto.getRandomValues(userId);
  var challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  var publicKey = {
    challenge: challenge.buffer,
    rp: { name: 'Eventbörse', id: window.location.hostname },
    user: {
      id: userId.buffer,
      name: currentUser.email,
      displayName: currentUser.name
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' }
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required'
    },
    timeout: 60000,
    attestation: 'none'
  };

  var credential = await navigator.credentials.create({ publicKey: publicKey });
  var creds = _demoPasskeyCredentials();
  creds.push({
    credId: _arrayBufferToBase64Url(credential.rawId),
    userId: currentUser.id || currentUser.user_id,
    email: currentUser.email,
    label: label || 'Passkey',
    created: new Date().toISOString()
  });
  _saveDemoPasskeys(creds);
  currentUser.hasPasskey = true;
  currentUser.passkeyCount = creds.filter(function(c) { return c.userId === (currentUser.id || currentUser.user_id); }).length;
  return { success: true, hasPasskey: true, passkeyCount: currentUser.passkeyCount };
}

async function _demoPasskeyLogin(email) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');

  var creds = _demoPasskeyCredentials();
  var allowCredentials = creds;
  if (email) {
    allowCredentials = creds.filter(function(c) { return c.email.toLowerCase() === email.toLowerCase(); });
  }
  if (allowCredentials.length === 0) throw new Error('Keine Passkeys gefunden. Bitte richte zuerst einen Passkey ein.');

  var challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  var publicKey = {
    challenge: challenge.buffer,
    rpId: window.location.hostname,
    allowCredentials: allowCredentials.map(function(c) {
      return { id: _base64UrlToArrayBuffer(c.credId), type: 'public-key' };
    }),
    userVerification: 'required',
    timeout: 60000
  };

  var assertion = await navigator.credentials.get({ publicKey: publicKey });
  var usedCredId = _arrayBufferToBase64Url(assertion.rawId);
  var matched = creds.find(function(c) { return c.credId === usedCredId; });
  if (!matched) throw new Error('Passkey nicht erkannt.');

  // Find the user
  var users = _demoUsers();
  var user = users.find(function(u) { return (u.id || u.user_id) === matched.userId || u.email.toLowerCase() === matched.email.toLowerCase(); });
  if (!user) throw new Error('Benutzer nicht gefunden.');

  _saveDemoSession(user);
  return { ok: true, user: user };
}

function _refreshNonce(response) {
  var n = response.headers.get('X-WP-Nonce');
  if (n) _wpNonce = n;
  return response;
}

function _normalizeUserPayload(data, fallback) {
  data = data || {};
  fallback = fallback || {};

  var firstName = data.first_name || fallback.first_name || '';
  var lastName = data.last_name || fallback.last_name || '';
  var fullName = ((firstName || '') + ' ' + (lastName || '')).trim();

  if (!fullName) {
    fullName = data.name || fallback.name || '';
  }

  return {
    id: data.user_id || data.id || fallback.user_id || fallback.id || null,
    name: fullName,
    email: data.email || fallback.email || '',
    role: data.role || fallback.role || 'Event-Planer',
    baseRole: data.baseRole || data.base_role || fallback.baseRole || fallback.base_role || data.role || fallback.role || 'Event-Planer',
    subRole: data.subRole || data.sub_role || fallback.subRole || fallback.sub_role || '',
    isAdmin: (data.role === 'Admin') || (fallback.role === 'Admin') || false,
    tagline: data.tagline || fallback.tagline || '',
    location: data.location || fallback.location || '',
    bio: data.bio || fallback.bio || '',
    company: data.company || fallback.company || '',
    vatId: data.vatId || data.vat_id || fallback.vatId || fallback.vat_id || '',
    gallery: data.gallery || fallback.gallery || [],
    coverUrl: data.coverUrl || fallback.coverUrl || '',
    coverPosY: data.coverPosY || fallback.coverPosY || 50,
    photoUrl: data.photoUrl || fallback.photoUrl || '',
    phone: data.phone || fallback.phone || '',
    since: data.since || fallback.since || '',
    emailVerified: typeof data.emailVerified === 'boolean' ? data.emailVerified : (typeof fallback.emailVerified === 'boolean' ? fallback.emailVerified : true),
    hasPasskey: typeof data.hasPasskey === 'boolean' ? data.hasPasskey : (typeof fallback.hasPasskey === 'boolean' ? fallback.hasPasskey : false),
    passkeyCount: typeof data.passkeyCount === 'number' ? data.passkeyCount : (typeof fallback.passkeyCount === 'number' ? fallback.passkeyCount : 0),
    twoFA: typeof data.twoFA === 'boolean' ? data.twoFA : (typeof fallback.twoFA === 'boolean' ? fallback.twoFA : false)
  };
}

function _applyAuthenticatedUser(data, fallback) {
  _wpNonce = data && data.nonce ? data.nonce : _wpNonce;
  currentUser = _normalizeUserPayload(data, fallback);
  return currentUser;
}

function _base64UrlToArrayBuffer(value) {
  if (!value) return new ArrayBuffer(0);
  var normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  var binary = atob(normalized);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function _arrayBufferToBase64Url(buffer) {
  var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function _publicKeyCredentialToJSON(credential) {
  if (credential instanceof ArrayBuffer) {
    return _arrayBufferToBase64Url(credential);
  }
  if (credential instanceof Uint8Array) {
    return _arrayBufferToBase64Url(credential);
  }
  if (Array.isArray(credential)) {
    return credential.map(_publicKeyCredentialToJSON);
  }
  if (credential && typeof credential === 'object') {
    // PublicKeyCredential properties are on the prototype – use getters explicitly
    if (typeof PublicKeyCredential !== 'undefined' && credential instanceof PublicKeyCredential) {
      var obj = {
        id: credential.id,
        rawId: _arrayBufferToBase64Url(credential.rawId),
        type: credential.type
      };
      if (credential.response) {
        obj.response = {};
        if (credential.response.clientDataJSON)
          obj.response.clientDataJSON = _arrayBufferToBase64Url(credential.response.clientDataJSON);
        if (credential.response.attestationObject)
          obj.response.attestationObject = _arrayBufferToBase64Url(credential.response.attestationObject);
        if (credential.response.authenticatorData)
          obj.response.authenticatorData = _arrayBufferToBase64Url(credential.response.authenticatorData);
        if (credential.response.signature)
          obj.response.signature = _arrayBufferToBase64Url(credential.response.signature);
        if (credential.response.userHandle)
          obj.response.userHandle = _arrayBufferToBase64Url(credential.response.userHandle);
        if (typeof credential.response.getTransports === 'function') {
          obj.response.transports = credential.response.getTransports();
        }
      }
      if (credential.authenticatorAttachment)
        obj.authenticatorAttachment = credential.authenticatorAttachment;
      return obj;
    }
    var result = {};
    Object.keys(credential).forEach(function(key) {
      result[key] = _publicKeyCredentialToJSON(credential[key]);
    });
    return result;
  }
  return credential;
}

function _preparePublicKeyOptions(publicKey) {
  var prepared = JSON.parse(JSON.stringify(publicKey || {}));

  if (prepared.challenge) {
    prepared.challenge = _base64UrlToArrayBuffer(prepared.challenge);
  }
  if (prepared.user && prepared.user.id) {
    prepared.user.id = _base64UrlToArrayBuffer(prepared.user.id);
  }
  if (Array.isArray(prepared.excludeCredentials)) {
    prepared.excludeCredentials = prepared.excludeCredentials.map(function(item) {
      return Object.assign({}, item, { id: _base64UrlToArrayBuffer(item.id) });
    });
  }
  if (Array.isArray(prepared.allowCredentials)) {
    prepared.allowCredentials = prepared.allowCredentials.map(function(item) {
      return Object.assign({}, item, { id: _base64UrlToArrayBuffer(item.id) });
    });
  }

  return prepared;
}

function isWebAuthnAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials && typeof navigator.credentials.create === 'function' && typeof navigator.credentials.get === 'function');
}

// Übersetzt technische WebAuthn-/Passkey-Fehler in eine freundliche,
// verständliche Meldung auf Deutsch. Fällt bei unbekannten Fehlern auf eine
// generische, aber nette Nachricht zurück (keine rohen Browser-URLs mehr).
function _friendlyPasskeyError(err, fallback) {
  var fb = fallback || 'Hat nicht ganz geklappt – bitte versuche es erneut.';
  if (!err) return fb;
  var name = err.name || '';
  var raw  = (err.message || '') + '';
  // Typische Browser-Fehler (Chrome/Safari/Firefox)
  if (name === 'NotAllowedError' || /not allowed|timed out|timeout/i.test(raw)) {
    return 'Hat nicht ganz geklappt – bitte versuche es erneut.';
  }
  if (name === 'AbortError' || /abort/i.test(raw)) {
    return 'Anmeldung abgebrochen – versuche es einfach noch einmal.';
  }
  if (name === 'InvalidStateError') {
    return 'Dieser Passkey ist bereits eingerichtet. Versuche dich direkt anzumelden.';
  }
  if (name === 'SecurityError') {
    return 'Aus Sicherheitsgründen nicht erlaubt. Bitte lade die Seite neu und versuche es erneut.';
  }
  if (name === 'NotSupportedError') {
    return 'Dein Gerät oder Browser unterstützt Passkeys (noch) nicht.';
  }
  if (name === 'ConstraintError') {
    return 'Das Gerät konnte die Anforderung nicht erfüllen. Bitte versuche es erneut.';
  }
  // Rohe WebAuthn-Spec-URL nie dem Nutzer anzeigen
  if (/webauthn|w3\.org|#sctn-/i.test(raw)) {
    return 'Hat nicht ganz geklappt – bitte versuche es erneut.';
  }
  // Plain Error vom Server (Error mit menschlich lesbarer deutscher Nachricht):
  // Diese Meldungen kommen aus webauthn.php (z.B. "Origin stimmt nicht.",
  // "Challenge stimmt nicht.", "Biometrische Verifizierung wurde nicht
  // bestätigt.", …) und sind für den Nutzer aussagekräftiger als der Fallback.
  // Wir zeigen sie nur, wenn sie wie eine echte Satz-Meldung aussehen
  // (kein Trace, keine URL, keine Klammern/Backslashes, max. 200 Zeichen).
  if (
    name === 'Error' &&
    raw &&
    raw.length > 0 &&
    raw.length <= 200 &&
    !/[<>{}\\]|https?:\/\//i.test(raw)
  ) {
    return raw;
  }
  // Unbekannt: lieber freundlicher Fallback statt technische Meldung
  return fb;
}

function getBiometricLoginLabel() {
  var ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Mit Face ID anmelden';
  if (/Android/i.test(ua)) return 'Mit Biometrie anmelden';
  return 'Mit Passkey anmelden';
}

function updatePasskeyLoginUi() {
  var btn = document.getElementById('loginPasskeyBtn');
  var text = document.getElementById('loginPasskeyBtnText');
  var hint = document.getElementById('loginPasskeyHint');
  if (!btn || !text || !hint) return;

  text.textContent = getBiometricLoginLabel();

  if (isWebAuthnAvailable()) {
    btn.disabled = false;
    hint.classList.remove('is-disabled');
    hint.textContent = 'Nutze Face ID, Fingerabdruck oder die Geräte-PIN, wenn dein Gerät Passkeys unterstützt.';
  } else {
    btn.disabled = true;
    hint.classList.add('is-disabled');
    hint.textContent = 'Auf diesem Gerät ist kein Passkey-Login verfügbar. Nutze E-Mail, Passwort und den zusätzlichen E-Mail-Code.';
  }
}

// -- Conditional UI: auto-prompt Face ID / biometric via autofill --
async function initConditionalPasskeyLogin() {
  if (_conditionalAbort) return;
  if (isLoggedIn) return;
  if (!isWebAuthnAvailable()) return;
  if (!window.PublicKeyCredential ||
      typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') return;

  var supported = false;
  try { supported = await PublicKeyCredential.isConditionalMediationAvailable(); } catch (e) {}
  if (!supported) return;

  try {
    var optionsData = await getPasskeyLoginOptions('');

    _conditionalAbort = new AbortController();
    var credential = await navigator.credentials.get({
      publicKey: _preparePublicKeyOptions(optionsData.publicKey),
      mediation: 'conditional',
      signal: _conditionalAbort.signal
    });
    _conditionalAbort = null;

    var response = await fetch(_apiUrl('webauthn/login'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        requestId: optionsData.requestId,
        credential: _publicKeyCredentialToJSON(credential)
      })
    });
    _refreshNonce(response);
    var data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Passkey-Anmeldung fehlgeschlagen.');

    _applyAuthenticatedUser(data);
    closeModal('loginModal');
    applyLogin('login');
    showToast('Willkommen zurück!', 'fingerprint');
  } catch (err) {
    _conditionalAbort = null;
    if (err && err.name !== 'AbortError') {
      // Silently ignore – user may have dismissed or has no passkeys
    }
  }
}

function _passkeyPromptStorageKey() {
  if (!currentUser || !currentUser.id) return '';
  return 'eb_passkey_prompt_dismissed_' + currentUser.id;
}

function shouldPromptPasskeySetup() {
  if (!currentUser) return false;
  if (!currentUser.emailVerified) return false;
  if (currentUser.hasPasskey || (currentUser.passkeyCount || 0) > 0) return false;
  if (!isWebAuthnAvailable()) return false;
  var storageKey = _passkeyPromptStorageKey();
  if (storageKey && localStorage.getItem(storageKey) === '1') return false;
  return true;
}

function maybePromptPasskeySetup() {
  if (!shouldPromptPasskeySetup()) return;
  setTimeout(function() {
    if (document.querySelector('.modal-overlay.show')) return;
    openModal('passkeySetupModal');
  }, isDienstleister() ? 3600 : 350);
}

function _stripeOnboardingPromptStorageKey(context) {
  if (!currentUser || !currentUser.id) return '';
  return 'eb_stripe_onboarding_prompt_' + context + '_' + currentUser.id;
}

function _stripeOnboardingPromptRecentlyShown(context) {
  var key = _stripeOnboardingPromptStorageKey(context);
  if (!key) return false;
  var raw = localStorage.getItem(key);
  var last = raw ? parseInt(raw, 10) : 0;
  if (!last) return false;
  var hours = context === 'registration' ? 0 : (context === 'create-listing' ? 2 : 24);
  return hours > 0 && (Date.now() - last) < hours * 60 * 60 * 1000;
}

function _markStripeOnboardingPromptShown(context) {
  var key = _stripeOnboardingPromptStorageKey(context);
  if (key) localStorage.setItem(key, String(Date.now()));
}

function _stripeOnboardingModalVisible() {
  var modal = document.getElementById('stripeOnboardingIntroModal');
  return !!(modal && modal.classList.contains('show'));
}

function _openStripeOnboardingIntro(context, statusData) {
  if (!currentUser || !isDienstleister()) return;
  var modal = document.getElementById('stripeOnboardingIntroModal');
  if (!modal) {
    connectStripeAccount(null);
    return;
  }
  var titleEl = document.getElementById('stripeOnboardingIntroTitle');
  var textEl = document.getElementById('stripeOnboardingIntroText');
  if (titleEl) titleEl.textContent = context === 'registration' ? 'Fast fertig: Auszahlungen einrichten' : 'Auszahlungskonto verbinden';
  if (textEl) {
    textEl.textContent = context === 'create-listing'
      ? 'Dein Inserat kann online gehen. Damit Kunden dich später direkt buchen können, verbindest du jetzt sicher dein Stripe-Auszahlungskonto.'
      : 'Damit Kunden dich buchen und bezahlen können, führt dich Stripe einmalig durch Bankkonto- und Identitätsprüfung. Eventbörse sieht deine Bankdaten nie.';
  }
  modal.dataset.context = context || 'login';
  modal.dataset.status = (statusData && statusData.status) || 'none';
  _markStripeOnboardingPromptShown(context || 'login');
  openModal('stripeOnboardingIntroModal');
}

function maybePromptStripeOnboarding(context, statusData) {
  context = context || 'login';
  if (!currentUser || !isDienstleister()) return Promise.resolve(null);
  if (_backendAvailable === false) return Promise.resolve(null);
  if (_stripeOnboardingPromptRecentlyShown(context)) return Promise.resolve(null);
  if (_stripeOnboardingPromptTimer) {
    clearTimeout(_stripeOnboardingPromptTimer);
    _stripeOnboardingPromptTimer = null;
  }

  var statusPromise = statusData ? Promise.resolve(statusData) : loadStripeConnectStatus();
  return statusPromise.then(function(data) {
    var status = (data && data.status) || 'none';
    if (status === 'active') return data;
    if (status === 'pending') {
      if (context === 'registration' || context === 'create-listing') {
        showToast('Stripe prüft dein Auszahlungskonto. Buchungen werden freigeschaltet, sobald Stripe fertig ist.', 'hourglass_top');
      }
      return data;
    }
    var delay = context === 'registration' ? 650 : (context === 'create-listing' ? 500 : 1100);
    _stripeOnboardingPromptTimer = setTimeout(function() {
      _stripeOnboardingPromptTimer = null;
      var blockingModal = document.querySelector('.modal-overlay.show');
      if (blockingModal && blockingModal.id !== 'stripeOnboardingIntroModal' && blockingModal.id !== 'stripeBusinessTypeModal') {
        if (context !== 'create-listing') return;
      }
      if (!_stripeOnboardingModalVisible()) _openStripeOnboardingIntro(context, data);
    }, delay);
    return data;
  }).catch(function() {
    return null;
  });
}

function startStripeOnboardingFromIntro(btn) {
  closeModal('stripeOnboardingIntroModal');
  connectStripeAccount(btn || null);
}

function dismissStripeOnboardingPrompt() {
  var modal = document.getElementById('stripeOnboardingIntroModal');
  var context = (modal && modal.dataset && modal.dataset.context) || 'login';
  _markStripeOnboardingPromptShown(context);
  closeModal('stripeOnboardingIntroModal');
  showToast('Alles klar. Du kannst Stripe später in den Einstellungen verbinden.', 'info');
}

function dismissPasskeySetupPrompt() {
  var storageKey = _passkeyPromptStorageKey();
  if (storageKey) localStorage.setItem(storageKey, '1');
  closeModal('passkeySetupModal');
}

async function handlePromptPasskeySetup(btn) {
  try {
    if (btn) _setBtnLoading(btn, true);
    await registerPasskey('Standardgerät');
    var storageKey = _passkeyPromptStorageKey();
    if (storageKey) localStorage.removeItem(storageKey);
    closeModal('passkeySetupModal');
    showToast('Passkey erfolgreich eingerichtet', 'fingerprint');
  } catch (err) {
    showToast(_friendlyPasskeyError(err, 'Passkey konnte nicht eingerichtet werden.'), 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

// Kleines Hilfsmittel: fetch mit Hard-Timeout, damit kein Aufruf endlos hängt
function _fetchWithTimeout(url, options, timeoutMs) {
  options = options || {};
  var ctrl = new AbortController();
  var timer = setTimeout(function() { ctrl.abort(); }, timeoutMs || 15000);
  options.signal = ctrl.signal;
  return fetch(url, options).finally(function() { clearTimeout(timer); });
}

async function getPasskeyRegisterOptions() {
  var response = await _fetchWithTimeout(_apiUrl('webauthn/register-options'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders()
  }, 15000);
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey-Optionen konnten nicht geladen werden.');
  return data;
}

// Globaler Abort-Controller, damit eine laufende WebAuthn-Zeremonie
// (insb. auf iOS Safari, das gerne mal stillschweigend hängt) hart
// abgebrochen werden kann.
var _passkeyAbort = null;

function _abortPendingPasskey() {
  if (_passkeyAbort) {
    try { _passkeyAbort.abort(); } catch (e) {}
    _passkeyAbort = null;
  }
}

async function registerPasskey(label) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');

  // Demo/offline mode
  if (_backendAvailable === false) {
    return await _demoPasskeyRegister(label);
  }

  var optionsData = await getPasskeyRegisterOptions();

  // Vorherige Zeremonie ggf. abbrechen, damit sich nichts staut
  _abortPendingPasskey();
  _passkeyAbort = new AbortController();

  var credential = await navigator.credentials.create({
    publicKey: _preparePublicKeyOptions(optionsData.publicKey),
    signal: _passkeyAbort.signal
  });

  var response = await fetch(_apiUrl('webauthn/register'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      label: label || '',
      credential: _publicKeyCredentialToJSON(credential)
    })
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey konnte nicht gespeichert werden.');

  if (currentUser) {
    currentUser.hasPasskey = !!data.hasPasskey;
    currentUser.passkeyCount = data.passkeyCount || 0;
  }

  return data;
}

async function getPasskeyLoginOptions(email) {
  var response = await fetch(_apiUrl('webauthn/login-options'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ email: (email || '').trim() })
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey-Login konnte nicht vorbereitet werden.');
  return data;
}

async function loginWithPasskey(email) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');

  var optionsData = await getPasskeyLoginOptions(email);
  var credential = await navigator.credentials.get({
    publicKey: _preparePublicKeyOptions(optionsData.publicKey)
  });

  var response = await fetch(_apiUrl('webauthn/login'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      requestId: optionsData.requestId,
      credential: _publicKeyCredentialToJSON(credential)
    })
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey-Anmeldung fehlgeschlagen.');

  _applyAuthenticatedUser(data);
  return data;
}

async function handleLoginWithPasskey(btn) {
  if (btn && btn.disabled) return;

  // Cancel conditional mediation if active
  if (_conditionalAbort) {
    _conditionalAbort.abort();
    _conditionalAbort = null;
  }

  try {
    if (btn) _setBtnLoading(btn, true);
    var emailField = document.getElementById('loginEmail');
    var email = emailField ? emailField.value.trim() : '';

    var online = await _checkBackend();

    if (!online) {
      // Demo/offline passkey login
      var demoResult = await _demoPasskeyLogin(email);
      _applyAuthenticatedUser(demoResult.user);
      closeModal('loginModal');
      var form = document.querySelector('#loginModal .modal-form');
      if (form) form.reset();
      applyLogin('login');
      showToast('Passkey-Anmeldung erfolgreich (Offline-Modus)', 'fingerprint');
    } else {
      await loginWithPasskey(email);
      closeModal('loginModal');
      var form = document.querySelector('#loginModal .modal-form');
      if (form) form.reset();
      applyLogin('login');
      showToast('Passkey-Anmeldung erfolgreich', 'fingerprint');
    }
    maybePromptPasskeySetup();
  } catch (err) {
    showToast(_friendlyPasskeyError(err, 'Passkey-Anmeldung fehlgeschlagen.'), 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function sendEmailOtp(email, password) {
  var payload = {
    email: (email || '').trim()
  };

  if (password) payload.password = password;

  var response = await fetch(_apiUrl('otp/send'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify(payload)
  });
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'E-Mail-Code konnte nicht gesendet werden.');
  return data;
}

async function resendEmailOtp(email, resendToken) {
  var response = await fetch(_apiUrl('otp/send'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      email: (email || '').trim(),
      resend: true,
      resend_token: resendToken || ''
    })
  });
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Code konnte nicht erneut gesendet werden.');
  return data;
}

async function verifyEmailOtp(email, code) {
  var response = await fetch(_apiUrl('otp/verify'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      email: (email || '').trim(),
      code: (code || '').trim()
    })
  });
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'E-Mail-Code ist ungültig.');

  _applyAuthenticatedUser(data);
  return data;
}

function openLoginOtpModal(email, password) {
  _pendingOtpLogin = {
    email: (email || '').trim(),
    resendToken: password && typeof password === 'object' ? password.resendToken || '' : ''
  };
  _savePendingLoginOtp();

  var emailText = document.getElementById('loginOtpEmailText');
  var codeInput = document.getElementById('loginOtpCode');
  if (emailText) emailText.textContent = _pendingOtpLogin.email || 'deine E-Mail';
  if (codeInput) codeInput.value = '';
  closeModal('loginModal');
  openModal('loginOtpModal');
}

function cancelLoginOtpFlow() {
  _clearPendingLoginOtp();
  closeModal('loginOtpModal');
}

async function resendLoginOtp(btn) {
  _restorePendingLoginOtp();
  if (!_pendingOtpLogin || !_pendingOtpLogin.email || !_pendingOtpLogin.resendToken) {
    showToast('Bitte starte die Anmeldung erneut.', 'warning');
    cancelLoginOtpFlow();
    openModal('loginModal');
    return;
  }

  try {
    if (btn) _setBtnLoading(btn, true);
    var data = await resendEmailOtp(_pendingOtpLogin.email, _pendingOtpLogin.resendToken);
    _pendingOtpLogin.resendToken = data.resendToken || _pendingOtpLogin.resendToken;
    _savePendingLoginOtp();
    showToast('Neuer E-Mail-Code wurde gesendet.', 'mark_email_read');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Code konnte nicht erneut gesendet werden.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function handleLoginOtpVerify(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);
  _restorePendingLoginOtp();

  if (!_pendingOtpLogin || !_pendingOtpLogin.email) {
    showToast('Bitte starte die Anmeldung erneut.', 'warning');
    cancelLoginOtpFlow();
    openModal('loginModal');
    return;
  }

  var code = document.getElementById('loginOtpCode').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');

  if (!/^\d{6}$/.test(code)) {
    _setFieldError('loginOtpCode', 'Bitte gib den 6-stelligen Code ein.');
    return;
  }

  try {
    _setBtnLoading(submitBtn, true);
    await verifyEmailOtp(_pendingOtpLogin.email, code);
    _clearPendingLoginOtp();
    closeModal('loginOtpModal');
    form.reset();
    applyLogin('login');
    showToast('Anmeldung erfolgreich bestätigt', 'mark_email_read');
    maybePromptPasskeySetup();
  } catch (err) {
    _setFieldError('loginOtpCode', err && err.message ? err.message : 'Code ist ungültig.');
  } finally {
    _setBtnLoading(submitBtn, false);
  }
}

async function loadPasskeyCredentials() {
  // Demo/offline mode
  if (_backendAvailable === false) {
    var creds = _demoPasskeyCredentials();
    var uid = currentUser ? (currentUser.id || currentUser.user_id) : null;
    var userCreds = creds.filter(function(c) { return c.userId === uid; });
    return {
      hasPasskey: userCreds.length > 0,
      passkeyCount: userCreds.length,
      credentials: userCreds.map(function(c) {
        return { credential_id: c.credId, label: c.label, created_at: c.created ? c.created.split('T')[0] : 'unbekannt', last_used_at: 'n/a', transports: ['internal'] };
      })
    };
  }

  var response = await fetch(_apiUrl('webauthn/credentials'), {
    method: 'GET',
    credentials: 'same-origin',
    headers: _apiHeaders()
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkeys konnten nicht geladen werden.');

  if (currentUser) {
    currentUser.hasPasskey = !!data.hasPasskey;
    currentUser.passkeyCount = data.passkeyCount || 0;
  }

  return data;
}

async function deletePasskeyCredential(credentialId) {
  // Demo/offline mode
  if (_backendAvailable === false) {
    var creds = _demoPasskeyCredentials();
    creds = creds.filter(function(c) { return c.credId !== credentialId; });
    _saveDemoPasskeys(creds);
    var uid = currentUser ? (currentUser.id || currentUser.user_id) : null;
    var remaining = creds.filter(function(c) { return c.userId === uid; });
    if (currentUser) {
      currentUser.hasPasskey = remaining.length > 0;
      currentUser.passkeyCount = remaining.length;
    }
    return { hasPasskey: remaining.length > 0, passkeyCount: remaining.length };
  }

  var response = await fetch(_apiUrl('webauthn/credentials/' + encodeURIComponent(credentialId)), {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: _apiHeaders()
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey konnte nicht gelöscht werden.');

  if (currentUser) {
    currentUser.hasPasskey = !!data.hasPasskey;
    currentUser.passkeyCount = data.passkeyCount || 0;
  }

  return data;
}

function _apiUrl(endpoint) {
  if (typeof eventboerseApi !== 'undefined' && eventboerseApi.restUrl) {
    return eventboerseApi.restUrl + endpoint;
  }
  return '/wp-json/eventboerse/v1/' + endpoint;
}

function _apiHeaders() {
  var h = { 'Content-Type': 'application/json' };
  if (_wpNonce) h['X-WP-Nonce'] = _wpNonce;
  return h;
}

function _renderStars(rating) {
  var r = Math.max(0, Math.min(5, parseFloat(rating) || 0));
  var full = Math.floor(r);
  var half = (r - full) >= 0.25 && (r - full) < 0.75 ? 1 : 0;
  if ((r - full) >= 0.75) { full++; half = 0; }
  var empty = 5 - full - half;
  var html = '';
  for (var i = 0; i < full; i++) html += '<span class="material-icons-round" style="font-size:inherit;vertical-align:middle">star</span>';
  if (half) html += '<span class="material-icons-round" style="font-size:inherit;vertical-align:middle">star_half</span>';
  for (var j = 0; j < empty; j++) html += '<span class="material-icons-round" style="font-size:inherit;vertical-align:middle">star_border</span>';
  return html;
}

function _escHtml(str) {
  // Encodet ALLE HTML-Sonderzeichen inkl. Anführungszeichen. Wichtig:
  // textContent→innerHTML encodet " und ' NICHT — dadurch wäre jede
  // Interpolation in ein Attribut (alt="${_escHtml(x)}") per Quote-Injection
  // angreifbar (serverseitiges sanitize_text_field lässt Quotes durch).
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

// Parse a date string in various formats (ISO, DD.MM.YYYY, "15. August 2026", etc.)
// Returns ISO date (YYYY-MM-DD) for <input type="date">, or '' if unparseable.
function _toIsoDate(str) {
  if (!str) return '';
  str = String(str).trim();
  if (!str) return '';
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // DD.MM.YYYY or D.M.YYYY
  var m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  // DD/MM/YYYY
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  // "15. August 2026" German month name
  var months = { januar:1, februar:2, märz:3, maerz:3, april:4, mai:5, juni:6, juli:7, august:8, september:9, oktober:10, november:11, dezember:12 };
  m = str.match(/^(\d{1,2})\.?\s+([A-Za-zäÄöÖüÜß]+)\s+(\d{4})$/);
  if (m) {
    var mon = months[m[2].toLowerCase()];
    if (mon) return m[3] + '-' + ('0' + mon).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  // Fallback: Date.parse
  var d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  return '';
}

// Format any date string as DD.MM.YYYY (German). Falls back to the raw string if unparseable.
function _formatDateDe(str) {
  var iso = _toIsoDate(str);
  if (!iso) return str || '';
  var parts = iso.split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function _stripHtml(str) {
  if (!str) return '';
  var doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.body.textContent || '';
}

function _sanitizeHtml(str) {
  if (!str) return '';
  var allowed = ['P','BR','B','STRONG','I','EM','U','UL','OL','LI','H1','H2','H3','H4','H5','H6','A','BLOCKQUOTE','SPAN','DIV','HR'];
  // Erlaubte URL-Schemata für <a href>. Alles andere (javascript:, data:, vbscript:, file:) wird verworfen.
  var safeUrl = function(u) {
    if (!u) return '';
    try {
      var s = String(u).trim();
      // Erlaube relative URLs (#anchor, /pfad, ./pfad)
      if (s.charAt(0) === '#' || s.charAt(0) === '/' || s.indexOf('./') === 0 || s.indexOf('../') === 0) return s;
      // Erlaube nur http(s):, mailto:, tel:
      if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
      return '';
    } catch(e) { return ''; }
  };
  var doc = new DOMParser().parseFromString(str, 'text/html');
  function clean(parent) {
    Array.from(parent.childNodes).forEach(function(n) {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) { n.remove(); return; }
      if (allowed.indexOf(n.tagName) === -1) { n.remove(); return; }
      Array.from(n.attributes).forEach(function(a) {
        if (n.tagName === 'A' && (a.name === 'href' || a.name === 'target' || a.name === 'rel')) return;
        n.removeAttribute(a.name);
      });
      if (n.tagName === 'A') {
        var href = safeUrl(n.getAttribute('href'));
        if (!href) {
          // Unsicheres Schema → Tag in Span umwandeln, Text behalten.
          var span = doc.createElement('span');
          span.textContent = n.textContent;
          n.parentNode.replaceChild(span, n);
          return;
        }
        n.setAttribute('href', href);
        n.setAttribute('rel', 'noopener noreferrer nofollow ugc');
        n.setAttribute('target', '_blank');
      }
      clean(n);
    });
  }
  clean(doc.body);
  return doc.body.innerHTML;
}

function isEventPlaner() {
  return currentUser && currentUser.role === 'Event-Planer';
}

function isDienstleister() {
  return !!(currentUser && (
    currentUser.role === 'Dienstleister' ||
    currentUser.baseRole === 'Dienstleister'
  ));
}

/**
 * Schaltet die rollenabhängigen Navigations-Elemente um.
 *
 * Grundregel:
 *   • Planungs-Board ('board')   → für ALLE (Event-Planer und Dienstleister
 *     planen eigene Events und stellen Dienstleister zusammen).
 *   • Auftragsboard ('auftraege') → NUR Dienstleister (eingehende Buchungen).
 *
 * Wird bei Login, Logout und jeder Rollen-Änderung aufgerufen, damit
 * Desktop-Menü und kontextbezogene Buttons konsistent bleiben. Zeigt ein
 * Element mit '' (CSS-Default) und versteckt mit 'none'.
 */
function _applyRoleNav() {
  var provider = isLoggedIn && isDienstleister();

  // Auftragsboard nur für Dienstleister; Planungs-Board für alle sichtbar.
  var auftraegeBtn = document.getElementById('auftraegeMenuBtn');
  if (auftraegeBtn) auftraegeBtn.style.display = provider ? '' : 'none';
  var boardBtn = document.getElementById('boardMenuBtn');
  if (boardBtn) boardBtn.style.display = '';

  // Mobile Bottom-Nav: der Board-Slot führt immer zum Planungs-Board.
  // Das Auftragsboard erreichen Dienstleister über das Menü.
  var mobileBoardBtn = document.querySelector('#mobileNav .mobile-nav-board');
  if (mobileBoardBtn) {
    var icon = mobileBoardBtn.querySelector('.material-icons-round');
    var label = mobileBoardBtn.querySelector('span:last-child');
    mobileBoardBtn.setAttribute('onclick', "navigateTo('board')");
    mobileBoardBtn.dataset.page = 'board';
    if (icon) icon.textContent = 'view_kanban';
    if (label) label.textContent = 'Board';
  }

  // "Zum Planungs-Board hinzufügen" auf Inserat-Detail: für alle sichtbar –
  // auch Dienstleister planen eigene Events.
  var addToBoardBtn = document.getElementById('btnAddToBoard');
  if (addToBoardBtn) addToBoardBtn.style.display = '';
}

function applyLogin(context) {
  isLoggedIn = true;
  document.getElementById('loggedOutMenu').style.display = 'none';
  document.getElementById('loggedInMenu').style.display = 'block';
  if (currentUser) {
    var avatarUrl = currentUser.photoUrl || ebAvatar(currentUser.name || 'user', currentUser.name);
    var navAvatar = document.querySelector('#avatarBtn img');
    if (navAvatar) navAvatar.src = avatarUrl;
    var adminLabel = document.getElementById('navAdminLabel');
    if (adminLabel) adminLabel.style.display = currentUser.isAdmin ? 'block' : 'none';
    var adminMenuBtn = document.getElementById('adminMenuBtn');
    if (adminMenuBtn) adminMenuBtn.style.display = currentUser.isAdmin ? 'flex' : 'none';
    // Rollenabhängige Navigation (Planungs-Board vs. Auftragsboard) setzen
    _applyRoleNav();
    // Nach Session-Restore eine evtl. aufgeschobene Stripe-Buchung auflösen
    // (Redirect-Rückkehr, bei der currentUser noch nicht gesetzt war).
    try { if (typeof _resolvePendingPayment === 'function') _resolvePendingPayment(); } catch(e) {}
    // Reconcile ausstehende Webhook-Bestaetigungen
    try { if (typeof _reconcileStripePayments === 'function') setTimeout(_reconcileStripePayments, 800); } catch(e) {}
  }
  var createPage = document.getElementById('page-create-listing');
  if (createPage && createPage.classList.contains('active')) updateCreateFormForRole();
  var menuCreateBtn = document.querySelector('#loggedInMenu button[onclick*="create-listing"]');
  var menuMyListBtn = document.querySelector('#loggedInMenu button[onclick*="my-listings"]');
  if (isEventPlaner()) {
    if (menuCreateBtn) menuCreateBtn.innerHTML = '<span class="material-icons-round">event</span> Event erstellen';
    if (menuMyListBtn) menuMyListBtn.innerHTML = '<span class="material-icons-round">event_note</span> Meine Events';
  } else {
    if (menuCreateBtn) menuCreateBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Inserat erstellen';
    if (menuMyListBtn) menuMyListBtn.innerHTML = '<span class="material-icons-round">storefront</span> Meine Inserate';
  }
  // Update mobile nav labels for role
  var mobileCreateBtn = document.querySelector('#mobileNav button[data-page="create-listing"]');
  if (mobileCreateBtn) {
    var mobileLabel = mobileCreateBtn.querySelector('span:last-child');
    var mobileIcon = mobileCreateBtn.querySelector('.material-icons-round');
    if (isEventPlaner()) {
      if (mobileIcon) mobileIcon.textContent = 'event';
      if (mobileLabel) mobileLabel.textContent = 'Event';
    } else {
      if (mobileIcon) mobileIcon.textContent = 'add_circle';
      if (mobileLabel) mobileLabel.textContent = 'Inserieren';
    }
  }
  // Restore favorites from localStorage first (instant), then merge API data
  _loadFavoritesFromStorage();
  loadFavorites().catch(function(){});
  loadDbListings().then(function() {
    renderFeaturedGrid();
    renderHeroMarquees();
  }).catch(function(){});
  // Update message badge from API
  fetch(_apiUrl('conversations'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { _refreshNonce(r); return r.json(); })
    .then(function(convos) {
      var total = (convos || []).reduce(function(sum, c) { return sum + (parseInt(c.unread_count) || 0); }, 0);
      updateMsgBadge(total);
    })
    .catch(function() { updateMsgBadge(0); });
  // Start presence heartbeat
  _startHeartbeat();
  // Start inactivity auto-logout watch
  _startInactivityWatch();
  // Re-render board if currently visible (session restored after initial render)
  if (document.getElementById('page-board') && document.getElementById('page-board').classList.contains('active')) {
    _migrateBoardProjects();
    _loadBoardProjects();
    renderBoardPage();
  }
  if (context === 'login' || context === 'registration') {
    maybePromptStripeOnboarding(context);
  }
}

function applyLogout() {
  isLoggedIn = false;
  currentUser = null;
  _stopHeartbeat();
  _stopInactivityWatch();
  _dbListingsLoaded = false;
  _favoritesLoaded = false;
  favorites.clear();
  // Don't clear localStorage — favorites persist for next login
  _boardProjects = [];
  _activeBoardId = null;
  // Re-render board if currently visible so projects disappear
  if (document.getElementById('page-board') && document.getElementById('page-board').classList.contains('active')) {
    renderBoardPage();
  }
  updateMsgBadge(0);
  document.getElementById('loggedOutMenu').style.display = 'block';
  document.getElementById('loggedInMenu').style.display = 'none';
  document.getElementById('userMenu').classList.remove('show');
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = ebAvatar('user', 'User');
  var adminLabel = document.getElementById('navAdminLabel');
  if (adminLabel) adminLabel.style.display = 'none';
  var adminMenuBtn = document.getElementById('adminMenuBtn');
  if (adminMenuBtn) adminMenuBtn.style.display = 'none';
  // Rollen-Nav zurücksetzen (Gast → Planungs-Board-Teaser, kein Auftragsboard)
  _applyRoleNav();
  // Reset mobile nav labels
  var mobileCreateBtn = document.querySelector('#mobileNav button[data-page="create-listing"]');
  if (mobileCreateBtn) {
    var mobileIcon = mobileCreateBtn.querySelector('.material-icons-round');
    var mobileLabel = mobileCreateBtn.querySelector('span:last-child');
    if (mobileIcon) mobileIcon.textContent = 'add_circle';
    if (mobileLabel) mobileLabel.textContent = 'Inserieren';
  }
}

// -- Hilfsfunktionen für Formular-Feedback --
function _setFieldError(inputId, msg) {
  var input = document.getElementById(inputId);
  if (!input) return;
  var group = input.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  var existing = group.querySelector('.field-error');
  if (existing) existing.remove();
  if (msg) {
    var el = document.createElement('span');
    el.className = 'field-error';
    el.textContent = msg;
    group.appendChild(el);
  }
}

function _clearFieldErrors(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll('.has-error').forEach(function(g) { g.classList.remove('has-error'); });
  formEl.querySelectorAll('.field-error').forEach(function(e) { e.remove(); });
}

function _setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    if (!btn.dataset.origText) btn.dataset.origText = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="material-icons-round btn-spinner">sync</span>';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    if (btn.dataset.origText) {
      btn.innerHTML = btn.dataset.origText;
      delete btn.dataset.origText;
    }
  }
}

// -- PASSWORD STRENGTH --
function checkPasswordStrength(pw) {
  var score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 'weak', label: 'Schwach', pct: 20 };
  if (score <= 2) return { level: 'fair', label: 'Mittel', pct: 40 };
  if (score <= 3) return { level: 'good', label: 'Gut', pct: 70 };
  return { level: 'strong', label: 'Stark', pct: 100 };
}

function initPasswordFields() {
  // Passwort-Sichtbarkeit-Toggle
  document.querySelectorAll('.password-wrapper').forEach(function(wrapper) {
    var input = wrapper.querySelector('input');
    var toggle = wrapper.querySelector('.password-toggle');
    if (toggle && input) {
      toggle.addEventListener('click', function() {
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.querySelector('.material-icons-round').textContent = isPassword ? 'visibility_off' : 'visibility';
      });
    }
  });
  // Passwortstärke-Anzeige
  var regPw = document.getElementById('regPassword');
  if (regPw) {
    regPw.addEventListener('input', function() {
      var bar = document.getElementById('passwordStrength');
      if (!bar) return;
      if (!regPw.value) { bar.style.display = 'none'; return; }
      bar.style.display = 'flex';
      var s = checkPasswordStrength(regPw.value);
      bar.querySelector('.pw-bar-fill').style.width = s.pct + '%';
      bar.querySelector('.pw-bar-fill').className = 'pw-bar-fill pw-' + s.level;
      bar.querySelector('.pw-label').textContent = s.label;
    });
  }
}

// ---- SESSION RESTORE (bei Seitenaufruf) ----
function restoreSession() {
  // Sofort aus wp_localize_script lesen (frisch gerenderte Seite)
  if (typeof eventboerseApi !== 'undefined' && eventboerseApi.isLoggedIn && eventboerseApi.user) {
    currentUser = _normalizeUserPayload(eventboerseApi.user);
    applyLogin();
    return;
  }
  // Fallback: REST /me prüfen (z. B. Safari-Cache oder Service Worker)
  fetch(_apiUrl('me'), { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function(data) {
      if (data && data.loggedIn) {
        _applyAuthenticatedUser(data);
        applyLogin();
      }
    })
    .catch(function() {
      // Backend nicht erreichbar — Demo-Session wiederherstellen
      _backendAvailable = false;
      var demoUser = _demoSession();
      if (demoUser) {
        _applyAuthenticatedUser(demoUser);
        applyLogin();
      }
    });
}

// ---- LOGIN ----
async function handleLogin(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');

  // Client-Validierung
  var hasError = false;
  if (!email) { _setFieldError('loginEmail', 'E-Mail ist erforderlich'); hasError = true; }
  if (!password) { _setFieldError('loginPassword', 'Passwort ist erforderlich'); hasError = true; }
  if (hasError) return;

  _setBtnLoading(submitBtn, true);

  var online = await _checkBackend();

  // ── Offline / Demo fallback ──
  if (!online) {
    var demoResult = _demoLogin(email, password);
    _setBtnLoading(submitBtn, false);
    if (!demoResult.ok) {
      _setFieldError('loginPassword', demoResult.message);
      return;
    }
    _applyAuthenticatedUser(demoResult.user);
    closeModal('loginModal');
    form.reset();
    applyLogin('login');
    showToast('Willkommen zurück! (Offline-Modus)', 'login');
    return;
  }

  try {
    /* Step 1: Try direct login (validates password, checks 2FA) */
    var loginResp = await fetch(_apiUrl('login'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({ email: email, password: password })
    });
    var loginData = await loginResp.json();

    if (!loginResp.ok) {
      _setBtnLoading(submitBtn, false);
      var msg = loginData.message || 'Verbindungsfehler – bitte versuche es erneut.';
      if (msg.toLowerCase().indexOf('bestätige') >= 0 || msg.toLowerCase().indexOf('postfach') >= 0) {
        _setFieldError('loginPassword', msg);
        var errSpan = form.querySelector('#loginPassword').closest('.form-group').querySelector('.field-error');
        if (errSpan) {
          errSpan.textContent = msg + ' ';
          var resendLink = document.createElement('a');
          resendLink.href = '#';
          resendLink.style.cssText = 'color:var(--primary);font-weight:600';
          resendLink.textContent = 'Bestätigungs-E-Mail erneut senden';
          resendLink.onclick = function(ev) { ev.preventDefault(); resendVerification(email); };
          errSpan.appendChild(document.createElement('br'));
          errSpan.appendChild(resendLink);
        }
      } else {
        _setFieldError('loginPassword', msg);
      }
      return;
    }

    /* Step 2a: 2FA required → open OTP flow */
    if (loginData.requires2fa) {
      try {
        var otpData = await sendEmailOtp(email, password);
        _setBtnLoading(submitBtn, false);
        form.reset();
        openLoginOtpModal((otpData && otpData.email) || email, otpData);
        showToast('Wir haben dir einen E-Mail-Code gesendet.', 'mark_email_unread');
      } catch (otpErr) {
        _setBtnLoading(submitBtn, false);
        _setFieldError('loginPassword', otpErr && otpErr.message ? otpErr.message : 'E-Mail-Code konnte nicht gesendet werden.');
      }
      return;
    }

    /* Step 2b: No 2FA → logged in directly */
    _applyAuthenticatedUser(loginData);
    _setBtnLoading(submitBtn, false);
    closeModal('loginModal');
    form.reset();
    applyLogin('login');
    showToast('Willkommen zurück!', 'login');
    maybePromptPasskeySetup();
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('loginPassword', 'Verbindungsfehler – bitte versuche es erneut.');
  }
}

// ---- REGISTRIERUNG ----
async function handleRegister(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var firstName = document.getElementById('regFirstName').value.trim();
  var lastName = document.getElementById('regLastName').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var password = document.getElementById('regPassword').value.trim();
  var activeRole = document.querySelector('.role-toggle:not(.role-toggle-sub) > .role-btn.active');
  var role = activeRole ? (activeRole.dataset.role === 'provider' ? 'provider' : 'user') : 'user';
  var subRole = '';
  var company = '';
  var vatId = '';
  if (role === 'user') {
    var activeSub = document.querySelector('.role-toggle-sub .role-btn-sub.active');
    subRole = activeSub ? (activeSub.dataset.subrole || 'privat') : 'privat';
  }
  var needsCompanyFields = (role === 'provider') || (role === 'user' && subRole === 'unternehmen');
  if (needsCompanyFields) {
    company = (document.getElementById('regCompany') || {}).value || '';
    company = company.trim();
    vatId = (document.getElementById('regVatId') || {}).value || '';
    vatId = vatId.trim();
  }
  var termsBox = form.querySelector('.terms input[type="checkbox"]');
  var submitBtn = form.querySelector('button[type="submit"]');

  // Client-Validierung
  var hasError = false;
  if (!firstName) { _setFieldError('regFirstName', 'Vorname ist erforderlich'); hasError = true; }
  if (!lastName) { _setFieldError('regLastName', 'Nachname ist erforderlich'); hasError = true; }
  if (!email) { _setFieldError('regEmail', 'E-Mail ist erforderlich'); hasError = true; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { _setFieldError('regEmail', 'Ungültige E-Mail-Adresse'); hasError = true; }
  if (!password || password.length < 8) { _setFieldError('regPassword', 'Min. 8 Zeichen erforderlich'); hasError = true; }
  if (termsBox && !termsBox.checked) {
    var termsLabel = form.querySelector('.terms');
    if (termsLabel) { termsLabel.classList.add('has-error'); }
    hasError = true;
  }
  var gewerbeBox = document.getElementById('regGewerbe');
  if (needsCompanyFields && gewerbeBox && !gewerbeBox.checked) {
    var gewerbeLabel = document.getElementById('regGewerbeLabel');
    if (gewerbeLabel) { gewerbeLabel.classList.add('has-error'); }
    hasError = true;
  }
  if (needsCompanyFields && !company) { _setFieldError('regCompany', 'Firmenname ist erforderlich'); hasError = true; }
  if (hasError) return;

  _setBtnLoading(submitBtn, true);

  var online = await _checkBackend();

  // ── Offline / Demo fallback ──
  if (!online) {
    var demoResult = _demoRegister(email, password, firstName, lastName, role, subRole, company, vatId);
    _setBtnLoading(submitBtn, false);
    if (!demoResult.ok) {
      _setFieldError('regEmail', demoResult.message);
      return;
    }
    _applyAuthenticatedUser(demoResult.user);
    closeModal('registerModal');
    form.reset();
    var strengthBar = document.getElementById('passwordStrength');
    if (strengthBar) strengthBar.style.display = 'none';
    applyLogin('registration');
    showToast('Willkommen bei Eventbörse, ' + firstName + '! (Offline-Modus)', 'celebration');
    return;
  }

  try {
    var response = await fetch(_apiUrl('register'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        email: email,
        password: password,
        role: role,
        sub_role: subRole || '',
        first_name: firstName,
        last_name: lastName,
        company: company || '',
        vat_id: vatId || '',
        // Honeypot 2026-05-29: leeres Feld ist OK; Bot füllt es → Backend silent-rejects
        website: (document.getElementById('regWebsite') || {}).value || ''
      })
    });
    var data = await response.json();

    if (response.ok) {
      _setBtnLoading(submitBtn, false);

      if (data.requiresOtp) {
        closeModal('registerModal');
        form.reset();
        var strengthBar = document.getElementById('passwordStrength');
        if (strengthBar) strengthBar.style.display = 'none';
        openRegisterOtpModal(email, data);
        showToast('Wir haben dir einen Bestätigungscode per E-Mail gesendet.', 'mark_email_unread');
        return;
      }

      _applyAuthenticatedUser(data);
      closeModal('registerModal');
      form.reset();
      var strengthBar = document.getElementById('passwordStrength');
      if (strengthBar) strengthBar.style.display = 'none';
      applyLogin('registration');
      showToast('Willkommen bei Eventbörse, ' + firstName + '!', 'celebration');
    } else {
      _setBtnLoading(submitBtn, false);
      var msg = data.message || 'Registrierung fehlgeschlagen.';
      if (msg.toLowerCase().indexOf('e-mail') >= 0 || msg.toLowerCase().indexOf('email') >= 0) {
        _setFieldError('regEmail', msg);
      } else if (msg.toLowerCase().indexOf('passwort') >= 0 || msg.toLowerCase().indexOf('password') >= 0) {
        _setFieldError('regPassword', msg);
      } else {
        _setFieldError('regEmail', msg);
      }
    }
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('regEmail', 'Verbindungsfehler – bitte versuche es erneut.');
  }
}

// ---- REGISTRIERUNG OTP-VERIFIZIERUNG ----
function openRegisterOtpModal(email, data) {
  _pendingRegOtp = {
    email: (email || '').trim(),
    resendToken: data && data.resendToken ? data.resendToken : ''
  };
  var emailText = document.getElementById('regOtpEmailText');
  var codeInput = document.getElementById('regOtpCode');
  if (emailText) emailText.textContent = _pendingRegOtp.email || 'deine E-Mail';
  if (codeInput) codeInput.value = '';
  openModal('registerOtpModal');
}

function cancelRegisterOtpFlow() {
  _pendingRegOtp = null;
  closeModal('registerOtpModal');
}

async function resendRegisterOtp(btn) {
  if (!_pendingRegOtp || !_pendingRegOtp.email || !_pendingRegOtp.resendToken) {
    showToast('Bitte starte die Registrierung erneut.', 'warning');
    cancelRegisterOtpFlow();
    openModal('registerModal');
    return;
  }
  try {
    if (btn) _setBtnLoading(btn, true);
    var response = await fetch(_apiUrl('register/resend'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        email: _pendingRegOtp.email,
        resend_token: _pendingRegOtp.resendToken
      })
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Code konnte nicht erneut gesendet werden.');
    _pendingRegOtp.resendToken = data.resendToken || _pendingRegOtp.resendToken;
    showToast('Neuer Bestätigungscode wurde gesendet.', 'mark_email_read');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Code konnte nicht erneut gesendet werden.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function handleRegisterOtpVerify(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  if (!_pendingRegOtp || !_pendingRegOtp.email) {
    showToast('Bitte starte die Registrierung erneut.', 'warning');
    cancelRegisterOtpFlow();
    openModal('registerModal');
    return;
  }

  var code = document.getElementById('regOtpCode').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');

  if (!/^\d{6}$/.test(code)) {
    _setFieldError('regOtpCode', 'Bitte gib den 6-stelligen Code ein.');
    return;
  }

  try {
    _setBtnLoading(submitBtn, true);
    var response = await fetch(_apiUrl('register/verify'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        email: _pendingRegOtp.email,
        code: code
      })
    });
    _refreshNonce(response);
    var data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Code ist ungültig.');

    _pendingRegOtp = null;
    _applyAuthenticatedUser(data);
    closeModal('registerOtpModal');
    form.reset();
    applyLogin('registration');
    showToast('Willkommen bei Eventbörse! Dein Konto ist verifiziert.', 'celebration');
  } catch (err) {
    _setFieldError('regOtpCode', err && err.message ? err.message : 'Code ist ungültig.');
  } finally {
    _setBtnLoading(submitBtn, false);
  }
}

// ---- PASSKEY-VERIFIZIERUNG NACH REGISTRIERUNG ----
var _pendingVerifyToken = null;

async function verifyWithPasskey() {
  if (!_pendingVerifyToken) {
    showToast('Verifizierungstoken fehlt. Bitte melde dich mit E-Mail-Code an.', 'error');
    closeModal('verifyModal');
    return;
  }

  var btn = document.getElementById('verifyWithPasskeyBtn');
  try {
    if (btn) _setBtnLoading(btn, true);

    // 1. Optionen holen
    var optResp = await fetch(_apiUrl('webauthn/verify-options'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verify_token: _pendingVerifyToken })
    });
    var optData = await optResp.json();
    if (!optResp.ok) throw new Error(optData.message || 'Passkey-Optionen konnten nicht geladen werden.');

    // 2. Passkey erstellen (Browser-Dialog)
    var credential = await navigator.credentials.create({
      publicKey: _preparePublicKeyOptions(optData.publicKey)
    });

    // 3. Registrierung + Verifizierung abschließen
    var regResp = await fetch(_apiUrl('webauthn/verify-register'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verify_token: _pendingVerifyToken,
        credential: _publicKeyCredentialToJSON(credential)
      })
    });
    _refreshNonce(regResp);
    var regData = await regResp.json();
    if (!regResp.ok) throw new Error(regData.message || 'Verifizierung fehlgeschlagen.');

    // Erfolg – einloggen
    _pendingVerifyToken = null;
    _applyAuthenticatedUser(regData);
    closeModal('verifyModal');
    applyLogin('registration');
    showToast('Konto verifiziert – willkommen bei Eventbörse!', 'verified');
  } catch (err) {
    if (btn) _setBtnLoading(btn, false);
    var msg = err && err.message ? err.message : 'Passkey-Verifizierung fehlgeschlagen.';
    if (msg.indexOf('denied') >= 0 || msg.indexOf('cancel') >= 0 || msg.indexOf('abort') >= 0 || msg.indexOf('NotAllowed') >= 0) {
      showToast('Passkey-Vorgang abgebrochen.', 'info');
    } else {
      showToast(msg, 'error');
    }
  }
}

// ---- BESTÄTIGUNGS-E-MAIL ERNEUT SENDEN ----
async function resendVerification(email) {
  try {
    var response = await fetch(_apiUrl('resend-verification'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({ email: email })
    });
    var data = await response.json();
    showToast(data.message || 'Bestätigungs-E-Mail wurde erneut gesendet.', 'mark_email_read');
  } catch (err) {
    showToast('Fehler beim Senden. Bitte versuche es später erneut.', 'error');
  }
}

// ---- E-MAIL-VERIFIZIERUNG: URL-PARAMETER PRÜFEN ----
// ---- PASSWORT-RESET: URL-PARAMETER PRÜFEN ----
(function checkUrlParams() {
  var params = new URLSearchParams(window.location.search);

  // E-Mail verifiziert
  if (params.get('email_verified') === '1') {
    var verifiedEmail = params.get('verified_email') || '';
    var url = new URL(window.location);
    url.searchParams.delete('email_verified');
    url.searchParams.delete('verified_email');
    window.history.replaceState({}, '', url.pathname + url.search);
    setTimeout(function() {
      showToast('E-Mail erfolgreich bestätigt. Melde dich jetzt an, danach kannst du direkt deinen Passkey einrichten.', 'check_circle');
      openModal('loginModal');
      if (verifiedEmail) {
        var loginEmail = document.getElementById('loginEmail');
        if (loginEmail) {
          loginEmail.value = decodeURIComponent(verifiedEmail);
          loginEmail.focus();
        }
      }
    }, 500);
  }

  // Passwort-Reset-Link aus E-Mail
  // Unterstützt sowohl Query-Params (?reset_password=1&token=X&uid=Y)
  // als auch Hash-Fragment (#reset=TOKEN:UID) – Hash überlebt Redirects/Caches zuverlässig.
  var _rpToken = params.get('token') || '';
  var _rpUid   = params.get('uid') || '';
  var _rpTrigger = params.get('reset_password') === '1';
  // Hash-Fallback (#reset=token:uid)
  var _hash = (window.location.hash || '').replace(/^#/, '');
  if (_hash.indexOf('reset=') === 0) {
    var _raw = decodeURIComponent(_hash.substring(6));
    var _parts = _raw.split(':');
    if (_parts.length >= 2 && _parts[0] && _parts[1]) {
      _rpToken = _rpToken || _parts[0];
      _rpUid   = _rpUid   || _parts[1];
      _rpTrigger = true;
    }
  }
  if (_rpTrigger && _rpToken && _rpUid) {
    // Parameter/Hash aus URL entfernen
    var url2 = new URL(window.location);
    url2.searchParams.delete('reset_password');
    url2.searchParams.delete('token');
    url2.searchParams.delete('uid');
    url2.hash = '';
    try { window.history.replaceState({}, '', url2.pathname + url2.search); } catch(_) {}
    // Token + UID für den Submit-Handler merken
    window._resetToken = _rpToken;
    window._resetUid = _rpUid;
    // Modal öffnen – mit Retry falls DOM noch nicht bereit ist
    var _tryOpenReset = function(attempts) {
      var m = document.getElementById('resetPasswordModal');
      if (m && typeof openModal === 'function') {
        openModal('resetPasswordModal');
        return;
      }
      if (attempts > 0) {
        setTimeout(function(){ _tryOpenReset(attempts - 1); }, 250);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ _tryOpenReset(20); });
    } else {
      setTimeout(function(){ _tryOpenReset(20); }, 100);
    }
  }

  // Stripe Connect Onboarding Return: ?stripe_connect=return
  if (params.get('stripe_connect') === 'return') {
    var _scUrl = new URL(window.location);
    _scUrl.searchParams.delete('stripe_connect');
    try { window.history.replaceState({}, document.title, _scUrl.pathname + _scUrl.search); } catch(_e) {}
    var _tryOpenSettings = function(attempts) {
      if (typeof navigateTo === 'function' && typeof loadStripeConnectStatus === 'function') {
        navigateTo('settings');
        setTimeout(function() {
          showToast('Stripe-Konto verbunden! Status wird geprüft …', 'check_circle');
          loadStripeConnectStatus();
        }, 600);
        return;
      }
      if (attempts > 0) setTimeout(function(){ _tryOpenSettings(attempts - 1); }, 300);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ _tryOpenSettings(20); });
    } else {
      setTimeout(function(){ _tryOpenSettings(20); }, 300);
    }
  }

  // Stripe Connect Onboarding Refresh: ?stripe_connect=refresh
  if (params.get('stripe_connect') === 'refresh') {
    var _scRefUrl = new URL(window.location);
    _scRefUrl.searchParams.delete('stripe_connect');
    try { window.history.replaceState({}, document.title, _scRefUrl.pathname + _scRefUrl.search); } catch(_e) {}
    var _tryRefreshOnboard = function(attempts) {
      if (typeof connectStripeAccount === 'function') {
        var fakeBtn = { classList: { add: function(){}, remove: function(){} }, disabled: false };
        showToast('Onboarding-Link wird erneuert …', 'info');
        connectStripeAccount(fakeBtn);
        return;
      }
      if (attempts > 0) setTimeout(function(){ _tryRefreshOnboard(attempts - 1); }, 300);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ _tryRefreshOnboard(20); });
    } else {
      setTimeout(function(){ _tryRefreshOnboard(20); }, 300);
    }
  }
})();

// ---- NEUES PASSWORT SETZEN ----
async function handleResetPassword(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var password = document.getElementById('resetNewPassword').value.trim();
  var confirm = document.getElementById('resetConfirmPassword').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');
  var successMsg = document.getElementById('resetSuccess');

  var hasError = false;
  if (!password || password.length < 8) { _setFieldError('resetNewPassword', 'Min. 8 Zeichen erforderlich'); hasError = true; }
  if (password !== confirm) { _setFieldError('resetConfirmPassword', 'Passwörter stimmen nicht überein'); hasError = true; }
  if (hasError) return;

  if (!window._resetToken || !window._resetUid) {
    _setFieldError('resetNewPassword', 'Ungültiger Reset-Link. Bitte fordere einen neuen an.');
    return;
  }

  _setBtnLoading(submitBtn, true);

  try {
    var response = await fetch(_apiUrl('reset-password'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        token: window._resetToken,
        uid: parseInt(window._resetUid),
        password: password
      })
    });
    var data = await response.json();
    _setBtnLoading(submitBtn, false);

    if (response.ok) {
      if (successMsg) {
        successMsg.style.display = 'block';
        successMsg.textContent = data.message || 'Passwort erfolgreich geändert!';
      }
      submitBtn.style.display = 'none';
      form.querySelectorAll('.form-group').forEach(function(g) { g.style.display = 'none'; });
      window._resetToken = null;
      window._resetUid = null;
      // Nach 2 Sekunden zum Login weiterleiten
      setTimeout(function() {
        closeModal('resetPasswordModal');
        openModal('loginModal');
      }, 2000);
    } else {
      _setFieldError('resetNewPassword', data.message || 'Fehler beim Zurücksetzen.');
    }
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('resetNewPassword', 'Verbindungsfehler – bitte versuche es erneut.');
  }
}

// ---- PASSWORT VERGESSEN ----
async function handleForgotPassword(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var email = document.getElementById('forgotEmail').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');
  var successMsg = document.getElementById('forgotSuccess');

  if (!email) { _setFieldError('forgotEmail', 'E-Mail ist erforderlich'); return; }

  _setBtnLoading(submitBtn, true);

  try {
    var response = await fetch(_apiUrl('forgot-password'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({ email: email })
    });
    var data = await response.json();
    _setBtnLoading(submitBtn, false);

    // Immer Erfolg zeigen (aus Sicherheitsgründen)
    if (successMsg) {
      successMsg.style.display = 'block';
      successMsg.textContent = data.message || 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.';
    }
    submitBtn.style.display = 'none';
    form.querySelector('.form-group').style.display = 'none';
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('forgotEmail', 'Verbindungsfehler – bitte versuche es erneut.');
  }
}

// ---- SOCIAL LOGIN (vorerst Hinweis anzeigen) ----
function socialLogin(provider) {
  showToast(provider + '-Anmeldung kommt bald!', 'info');
}

function loadProfile() {
  // Now merged into renderDashboard (Profilauftritt)
  renderDashboard();
}

function saveProfile() {
  if (!currentUser) return;
  currentUser.name = document.getElementById('profileName').value.trim();
  currentUser.company = document.getElementById('profileCompany').value.trim();
  currentUser.tagline = document.getElementById('profileTagline').value.trim();
  currentUser.location = document.getElementById('profileLocation').value.trim();
  currentUser.bio = document.getElementById('profileBio').value.trim();
  var galleryImgs = document.querySelectorAll('#galleryPreview .upload-preview-item img');
  currentUser.gallery = Array.from(galleryImgs).map(function(img) { return img.src; });
  var avatarSrc = document.getElementById('profileAvatar').src;
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = avatarSrc;
  renderDashboard();

  fetch(_apiUrl('profile'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      name: currentUser.name,
      tagline: currentUser.tagline,
      location: currentUser.location,
      bio: currentUser.bio,
      gallery: currentUser.gallery
    })
  }).then(function() {
    showToast('Profil gespeichert! ✅', 'check_circle');
  }).catch(function() {
    showToast('Speichern fehlgeschlagen', 'error');
  });
}

function logout() {
  fetch(_apiUrl('logout'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders()
  }).catch(function() {});
  _saveDemoSession(null);
  applyLogout();
  showToast('Abgemeldet. Bis bald!', 'logout');
  navigateTo('home');
}

function selectRole(btn, role) {
  document.querySelectorAll('.role-toggle:not(.role-toggle-sub) > .role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  var subGroup = document.getElementById('regSubRoleGroup');
  if (subGroup) { subGroup.classList.toggle('reg-collapsed', role !== 'user'); }
  var providerFields = document.getElementById('regProviderFields');
  if (role === 'provider') {
    if (providerFields) { providerFields.classList.remove('reg-collapsed'); }
  } else {
    // Bei Eventplaner: nur zeigen wenn Unternehmen ausgewählt
    var activeSubBtn = document.querySelector('.role-btn-sub.active');
    var isUnternehmen = activeSubBtn && activeSubBtn.getAttribute('data-subrole') === 'unternehmen';
    if (providerFields) { providerFields.classList.toggle('reg-collapsed', !isUnternehmen); }
  }
}

function selectSubRole(btn, subRole) {
  document.querySelectorAll('.role-toggle-sub .role-btn-sub').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  var providerFields = document.getElementById('regProviderFields');
  if (providerFields) { providerFields.classList.toggle('reg-collapsed', subRole !== 'unternehmen'); }
}

