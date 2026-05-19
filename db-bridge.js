const axios = require('axios');
const apiBaseUrl = 'https://api.example.com';

async function getListingById(listingId) {
    const url = `${apiBaseUrl}/listings/${listingId}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching listing:', error);
        throw new Error('Failed to fetch listing');
    }
}

async function updateListing(listingId, updatedData) {
    const url = `${apiBaseUrl}/listings/${listingId}`;
    try {
        const response = await axios.put(url, updatedData);
        return response.data;
    } catch (error) {
        console.error('Error updating listing:', error);
        throw new Error('Failed to update listing');
    }
}

// Additional functions can be added for other API endpoints as needed

module.exports = {
    getListingById,
    updateListing
};