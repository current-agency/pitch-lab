# Next steps

To-do list for upcoming work.

---

## 1. Set up separate branches for staging and production

- [ ] Define branch strategy (e.g. `main` = production, `staging` = staging, or `production` / `staging` with different merge flow).
- [ ] Configure deployment (Vercel or other) so:
  - **Production** deploys from the production branch (e.g. `main`).
  - **Staging** deploys from the staging branch (e.g. `staging`).
- [ ] Document in README or CONTRIBUTING how to merge to staging vs production and when to use each.

---

## 2. Notifications

- [ ] Decide what to notify on (e.g. new submissions, completions, admin actions).
- [ ] Choose channel(s): in-app only, email, or both.
- [ ] Design data model and APIs if storing notification preferences or history.
- [ ] Implement and wire up notification UI and/or email sending.

---

## 3. Theme color changes

- [ ] Define desired palette (e.g. primary, accent, backgrounds, borders).
- [ ] Update design tokens:
  - **Site:** `apps/site/app/globals.css` (CSS variables), `tailwind.config.ts` (theme colors).
  - **CMS:** if the admin should match, update CMS theme/sidebar variables.
- [ ] Apply new colors across key components (buttons, links, cards, sidebar) and spot-check all pages.

---

*Add notes or sub-tasks under each item as you go.*
