"use client";

import React from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatGHS, formatChartGHS } from "@/lib/format";
import { ArrowUpRight, BarChart2 } from "lucide-react";

export interface MonthlyCostItem {
  runId: string;
  month: string;
  fullPeriod: string;
  netPayPesewas: number;
  statutoryPesewas: number;
  overtimePesewas: number;
  totalCostPesewas: number;
}

export function PayrollCostChart({
  data,
  loading = false,
  empty = false,
}: {
  data: MonthlyCostItem[];
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="veltra-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-text">
              Payroll Cost by Month
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Is cost rising, and what is it made of? (Last 6 months, in GHS)
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

        {/* Custom accessible legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: "var(--primary)" }}
            />
            <span>Net Pay</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: "var(--teal)" }}
            />
            <span>Statutory (PAYE + SSNIT)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm border border-border"
              style={{ backgroundColor: "var(--blue-soft)" }}
            />
            <span>Overtime Pay</span>
          </span>
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        {loading ? (
          <div className="h-full w-full flex items-end justify-between gap-4 px-4 py-2 animate-pulse">
            {[55, 65, 70, 75, 82, 90].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-full rounded-t-md bg-page border border-border"
              />
            ))}
          </div>
        ) : empty || data.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-page/50 p-6 text-center">
            <BarChart2 className="h-8 w-8 text-muted mb-2" />
            <p className="text-sm font-semibold text-text">No payroll runs yet</p>
            <p className="text-xs text-muted mt-0.5">
              Monthly payroll cost breakdown will appear once a run is generated.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              barSize={32}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(val) => formatChartGHS(Number(val))}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={86}
              />
              <Tooltip
                cursor={{ fill: "var(--primary-soft)", opacity: 0.35 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as MonthlyCostItem;
                  return (
                    <div className="rounded-lg border border-border bg-surface p-3 shadow-md text-xs">
                      <div className="font-bold text-text mb-1.5">
                        {item.fullPeriod}
                      </div>
                      <div className="space-y-1 tabular-nums">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span
                              className="h-2 w-2 rounded-sm"
                              style={{ backgroundColor: "var(--primary)" }}
                            />
                            Net Pay:
                          </span>
                          <span className="font-semibold text-text">
                            {formatGHS(item.netPayPesewas)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span
                              className="h-2 w-2 rounded-sm"
                              style={{ backgroundColor: "var(--teal)" }}
                            />
                            Statutory:
                          </span>
                          <span className="font-semibold text-text">
                            {formatGHS(item.statutoryPesewas)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span
                              className="h-2 w-2 rounded-sm"
                              style={{ backgroundColor: "var(--blue-soft)" }}
                            />
                            Overtime:
                          </span>
                          <span className="font-semibold text-text">
                            {formatGHS(item.overtimePesewas)}
                          </span>
                        </div>
                        <div className="pt-1.5 mt-1.5 border-t border-border flex items-center justify-between gap-4 font-bold text-text">
                          <span>Total Cost:</span>
                          <span>{formatGHS(item.totalCostPesewas)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="netPayPesewas"
                stackId="cost"
                fill="var(--primary)"
                radius={[0, 0, 4, 4]}
                name="Net Pay"
                isAnimationActive={false}
              />
              <Bar
                dataKey="statutoryPesewas"
                stackId="cost"
                fill="var(--teal)"
                name="Statutory"
                isAnimationActive={false}
              />
              <Bar
                dataKey="overtimePesewas"
                stackId="cost"
                fill="var(--blue-soft)"
                radius={[4, 4, 0, 0]}
                name="Overtime"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
