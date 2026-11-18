import React from "react";
import { SYSTEM_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export function VeltraLogo({
  className,
  showSubtitle = false,
}: {
  className?: string;
  showSubtitle?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white shadow-sm"
        style={{ backgroundColor: "var(--primary)" }}
        aria-hidden="true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l8 13 8-13" />
          <path d="M9 6l3 5 3-5" opacity="0.65" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-tight text-text leading-none">
          {SYSTEM_NAME}
        </span>
        {showSubtitle && (
          <span className="text-[11px] font-medium text-muted mt-0.5 leading-none">
            Sunda Ghana Payroll
          </span>
        )}
      </div>
    </div>
  );
}
