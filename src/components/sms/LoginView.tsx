"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, User, Loader2 } from "lucide-react";
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
      <main className="flex flex-1 items-stretch">
        {/* Left: Aesthetic hero with school name + background overlay */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex"
        >
          {/* Background image overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.18]"
            style={{ backgroundImage: "url(/school-header.png)" }}
          />
          {/* Gradient wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/85 to-indigo-800/90" />
          {/* Subtle radial highlights */}
          <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-10 bottom-1/4 h-80 w-80 rounded-full bg-sky-300/15 blur-3xl" />

          {/* Big school name with layered overlay text */}
          <div className="relative z-10 px-12 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20, letterSpacing: "0.3em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0em" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-6xl font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl xl:text-7xl"
            >
              Sharada
              <br />
              <span className="bg-gradient-to-r from-white via-blue-50 to-sky-200 bg-clip-text text-transparent">
                Public School
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-5 text-base font-medium tracking-[0.35em] text-blue-100/80 uppercase"
            >
              Vijayapura · 586-109
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="mt-2 text-sm font-light tracking-widest text-blue-200/70 uppercase"
            >
              Syllabus Management System
            </motion.p>
          </div>

          {/* Looping credit animation at bottom */}
          <div className="absolute bottom-8 left-0 right-0 z-10 text-center">
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-[11px] font-light tracking-wider text-blue-100/70"
            >
              © {new Date().getFullYear()} · Crafted by Omkar RG
            </motion.p>
          </div>
        </motion.section>

        {/* Right: login card */}
        <div className="flex w-full max-w-md items-center justify-center px-4 py-10 sm:py-16 lg:max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
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

              {/* Mobile-only credit (hidden on lg where hero shows it) */}
              <p className="mt-6 text-center text-[11px] font-light text-slate-400 lg:hidden">
                © {new Date().getFullYear()} · Crafted by Omkar RG
              </p>
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
