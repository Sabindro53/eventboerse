// Global state object to hold application data
let appState = {
  connectionStatus: 'online',
};

// Function to update the connection status class on the body
function updateConnectionStatus(status) {
  document.body.classList.remove('online', 'offline');
  document.body.classList.add(status);
}

// Event listeners for online/offline events
window.addEventListener('online', () => {
  appState.connectionStatus = 'online';
  updateConnectionStatus(appState.connectionStatus);
});

window.addEventListener('offline', () => {
  appState.connectionStatus = 'offline';
  updateConnectionStatus(appState.connectionStatus);
});