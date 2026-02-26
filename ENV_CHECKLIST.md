# Environment variables checklist

Copy each app's `.env.example` to `.env` and set values. Use this list to ensure shared secrets match.

## Same value in multiple apps

| Variable | Set in these apps (same value everywhere) |
|----------|------------------------------------------|
| **ACTIVITY_LINK_SECRET** | site, cms (site uses it to proxy survey questions/config to CMS; not needed for in-site image-choice, audience-poker, stakeholder-map, or survey responses) |
| **MIGRATION_SESSION_API_SECRET** | cms, content-rank |

## Required per app

| App | Required |
|-----|----------|
| **cms** | PAYLOAD_SECRET, DATABASE_URI (or MONGODB_URI) |
| **site** | CMS_URL |

**Image-choice, audience-poker, stakeholder-map, survey, and content-rank** run inside the site as dashboard routes (`/dashboard/apps/image-choice`, `/dashboard/apps/audience-poker/activity/[id]`, `/dashboard/apps/stakeholder-map`, `/dashboard/apps/survey`, `/dashboard/apps/content-rank`). They use session (cookie) auth. The site needs **ACTIVITY_LINK_SECRET** only to proxy survey questions and config to the CMS; survey responses and content-rank use the user’s JWT. The standalone `apps/image-choice`, `apps/audience-poker`, `apps/stakeholder-map`, `apps/survey`, and `apps/content-rank` are kept for reference or external use and need CMS_URL (and optionally ACTIVITY_LINK_SECRET) if you run them.

## Quick check

1. Generate one secret: `openssl rand -base64 32`
2. Set **ACTIVITY_LINK_SECRET** in site and cms (same value).
3. Ensure **CMS_URL** is set in the site (and in any standalone app you run).

## Production (e.g. Vercel)

For the **site**: set **CMS_URL** to your production CMS URL. Image-choice, audience-poker, stakeholder-map, survey, and content-rank run inside the site and use the site’s cookie auth to call the CMS.

In **production CMS**: ensure **ACTIVITY_LINK_SECRET** matches the site so the in-site survey can load questions and config. Survey responses and content-rank use the user’s JWT cookie.

If **Stakeholder Map** (in-site) shows “No stakeholders”: the activity in the production CMS may have an empty stakeholders list. Edit that activity in the production Payload admin and add stakeholders there; local CMS data is separate from production.
