<?php
/**
 * VERALTET — nicht eingebunden, hat keinen Effekt.
 *
 * Der aktive Stripe-Webhook-Handler liegt in functions.php:
 *   - Funktion:  eb_stripe_webhook()
 *   - Endpoint:  POST /wp-json/eventboerse/v1/stripe/webhook
 *   - Signatur:  eb_stripe_verify_signature()
 *   - Events:    payment_intent.succeeded, checkout.session.completed,
 *                account.updated, transfer.created,
 *                payment_intent.payment_failed, payment_intent.canceled
 *
 * Diese Datei kann sicher gelöscht werden.
 * Sie wird bewusst leer gehalten damit kein add_action('rest_api_init')
 * einen doppelten Endpoint registriert, falls die Datei je versehentlich
 * eingebunden wird.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
// Intentionally empty.
