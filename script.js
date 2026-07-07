// ============================================
// REVERE KEY MANAGEMENT DASHBOARD - COMPLETE
// ============================================

// Bot API URL
const BOT_API_URL = 'https://revere-bot.onrender.com';

// Data Store
let data = {
    keys: [],
    users: [],
    blacklist: [],
    activity: ['System initialized']
};

// ============================================
// BOT API CONNECTION
// ============================================

async function callBotAPI(endpoint, data) {
    try {
        const response = await fetch(`${BOT_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log('📨 Bot API response:', result);
        return result;
    } catch (error) {
        console.error('❌ Bot API error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 REVERE Dashboard loading...');
    loadData();
    setupTabs();
    loadSettings();
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            renderAll();
            showToast('🔄 Refreshed!', 'info');
        });
    }
    
    console.log('✅ REVERE Dashboard ready!');
});

// ============================================
// DATA MANAGEMENT
// ============================================

function loadData() {
    try {
        const saved = localStorage.getItem('revereData');
        if (saved) {
            data = JSON.parse(saved);
            console.log('📂 Data loaded from localStorage');
        } else {
            data.keys = [
                { key: 'REV-DEMO-001', users: 0, maxUsers: 5, expires: '2027-01-01', status: 'active' }
            ];
            data.activity = ['System initialized', 'Default key added'];
            saveData();
            console.log('📂 Default data created');
        }
    } catch(e) {
        console.error('❌ Failed to load data:', e);
    }
    renderAll();
}

function saveData() {
    try {
        localStorage.setItem('revereData', JSON.stringify(data));
        return true;
    } catch(e) {
        console.error('❌ Failed to save data:', e);
        return false;
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAll() {
    renderStats();
    renderKeys();
    renderUsers();
    renderBlacklist();
    renderActivity();
}

function renderStats() {
    const totalKeys = document.getElementById('totalKeys');
    const totalUsers = document.getElementById('totalUsers');
    const whitelistedCount = document.getElementById('whitelistedCount');
    const blacklistedCount = document.getElementById('blacklistedCount');
    
    if (totalKeys) totalKeys.textContent = data.keys.length;
    if (totalUsers) totalUsers.textContent = data.users.length;
    if (whitelistedCount) whitelistedCount.textContent = data.users.length;
    if (blacklistedCount) blacklistedCount.textContent = data.blacklist.length;
}

function renderKeys() {
    const tbody = document.getElementById('keysTableBody');
    if (!tbody) return;
    
    if (data.keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#556677;padding:40px;">No keys generated yet</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.keys.map((key, index) => `
        <tr>
            <td><code>${key.key}</code></td>
            <td>${key.users || 0}</td>
            <td>${key.maxUsers || 5}</td>
            <td>${key.expires || '2027-01-01'}</td>
            <td><span class="status-badge status-${key.status || 'active'}">${key.status || 'active'}</span></td>
            <td>
                <button class="btn btn-secondary" onclick="toggleKey(${index})" style="padding:4px 10px;font-size:11px;margin:2px;">Toggle</button>
                <button class="btn btn-danger" onclick="deleteKey(${index})" style="padding:4px 10px;font-size:11px;margin:2px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (data.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#556677;padding:40px;">No users whitelisted yet</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.users.map((user, index) => `
        <tr>
            <td>${user.username || 'User_' + user.discordId.slice(-4)}</td>
            <td><code>${user.discordId}</code></td>
            <td><span class="status-badge status-whitelisted">✅ Whitelisted</span></td>
            <td>${user.joined ? new Date(user.joined).toLocaleDateString() : 'Today'}</td>
            <td>
                <button class="btn btn-danger" onclick="removeUser(${index})" style="padding:4px 10px;font-size:11px;margin:2px;">Remove</button>
                <button class="btn btn-danger" onclick="blacklistUserFromList(${index})" style="padding:4px 10px;font-size:11px;margin:2px;">Blacklist</button>
            </td>
        </tr>
    `).join('');
}

function renderBlacklist() {
    const tbody = document.getElementById('blacklistTableBody');
    if (!tbody) return;
    
    if (data.blacklist.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#556677;padding:40px;">No users blacklisted</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.blacklist.map((entry, index) => `
        <tr>
            <td>User #${entry.discordId.slice(-4)}</td>
            <td><code>${entry.discordId}</code></td>
            <td>${entry.reason || 'No reason provided'}</td>
            <td>${entry.date ? new Date(entry.date).toLocaleDateString() : 'Today'}</td>
            <td>
                <button class="btn btn-success" onclick="unblacklistUser(${index})" style="padding:4px 10px;font-size:11px;margin:2px;">Unblacklist</button>
            </td>
        </tr>
    `).join('');
}

function renderActivity() {
    const container = document.getElementById('activityList');
    if (!container) return;
    
    if (data.activity.length === 0) {
        container.innerHTML = `<div class="activity-item"><span class="activity-text" style="color:#556677;">No activity yet</span></div>`;
        return;
    }
    
    container.innerHTML = data.activity.slice(0, 20).map(activity => `
        <div class="activity-item">
            <span class="activity-dot online"></span>
            <div class="activity-content">
                <span class="activity-text">${activity}</span>
                <span class="activity-time">Just now</span>
            </div>
        </div>
    `).join('');
}

// ============================================
// KEY FUNCTIONS
// ============================================

function showKeyGenerator() {
    document.getElementById('keyGenerator').style.display = 'block';
}

function cancelGenerate() {
    document.getElementById('keyGenerator').style.display = 'none';
}

function generateKey() {
    console.log('🔑 Generating key...');
    
    const daysInput = document.getElementById('expiryDays');
    const maxInput = document.getElementById('maxUsers');
    const prefixInput = document.getElementById('keyPrefix');
    
    const days = parseInt(daysInput ? daysInput.value : 365) || 365;
    const maxUsers = parseInt(maxInput ? maxInput.value : 5) || 5;
    const prefix = prefixInput ? prefixInput.value.trim() : '';
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = prefix || 'REV-';
    for (let i = 0; i < 12; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
        if (i % 4 === 3 && i < 11) key += '-';
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    data.keys.push({
        key: key,
        users: 0,
        maxUsers: maxUsers,
        expires: expiryDate.toISOString().split('T')[0],
        status: 'active'
    });
    
    data.activity.unshift(`Generated key: ${key}`);
    saveData();
    renderAll();
    
    document.getElementById('keyGenerator').style.display = 'none';
    if (prefixInput) prefixInput.value = '';
    
    showToast(`✅ Key generated: ${key}`, 'success');
    
    try {
        navigator.clipboard.writeText(key);
    } catch(e) {
        console.log('📋 Key:', key);
    }
}

function deleteKey(index) {
    if (!confirm(`Delete key ${data.keys[index].key}?`)) return;
    data.keys.splice(index, 1);
    data.activity.unshift(`Deleted key`);
    saveData();
    renderAll();
    showToast('🗑️ Key deleted!', 'warning');
}

function toggleKey(index) {
    const key = data.keys[index];
    if (key) {
        key.status = key.status === 'active' ? 'inactive' : 'active';
        data.activity.unshift(`Toggled key: ${key.key} (${key.status})`);
        saveData();
        renderAll();
        showToast(`Key ${key.status}`, 'info');
    }
}

// ============================================
// USER FUNCTIONS (WITH BOT API)
// ============================================

function showUserAdd() {
    document.getElementById('userAdd').style.display = 'block';
}

function cancelAddUser() {
    document.getElementById('userAdd').style.display = 'none';
}

// FIXED: This function now properly handles the async call
function addUser() {
    console.log('👤 Add User button clicked!');
    
    const idInput = document.getElementById('userIdInput');
    const nameInput = document.getElementById('usernameInput');
    
    const discordId = idInput ? idInput.value.trim() : '';
    const username = nameInput ? nameInput.value.trim() : '';
    
    if (!discordId) {
        showToast('⚠️ Enter a Discord ID', 'error');
        return;
    }
    
    if (!/^\d+$/.test(discordId)) {
        showToast('⚠️ Invalid Discord ID (numbers only)', 'error');
        return;
    }
    
    if (data.users.find(u => u.discordId === discordId)) {
        showToast('⚠️ User already exists!', 'warning');
        return;
    }
    
    // Show loading state
    const btn = document.querySelector('.user-add .btn-success');
    const originalText = btn ? btn.textContent : 'Add User';
    if (btn) {
        btn.textContent = '⏳ Sending...';
        btn.disabled = true;
    }
    
    // Call the bot API
    callBotAPI('/api/whitelist', {
        userId: discordId,
        username: username || `User_${discordId.slice(-4)}`
    }).then(result => {
        // Restore button
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        
        if (result.success) {
            data.users.push({
                discordId: discordId,
                username: username || `User_${discordId.slice(-4)}`,
                status: 'whitelisted',
                joined: new Date().toISOString()
            });
            
            data.activity.unshift(`✅ User ${username || discordId} whitelisted via bot`);
            saveData();
            renderAll();
            
            if (idInput) idInput.value = '';
            if (nameInput) nameInput.value = '';
            document.getElementById('userAdd').style.display = 'none';
            
            showToast(`✅ User ${username || discordId} whitelisted!`, 'success');
        } else {
            showToast(`❌ Bot error: ${result.error || 'Unknown error'}`, 'error');
        }
    }).catch(error => {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        showToast(`❌ Error: ${error.message}`, 'error');
    });
}

function removeUser(index) {
    const user = data.users[index];
    if (!confirm(`Remove user ${user.username || user.discordId}?`)) return;
    data.users.splice(index, 1);
    data.activity.unshift(`Removed user: ${user.discordId}`);
    saveData();
    renderAll();
    showToast('🗑️ User removed!', 'warning');
}

function blacklistUserFromList(index) {
    const user = data.users[index];
    if (!confirm(`Blacklist ${user.username || user.discordId}?`)) return;
    
    data.blacklist.push({
        discordId: user.discordId,
        reason: 'Blacklisted from users list',
        date: new Date().toISOString()
    });
    data.users.splice(index, 1);
    data.activity.unshift(`Blacklisted user: ${user.discordId}`);
    saveData();
    renderAll();
    showToast(`🚫 User blacklisted!`, 'error');
}

// ============================================
// BLACKLIST FUNCTIONS (WITH BOT API)
// ============================================

function showBlacklistAdd() {
    document.getElementById('blacklistAdd').style.display = 'block';
}

function cancelBlacklist() {
    document.getElementById('blacklistAdd').style.display = 'none';
}

function blacklistUser() {
    console.log('🚫 Blacklisting user...');
    
    const idInput = document.getElementById('blacklistIdInput');
    const reasonInput = document.getElementById('blacklistReason');
    
    const discordId = idInput ? idInput.value.trim() : '';
    const reason = reasonInput ? reasonInput.value.trim() : 'No reason provided';
    
    if (!discordId) {
        showToast('⚠️ Enter a Discord ID', 'error');
        return;
    }
    
    if (!/^\d+$/.test(discordId)) {
        showToast('⚠️ Invalid Discord ID (numbers only)', 'error');
        return;
    }
    
    if (data.blacklist.find(b => b.discordId === discordId)) {
        showToast('⚠️ User already blacklisted!', 'warning');
        return;
    }
    
    // Show loading state
    const btn = document.querySelector('.user-add .btn-danger');
    const originalText = btn ? btn.textContent : 'Blacklist';
    if (btn) {
        btn.textContent = '⏳ Sending...';
        btn.disabled = true;
    }
    
    callBotAPI('/api/blacklist', {
        userId: discordId,
        reason: reason
    }).then(result => {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        
        if (result.success) {
            data.users = data.users.filter(u => u.discordId !== discordId);
            
            data.blacklist.push({
                discordId: discordId,
                reason: reason,
                date: new Date().toISOString()
            });
            
            data.activity.unshift(`🚫 User ${discordId} blacklisted via bot`);
            saveData();
            renderAll();
            
            if (idInput) idInput.value = '';
            if (reasonInput) reasonInput.value = '';
            document.getElementById('blacklistAdd').style.display = 'none';
            
            showToast(`🚫 User ${discordId} blacklisted!`, 'error');
        } else {
            showToast(`❌ Bot error: ${result.error || 'Unknown error'}`, 'error');
        }
    }).catch(error => {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        showToast(`❌ Error: ${error.message}`, 'error');
    });
}

function unblacklistUser(index) {
    const entry = data.blacklist[index];
    if (!confirm(`Unblacklist user ${entry.discordId}?`)) return;
    
    // Show loading state
    const btn = document.querySelector(`#blacklistTableBody tr:nth-child(${index+1}) .btn-success`);
    const originalText = btn ? btn.textContent : 'Unblacklist';
    if (btn) {
        btn.textContent = '⏳...';
        btn.disabled = true;
    }
    
    callBotAPI('/api/unblacklist', {
        userId: entry.discordId
    }).then(result => {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        
        if (result.success) {
            data.blacklist.splice(index, 1);
            data.activity.unshift(`✅ User ${entry.discordId} unblacklisted via bot`);
            saveData();
            renderAll();
            showToast(`✅ User unblacklisted!`, 'success');
        } else {
            showToast(`❌ Bot error: ${result.error || 'Unknown error'}`, 'error');
        }
    }).catch(error => {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        showToast(`❌ Error: ${error.message}`, 'error');
    });
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

function saveSettings() {
    const adminId = document.getElementById('adminId');
    const webhookUrl = document.getElementById('webhookUrl');
    
    if (adminId && adminId.value.trim()) {
        localStorage.setItem('revere_adminId', adminId.value.trim());
        if (webhookUrl && webhookUrl.value.trim()) {
            // Update bot URL if changed
            const newUrl = webhookUrl.value.trim();
            if (newUrl !== BOT_API_URL) {
                console.log(`🔄 Bot URL changed to: ${newUrl}`);
                // You could store this and use it instead of the constant
            }
        }
        showToast('✅ Settings saved!', 'success');
    } else {
        showToast('⚠️ Please enter a valid Admin ID', 'error');
    }
}

function loadSettings() {
    const adminId = localStorage.getItem('revere_adminId');
    if (adminId) {
        const adminInput = document.getElementById('adminId');
        if (adminInput) adminInput.value = adminId;
    }
    // Load webhook URL
    const webhookInput = document.getElementById('webhookUrl');
    if (webhookInput) {
        webhookInput.value = BOT_API_URL;
    }
}

function clearAllData() {
    if (!confirm('⚠️ Clear ALL data? This cannot be undone!')) return;
    if (!confirm('⚠️ REALLY? All keys, users, and blacklist will be deleted!')) return;
    
    data.keys = [];
    data.users = [];
    data.blacklist = [];
    data.activity = ['System reset'];
    saveData();
    renderAll();
    showToast('🗑️ All data cleared!', 'warning');
}

function exportAllData() {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revere_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Data exported!', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.keys && imported.users && imported.blacklist) {
                data.keys = imported.keys;
                data.users = imported.users;
                data.blacklist = imported.blacklist;
                data.activity.unshift('Data imported');
                saveData();
                renderAll();
                showToast('✅ Data imported successfully!', 'success');
            } else {
                showToast('❌ Invalid data file!', 'error');
            }
        } catch (error) {
            showToast('❌ Failed to import: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// TAB NAVIGATION
// ============================================

function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`📑 Found ${navItems.length} nav items`);
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const tabName = this.dataset.tab;
            console.log(`📑 Switching to tab: ${tabName}`);
            
            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            const titles = {
                dashboard: 'Dashboard',
                keys: 'Key Management',
                users: 'User Management',
                blacklist: 'Blacklist Management',
                settings: 'Settings'
            };
            const pageTitle = document.getElementById('page-title');
            const pageSubtitle = document.getElementById('page-subtitle');
            if (pageTitle) pageTitle.textContent = titles[tabName] || 'Dashboard';
            if (pageSubtitle) pageSubtitle.textContent = tabName === 'dashboard' ? 'Welcome back, Admin' : '';
        });
    });
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
        if (toast.parentNode) toast.remove();
    }, 3500);
}

// ============================================
// INITIALIZE
// ============================================

console.log('📝 REVERE script loaded!');
console.log(`🤖 Bot API URL: ${BOT_API_URL}`);
