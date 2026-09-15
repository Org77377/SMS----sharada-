"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Lock, User, Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { api, type AuthUser } from "@/lib/api";

const DEMO_ACCOUNTS = [
  { role: "Superadmin", username: "superadmin", desc: "Full system control" },
  { role: "Principal", username: "principal", desc: "Review & broadcast" },
  { role: "Coordinator", username: "coordinator", desc: "Compile & approve" },
  { role: "Teacher", username: "omkar", desc: "Submit syllabus" },
];

export function LoginView({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await api.login(username, password);
      onLogin(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function quickFill(u: string) {
    setUsername(u);
    setPassword("sharada123");
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Top brand bar */}
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">SMS</p>
            <p className="text-xs text-slate-500">
              Sharada Public School · Vijayapura 586-109
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left: hero */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden flex-col gap-6 lg:flex"
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <BookOpen className="h-3.5 w-3.5" /> Syllabus Management System
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900">
                One place for the entire school&apos;s syllabus.
              </h1>
              <p className="mt-3 text-base text-slate-600">
                Teachers submit, coordinators compile, principals approve — a clean,
                print-ready syllabus for every grade.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Role-based dashboards for 108+ staff",
                "Term-wise syllabus tracking (Grades 4–10)",
                "Review, approve & return with feedback",
                "One-click compiled PDF / print-ready output",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: login card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md"
          >
            <Card className="border-slate-200/80 p-6 shadow-xl shadow-slate-200/50 sm:p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                  <Lock className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Sign in to SMS
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use your staff credentials to continue
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="username"
                      className="pl-9"
                      placeholder="e.g. omkar"
                      value={username}
                      autoComplete="username"
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-9"
                      placeholder="••••••••"
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sign in
                </Button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="mb-2 text-center text-xs font-medium text-slate-400">
                  Demo accounts · password{" "}
                  <span className="font-mono text-slate-600">sharada123</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.username}
                      type="button"
                      onClick={() => quickFill(a.username)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                    >
                      <p className="text-xs font-semibold text-slate-700">
                        {a.role}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        @{a.username}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200/60 bg-white/70 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-[11px] text-slate-400">
            Architected &amp; Developed by{" "}
            <span className="font-semibold text-slate-600">Omkar RG</span> | Dept.
            of CS, Sharada Public School
          </p>
        </div>
      </footer>
    </div>
  );
}
