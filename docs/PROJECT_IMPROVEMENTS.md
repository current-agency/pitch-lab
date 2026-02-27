# Project Improvements (Pre–UI Refinements)

Recommendations for code cleanup, security hardening, and consistency before diving into UI work.

**Status: All items below have been implemented.**

---

## Security

### 1. **Survey response company should be server-derived only** ✅

**Location:** `apps/site/app/api/apps/survey/responses/route.ts`

**Issue:** The route uses `body.company ?? user.company` for the response’s company. A client can send `company: "other-company-id"` and attribute the response to another company.

**Recommendation:** Ignore `body.company` and always set `company` from the authenticated user’s company (from `/api/users/me`). Only the server should decide which company a response belongs to.

---

### 2. **Require ACTIVITY_LINK_SECRET in production (CMS)** ✅

**Location:** `apps/cms` – survey/grouped, survey/config, and any endpoint that checks `x-activity-app-secret`

**Issue:** When `ACTIVITY_LINK_SECRET` is unset, those endpoints allow unauthenticated access (no header check). Fine for local dev; in production the site proxies with the secret, but direct hits to the CMS would not be protected.

**Recommendation:** In production, require `ACTIVITY_LINK_SECRET` and reject requests that don’t send the correct header (or document that CMS is not exposed publicly and the secret is only for site→CMS).

---

### 3. **Activity assignment enforcement (optional)** ✅

**Location:** CMS create access for submissions (Audience Poker, Stakeholder Map, Image Choice responses)

**Issue:** Create access is “any authenticated user.” A user could submit to an activity they’re not assigned to if they know the activity ID (e.g. from the dashboard link).

**Recommendation:** Either:
- Keep as-is and rely on the dashboard only showing assigned activities, or
- Add server-side checks: in the site API routes that proxy to CMS, verify the activity ID is in the user’s `assignedApplications` (and for content-rank, that the instance is in the same list) before calling the CMS. That way only assigned activities can receive submissions from the site.

---

## Code cleanup

### 4. **Centralize CMS URL and proxy helpers (site)** ✅

**Location:** `apps/site` – many API routes and pages

**Issue:** `process.env.CMS_URL || 'http://localhost:3001'` and `CMS_URL.replace(/\/$/, '')` are repeated in 15+ files. `getCmsUrl()` exists in both `lib/login-helpers.ts` and `packages/env`; only the login/change-password flow uses `@repo/env`’s `getCmsUrl`.

**Recommendation:**
- Use `getCmsUrl()` from `@repo/env` (or a single `lib/cms.ts`) everywhere the site needs the CMS base URL.
- Optionally add a small helper that returns `{ baseUrl, authHeaders }` for a given token so API routes don’t repeat the same fetch setup.

---

### 5. **Unnecessary `await` on requireAuth** ✅

**Location:**  
`apps/site/app/dashboard/apps/content-rank/page.tsx`  
`apps/site/app/dashboard/apps/survey/page.tsx`

**Issue:** `await requireAuth(await cookies())` – `requireAuth` is synchronous and returns `{ token }`. The outer `await` has no effect.

**Recommendation:** Use `requireAuth(await cookies())` (no `await` on `requireAuth`). Same behavior, clearer intent.

---

### 6. **Single source of truth for getCmsUrl** ✅

**Location:** `packages/env/src/index.ts` and `apps/site/lib/login-helpers.ts`

**Issue:** `getCmsUrl()` is implemented in both places. The site’s login flow uses `@repo/env` in change-password but `lib/login-helpers` in login.

**Recommendation:** Use `@repo/env`’s `getCmsUrl` in the site everywhere (login-helpers can re-export it or the login route can import from `@repo/env`). Remove the duplicate from `login-helpers.ts` if nothing else needs that file’s other exports (e.g. `getErrorMessage`, `isLocalhost`).

---

## Consistency and maintainability

### 7. **Error response shape** ✅

**Location:** Site API routes

**Issue:** Some routes return `{ error: string }`, others add `details` or different keys. Client code may assume a single shape.

**Recommendation:** Standardize on something like `{ error: string; details?: string }` for API errors and use it in proxy routes so the frontend can handle errors consistently.

---

### 8. **Logging** ✅

**Location:** Various `console.error` calls in site API routes

**Issue:** Ad-hoc prefixes like `[survey/responses]`, `[content-rank/instance]`. `packages/env` has `createLogger(prefix)` but it’s not used in the site.

**Recommendation:** Use `createLogger` from `@repo/env` in API routes so log format is consistent and you can later swap to a log service.

---

## Optional / later

- **Rate limiting:** Login and change-password are rate-limited. Other sensitive endpoints (e.g. survey submit, password reset if added) could be rate-limited too.
- **Validation:** Validate MongoDB ObjectId format for `id` params before calling the CMS to avoid unnecessary requests and keep errors consistent (optional).
- **Tests:** Only `login-helpers.test.ts` exists; adding tests for auth and critical API routes would help before UI churn.

---

## Summary table

| Priority   | Area      | Action | Status |
|-----------|-----------|--------|--------|
| High      | Security  | Survey response: derive company from user only (1) | Done |
| Medium    | Security  | Require ACTIVITY_LINK_SECRET in prod (2) | Done |
| Low       | Security  | Enforce activity assignment on submit (3) | Done |
| Medium    | Cleanup   | Centralize CMS URL (4) | Done |
| Low       | Cleanup   | Remove redundant await on requireAuth (5) | Done |
| Low       | Cleanup   | Single getCmsUrl source; login-helpers re-export (6) | Done |
| Low       | Consistency | Standardize API error shape (7), use createLogger (8) | Done |

**Implementation summary:** Survey responses now derive company from the authenticated user only. CMS survey endpoints return 503 in production when `ACTIVITY_LINK_SECRET` is unset. Site submit routes (audience-poker, stakeholder-map, image-choice) verify the activity/assessment is in the user’s `assignedApplications` before proxying to the CMS. All site code uses `getCmsUrl()` from `@repo/env`; `login-helpers` re-exports it. API routes use `apiError`/`apiUnauthorized` from `@/lib/api-response` and `createLogger` from `@repo/env`. Redundant `await` on `requireAuth` was removed from content-rank and survey dashboard pages.
