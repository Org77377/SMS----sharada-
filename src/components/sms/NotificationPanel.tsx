"use client";

import { useEffect } from "react";
import { Bell, CheckCheck, Megaphone, Mail } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDate, type NotificationItem } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationPanel({
  open,
  onOpenChange,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: Props) {
  useEffect(() => {
    // When opened with unread items, mark them read after a short delay
    if (!open) return;
    const t = setTimeout(() => {
      const unread = notifications.filter((n) => !n.isRead);
      if (unread.length > 0) onMarkAllRead();
    }, 1500);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-slate-900">
              <Bell className="h-4 w-4 text-blue-600" /> Notifications
            </SheetTitle>
            {notifications.some((n) => !n.isRead) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-blue-600 hover:bg-blue-50"
                onClick={onMarkAllRead}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Updates from coordinators, principals and the system.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 sms-scroll">
          <div className="flex flex-col">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  You&apos;re all caught up
                </p>
                <p className="text-xs text-slate-400">
                  No notifications right now.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isBroadcast = !n.recipientId && n.targetRoleId;
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.isRead && onMarkRead(n.id)}
                    className={`flex gap-3 border-b border-slate-50 px-5 py-4 text-left transition hover:bg-slate-50/70 ${
                      !n.isRead ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        isBroadcast
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {isBroadcast ? (
                        <Megaphone className="h-4 w-4" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-sm ${
                            !n.isRead
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-700"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {n.message}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {n.sender ? n.sender.name : "System"}
                        </span>
                        {isBroadcast && (
                          <Badge
                            variant="secondary"
                            className="h-4 bg-amber-50 px-1.5 text-[10px] text-amber-700"
                          >
                            Broadcast
                          </Badge>
                        )}
                        <span className="text-[11px] text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
