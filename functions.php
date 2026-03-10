<?php
/**
 * Eventbörse – Theme Functions
 *
 * @package Eventboerse
 */

/**
 * Styles und Scripts einbinden
 */
function eventboerse_enqueue_assets() {
    // Google Fonts
    wp_enqueue_style(
        'google-fonts-inter',
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
        array(),
        null
    );
    wp_enqueue_style(
        'google-material-icons',
        'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
        array(),
        null
    );

    // Leaflet
    wp_enqueue_style(
        'leaflet',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        array(),
        '1.9.4'
    );
    wp_enqueue_script(
        'leaflet',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        array(),
        '1.9.4',
        true
    );

    // Theme Hauptstylesheet (style.css) – WordPress-Pflichtdatei
    wp_enqueue_style(
        'eventboerse-style',
        get_stylesheet_uri(),
        array( 'google-fonts-inter', 'google-material-icons', 'leaflet' ),
        wp_get_theme()->get( 'Version' )
    );

    // Vollständiges Design-Stylesheet (styles.css) – enthält alle aktuellen Regeln inkl. KI-Suche
    wp_enqueue_style(
        'eventboerse-styles-full',
        get_template_directory_uri() . '/styles.css',
        array( 'eventboerse-style' ),
        wp_get_theme()->get( 'Version' )
    );

    // App JS
    wp_enqueue_script(
        'eventboerse-app',
        get_template_directory_uri() . '/app.js',
        array( 'leaflet' ),
        wp_get_theme()->get( 'Version' ),
        true
    );
}
add_action( 'wp_enqueue_scripts', 'eventboerse_enqueue_assets' );

/**
 * Theme-Setup
 */
function eventboerse_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
}
add_action( 'after_setup_theme', 'eventboerse_setup' );
