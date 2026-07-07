// ============================================
// REVERE DISCORD BOT (FIXED)
// ============================================

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');

// ============================================
// READ ENVIRONMENT VARIABLES
// ============================================

// Get variables from environment (Render's env vars)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const WHITELIST_ROLE_ID = process.env.WHITELIST_ROLE_ID;
const BLACKLIST_ROLE_ID = process.env.BLACKLIST_ROLE_ID;
const ADMIN_ID = process.env.ADMIN_ID;

// Log what we found (without exposing full token)
console.log('📋 Environment Variables Check:');
console.log(`  DISCORD_TOKEN: ${DISCORD_TOKEN ? '✅ SET (starts with ' + DISCORD_TOKEN.substring(0, 15) + '...)' : '❌ MISSING'}`);
console.log(`  GUILD_ID: ${GUILD_ID || '❌ MISSING'}`);
console.log(`  WHITELIST_ROLE_ID: ${WHITELIST_ROLE_ID || '❌ MISSING'}`);
console.log(`  BLACKLIST_ROLE_ID: ${BLACKLIST_ROLE_ID || '❌ MISSING'}`);
console.log(`  ADMIN_ID: ${ADMIN_ID || '❌ MISSING'}`);

// ============================================
// VALIDATE CONFIGURATION
// ============================================

const errors = [];
if (!DISCORD_TOKEN) errors.push('❌ DISCORD_TOKEN is missing!');
if (!GUILD_ID) errors.push('❌ GUILD_ID is missing!');
if (!WHITELIST_ROLE_ID) errors.push('❌ WHITELIST_ROLE_ID is missing!');
if (!BLACKLIST_ROLE_ID) errors.push('❌ BLACKLIST_ROLE_ID is missing!');
if (!ADMIN_ID) errors.push('❌ ADMIN_ID is missing!');

if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`  ${err}`));
    console.error('   Please add these environment variables in Render:');
    console.error('   - Environment tab → Add Environment Variable');
    process.exit(1);
}

// ============================================
// CREATE DISCORD CLIENT
// ============================================

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

client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`📌 Server ID: ${GUILD_ID}`);
    console.log(`🎭 Whitelist Role: ${WHITELIST_ROLE_ID}`);
    console.log(`🚫 Blacklist Role: ${BLACKLIST_ROLE_ID}`);
    console.log(`🌐 API server running on port ${PORT}`);
});

client.on('error', (error) => {
    console.error('❌ Bot error:', error.message);
});

// ============================================
// EXPRESS API SERVER
// ============================================

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'connecting',
        guild: GUILD_ID
    });
});

// Whitelist endpoint
app.post('/api/whitelist', async (req, res) => {
    const { userId, username } = req.body;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId);
        
        // Add whitelist role
        await member.roles.add(WHITELIST_ROLE_ID);
        console.log(`✅ Added whitelist role to ${userId}`);
        
        // Remove blacklist role if present
        try {
            await member.roles.remove(BLACKLIST_ROLE_ID);
            console.log(`✅ Removed blacklist role from ${userId}`);
        } catch (e) {}

        // Send DM
        try {
            const user = await client.users.fetch(userId);
            await user.send(`
**🔓 You've Been Whitelisted!**

You have been granted access to **Revere**.

**Status:** ✅ Whitelisted
**Date:** ${new Date().toLocaleDateString()}

Launch Revere and enter your Discord ID: \`${userId}\`
            `.trim());
            console.log(`✅ Sent DM to ${userId}`);
        } catch (e) {
            console.log(`⚠️ Could not DM ${userId}: ${e.message}`);
        }

        res.json({ success: true, message: `Whitelisted ${userId}` });

    } catch (error) {
        console.error(`❌ Failed to whitelist ${userId}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Blacklist endpoint
app.post('/api/blacklist', async (req, res) => {
    const { userId, reason } = req.body;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId);
        
        // Add blacklist role
        await member.roles.add(BLACKLIST_ROLE_ID);
        console.log(`✅ Added blacklist role to ${userId}`);
        
        // Remove whitelist role
        try {
            await member.roles.remove(WHITELIST_ROLE_ID);
            console.log(`✅ Removed whitelist role from ${userId}`);
        } catch (e) {}

        // Send DM
        try {
            const user = await client.users.fetch(userId);
            await user.send(`
**⛔ You've Been Blacklisted!**

You have been removed from **Revere**.

**Reason:** ${reason || 'No reason provided'}
**Date:** ${new Date().toLocaleDateString()}

Contact an administrator if you believe this is a mistake.
            `.trim());
            console.log(`✅ Sent DM to ${userId}`);
        } catch (e) {
            console.log(`⚠️ Could not DM ${userId}: ${e.message}`);
        }

        res.json({ success: true, message: `Blacklisted ${userId}` });

    } catch (error) {
        console.error(`❌ Failed to blacklist ${userId}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Unblacklist endpoint
app.post('/api/unblacklist', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId);
        
        await member.roles.remove(BLACKLIST_ROLE_ID);
        console.log(`✅ Removed blacklist role from ${userId}`);

        try {
            const user = await client.users.fetch(userId);
            await user.send(`
**✅ You've Been Unblacklisted!**

Your access to **Revere** has been restored.
**Date:** ${new Date().toLocaleDateString()}
            `.trim());
            console.log(`✅ Sent DM to ${userId}`);
        } catch (e) {}

        res.json({ success: true, message: `Unblacklisted ${userId}` });

    } catch (error) {
        console.error(`❌ Failed to unblacklist ${userId}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`🌐 API server running on port ${PORT}`);
});

// Login to Discord
client.login(DISCORD_TOKEN);
