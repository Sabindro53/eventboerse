```
<?php
/*
Template Name: 404 Page
*/

get_header();

echo '<main class="site-content">';
echo '<section class="error-page">
    <h1>Page Not Found</h1>
    <p>The page you are looking for could not be found.</p>
    <div itemscope itemtype="https://schema.org/BreadcrumbList">
        <ol itemprop="itemListElement">
            <li><a href="/" itemprop="item"><span itemprop="name">Home</span></a></li>
            <li aria-current="page" itemscope itemtype="https://schema.org/ListItem"><span itemprop="item"><span itemprop="name">Page Not Found</span></span></li>
        </ol>
    </div>
    <p><a href="/">Go back to the homepage</a></p>
</section>';
echo '</main>';

get_footer();
?>