"use client";

import React from "react";
import Link from "next/link";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ArrowUpRight, PieChart as PieIcon } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

export interface PayrollStatusSlice {
  status: string;
  count: number;
  colorVar: string;
}

export function PayrollStatusChart({
  data,
  loading = false,
  empty = false,
}: {
  data: PayrollStatusSlice[];
  loading?: boolean;
  empty?: boolean;
}) {
  const totalRuns = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="veltra-card p-5 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-text">Payroll Status</h2>
          <p className="text-xs text-muted mt-0.5">
            Where is each run in the process?
          </p>
        </div>
        <Link
          href="/payroll"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
        >
          <span>More details</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="my-4 h-56 flex items-center justify-center animate-pulse">
          <div className="h-36 w-36 rounded-full border-8 border-border bg-page" />
        </div>
      ) : empty || totalRuns === 0 ? (
        <div className="my-4 h-56 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-page/50 p-6 text-center">
          <PieIcon className="h-8 w-8 text-muted mb-2" />
          <p className="text-sm font-semibold text-text">No payroll runs yet</p>
          <p className="text-xs text-muted mt-0.5">
            Run status distribution will appear once payroll cycles are created.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
          <div className="sm:col-span-6 relative h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={3}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.colorVar} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as PayrollStatusSlice;
                    return (
                      <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs">
                        <span className="font-bold text-text">{item.status}: </span>
                        <span className="tabular-nums font-semibold text-text">
                          {item.count} {item.count === 1 ? "run" : "runs"}
                        </span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total count */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold text-text tabular-nums leading-none">
                {totalRuns}
              </span>
              <span className="text-[11px] font-medium text-muted mt-1">
                Total Runs
              </span>
            </div>
          </div>

          <div className="sm:col-span-6 space-y-2.5">
            {data.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-lg bg-page px-3 py-2 border border-border"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.colorVar }}
                  />
                  <StatusPill
                    status={item.status}
                    showIcon={false}
                    className="px-2 py-0 text-[11px]"
                  />
                </div>
                <span className="text-xs font-bold text-text tabular-nums">
                  {item.count} {item.count === 1 ? "run" : "runs"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
