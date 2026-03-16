<?php get_header(); ?>
<main>
  <section class="page active" style="display:block; padding-top:var(--nav-height); min-height:100vh;">
    <div class="container" style="text-align:center; padding:80px 24px;">
      <span class="material-icons-round" style="font-size:80px; color:var(--primary); opacity:0.5; margin-bottom:16px; display:block;">search_off</span>
      <h1 style="font-size:2rem; color:var(--dark); margin-bottom:12px;">Seite nicht gefunden</h1>
      <p style="font-size:1.1rem; color:var(--text-light); margin-bottom:32px; max-width:480px; margin-left:auto; margin-right:auto;">
        Die angeforderte Seite existiert nicht oder wurde verschoben. Entdecke stattdessen tolle Event-Dienstleister!
      </p>
      <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; padding:14px 28px; text-decoration:none; border-radius:var(--radius-sm); font-weight:600; font-size:1rem; color:#fff; background:var(--primary);">
        <span class="material-icons-round">home</span> Zur Startseite
      </a>
    </div>
  </section>
</main>
<?php get_footer(); ?>
