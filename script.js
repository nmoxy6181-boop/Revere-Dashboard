// ============================================
// GITHUB BOT API ENDPOINTS
// ============================================

// Get your bot URL from the GitHub Action
// You'll need to use a service like ngrok or run the bot locally
// Or use the GitHub Action webhook URL

// For local testing, use:
const BOT_API_URL = 'http://localhost:8080'; // Change to your actual URL

async function assignDiscordRole(discordId, username) {
    try {
        const response = await fetch(`${BOT_API_URL}/api/whitelist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: discordId, username: username })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Failed to whitelist:', error);
        return false;
    }
}

async function blacklistDiscordUser(discordId, reason) {
    try {
        const response = await fetch(`${BOT_API_URL}/api/blacklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: discordId, reason: reason })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Failed to blacklist:', error);
        return false;
    }
}

async function unblacklistDiscordUser(discordId) {
    try {
        const response = await fetch(`${BOT_API_URL}/api/unblacklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: discordId })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Failed to unblacklist:', error);
        return false;
    }
}
