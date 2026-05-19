let currentPage;
let isTabVisible = true;

function handleVisibilityChange() {
  if (!isTabVisible) {
    pauseApiPolling();
  } else {
    resumeApiPolling();
  }
}

window.addEventListener('visibilitychange', handleVisibilityChange);

function pauseApiPolling() {
  // Logic to pause API polling
  console.log('Pausing API polling');
}

function resumeApiPolling() {
  // Logic to resume API polling
  console.log('Resuming API polling');
}