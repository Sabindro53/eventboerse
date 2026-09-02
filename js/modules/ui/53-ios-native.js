// ========== iOS-NATIVE INTEGRATION ==========
// Läuft im Browser ohne Wirkung. Im Capacitor-Container aktiviert dieser
// Baustein native Teilen-Dialoge, Haptik, Netzwerkstatus und sichere externe
// Browserfenster. So bleibt die Web-App die gemeinsame Oberfläche, während die
// iOS-App echte Systemfunktionen nutzt.
(function initEventboerseNativeIOS() {
  var capacitor = window.Capacitor;
  var isNative = Boolean(
    window.__EVENTBOERSE_IOS_APP__ ||
    (capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform())
  );
  if (!isNative) return;

  document.documentElement.dataset.nativeApp = 'ios';
  document.documentElement.classList.add('eb-native-ios');

  function plugin(name) {
    if (!capacitor) return null;
    if (typeof capacitor.registerPlugin === 'function') return capacitor.registerPlugin(name);
    return capacitor.Plugins ? capacitor.Plugins[name] : null;
  }

  var NativeShare = plugin('Share');
  var NativeHaptics = plugin('Haptics');
  var NativeNetwork = plugin('Network');
  var NativeBrowser = plugin('Browser');

  window.eventboerseShare = function(options) {
    var payload = {
      title: options && options.title ? options.title : 'Eventbörse',
      text: options && options.text ? options.text : 'Entdecke Eventbörse',
      url: options && options.url ? options.url : window.location.href,
      dialogTitle: 'Mit Eventbörse teilen'
    };
    if (NativeShare && typeof NativeShare.share === 'function') {
      return NativeShare.share(payload).catch(function() {});
    }
    if (navigator.share) return navigator.share(payload).catch(function() {});
    try { navigator.clipboard.writeText(payload.url); } catch (e) {}
    if (typeof showToast === 'function') showToast('Link kopiert!', 'content_copy');
    return Promise.resolve();
  };

  function prepareNativeUI() {
    // Diese Schalter sind auf der Website als ehrliche Vorschau sichtbar,
    // dürfen in der Store-App aber erst erscheinen, wenn der Login funktioniert.
    document.querySelectorAll('button[onclick*="socialLogin("]').forEach(function(button) {
      button.remove();
    });
    document.querySelectorAll('#loginModal form, #registerModal form').forEach(function(form) {
      if (!form.querySelector('button[onclick*="socialLogin("]')) {
        form.querySelectorAll('.modal-divider').forEach(function(divider) {
          divider.remove();
        });
      }
    });

    document.addEventListener('click', function(event) {
      var target = event.target && event.target.closest
        ? event.target.closest('button, .mobile-nav a, .favorite-btn, .feed-like-btn')
        : null;
      if (target && NativeHaptics && typeof NativeHaptics.impact === 'function') {
        NativeHaptics.impact({ style: 'LIGHT' }).catch(function() {});
      }
    }, { passive: true });

    document.addEventListener('click', function(event) {
      var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!anchor || !NativeBrowser || typeof NativeBrowser.open !== 'function') return;
      var href = anchor.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:)/i.test(href)) return;

      var url;
      try { url = new URL(href, window.location.href); } catch (e) { return; }
      if (!/^https?:$/.test(url.protocol) || url.hostname === window.location.hostname) return;

      event.preventDefault();
      NativeBrowser.open({ url: url.href, presentationStyle: 'popover' }).catch(function() {
        window.location.href = url.href;
      });
    });

    if (NativeNetwork && typeof NativeNetwork.addListener === 'function') {
      NativeNetwork.addListener('networkStatusChange', function(status) {
        if (!status.connected && typeof showToast === 'function') {
          showToast('Keine Internetverbindung', 'wifi_off');
        }
      }).catch(function() {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareNativeUI, { once: true });
  } else {
    prepareNativeUI();
  }
})();
