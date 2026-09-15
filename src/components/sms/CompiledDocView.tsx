"use client";

import { forwardRef } from "react";
import type { CompiledDoc } from "@/lib/api";

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

export const CompiledDocView = forwardRef<HTMLDivElement, Props>(
  function CompiledDocView({ doc }, ref) {
    return (
      <div
        ref={ref}
        className="print-area mx-auto w-full max-w-4xl rounded-2xl p-8 shadow-sm sm:p-12"
        style={{ background: C.white, border: `1px solid ${C.line}` }}
      >
        {/* Letterhead */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            paddingBottom: "20px",
            borderBottom: `2px solid ${C.primary}`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: C.primary,
              color: C.white,
              display: "grid",
              placeItems: "center",
              boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: C.ink,
                letterSpacing: "-0.01em",
              }}
            >
              {doc.school.name}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.inkSoft }}>
              {doc.school.city} — {doc.school.pin} · Karnataka, India
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: C.muted }}>
            <p style={{ margin: 0, fontWeight: 600, color: C.inkSoft }}>
              Academic Year
            </p>
            <p style={{ margin: 0 }}>{doc.academicYear}</p>
          </div>
        </div>

        {/* Title */}
        <div style={{ margin: "24px 0", textAlign: "center" }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: C.ink,
            }}
          >
            {doc.grade.displayName} — Annual Syllabus
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>
            {doc.term} · Compiled for parent reference
          </p>
        </div>

        {doc.subjects.length === 0 ? (
          <div
            style={{
              borderRadius: 12,
              border: `1px dashed ${C.line}`,
              padding: "40px 16px",
              textAlign: "center",
              fontSize: 13,
              color: C.muted,
            }}
          >
            No approved syllabus entries have been compiled for this grade yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {doc.subjects.map((s) => {
              const totalUnits = s.terms.reduce(
                (acc, t) => acc + t.units.length,
                0
              );
              return (
                <section key={s.subject.id} style={{ breakInside: "avoid" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 600,
                        color: C.ink,
                      }}
                    >
                      {s.subject.name}
                    </h3>
                    <span
                      style={{
                        borderRadius: 6,
                        background: "#eff6ff",
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 500,
                        color: C.primaryDark,
                      }}
                    >
                      {s.subject.code}
                    </span>
                    {s.teacherName !== "—" && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 12,
                          color: C.muted,
                        }}
                      >
                        Faculty: {s.teacherName}
                      </span>
                    )}
                  </div>

                  {s.terms.map((t) => (
                    <div key={t.term} style={{ marginBottom: 16, breakInside: "avoid" }}>
                      <h4
                        style={{
                          margin: "0 0 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: C.primaryDark,
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
                        {t.term}
                      </h4>
                      {t.units.length === 0 ? (
                        <p
                          style={{
                            margin: "0 0 0 16px",
                            fontSize: 12,
                            fontStyle: "italic",
                            color: C.faint,
                          }}
                        >
                          No units published for this term.
                        </p>
                      ) : (
                        <ol
                          style={{
                            margin: 0,
                            paddingLeft: 16,
                            listStyle: "none",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          {t.units.map((u, i) => (
                            <li
                              key={u.id}
                              style={{
                                breakInside: "avoid",
                                borderRadius: 8,
                                border: `1px solid ${C.line}`,
                                background: C.surface,
                                padding: 12,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 8,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: C.primaryDark,
                                  }}
                                >
                                  {i + 1}.
                                </span>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: C.ink,
                                  }}
                                >
                                  {u.unitName}
                                </span>
                              </div>
                              <div
                                style={{
                                  marginTop: 4,
                                  marginLeft: 20,
                                  fontSize: 12,
                                  lineHeight: 1.6,
                                  color: C.inkSoft,
                                }}
                              >
                                <p style={{ margin: "0 0 4px" }}>
                                  <span
                                    style={{ fontWeight: 600, color: C.ink }}
                                  >
                                    Topics:{" "}
                                  </span>
                                  {u.topics}
                                </p>
                                {u.learningObjectives && (
                                  <p style={{ margin: 0 }}>
                                    <span
                                      style={{ fontWeight: 600, color: C.ink }}
                                    >
                                      Objectives:{" "}
                                    </span>
                                    {u.learningObjectives}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
                  {totalUnits === 0 && (
                    <p style={{ fontSize: 12, fontStyle: "italic", color: C.faint }}>
                      No approved units.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div
          style={{
            marginTop: 40,
            borderTop: `1px solid ${C.line}`,
            paddingTop: 16,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: C.faint }}>
            This compiled syllabus is auto-generated by the SMS portal of{" "}
            {doc.school.name}, {doc.school.city} {doc.school.pin}.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: C.faint }}>
            Architected &amp; Developed by Omkar RG | Dept. of CS, Sharada Public
            School
          </p>
        </div>
      </div>
    );
  }
);
