Da ich die vollständige `functions.php` nicht im Kontext habe, liefere ich den **einzufügenden Block** als eigenständige Datei und weise exakt auf den Einfügepunkt hin:

---

**Warte** — ich löse das sauber. Ich liefere eine **Patch-Datei** für den SSE-Endpoint und die exakten `app.js`-Funktionen die ersetzt werden.

---

## SSE-Endpoint (functions.php — neuer Block)

Dieser Block wird **am Ende von `functions.php`** eingefügt, vor dem schließenden `?>` (falls vorhanden):

```php
// ============================================================
// SSE: Real-time message stream
// GET /wp-json/eventboerse/v1/messages/stream
// Query params: conversation_id (int), last_message_id (int)
// ============================================================
add_action('rest_api_init', function() {
    register_rest_route('eventboerse/v1', '/messages/stream', [
        'methods'             => 'GET',
        'callback'            => 'eb_messages_stream',
        'permission_callback' => function() {
            return is_user_logged_in();
        },
    ]);
});

function eb_messages_stream(WP_REST_Request $request) {
    $conversation_id = intval($request->get_param('conversation_id'));
    $last_id         = intval($request->get_param('last_message_id') ?? 0);

    if (!$conversation_id) {
        return new WP_Error('missing_param', 'conversation_id required', ['status' => 400]);
    }

    global $wpdb;
    $current_user_id = get_current_user_id();

    // Verify user is part of this conversation
    $conv = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conversation_id, $current_user_id, $current_user_id
    ));

    if (!$conv) {
        return new WP_Error('forbidden', 'Not part of this conversation', ['status' => 403]);
    }

    // Disable output buffering at all levels
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    // SSE headers
    header('Content-Type: text/event-stream; charset=UTF-8');
    header('Cache-Control: no-cache, no-store');
    header('X-Accel-Buffering: no'); // Disable nginx buffering (if applicable)
    header('Connection: keep-alive');

    // Disable PHP time limit for this request (we control the loop duration)
    @set_time_limit(0);

    $start_time  = time();
    $max_duration = 25; // seconds before client must reconnect
    $poll_interval = 2; // seconds between DB checks

    // Send initial connection confirmation
    echo "event: connected\n";
    echo "data: {\"conversation_id\":{$conversation_id}}\n\n";
    flush();

    $current_last_id = $last_id;

    while ((time() - $start_time) < $max_duration) {
        // Check for new messages since last_id
        $new_messages = $wpdb->get_results($wpdb->prepare(
            "SELECT m.*, u.display_name as sender_name
             FROM {$wpdb->prefix}eb_messages m
             LEFT JOIN {$wpdb->users} u ON u.ID = m.sender_id
             WHERE m.conversation_id = %d
               AND m.id > %d
             ORDER BY m.id ASC
             LIMIT 20",
            $conversation_id, $current_last_id
        ));

        if (!empty($new_messages)) {
            foreach ($new_messages as $msg) {
                $payload = [
                    'id'              => intval($msg->id),
                    'conversation_id' => intval($msg->conversation_id),
                    'sender_id'       => intval($msg->sender_id),
                    'sender_name'     => $msg->sender_name,
                    'content'         => $msg->content,
                    'type'            => $msg->type ?? 'text',
                    'meta'            => !empty($msg->meta) ? json_decode($msg->meta, true) : null,
                    'created_at'      => $msg->created_at,
                    'read_at'         => $msg->read_at,
                ];
                echo "event: message\n";
                echo "data: " . wp_json_encode($payload) . "\n\n";
                $current_last_id = $msg->id;
            }
            flush();
        }

        // Check connection is still alive
        if (connection_aborted()) {
            break;
        }

        // Heartbeat every ~20s
        $elapsed = time() - $start_time;
        if ($elapsed > 0 && $elapsed % 20 === 0) {
            echo "event: heartbeat\n";
            echo "data: {\"t\":" . time() . "}\n\n";
            flush();
        }

        sleep($poll_interval);
    }

    // Tell client to reconnect with updated last_id
    echo "event: reconnect\n";
    echo "data: {\"last_message_id\":{$current_last_id}}\n\n";
    flush();

    exit; // Must exit — WP REST framework must not add headers after SSE
}
```

---

## Chat-Funktionen (app.js — geänderte Sektionen)

Die folgenden Funktionen ersetzen die bestehenden Polling-Funktionen. Suche in `app.js` nach `_startChatPolling` und ersetze den gesamten Polling-Block:

```javascript
// ============================================================
// Real-time chat: SSE with polling fallback
// Replaces the old setInterval-based polling
// ============================================================

var _chatSSE = null;           // active EventSource instance
var _chatSSELastId = 0;        // last received message id
var _chatPollingTimer = null;  // fallback polling timer
var _chatSSEEnabled = (typeof EventSource !== 'undefined');

/**
 * Start real-time message updates for a conversation.
 * Uses SSE if available, falls back to 3s polling.
 * @param {number} conversationId
 * @param {number} lastMessageId  - ID of last known message (avoid re-rendering)
 */
function _startChatPolling(conversationId, lastMessageId) {
    _stopChatPolling(); // clean up any existing connection
    _chatSSELastId = lastMessageId || 0;

    if (_chatSSEEnabled) {
        _startChatSSE(conversationId, _chatSSELastId);
    } else {
        _startChatFallbackPolling(conversationId);
    }
}

/**
 * Open SSE connection for real-time messages.
 */
function _startChatSSE(conversationId, lastId) {
    var url = _apiUrl('messages/stream')
        + '?conversation_id=' + conversationId
        + '&last_message_id=' + lastId;

    try {
        _chatSSE = new EventSource(url, { withCredentials: true });
    } catch (e) {
        console.warn('[Chat] SSE not available, falling back to polling:', e);
        _chatSSEEnabled = false;
        _startChatFallbackPolling(conversationId);
        return;
    }

    _chatSSE.addEventListener('message', function(e) {
        try {
            var msg = JSON.parse(e.data);
            _chatSSELastId = msg.id;
            _appendIncomingMessage(msg);
        } catch (err) {
            console.warn('[Chat] SSE message parse error:', err);
        }
    });

    _chatSSE.addEventListener('reconnect', function(e) {
        // Server signals end of stream — reconnect with updated last_id
        try {
            var data = JSON.parse(e.data);
            _chatSSELastId = data.last_message_id || _chatSSELastId;
        } catch (_) {}
        _chatSSE.close();
        _chatSSE = null;
        // Small delay before reconnect to avoid hammering on errors
        setTimeout(function() {
            if (_currentConversationId === conversationId) {
                _startChatSSE(conversationId, _chatSSELastId);
            }
        }, 500);
    });

    _chatSSE.addEventListener('heartbeat', function() {
        // Heartbeat received — connection is alive, nothing to do
    });

    _chatSSE.onerror = function(e) {
        console.warn('[Chat] SSE error, falling back to polling');
        _chatSSE.close();
        _chatSSE = null;
        // Fallback: switch to polling for this session
        _chatSSEEnabled = false;
        _startChatFallbackPolling(conversationId);
    };
}

/**
 * Fallback: 3s polling (original behavior).
 */
function _startChatFallbackPolling(conversationId) {
    _chatPollingTimer = setInterval(function() {
        if (_currentConversationId !== conversationId) {
            _stopChatPolling();
            return;
        }
        _pollChatMessages(conversationId);
    }, 3000);
}

/**
 * Stop all real-time updates (SSE + polling timer).
 */
function _stopChatPolling() {
    if (_chatSSE) {
        _chatSSE.close();
        _chatSSE = null;
    }
    if (_chatPollingTimer) {
        clearInterval(_chatPollingTimer);
        _chatPollingTimer = null;
    }
}

/**
 * Polling fallback: fetch new messages and append unseen ones.
 * (Original polling logic, kept for fallback)
 */
function _pollChatMessages(conversationId) {
    fetch(_apiUrl('conversations/' + conversationId + '/messages'), {
        headers: _apiHeaders()
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        var messages = data.messages || data || [];
        _reconcileChatMessages(messages);
    })
    .catch(function(err) {
        console.warn('[Chat] Polling error:', err);
    });
}

/**
 * Append a single incoming SSE message to the chat UI.
 * Only renders if we're still viewing this conversation.
 * @param {Object} msg - message object from SSE
 */
function _appendIncomingMessage(msg) {
    // Guard: only update if the chat view is still open for this conversation
    if (!_currentConversationId || _currentConversationId !== msg.conversation_id) {
        return;
    }
    // Guard: don't re-render messages we already have
    var existing = document.querySelector('[data-message-id="' + msg.id + '"]');
    if (existing) return;

    var chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    var isSelf = (currentUser && msg.sender_id === currentUser.id);
    var el = _renderSingleChatMessage(msg, isSelf);
    chatMessages.appendChild(el);

    // Scroll to bottom if user is near the bottom (within 150px)
    var threshold = 150;
    var atBottom = (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight) < threshold;
    if (atBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Mark as read if not own message
    if (!isSelf) {
        _markConversationRead(msg.conversation_id);
    }
}
```

---

Jetzt die vollständigen Dateien. Da