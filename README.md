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

Before merging or deploying structural changes, run `npm run verify` and complete the focused workflow checklist in `SMOKE_TESTS.md`.

`prisma:setup` applies the local SQLite schema, prepares system roles and permissions, and loads the idempotent demo event data. Run it again whenever you create a fresh local database.

Open `/login` after the first start. When the database has no accounts, EventPass redirects to the one-time `/signup` page so you can choose the initial administrator email, username, and password. No administrator credentials are stored in environment variables or source code.

For mobile testing over Tailscale, this project trusts `100.88.101.67` in `next.config.ts` for Next.js dev-server requests. Camera access on phones usually still requires a secure context, so use HTTPS through Tailscale Serve/Funnel or another trusted local HTTPS URL if the browser blocks camera permissions over plain HTTP.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The Docker deployment uses a persistent SQLite database volume at `/app/data/eventpass.db`. On every container start it applies the schema and idempotently prepares the system roles and permissions. It does not create an account or load demo event data.

Open the deployed `/login` URL after the first start. You will be redirected to the one-time `/signup` page to create the initial administrator. The setup endpoint uses an atomic installation record, so only one initial administrator can be created; after that, `/signup` redirects to `/login`.

The Compose file binds port 3000 to localhost by default. On a remote server, complete first-run setup through an SSH tunnel before enabling a public reverse proxy or Cloudflare Tunnel:

```bash
ssh -L 3000:127.0.0.1:3000 your-user@your-server
```

Then open `http://127.0.0.1:3000/login` locally and create the administrator.

Existing Docker volumes keep their current accounts. The RBAC bootstrap automatically attaches a pre-RBAC `ADMIN` account to the full-access Admin role.

Check the container health endpoint:

```bash
curl http://127.0.0.1:3000/api/health
```

For Cloudflare Tunnel testing, either point an existing tunnel at `http://localhost:3000`, or set `CLOUDFLARE_TUNNEL_TOKEN` in `.env` and run:

```bash
docker compose --profile tunnel up --build
```

Set `APP_URL` to your Cloudflare hostname before testing pass email links, for example `https://events.example.com`.

Before exposing a production container, replace the placeholder `AUTH_SECRET` and `QR_SIGNING_SECRET` values in `.env` with independent long random values. Production still requires HTTPS at the reverse proxy or Cloudflare Tunnel.

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
- Auth screens, permission-aware admin dashboard, event and attendee management
- QR pass generation and validation API shape
- Scanner UI with duplicate check-in handling flow
- Raffle operations, secure winner acknowledgment, and legal-template Excel prize receipts
- Prisma schema for users, roles, events, attendees, passes, check-ins, email logs, settings
- Dockerfile, Docker Compose, health endpoint, environment examples
