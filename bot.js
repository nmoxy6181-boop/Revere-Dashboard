// ============================================
// REVERE DISCORD BOT (FIXED INTENTS)
// ============================================

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Get secrets from GitHub Actions environment
const CONFIG = {
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID,
    whitelistRoleId: process.env.WHITELIST_ROLE_ID,
    blacklistRoleId: process.env.BLACKLIST_ROLE_ID,
    adminId: process.env.ADMIN_ID
};

// Validate configuration
if (!CONFIG.token) {
    console.error('❌ Missing DISCORD_TOKEN!');
    process.exit(1);
}

if (!CONFIG.guildId) {
    console.error('❌ Missing GUILD_ID!');
    process.exit(1);
}

if (!CONFIG.whitelistRoleId) {
    console.error('❌ Missing WHITELIST_ROLE_ID!');
    process.exit(1);
}

if (!CONFIG.blacklistRoleId) {
    console.error('❌ Missing BLACKLIST_ROLE_ID!');
    process.exit(1);
}

// Create client with proper intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

// Wait for bot to be ready
client.once('ready', () => {
    console.log('✅ Bot is online as ' + client.user.tag);
    console.log('📌 Server ID: ' + CONFIG.guildId);
    console.log('🎭 Whitelist Role: ' + CONFIG.whitelistRoleId);
    console.log('🚫 Blacklist Role: ' + CONFIG.blacklistRoleId);
});

// Log any errors
client.on('error', (error) => {
    console.error('❌ Bot error:', error.message);
});

// ============================================
// API ENDPOINTS
// ============================================

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        bot: client.user ? client.user.tag : 'connecting',
        guild: CONFIG.guildId
    });
});

// Whitelist user
app.post('/api/whitelist', async (req, res) => {
    const { userId, username } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    
    try {
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(userId);
        
        // Add whitelist role
        await member.roles.add(CONFIG.whitelistRoleId);
        console.log('✅ Added whitelist role to ' + userId);
        
        // Remove blacklist role if present
        try {
            await member.roles.remove(CONFIG.blacklistRoleId);
            console.log('✅ Removed blacklist role from ' + userId);
        } catch (e) {
            // Role might not be assigned, that's fine
        }
        
        // Send DM
        try {
            const user = await client.users.fetch(userId);
            const dmMessage = `
**🔓 You've Been Whitelisted!**

You have been granted access to **Revere**.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** ✅ Whitelisted
- **Date:** ${new Date().toLocaleDateString()}

**🔑 How to Use:**
1. Launch the Revere script
2. Enter your Discord ID: \`${userId}\`
3. You'll automatically be granted access!

━━━━━━━━━━━━━━━━━━━
*If you have any issues, contact an administrator.*
            `.trim();
            
            await user.send(dmMessage);
            console.log('✅ Sent DM to ' + userId);
        } catch (e) {
            console.log('⚠️ Could not DM ' + userId + ': ' + e.message);
        }
        
        res.json({ success: true, message: 'Whitelisted ' + userId });
        
    } catch (error) {
        console.error('❌ Failed to whitelist ' + userId + ':', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Blacklist user
app.post('/api/blacklist', async (req, res) => {
    const { userId, reason } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    
    try {
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(userId);
        
        // Add blacklist role
        await member.roles.add(CONFIG.blacklistRoleId);
        console.log('✅ Added blacklist role to ' + userId);
        
        // Remove whitelist role
        try {
            await member.roles.remove(CONFIG.whitelistRoleId);
            console.log('✅ Removed whitelist role from ' + userId);
        } catch (e) {
            // Role might not be assigned, that's fine
        }
        
        // Send DM
        try {
            const user = await client.users.fetch(userId);
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
            
            await user.send(dmMessage);
            console.log('✅ Sent DM to ' + userId);
        } catch (e) {
            console.log('⚠️ Could not DM ' + userId + ': ' + e.message);
        }
        
        res.json({ success: true, message: 'Blacklisted ' + userId });
        
    } catch (error) {
        console.error('❌ Failed to blacklist ' + userId + ':', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Unblacklist user
app.post('/api/unblacklist', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    
    try {
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(userId);
        
        // Remove blacklist role
        await member.roles.remove(CONFIG.blacklistRoleId);
        console.log('✅ Removed blacklist role from ' + userId);
        
        // Send DM
        try {
            const user = await client.users.fetch(userId);
            await user.send(`
**✅ You've Been Unblacklisted!**

Your access to **Revere** has been restored.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** ✅ Unblacklisted
- **Date:** ${new Date().toLocaleDateString()}

You can now use Revere again.
            `.trim());
            console.log('✅ Sent DM to ' + userId);
        } catch (e) {
            console.log('⚠️ Could not DM ' + userId + ': ' + e.message);
        }
        
        res.json({ success: true, message: 'Unblacklisted ' + userId });
        
    } catch (error) {
        console.error('❌ Failed to unblacklist ' + userId + ':', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// START SERVER & BOT
// ============================================

app.listen(PORT, () => {
    console.log('🌐 API server running on port ' + PORT);
});

// Login to Discord
client.login(CONFIG.token).catch(error => {
    console.error('❌ Failed to login:', error.message);
    process.exit(1);
});
