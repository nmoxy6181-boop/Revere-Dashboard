// ============================================
// SECURE DISCORD FUNCTIONS (UPDATED)
// ============================================

const API_URL = 'https://your-replit-url.repl.co'; // Replace with your server URL

async function assignDiscordRole(discordId, username) {
    try {
        const response = await fetch(`${API_URL}/api/whitelist`, {
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
        const response = await fetch(`${API_URL}/api/blacklist`, {
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

// Updated user functions
async function addUser(discordId, username = '') {
    if (Store.users.find(u => u.discordId === discordId)) {
        showToast('User already exists!', 'warning');
        return false;
    }
    
    // Call the bot API
    const roleSuccess = await assignDiscordRole(discordId, username);
    
    const user = {
        discordId: discordId,
        username: username || `User_${discordId.slice(-4)}`,
        status: 'whitelisted',
        joined: new Date().toISOString(),
        keysUsed: []
    };
    
    Store.users.push(user);
    addActivity(`✅ Added user: ${username || discordId}`, 'success');
    if (roleSuccess) {
        addActivity(`🎭 Role assigned to ${discordId}`, 'success');
    } else {
        addActivity(`⚠️ Failed to assign role to ${discordId}`, 'warning');
    }
    
    saveData();
    renderUsers();
    renderBlacklist();
    updateStats();
    
    showToast(`User ${user.username} added to whitelist!`, 'success');
    return user;
}

async function blacklistUser(discordId, reason = '') {
    if (Store.blacklist.find(b => b.discordId === discordId)) {
        showToast('User already blacklisted!', 'warning');
        return false;
    }
    
    // Call the bot API
    const roleSuccess = await blacklistDiscordUser(discordId, reason);
    
    Store.users = Store.users.filter(u => u.discordId !== discordId);
    
    const entry = {
        discordId: discordId,
        reason: reason || 'No reason provided',
        date: new Date().toISOString()
    };
    
    Store.blacklist.push(entry);
    addActivity(`🚫 Blacklisted user: ${discordId}`, 'error');
    if (roleSuccess) {
        addActivity(`🎭 Blacklist role assigned to ${discordId}`, 'error');
    } else {
        addActivity(`⚠️ Failed to assign blacklist role to ${discordId}`, 'warning');
    }
    
    saveData();
    renderUsers();
    renderBlacklist();
    updateStats();
    
    showToast(`User ${discordId} has been blacklisted!`, 'error');
    return entry;
}
