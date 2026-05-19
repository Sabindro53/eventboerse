```php
<?php
/*
Template Name: 404 Page
*/

get_header();
?>
<div class="page-not-found">
    <h1>404 - Seite nicht gefunden</h1>
    <p>Sorry, die gesuchte Seite konnte nicht gefunden werden.</p>
    <a href="<?php echo esc_url(home_url('/')); ?>">Zurück zur Startseite</a>
    <p><em>Contact Support:</em> support@example.com</p>
</div>
<?php
get_footer();
?>