import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserWithRole, requireRole } from "@/lib/session";
import { hashPassword, ROLES } from "@/lib/auth";

const VALID_ROLES = new Set(Object.values(ROLES));

interface CsvRow {
  name: string;
  username: string;
  password: string;
  role: string;
  phone?: string;
  email?: string;
  department?: string;
  active?: string;
}

// Parse a single CSV line that may contain quoted fields with commas.
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserWithRole();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const check = requireRole(session.payload, ROLES.SUPERADMIN);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const body = await req.json();
  const csv: string = body.csv;
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "csv (string) required" }, { status: 400 });
  }

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  // Detect header row. Required columns: name, username, password, role.
  // Optional: phone, email, department, active.
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const required = ["name", "username", "password", "role"];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missing.join(", ")}. Expected: name, username, password, role, phone, email, department, active` },
      { status: 400 }
    );
  }
  const colIndex: Record<string, number> = {};
  header.forEach((h, i) => (colIndex[h] = i));

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    rows.push({
      name: cells[colIndex["name"]] ?? "",
      username: cells[colIndex["username"]] ?? "",
      password: cells[colIndex["password"]] ?? "",
      role: cells[colIndex["role"]] ?? "",
      phone: colIndex["phone"] !== undefined ? cells[colIndex["phone"]] : "",
      email: colIndex["email"] !== undefined ? cells[colIndex["email"]] : "",
      department: colIndex["department"] !== undefined ? cells[colIndex["department"]] : "",
      active: colIndex["active"] !== undefined ? cells[colIndex["active"]] : "",
    });
  }

  // Pre-load all roles + departments for fast lookups
  const allRoles = await db.role.findMany();
  const roleByName = new Map(allRoles.map((r) => [r.name, r]));
  const allDepartments = await db.department.findMany();
  const deptByName = new Map(allDepartments.map((d) => [d.name.toLowerCase(), d]));

  // Collect existing usernames to detect duplicates within the batch + DB
  const existingUsers = await db.user.findMany({ select: { username: true } });
  const existingUsernames = new Set(existingUsers.map((u) => u.username));
  const seenInBatch = new Set<string>();

  type ResultRow = {
    row: number;
    name: string;
    username: string;
    role: string;
    status: "created" | "skipped" | "error";
    message?: string;
  };
  const results: ResultRow[] = [];
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for header row
    const name = r.name.trim();
    const username = r.username.trim().toLowerCase();
    const password = r.password.trim();
    const role = r.role.trim();

    if (!name || !username || !password) {
      results.push({ row: rowNum, name, username, role, status: "error", message: "Missing name/username/password" });
      errors++;
      continue;
    }
    if (!VALID_ROLES.has(role)) {
      results.push({ row: rowNum, name, username, role, status: "error", message: `Invalid role '${role}'. Valid: ${Array.from(VALID_ROLES).join(", ")}` });
      errors++;
      continue;
    }
    const roleRecord = roleByName.get(role);
    if (!roleRecord) {
      results.push({ row: rowNum, name, username, role, status: "error", message: "Role not found in DB" });
      errors++;
      continue;
    }
    if (existingUsernames.has(username) || seenInBatch.has(username)) {
      results.push({ row: rowNum, name, username, role, status: "skipped", message: "Username already exists" });
      skipped++;
      seenInBatch.add(username);
      continue;
    }

    // Department lookup (only meaningful for HOD)
    let departmentId: string | null = null;
    if (r.department && r.department.trim()) {
      const dept = deptByName.get(r.department.trim().toLowerCase());
      if (!dept) {
        results.push({ row: rowNum, name, username, role, status: "error", message: `Department '${r.department}' not found` });
        errors++;
        continue;
      }
      departmentId = dept.id;
    }

    const activeVal = (r.active || "").trim().toLowerCase();
    const active = activeVal === "" ? true : !(activeVal === "false" || activeVal === "no" || activeVal === "0" || activeVal === "inactive");

    try {
      const phone = (r.phone || "").trim();
      const email = (r.email || "").trim().toLowerCase();
      await db.user.create({
        data: {
          name,
          username,
          passwordHash: await hashPassword(password),
          roleId: roleRecord.id,
          active,
          departmentId: role === ROLES.HOD ? departmentId : null,
          phone: phone || null,
          email: email || null,
        },
      });
      existingUsernames.add(username);
      seenInBatch.add(username);
      results.push({ row: rowNum, name, username, role, status: "created" });
      created++;
    } catch (e) {
      results.push({ row: rowNum, name, username, role, status: "error", message: (e as Error).message });
      errors++;
    }
  }

  await db.auditLog.create({
    data: {
      actorId: session.payload.userId,
      action: "USER_BULK_IMPORT",
      detail: `CSV import: ${created} created, ${skipped} skipped, ${errors} errors`,
    },
  });

  return NextResponse.json({ created, skipped, errors, total: rows.length, results }, { status: 201 });
}
