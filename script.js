// ============================================
// ADDITIONAL FUNCTIONS
// ============================================

function saveSettings() {
    const adminId = document.getElementById('adminId').value.trim();
    const webhookUrl = document.getElementById('webhookUrl').value.trim();
    
    if (adminId) {
        localStorage.setItem('revere_adminId', adminId);
        showToast('Settings saved!', 'success');
    } else {
        showToast('Please enter a valid Admin ID', 'error');
    }
}

function clearAllData() {
    if (!confirm('Are you sure you want to clear ALL data? This cannot be undone!')) return;
    if (!confirm('Really? All keys, users, and blacklist will be deleted!')) return;
    
    data.keys = [];
    data.users = [];
    data.blacklist = [];
    data.activity = ['System reset'];
    saveData();
    renderAll();
    showToast('All data cleared!', 'warning');
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
                showToast('Data imported successfully!', 'success');
            } else {
                showToast('Invalid data file!', 'error');
            }
        } catch (error) {
            showToast('Failed to import data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function generateKey() {
    const days = document.getElementById('expiryDays').value || 365;
    const maxUsers = document.getElementById('maxUsers').value || 5;
    const prefix = document.getElementById('keyPrefix').value || '';
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = prefix || 'KRY-';
    for (let i = 0; i < 12; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
        if (i % 4 === 3 && i < 11) key += '-';
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));
    
    data.keys.push({
        key: key,
        users: 0,
        maxUsers: parseInt(maxUsers),
        expires: expiryDate.toISOString().split('T')[0],
        status: 'active'
    });
    data.activity.unshift(`Generated key: ${key}`);
    saveData();
    renderAll();
    showToast(`Key generated: ${key}`, 'success');
    
    // Copy to clipboard
    navigator.clipboard.writeText(key).catch(() => {});
    document.getElementById('keyGenerator').style.display = 'none';
}

function addUser() {
    const discordId = document.getElementById('userIdInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim() || `User_${discordId.slice(-4)}`;
    
    if (!discordId) {
        showToast('Enter a Discord ID', 'error');
        return;
    }
    if (!/^\d+$/.test(discordId)) {
        showToast('Invalid Discord ID (numbers only)', 'error');
        return;
    }
    if (data.users.find(u => u.discordId === discordId)) {
        showToast('User already exists!', 'warning');
        return;
    }
    
    data.users.push({
        discordId: discordId,
        username: username,
        status: 'whitelisted',
        joined: new Date().toISOString()
    });
    data.activity.unshift(`Added user: ${username} (${discordId})`);
    saveData();
    renderAll();
    document.getElementById('userIdInput').value = '';
    document.getElementById('usernameInput').value = '';
    document.getElementById('userAdd').style.display = 'none';
    showToast(`User ${username} added to whitelist!`, 'success');
}

function blacklistUser() {
    const discordId = document.getElementById('blacklistIdInput').value.trim();
    const reason = document.getElementById('blacklistReason').value.trim() || 'No reason provided';
    
    if (!discordId) {
        showToast('Enter a Discord ID', 'error');
        return;
    }
    if (!/^\d+$/.test(discordId)) {
        showToast('Invalid Discord ID (numbers only)', 'error');
        return;
    }
    if (data.blacklist.find(b => b.discordId === discordId)) {
        showToast('User already blacklisted!', 'warning');
        return;
    }
    
    // Remove from whitelist if exists
    data.users = data.users.filter(u => u.discordId !== discordId);
    data.blacklist.push({
        discordId: discordId,
        reason: reason,
        date: new Date().toISOString()
    });
    data.activity.unshift(`Blacklisted user: ${discordId} (${reason})`);
    saveData();
    renderAll();
    document.getElementById('blacklistIdInput').value = '';
    document.getElementById('blacklistReason').value = '';
    document.getElementById('blacklistAdd').style.display = 'none';
    showToast(`User ${discordId} blacklisted!`, 'error');
}

function refreshPage() {
    renderAll();
    showToast('Refreshed!', 'info');
}

// Attach refresh button
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshPage);
    }
});
