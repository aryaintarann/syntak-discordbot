# Multi-Server Deployment Guide

Bot Discord moderasi ini dirancang untuk **multi-server deployment** - satu bot instance dapat melayani banyak server Discord sekaligus.

## 🌍 Multi-Server Architecture

### Database Design
- **Satu database MySQL** untuk semua servers
- Setiap table punya `guild_id` column untuk separate data per server
- Auto-create configuration untuk server baru pertama kali bot join
- Completely isolated data - server A tidak bisa lihat data server B

### How It Works
```
Bot Instance (One Process)
    ├── Discord API Connection
    ├── MySQL Database Pool
    │   ├── Server A Data (guild_id: 123...)
    │   ├── Server B Data (guild_id: 456...)
    │   └── Server C Data (guild_id: 789...)
    └── Event Handlers (shared)
```

## 🚀 Deployment Steps

### 1. Setup Bot di Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Create New Application
3. Go to "Bot" tab → Click "Add Bot"
4. **IMPORTANT**: Enable these Privileged Gateway Intents:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Copy Bot Token
6. Go to "OAuth2" → "URL Generator"
7. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
8. Select permissions (or use permission integer: `1099780063238`):
   - Kick Members
   - Ban Members
   - Moderate Members
   - Manage Messages
   - Manage Channels
   - View Audit Log
   - Send Messages
   - Embed Links

### 2. Setup MySQL Database

```sql
-- Login to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE syntak_discord_bot;

-- (Optional) Create dedicated user
CREATE USER 'botuser'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON syntak_discord_bot.* TO 'botuser'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_TOKEN=your_actual_bot_token_here
CLIENT_ID=your_bot_client_id_here

# IMPORTANT: DO NOT set GUILD_ID for multi-server production
# GUILD_ID is only for testing

DB_HOST=localhost
DB_PORT=3306
DB_USER=root              # or botuser
DB_PASSWORD=your_password
DB_NAME=syntak_discord_bot
```

### 4. Install & Deploy

```bash
# Install dependencies
npm install

# Deploy commands GLOBALLY (for all servers)
npm run deploy

# Start the bot
npm start
```

### 5. Invite Bot to Servers

Generate invite URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID_HERE&permissions=1099780063238&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID_HERE` dengan Client ID dari Discord Developer Portal.

Share link ini ke admin servers yang ingin menggunakan bot.

## ⚙️ Per-Server Setup

Setelah bot masuk server, admin perlu setup:

### 1. Set Mod Log Channel
```
/setmodlog channel:#mod-logs
```

### 2. View Current Config
```
/config view
```

### 3. Customize Settings (Optional)
```
/config automod enabled:true
/config raidprotection enabled:true
/config maxwarnings count:3
/config autoaction action:timeout
```

## 📊 Monitoring Multiple Servers

### Check Bot Status
```bash
# View logs
npm start

# Bot will show:
# ✅ Logged in as BotName#1234
# 📊 Serving X servers
```

### Database Queries

```sql
-- Total servers using bot
SELECT COUNT(DISTINCT guild_id) FROM guild_config;

-- List all servers with config
SELECT guild_id, auto_mod_enabled, raid_protection_enabled, max_warnings 
FROM guild_config;

-- Total warnings across all servers
SELECT COUNT(*) FROM warnings;

-- Total mod actions by type
SELECT action_type, COUNT(*) as count 
FROM mod_logs 
GROUP BY action_type;

-- Top 10 most moderated servers
SELECT guild_id, COUNT(*) as action_count 
FROM mod_logs 
GROUP BY guild_id 
ORDER BY action_count DESC 
LIMIT 10;
```

## 🔧 Configuration Management

### Default Settings (Environment)
Settings di `.env` adalah **fallback values**:
- `RAID_THRESHOLD=10`
- `RAID_TIME_WINDOW=10000`
- `AUTO_MOD_ENABLED=true`
- `MAX_MENTIONS=5`
- `MAX_LINKS=3`

### Per-Server Settings (Database)
Setiap server dapat override defaults via `/config` command:
- Auto-moderation enabled/disabled
- Raid protection enabled/disabled
- Max warnings threshold (1-10)
- Auto-action (timeout/kick/none)
- Mod log channel

## 📈 Scalability

### Resource Requirements

**Per Server:**
- Memory: ~5-10 MB
- CPU: Negligible (event-driven)
- Database: Minimal storage per server

**For 100 Servers:**
- Memory: ~1 GB
- CPU: 1-2 cores
- Database: ~500 MB
- Network: Minimal bandwidth

### Performance Optimization

✅ **Database Connection Pooling**
```javascript
// Already configured in database.js
connectionLimit: 10  // Max concurrent connections
```

✅ **Indexed Queries**
```sql
-- All queries use guild_id index
INDEX idx_user_guild (user_id, guild_id)
INDEX idx_guild_time (guild_id, timestamp)
```

✅ **Async Operations**
- Non-blocking event handlers
- Promises untuk database operations
- Efficient Discord API usage

### Recommended Hosting

**VPS/Cloud Options:**
- **DigitalOcean**: $6/month Droplet (1GB RAM)
- **Linode**: $5/month Nanode (1GB RAM)
- **AWS EC2**: t2.micro free tier
- **Google Cloud**: e2-micro free tier

**Requirements:**
- 1-2 GB RAM minimum
- Linux (Ubuntu 20.04+)
- MySQL 8.0+
- Node.js 16+

## 🔒 Security Best Practices

### Bot Token
- ✅ Never commit `.env` to git (already in `.gitignore`)
- ✅ Regenerate token jika leaked
- ✅ Use environment variables di production

### Database
- ✅ Strong password untuk MySQL user
- ✅ Tidak expose MySQL port ke public
- ✅ Regular backups

### Permissions
- ✅ Bot hanya request permissions yang needed
- ✅ Role hierarchy checks di semua commands
- ✅ Admin commands require Administrator permission

## 🆘 Troubleshooting Multi-Server

### Bot Join Server Tapi Commands Tidak Muncul

**Cause:** Global commands belum propagate

**Solution:**
```bash
# Commands bisa delay up to 1 hour
# For instant testing, use GUILD_ID in .env
# For production, wait or force re-deploy
npm run deploy
```

### Different Servers Seeing Different Configs

**Expected Behavior!** Setiap server independent.

**To Check:**
```sql
SELECT * FROM guild_config WHERE guild_id = 'SERVER_ID';
```

### Database Connection Errors

**Symptoms:** Bot crash dengan "Too many connections"

**Solution:**
```javascript
// Increase pool limit in database.js
connectionLimit: 20  // Increase from 10
```

### Memory Issues with Many Servers

**Symptoms:** Bot using too much RAM

**Solutions:**
1. Restart bot periodically (PM2 auto-restart)
2. Increase server RAM
3. Enable message content caching limits

## 🔄 Deployment Methods

### Method 1: PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start bot with PM2
pm2 start index.js --name syntak-bot

# Auto-restart on crash
pm2 startup
pm2 save

# View logs
pm2 logs syntak-bot

# Restart bot
pm2 restart syntak-bot
```

### Method 2: Docker

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

```bash
# Build
docker build -t syntak-bot .

# Run
docker run -d --name syntak-bot \
  --env-file .env \
  syntak-bot
```

### Method 3: systemd Service

Create `/etc/systemd/system/syntak-bot.service`:
```ini
[Unit]
Description=Syntak Discord Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/syntak-discordbot
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable syntak-bot
systemctl start syntak-bot
systemctl status syntak-bot
```

## 📝 Adding New Servers Checklist

- [ ] Generate invite link dengan permissions
- [ ] Send link ke server admin
- [ ] Bot auto-join server
- [ ] Admin run `/setmodlog channel:#mod-logs`
- [ ] Admin run `/config view` to verify
- [ ] (Optional) Admin customize settings
- [ ] Test with `/warn` or `/kick` command
- [ ] Verify logs appear di mod-logs channel

## 💡 Tips for Large-Scale Deployment

1. **Use MySQL Replication** untuk high-availability
2. **Setup Monitoring** (Prometheus + Grafana)
3. **Regular Database Backups** (daily cron)
4. **Log Aggregation** (PM2 logs → centralized logging)
5. **Rate Limit Awareness** (Discord API limits)
6. **Graceful Shutdown** handling
7. **Health Check Endpoint** (optional web server)

---

**Multi-server deployment is PRODUCTION-READY!** 🚀

Bot sudah ditest dan optimized untuk handle banyak servers secara bersamaan dengan performance yang baik.
