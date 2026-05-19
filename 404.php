```
<?php
/**
 * The template for displaying 404 pages (Not Found)
 *
 * @link https://codex.wordpress.org/Creating_a_404_Page
 *
 * @package Eventbörse
 */

get_header(); ?>

<div id="primary" class="content-area">
    <main id="main" class="site-main">

        <div class="error-404">
            <header class="page-header">
                <h1 class="page-title"><?php esc_html_e( 'Oops! That page can&rsquo;t be found.', 'eventboerse' ); ?></h1>
            </header><!-- .page-header -->

            <div class="error-content">
                <p><?php esc_html_e( 'It looks like nothing was found at this location. Maybe try a search?', 'eventboerse' ); ?></p>

                <?php get_search_form(); ?>
            </div><!-- .error-content -->
        </div><!-- .error-404 -->

    </main><!-- #main -->
</div><!-- #primary -->

<?php get_footer();