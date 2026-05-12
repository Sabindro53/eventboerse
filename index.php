<?php
/**
 * Eventbörse – Haupttemplate
 *
 * @package Eventboerse
 */

get_header();
?>

  <!-- ============ NAVIGATION ============ -->
  <nav id="navbar">
    <div class="nav-inner">
      <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo" onclick="navigateTo('browse');return false;">
        <span class="logo-icon material-icons-round">celebration</span>
        <span class="logo-text">Event<span class="accent">börse</span></span>
      </a>
      <div class="nav-search" id="navSearchBar">
        <button class="nav-search-segment nav-search-ai" onclick="openNavAiSearch()">
          <span class="ai-glow-dot"></span>
          <span class="label"><span class="material-icons-round ai-spark">auto_awesome</span> Suche</span>
          <span class="value" id="navAiTyping">Beschreib dein Event…</span>
        </button>
        <span class="nav-search-divider"></span>
        <div class="nav-search-segment-wrap">
          <button class="nav-search-segment" onclick="toggleNavDatePicker(event)" id="navWannBtn">
            <span class="label">Wann?</span>
            <span class="value" id="navDateValue">Zeitraum</span>
          </button>
          <div class="nav-cat-dropdown" id="navCatDropdown"></div>
        </div>
        <span class="nav-search-divider"></span>
        <button class="nav-search-segment" onclick="toggleMapOverlay()" id="navWoBtn">
          <span class="label">Wo?</span>
          <span class="value" id="navWoValue">Region</span>
        </button>
        <button class="nav-search-btn" onclick="performNavSearch()">
          <span class="material-icons-round">search</span>
        </button>
      </div>
      <!-- AI Search Overlay -->
      <div class="nav-ai-overlay" id="navAiOverlay">
        <div class="nav-ai-overlay-inner">
          <div class="nav-ai-header">
            <span class="material-icons-round ai-spark-lg">auto_awesome</span>
            <span>Suche</span>
            <button class="nav-ai-close" onclick="closeNavAiSearch()"><span class="material-icons-round">close</span></button>
          </div>
          <div class="nav-ai-input-wrap">
            <span class="material-icons-round nav-ai-input-icon">search</span>
            <input type="text" id="navAiInput" class="nav-ai-input" placeholder="Was suchst du? z.B. DJ, Fotograf, Catering…" autocomplete="off" oninput="onNavAiInput()" />
            <div class="nav-ai-input-glow"></div>
          </div>
          <div class="nav-ai-body" id="navAiBody">
          </div>
          <div class="nav-ai-footer">
            <button class="nav-ai-submit" onclick="submitNavAiSearch()">
              <span class="material-icons-round">search</span> Suchen
            </button>
          </div>
        </div>
      </div>
      <div class="nav-actions">
        <a href="#" class="nav-link" onclick="navigateTo('create-listing')">Inserieren</a>
        <button class="nav-icon-btn" onclick="navigateTo('messages')" title="Nachrichten">
          <span class="material-icons-round">chat_bubble_outline</span>
          <span class="badge" id="msgBadge" style="display:none"></span>
        </button>
        <button class="nav-avatar" id="avatarBtn" onclick="toggleUserMenu()">
          <span class="material-icons-round">menu</span>
          <img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2250%22%20fill%3D%22%23FF385C%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2250%22%20dominant-baseline%3D%22central%22%20text-anchor%3D%22middle%22%20font-size%3D%2240%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%20font-family%3D%22sans-serif%22%3EU%3C%2Ftext%3E%3C%2Fsvg%3E" alt="User" />
          <span class="nav-admin-label" id="navAdminLabel">Admin</span>
        </button>
      </div>
    </div>
    <!-- User Dropdown -->
    <div class="user-menu" id="userMenu">
      <!-- Dark Mode Toggle (always visible) -->
      <div class="user-menu-darkmode">
        <span class="material-icons-round" id="darkModeIcon">dark_mode</span>
        <span id="darkModeLabel">Dunkelmodus</span>
        <label class="toggle-switch toggle-sm">
          <input type="checkbox" id="darkModeToggle" onchange="toggleDarkMode(this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <hr class="user-menu-hr" />
      <div class="user-menu-section" id="loggedOutMenu">
        <button onclick="openModal('loginModal')">Anmelden</button>
        <button onclick="openModal('registerModal')">Registrieren</button>
      </div>
      <div class="user-menu-section" id="loggedInMenu" style="display:none">
        <button onclick="navigateTo('profile')"><span class="material-icons-round">person</span> Mein Profil</button>
        <button onclick="navigateTo('messages')"><span class="material-icons-round">chat</span> Nachrichten</button>
        <button onclick="navigateTo('create-listing')"><span class="material-icons-round">add_circle</span> Inserat erstellen</button>
        <hr />
        <button onclick="navigateTo('my-listings')"><span class="material-icons-round">storefront</span> Meine Inserate</button>
        <button onclick="navigateTo('favorites')"><span class="material-icons-round">favorite</span> Favoriten</button>
        <button onclick="navigateTo('settings')"><span class="material-icons-round">settings</span> Einstellungen</button>
        <button id="adminMenuBtn" style="display:none" onclick="navigateTo('admin')" class="admin-menu-btn"><span class="material-icons-round">admin_panel_settings</span> Admin-Bereich</button>
        <hr />
        <button onclick="logout()"><span class="material-icons-round">logout</span> Abmelden</button>
      </div>
    </div>
  </nav>

<?php
// Restlichen Inhalt aus der statischen index.html laden
$template_dir = get_template_directory();
$html_file = $template_dir . '/index.html';

if ( file_exists( $html_file ) ) {
    $html = file_get_contents( $html_file );
    // Nur den Body-Inhalt nach der Navigation extrahieren (ab Map Overlay)
    $start = strpos( $html, '<!-- ============ MAP OVERLAY' );
    $end   = strpos( $html, '</body>' );
    if ( $start !== false && $end !== false ) {
        $content = substr( $html, $start, $end - $start );
        // Script-Tags entfernen – werden über wp_enqueue_script geladen
        $content = preg_replace( '#<script\b[^>]*src=["\'][^"\']*app\.js[^"\']*["\'][^>]*></script>#i', '', $content );
        // Direkter Output – trusted theme template, Formulare (input/select/onclick) benötigt
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        echo $content;
    }
}

get_footer();
