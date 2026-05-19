/**
 * Utility functions for various operations in the application.
 */

const _apiUrl = () => {
  // Return the base URL for API requests
  return 'https://your-api-endpoint.com';
};

const _apiHeaders = (nonce) => {
  // Return headers with necessary information for API requests, including nonce if provided
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-WP-Nonce': nonce,
  });
  return headers;
};

const ebAvatar = (user_id) => {
  // Generate an avatar URL based on user_id using a self-hosted Avatar-Generator service
  // This function assumes there's a mechanism to fetch an avatar from a server
  return `https://your-avatar-generator-service.com/avatar/${user_id}`;
};

// Example usage of these utility functions in app.js or other modules

function navigateTo(path, params = null) {
  // Helper function to navigate to different routes within the application
  const url = new URL(window.location.origin);
  if (params) {
    Object.keys(params).forEach((key) => {
      url.searchParams.append(key, params[key]);
    });
  }
  window.history.pushState({}, '', path + url.search);
}

// Example usage of navigateTo function

navigateTo('/detail', { id: '123' });