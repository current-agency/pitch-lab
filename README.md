# PitchLab

A Turborepo monorepo with **Payload CMS** and multiple **Next.js** front-end applications. All front-end apps use **Tailwind CSS** and **ShadCN-style UI** (shared `@repo/ui` package).

## Current state

- **Site (dashboard):** Landing, login/signup, and user dashboard. Login uses Payload’s `/api/users/login`; JWT is stored in an httpOnly cookie. Dashboard shows activity cards that link to the survey, image-choice, and content-rank apps.
- **Survey (Platform Fit Quiz):** Loads questions from the CMS, records responses, and can show a “Back to PitchLab dashboard” link when `NEXT_PUBLIC_DASHBOARD_URL` is set.
- **Image choice:** Time-based selection between two images; optional “Back to PitchLab dashboard” link via `NEXT_PUBLIC_DASHBOARD_URL`.
- **Content rank:** ScreamingFrog + GA4 page ranking (move/lost/reuse); linked from the dashboard with optional token.
- **CMS:** Payload admin, users, companies, platform survey questions/responses, image-choice assessments, content-rank instances. MongoDB backend.

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
   # CMS_URL (required). Optionally: NEXT_PUBLIC_IMAGE_CHOICE_URL, NEXT_PUBLIC_CONTENT_RANK_URL, NEXT_PUBLIC_SURVEY_URL
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
| **site**        | 3000 | Marketing landing, login/signup, user dashboard (links to survey, image-choice, content-rank). |
| **image-choice** | 3002 | User selects between two images; time and choice can be stored. |
| **content-rank** | 3003 | ScreamingFrog + GA4 page ranking: move, lost, reuse. |
| **audience-poker** | 3007 | Chip-allocation activity; assigned from dashboard; optional “Back to PitchLab dashboard” link. |
| **stakeholder-map** | 3008 | Stakeholder map by influence/interest; linked from dashboard with company + token. |
| **slider**      | 3004 | Slider between two ideas; position recorded. |
| **survey**      | 3005 | Platform Fit Quiz: questions from CMS, responses stored; optional “Back to PitchLab dashboard” link. |
| **fill-blank**  | 3006 | Fill-in-the-blank text boxes; answers can be stored. |

## Environment variables

Each app may have its own `.env`; copy from the app’s `.env.example` and set values as needed. For production (e.g. Vercel), set these in the project’s environment variables, not in `.env` (which is for local development).

| App | Variable | Required | Description |
|-----|----------|----------|-------------|
| **cms** | `PAYLOAD_SECRET` | Yes (prod) | Payload auth secret; must not be default in production. |
| **cms** | `DATABASE_URI` / `MONGODB_URI` | Yes | MongoDB connection string. |
| **cms** | `AUDIENCE_POKER_API_SECRET` | Optional | If set, Audience Poker submissions API accepts `x-audience-poker-secret` for server-to-server calls. |
| **cms** | `STAKEHOLDER_MAP_API_SECRET` | Optional | If set, Stakeholders and Stakeholder Map submissions accept `x-stakeholder-map-secret` for server-to-server calls. |
| **site** | `CMS_URL` | Yes | Base URL of the CMS (e.g. `http://localhost:3001`). No trailing slash. |
| **site** | `NEXT_PUBLIC_DASHBOARD_URL` | Optional | Public URL of this site (for links back from other apps). |
| **site** | `NEXT_PUBLIC_IMAGE_CHOICE_URL` | Optional | URL of the image-choice app (defaults to localhost:3002). |
| **site** | `NEXT_PUBLIC_CONTENT_RANK_URL` | Optional | URL of the content-rank app. |
| **site** | `NEXT_PUBLIC_SURVEY_URL` | Optional | URL of the survey app. |
| **site** | `NEXT_PUBLIC_AUDIENCE_POKER_URL` | Optional | URL of the audience-poker app. |
| **site** | `NEXT_PUBLIC_STAKEHOLDER_MAP_URL` | Optional | URL of the stakeholder-map app (defaults to localhost:3008). |
| **site** | `IMAGE_CHOICE_TOKEN_SECRET` | Optional | Shared secret with image-choice for JWT links; required for dashboard image-choice links. |
| **site** | `AUDIENCE_POKER_TOKEN_SECRET` | Optional | Shared secret with audience-poker for JWT links; required for dashboard audience-poker links. |
| **site** | `STAKEHOLDER_MAP_TOKEN_SECRET` | Optional | Shared secret with stakeholder-map for token in dashboard link. |
| **survey** | `CMS_URL` | Yes | Base URL of the CMS. |
| **survey** | `NEXT_PUBLIC_DASHBOARD_URL` | Optional | “Back to PitchLab dashboard” link when set. |
| **image-choice** | `CMS_URL` | Yes | Base URL of the CMS. |
| **image-choice** | `IMAGE_CHOICE_TOKEN_SECRET` | Yes (dashboard links) | Must match site; used to verify JWT from dashboard. |
| **image-choice** | `NEXT_PUBLIC_DASHBOARD_URL` | Optional | Back-to-dashboard link. |
| **audience-poker** | `CMS_URL` | Yes | Base URL of the CMS. |
| **audience-poker** | `AUDIENCE_POKER_TOKEN_SECRET` | Yes (dashboard links) | Must match site; used to verify JWT from dashboard. |
| **audience-poker** | `NEXT_PUBLIC_DASHBOARD_URL` | Optional | Back-to-dashboard link. |
| **stakeholder-map** | `CMS_URL` | Yes | Base URL of the CMS. |
| **stakeholder-map** | `STAKEHOLDER_MAP_TOKEN_SECRET` | Yes (dashboard links) | Must match site; used to verify token from dashboard. |
| **stakeholder-map** | `STAKEHOLDER_MAP_API_SECRET` | Optional | If set, app sends it when calling CMS; set same in CMS for server-to-server. |
| **stakeholder-map** | `NEXT_PUBLIC_DASHBOARD_URL` | Optional | Back-to-dashboard link. |
| **content-rank** | `CMS_URL` | Yes | Base URL of the CMS. |

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
