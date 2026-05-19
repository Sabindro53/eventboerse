const TIMEOUT = 15000; // 15 seconds in milliseconds

async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return await response.json();
    } catch (error) {
        console.error('Request timeout:', error);
        throw new Error('Request timed out after 15 seconds');
    } finally {
        clearTimeout(id);
    }
}

module.exports = {
    fetchWithTimeout
};