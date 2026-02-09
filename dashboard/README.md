# Syntak Bot Dashboard

Web dashboard for managing Syntak Discord Bot configurations.

## Features

- **Discord OAuth2 Authentication** - Login with Discord
- **Server Management** - View and select servers
- **Configuration Panel** - Manage bot settings per server
- **Beautiful UI** - Modern gradient design with Tailwind CSS

## Setup

### 1. Environment Variables

Copy `.env.local` and fill in your values:

```bash
# Discord Application (from Discord Developer Portal)
DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run `openssl rand -base64 32` to generate

# Database (same as bot)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=syntak_bot
DB_PORT=3306
```

### 2. Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** section
4. Add redirect URL: `http://localhost:3000/api/auth/callback`
5. For production, add: `https://yourdomain.com/api/auth/callback`

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Deployment (Ubuntu Server)

### 1. Build the application

```bash
npm run build
```

### 2. Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 3. Start the application

```bash
pm2 start npm --name "syntak-dashboard" -- start
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### 4. Setup Nginx (Reverse Proxy)

Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

Create Nginx config (`/etc/nginx/sites-available/syntak-dashboard`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/syntak-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Project Structure

```
dashboard/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Discord OAuth
│   │   └── guilds/               # Guild APIs
│   ├── dashboard/                # Server selector
│   ├── server/[id]/              # Server config
│   └── page.tsx                  # Landing page
├── components/
│   └── SessionProvider.tsx
├── lib/
│   ├── auth.ts                   # NextAuth config
│   └── db.ts                     # Database connection
└── types/
    └── next-auth.d.ts            # TypeScript declarations
```

## API Endpoints

- `GET /api/guilds` - List user's manageable guilds
- `GET /api/guilds/[id]` - Get guild configuration
- `PUT /api/guilds/[id]` - Update guild configuration

## Tech Stack

- **Framework**: Next.js 15 (React)
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS
- **Database**: MySQL (shared with bot)
- **Language**: TypeScript
