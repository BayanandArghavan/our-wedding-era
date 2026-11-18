# Our Wedding Era

*Planning our forever, together.*

A private, two-person wedding planning app for Arghavan and Bayan. Each of you has your own login, and both logins share one wedding workspace. Data lives in Postgres (Supabase) behind row level security, so only the two of you can read it.

This is **Phase 1** of the five-phase plan: foundation, sign-in, the shared workspace, settings, the dashboard and the master checklist. See [Phase 1 report](#phase-1-report) at the bottom.

---

## Stack

| Piece | Choice | Why |
|---|---|---|
| App | Next.js 16 (App Router) + TypeScript | Server-rendered pages, server actions for every write |
| Styling | Tailwind CSS 4 with our own small component set | See note below on shadcn/ui |
| Auth, database, realtime | Supabase (Postgres + Auth + Realtime) | Row level security enforces privacy in the database itself |
| Forms | React Hook Form + Zod | The same Zod schema validates in the browser and again on the server |
| Dates | Plain ISO calendar dates + `Intl` | Due dates can't drift a day across time zones |
| Tests | Vitest (logic + database authorization), Playwright (two real browsers) | |
| Hosting | Vercel (app) + Supabase (data) | |

**shadcn/ui** isn't used. Its CLI copies components from an online registry, and the build environment couldn't reach it. The app has a small set of components in `src/components/ui.tsx` built the same way (Tailwind classes, accessible native elements such as `<dialog>`). shadcn components can be added later without conflicts. **Recharts** arrives in Phase 3 with the budget charts.

---

## Run it on your computer

You need Node.js 20 or newer and Docker Desktop (for the local Supabase stack).

```bash
npm install
npx supabase start          # starts Postgres, Auth, Realtime and a test mail inbox
npx supabase db reset       # applies supabase/migrations
npx supabase status -o env  # prints the local URL and keys
cp .env.example .env.local  # then paste API_URL and PUBLISHABLE_KEY into it
npm run dev
```

Open http://127.0.0.1:3000. Confirmation and password-reset emails don't leave your computer locally; read them at http://127.0.0.1:54324.

Use `127.0.0.1` rather than `localhost` locally. The local auth server's links point to `127.0.0.1`, and a session cookie set on one host isn't visible on the other.

---

## Deploy

### 1. Create the Supabase project

1. Create a project at supabase.com. Pick a US West region if offered.
2. Push the database schema from this folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
3. In the dashboard, under **Authentication**:
   - **URL Configuration:** set *Site URL* to your Vercel URL (e.g. `https://our-wedding-era.vercel.app`). Add `https://our-wedding-era.vercel.app/**` to *Redirect URLs*.
   - **Email provider:** turn **Confirm email** on. Set the minimum password length to 10 so it matches the app.

### 2. Email delivery (required for sign-up)

Supabase's built-in email sender will only deliver to addresses that belong to members of your Supabase organization's team. Anyone else gets "Email address not authorized." Pick one option:

- **Simplest, for just the two of you:** add both of your email addresses to your Supabase organization's **Team**. The built-in sender has a low hourly limit, which is fine for two people.
- **Better:** set up custom SMTP under *Authentication → Emails → SMTP Settings* with a provider such as Resend, Postmark or Brevo. You also need custom SMTP if you want to edit the email templates.

**Optional, recommended:** once custom SMTP is on, paste the two templates from `supabase/templates/` into *Authentication → Emails → Templates* (Confirm signup, Reset password). They match the app's look, and their links work even if you open the email on a different device from the one you signed up on. Supabase's default templates also work, but their links have to be opened in the same browser you signed up in. Both link styles are tested.

### 3. Deploy the app on Vercel

1. Put this folder in a private GitHub repository and import it at vercel.com.
2. Add these environment variables (Project Settings → Environment Variables):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The **publishable** key (starts `sb_publishable_`) |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL, no trailing slash |

3. Deploy. Redeploy after any change to these variables, because `NEXT_PUBLIC_` values are baked in at build time.

The app never uses Supabase's secret or service-role key. Don't add it to Vercel.

### 4. First use

1. Whoever goes first signs up, confirms their email, and completes the setup wizard. That creates your workspace and seeds the checklist.
2. In wizard step 3 (or later, Settings → Partners), enter the other partner's email. You get a link plus an **Open in my email app** button. The app doesn't send this email itself; it comes from your own email account.
3. The other partner opens the link, signs up **with that exact email**, confirms, and taps **Join our wedding space**. The link expires after 14 days and works once.

---

## Tests

```bash
npm run typecheck
npm run lint
npm test            # planning logic: dates, scheduling, priorities, progress, seed data
npm run test:db     # authorization against the local Supabase stack (needs `npx supabase start`)
npm run build && npx next start -H 127.0.0.1 -p 3000 &
npm run test:e2e    # two real browsers through the UI (needs the local stack and Chrome)
```

`test:db` uses the local secret key only to create throwaway users. Every access check runs through an ordinary signed-in client, so it tests row level security, not the admin key.

---

## How privacy is enforced

- Every wedding table has row level security. Every read and write checks that the signed-in user belongs to that workspace. The checks are in the database, so they hold even if the app code had a bug.
- Signed-out visitors have no table access at all.
- An account can belong to one workspace, and a workspace holds at most two people.
- Invitation tokens are 256-bit random values. Only a SHA-256 hash is stored. Accepting requires a confirmed email that matches the invitation.
- "Created by" and "updated by" are set by the database from the session, so they can't be faked from the browser.
- Task history and the activity feed are written only by database triggers. Neither of you can edit or delete them.
- Realtime updates go through the same row level security.

---

## Phase 1 report

### 1. Features completed

- **Accounts:** email/password sign-up with email verification, sign-in, sign-out, password reset by email, sessions refreshed by `src/proxy.ts`. A password reset signs out that account's other sessions; this is Supabase's behavior and was observed in testing.
- **Shared workspace:** partner invitation by link (copy, or open in your own email app), acceptance limited to the invited, confirmed email, and a two-person limit.
- **Setup wizard:** screens 1 to 5 from the brief. Known details are prefilled, the exact date and budget are optional, the venue is preselected as secured, and vendor statuses can be corrected. Unfinished setup resumes where it stopped. Screen 6 (first monthly check-in) waits for Phase 2.
- **Wedding Settings:** every detail from brief §2 is editable. Changing the wedding date or month shows which tasks would move and asks first. Tasks on suggested dates are preselected; tasks with hand-set dates are listed separately and left alone unless you tick them; suggestions already in the past are flagged. Also: vendor booked/needed list, partner access, your own profile and time zone, light/dark/system appearance.
- **Dashboard:** greeting by time of day, live countdown computed from the stored date (Pacific Time), overall and this-month progress, overdue count, deadlines in the next 30 days with a "This week" group, This Month's Priorities (top five, with the reason each ranks), vendors booked vs needed, total budget, partner activity feed, milestone cards.
- **Master checklist:** 186 seeded tasks across 13 categories with suggested dates. Filters by month, category, assignee, priority and status; quick views for overdue, next 30 days and completed; search; four sort orders; grouping by month with per-month progress.
- **Task detail:** edit every field, complete or reopen, mark not applicable, move to next month, claim, ask to reassign, delete with confirmation, subtasks, dependencies (loops are rejected), and full history including the original date on every reschedule.
- **Who's Doing What?:** Arghavan's tasks, Bayan's tasks, Together, plus a not-yet-assigned list and a workload overview. Either partner can claim a task or ask to hand one off; the other can take it, share it, or dismiss the request. Nothing is assigned automatically.
- **Milestones:** all 16 (the two lists in the brief combined), with completion dates and linked tasks. A milestone completes itself when every linked task is done, with a small petal animation. Custom milestones can be added.
- **Live sync:** when one of you changes something, the other's open page refreshes within about a second.
- **Linked records:** marking a vendor booked completes its "Book…" task and the reverse; marking the venue confirmation received completes "Obtain written deposit confirmation."

### 2. Files

```
supabase/migrations/20261114000001_phase1_foundation.sql  schema, RLS, triggers, functions
supabase/migrations/20261114000002_reassignment_requests.sql
supabase/templates/                  confirmation and reset emails
src/proxy.ts                         session refresh and sign-in redirect
src/lib/planning/                    catalog (seed data), dates, schedule, insights (pure, tested)
src/lib/data/                        server-only data access; all queries run as the signed-in user
src/lib/validation/                  Zod schemas shared by forms and server actions
src/app/(auth)/                      sign-in, sign-up, reset, check-email
src/app/auth/confirm/route.ts        email link handler
src/app/setup/                       setup wizard
src/app/invite/[token]/              invitation acceptance
src/app/(app)/                       dashboard, checklist, task detail, responsibilities, milestones, settings, server actions
src/components/                      UI kit, shell, task row, task dialog, celebration
tests/unit, tests/db, tests/e2e
```

### 3. Database migrations

Two migrations in `supabase/migrations`. Apply them with `npx supabase db push`. Phase 1 tables: `profiles`, `wedding_workspaces`, `workspace_members`, `workspace_invitations`, `wedding_settings`, `task_categories`, `tasks`, `task_subtasks`, `task_dependencies`, `task_activity`, `milestones`, `milestone_tasks`, `vendor_needs`, `activity_log`. The remaining tables in brief §22 arrive with the phases that use them.

### 4. Environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`. No secrets.

### 5. Tests performed

All run against a full local Supabase stack (the same Postgres, Auth and Realtime services as hosted Supabase):

- **29 unit tests:** date math across daylight saving changes and leap years; "today" in the venue time zone; seed data (no duplicate keys or titles, no broken references, no dependency loops); due-date suggestions; date-change planning (hand-set dates protected, completed tasks never moved, past dates flagged); progress math (a past due date never counts as done); priority ranking; countdown; open-redirect protection.
- **15 database authorization tests:** an outsider account reads nothing from nine tables and can't update or insert; signed-out access is denied; invitations work only for the invited, confirmed email and only once; no third member; "created by" can't be faked; partner A's task is visible to partner B and B's completion is attributed to B; rescheduling keeps the original date; history can't be deleted; a wedding date change moves only approved tasks; a date outside the wedding month is rejected; dependency loops are rejected; deleting a task cleans up its children and keeps a feed entry; profiles can't be edited by the other partner; records can't be moved to another workspace.
- **14 end-to-end tests** in two separate browsers (desktop Chrome and an iPhone-sized mobile viewport), covering brief §27 items 1 to 8, 11 to 12 and 18 to 22, plus email verification, password reset, the milestone celebration, dark mode, no horizontal scrolling on a phone-sized screen, and rejection of bad or used invitation links.
- Separately confirmed that sign-up and password reset also work with Supabase's default email templates.

### 6. Known limitations and decisions to check

- **Not tested on a real iPhone or in Safari.** The mobile tests use Chrome at iPhone screen size. Please try it on your phones.
- **Not tested against your hosted Supabase project**, which doesn't exist yet. The local stack runs the same services, but the first real test of email delivery happens after you deploy.
- **Reminders:** reminder and weekly-summary preferences are saved, but nothing is sent yet. The UI says so. Delivery is Phase 3.
- **Invitations aren't emailed by the app.** You get a link and a button that opens your own email app.
- **Not in Phase 1:** quick actions other than Add Task, payment deadlines, spent/committed budget figures, task attachments, and links from tasks to vendors and expenses. Each depends on a later phase, and the dashboard says where those numbers will come from rather than showing placeholders.
- **Duplicates in the brief were merged** so the checklist has none: Design invitations (Guest List and Stationery), Design seating chart (Florals and Stationery), Research hotel blocks and Research guest hotels, Confirm parking (Transportation) into Confirm parking and accessibility, Schedule tasting into Confirm food tasting, Confirm outside food rules into Confirm outside catering policies, Select ceremony songs into Choose ceremony music, Prepare ceremony programs into Design ceremony programs, Finalize seating into Finalize seating chart, and Confirm final headcount into Confirm final guest count. Roadmap items with no matching checklist task became their own tasks (e.g. Research planners, Review overall budget).
- **Provisional dates:** before the exact date is entered, each task is due on the last day of its roadmap month. Wedding-month tasks fall on the 1st of September so they can't land after the wedding. Entering the date recalculates them, with confirmation.
- **Ceremony and legal tasks** (Bahá'í requirements, consent, civil solemnization, marriage license, filing) are seeded as tasks with no guidance about the actual requirements. Those have to come from the appropriate Bahá'í institutions and the county clerk.
- **Free-plan terms:** check Supabase's and Vercel's current free-plan limits, including whether inactive projects get paused.

### 7. Running the app

See [Run it on your computer](#run-it-on-your-computer) and [Deploy](#deploy).

### 8. Next: Phase 2, the Monthly Check-In System

Check-ins generated from November 2026 through the wedding month plus a wrap-up; the eight-step guided meeting; each partner's answers stored privately and protected by row level security (not just hidden in the interface); sealed decision preferences revealed only after both of you submit; next-month goals; read-only dated snapshots; meeting history; PDF export; and setup screen 6.
