# Web-Push-Benachrichtigungen (selbst-gehostet) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web-Push für neue Chat-Nachrichten, selbst-gehostet (VAPID + RFC 8291), ohne Fremddienste/Composer.

**Architecture:** Gestaffelt. **Task 0 (IONOS-Capability-Probe) ist ein hartes Gate** — schlägt sie fehl, STOP (Ansatz B erwägen). Dann VAPID/Subscription/SW/Krypto-Send/UI.

**Tech Stack:** PHP (`functions.php`, OpenSSL EC/ECDH/AES-GCM/HKDF), Vanilla-JS (`app.js`), `sw.js`, app-shell.html. **Verifikation:** `php -l`, `node --check`, Live-Probe, **Geräte-Test (Nutzer)** für die Krypto.

**Spec:** `docs/superpowers/specs/2026-06-24-web-push-notifications-design.md`

**Sicherheitsnetz:** `git branch backup/web-push-2026-06-24` vor Task 0.

---

### Task 0: IONOS-Capability-Probe (HARTES GATE)

**Files:** Modify `functions.php`

- [ ] **Step 1: Selftest-Endpoint (admin-only) + Route**

Neben den Push-Routen (Task 1) registrieren — vorerst Route + Handler:

```php
register_rest_route( 'eventboerse/v1', '/push/selftest', array(
    'methods' => 'GET', 'callback' => 'eb_push_selftest',
    'permission_callback' => function(){ return current_user_can('manage_options'); },
) );
```
Handler:
```php
function eb_push_selftest() {
    $out = array( 'php' => PHP_VERSION, 'ec_keygen' => false, 'ecdh' => false, 'aesgcm' => false, 'hkdf' => function_exists('hash_hkdf') );
    $a = @openssl_pkey_new(array('private_key_type'=>OPENSSL_KEYTYPE_EC,'curve_name'=>'prime256v1'));
    $b = @openssl_pkey_new(array('private_key_type'=>OPENSSL_KEYTYPE_EC,'curve_name'=>'prime256v1'));
    $out['ec_keygen'] = (bool) $a && (bool) $b;
    if ( $a && $b && function_exists('openssl_pkey_derive') ) {
        $bd = openssl_pkey_get_details($b);
        $sec = @openssl_pkey_derive( $bd['key'], $a, 32 );
        $out['ecdh'] = ( $sec !== false && strlen($sec) === 32 );
    }
    $ct = openssl_encrypt('hello','aes-128-gcm', str_repeat('k',16), OPENSSL_RAW_DATA, str_repeat('n',12), $tag);
    $out['aesgcm'] = ( $ct !== false && strlen($tag) === 16 );
    return new WP_REST_Response( $out, 200 );
}
```

- [ ] **Step 2: Lint + Commit + Deploy**

```bash
php -l functions.php
git add functions.php
git commit -m "#push Task0: /push/selftest Capability-Probe (Gate)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 3: Live-Auswertung (GATE) — Nutzer ruft auf, eingeloggt als Admin**

Da admin-only: der **Nutzer** öffnet eingeloggt
`https://xn--eventbrse-57a.de/wp-json/eventboerse/v1/push/selftest` und meldet das JSON.
**Erwartet:** `ec_keygen:true, ecdh:true, aesgcm:true, hkdf:true`. **Wenn `ec_keygen` oder `ecdh`
false → STOP**, Ansatz A nicht tragfähig (Ansatz B erwägen). Sonst weiter.

---

### Task 1: VAPID + Subscription (Server)

**Files:** Modify `functions.php`

- [ ] **Step 1: Helpers (base64url, VAPID-Lazy-Keypair)**

```php
function eb_b64url( $b ) { return rtrim( strtr( base64_encode($b), '+/', '-_' ), '=' ); }
function eb_b64url_dec( $s ) { return base64_decode( strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4) ); }
function eb_vapid_keys() {
    $priv = get_option('eb_vapid_priv'); $pub = get_option('eb_vapid_pub');
    if ( $priv && $pub ) return array($priv, $pub);
    $k = openssl_pkey_new(array('private_key_type'=>OPENSSL_KEYTYPE_EC,'curve_name'=>'prime256v1'));
    openssl_pkey_export($k, $priv);
    $d = openssl_pkey_get_details($k);
    $pub = eb_b64url( "\x04" . str_pad($d['ec']['x'],32,"\0",STR_PAD_LEFT) . str_pad($d['ec']['y'],32,"\0",STR_PAD_LEFT) );
    update_option('eb_vapid_priv', $priv, false);
    update_option('eb_vapid_pub', $pub, false);
    return array($priv, $pub);
}
```

- [ ] **Step 2: Routen + Handler (vapid-public, subscribe, unsubscribe)**

```php
register_rest_route('eventboerse/v1','/push/vapid-public',array('methods'=>'GET','callback'=>function(){ list($p,$pub)=eb_vapid_keys(); return new WP_REST_Response(array('key'=>$pub),200); },'permission_callback'=>'__return_true'));
register_rest_route('eventboerse/v1','/push/subscribe',array('methods'=>'POST','callback'=>'eb_push_subscribe','permission_callback'=>'is_user_logged_in'));
register_rest_route('eventboerse/v1','/push/unsubscribe',array('methods'=>'POST','callback'=>'eb_push_unsubscribe','permission_callback'=>'is_user_logged_in'));
```
```php
function eb_push_subscribe( WP_REST_Request $r ) {
    $uid = get_current_user_id(); $p = $r->get_json_params();
    $ep = esc_url_raw( $p['endpoint'] ?? '' );
    $p256 = preg_replace('/[^A-Za-z0-9_\-]/','', $p['keys']['p256dh'] ?? '');
    $auth = preg_replace('/[^A-Za-z0-9_\-]/','', $p['keys']['auth'] ?? '');
    if ( ! $ep || ! $p256 || ! $auth ) return new WP_REST_Response(array('message'=>'Ungültige Subscription.'),400);
    $subs = get_user_meta($uid,'eb_push_subs',true); if(!is_array($subs)) $subs=array();
    $subs = array_values(array_filter($subs, function($s) use($ep){ return ($s['endpoint']??'') !== $ep; }));
    $subs[] = array('endpoint'=>$ep,'p256dh'=>$p256,'auth'=>$auth);
    update_user_meta($uid,'eb_push_subs',$subs);
    return new WP_REST_Response(null,204);
}
function eb_push_unsubscribe( WP_REST_Request $r ) {
    $uid = get_current_user_id(); $ep = esc_url_raw($r->get_json_params()['endpoint'] ?? '');
    $subs = get_user_meta($uid,'eb_push_subs',true); if(!is_array($subs)) $subs=array();
    $subs = array_values(array_filter($subs, function($s) use($ep){ return ($s['endpoint']??'') !== $ep; }));
    update_user_meta($uid,'eb_push_subs',$subs);
    return new WP_REST_Response(null,204);
}
```

- [ ] **Step 3: Lint + Commit**

```bash
php -l functions.php
git add functions.php
git commit -m "#push Task1: VAPID-Keys + subscribe/unsubscribe/vapid-public

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Krypto-Send `eb_webpush_send` + Aufruf (Server)

**Files:** Modify `functions.php`

- [ ] **Step 1: VAPID-JWT (ES256, DER→raw)**

```php
function eb_der2raw_sig( $der ) {
    // DER SEQUENCE { INTEGER r, INTEGER s } → 64 Byte r||s
    $o = 3; $rlen = ord($der[$o]); $o++; $r = substr($der,$o,$rlen); $o += $rlen;
    $o++; $slen = ord($der[$o]); $o++; $s = substr($der,$o,$slen);
    $r = ltrim($r,"\0"); $s = ltrim($s,"\0");
    return str_pad($r,32,"\0",STR_PAD_LEFT) . str_pad($s,32,"\0",STR_PAD_LEFT);
}
function eb_vapid_auth_header( $endpoint ) {
    list($priv,$pub) = eb_vapid_keys();
    $aud = parse_url($endpoint, PHP_URL_SCHEME).'://'.parse_url($endpoint, PHP_URL_HOST);
    $h = eb_b64url(json_encode(array('typ'=>'JWT','alg'=>'ES256')));
    $c = eb_b64url(json_encode(array('aud'=>$aud,'exp'=>time()+43200,'sub'=>'mailto:kontakt@eventbörse.de')));
    $si = $h.'.'.$c;
    openssl_sign($si, $der, openssl_pkey_get_private($priv), OPENSSL_ALGO_SHA256);
    $jwt = $si.'.'.eb_b64url(eb_der2raw_sig($der));
    return array('Authorization'=>'vapid t='.$jwt.', k='.$pub);
}
```

- [ ] **Step 2: RFC-8291-Verschlüsselung + Senden**

```php
function eb_ec_pub_from_point( $point65 ) {
    // SubjectPublicKeyInfo-DER-Prefix für EC P-256 + uncompressed point
    $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $point65;
    $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der),64,"\n") . "-----END PUBLIC KEY-----\n";
    return openssl_pkey_get_public($pem);
}
function eb_webpush_send( $sub, $payload ) {
    $ua_pub = eb_b64url_dec($sub['p256dh']);     // 65 B
    $auth   = eb_b64url_dec($sub['auth']);        // 16 B
    $as = openssl_pkey_new(array('private_key_type'=>OPENSSL_KEYTYPE_EC,'curve_name'=>'prime256v1'));
    $ad = openssl_pkey_get_details($as);
    $as_pub = "\x04" . str_pad($ad['ec']['x'],32,"\0",STR_PAD_LEFT) . str_pad($ad['ec']['y'],32,"\0",STR_PAD_LEFT);
    $secret = openssl_pkey_derive( eb_ec_pub_from_point($ua_pub), $as, 32 ); // 32 B ECDH
    if ( $secret === false ) return 0;
    $ikm  = hash_hkdf('sha256', $secret, 32, "WebPush: info\x00".$ua_pub.$as_pub, $auth);
    $salt = random_bytes(16);
    $cek  = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
    $nonce= hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);
    $ct = openssl_encrypt($payload."\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
    $body = $salt . pack('N', 4096) . chr(65) . $as_pub . $ct . $tag;
    $hdr = eb_vapid_auth_header($sub['endpoint']);
    $resp = wp_remote_post($sub['endpoint'], array(
        'headers' => array_merge($hdr, array('Content-Encoding'=>'aes128gcm','Content-Type'=>'application/octet-stream','TTL'=>'2419200')),
        'body' => $body, 'timeout' => 8,
    ));
    if ( is_wp_error($resp) ) { error_log('webpush: '.$resp->get_error_message()); return 0; }
    return (int) wp_remote_retrieve_response_code($resp);
}
```

- [ ] **Step 3: Aufruf in `eb_messages_send` (nach Insert, mit Heartbeat-Gate + Cleanup)**

Nach dem `$wpdb->insert( … eb_messages …)` (vor/nach dem E-Mail-Block), einfügen:
```php
    // Web-Push an Empfänger (#push) — überspringen, wenn Empfänger gerade aktiv ist
    if ( $msg_type !== 'system' && $recipient_id && $recipient_id !== $uid ) {
        $la = get_user_meta($recipient_id, 'eb_last_activity', true);
        $active = $la && ( time() - strtotime($la) < 45 );
        if ( ! $active ) {
            $subs = get_user_meta($recipient_id,'eb_push_subs',true);
            if ( is_array($subs) && $subs ) {
                $prev = $msg_type === 'image' ? '📷 Bild' : ( $msg_type === 'offer' ? 'Neues Preisangebot' : mb_substr( wp_strip_all_tags($body), 0, 120 ) );
                $payload = json_encode(array('title'=>$sender_name ?: 'Neue Nachricht','body'=>$prev,'convId'=>$conv_id,'icon'=>home_url('/favicon.svg')));
                $keep = array();
                foreach ( $subs as $s ) {
                    $code = eb_webpush_send($s, $payload);
                    if ( $code !== 404 && $code !== 410 ) $keep[] = $s; // abgelaufene entfernen
                }
                if ( count($keep) !== count($subs) ) update_user_meta($recipient_id,'eb_push_subs',$keep);
            }
        }
    }
```
(`$recipient_id`/`$sender_name`/`$body`/`$conv_id` existieren bereits im E-Mail-Abschnitt — Einfügestelle so wählen, dass sie definiert sind. Beim Ausführen via `grep -n "recipient_id"` bestätigen.)

- [ ] **Step 4: Lint + Commit**

```bash
php -l functions.php
git add functions.php
git commit -m "#push Task2: eb_webpush_send (VAPID+RFC8291) + Aufruf in eb_messages_send

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Service Worker (sw.js)

**Files:** Modify `sw.js`

- [ ] **Step 1: push + notificationclick (ans Ende von sw.js)**

```js
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var title = data.title || 'Eventbörse';
  var opts = { body: data.body || 'Neue Nachricht', icon: data.icon || '/favicon.svg', tag: 'eb-chat-' + (data.convId || ''), data: { convId: data.convId || '' } };
  event.waitUntil((async function(){
    var cl = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    var focused = cl.some(function(c){ return c.focused; });
    if (focused) return; // App offen/fokussiert → keine OS-Notification
    return self.registration.showNotification(title, opts);
  })());
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = '/#chat/' + (event.notification.data && event.notification.data.convId || '');
  event.waitUntil((async function(){
    var cl = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i=0;i<cl.length;i++){ if ('focus' in cl[i]) { cl[i].navigate(url); return cl[i].focus(); } }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
```

- [ ] **Step 2: Commit**

```bash
git add sw.js
git commit -m "#push Task3: sw.js push + notificationclick (Fokus-Unterdrückung)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Client + Settings-Toggle (UI)

**Files:** Modify `app.js`, `app-shell.html`; regenerate `index.html`

- [ ] **Step 1: Client-Funktionen (app.js)**

```js
function _urlB64ToUint8(b64) {
  var pad = '='.repeat((4 - b64.length % 4) % 4);
  var s = (b64 + pad).replace(/-/g,'+').replace(/_/g,'/');
  var raw = atob(s); var arr = new Uint8Array(raw.length);
  for (var i=0;i<raw.length;i++) arr[i] = raw.charCodeAt(i); return arr;
}
async function eb_enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { showToast('Push wird auf diesem Gerät nicht unterstützt.', 'info'); return false; }
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') { showToast('Benachrichtigungen nicht erlaubt.', 'info'); return false; }
    var reg = await navigator.serviceWorker.ready;
    var keyResp = await fetch(_apiUrl('push/vapid-public')); var vapid = (await keyResp.json()).key;
    var sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: _urlB64ToUint8(vapid) });
    var j = sub.toJSON();
    await fetch(_apiUrl('push/subscribe'), { method:'POST', credentials:'same-origin', headers:_apiHeaders(), body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) });
    showToast('Push-Benachrichtigungen aktiviert.', 'check_circle'); return true;
  } catch (e) { showToast('Push konnte nicht aktiviert werden.', 'error'); return false; }
}
async function eb_disablePush() {
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (sub) { await fetch(_apiUrl('push/unsubscribe'), { method:'POST', credentials:'same-origin', headers:_apiHeaders(), body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    showToast('Push-Benachrichtigungen deaktiviert.', 'info');
  } catch (e) {}
}
function togglePushSetting(el) { if (el.checked) { eb_enablePush().then(function(ok){ if(!ok) el.checked = false; }); } else { eb_disablePush(); } }
```

- [ ] **Step 2: Toggle-Markup (app-shell.html, nach dem 2FA-Block ~Z.1811)**

Finde den 2FA-Status-Absatz `<p class="settings-2fa-status" id="settings2faStatus">Deaktiviert</p>`
und füge **nach dessen schließendem Sektions-Container** eine analoge Push-Sektion ein
(`settings-2fa-row`-Muster) mit Checkbox `id="settingsPushToggle" onchange="togglePushSetting(this)"`,
Label „Push-Benachrichtigungen" + Hinweis „Auf iPhone/iPad nur, wenn die App zum Home-Bildschirm
hinzugefügt wurde." (Exakte Verschachtelung beim Ausführen anhand der 2FA-Sektion spiegeln.)

- [ ] **Step 3: Build + Syntax + Commit**

```bash
cd ~/Documents/eventboerse
./build-index-html.sh
~/node-v22/bin/node --check app.js && php -l index.php
git add app.js app-shell.html index.html
git commit -m "#push Task4: Client enable/disable + Settings-Toggle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Deploy + Verifikation

- [ ] **Step 1: Lints + Push**

```bash
php -l functions.php && ~/node-v22/bin/node --check app.js
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 2: Deploy + Server-Smoke**

```bash
D=https://xn--eventbrse-57a.de
for i in $(seq 1 12); do curl -s "$D/wp-content/themes/eventboerse/app.js?cb=$(date +%s)" | grep -q 'eb_enablePush' && { echo live; break; }; sleep 15; done
curl -s "$D/wp-json/eventboerse/v1/push/vapid-public" | head -c 120; echo
curl -s -o /dev/null -w "subscribe unauth: HTTP %{http_code}\n" -X POST "$D/wp-json/eventboerse/v1/push/subscribe"
curl -s -o /dev/null -w "sw.js: HTTP %{http_code}\n" "$D/sw.js"
curl -s -o /dev/null -w "homepage: HTTP %{http_code}\n" "$D/"
```
Expected: `vapid-public` liefert `{"key":"…"}`; subscribe unauth 401; sw.js 200; Homepage 200.

- [ ] **Step 3: Geräte-Test (Nutzer)**

Desktop-Chrome/Android, eingeloggt: Settings → „Push-Benachrichtigungen" an (Permission erlauben).
App-Tab schließen/unfokussieren. Von zweitem Konto Nachricht senden → **System-Push** erscheint,
Klick öffnet den Chat. Bei offenem/fokussiertem Tab: **kein** OS-Ping. (iOS nur als installierte PWA.)
Falls kein Push: Server-Log auf `webpush:`-Fehler + den Push-Service-Response-Code prüfen.

---

## Self-Review

**Spec-Coverage:** Probe-Gate (Task 0) ✓; VAPID+Subscription (Task 1) ✓; Krypto-Send+Aufruf (Task 2) ✓; SW (Task 3) ✓; Client+UI (Task 4) ✓; Deploy/Verify (Task 5) ✓. Heartbeat-Gate, Fokus-Unterdrückung, 404/410-Cleanup, iOS-Hinweis enthalten.

**Placeholder-Hinweis:** Task 2 Step 3 (Einfügestelle in eb_messages_send) und Task 4 Step 2
(2FA-Sektion-Spiegelung) verweisen für die *exakte Stelle* auf `grep`-Bestätigung — Code vollständig.

**Konsistenz:** `eb_b64url`/`eb_b64url_dec`, `eb_vapid_keys`, `eb_webpush_send` durchgängig; HKDF-Infos
und Body-Format exakt RFC 8291 (`aes128gcm`); VAPID-`Authorization: vapid t=,k=` + `Content-Encoding: aes128gcm`.
**Risiko:** Krypto headless nicht verifizierbar → Task-0-Gate + Geräte-Test + Logging.
