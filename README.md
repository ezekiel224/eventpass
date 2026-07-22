# EventPass

A modern event pass management platform for creating events, registering attendees, emailing QR-code passes, and checking attendees in from a polished admin dashboard.

## Local Development

```bash
cp .env.example .env
npm install
npm run prisma:setup
npm run dev
```

Open `http://localhost:3000`.

`prisma:setup` applies the local SQLite schema and runs the idempotent seed. Run it again whenever you create a fresh database.

Seeded local admin credentials default to `admin@example.com` / `ChangeMe123!`. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `AUTH_SECRET` in `.env` before deploying.

For mobile testing over Tailscale, this project trusts `100.88.101.67` in `next.config.ts` for Next.js dev-server requests. Camera access on phones usually still requires a secure context, so use HTTPS through Tailscale Serve/Funnel or another trusted local HTTPS URL if the browser blocks camera permissions over plain HTTP.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The initial Docker setup uses a persistent SQLite database volume at `/app/data/eventpass.db`. On container startup it runs `prisma db push` and seeds the admin account/event data unless `SKIP_SEED=true` is set.

Check the container health endpoint:

```bash
curl http://127.0.0.1:3000/api/health
```

For Cloudflare Tunnel testing, either point an existing tunnel at `http://localhost:3000`, or set `CLOUDFLARE_TUNNEL_TOKEN` in `.env` and run:

```bash
docker compose --profile tunnel up --build
```

Set `APP_URL` to your Cloudflare hostname before testing pass email links, for example `https://events.example.com`.

PostgreSQL is a later migration step. The current Prisma schema is SQLite, so do not switch `DATABASE_URL` to a PostgreSQL URL until the schema provider and migrations are updated together.

## Email Setup

The app supports a free Resend setup for owned domains.

1. Create a free Resend account.
2. Add your domain in Resend.
3. Add the DNS records Resend gives you, usually SPF/DKIM and a DMARC recommendation.
4. Wait for domain verification.
5. Create an API key.
6. Update `.env`:

```bash
EMAIL_PROVIDER="resend"
EMAIL_FROM="EventPass <passes@yourdomain.com>"
RESEND_API_KEY="re_..."
APP_URL="https://your-app-domain.com"
```

For local testing, keep `EMAIL_PROVIDER="console"` and the app will log email attempts without sending.

You can test delivery with:

```bash
curl -X POST http://127.0.0.1:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"you@yourdomain.com"}'
```

## Included

- Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Lucide icons
- Landing page, auth screens, admin dashboard, event and attendee management
- QR pass generation and validation API shape
- Scanner UI with duplicate check-in handling flow
- Prisma schema for users, roles, events, attendees, passes, check-ins, email logs, settings
- Dockerfile, Docker Compose, health endpoint, environment examples
