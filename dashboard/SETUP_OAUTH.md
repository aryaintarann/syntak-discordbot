# ⚠️ SETUP REQUIRED BEFORE FIRST USE

Silakan ikuti langkah-langkah berikut untuk setup Discord OAuth:

## 1. Buka Discord Developer Portal

https://discord.com/developers/applications

## 2. Pilih Aplikasi Bot Kamu (Syntak)

Click pada aplikasi yang sudah kamu buat untuk bot

## 3. Get OAuth2 Credentials

- Buka tab **OAuth2** → **General**
- Copy **CLIENT ID**
- Click **Reset Secret** → Copy **CLIENT SECRET** (save ini baik-baik!)

## 4. Add Redirect URL

Masih di tab OAuth2:
- Scroll ke **Redirects**
- Click **Add Redirect**
- Paste: `http://localhost:3000/api/auth/callback`
- Click **Save Changes**

## 5. Update .env.local

Edit file `dashboard/.env.local` dan ganti:

```env
DISCORD_CLIENT_ID=paste_client_id_dari_discord
DISCORD_CLIENT_SECRET=paste_client_secret_dari_discord
```

JANGAN share client secret ke siapapun!

## 6. Update Database Credentials (jika perlu)

```env
DB_PASSWORD=actual_mysql_password_kamu
```

## 7. Restart Dashboard

```bash
# Stop server (Ctrl+C)
npm run dev
```

## 8. Test!

Buka http://localhost:3000 dan click "Login with Discord"

---

Jika masih error, cek console untuk error messages yang lebih detail.
