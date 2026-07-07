// ============================================
// REVERE DISCORD BOT (FIXED DM HANDLING)
// ============================================

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');

// ============================================
// READ ENVIRONMENT VARIABLES
// ============================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const WHITELIST_ROLE_ID = process.env.WHITELIST_ROLE_ID;
const BLACKLIST_ROLE_ID = process.env.BLACKLIST_ROLE_ID;
const ADMIN_ID = process.env.ADMIN_ID;

console.log('📋 Environment Variables Check:');
console.log(`  DISCORD_TOKEN: ${DISCORD_TOKEN ? '✅ SET' : '❌ MISSING'}`);
console.log(`  GUILD_ID: ${GUILD_ID || '❌ MISSING'}`);
console.log(`  WHITELIST_ROLE_ID: ${WHITELIST_ROLE_ID || '❌ MISSING'}`);
console.log(`  BLACKLIST_ROLE_ID: ${BLACKLIST_ROLE_ID || '❌ MISSING'}`);
console.log(`  ADMIN_ID: ${ADMIN_ID || '❌ MISSING'}`);

// Validate
const errors = [];
if (!DISCORD_TOKEN) errors.push('❌ DISCORD_TOKEN is missing!');
if (!GUILD_ID) errors.push('❌ GUILD_ID is missing!');
if (!WHITELIST_ROLE_ID) errors.push('❌ WHITELIST_ROLE_ID is missing!');
if (!BLACKLIST_ROLE_ID) errors.push('❌ BLACKLIST_ROLE_ID is missing!');

if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`  ${err}`));
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
});

client.on('error', (error) => {
    console.error('❌ Bot error:', error.message);
});

// ============================================
// DM HELPER FUNCTION
// ============================================

async function sendDM(userId, message) {
    try {
        const user = await client.users.fetch(userId);
        if (!user) {
            console.log(`⚠️ User ${userId} not found`);
            return { success: false, error: 'User not found' };
        }
        
        await user.send(message);
        console.log(`✅ DM sent to ${userId}`);
        return { success: true };
    } catch (error) {
        console.log(`⚠️ Failed to DM ${userId}: ${error.message}`);
        
        // Check if user has DMs disabled
        if (error.code === 50007) {
            return { success: false, error: 'User has DMs disabled' };
        }
        return { success: false, error: error.message };
    }
}

// ============================================
// EXPRESS API SERVER WITH CORS
// ============================================

const app = express();
const PORT = process.env.PORT || 8080;

// CORS Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

app.use(express.json());

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        bot: client.user ? client.user.tag : 'connecting',
        guild: GUILD_ID
    });
});

// ============================================
// WHITELIST ENDPOINT
// ============================================

app.post('/api/whitelist', async (req, res) => {
    console.log('📨 Received whitelist request:', req.body);
    
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
        const dmMessage = `
**🔓 You've Been Whitelisted!**

You have been granted access to **Revere**.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** ✅ Whitelisted
- **Date:** ${new Date().toLocaleString()}

**🔑 How to Use:**
1. Launch the Revere script
2. Enter your Discord ID: \`${userId}\`
3. You'll automatically be granted access!

━━━━━━━━━━━━━━━━━━━
*If you have any issues, contact an administrator.*
        `.trim();
        
        const dmResult = await sendDM(userId, dmMessage);
        
        res.json({
            success: true,
            message: `Whitelisted ${userId}`,
            dmSent: dmResult.success,
            dmError: dmResult.error || null
        });

    } catch (error) {
        console.error(`❌ Failed to whitelist ${userId}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// BLACKLIST ENDPOINT (FIXED)
// ============================================

app.post('/api/blacklist', async (req, res) => {
    console.log('📨 Received blacklist request:', req.body);
    
    const { userId, reason } = req.body;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        
        // Try to get member
        let member = null;
        try {
            member = await guild.members.fetch(userId);
        } catch (e) {
            console.log(`⚠️ User ${userId} not in server, but continuing...`);
        }
        
        // Add blacklist role if member exists
        if (member) {
            await member.roles.add(BLACKLIST_ROLE_ID);
            console.log(`✅ Added blacklist role to ${userId}`);
            
            // Remove whitelist role
            try {
                await member.roles.remove(WHITELIST_ROLE_ID);
                console.log(`✅ Removed whitelist role from ${userId}`);
            } catch (e) {}
        } else {
            console.log(`⚠️ User ${userId} not in server, cannot assign role`);
        }

        // Send DM - THIS IS THE IMPORTANT PART
        const dmMessage = `
**⛔ You've Been Blacklisted!**

You have been **removed** from **Revere**.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** 🚫 Blacklisted
- **Date:** ${new Date().toLocaleString()}
- **Reason:** ${reason || 'No reason provided'}

**What This Means:**
- ❌ You can no longer use Revere
- ❌ Your access has been revoked
- ❌ You have been removed from the whitelist

━━━━━━━━━━━━━━━━━━━
*If you believe this is a mistake, contact an administrator.*
        `.trim();
        
        const dmResult = await sendDM(userId, dmMessage);
        
        res.json({
            success: true,
            message: `Blacklisted ${userId}`,
            dmSent: dmResult.success,
            dmError: dmResult.error || null,
            roleAssigned: !!member
        });

    } catch (error) {
        console.error(`❌ Failed to blacklist ${userId}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// UNBLACKLIST ENDPOINT
// ============================================

app.post('/api/unblacklist', async (req, res) => {
    console.log('📨 Received unblacklist request:', req.body);
    
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        
        try {
            const member = await guild.members.fetch(userId);
            await member.roles.remove(BLACKLIST_ROLE_ID);
            console.log(`✅ Removed blacklist role from ${userId}`);
        } catch (e) {
            console.log(`⚠️ User ${userId} not in server, cannot remove role`);
        }

        // Send DM
        const dmMessage = `
**✅ You've Been Unblacklisted!**

Your access to **Revere** has been restored.

━━━━━━━━━━━━━━━━━━━
**📋 Details:**
- **Status:** ✅ Unblacklisted
- **Date:** ${new Date().toLocaleString()}

You can now use Revere again.
        `.trim();
        
        const dmResult = await sendDM(userId, dmMessage);

        res.json({
            success: true,
            message: `Unblacklisted ${userId}`,
            dmSent: dmResult.success,
            dmError: dmResult.error || null
        });

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

client.login(DISCORD_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error.message);
    process.exit(1);
});
