# Quick Start - Multi-Server Deployment

Panduan cepat untuk deploy bot ke multiple Discord servers.

## 📋 Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] MySQL 8.0+ installed & running
- [ ] Discord bot created di Developer Portal
- [ ] Bot token & Client ID ready
- [ ] Server/VPS for hosting (recommended: 1-2GB RAM)

## 🚀 5-Minute Setup

### 1. Clone & Install
```bash
git clone <repository>
cd syntak-discordbot
npm install
```

### 2. Database Setup
```bash
mysql -u root -p

# In MySQL:
CREATE DATABASE syntak_discord_bot;
exit;
```

### 3. Configure Bot
```bash
cp .env.example .env
nano .env  # or use any text editor
```

**Minimal .env:**
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=syntak_discord_bot
```

**IMPORTANT:** Do NOT set `GUILD_ID` for multi-server!

### 4. Deploy Commands
```bash
npm run deploy
```

Wait for: `✅ Successfully deployed X commands globally to all servers`

### 5. Start Bot
```bash
npm start
```

Bot is now running! ✅

## 🔗 Invite Bot to Servers

Generate invite link:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1099780063238&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` dengan Client ID Anda.

## ⚙️ First-Time Server Setup

Setelah bot join server, admin run:

```
/setmodlog channel:#mod-logs
```

That's it! Bot ready to use.

## 📝 Optional Configuration

```
/config view                           # View settings
/config automod enabled:true           # Enable auto-mod
/config raidprotection enabled:true    # Enable raid protection
/config maxwarnings count:3            # Set warning limit
/config autoaction action:timeout      # Set auto-action
```

## ✅ Verify Installation

Test basic command:
```
/config view
```

Should show server configuration.

Test moderation:
```
/warn @user reason:Test
/warnings @user
```

Check mod logs channel - should see log entries.

## 🔄 Production Deployment (PM2)

For auto-restart & process management:

```bash
npm install -g pm2
pm2 start index.js --name syntak-bot
pm2 startup
pm2 save
```

View logs:
```bash
pm2 logs syntak-bot
```

## 🆘 Common Issues

**Commands not showing up**
- Wait up to 1 hour (global commands delay)
- Try `/config view` to force refresh

**Database connection failed**
- Check MySQL is running: `sudo systemctl status mysql`
- Verify credentials in `.env`
- Check database exists: `SHOW DATABASES;`

**Bot offline**
- Check bot token is correct
- Verify Privileged Gateway Intents enabled
- Check logs: `pm2 logs` or console output

## 📊 Monitor Multiple Servers

```sql
-- Login to MySQL
mysql -u root -p syntak_discord_bot

-- Check total servers
SELECT COUNT(DISTINCT guild_id) FROM guild_config;

-- View all server configs
SELECT * FROM guild_config;
```

## 🎯 Next Steps

- Read [MULTI_SERVER_GUIDE.md](file:///d:/Coding/syntak-discordbot/MULTI_SERVER_GUIDE.md) untuk advanced topics
- Read [README.md](file:///d:/Coding/syntak-discordbot/README.md) untuk full documentation
- Customize auto-mod filters di `src/config/automod.js`
- Setup monitoring & backups

---

**Bot is ready for production multi-server deployment!** 🚀
