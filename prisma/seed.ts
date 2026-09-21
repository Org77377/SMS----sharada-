import { db } from "../src/lib/db";
import { hashPassword, ROLES } from "../src/lib/auth";

const SUBJECTS = [
  { name: "Kannada", code: "KAN", dept: "Languages" },
  { name: "English", code: "ENG", dept: "Languages" },
  { name: "Hindi", code: "HIN", dept: "Languages" },
  { name: "Mathematics", code: "MAT", dept: "Science & Mathematics" },
  { name: "Science", code: "SCI", dept: "Science & Mathematics" },
  { name: "Computer Science", code: "CSC", dept: "Science & Mathematics" },
  { name: "Social Science", code: "SST", dept: "Social Sciences" },
  { name: "Physical Education", code: "PED", dept: "Co-curricular" },
  { name: "General Knowledge", code: "GK", dept: "Co-curricular" },
  { name: "Art", code: "ART", dept: "Co-curricular" },
];

const DEPARTMENTS = [
  "Languages",
  "Science & Mathematics",
  "Social Sciences",
  "Co-curricular",
];

async function main() {
  console.log("🌱 Seeding Sharada Public School SMS...");

  // Roles
  const roles = {} as Record<string, { id: string }>;
  for (const name of Object.values(ROLES)) {
    const role = await db.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roles[name] = role;
  }
  console.log("✓ Roles");

  // Departments
  const depts = {} as Record<string, { id: string }>;
  for (const name of DEPARTMENTS) {
    const d = await db.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    depts[name] = d;
  }
  console.log(`✓ ${DEPARTMENTS.length} departments`);

  // Grades 4..10
  const grades = {} as Record<number, { id: string }>;
  for (let g = 4; g <= 10; g++) {
    const grade = await db.grade.upsert({
      where: { gradeNumber: g },
      update: { displayName: `Grade ${g}` },
      create: { gradeNumber: g, displayName: `Grade ${g}` },
    });
    grades[g] = grade;
  }
  console.log("✓ Grades 4–10");

  // Subjects (with department link)
  for (const s of SUBJECTS) {
    await db.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, departmentId: depts[s.dept].id },
      create: { name: s.name, code: s.code, departmentId: depts[s.dept].id },
    });
  }
  const allSubjects = await db.subject.findMany({ include: { department: true } });
  console.log(`✓ ${allSubjects.length} subjects (linked to departments)`);

  // Academic year
  const ay = await db.academicYear.upsert({
    where: { year: "2025-2026" },
    update: { active: true },
    create: { year: "2025-2026", active: true },
  });
  console.log("✓ Academic year 2025-2026");

  // ---- Demo users ----
  // Default password for all demo accounts: sharada123
  const defaultPassword = await hashPassword("sharada123");

  const superadmin = await db.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      name: "System Administrator",
      username: "superadmin",
      passwordHash: defaultPassword,
      roleId: roles[ROLES.SUPERADMIN].id,
      phone: "+91 90000 00001",
      email: "superadmin@sharadaschool.edu.in",
      active: true,
    },
  });

  const principal = await db.user.upsert({
    where: { username: "principal" },
    update: {},
    create: {
      name: "Dr. Sumati Patil",
      username: "principal",
      passwordHash: defaultPassword,
      roleId: roles[ROLES.PRINCIPAL].id,
      phone: "+91 90000 00002",
      email: "principal@sharadaschool.edu.in",
      active: true,
    },
  });

  // HOD — assigned to the "Science & Mathematics" department
  const coordinator = await db.user.upsert({
    where: { username: "coordinator" },
    update: { name: "Mahadev Desai", roleId: roles[ROLES.HOD].id, departmentId: depts["Science & Mathematics"].id },
    create: {
      name: "Mahadev Desai",
      username: "coordinator",
      passwordHash: defaultPassword,
      roleId: roles[ROLES.HOD].id,
      departmentId: depts["Science & Mathematics"].id,
      phone: "+91 90000 00003",
      email: "hod.sci.math@sharadaschool.edu.in",
      active: true,
    },
  });
  // Exam Coordinator — same permissions as HOD (no department scoping)
  await db.user.upsert({
    where: { username: "examcoord" },
    update: { name: "Suresh Pujari", roleId: roles[ROLES.EXAM_COORDINATOR].id },
    create: {
      name: "Suresh Pujari",
      username: "examcoord",
      passwordHash: defaultPassword,
      roleId: roles[ROLES.EXAM_COORDINATOR].id,
      phone: "+91 90000 00004",
      email: "examcoord@sharadaschool.edu.in",
      active: true,
    },
  });
  console.log("✓ Admin / Principal / HOD / Exam Coordinator users");

  // Technical Admin — restricted admin; proposes teacher changes (needs Principal approval)
  await db.user.upsert({
    where: { username: "techadmin" },
    update: { name: "Tech Admin", roleId: roles[ROLES.TECHNICAL_ADMIN].id },
    create: {
      name: "Tech Admin",
      username: "techadmin",
      passwordHash: defaultPassword,
      roleId: roles[ROLES.TECHNICAL_ADMIN].id,
      phone: "+91 90000 00005",
      email: "techadmin@sharadaschool.edu.in",
      active: true,
    },
  });
  console.log("✓ Technical Admin user");

  // Teachers with assignments. password: sharada123 for all.
  const teachers = [
    { name: "Omkar RG", username: "omkar", subject: "Computer Science", grades: [6, 7, 8, 9, 10], phone: "+91 98765 43210", email: "omkar.rg@sharadaschool.edu.in" },
    { name: "Lakshmi Joshi", username: "lakshmi", subject: "Mathematics", grades: [4, 5, 6], phone: "+91 98765 43211", email: "lakshmi.j@sharadaschool.edu.in" },
    { name: "Ramesh Kulkarni", username: "ramesh", subject: "Science", grades: [7, 8, 9], phone: "+91 98765 43212", email: "ramesh.k@sharadaschool.edu.in" },
    { name: "Geeta Nadagouda", username: "geeta", subject: "English", grades: [4, 5, 6, 7], phone: "+91 98765 43213", email: "geeta.n@sharadaschool.edu.in" },
    { name: "Suresh Hiremath", username: "suresh", subject: "Social Science", grades: [8, 9, 10], phone: "+91 98765 43214", email: "suresh.h@sharadaschool.edu.in" },
    { name: "Anita Bommanahalli", username: "anita", subject: "Kannada", grades: [5, 6, 7, 8], phone: "+91 98765 43215", email: "anita.b@sharadaschool.edu.in" },
    { name: "Vijay Mahantesh", username: "vijay", subject: "Hindi", grades: [4, 5, 6], phone: "+91 98765 43216", email: "vijay.m@sharadaschool.edu.in" },
    { name: "Padma Athani", username: "padma", subject: "Mathematics", grades: [7, 8, 9, 10], phone: "+91 98765 43217", email: "padma.a@sharadaschool.edu.in" },
    { name: "Nagaraj Badami", username: "nagaraj", subject: "Science", grades: [4, 5, 6], phone: "+91 98765 43218", email: "nagaraj.b@sharadaschool.edu.in" },
    { name: "Shobha Ilkal", username: "shobha", subject: "Computer Science", grades: [4, 5], phone: "+91 98765 43219", email: "shobha.i@sharadaschool.edu.in" },
  ];

  for (const t of teachers) {
    const user = await db.user.upsert({
      where: { username: t.username },
      update: { name: t.name, roleId: roles[ROLES.TEACHER].id, phone: t.phone, email: t.email },
      create: {
        name: t.name,
        username: t.username,
        passwordHash: defaultPassword,
        roleId: roles[ROLES.TEACHER].id,
        phone: t.phone,
        email: t.email,
        active: true,
      },
    });
    const subject = allSubjects.find((s) => s.name === t.subject)!;
    for (const g of t.grades) {
      await db.teacherAssignment.upsert({
        where: {
          teacherId_gradeId_subjectId_academicYearId: {
            teacherId: user.id,
            gradeId: grades[g].id,
            subjectId: subject.id,
            academicYearId: ay.id,
          },
        },
        update: {},
        create: {
          teacherId: user.id,
          gradeId: grades[g].id,
          subjectId: subject.id,
          academicYearId: ay.id,
        },
      });
    }
  }
  console.log(`✓ ${teachers.length} teachers with assignments`);

  // Sample submitted units for a teacher (Omkar - Computer Science, Grade 8)
  const omkar = await db.user.findUnique({ where: { username: "omkar" } });
  const csSubject = allSubjects.find((s) => s.name === "Computer Science")!;
  if (omkar) {
    await db.unit.create({
      data: {
        gradeId: grades[8].id,
        subjectId: csSubject.id,
        academicYearId: ay.id,
        term: "Term 1",
        unitName: "Computer Fundamentals",
        chapters: JSON.stringify([
          { chapter: "History of Computers", topics: "Generations, characteristics, abacus to modern computers" },
          { chapter: "Computer Architecture", topics: "Input, Process, Output, Storage; CPU, ALU, Control Unit" },
          { chapter: "Memory", topics: "RAM, ROM, Cache, Secondary storage" },
        ]),
        status: "SUBMITTED",
        createdById: omkar.id,
      },
    });
    await db.unit.create({
      data: {
        gradeId: grades[8].id,
        subjectId: csSubject.id,
        academicYearId: ay.id,
        term: "Term 1",
        unitName: "Operating Systems & Windows",
        chapters: JSON.stringify([
          { chapter: "Operating System Basics", topics: "Definition, functions, types of OS, booting" },
          { chapter: "Windows Desktop", topics: "Desktop, icons, taskbar, start menu, control panel" },
          { chapter: "File Management", topics: "Files, folders, creating, copying, moving, deleting" },
        ]),
        status: "APPROVED",
        createdById: omkar.id,
      },
    });
    await db.unit.create({
      data: {
        gradeId: grades[8].id,
        subjectId: csSubject.id,
        academicYearId: ay.id,
        term: "Term 1",
        unitName: "Word Processing (MS Word)",
        chapters: JSON.stringify([
          { chapter: "Introduction to Word Processing", topics: "Creating, saving, opening documents" },
          { chapter: "Formatting", topics: "Text, paragraphs, lists, tables, images" },
        ]),
        status: "DRAFT",
        createdById: omkar.id,
      },
    });
    // Term 2 unit so "All Terms" shows both Term 1 and Term 2
    await db.unit.create({
      data: {
        gradeId: grades[8].id,
        subjectId: csSubject.id,
        academicYearId: ay.id,
        term: "Term 2",
        unitName: "HTML & CSS Basics",
        chapters: JSON.stringify([
          { chapter: "HTML Structure", topics: "Tags, attributes, elements, headings, paragraphs" },
          { chapter: "Links & Lists", topics: "Hyperlinks, ordered/unordered lists, images" },
          { chapter: "CSS Basics", topics: "Selectors, properties, colors, fonts, box model" },
        ]),
        status: "APPROVED",
        createdById: omkar.id,
      },
    });
  }
  console.log("✓ Sample syllabus units (draft/submitted/approved)");

  // Welcome notification
  await db.notification.create({
    data: {
      senderId: principal.id,
      targetRoleId: roles[ROLES.TEACHER].id,
      title: "Welcome to SMS 2025-26",
      message:
        "Dear teachers, please complete and submit your syllabus details for Term 1 by the end of this week. — Principal's Office",
    },
  });
  console.log("✓ Welcome notification");

  console.log("\n=== Seed complete ===");
  console.log("Login credentials (password for all): sharada123");
  console.log("  superadmin / principal / coordinator / examcoord / techadmin / omkar / lakshmi / ramesh ...");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
