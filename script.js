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
            <td><span class="status-badge status-whitelisted">Whitelisted</span></td>
            <td>${new Date(user.joined).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-danger" onclick="removeUser('${user.discordId}')" style="padding:4px 10px;font-size:11px;">Remove</button>
                <button class="btn btn-danger" onclick="blacklistUser('${user.discordId}', 'Manual blacklist')" style="padding:4px 10px;font-size:11px;">Blacklist</button>
            </td>
        </tr>
    `).join('');
}

function renderBlacklist() {
    const tbody = document.getElementById('blacklistTableBody');
    if (!tbody) return;
    
    if (Store.blacklist.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">
                    No users blacklisted
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = Store.blacklist.map(entry => `
        <tr>
            <td>User #${entry.discordId.slice(-4)}</td>
            <td><code>${entry.discordId}</code></td>
            <td>${entry.reason}</td>
            <td>${new Date(entry.date).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-success" onclick="unblacklistUser('${entry.discordId}')" style="padding:4px 10px;font-size:11px;">Unblacklist</button>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    document.getElementById('totalKeys').textContent = Store.keys.length;
    document.getElementById('totalUsers').textContent = Store.users.length;
    document.getElementById('whitelistedCount').textContent = Store.users.length;
    document.getElementById('blacklistedCount').textContent = Store.blacklist.length;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || (() => {
        const div = document.createElement('div');
        div.className = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================
// TAB NAVIGATION
// ============================================

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        
        const tab = this.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(tab).classList.add('active');
        
        const titles = {
            dashboard: 'Dashboard',
            keys: 'Key Management',
            users: 'User Management',
            blacklist: 'Blacklist Management',
            settings: 'Settings'
        };
        document.getElementById('page-title').textContent = titles[tab] || 'Dashboard';
        document.getElementById('page-subtitle').textContent = tab === 'dashboard' ? 'Welcome back, Admin' : '';
    });
});

// ============================================
// KEY GENERATOR UI
// ============================================

document.getElementById('generateKeyBtn').addEventListener('click', function() {
    const generator = document.getElementById('keyGenerator');
    generator.style.display = generator.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('cancelGenerate').addEventListener('click', function() {
    document.getElementById('keyGenerator').style.display = 'none';
});

document.getElementById('generateKeySubmit').addEventListener('click', function() {
    const days = document.getElementById('expiryDays').value;
    const maxUsers = document.getElementById('maxUsers').value;
    const prefix = document.getElementById('keyPrefix').value;
    
    if (!days || days < 1) {
        showToast('Please enter valid days', 'error');
        return;
    }
    
    const newKey = addKey(days, maxUsers, prefix);
    showToast(`Key generated: ${newKey.key}`, 'success');
    
    navigator.clipboard.writeText(newKey.key).then(() => {
        showToast('Key copied to clipboard!', 'info');
    }).catch(() => {
        showToast(`Key: ${newKey.key}`, 'info');
    });
    
    document.getElementById('keyGenerator').style.display = 'none';
});

// ============================================
// USER ADD UI
// ============================================

document.getElementById('addUserBtn').addEventListener('click', function() {
    const addForm = document.getElementById('userAdd');
    addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('cancelAddUser').addEventListener('click', function() {
    document.getElementById('userAdd').style.display = 'none';
});

document.getElementById('addUserSubmit').addEventListener('click', function() {
    const discordId = document.getElementById('userIdInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim();
    
    if (!discordId) {
        showToast('Please enter a Discord ID', 'error');
        return;
    }
    
    if (!/^\d+$/.test(discordId)) {
        showToast('Invalid Discord ID (must be numbers only)', 'error');
        return;
    }
    
    const user = addUser(discordId, username);
    if (user) {
        showToast(`User ${user.username} added to whitelist!`, 'success');
        document.getElementById('userIdInput').value = '';
        document.getElementById('usernameInput').value = '';
        document.getElementById('userAdd').style.display = 'none';
    }
});

// ============================================
// BLACKLIST UI
// ============================================

document.getElementById('blacklistUserBtn').addEventListener('click', function() {
    const addForm = document.getElementById('blacklistAdd');
    addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('cancelBlacklist').addEventListener('click', function() {
    document.getElementById('blacklistAdd').style.display = 'none';
});

document.getElementById('blacklistSubmit').addEventListener('click', function() {
    const discordId = document.getElementById('blacklistIdInput').value.trim();
    const reason = document.getElementById('blacklistReason').value.trim();
    
    if (!discordId) {
        showToast('Please enter a Discord ID', 'error');
        return;
    }
    
    if (!/^\d+$/.test(discordId)) {
        showToast('Invalid Discord ID (must be numbers only)', 'error');
        return;
    }
    
    const entry = blacklistUser(discordId, reason);
    if (entry) {
        showToast(`User ${discordId} has been blacklisted!`, 'error');
        document.getElementById('blacklistIdInput').value = '';
        document.getElementById('blacklistReason').value = '';
        document.getElementById('blacklistAdd').style.display = 'none';
    }
});

// ============================================
// SETTINGS
// ============================================

document.getElementById('saveSettings').addEventListener('click', function() {
    Store.settings.adminId = document.getElementById('adminId').value.trim();
    Store.settings.webhookUrl = document.getElementById('webhookUrl').value.trim();
    Store.settings.maxAttempts = parseInt(document.getElementById('maxAttempts').value) || 3;
    Store.settings.cooldownTime = parseInt(document.getElementById('cooldownTime').value) || 300;
    
    saveData();
    showToast('Settings saved!', 'success');
});

// ============================================
// EXPORT / IMPORT
// ============================================

document.getElementById('exportBtn').addEventListener('click', function() {
    exportAllData();
});

document.getElementById('exportAllData').addEventListener('click', function() {
    exportAllData();
});

function exportAllData() {
    const data = {
        version: '2.0',
        exported: new Date().toISOString(),
        ...Store
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krylon_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully!', 'success');
}

document.getElementById('importDataBtn').addEventListener('click', function() {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.keys && data.users && data.blacklist) {
                Store.keys = data.keys;
                Store.users = data.users;
                Store.blacklist = data.blacklist;
                Store.settings = data.settings || Store.settings;
                
                saveData();
                renderAll();
                showToast('Data imported successfully!', 'success');
            } else {
                showToast('Invalid data file!', 'error');
            }
        } catch (error) {
            showToast('Failed to import data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    this.value = '';
});

// ============================================
// CLEAR DATA
// ============================================

document.getElementById('clearAllData').addEventListener('click', function() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
        if (confirm('Really? All keys, users, and blacklist will be deleted!')) {
            Store.keys = [];
            Store.users = [];
            Store.blacklist = [];
            Store.activity = [];
            saveData();
            renderAll();
            showToast('All data cleared!', 'warning');
        }
    }
});

// ============================================
// REFRESH
// ============================================

document.getElementById('refreshBtn').addEventListener('click', function() {
    renderAll();
    showToast('Refreshed!', 'info');
});

// ============================================
// RENDER ALL
// ============================================

function renderAll() {
    renderActivity();
    renderKeys();
    renderUsers();
    renderBlacklist();
    updateStats();
}

// ============================================
// INITIALIZATION
// ============================================

if (!loadData()) {
    addActivity('System initialized', 'online');
    addActivity('Welcome to Krylon Key Management Dashboard', 'info');
    addActivity('Default key added for testing', 'info');
    addKey(365, 5, 'KRY-');
    saveData();
}

renderAll();

document.getElementById('adminId').value = Store.settings.adminId || '';
document.getElementById('webhookUrl').value = Store.settings.webhookUrl || '';
document.getElementById('maxAttempts').value = Store.settings.maxAttempts || 3;
document.getElementById('cooldownTime').value = Store.settings.cooldownTime || 300;

console.log('[KRYLON] Dashboard initialized!');
console.log(`[KRYLON] ${Store.keys.length} keys, ${Store.users.length} users, ${Store.blacklist.length} blacklisted`);
