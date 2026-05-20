<?php
// Function to get the current IP address of the client
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    }
    return $_SERVER['REMOTE_ADDR'];
}

// Function to get the current date and time in a specific format
function getCurrentDateTime() {
    return date('Y-m-d H:i:s');
}

// Function to store tracking data with rate limiting
function trackRequest($userId, $ip, $action) {
    // Check if the IP has exceeded the limit
    if (trackRequestLimitExceeded($userId, $ip)) {
        error_log("Rate limit exceeded for IP: " . $ip . " on action: " . $action);
        return false;
    }

    // Store tracking data in a database or log file
    // Example: Write to a text file with format: userId|ip|dateTime|action
    $trackingData = "$userId|$ip|" . getCurrentDateTime() . "|" . $action . "\n";
    file_put_contents('analytics.log', $trackingData, FILE_APPEND);

    return true;
}

// Function to check if the rate limit has been exceeded for a specific IP and action
function trackRequestLimitExceeded($userId, $ip) {
    // Read tracking data from a database or log file
    // Example: Read lines containing the user ID, IP, and action
    $trackingData = file('analytics.log');
    foreach ($trackingData as $line) {
        list($storedUserId, $storedIp, $dateTime, $storedAction) = explode('|', trim($line));
        if ($storedUserId === $userId && $storedIp === $ip && $storedAction === 'tracking') {
            // Calculate the time difference in seconds
            $timeDifference = strtotime($dateTime) - strtotime(getCurrentDateTime());

            // If within the last 3600 seconds, return true (rate limit exceeded)
            if ($timeDifference <= 3600) {
                return true;
            }
        }
    }

    // Return false if no limit has been exceeded
    return false;
}

// Example usage
trackRequest('user123', getClientIP(), 'tracking');
?>