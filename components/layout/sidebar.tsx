"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  UsersRound,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Banknote,
  UserCheck,
  BarChart3,
  History,
  Settings,
  X,
} from "lucide-react";
import { VeltraLogo } from "@/components/ui/logo";
import { useAuth } from "@/components/providers/auth-provider";
import { getVisibleNavItems, NavItemConfig } from "@/lib/roles";
import { getAnomalies } from "@/lib/data";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Clock,
  UsersRound,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Banknote,
  UserCheck,
  BarChart3,
  History,
  Settings,
};

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleItems = getVisibleNavItems(user.role);
  const openAnomalyCount = getAnomalies("run-2026-11").filter(
    (a) => a.status === "Needs review"
  ).length;

  const isItemActive = (item: NavItemConfig) => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const navContent = (
    <div className="flex h-full flex-col bg-surface border-r border-border">
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-border">
        <Link
          href="/dashboard"
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          onClick={onCloseMobile}
        >
          <VeltraLogo showSubtitle />
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden rounded-lg p-1.5 text-muted hover:text-text hover:bg-page focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Role indicator pill */}
      <div className="px-5 pt-4 pb-2">
        <div className="rounded-lg bg-page px-3 py-2 border border-border">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted">
            Active Role View
          </p>
          <p className="text-xs font-semibold text-text mt-0.5 flex items-center justify-between">
            <span>{user.role}</span>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--primary)" }}
            />
          </p>
        </div>
      </div>

      {/* Navigation links (exact order from PRD Section 6) */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
      >
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const active = isItemActive(item);
          const perm = item.permissions[user.role];

          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              onClick={onCloseMobile}
              style={
                active
                  ? {
                      backgroundColor: "var(--primary-soft)",
                      color: "var(--primary)",
                    }
                  : undefined
              }
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "font-semibold"
                  : "text-muted hover:bg-page hover:text-text"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-muted group-hover:text-text"
                  )}
                />
                <span>{item.label}</span>
              </span>

              <span className="flex items-center gap-1.5">
                {item.id === "anomalies" && openAnomalyCount > 0 && (
                  <span
                    style={{
                      backgroundColor: "var(--status-red-bg)",
                      color: "var(--status-red-fg)",
                    }}
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                  >
                    {openAnomalyCount}
                  </span>
                )}
                {perm === "view" && (
                  <span className="rounded bg-page px-1.5 py-0.5 text-[10px] font-medium text-muted border border-border">
                    View
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer note */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-page p-3 text-xs text-muted">
          <div className="font-semibold text-text">Sunda Ghana Limited</div>
          <div className="mt-0.5">GRA Act 1178 (Sep 2026) Active</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col no-print">
        {navContent}
      </aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-surface">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
