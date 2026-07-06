// ============================================
// REVERE KEY MANAGEMENT DASHBOARD
// ============================================

// Data Store
const Store = {
    keys: [],
    users: [],
    blacklist: [],
    settings: {
        adminId: '',
        webhookUrl: '',
        maxAttempts: 3,
        cooldownTime: 300
    },
    activity: []
};

// ============================================
// LOCAL STORAGE MANAGEMENT
// ============================================

function loadData() {
    try {
        const saved = localStorage.getItem('krylonData');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(Store, data);
            return true;
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }
    return false;
}

function saveData() {
    try {
        localStorage.setItem('krylonData', JSON.stringify(Store));
        return true;
    } catch (e) {
        console.error('Failed to save data:', e);
        return false;
    }
}

// ============================================
// KEY GENERATION
// ============================================

function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
        if (i % 4 === 3 && i < 31) key += '-';
    }
    return key;
}

function getExpiryDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// ============================================
// KEY MANAGEMENT FUNCTIONS
// ============================================

function addKey(expiryDays, maxUsers, prefix = '') {
    const key = prefix + generateKey();
    const newKey = {
        key: key,
        users: [],
        maxUsers: parseInt(maxUsers),
        expires: getExpiryDate(parseInt(expiryDays)),
        created: new Date().toISOString(),
        status: 'active'
    };
    Store.keys.push(newKey);
    addActivity(`Generated key: ${key}`, 'success');
    saveData();
    renderKeys();
    updateStats();
    return newKey;
}

function deleteKey(keyToDelete) {
    Store.keys = Store.keys.filter(k => k.key !== keyToDelete);
    addActivity(`Deleted key: ${keyToDelete}`, 'warning');
    saveData();
    renderKeys();
    updateStats();
}

function toggleKeyStatus(keyToToggle) {
    const key = Store.keys.find(k => k.key === keyToToggle);
    if (key) {
        key.status = key.status === 'active' ? 'inactive' : 'active';
        addActivity(`Toggled key: ${keyToToggle} (${key.status})`, 'info');
        saveData();
        renderKeys();
        updateStats();
    }
}

// ============================================
// USER MANAGEMENT
// ============================================

function addUser(discordId, username = '') {
    if (Store.users.find(u => u.discordId === discordId)) {
        showToast('User already exists!', 'warning');
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
    addActivity(`Added user: ${username || discordId}`, 'success');
    saveData();
    renderUsers();
    updateStats();
    return user;
}

function removeUser(discordId) {
    Store.users = Store.users.filter(u => u.discordId !== discordId);
    addActivity(`Removed user: ${discordId}`, 'warning');
    saveData();
    renderUsers();
    updateStats();
}

// ============================================
// BLACKLIST MANAGEMENT
// ============================================

function blacklistUser(discordId, reason = '') {
    if (Store.blacklist.find(b => b.discordId === discordId)) {
        showToast('User already blacklisted!', 'warning');
        return false;
    }
    
    Store.users = Store.users.filter(u => u.discordId !== discordId);
    
    const entry = {
        discordId: discordId,
        reason: reason || 'No reason provided',
        date: new Date().toISOString()
    };
    
    Store.blacklist.push(entry);
    addActivity(`Blacklisted user: ${discordId}`, 'error');
    saveData();
    renderBlacklist();
    updateStats();
    return entry;
}

function unblacklistUser(discordId) {
    Store.blacklist = Store.blacklist.filter(b => b.discordId !== discordId);
    addActivity(`Unblacklisted user: ${discordId}`, 'info');
    saveData();
    renderBlacklist();
    updateStats();
}

// ============================================
// ACTIVITY LOGGING
// ============================================

function addActivity(text, type = 'info') {
    Store.activity.unshift({
        text: text,
        type: type,
        time: new Date().toLocaleString()
    });
    
    if (Store.activity.length > 100) {
        Store.activity = Store.activity.slice(0, 100);
    }
    
    renderActivity();
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderActivity() {
    const container = document.getElementById('activityList');
    if (!container) return;
    
    container.innerHTML = Store.activity.slice(0, 20).map(activity => `
        <div class="activity-item">
            <span class="activity-dot ${activity.type}"></span>
            <div class="activity-content">
                <span class="activity-text">${activity.text}</span>
                <span class="activity-time">${activity.time}</span>
            </div>
        </div>
    `).join('');
}

function renderKeys() {
    const tbody = document.getElementById('keysTableBody');
    if (!tbody) return;
    
    if (Store.keys.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">
                    No keys generated yet
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = Store.keys.map(key => {
        const isExpired = new Date(key.expires) < new Date();
        const isFull = key.users.length >= key.maxUsers;
        let status = 'active';
        let statusText = 'Active';
        
        if (key.status === 'inactive') {
            status = 'expired';
            statusText = 'Inactive';
        } else if (isExpired) {
            status = 'expired';
            statusText = 'Expired';
        } else if (isFull) {
            status = 'full';
            statusText = 'Full';
        }
        
        return `
            <tr>
                <td><code>${key.key}</code></td>
                <td>${key.users.length}</td>
                <td>${key.maxUsers}</td>
                <td>${key.expires}</td>
                <td><span class="status-badge status-${status}">${statusText}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="toggleKeyStatus('${key.key}')" style="padding:4px 10px;font-size:11px;">Toggle</button>
                    <button class="btn btn-danger" onclick="deleteKey('${key.key}')" style="padding:4px 10px;font-size:11px;">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (Store.users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">
                    No users whitelisted yet
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = Store.users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td><code>${user.discordId}</code></td>
            <td
