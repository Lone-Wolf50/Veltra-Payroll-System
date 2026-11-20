"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Users,
  Database,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  ConnectionState,
  getWorkforceSizeMode,
  setWorkforceSizeMode,
  getAnomalies,
  getLeaveRequests,
} from "@/lib/data";
import { Role, canAccessRoute } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function Topbar({
  onOpenMobileMenu,
  globalSearch,
  onGlobalSearchChange,
}: {
  onOpenMobileMenu: () => void;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const {
    user,
    allUsers,
    signInAsUser,
    signOut,
    connectionState,
    pendingSyncCount,
    setSimulatedConnectionState,
  } = useAuth();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [connMenuOpen, setConnMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const connMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (connMenuRef.current && !connMenuRef.current.contains(e.target as Node)) {
        setConnMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const workforceMode = getWorkforceSizeMode();
  const canSeePayrollNotifications =
    user.role === "HR/Payroll" || user.role === "Finance";
  const canSeeLeaveApprovals =
    user.role === "Supervisor" || user.role === "HR/Payroll";
  const openAnomalies = canSeePayrollNotifications
    ? getAnomalies("run-2026-11").filter((a) => a.status === "Needs review")
    : [];
  const pendingLeaves = canSeeLeaveApprovals
    ? getLeaveRequests().filter((l) => l.status === "Pending")
    : [];
  const notifCount = openAnomalies.length + pendingLeaves.length;

  const renderConnectionBadge = () => {
    switch (connectionState) {
      case "online":
        return (
          <span
            style={{
              backgroundColor: "var(--status-green-bg)",
              color: "var(--status-green-fg)",
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--status-green-fg)" }}
            />
            <span>Online</span>
          </span>
        );
      case "offline":
        return (
          <span
            style={{
              backgroundColor: "var(--status-amber-bg)",
              color: "var(--status-amber-fg)",
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          >
            <WifiOff className="h-3.5 w-3.5" />
            <span>Offline</span>
          </span>
        );
      case "syncing":
        return (
          <span
            style={{
              backgroundColor: "var(--primary-soft)",
              color: "var(--primary)",
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Syncing {pendingSyncCount || 3} items</span>
          </span>
        );
      case "sync_done":
        return (
          <span
            style={{
              backgroundColor: "var(--status-green-bg)",
              color: "var(--status-green-fg)",
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Sync done</span>
          </span>
        );
      case "sync_failed":
        return (
          <span
            style={{
              backgroundColor: "var(--status-red-bg)",
              color: "var(--status-red-fg)",
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Sync failed</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-20 flex flex-col bg-surface border-b border-border no-print">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: Mobile hamburger + Global search */}
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden rounded-lg p-2 text-muted hover:bg-page hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {user.role !== "Employee" && (
            <div className="relative w-full">
              <label htmlFor="topbar-global-search" className="sr-only">
                Search employees, staff IDs, or departments
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="topbar-global-search"
                type="search"
                value={globalSearch}
                onChange={(e) => onGlobalSearchChange(e.target.value)}
                placeholder="Search employee, staff ID, department..."
                className="w-full rounded-lg border border-border bg-page pl-9 pr-3 py-1.5 text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
        </div>

        {/* Right: Connection indicator, Workforce scale toggle, Notifications, Theme toggle, User menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Connection status + Developer Offline Simulator (PRD Section 10) */}
          <div className="relative" ref={connMenuRef}>
            <button
              type="button"
              onClick={() => setConnMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Connection status & offline state simulator"
            >
              {renderConnectionBadge()}
            </button>

            {connMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-card border border-border bg-surface p-3 shadow-lg z-50">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-semibold text-text">
                    Connection & Sync Simulator
                  </span>
                  <span className="text-[11px] text-muted">Demo Toggle</span>
                </div>
                <p className="text-xs text-muted mt-2 mb-2.5">
                  Simulate every connection and sync state from PRD Section 10:
                </p>
                <div className="space-y-1">
                  {(
                    [
                      { id: "online", label: "Online (Normal use)" },
                      { id: "offline", label: "Offline (Amber banner, locks live actions)" },
                      { id: "syncing", label: "Syncing (Spinner & item count)" },
                      { id: "sync_done", label: "Sync done (Confirmation toast)" },
                      { id: "sync_failed", label: "Sync failed (Red notice & Retry)" },
                    ] as { id: ConnectionState; label: string }[]
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSimulatedConnectionState(st.id);
                        setConnMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                        connectionState === st.id
                          ? "bg-primary-soft text-primary font-semibold"
                          : "text-text hover:bg-page"
                      )}
                    >
                      <span>{st.label}</span>
                      {connectionState === st.id && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Workforce scale toggle (60 vs 2,836 employees - PRD 11.2 & 14) */}
                <div className="mt-3 pt-2.5 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text mb-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    <span>Dataset Size (Sunda Scale Test)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWorkforceSizeMode("standard_60")}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium border",
                        workforceMode === "standard_60"
                          ? "border-primary bg-primary-soft text-primary font-semibold"
                          : "border-border bg-page text-muted hover:text-text"
                      )}
                    >
                      60 Employees
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkforceSizeMode("sunda_2836")}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium border",
                        workforceMode === "sunda_2836"
                          ? "border-primary bg-primary-soft text-primary font-semibold"
                          : "border-border bg-page text-muted hover:text-text"
                      )}
                    >
                      2,836 Workforce
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications button */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-lg p-2 text-muted hover:bg-page hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: "var(--status-red-fg)" }}
                />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-card border border-border bg-surface p-3 shadow-lg z-50">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-semibold text-text">Notifications</span>
                  <span className="text-[11px] text-muted">
                    {notifCount > 0 ? `${notifCount} pending` : "All caught up"}
                  </span>
                </div>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {canSeePayrollNotifications && (
                    <>
                      <div className="rounded-lg bg-page p-2.5 text-xs">
                        <div className="font-semibold text-text">
                          Nov 2026 Payroll Deadline in 2 Days
                        </div>
                        <p className="text-muted mt-0.5">
                          Cutoff is 05 Nov 2026. {openAnomalies.length} records are flagged for review.
                        </p>
                      </div>
                      <div className="rounded-lg bg-page p-2.5 text-xs">
                        <div className="font-semibold text-text">
                          Stage 1 Approval Completed
                        </div>
                        <p className="text-muted mt-0.5">
                          Kofi Owusu (Supervisor) approved the Nov 2026 run.
                        </p>
                      </div>
                    </>
                  )}
                  {canSeeLeaveApprovals && pendingLeaves.length > 0 && (
                    <div className="rounded-lg bg-page p-2.5 text-xs">
                      <div className="font-semibold text-text">
                        {pendingLeaves.length} Pending Leave Application
                        {pendingLeaves.length === 1 ? "" : "s"}
                      </div>
                      <p className="text-muted mt-0.5">
                        Review staff leave requests in Leave Applications.
                      </p>
                    </div>
                  )}
                  {!canSeePayrollNotifications &&
                    !(canSeeLeaveApprovals && pendingLeaves.length > 0) && (
                      <div className="rounded-lg bg-page p-2.5 text-xs text-muted">
                        No new notifications for your account.
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Theme quick button (Light / Dark / System) */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 text-muted hover:bg-page hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Toggle light or dark theme"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-amber-400" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          )}

          {/* User Menu with Role Switcher & Theme Chooser (PRD Section 2, 6, 7.1) */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-page px-2.5 py-1.5 text-left hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {user.avatarInitials}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-semibold text-text">{user.name}</div>
                <div className="text-[11px] text-muted">{user.role}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-card border border-border bg-surface p-3 shadow-lg z-50">
                {/* Signed in as */}
                <div className="pb-2.5 border-b border-border">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                    Signed in as
                  </p>
                  <p className="text-sm font-semibold text-text mt-0.5">{user.name}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                  <span
                    style={{
                      backgroundColor: "var(--primary-soft)",
                      color: "var(--primary)",
                    }}
                    className="mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  >
                    Role: {user.role}
                  </span>
                </div>

                {/* Theme selector: Light, Dark, System */}
                {mounted && (
                  <div className="py-2.5 border-b border-border">
                    <p className="text-xs font-semibold text-text mb-1.5">
                      Appearance Theme
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "light", label: "Light", icon: Sun },
                        { id: "dark", label: "Dark", icon: Moon },
                        { id: "system", label: "System", icon: Monitor },
                      ].map((t) => {
                        const Icon = t.icon;
                        const active = theme === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t.id)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium border transition-colors",
                              active
                                ? "border-primary bg-primary-soft text-primary font-semibold"
                                : "border-border bg-page text-muted hover:text-text"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Role Switcher for Demo */}
                <div className="py-2.5 border-b border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text mb-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Switch Demo Role</span>
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {allUsers.map((u) => {
                      const active = u.id === user.id;
                      const isNewlyAdded = u.id.startsWith("usr-emp-");
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            signInAsUser(u.id);
                            setUserMenuOpen(false);
                            if (!canAccessRoute(u.role, pathname)) {
                              router.replace("/dashboard");
                            }
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors text-left gap-2",
                            active
                              ? "bg-primary-soft text-primary font-semibold"
                              : "text-text hover:bg-page"
                          )}
                        >
                          <span className="truncate">
                            {u.name} <span className="text-muted">({u.role})</span>
                            {isNewlyAdded && (
                              <span
                                style={{
                                  backgroundColor: "var(--status-green-bg)",
                                  color: "var(--status-green-fg)",
                                }}
                                className="ml-1.5 rounded px-1 py-0.5 text-[10px] font-semibold"
                              >
                                New
                              </span>
                            )}
                          </span>
                          {active && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sign out */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                      router.push("/login");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-status-red-fg hover:bg-status-red-bg transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out & clear local cache</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offline / Syncing / Sync Done / Sync Failed Banners (PRD Section 10) */}
      {connectionState === "offline" && (
        <div
          style={{
            backgroundColor: "var(--status-amber-bg)",
            color: "var(--status-amber-fg)",
          }}
          className="flex items-center justify-between px-4 sm:px-6 py-2 text-xs font-medium border-t border-border"
          role="status"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              <strong>You are offline.</strong> Changes will sync when you reconnect. You can view cached own data, clock in and out, and save drafts.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedConnectionState("syncing")}
            className="underline font-semibold ml-4 shrink-0"
          >
            Reconnect & Sync
          </button>
        </div>
      )}

      {connectionState === "sync_done" && (
        <div
          style={{
            backgroundColor: "var(--status-green-bg)",
            color: "var(--status-green-fg)",
          }}
          className="flex items-center justify-between px-4 sm:px-6 py-2 text-xs font-medium border-t border-border"
          role="status"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              <strong>All queued items synced.</strong> Pending badges have been cleared and confirmed by the server.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedConnectionState("online")}
            className="underline font-semibold ml-4 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {connectionState === "sync_failed" && (
        <div
          style={{
            backgroundColor: "var(--status-red-bg)",
            color: "var(--status-red-fg)",
          }}
          className="flex items-center justify-between px-4 sm:px-6 py-2 text-xs font-medium border-t border-border"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Sync failed:</strong> Clock-in entry (SGL-1002 at 07:52) could not reach the server. Item is kept locally and never discarded.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedConnectionState("syncing")}
            className="rounded bg-surface px-2.5 py-1 text-xs font-semibold border border-border shadow-sm ml-4 shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}
    </header>
  );
}
