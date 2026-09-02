import Capacitor
import UIKit
import WebKit

/// Native container for the Eventbörse web experience.
///
/// The marketplace stays on the verified Eventbörse domain so WordPress
/// authentication and checkout cookies remain first-party. The controller adds
/// an iOS-native pull-to-refresh gesture and a small runtime marker used by the
/// web UI to enable native sharing, haptics and external-link handling.
final class EventboerseViewController: CAPBridgeViewController {
    private let refreshControl = UIRefreshControl()

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        let source = """
        window.__EVENTBOERSE_IOS_APP__ = true;
        document.documentElement.dataset.nativeApp = 'ios';
        document.documentElement.classList.add('eb-native-ios');
        document.addEventListener('DOMContentLoaded', function () {
          document.querySelectorAll('button[onclick*="socialLogin("]').forEach(function (button) {
            button.remove();
          });
          document.querySelectorAll('#loginModal form, #registerModal form').forEach(function (form) {
            if (!form.querySelector('button[onclick*="socialLogin("]')) {
              form.querySelectorAll('.modal-divider').forEach(function (divider) {
                divider.remove();
              });
            }
          });
        }, { once: true });
        """
        configuration.userContentController.addUserScript(
            WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
        return configuration
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        refreshControl.tintColor = UIColor(red: 1.0, green: 56.0 / 255.0, blue: 92.0 / 255.0, alpha: 1.0)
        refreshControl.accessibilityLabel = "Inhalte aktualisieren"
        refreshControl.addTarget(self, action: #selector(refreshContent), for: .valueChanged)
        webView?.scrollView.refreshControl = refreshControl
        webView?.scrollView.alwaysBounceVertical = true
    }

    @objc private func refreshContent() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        webView?.reload()
        refreshControl.endRefreshing()
    }
}
