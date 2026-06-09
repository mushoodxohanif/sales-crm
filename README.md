# sales-crm

Lead funneling and management CRM built with the latest stack: Next.js 16, Bun, Biome, Tailwind CSS 4, shadcn/ui v4, Prisma 7, and Zod 4 on Neon Postgres.

## Stack

| Layer | Technology |
|-------|------------|
| Runtime / package manager | [Bun](https://bun.sh) |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Lint / format | [Biome 2](https://biomejs.dev) |
| UI | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui v4](https://ui.shadcn.com) |
| Database | [Prisma 7](https://www.prisma.io) + `@prisma/adapter-pg` + [Neon Postgres](https://neon.tech) |
| Validation | [Zod 4](https://zod.dev) |

## Project structure

```
src/
├── app/                 # Next.js App Router pages
├── components/ui/       # shadcn/ui components
├── generated/prisma/    # Prisma 7 client (generated)
└── lib/
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

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `DATABASE_URL` (Neon Postgres connection string) and other values in `.env`.

3. Install dependencies (runs `prisma generate` automatically):

   ```bash
   bun install
   ```

4. Run migrations (requires a configured Neon database):

   ```bash
   bun run db:migrate
   ```

5. Start the dev server:

   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start Next.js with Turbopack |
| `bun run build` | Production build |
| `bun run lint` | Run Biome checks |
| `bun run format` | Format with Biome |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:seed` | Seed demo data |
| `bun run db:studio` | Open Prisma Studio |

## Prisma 7 notes

- Connection URL lives in `prisma.config.ts` (not `schema.prisma`).
- Client is generated to `src/generated/prisma` and uses the `@prisma/adapter-pg` driver adapter.
- Run `bun run db:seed` explicitly after migrations (v7 no longer auto-seeds on migrate).
