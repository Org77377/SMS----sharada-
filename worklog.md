# Worklog — Sharada Public School SMS

Project: School Management System (SMS) for Sharada Public School, Vijayapura (586-109).
Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite) + JWT/bcrypt.
Primary accent: #2563EB (Royal Blue).

---
Task ID: 0
Agent: main
Task: Project setup & planning

Work Log:
- Explored existing Next.js scaffold, confirmed shadcn/ui components present, Prisma configured with SQLite.
- Installed bcryptjs, jsonwebtoken, html2pdf.js and their type packages.
- Planned single-route SPA architecture at `/` (constraint: only `/` visible to preview) with client-side role-based view switching.

Stage Summary:
- Foundation ready. Building schema next.

---
Task ID: 1
Agent: main
Task: Full backend + frontend implementation & self-verification

Work Log:
- Wrote Prisma schema (Role, User, Grade, Subject, AcademicYear, TeacherAssignment, Unit, Notification, AuditLog) and pushed to SQLite.
- Seeded: 4 roles, Grades 4–10, 10 subjects, AY 2025-2026, 13 users (superadmin/principal/coordinator + 10 teachers with assignments), sample units (draft/submitted/approved), welcome notification.
- Built auth lib (bcrypt + JWT httpOnly cookie) + session helper.
- Built API routes: auth (login/logout/me), my-assignments, grades, subjects, units (CRUD/submit/approve/reject), notifications (list/broadcast/mark-read), status-grid, compile/[grade], admin (users/assignments/academic-years/audit-logs/grades/subjects).
- Built frontend SPA: AppShell (branding header + sticky attribution footer), LoginView (role-aware quick-fill), TeacherDashboard (greeting, grade/term selectors, unit form, drafts/submit, status, feedback), CoordinatorDashboard (status grid, review queue, compile & export with print/PDF/DOCX, broadcast), SuperadminDashboard (users CRUD, assignments, academic years, audit logs) with a Management/Review Console toggle for superadmin.
- Fixed `Audit` lucide icon (renamed to ShieldAlert), removed invalid `void UnitStatus` runtime statements.
- PDF export: html2pdf.js was hanging because html2canvas can't parse Tailwind v4 oklch colors. Solved by rendering the compiled doc into an isolated hidden iframe built from a standalone hex-styled HTML string — clean generation with no oklch contamination. Rewrote CompiledDocView with inline hex styles to match.
- Print CSS: switched to the `visibility:hidden body * → reveal .print-area` technique so only the compiled syllabus prints.
- Agent-browser self-verification (all passed): login renders; teacher flow (create unit + submit); coordinator flow (review queue shows submissions, approve works, compile Grade 8 shows approved CS units, PDF export completes & cleans up iframe, broadcast sends); teacher receives broadcast + approval + welcome notifications in the bell panel; superadmin Users tab (created test user, appeared in directory) and Audit Logs tab (captured LOGIN/UNIT_CREATE/UNIT_APPROVE/NOTIFY_BROADCAST/USER_CREATE); mobile viewport 390×844; sticky footer verified on both short (login, footerBottom=viewportHeight) and long (dashboard, footer pushed to doc bottom) pages. Removed test user after verification. Lint clean. All API routes 200/201.

Stage Summary:
- Production-ready SMS delivered end-to-end. Login credentials (all users): password `sharada123`. Demo usernames: superadmin, principal, coordinator, omkar, lakshmi, ramesh, geeta, suresh, anita, vijay, padma, nagaraj, shobha.
- Branding: header "Sharada Public School · Vijayapura 586-109", footer "Architected & Developed by Omkar RG | Dept. of CS, Sharada Public School".
- Printable compiled grade syllabus (parent-facing) via Print + one-click PDF (isolated iframe, html2pdf) + DOCX (Word-compatible HTML).
