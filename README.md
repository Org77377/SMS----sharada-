# SMS — Sharada Public School, Vijayapura (586-109)

**Syllabus Management System** for Sharada Public School, Vijayapura.
Teachers submit term-wise syllabus, Coordinators/Principals review & approve, and the
system compiles a print-ready grade syllabus for parents.

> Architected & Developed by **Omkar RG** | Dept. of CS, Sharada Public School

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS 4, shadcn/ui, Lucide, Framer Motion |
| Backend | Next.js 16 (App Router) API routes, TypeScript |
| Database | **PostgreSQL** via Prisma ORM |
| Auth | JWT (HTTP-only cookie) + bcrypt password hashing |
| PDF/Export | html2pdf.js + print CSS |

---

## Prerequisites

1. **Node.js 18+** and [Bun](https://bun.sh) runtime
2. **PostgreSQL 13+** running locally (install from [postgresql.org](https://www.postgresql.org/download/))
3. A GitHub account (to clone this repo)

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/<YOUR_USERNAME>/SMS----sharada-.git
cd SMS----sharada-
bun install
```

### 2. Configure the database connection

Copy the example env and set your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sharada_sms?schema=public"
JWT_SECRET="change-this-to-a-long-random-string"
```

> **Note:** Special characters in the password must be URL-encoded.
> e.g. `pa$$word` → `pa%24%24word`

### 3. Create the database & tables

Create the database (once):

```bash
psql -U postgres -c "CREATE DATABASE sharada_sms;"
```

Then let Prisma create all tables:

```bash
bun run db:push
```

> Alternatively, apply the raw DDL via DBeaver or psql:
> `psql -U postgres -d sharada_sms -f prisma/schema.sql`

### 4. Seed demo data

```bash
bun prisma/seed.ts
```

This loads: 4 roles, Grades 4–10, 10 subjects, Academic Year 2025-2026,
13 demo users, sample syllabus units, and a welcome notification.

### 5. Run the app

```bash
bun run dev
```

Open **http://localhost:3000**

---

## Demo Login Credentials

Password for **all** demo accounts: `sharada123`

| Role | Username |
|------|----------|
| Superadmin | `superadmin` |
| Principal | `principal` |
| Coordinator | `coordinator` |
| Teacher | `omkar`, `lakshmi`, `ramesh`, `geeta`, `suresh`, `anita`, `vijay`, `padma`, `nagaraj`, `shobha` |

---

## Features by Role

### Teacher Panel
- Personalized greeting with assigned subject
- Grade & Term selectors (filtered by teacher's assignments)
- Add units (Unit Name, Topics, Learning Objectives)
- Save as draft / Submit for approval
- View approval status & reviewer feedback
- Notification bell for updates

### Coordinator / Principal Panel
- Status grid across Grades 4–10 × all subjects
- Review queue: approve or return units with feedback
- Compile approved syllabus into a parent-ready document
- One-click **Print**, **PDF**, and **DOCX** export
- Broadcast notifications to teachers

### Superadmin Panel
- Full user management (create, edit, delete, activate)
- Teacher ↔ Grade ↔ Subject assignment mapping
- Academic year management
- Audit log trail
- Switchable "Review Console" for syllabus review

---

## Database Schema

See [`prisma/schema.prisma`](prisma/schema.prisma) for the Prisma model definitions
and [`prisma/schema.sql`](prisma/schema.sql) for the complete PostgreSQL DDL
(all tables, foreign keys, indexes, and a `v_status_grid` helper view).

**Tables:** `Role`, `User`, `Grade`, `Subject`, `AcademicYear`,
`TeacherAssignment`, `Unit`, `Notification`, `AuditLog`

---

## Available Scripts

| Command | Description |
|---------|------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to PostgreSQL |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:migrate` | Create a migration (dev) |
| `bun run db:reset` | Drop & recreate database (dev) |
| `bun prisma/seed.ts` | Load demo data |

---

## Project Structure

```
prisma/
  schema.prisma     # Prisma models (PostgreSQL)
  schema.sql        # Full PostgreSQL DDL
  seed.ts           # Demo data seeder
src/
  app/
    api/            # API routes (auth, units, notifications, admin, compile)
    page.tsx        # Main SPA (role-based dashboards)
    globals.css     # Theme (Royal Blue #2563EB) + print styles
  components/
    sms/            # AppShell, LoginView, Teacher/Coordinator/Superadmin dashboards
    ui/             # shadcn/ui components
  lib/
    auth.ts         # bcrypt + JWT helpers
    db.ts           # Prisma client
    session.ts      # Session/role helpers
    api.ts          # Frontend API client + types
```

---

## License

Proprietary — Sharada Public School, Vijayapura. All rights reserved.
