# Syntak Discord Bot - Moderation & Security System

Discord bot dengan sistem moderasi dan keamanan lengkap yang mencakup auto-moderation, commands moderasi, audit logging, dan anti-raid protection.

## 🌟 Features

### Auto-Moderation
- ✅ **Bad Words Filter** - Deteksi dan hapus kata-kata kasar (Indonesia & English)
- ✅ **Link Spam Filter** - Batasi jumlah link dalam pesan
- ✅ **Mass Mention Filter** - Cegah mention spam
- ✅ **Invite Link Filter** - Block invite links dari server lain
- ✅ **Spam Detection** - Deteksi rapid messages
- ✅ **Auto-Warning** - Otomatis kasih warning untuk violations
- ✅ **Auto-Action** - Timeout/kick otomatis setelah threshold warnings

### Moderation Commands
- `/kick` - Kick member dari server
- `/ban` - Ban member permanent (dengan opsi delete messages)
- `/softban` - Ban lalu unban untuk clear messages
- `/timeout` - Mute member sementara (support duration: 1h, 30m, 7d, dll)
- `/warn` - Berikan warning ke member
- `/warnings` - Lihat daftar warnings member
- `/clearwarns` - Hapus semua warnings member

### Anti-Raid System
- ✅ **Join Tracking** - Track member joins dalam time window
- ✅ **Raid Detection** - Deteksi pola raid (banjir user baru)
- ✅ **Auto-Lockdown** - Lockdown otomatis saat raid terdeteksi
- ✅ **Manual Lockdown** - `/lockdown` dan `/unlockdown` commands
- ✅ **Severity Levels** - LOW, MEDIUM, HIGH, CRITICAL
- ✅ **Alert Notifications** - Notifikasi ke admins saat raid

### Mod Logs (Audit Trail)
- ✅ **Message Delete Logs** - Track pesan yang dihapus
- ✅ **Message Edit Logs** - Track pesan yang diedit (old vs new)
- ✅ **Moderation Action Logs** - Semua kick/ban/warn/timeout tercatat
- ✅ **Auto-Mod Logs** - Violations dari auto-moderation
- ✅ **Rich Embeds** - Logs dengan format yang informatif dan warna-warni

## 🌍 Multi-Server Support

Bot ini **FULLY SUPPORT multi-server deployment**! 

✅ **One Bot, Multiple Servers**
- Satu bot instance dapat melayani unlimited servers
- Setiap server punya konfigurasi sendiri (independent)
- Satu database MySQL untuk semua servers
- Data antar server completely separated (by guild_id)

✅ **Per-Server Configuration**
- Each server dapat enable/disable auto-mod
- Each server dapat set mod log channel sendiri
- Each server punya warning thresholds sendiri
- Each server punya raid protection settings sendiri

✅ **Shared Resources**
- Commands available di semua servers
- Database connection di-share efficiently
- Centralized monitoring & management

## 📋 Prerequisites

- Node.js 16.x atau lebih tinggi
- MySQL Database (ONE database untuk ALL servers)
- Discord Bot Token (dari Discord Developer Portal)

## 🚀 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd syntak-discordbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
Buat database MySQL baru:
```sql
CREATE DATABASE syntak_discord_bot;
```

### 4. Configure Environment
Copy `.env.example` ke `.env` dan isi dengan konfigurasi Anda:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here  # Optional: untuk testing di 1 server

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=syntak_discord_bot

# Moderation Settings
MOD_LOG_CHANNEL_ID=your_mod_log_channel_id

# Anti-Raid Settings (Optional)
RAID_THRESHOLD=10
RAID_TIME_WINDOW=10000
```

### 5. Deploy Commands
```bash
npm run deploy
```

### 6. Start the Bot
```bash
npm start
```

Untuk development dengan auto-reload:
```bash
npm run dev
```

## 🔧 Configuration

### Bot Permissions
Bot memerlukan permissions berikut:
- Kick Members
- Ban Members
- Moderate Members (Timeout)
- Manage Messages
- Manage Channels
- View Audit Log
- Send Messages
- Embed Links

### Setup Mod Log Channel
1. Buat channel khusus untuk mod logs (contoh: `#mod-logs`)
2. Copy channel ID
3. Masukkan ke `.env` sebagai `MOD_LOG_CHANNEL_ID`
4. Atau gunakan command (coming soon) untuk set via bot

### Customize Auto-Mod
Edit `src/config/automod.js` untuk:
- Tambah/hapus bad words
- Ubah threshold untuk links, mentions
- Enable/disable specific filters
- Atur exempt roles

### Customize Anti-Raid
Edit `src/config/antiraid.js` untuk:
- Ubah raid threshold (jumlah joins)
- Ubah time window
- Konfigurasi lockdown behavior
- Set exempt channels

## 🌐 Multi-Server Management

### Database Structure
Bot menggunakan **satu database MySQL** untuk semua servers dengan schema:
- `guild_id` column di setiap table untuk separate data
- Auto-create config untuk server baru
- Independent settings per server

### Adding Bot to New Server
1. Generate invite link dengan permissions
2. Invite bot ke server
3. Bot auto-create guild_config di database
4. Admin run `/setmodlog` untuk set log channel
5. (Optional) Customize dengan `/config` commands

### Monitoring Multiple Servers
```sql
-- Check total servers
SELECT COUNT(DISTINCT guild_id) FROM guild_config;

-- Check config untuk specific server
SELECT * FROM guild_config WHERE guild_id = 'SERVER_ID';

-- Check total warnings across all servers
SELECT COUNT(*) FROM warnings;

-- Check mod actions per server
SELECT guild_id, COUNT(*) as action_count 
FROM mod_logs 
GROUP BY guild_id;
```

### Scalability
- ✅ Bot tested dengan multiple servers simultaneously
- ✅ Database connection pooling (max 10 concurrent)
- ✅ Efficient query dengan proper indexing
- ✅ Async operations untuk tidak block lainnya

### Resource Usage
Per server average:
- **Memory**: ~5-10 MB
- **Database**: Negligible (indexed queries)
- **Network**: Minimal (only when events occur)

Total bot dapat handle **hundreds of servers** dengan:
- 2 GB RAM
- MySQL dengan proper configuration
- Stable hosting (VPS/Cloud)

## 📖 Command Usage

### Kick
```
/kick target:@user reason:"Spamming in chat"
```

### Ban
```
/ban target:@user reason:"Breaking rules" delete_days:7
```

### Timeout
```
/timeout target:@user duration:10m reason:"Being disruptive"
/timeout target:@user duration:1h reason:"Spam"
/timeout target:@user duration:1d reason:"Serious violation"
```

### Warn
```
/warn target:@user reason:"Using inappropriate language"
```

### Lockdown
```
/lockdown                          # Lock seluruh server
/lockdown channel:#general         # Lock channel tertentu
```

## 🗂️ Project Structure

```
syntak-discordbot/
├── index.js                  # Main entry point
├── package.json
├── .env.example
├── src/
│   ├── commands/
│   │   └── moderation/       # Moderation commands
│   ├── events/               # Discord event handlers
│   ├── handlers/             # Command & event loaders
│   ├── database/
│   │   ├── database.js       # MySQL connection & init
│   │   └── models/           # Database models
│   ├── automod/
│   │   ├── filters.js        # Auto-mod filters
│   │   └── enforcer.js       # Violation enforcement
│   ├── antiraid/
│   │   ├── detector.js       # Raid detection
│   │   └── lockdown.js       # Lockdown system
│   ├── config/               # Configuration files
│   └── utils/                # Utility functions
```

## 🛡️ Security

- Semua mod actions dicatat ke database
- Role hierarchy check untuk prevent abuse
- Permission validation untuk setiap command
- Exempt roles untuk auto-moderation
- Auto-action threshold untuk warnings

## 🐛 Troubleshooting

### Bot tidak online
- Pastikan `DISCORD_TOKEN` di `.env` benar
- Check internet connection
- Lihat console untuk error messages

### Commands tidak muncul
- Jalankan `npm run deploy` untuk register commands
- Pastikan `CLIENT_ID` dan `GUILD_ID` (optional) benar
- Wait beberapa menit (global commands bisa delay)

### Database connection failed
- Pastikan MySQL server running
- Check database credentials di `.env`
- Pastikan database sudah dibuat

### Auto-mod tidak bekerja
- Pastikan bot memiliki permission "Manage Messages"
- Check `auto_mod_enabled` di database `guild_config` table
- Pastikan user yang ditest bukan moderator/admin

## 📝 License

ISC

## 👥 Support

Jika ada pertanyaan atau issues, silakan buat issue di repository ini.

---

**Made with ❤️ for Discord server moderation**
