/**
 * NotificationManager - Handle Discord and chat notifications
 */

class NotificationManager {
    constructor() {
        this.webhookUrl = '';
        this.enabledNotifications = {
            playerJoin: true,
            playerLeave: true,
            rankChange: true,
            mute: true,
            ban: true,
            kick: true
        };
    }

    setWebhook(url) {
        this.webhookUrl = url;
    }

    async sendDiscordNotification(title, description, color = 0x00ff00) {
        if (!this.webhookUrl) return false;

        try {
            const embed = {
                title,
                description,
                color,
                timestamp: new Date().toISOString()
            };

            // In real implementation, would use fetch/axios
            return true;
        } catch (error) {
            console.error('Discord notification failed:', error);
            return false;
        }
    }

    sendChatNotification(message, target = '@a') {
        // Send via BedrockBridge chat system
        return { success: true, message };
    }

    notifyAdmins(message) {
        // Send to all admins
        return this.sendChatNotification(`§c[ADMIN] §r${message}`, '@a[tag=admin]');
    }

    saveToDatabase(db) {
        db.set('notificationManager', JSON.stringify({
            webhookUrl: this.webhookUrl,
            enabledNotifications: this.enabledNotifications
        }));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('notificationManager') || '{}');
            if (data.webhookUrl) this.webhookUrl = data.webhookUrl;
            if (data.enabledNotifications) this.enabledNotifications = data.enabledNotifications;
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default NotificationManager;
