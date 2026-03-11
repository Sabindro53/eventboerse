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
      <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo">
        <span class="logo-icon material-icons-round">celebration</span>
        <span class="logo-text">Event<span class="accent">börse</span></span>
      </a>
      <div class="nav-search" id="navSearchBar">
        <button class="nav-search-segment" onclick="navigateTo('browse')">
          <span class="label">Was?</span>
          <span class="value">Service suchen</span>
        </button>
        <span class="nav-search-divider"></span>
        <button class="nav-search-segment" onclick="navigateTo('browse')">
          <span class="label">Event</span>
          <span class="value">Kategorie</span>
        </button>
        <span class="nav-search-divider"></span>
        <button class="nav-search-segment" onclick="toggleMapOverlay()" id="navWoBtn">
          <span class="label">Wo?</span>
          <span class="value" id="navWoValue">Region</span>
        </button>
        <button class="nav-search-btn" onclick="navigateTo('browse')">
          <span class="material-icons-round">search</span>
        </button>
      </div>
      <div class="nav-actions">
        <a href="#" class="nav-link" onclick="navigateTo('create-listing')">Inserieren</a>
        <button class="nav-icon-btn" onclick="navigateTo('messages')" title="Nachrichten">
          <span class="material-icons-round">chat_bubble_outline</span>
          <span class="badge" id="msgBadge" style="display:none"></span>
        </button>
        <button class="nav-avatar" id="avatarBtn" onclick="toggleUserMenu()">
          <span class="material-icons-round">menu</span>
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=user1" alt="User" />
        </button>
      </div>
    </div>
    <!-- User Dropdown -->
    <div class="user-menu" id="userMenu">
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
        // Direkter Output – trusted theme template, Formulare (input/select/onclick) benötigt
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        echo $content;
    }
}

get_footer();
