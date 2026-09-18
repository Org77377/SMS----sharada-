-- =========================================================================
-- Sharada Public School SMS — Full PostgreSQL DDL
-- Vijayapura 586-109 · Syllabus Management System
-- Target: PostgreSQL 13+ (local DBeaver-managed database)
-- =========================================================================
--
-- HOW TO USE
--   1. Create a database (once):
--        psql -U postgres -c "CREATE DATABASE sharada_sms;"
--   2. Apply this DDL (idempotent — safe to re-run):
--        psql -U postgres -d sharada_sms -f prisma/schema.sql
--      Or open it in DBeaver → SQL Editor → Execute.
--   3. Then from the project root let Prisma sync / seed:
--        bun run db:push
--        bun run prisma/seed.ts
--
-- NOTE: Prisma's `db push` will also create these tables for you from
--       prisma/schema.prisma. This file is provided so you can inspect,
--       audit, or manually provision the schema via DBeaver / psql.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- Drop in dependency order (safe re-run)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "Unit" CASCADE;
DROP TABLE IF EXISTS "TeacherAssignment" CASCADE;
DROP TABLE IF EXISTS "AcademicYear" CASCADE;
DROP TABLE IF EXISTS "Subject" CASCADE;
DROP TABLE IF EXISTS "Grade" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Role" CASCADE;

-- -------------------------------------------------------------------------
-- Roles
-- -------------------------------------------------------------------------
CREATE TABLE "Role" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- -------------------------------------------------------------------------
-- Users  (staff logins; password_hash is bcrypt)
-- -------------------------------------------------------------------------
CREATE TABLE "User" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "username"     TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone"        TEXT,
    "email"        TEXT,
    "roleId"       TEXT NOT NULL,
    "departmentId" TEXT,
    "active"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- -------------------------------------------------------------------------
-- Grades  (4..10)
-- -------------------------------------------------------------------------
CREATE TABLE "Grade" (
    "id"          TEXT NOT NULL,
    "gradeNumber" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Grade_gradeNumber_key" ON "Grade"("gradeNumber");

-- -------------------------------------------------------------------------
-- Subjects
-- -------------------------------------------------------------------------
CREATE TABLE "Subject" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- -------------------------------------------------------------------------
-- Academic Years
-- -------------------------------------------------------------------------
CREATE TABLE "AcademicYear" (
    "id"        TEXT NOT NULL,
    "year"      TEXT NOT NULL,
    "active"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademicYear_year_key" ON "AcademicYear"("year");

-- -------------------------------------------------------------------------
-- Teacher Assignments  (teacher × grade × subject × academic year)
-- -------------------------------------------------------------------------
CREATE TABLE "TeacherAssignment" (
    "id"             TEXT NOT NULL,
    "teacherId"      TEXT NOT NULL,
    "gradeId"        TEXT NOT NULL,
    "subjectId"      TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeacherAssignment_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_gradeId_fkey"
        FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_subjectId_fkey"
        FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_academicYearId_fkey"
        FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_gradeId_subjectId_academicYearId_key"
    ON "TeacherAssignment"("teacherId", "gradeId", "subjectId", "academicYearId");
CREATE INDEX "TeacherAssignment_teacherId_idx" ON "TeacherAssignment"("teacherId");
CREATE INDEX "TeacherAssignment_gradeId_idx" ON "TeacherAssignment"("gradeId");
CREATE INDEX "TeacherAssignment_subjectId_idx" ON "TeacherAssignment"("subjectId");
CREATE INDEX "TeacherAssignment_academicYearId_idx" ON "TeacherAssignment"("academicYearId");

-- -------------------------------------------------------------------------
-- Units  (syllabus entries — the core entity teachers submit)
--   status: DRAFT | SUBMITTED | APPROVED | REJECTED
--   term:   'Term 1' | 'Term 2'
-- -------------------------------------------------------------------------
CREATE TABLE "Unit" (
    "id"                 TEXT NOT NULL,
    "gradeId"            TEXT NOT NULL,
    "subjectId"          TEXT NOT NULL,
    "academicYearId"     TEXT NOT NULL,
    "term"               TEXT NOT NULL,
    "unitName"           TEXT NOT NULL,
    "topics"             TEXT NOT NULL,
    "learningObjectives" TEXT,
    "status"             TEXT NOT NULL DEFAULT 'DRAFT',
    "feedback"           TEXT,
    "createdById"        TEXT NOT NULL,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Unit_gradeId_fkey"
        FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Unit_subjectId_fkey"
        FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Unit_academicYearId_fkey"
        FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Unit_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Unit_gradeId_subjectId_term_unitName_academicYearId_key"
    ON "Unit"("gradeId", "subjectId", "term", "unitName", "academicYearId");
CREATE INDEX "Unit_gradeId_idx" ON "Unit"("gradeId");
CREATE INDEX "Unit_subjectId_idx" ON "Unit"("subjectId");
CREATE INDEX "Unit_academicYearId_idx" ON "Unit"("academicYearId");
CREATE INDEX "Unit_createdById_idx" ON "Unit"("createdById");
CREATE INDEX "Unit_status_idx" ON "Unit"("status");
CREATE INDEX "Unit_term_idx" ON "Unit"("term");

-- -------------------------------------------------------------------------
-- Notifications
--   Either recipientId (1:1 to a user) OR targetRoleId (broadcast to a role)
-- -------------------------------------------------------------------------
CREATE TABLE "Notification" (
    "id"          TEXT NOT NULL,
    "senderId"    TEXT NOT NULL,
    "recipientId" TEXT,
    "targetRoleId" TEXT,
    "title"       TEXT NOT NULL,
    "message"     TEXT NOT NULL,
    "isRead"      BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notification_senderId_fkey"
        FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_recipientId_fkey"
        FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_targetRoleId_fkey"
        FOREIGN KEY ("targetRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Notification_recipientId_idx" ON "Notification"("recipientId");
CREATE INDEX "Notification_targetRoleId_idx" ON "Notification"("targetRoleId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- -------------------------------------------------------------------------
-- Audit Log  (append-only system actions)
-- -------------------------------------------------------------------------
CREATE TABLE "AuditLog" (
    "id"        TEXT NOT NULL,
    "actorId"   TEXT,
    "action"    TEXT NOT NULL,
    "detail"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- -------------------------------------------------------------------------
-- Helpful view: per (grade, subject, term) submission rollup for the
-- coordinator status grid. Optional, but convenient for DBeaver queries.
-- -------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_status_grid AS
SELECT
    g."gradeNumber",
    g."displayName"   AS grade_display,
    s."name"          AS subject_name,
    s."code"          AS subject_code,
    u."term",
    COUNT(*)                                   AS total_units,
    COUNT(*) FILTER (WHERE u."status"='APPROVED')  AS approved,
    COUNT(*) FILTER (WHERE u."status"='SUBMITTED') AS submitted,
    COUNT(*) FILTER (WHERE u."status"='DRAFT')     AS draft,
    COUNT(*) FILTER (WHERE u."status"='REJECTED')  AS rejected
FROM "Grade" g
CROSS JOIN "Subject" s
LEFT JOIN "Unit" u
       ON u."gradeId" = g."id"
      AND u."subjectId" = s."id"
GROUP BY g."gradeNumber", g."displayName", s."name", s."code", u."term"
ORDER BY g."gradeNumber", s."name";

COMMIT;

-- =========================================================================
-- End of DDL
-- =========================================================================
