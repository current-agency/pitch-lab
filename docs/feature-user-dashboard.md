# Feature Plan: User Dashboard (Activities, Progress, Support)

## Overview

End-user dashboard with:
- **Summary view**: “To do” and “Completed” activity cards + company-wide progress meter
- **Task view**: One card per assigned activity; click opens the activity app
- **Support**: FAQs + bug ticket submission

This plan builds on the existing **site** app dashboard, **Payload CMS** (users, companies, assigned applications), and current activity apps (Image Choice, Content Rank).

---

## 1. Data model (Payload CMS)

### 1.1 Activity completion tracking (new)

Today, assignments exist (user → image-choice-assessments; company → content-rank) but **completion is not stored**. We need a single place to record “user X completed activity Y.”

**Option A – Polymorphic “activity completions” (recommended)**  
One collection that can reference any activity type:

| Field | Type | Notes |
|-------|------|--------|
| `user` | relationship → users | required |
| `activityType` | select: `image-choice` \| `content-rank` \| (future: survey, fill-blank) | required |
| `activityId` | text | ID of the assessment/instance (e.g. image-choice-assessments id or content-rank id) |
| `completedAt` | date | required, set on first completion |
| (optional) `payload` | json | app-specific data (e.g. pair count, duration) |

- **Access**: Admins full; client-users can only read/create their own (and only create for themselves).
- **Uniqueness**: One completion per (user, activityType, activityId). Use a beforeValidate/beforeChange hook or unique index to prevent duplicates; idempotent “complete” API.

**Option B – Per-app collections**  
E.g. `image-choice-completions`, `content-rank-completions`. Simpler per app but harder to query “all completions for this user/company” and to add new activity types.

**Recommendation**: Option A so the dashboard can query “all completions for user” and “all completions for company” in one place.

### 1.2 Company progress (derived)

- **No new collection.** Progress = computed at read time:
  - **Denominator**: **All unique activities that anyone in the company is assigned to.** That is: union of (1) all image-choice assessments assigned to any user in that company, and (2) all content-rank instances for that company. Each (activityType, activityId) counts once.
  - **Numerator**: Distinct (activityType, activityId) pairs that have at least one completion by any user in the company.
- **API**: Site app calls CMS (or a small API in site that calls CMS) with JWT; CMS returns:
  - For the current user: list of assigned activities + which are completed (from activity-completions).
  - For the company: total unique company activities (denominator) and how many have ≥1 completion (numerator).

### 1.3 Support (new)

- **FAQs – CMS managed**
  - Payload collection `faqs` with e.g. `question`, `answer` (richText), `order`. Admins manage in CMS; site fetches via API (e.g. `GET /api/faqs?sort=order`) and renders on the support page.

- **Bug tickets – login required**
  - Payload collection `support-tickets` (or `bug-reports`):
    - `user` (relationship → users, **required** – no anonymous tickets).
    - `subject`, `description`, `status` (e.g. open/in progress/closed),
    - `createdAt`, `updatedAt`.
  - Access: Admins full; client-users create (only for themselves) and read only their own. Support section is only available when logged in (dashboard).
  - Optional: email notification to support when a ticket is created (Payload hook or job).

---

## 2. Site app – dashboard structure

### 2.1 Routes

- `dashboard` – default: show **Summary** view (to do / completed cards + company progress).
- `dashboard/tasks` – **Task view**: list of assigned activities as cards; click → open activity app.
- `dashboard/support` – **Support**: FAQs + “Submit a bug” form.

Navigation: persistent dashboard nav (e.g. Summary | Tasks | Support) in layout so users can switch without losing context.

### 2.2 Summary view

- **Copy**
  - “Activities to do” card: count or list of activities the user has not completed (from assignments minus completions).
  - “Activities completed” card: count or list of activities the user has completed (from activity-completions for this user).
- **Progress meter**
  - Label: e.g. “Your company’s progress” or “Company completion.”
  - Value: numerator/denominator as above (company-wide); display as percentage (and optionally “X of Y activities completed”).
- **Data**
  - One server-side load (or API route that calls CMS):
    - Current user’s assignments (existing: assignedApplications + content-rank for company).
    - Current user’s completions (new: activity-completions where user = current).
    - Company progress: total “assignments” for company and count of “completed” (activity-completions for users in same company).

### 2.3 Task view

- **Content**
  - One card per assigned activity (same list as today: Image Choice assessments + Content Rank instances), with:
    - Title, short description, type (e.g. “Image choice” / “Content rank”).
    - Optional: “Completed” badge if this user has a completion for this activity.
  - Clicking a card: open the activity app (same URLs as today: Image Choice URL with `?assessment=...`, Content Rank URL with `?id=...&token=...`). Prefer `window.open` or `target="_blank"` if you want to keep the dashboard tab open; otherwise same-window navigation is fine.
- **Data**
  - Reuse same dashboard data: assignments + completions; no extra API if Summary and Tasks share a layout that fetches once.

### 2.4 Support section

- **FAQs**
  - Fetch from CMS: `GET /api/faqs?sort=order`; render accordion or list on the support page.
- **Bug ticket**
  - Form: subject, description (and optionally category “Bug” vs “Question”). User must be logged in (support is under dashboard). On submit: POST to site API route → site forwards to CMS `support-tickets` with auth; ticket is tied to the current user.
  - Success: “Ticket submitted” message; optional “View my tickets” link to a simple list (read from CMS for current user).

---

## 3. Activity apps – reporting completion

For the dashboard to show “completed” and company progress, each activity app must record completion.

- **Image Choice**  
  Already has a “done” state (all pairs completed). Add: when moving to “done”, call site (or CMS) API to record completion: e.g. `POST /api/activity-complete` with `{ activityType: 'image-choice', activityId: assessmentId }`. Site API validates JWT and forwards to Payload create for activity-completions (idempotent by user+activityType+activityId).

- **Content Rank**  
  Define “completed” (e.g. user viewed results / clicked “Done” / exported). Same pattern: POST to `/api/activity-complete` with `activityType: 'content-rank', activityId: instanceId`.

- **Future (survey, fill-blank)**  
  Same: when “completed” in that app, POST to the same completion API.

Auth: completion API must accept the same JWT the site uses (e.g. cookie or Bearer). If the activity app runs on another origin, use a shared auth (e.g. token in query or postMessage) or proxy the completion through the site (activity app → site → CMS).

---

## 4. API surface (summary)

| Purpose | Where | Notes |
|--------|--------|--------|
| User + assignments + completions | CMS (existing + new) | `/api/users/me?depth=1` extended or separate endpoint that includes “completions” and “companyProgress”. |
| Company progress | CMS or site API | Aggregate by company; can be a custom endpoint in Payload or a server route in site that calls Payload. |
| Record completion | Site API route → Payload | e.g. `POST /api/activity-complete` (validates user, creates activity-completion idempotently). |
| FAQs | CMS `faqs` | GET list for support page (CMS managed). |
| Bug tickets | CMS `support-tickets` | Create (and list own) via site API; login required. |

---

## 5. Implementation order

1. **Payload**
   - Add `activity-completions` collection (Option A above).
   - Add `faqs` and `support-tickets` collections; set access control.
   - (Optional) Custom endpoint or hook for “dashboard payload” (user + assignments + completions + company progress) to avoid multiple round-trips.

2. **Site – dashboard layout and nav**
   - Dashboard layout with tabs/links: Summary | Tasks | Support.
   - Ensure layout loads user + assignments (existing) and add completions + company progress when available.

3. **Site – Summary view**
   - “To do” and “Completed” cards using assignments ± completions.
   - Progress meter using company progress.

4. **Site – Task view**
   - Cards for each assigned activity; click opens app; optional “Completed” badge.

5. **Site – Support**
   - FAQs block (from CMS).
   - Bug form + submit to CMS (login required); optional “My tickets” list.

6. **Activity apps**
   - Image Choice: on “done”, call completion API.
   - Content Rank: define “done” and call completion API.

7. **Polish**
   - Loading/empty states, error handling, accessibility (e.g. progress meter semantics).

---

## 6. Out of scope for this plan

- Admin UI for “assigning” activities (already exists for image-choice; content-rank is company-scoped).
- Notifications (e.g. email when ticket is created).
- Detailed analytics per activity (only completion yes/no and company aggregate).
- Editing or deleting completions (admin-only if ever needed).

---

## 7. Decisions (locked)

- **Company progress denominator**: **All unique activities that anyone in the company is assigned to.** Progress = % of those activities that have been completed by at least one person in the company.
- **FAQs**: **CMS managed** – Payload `faqs` collection; admins edit in CMS; site fetches and renders.
- **Support tickets**: **Login required** – only authenticated users can submit; `user` is required on every ticket; support section lives under the dashboard.

This plan keeps the existing auth and assignment model, adds minimal new collections, and reuses the current dashboard and activity URLs while making completion and company progress explicit and support self-service.
