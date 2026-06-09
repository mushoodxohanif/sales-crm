# Lead'em

Lead funneling and management CRM for sales teams. Define reusable campaign schemas, run pipeline-based campaigns, and bulk-import leads from spreadsheets with AI-assisted column mapping.

Built with Next.js 16, Bun, Biome, Tailwind CSS 4, shadcn/ui v4, Prisma 7, NextAuth, and Zod 4 on Neon Postgres.

## Features

- **Campaign types** — Reusable lead schemas with custom fields (text, email, phone, URL, number, date, select, multi-select, checkbox).
- **Campaigns** — Pipeline-based lead collections with configurable stages and drag-and-drop ordering.
- **Lead management** — Track individual leads, update field values, and move prospects between stages.
- **Bulk import** — Upload CSV or XLSX files, review parsed columns, map fields, and commit leads in bulk.
- **AI import analysis** — Gemini-powered column detection and campaign type matching to speed up imports.
- **Dashboard** — Overview of campaign types, campaigns, leads, and recent activity.
- **Google Workspace auth** — Sign in with Google; restrict access to approved Workspace domains.

## Stack

| Layer | Technology |
|-------|------------|
| Runtime / package manager | [Bun](https://bun.sh) |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Auth | [NextAuth v5](https://authjs.dev) (Google OAuth) |
| Lint / format | [Biome 2](https://biomejs.dev) |
| UI | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui v4](https://ui.shadcn.com) |
| Database | [Prisma 7](https://www.prisma.io) + `@prisma/adapter-pg` + [Neon Postgres](https://neon.tech) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai) + Google Gemini |
| Validation | [Zod 4](https://zod.dev) |

## Project structure

```
src/
├── app/
│   ├── (app)/           # Authenticated app (dashboard, campaigns, import)
│   └── (marketing)/     # Public landing page
├── components/
│   ├── dashboard/       # Dashboard widgets
│   ├── import/          # Import wizard
│   ├── landing/         # Marketing page sections
│   └── ui/              # shadcn/ui components
├── generated/prisma/    # Prisma 7 client (generated)
└── lib/
    ├── actions/         # Server actions
    ├── ai/              # AI import analysis
    ├── data/            # Shared Prisma query helpers
    ├── import/          # CSV/XLSX import pipeline
    ├── validators/      # Zod schemas
    ├── db.ts            # Prisma singleton
    └── utils.ts         # shadcn cn() helper
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Seed script
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- A [Neon](https://neon.tech) Postgres database
- A Google Cloud OAuth client (for Workspace sign-in)
- A Google Gemini API key (for AI import analysis)

### Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Configure `.env`:

   | Variable | Description |
   |----------|-------------|
   | `DATABASE_URL` | Neon Postgres connection string |
   | `AUTH_SECRET` | Random secret for Auth.js (e.g. `openssl rand -base64 32`) |
   | `AUTH_URL` | App URL (`http://localhost:3000` in dev) |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
   | `ALLOWED_GOOGLE_WORKSPACE_DOMAIN` | Comma-separated allowed Workspace domains |
   | `GEMINI_API_KEY` | Google Gemini API key for import analysis |

3. Install dependencies (runs `prisma generate` automatically):

   ```bash
   bun install
   ```

4. Run migrations:

   ```bash
   bun run db:migrate
   ```

5. Seed demo data (optional):

   ```bash
   bun run db:seed
   ```

6. Start the dev server:

   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) for the landing page. Use **Sign in** to authenticate with Google and access the dashboard at `/dashboard`.

## Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start Next.js with Turbopack |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run Biome checks |
| `bun run format` | Format with Biome |
| `bun run typecheck` | TypeScript check |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:seed` | Seed demo data |
| `bun run db:studio` | Open Prisma Studio |

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Landing page with Google sign-in |
| `/dashboard` | Authenticated | CRM overview |
| `/campaign-types` | Authenticated | Manage lead schemas |
| `/campaigns` | Authenticated | Campaign list and pipelines |
| `/import` | Authenticated | Bulk lead import wizard |

## Prisma 7 notes

- Connection URL lives in `prisma.config.ts` (not `schema.prisma`).
- Client is generated to `src/generated/prisma` and uses the `@prisma/adapter-pg` driver adapter.
- Run `bun run db:seed` explicitly after migrations (v7 no longer auto-seeds on migrate).

## Google OAuth setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com).
2. Enable the Google+ API / People API and create OAuth 2.0 credentials (Web application).
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and your production URL).
4. Set `ALLOWED_GOOGLE_WORKSPACE_DOMAIN` to your company's domain (e.g. `yourcompany.com`).
