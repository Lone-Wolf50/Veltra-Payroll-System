"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getAuditTrail } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { WifiOff, History } from "lucide-react";

export default function AuditTrailPage() {
  const { connectionState } = useAuth();
  const entries = getAuditTrail();
  const [categoryFilter, setCategoryFilter] = useState("All");

  // PRD Section 10: Audit records are never cached locally when offline
  if (connectionState === "offline") {
    return (
      <div className="veltra-card p-10 text-center max-w-xl mx-auto my-8">
        <WifiOff className="h-10 w-10 text-status-amber-fg mx-auto mb-3" />
        <h1 className="text-lg font-bold text-text">Available when online</h1>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          System-wide audit logs are stored on the server and are not cached offline. Reconnect to inspect the immutable audit trail.
        </p>
      </div>
    );
  }

  const filtered = entries.filter(
    (e) => categoryFilter === "All" || e.category === categoryFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            System Audit Trail
          </h1>
          <p className="text-xs text-muted mt-1">
            Read-only, filterable log of who did what and when across Payroll, Anomalies, Approvals, EWA, and Settings.
          </p>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter audit trail by category"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text"
        >
          <option value="All">All Categories ({entries.length})</option>
          <option value="Payroll">Payroll</option>
          <option value="Anomaly">Anomaly Reviews</option>
          <option value="Approval">Approvals</option>
          <option value="EWA">Simulated EWA</option>
          <option value="Settings">Settings & Rules</option>
        </select>
      </div>

      <div className="veltra-card overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-page/50"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={entry.category} variant="violet" />
                  <span className="text-sm font-bold text-text">
                    {entry.action}
                  </span>
                </div>
                <p className="text-xs text-muted">{entry.details}</p>
              </div>
              <div className="text-xs sm:text-right shrink-0 tabular-nums">
                <div className="font-semibold text-text">
                  {entry.actorName}{" "}
                  <span className="text-muted">({entry.actorRole})</span>
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {formatDateTime(entry.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
