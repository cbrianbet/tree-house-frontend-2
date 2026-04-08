# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Tree House Frontend

Property management dashboard built with Next.js 15 (App Router), TypeScript, and Tailwind CSS. Connects to a Django REST backend via token auth.

## Quick Start

```bash
pnpm install       # npm has semver issues — always use pnpm
pnpm dev           # starts on localhost:3000
pnpm build         # production build
pnpm lint          # ESLint via next lint
pnpm start         # serve production build
```

Environment: copy `.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.

There are no automated tests in this project — testing is manual via the browser against a running Django backend.

## Architecture

```
src/
├── app/
│   ├── (auth)/           # Public routes: /signin, /signup, /reset-password, /reset-password/confirm
│   ├── (admin)/          # Protected routes (auth guard in layout.tsx)
│   │   ├── page.tsx              # Role-specific dashboards: Admin, Landlord, Tenant, Agent, Artisan, MovingCompany
│   │   ├── properties/           # CRUD: list, new, [id] detail (units, leases, agents, documents, reviews, neighborhood insights)
│   │   ├── applications/         # Tenant apply / landlord review
│   │   ├── billing/              # Invoices, receipts, config, finances, reports
│   │   ├── maintenance/          # Requests, [id] detail (bids, notes, images)
│   │   ├── notifications/        # In-app notification list with mark-read
│   │   ├── messages/             # Polling-based messaging: conversations + thread view
│   │   ├── disputes/             # Dispute list, create, detail with status transitions + messages
│   │   ├── moving/               # Browse moving companies, book, manage bookings, write reviews
│   │   ├── saved-searches/       # Enhanced public unit search with filters + saved search management
│   │   ├── admin/
│   │   │   ├── users/            # Admin user management: list, search, role change, activate/deactivate
│   │   │   └── moderation/       # Admin content moderation: review all property & tenant reviews, delete
│   │   ├── settings/             # Account info, role profile (incl. MovingCompany), change password, notification prefs
│   │   └── profile-setup/        # Post-registration role-specific profile (incl. MovingCompany)
│   └── layout.tsx        # Root layout — wraps AuthProvider > ThemeProvider > SidebarProvider
├── lib/api/
│   ├── client.ts         # Axios instance with Token header injection & 401 redirect
│   ├── auth.ts           # login, register, logout, getCurrentUser, getRoles, password reset, change password, account self-service, notification preferences
│   ├── profiles.ts       # Tenant/Landlord/Agent/Artisan/MovingCompany profile CRUD
│   ├── properties.ts     # Properties, units, leases, agents, applications, dashboard, lease documents, property reviews, tenant reviews
│   ├── billing.ts        # Config, invoices, receipts, charge types, income, expenses, reports
│   ├── maintenance.ts    # Requests, bids, notes, images
│   ├── notifications.ts  # List, mark read, mark all read
│   ├── messaging.ts      # Conversations, messages, send, mark read
│   ├── disputes.ts       # List, create, get, update status, messages
│   ├── moving.ts         # Companies, bookings, booking status, company reviews
│   ├── neighborhood.ts   # CRUD for property neighborhood insights (POIs)
│   ├── saved-searches.ts # Public unit search with filters, saved search CRUD
│   └── dashboards.ts     # Admin (overview + users + moderation), Tenant, Artisan, Agent, MovingCompany dashboards
├── types/api.ts          # All TypeScript interfaces matching the backend API
├── context/
│   ├── AuthContext.tsx    # Global auth state: user, roles, login/register/logout
│   ├── SidebarContext.tsx
│   └── ThemeContext.tsx
├── components/
│   ├── ui/               # Alert, Badge, Button, Modal, Avatar, Dropdown, Table
│   ├── form/             # Input, TextArea, Select, MultiSelect, Label, Checkbox, Radio
│   ├── auth/             # SignInForm, SignUpForm
│   └── header/           # UserDropdown (shows user info + logout), NotificationDropdown (live unread count)
├── layout/               # AppSidebar (role-gated nav), AppHeader, SidebarWidget
└── icons/                # SVG icon components
```

## Authentication

- **Backend**: Django REST Token Auth — `Authorization: Token <key>`
- **Storage**: `localStorage` key `tree_house_token`
- **Client**: `src/lib/api/client.ts` — Axios instance auto-injects token, redirects to `/signin` on 401
- **Context**: `src/context/AuthContext.tsx` — exposes `user`, `roles`, `loading`, `login()`, `register()`, `logout()`, `refreshUser()`, `roleName(id)`
- **Route guard**: `src/app/(admin)/layout.tsx` redirects to `/signin` when `!user && !loading`
- **Password reset**: `/reset-password` sends email, `/reset-password/confirm?uid=...&token=...` sets new password
- **Change password**: Settings page calls `POST /api/auth/password/change/`

## Roles (IDs are stable)

| ID | Name           | Key capabilities |
|----|----------------|------------------|
| 1  | Admin          | Full system access; user management; content moderation; can create properties |
| 2  | Landlord       | Create/manage own properties, billing, finances, reports, disputes, neighborhood insights |
| 3  | Agent          | View/manage assigned properties; read-only billing; view disputes; add insights |
| 4  | Tenant         | Browse units, apply, pay invoices, submit maintenance, raise disputes, book movers |
| 5  | Artisan        | See open requests by trade, place bids, do maintenance work |
| 6  | MovingCompany  | Manage company profile, handle bookings (confirm/complete), view own dashboard |

Role constants are defined once in `src/constants/roles.ts` and imported where needed. **Never hardcode role IDs** — always import from this file. Use `user.role` (number) for checks.

## Permission Matrix Highlights

- **Create property**: Admin + Landlord
- **Dashboard**: Each role gets its own dashboard (Admin overview, Landlord portfolio, Tenant lease/invoices, Agent assigned, Artisan jobs/bids, MovingCompany bookings/reviews)
- **Submit maintenance**: Admin + Tenant + Landlord
- **Applications**: Tenant (submit/withdraw), Admin + Landlord (review/approve/reject)
- **Disputes**: Admin + Tenant + Landlord can create; Agent can view assigned
- **Moving**: All authenticated can browse/book; MovingCompany can confirm/complete bookings
- **Saved searches**: All authenticated users can search public units with filters and save criteria
- **Neighborhood insights**: Admin + Landlord + Agent can add; all authenticated can view
- **Admin panel**: User management + content moderation (Admin only)
- **Notifications / Messages / Settings**: All authenticated users

## Key Conventions

- **All pages are client components** — `"use client"` at top. The app is an SPA-style admin panel.
- **API functions** return typed data directly (unwrap `res.data` inside the function, never at the call site).
- **Role gating** is done inline: `if ([ROLE_ADMIN, ROLE_LANDLORD].includes(user.role))`. The sidebar in `AppSidebar.tsx` has a `getNavItems(roleId)` function that controls navigation visibility.
- **Forms** use native `FormData` via `new FormData(e.currentTarget)` — no form libraries.
- **File uploads** use `multipart/form-data` with explicit Content-Type header override on the Axios call.
- **UI components**: Always use existing components from `src/components/ui/` and `src/components/form/`. Key ones:
  - `Button` (variants: `"primary"` | `"outline"`, sizes: `"sm"` | `"md"`)
  - `Badge` (variants: `"light"` | `"solid"`, colors: `"success"` | `"warning"` | `"error"` | `"info"` | `"primary"`)
  - `Alert` (variants: `"success"` | `"error"` | `"warning"` | `"info"`)
  - `Select` — controlled via `onChange` callback (returns string value, not event)
  - `TextArea` — controlled via `onChange` callback (returns string value, not event)
  - `Input` (`InputField`) — standard `onChange` with event object; does NOT support `value` prop (use native `<input>` for controlled inputs)
- **Path alias**: `@/*` maps to `./src/*`.
- **Styling**: Tailwind CSS with dark mode via `dark:` prefix. Design uses rounded cards (`rounded-2xl`), border-based separation, and the `brand-500` accent color.

## Backend API

Full docs at the companion repo: `docs/api-integration.md`. Base URL set via `NEXT_PUBLIC_API_BASE_URL`.

All endpoints are under `/api/` and follow REST conventions. The backend scopes list responses by role automatically (e.g., landlord sees only own properties, tenant sees only own invoices).

## Common Patterns

### Adding a new page

1. Create `src/app/(admin)/your-feature/page.tsx` with `"use client"`
2. Import `useAuth` for role checks, API functions from `src/lib/api/`, types from `src/types/api.ts`
3. Add the nav entry in `getNavItems()` in `src/layout/AppSidebar.tsx` with correct role gating

### Adding a new API endpoint

1. Add TypeScript interfaces to `src/types/api.ts`
2. Add the function to the appropriate file in `src/lib/api/` — import `api` from `./client`, return `res.data` typed
3. For file uploads, use `FormData` and set `{ headers: { "Content-Type": "multipart/form-data" } }`

## Known Issues

- `next-auth` and `@clerk/nextjs` are in `package.json` but unused — the app uses custom token auth. They can be removed.
- SVG type declarations in `src/svg.d.ts` conflict with `@svgr/webpack` — pre-existing template issue, does not affect functionality.
- Use `pnpm` (not `npm`) — npm fails with semver parsing errors on this project's dependency tree.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
