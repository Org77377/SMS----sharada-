import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "sharda-sms-dev-secret-change-in-prod-9f2c";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
  role: string;
  username: string;
  name: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "sms_token";

export const ROLES = {
  SUPERADMIN: "Superadmin",
  PRINCIPAL: "Principal",
  HOD: "HOD",
  EXAM_COORDINATOR: "Exam Coordinator",
  TECHNICAL_ADMIN: "Technical Admin",
  TEACHER: "Teacher",
} as const;

// Reviewer roles — HOD and Exam Coordinator share identical permissions
// (equivalent to the former "Coordinator" role).
export const REVIEWER_ROLES = [ROLES.HOD, ROLES.EXAM_COORDINATOR] as const;

// Roles that can submit syllabus (teachers + academic staff who also teach).
export const SUBMISSION_ROLES = [
  ROLES.TEACHER,
  ROLES.HOD,
  ROLES.EXAM_COORDINATOR,
  ROLES.PRINCIPAL,
] as const;

export const UNIT_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const TERMS = ["Term 1", "Term 2"] as const;
