"use client";

import { forwardRef } from "react";
import type { Chapter, CompiledDoc } from "@/lib/api";

interface Props {
  doc: CompiledDoc;
}

// Palette (hex only — html2canvas cannot parse Tailwind v4 oklch colors)
const C = {
  ink: "#0f172a",
  inkSoft: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  surface: "#f8fafc",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  white: "#ffffff",
};

function parseChapters(raw: string): Chapter[] {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as Chapter[];
  } catch {
    /* ignore */
  }
  return [];
}

export const CompiledDocView = forwardRef<HTMLDivElement, Props>(
  function CompiledDocView({ doc }, ref) {
    return (
      <div
        ref={ref}
        className="print-area mx-auto w-full max-w-4xl rounded-2xl p-8 shadow-sm sm:p-12"
        style={{ background: C.white, border: `1px solid ${C.line}` }}
      >
        {/* Header image — centered, top margin */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/school-header.png"
            alt="Sharada Public School"
            style={{
              display: "block",
              margin: "0 auto",
              height: "auto",
              maxHeight: 90,
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        </div>
        {/* Line after header — dark and thick for print visibility */}
        <div
          style={{
            margin: "14px 0 10px",
            height: 3,
            background: C.primaryDark,
            borderRadius: 1,
          }}
        />
        {/* Meta row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Academic Year {doc.academicYear}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {doc.term}
          </span>
        </div>
        {/* Grade title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: C.ink,
              letterSpacing: "-0.01em",
            }}
          >
            {doc.grade.displayName} — {doc.term}
          </h2>
          <div
            style={{
              margin: "8px auto 0",
              width: 60,
              height: 4,
              background: C.primaryDark,
              borderRadius: 2,
            }}
          />
        </div>

        {doc.subjects.length === 0 ? (
          <div
            style={{
              borderRadius: 10,
              border: `1px dashed #cbd5e1`,
              padding: "36px 16px",
              textAlign: "center",
              fontSize: 13,
              color: C.muted,
            }}
          >
            No approved syllabus entries have been compiled for this grade yet.
          </div>
        ) : (
          <div>
            {doc.subjects.map((s) => (
              <section
                key={s.subject.id}
                style={{ breakInside: "avoid", marginBottom: 28 }}
              >
                {/* Subject header bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                    padding: "8px 14px",
                    background: "linear-gradient(90deg,#eff6ff 0%,#f8fafc 100%)",
                    borderRadius: 8,
                    borderLeft: `4px solid ${C.primary}`,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.ink,
                    }}
                  >
                    {s.subject.name}
                  </h3>
                  <span
                    style={{
                      borderRadius: 5,
                      background: C.primary,
                      color: C.white,
                      padding: "2px 7px",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {s.subject.code}
                  </span>
                  {s.teacherName !== "—" && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: C.muted,
                      }}
                    >
                      Faculty: {s.teacherName}
                    </span>
                  )}
                </div>

                {s.terms.map((t) => {
                  const termUnits = t.units;
                  if (termUnits.length === 0) return null;
                  // Collect all chapters across all units of this term into one table
                  const allChapters: { chapter: string; topics: string; unitName: string }[] = [];
                  for (const u of termUnits) {
                    const chs = parseChapters(u.chapters);
                    for (const ch of chs) {
                      allChapters.push({
                        chapter: ch.chapter || "Untitled",
                        topics: ch.topics || "—",
                        unitName: u.unitName,
                      });
                    }
                  }
                  if (allChapters.length === 0) return null;
                  return (
                    <div
                      key={t.term}
                      style={{ marginBottom: 18, breakInside: "avoid" }}
                    >
                      {/* Term label */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                          padding: "5px 0",
                          borderBottom: `3px solid ${C.primaryDark}`,
                          width: "fit-content",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: C.primary,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: C.primaryDark,
                          }}
                        >
                          {t.term}
                        </span>
                      </div>

                      {/* 2-column table: Chapter | Topics */}
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 12,
                          breakInside: "avoid",
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "8px 12px",
                                background: C.primary,
                                color: C.white,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                borderBottom: `2px solid ${C.primaryDark}`,
                              }}
                            >
                              Chapter
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "8px 12px",
                                background: C.primary,
                                color: C.white,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                borderBottom: `2px solid ${C.primaryDark}`,
                              }}
                            >
                              Topics
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {allChapters.map((ch, ci) => (
                            <tr
                              key={ci}
                              style={{
                                background: ci % 2 === 0 ? C.surface : C.white,
                                breakInside: "avoid",
                              }}
                            >
                              <td
                                style={{
                                  padding: "8px 12px",
                                  fontWeight: 600,
                                  color: C.ink,
                                  borderBottom: `1px solid ${C.line}`,
                                  verticalAlign: "top",
                                  width: "35%",
                                }}
                              >
                                {ci + 1}. {ch.chapter}
                              </td>
                              <td
                                style={{
                                  padding: "8px 12px",
                                  color: C.inkSoft,
                                  borderBottom: `1px solid ${C.line}`,
                                  lineHeight: 1.5,
                                  verticalAlign: "top",
                                }}
                              >
                                {ch.topics}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}

        {/* Footer note */}
        <div
          style={{
            marginTop: 30,
            paddingTop: 14,
            borderTop: `1px solid ${C.line}`,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 10, color: C.faint }}>
            This compiled syllabus is auto-generated by the SMS portal of{" "}
            {doc.school.name}, {doc.school.city} {doc.school.pin}.
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 10, color: C.faint }}>
            © {new Date().getFullYear()} · Architected &amp; Developed by Omkar RG |
            Dept. of CS, Sharada Public School
          </p>
        </div>
      </div>
    );
  }
);
