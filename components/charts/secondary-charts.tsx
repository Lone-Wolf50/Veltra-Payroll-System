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
  ReferenceLine,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { formatGHS, formatChartGHS } from "@/lib/format";
import { ArrowUpRight } from "lucide-react";

/**
 * Chart 3: Statutory Deductions (Horizontal Bars)
 * Question: "How much goes to PAYE and SSNIT?"
 */
export function StatutoryDeductionsChart({
  data,
  loading = false,
  empty = false,
}: {
  data: {
    name: string;
    shortName: string;
    amountPesewas: number;
    rateLabel: string;
  }[];
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="veltra-card p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-text">
            Statutory Deductions Breakdown
          </h3>
          <p className="text-xs text-muted mt-0.5">
            How much goes to GRA PAYE and SSNIT this period?
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>More details</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 h-52 w-full">
        {loading ? (
          <div className="h-full space-y-4 py-4 animate-pulse">
            <div className="h-8 w-4/5 rounded bg-page border border-border" />
            <div className="h-8 w-3/5 rounded bg-page border border-border" />
            <div className="h-8 w-2/5 rounded bg-page border border-border" />
          </div>
        ) : empty || data.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
            No statutory deductions calculated yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 16, bottom: 4 }}
              barSize={24}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--border)"
              />
              <XAxis
                type="number"
                tickFormatter={(v) => formatChartGHS(Number(v))}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={115}
                tick={{ fill: "var(--text)", fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--primary-soft)", opacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-surface p-2.5 shadow-md text-xs">
                      <div className="font-bold text-text">{d.name}</div>
                      <div className="text-muted text-[11px]">{d.rateLabel}</div>
                      <div className="mt-1 font-bold text-primary tabular-nums">
                        {formatGHS(d.amountPesewas)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="amountPesewas" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {data.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={idx === 0 ? "var(--primary)" : idx === 1 ? "var(--teal)" : "var(--blue-soft)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/**
 * Chart 4: Anomalies by Rule (Horizontal Bars)
 * Question: "Which checks fire most?"
 */
export function AnomaliesByRuleChart({
  data,
  loading = false,
  empty = false,
}: {
  data: {
    ruleId: string;
    ruleName: string;
    totalCount: number;
    openCount: number;
  }[];
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="veltra-card p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-text">Anomalies by Rule</h3>
          <p className="text-xs text-muted mt-0.5">
            Which of the five automated checks fire most?
          </p>
        </div>
        <Link
          href="/anomalies"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>More details</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 h-56 w-full">
        {loading ? (
          <div className="h-full space-y-3 py-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 w-3/4 rounded bg-page border border-border" />
            ))}
          </div>
        ) : empty || data.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
            No anomaly records detected
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 16, bottom: 4 }}
              barSize={18}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--border)"
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="ruleName"
                width={145}
                tick={{ fill: "var(--text)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--primary-soft)", opacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-surface p-2.5 shadow-md text-xs">
                      <div className="font-bold text-text">{d.ruleName}</div>
                      <div className="mt-1 tabular-nums text-muted">
                        Total Flagged: <strong className="text-text">{d.totalCount}</strong> · Open:{" "}
                        <strong className="text-status-red-fg">{d.openCount}</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="totalCount"
                fill="var(--primary)"
                radius={[0, 4, 4, 0]}
                name="Flagged Count"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/**
 * Chart 5: Overtime by Department (Columns with dashed threshold line)
 * Question: "Who is above normal?"
 */
export function OvertimeByDepartmentChart({
  data,
  threshold = 40,
  loading = false,
}: {
  data: {
    department: string;
    shortName: string;
    hours: number;
    threshold: number;
  }[];
  threshold?: number;
  loading?: boolean;
}) {
  return (
    <div className="veltra-card p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-text">
            Overtime by Department
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Who is above the configured {threshold} hr period threshold?
          </p>
        </div>
        <span
          style={{
            backgroundColor: "var(--status-amber-bg)",
            color: "var(--status-amber-fg)",
          }}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        >
          Limit: {threshold} hrs
        </span>
      </div>

      <div className="mt-4 h-56 w-full">
        {loading ? (
          <div className="h-full animate-pulse bg-page rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
              barSize={30}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="shortName"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                unit="h"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--primary-soft)", opacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  const over = d.hours > threshold;
                  return (
                    <div className="rounded-lg border border-border bg-surface p-2.5 shadow-md text-xs">
                      <div className="font-bold text-text">{d.department}</div>
                      <div className="mt-1 tabular-nums">
                        Avg Overtime: <strong>{d.hours} hrs</strong> (Threshold: {threshold} hrs)
                      </div>
                      {over && (
                        <div className="mt-1 font-semibold text-status-red-fg">
                          Exceeds threshold (+{d.hours - threshold} hrs)
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={threshold}
                stroke="var(--status-amber-fg)"
                strokeDasharray="5 4"
                strokeWidth={2}
                label={{
                  value: `Max Limit (${threshold}h)`,
                  position: "insideTopRight",
                  fill: "var(--status-amber-fg)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      entry.hours > threshold
                        ? "var(--status-amber-fg)"
                        : "var(--primary)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/**
 * Chart 6: EWA Usage (Line chart, two series: Advances taken vs Recovered)
 * Question: "How much is advanced and recovered?"
 */
export function EwaUsageChart({
  data,
}: {
  data: {
    month: string;
    advancedPesewas: number;
    recoveredPesewas: number;
  }[];
}) {
  return (
    <div className="veltra-card p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-text">
            Simulated EWA Usage & Recovery
          </h3>
          <p className="text-xs text-muted mt-0.5">
            How much is advanced and recovered per payroll period?
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--primary)" }}
            />
            <span>Advanced</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--teal)" }}
            />
            <span>Recovered</span>
          </span>
        </div>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
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
              tickFormatter={(v) => formatChartGHS(Number(v))}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={82}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-surface p-2.5 shadow-md text-xs tabular-nums">
                    <div className="font-bold text-text mb-1">{d.month} 2026</div>
                    <div className="text-primary font-semibold">
                      Advanced: {formatGHS(d.advancedPesewas)}
                    </div>
                    <div className="text-teal font-semibold">
                      Recovered: {formatGHS(d.recoveredPesewas)}
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="advancedPesewas"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "var(--primary)" }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="recoveredPesewas"
              stroke="var(--teal)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "var(--teal)" }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
