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
  surface: "#f1f5f9",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  white: "#ffffff",
  amber: "#fefce8",
  amberText: "#713f12",
  amberBorder: "#ca8a04",
};

function splitTopics(raw: string): string[] {
  return raw
    .split(/[\n\r]+|,(?=\s)/)
    .map((t) => t.replace(/^\s*[-•·*\d.)\]]+\s*/, "").trim())
    .filter((t) => t.length > 0);
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
        {/* Line after header */}
        <div
          style={{
            margin: "14px 0 10px",
            height: 2,
            background: C.primary,
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
            {doc.grade.displayName} — Annual Syllabus
          </h2>
          <div
            style={{
              margin: "8px auto 0",
              width: 60,
              height: 3,
              background: C.primary,
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
                style={{ breakInside: "avoid", marginBottom: 24 }}
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

                {s.terms.map((t) => (
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
                        borderBottom: `2px solid ${C.primary}`,
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

                    {t.units.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          padding: "8px 14px",
                          fontSize: 12,
                          fontStyle: "italic",
                          color: C.faint,
                        }}
                      >
                        No units published for this term.
                      </p>
                    ) : (
                      t.units.map((u, i) => {
                        const topics = splitTopics(u.topics);
                        return (
                          <div
                            key={u.id}
                            style={{
                              breakInside: "avoid",
                              marginBottom: 14,
                              border: `1px solid ${C.line}`,
                              borderRadius: 8,
                              overflow: "hidden",
                            }}
                          >
                            {/* Unit header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 12px",
                                background: "#eff6ff",
                                borderBottom: `1px solid ${C.line}`,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-grid",
                                  placeItems: "center",
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  background: C.primary,
                                  color: C.white,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {i + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: C.ink,
                                }}
                              >
                                {u.unitName}
                              </span>
                            </div>
                            {/* Unit body */}
                            <div style={{ padding: "10px 12px" }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: C.muted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                }}
                              >
                                Topics
                              </span>
                              <div style={{ marginTop: 8 }}>
                                {topics.map((tp, ti) => (
                                  <div
                                    key={ti}
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 8,
                                      padding: "6px 10px",
                                      marginBottom: 3,
                                      background: C.surface,
                                      borderRadius: 5,
                                      borderLeft: `3px solid ${C.primary}`,
                                    }}
                                  >
                                    <span
                                      style={{
                                        flex: "0 0 auto",
                                        minWidth: 18,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: C.primary,
                                        textAlign: "right",
                                      }}
                                    >
                                      {ti + 1}
                                    </span>
                                    <span
                                      style={{
                                        flex: 1,
                                        fontSize: 12,
                                        lineHeight: 1.5,
                                        color: C.inkSoft,
                                      }}
                                    >
                                      {tp}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {u.learningObjectives && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    padding: "7px 10px",
                                    background: C.amber,
                                    borderRadius: 5,
                                    borderLeft: `3px solid ${C.amberBorder}`,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#854d0e",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    Objectives
                                  </span>
                                  <p
                                    style={{
                                      margin: "3px 0 0",
                                      fontSize: 11.5,
                                      lineHeight: 1.5,
                                      color: C.amberText,
                                    }}
                                  >
                                    {u.learningObjectives}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
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
