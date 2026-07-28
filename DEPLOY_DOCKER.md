# Docker Deployment

This project ships with a production Dockerfile and Docker Compose setup. The container runs the Next.js standalone server, stores SQLite data in a Docker volume, applies the Prisma schema at startup, and exposes a health endpoint at `/api/health`.

## 1. Prepare the Server

Install Docker and the Compose plugin on your server, then create a project folder:

```bash
mkdir -p ~/eventpass
cd ~/eventpass
```

Copy the repository into this folder. You can use `git clone`, `scp`, `rsync`, or your deployment workflow of choice.

## 2. Create Production Environment

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Set these values before the first boot:

```bash
DOCKER_DATABASE_URL="file:/app/data/eventpass.db"
APP_URL="https://your-domain.com"
AUTH_SECRET="replace-with-a-long-random-secret"
QR_SIGNING_SECRET="replace-with-a-long-random-secret"
EMAIL_PROVIDER="console"
EMAIL_FROM="EventPass <passes@your-domain.com>"
```

Generate strong secrets with:

```bash
openssl rand -base64 48
```

Administrator credentials are not configured through `.env`. The first account is created through the one-time browser setup after the container starts.

## 3. Build and Start

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f app
```

Check the health endpoint:

```bash
curl http://127.0.0.1:3000/api/health
```

Keep the application private for first-run setup. From your computer, open an SSH tunnel to the server:

```bash
ssh -L 3000:127.0.0.1:3000 your-user@your-server
```

Then open `http://127.0.0.1:3000/login` in your local browser. On a fresh database, `/login` redirects to `/signup`. Enter the initial administrator name, email, username, and password there. The signup route closes permanently as soon as the account is created.

Docker startup applies the schema and prepares system roles and permissions, but it does not create accounts or demo event data. Existing deployments retain their current users and are taken directly to the normal login page.

## 4. Put It Behind HTTPS

Only enable the public HTTPS entry point after the initial administrator exists. The Compose file binds the application to `127.0.0.1:3000` by default; keep that setting when using a same-host reverse proxy or Cloudflare Tunnel.

### Option A: Cloudflare Tunnel

Set this in `.env`:

```bash
CLOUDFLARE_TUNNEL_TOKEN="your-token"
APP_URL="https://your-cloudflare-hostname.com"
```

Start with the tunnel profile:

```bash
docker compose --profile tunnel up -d --build
```

### Option B: Reverse Proxy

Point your proxy to:

```text
http://127.0.0.1:3000
```

Make sure `APP_URL` is the public HTTPS URL, for example:

```bash
APP_URL="https://events.your-domain.com"
```

If you use Nginx, the important proxy headers are:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## 5. Email Sending

For first deployment, keep:

```bash
EMAIL_PROVIDER="console"
```

When ready for real emails, configure Resend:

```bash
EMAIL_PROVIDER="resend"
EMAIL_FROM="EventPass <passes@your-domain.com>"
RESEND_API_KEY="re_..."
APP_URL="https://events.your-domain.com"
```

Restart after changing `.env`:

```bash
docker compose up -d
```

## 6. Updates

Pull or copy the latest code, then rebuild:

```bash
docker compose up -d --build
```

Watch logs:

```bash
docker compose logs -f app
```

## 7. Backups

The SQLite database lives in the `eventpass-data` Docker volume. Back it up before updates:

```bash
docker run --rm \
  -v eventpass_eventpass-data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/eventpass-data-backup.tgz -C /data .
```

If your Compose project folder is not named `eventpass`, check the actual volume name:

```bash
docker volume ls
```

## Useful Commands

```bash
docker compose ps
docker compose logs -f app
docker compose restart app
docker compose down
docker compose up -d --build
docker compose exec app sh
```
