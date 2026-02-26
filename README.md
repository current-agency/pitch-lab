# PitchLab

A Turborepo monorepo with **Payload CMS** and multiple **Next.js** front-end applications. All front-end apps use **Tailwind CSS** and **ShadCN-style UI** (shared `@repo/ui` package).

## Current state

- **Site (dashboard):** Landing, login/signup, and user dashboard. Login uses Payload’s `/api/users/login`; JWT is stored in an httpOnly cookie. Dashboard shows activity cards. **Image-choice, audience-poker, stakeholder-map, survey, and content-rank** run as in-dashboard routes (`/dashboard/apps/...`); users stay on the site and use session (cookie) auth.
- **Image choice (in-site):** Time-based selection between two images; served at `/dashboard/apps/image-choice`. Standalone `apps/image-choice` is kept for reference.
- **Audience poker (in-site):** Chip-allocation activity at `/dashboard/apps/audience-poker/activity/[id]`. Standalone `apps/audience-poker` is kept for reference.
- **Stakeholder map (in-site):** Influence/interest map at `/dashboard/apps/stakeholder-map`. Standalone `apps/stakeholder-map` is kept for reference.
- **Survey (in-site):** Platform Fit Quiz at `/dashboard/apps/survey`; questions from CMS, responses stored with user’s company. Standalone `apps/survey` is kept for reference.
- **Content rank (in-site):** ScreamingFrog + GA4 page ranking at `/dashboard/apps/content-rank`; instance and result loaded with cookie JWT. Standalone `apps/content-rank` is kept for reference (includes migration/review flow).
- **CMS:** Payload admin, users, companies, platform survey questions/responses, image-choice assessments, audience-poker and stakeholder-map activities/submissions, content-rank. MongoDB backend.

## Structure

```
pitch-lab/
├── apps/
│   ├── cms/              # Payload CMS (Next.js + Payload, port 3001)
│   ├── site/             # Marketing landing, login, dashboard (port 3000)
│   ├── image-choice/     # Time-based image selection (port 3002)
│   ├── content-rank/     # ScreamingFrog + GA4 page ranking (port 3003)
│   ├── audience-poker/   # Chip-allocation activity (port 3007)
│   ├── stakeholder-map/  # Stakeholder map by influence/interest (port 3008)
│   ├── slider/           # Slider between two ideas (port 3004)
│   ├── survey/           # Platform Fit Quiz (port 3005)
│   └── fill-blank/       # Fill-in-the-blank (port 3006)
├── packages/
│   ├── ui/               # Shared ShadCN-style components (Button, Card, cn)
│   ├── typescript-config/
│   └── eslint-config/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Requirements

- **Node.js** 20.9+
- **pnpm** 9+
- **MongoDB** (for Payload CMS; default `mongodb://localhost:27017/payload-turbo`)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure CMS**

   Copy the CMS env example and set your secret and database URL:

   ```bash
   cp apps/cms/.env.example apps/cms/.env
   # Edit apps/cms/.env: PAYLOAD_SECRET, DATABASE_URI (or MONGODB_URI)
   ```

3. **Configure site (dashboard)**

   The site needs the CMS URL and optionally the URLs of activity apps so dashboard cards link correctly:

   ```bash
   cp apps/site/.env.example apps/site/.env
   # CMS_URL (required). All activity apps (image-choice, audience-poker, stakeholder-map, survey, content-rank) run in-site.
   ```

4. **Run all apps in development**

   ```bash
   pnpm dev
   ```

   Then open:

   - **Site (landing, login, dashboard):** http://localhost:3000  
   - **Payload Admin:** http://localhost:3001/admin  
   - **Image choice:** http://localhost:3002  
   - **Content rank:** http://localhost:3003  
   - **Slider:** http://localhost:3004  
   - **Survey:** http://localhost:3005  
   - **Fill in the blank:** http://localhost:3006  

## Run a single app

```bash
pnpm --filter @repo/cms dev
pnpm --filter @repo/site dev
pnpm --filter @repo/image-choice dev
# etc.
```

## Build

```bash
pnpm build
```

## Test

Apps with tests (site, survey) can be run via:

```bash
pnpm test
```

Or per app: `pnpm --filter @repo/site test`, `pnpm --filter @repo/survey test`.

## Apps overview

| App             | Port | Purpose |
|-----------------|------|--------|
| **cms**         | 3001 | Payload admin + REST/GraphQL API. Users, companies, platform survey, image-choice assessments, content-rank. |
| **site**        | 3000 | Marketing landing, login/signup, user dashboard. Hosts image-choice, audience-poker, stakeholder-map, survey, and content-rank as dashboard routes. |
| **image-choice** | 3002 | Standalone app (optional). In-site version at `/dashboard/apps/image-choice`. |
| **content-rank** | 3003 | Standalone app (optional). In-site version at `/dashboard/apps/content-rank`; also has migration/review flow. |
| **audience-poker** | 3007 | Standalone app (optional). In-site version at `/dashboard/apps/audience-poker/activity/[id]`. |
| **stakeholder-map** | 3008 | Standalone app (optional). In-site version at `/dashboard/apps/stakeholder-map`. |
| **slider**      | 3004 | Slider between two ideas; position recorded. |
| **survey**      | 3005 | Standalone app (optional). In-site version at `/dashboard/apps/survey`. |
| **fill-blank**  | 3006 | Fill-in-the-blank text boxes; answers can be stored. |

## Environment variables

Each app may have its own `.env`; copy from the app’s `.env.example` and set values as needed. For production (e.g. Vercel), set these in the project’s environment variables, not in `.env` (which is for local development).

| App | Variable | Required | Description |
|-----|----------|----------|-------------|
| **cms** | `PAYLOAD_SECRET` | Yes (prod) | Payload auth secret; must not be default in production. |
| **cms** | `DATABASE_URI` / `MONGODB_URI` | Yes | MongoDB connection string. |
| **cms** | `ACTIVITY_LINK_SECRET` | Optional | Same as site and activity apps; when set, activity apps send it as `x-activity-app-secret` for create/read on responses and submissions. |
| **site** | `CMS_URL` | Yes | Base URL of the CMS (e.g. `http://localhost:3001`). No trailing slash. |
| **site** | `NEXT_PUBLIC_DASHBOARD_URL` | Optional | Public URL of this site (for links back from other apps). |
| **site** | `ACTIVITY_LINK_SECRET` | Optional | Same as CMS; used by the site to proxy survey questions/config to the CMS. In-site survey responses and content-rank use cookie JWT. |
| **survey** (standalone) | `CMS_URL` | If run | Only needed if running the standalone app; in-site flow uses the site’s CMS_URL. |
| **image-choice** (standalone) | `CMS_URL` | If run | Only needed if running the standalone app; in-site flow uses the site’s CMS_URL. |
| **audience-poker** (standalone) | `CMS_URL` | If run | Only needed if running the standalone app; in-site flow uses the site’s CMS_URL. |
| **stakeholder-map** (standalone) | `CMS_URL` | If run | Only needed if running the standalone app; in-site flow uses the site’s CMS_URL. |
| **content-rank** (standalone) | `CMS_URL` | If run | Only needed if running the standalone app; in-site flow uses the site’s CMS_URL. |

See each app’s `.env.example` for a full list and defaults.

## Authentication

- **Payload** provides a **Users** collection with email + password. The **site** login page calls the site’s `/api/auth/login`, which proxies to Payload’s `/api/users/login` and sets an httpOnly cookie (`payload-token` in dev; `__Host-payload-token` in production). Dashboard and dashboard sub-routes require that cookie and redirect to `/login` if missing.
- Logout: `/api/auth/logout` clears the cookie. User info: `/api/auth/me` returns the current user when authenticated.

## Security

- **CMS:** In production, `PAYLOAD_SECRET` must be set to a secure random value; the app throws on startup if it is missing or still the default `change-me-in-production`.
- **Site auth cookie:** httpOnly, `secure` in production, `sameSite: 'lax'`. In production the cookie name uses the `__Host-` prefix so it is host-only and not sent to subdomains.
- **Site headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` are set via Next.js config.
- **Login and change-password:** In-memory rate limiting (10 login attempts per 15 min per IP; 5 change-password attempts per 15 min per IP). In serverless deployments limits are per-instance; for strict cross-instance limits use Redis (e.g. Upstash) or Vercel Rate Limit.
- **Audience-poker submit:** Submissions require a valid JWT from the dashboard link; `userId` is derived server-side from the token only (no client-sent userId accepted).
- **Content-rank links:** The dashboard builds links that include an `accessToken` in the query string. Those URLs can leak via Referer or browser history; avoid sharing them. Prefer short-lived tokens or POST-based access if you need stricter control.

## Next steps

- Activity completion tracking and company progress (see `docs/feature-user-dashboard.md`).
- Support: FAQs from CMS, bug tickets (login required).
- Persist results in image-choice, slider, and fill-blank (POST to Payload or API).
- Add tests and optional env validation at app startup.
