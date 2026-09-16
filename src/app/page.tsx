"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, LayoutDashboard, Settings2 } from "lucide-react";
import { AppShell } from "@/components/sms/AppShell";
import { LoginView } from "@/components/sms/LoginView";
import { TeacherDashboard } from "@/components/sms/TeacherDashboard";
import { CoordinatorDashboard } from "@/components/sms/CoordinatorDashboard";
import { SuperadminDashboard } from "@/components/sms/SuperadminDashboard";
import { NotificationPanel } from "@/components/sms/NotificationPanel";
import {
  api,
  type AuthUser,
  type NotificationItem,
} from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [superadminView, setSuperadminView] = useState<"management" | "review">(
    "management"
  );

  const bootstrap = useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
      if (user) await loadNotifications();
    } catch {
      setUser(null);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await api.notifications();
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  async function handleLogin(u: AuthUser) {
    setUser(u);
    setBootstrapping(false);
    await loadNotifications();
    toast.success(`Welcome, ${u.name.split(" ")[0]}!`);
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setSuperadminView("management");
    toast.success("Signed out");
  }

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.markNotificationRead(id);
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.markAllRead();
    } catch {
      // ignore
    }
  }

  if (bootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm">Loading SMS…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  // Superadmin can toggle between management & review console
  const isSuperadmin = user.role === "Superadmin";
  const rightSlot = isSuperadmin ? (
    <div className="hidden items-center gap-1 rounded-xl bg-slate-100 p-1 sm:flex">
      <Button
        size="sm"
        variant={superadminView === "management" ? "default" : "ghost"}
        className={`h-8 gap-1.5 ${
          superadminView === "management"
            ? "bg-white text-slate-900 shadow-sm hover:bg-white"
            : "text-slate-500 hover:bg-transparent"
        }`}
        onClick={() => setSuperadminView("management")}
      >
        <Settings2 className="h-3.5 w-3.5" /> Management
      </Button>
      <Button
        size="sm"
        variant={superadminView === "review" ? "default" : "ghost"}
        className={`h-8 gap-1.5 ${
          superadminView === "review"
            ? "bg-white text-slate-900 shadow-sm hover:bg-white"
            : "text-slate-500 hover:bg-transparent"
        }`}
        onClick={() => setSuperadminView("review")}
      >
        <LayoutDashboard className="h-3.5 w-3.5" /> Review Console
      </Button>
    </div>
  ) : undefined;

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      onOpenNotifications={() => {
        setNotifOpen(true);
        // User-initiated refresh — no auto-polling
        loadNotifications();
      }}
      onLogout={handleLogout}
      rightSlot={rightSlot}
    >
      {user.role === "Teacher" && <TeacherDashboard user={user} />}
      {(user.role === "Coordinator" || user.role === "Principal") && (
        <CoordinatorDashboard user={user} />
      )}
      {user.role === "Superadmin" &&
        (superadminView === "management" ? (
          <SuperadminDashboard user={user} />
        ) : (
          <CoordinatorDashboard user={user} />
        ))}
      <NotificationPanel
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </AppShell>
  );
}
