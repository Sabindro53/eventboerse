import { _apiUrl, _apiHeaders, _apiFetch } from './app-utils.js';

async function fetchWithRetry(url, options = {}) {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
        try {
            const response = await _apiFetch(url, options);
            return response;
        } catch (error) {
            if (attempt === maxAttempts - 1) {
                throw error; // Re-throw the last error if all attempts failed
            }
            attempt++;
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.error(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

export { fetchWithRetry };