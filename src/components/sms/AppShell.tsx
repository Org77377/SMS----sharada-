"use client";

import { GraduationCap, Bell, LogOut, Menu } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { AuthUser, Role } from "@/lib/api";

interface AppShellProps {
  user: AuthUser;
  unreadCount: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const ROLE_BADGE: Record<Role, string> = {
  Superadmin: "bg-violet-100 text-violet-700",
  Principal: "bg-blue-100 text-blue-700",
  HOD: "bg-cyan-100 text-cyan-700",
  "Exam Coordinator": "bg-teal-100 text-teal-700",
  "Technical Admin": "bg-indigo-100 text-indigo-700",
  Teacher: "bg-emerald-100 text-emerald-700",
};

export function AppShell({
  user,
  unreadCount,
  onOpenNotifications,
  onLogout,
  children,
  rightSlot,
}: AppShellProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="sms-app-shell-header sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20"
            >
              <GraduationCap className="h-5 w-5" />
            </motion.div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  SMS
                </span>
                <Badge
                  variant="secondary"
                  className={`hidden sm:inline-flex ${ROLE_BADGE[user.role]} border-0`}
                >
                  {user.role}
                </Badge>
              </div>
              <p className="truncate text-xs text-slate-500">
                Sharada Public School · Vijayapura 586-109
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {rightSlot}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-xl"
              onClick={onOpenNotifications}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100">
                  <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left leading-tight sm:block">
                    <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs font-normal text-slate-500">
                    {user.role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-1 px-4 py-3 text-center sm:px-6">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              Sharada Public School, Vijayapura 586-109
            </span>{" "}
            · Syllabus Management System (SMS)
          </p>
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

export { Menu };
