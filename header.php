<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo( 'charset' ); ?>" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script>if(localStorage.getItem('eb_dark_mode')==='1')document.documentElement.classList.add('dark-early');</script>
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<nav class="role-nav" style="width:100%;background:#f7f7f7;padding:16px 0 8px 0;text-align:center;z-index:1000;">
  <a href="/event-erstellen.php" class="role-btn" style="display:inline-block;margin:0 12px;padding:12px 32px;border-radius:8px;background:#FF385C;color:#fff;font-weight:600;font-size:1.1em;text-decoration:none;transition:background 0.2s;">Ich bin Eventplaner</a>
  <a href="/service-erstellen.php" class="role-btn" style="display:inline-block;margin:0 12px;padding:12px 32px;border-radius:8px;background:#00A699;color:#fff;font-weight:600;font-size:1.1em;text-decoration:none;transition:background 0.2s;">Ich bin Dienstleister</a>
</nav>
