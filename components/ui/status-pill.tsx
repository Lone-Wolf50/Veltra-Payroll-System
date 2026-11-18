import React from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileEdit,
  CircleDot,
} from "lucide-react";

export type PillVariant = "green" | "amber" | "red" | "blue" | "violet" | "neutral";

/**
 * PRD Section 5.2 & 12:
 * "Status is always a pill with text plus color, so it still reads without color."
 * Never use red for decoration, only for problems (Unpaid, Rejected, Flagged, Declined).
 */
export function getStatusVariant(status: string): PillVariant {
  const s = status.toLowerCase();
  if (
    s === "paid" ||
    s === "approved" ||
    s === "completed" ||
    s === "active" ||
    s === "synced" ||
    s === "present" ||
    s === "corrected" ||
    s === "confirmed legitimate" ||
    s === "recovered"
  ) {
    return "green";
  }
  if (
    s === "pending" ||
    s === "pending approval" ||
    s === "draft" ||
    s === "waiting" ||
    s === "late" ||
    s === "half day" ||
    s === "medium"
  ) {
    return "amber";
  }
  if (
    s === "flagged" ||
    s === "needs review" ||
    s === "rejected" ||
    s === "declined" ||
    s === "unpaid" ||
    s === "inactive" ||
    s === "terminated" ||
    s === "absent" ||
    s === "high"
  ) {
    return "red";
  }
  return "blue";
}

export function StatusPill({
  status,
  variant,
  showIcon = true,
  className,
}: {
  status: string;
  variant?: PillVariant;
  showIcon?: boolean;
  className?: string;
}) {
  const resolved = variant ?? getStatusVariant(status);

  const styles: Record<PillVariant, React.CSSProperties> = {
    green: {
      backgroundColor: "var(--status-green-bg)",
      color: "var(--status-green-fg)",
    },
    amber: {
      backgroundColor: "var(--status-amber-bg)",
      color: "var(--status-amber-fg)",
    },
    red: {
      backgroundColor: "var(--status-red-bg)",
      color: "var(--status-red-fg)",
    },
    blue: {
      backgroundColor: "var(--blue-soft)",
      color: "var(--text)",
    },
    violet: {
      backgroundColor: "var(--primary-soft)",
      color: "var(--primary)",
    },
    neutral: {
      backgroundColor: "var(--page)",
      color: "var(--muted)",
    },
  };

  const Icon =
    resolved === "green"
      ? CheckCircle2
      : resolved === "red"
      ? status.toLowerCase().includes("flag") || status.toLowerCase().includes("review")
        ? AlertTriangle
        : XCircle
      : resolved === "amber"
      ? status.toLowerCase() === "draft"
        ? FileEdit
        : Clock
      : CircleDot;

  return (
    <span
      style={styles[resolved]}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>{status}</span>
    </span>
  );
}
