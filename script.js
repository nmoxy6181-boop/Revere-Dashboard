// ============================================
// REVERE KEY MANAGEMENT DASHBOARD
// ============================================

// Data Store
const Store = {
    keys: [],
    users: [],
    blacklist: [],
    settings: {
        adminId: '1447067732892975276',
        webhookUrl: 'https://discordapp.com/api/webhooks/1523819815511265382/2YclGput2gV-RnydVeuR4mHmEc7YuuTFax-3fCn9dEm8fR3FhAyJC1SQKUvMgG0IeBXX',
        botToken: 'MTUyMzgyNDI1NzU2NDU0MTE0MA.GjDFAR.xGuXYfvuSqLII6Hiz4mv_XCfsz5nZcOwGKhpGI', // Add your bot token here
        guildId: '1391998044601454643', // Your server ID
        whitelistRoleId: '1523827393247318118', // Role ID for whitelisted users
        blacklistRoleId: '1523827450927386695', // Role ID for blacklisted users
        maxAttempts: 3,
        cooldownTime: 300
    },
    activity: []
};

// ============================================
// DISCORD BOT FUNCTIONS
// ============================================

async function sendDiscordDM(discordId, message) {
    const token = Store.settings.botToken;
    if (!token) {
        console.warn('[REVERE] Bot token not configured');
        return false;
    }

    try {
        // Create DM channel with user
        const dmResponse = await fetch(`https://discord.com/api/v10/users/${discordId}/channels`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient_id: discordId
            })
        });

        if (!dmResponse.ok) {
            throw new Error(`Failed to create DM: ${dmResponse.status}`);
        }

        const dmChannel = await dmResponse.json();
        
        // Send message
        const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: message,
                embeds: []
            })
        });

        return messageResponse.ok;
    } catch (error) {
        console.error('[REVERE] Failed to send DM:', error);
        return false;
    }
}

async function assignDiscordRole(discordId, roleId) {
    const token = Store.settings.botToken;
    const guildId = Store.settings.guildId;
    
    if (!token || !guildId || !roleId) {
        console.warn('[REVERE] Bot configuration incomplete');
        return false;
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.ok;
    } catch (error) {
        console.error('[REVERE] Failed to assign role:', error);
        return false;
    }
}

async function removeDiscordRole(discordId, roleId) {
    const token = Store.settings.botToken;
    const guildId = Store.settings.guildId;
    
    if (!token || !guildId || !roleId) {
        console.warn('[REVERE] Bot configuration incomplete');
        return false;
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.ok;
    } catch (error) {
        console.error('[REVERE] Failed to remove role:', error);
        return false;
    }
}

// ============================================
// USER MANAGEMENT (UPDATED)
// ============================================

async function addUser(discordId, username = '') {
    // Check if already exists
    if (Store.users.find(u => u.discordId === discordId)) {
        showToast('User already exists!', 'warning');
        return false;
    }
    
    // Check if blacklisted
    if (Store.blacklist.find(b => b.discordId === discordId)) {
        showToast('User is blacklisted! Remove from blacklist first.', 'error');
        return false;
    }
    
    const user = {
        discordId: discordId,
        username: username || `User_${discordId.slice(-4)}`,
        status: 'whitelisted',
        joined: new Date().toISOString(),
        keysUsed: []
    };
    
    Store.users.push(user);
    
    // --- DISCORD ACTIONS ---
    
    // 1. Assign whitelist role
    const roleAssigned = await assignDiscordRole(discordId, Store.settings.whitelistRoleId);
    
    // 2. Remove blacklist role if they had it
    await removeDiscordRole(discordId, Store.settings.blacklistRoleId);
    
    // 3. Send DM notification
    const dmMessage = `
**🔓 You've Been Whitelisted!**

You have been granted access to **Revere**.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** ✅ Whitelisted
- **Date:** ${new Date().toLocaleDateString()}
- **Access:** Full

**🔑 How to Use:**
1. Launch the Revere script
2. Enter your Discord ID: \`${discordId}\`
3. You'll automatically be granted access!

━━━━━━━━━━━━━━━━━━━
*If you have any issues, contact an administrator.*
    `.trim();
    
    await sendDiscordDM(discordId, dmMessage);
    
    // 4. Log activity
    addActivity(`✅ Added user: ${username || discordId}`, 'success');
    addActivity(`📨 Sent DM to ${discordId}`, 'info');
    addActivity(`🎭 Assigned whitelist role to ${discordId}`, 'info');
    
    saveData();
    renderUsers();
    renderBlacklist();
    updateStats();
    
    showToast(`User ${user.username} added to whitelist!`, 'success');
    return user;
}

async function removeUser(discordId) {
    // Remove whitelist role
    await removeDiscordRole(discordId, Store.settings.whitelistRoleId);
    
    Store.users = Store.users.filter(u => u.discordId !== discordId);
    addActivity(`Removed user: ${discordId}`, 'warning');
    saveData();
    renderUsers();
    updateStats();
}

async function blacklistUser(discordId, reason = '') {
    // Check if already blacklisted
    if (Store.blacklist.find(b => b.discordId === discordId)) {
        showToast('User already blacklisted!', 'warning');
        return false;
    }
    
    // Remove from whitelist if exists
    Store.users = Store.users.filter(u => u.discordId !== discordId);
    
    // Remove whitelist role
    await removeDiscordRole(discordId, Store.settings.whitelistRoleId);
    
    const entry = {
        discordId: discordId,
        reason: reason || 'No reason provided',
        date: new Date().toISOString()
    };
    
    Store.blacklist.push(entry);
    
    // --- DISCORD ACTIONS ---
    
    // 1. Assign blacklist role
    const roleAssigned = await assignDiscordRole(discordId, Store.settings.blacklistRoleId);
    
    // 2. Send DM notification
    const dmMessage = `
**⛔ You've Been Blacklisted!**

You have been **removed** from **Revere**.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** 🚫 Blacklisted
- **Date:** ${new Date().toLocaleDateString()}
- **Reason:** ${reason || 'No reason provided'}

**What This Means:**
- You can no longer use Revere
- Your access has been revoked

━━━━━━━━━━━━━━━━━━━
*If you believe this is a mistake, contact an administrator.*
    `.trim();
    
    await sendDiscordDM(discordId, dmMessage);
    
    // 3. Log activity
    addActivity(`🚫 Blacklisted user: ${discordId}`, 'error');
    addActivity(`📨 Sent blacklist DM to ${discordId}`, 'info');
    addActivity(`🎭 Assigned blacklist role to ${discordId}`, 'info');
    
    saveData();
    renderUsers();
    renderBlacklist();
    updateStats();
    
    showToast(`User ${discordId} has been blacklisted!`, 'error');
    return entry;
}

async function unblacklistUser(discordId) {
    // Remove blacklist role
    await removeDiscordRole(discordId, Store.settings.blacklistRoleId);
    
    Store.blacklist = Store.blacklist.filter(b => b.discordId !== discordId);
    addActivity(`Unblacklisted user: ${discordId}`, 'info');
    
    // Optionally send DM notification
    const dmMessage = `
**✅ You've Been Unblacklisted!**

Your access to **Revere** has been restored.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** ✅ Unblacklisted
- **Date:** ${new Date().toLocaleDateString()}

You can now use Revere again.
    `.trim();
    
    await sendDiscordDM(discordId, dmMessage);
    
    saveData();
    renderBlacklist();
    updateStats();
}

// ============================================
// SETTINGS UI (UPDATED)
// ============================================

// Add this to the settings section in HTML or update your settings tab
function renderSettings() {
    document.getElementById('adminId').value = Store.settings.adminId || '';
    document.getElementById('webhookUrl').value = Store.settings.webhookUrl || '';
    document.getElementById('botToken').value = Store.settings.botToken || '';
    document.getElementById('guildId').value = Store.settings.guildId || '';
    document.getElementById('whitelistRoleId').value = Store.settings.whitelistRoleId || '';
    document.getElementById('blacklistRoleId').value = Store.settings.blacklistRoleId || '';
    document.getElementById('maxAttempts').value = Store.settings.maxAttempts || 3;
    document.getElementById('cooldownTime').value = Store.settings.cooldownTime || 300;
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', function() {
    Store.settings.adminId = document.getElementById('adminId').value.trim();
    Store.settings.webhookUrl = document.getElementById('webhookUrl').value.trim();
    Store.settings.botToken = document.getElementById('botToken').value.trim();
    Store.settings.guildId = document.getElementById('guildId').value.trim();
    Store.settings.whitelistRoleId = document.getElementById('whitelistRoleId').value.trim();
    Store.settings.blacklistRoleId = document.getElementById('blacklistRoleId').value.trim();
    Store.settings.maxAttempts = parseInt(document.getElementById('maxAttempts').value) || 3;
    Store.settings.cooldownTime = parseInt(document.getElementById('cooldownTime').value) || 300;
    
    saveData();
    showToast('Settings saved!', 'success');
    addActivity('⚙️ Settings updated', 'info');
});

// ============================================
// UPDATE HTML FOR SETTINGS
// ============================================
// Add these to your settings tab in index.html:

/* 
<div class="settings-group">
    <h3>Discord Bot Settings</h3>
    <div class="form-group">
        <label>Bot Token</label>
        <input type="password" id="botToken" placeholder="Enter bot token">
        <small style="color:var(--text-muted);font-size:11px;">Keep this secret!</small>
    </div>
    <div class="form-group">
        <label>Server ID (Guild ID)</label>
        <input type="text" id="guildId" placeholder="Enter server ID">
    </div>
    <div class="form-group">
        <label>Whitelist Role ID</label>
        <input type="text" id="whitelistRoleId" placeholder="Enter role ID for whitelisted users">
    </div>
    <div class="form-group">
        <label>Blacklist Role ID</label>
        <input type="text" id="blacklistRoleId" placeholder="Enter role ID for blacklisted users">
    </div>
</div>
*/
