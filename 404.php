<?php
/*
Template Name: 404 Page
*/

get_header();

echo '<main class="site-content">';
echo '<section class="error-page">
    <h1>Seite nicht gefunden</h1>
    <p>Diese Adresse gibt es nicht — vielleicht ist der Link veraltet oder hat sich vertippt.</p>
    <div itemscope itemtype="https://schema.org/BreadcrumbList">
        <ol itemprop="itemListElement">
            <li><a href="/" itemprop="item"><span itemprop="name">Startseite</span></a></li>
            <li aria-current="page" itemscope itemtype="https://schema.org/ListItem"><span itemprop="item"><span itemprop="name">Seite nicht gefunden</span></span></li>
        </ol>
    </div>
    <p><a href="/">Zurück zur Startseite</a></p>
</section>';
echo '</main>';

get_footer();
?>