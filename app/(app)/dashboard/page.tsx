"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { useGlobalSearch } from "@/components/providers/search-provider";
import {
  getHrDashboardSummary,
  getPayrollCostByMonthChartData,
  getPayrollStatusChartData,
  getPayrollRecords,
  getAnomalies,
  getEmployeeEwaStatus,
  getAttendanceRecords,
} from "@/lib/data";
import { formatGHS, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { LiveDateTimeBadge } from "@/components/ui/live-datetime";
import { PayrollCostChart } from "@/components/charts/payroll-cost-chart";
import { PayrollStatusChart } from "@/components/charts/payroll-status-chart";
import { PayrollRecordsTable } from "@/components/tables/payroll-table";
import {
  Wallet,
  Banknote,
  Landmark,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  CalendarClock,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const { user, storeTick } = useAuth();
  const { globalSearch } = useGlobalSearch();

  // Developer toggles to demonstrate empty & loading states on charts (PRD Section 9 & 13 Step 3)
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateEmpty, setSimulateEmpty] = useState(false);

  const summary = useMemo(() => getHrDashboardSummary("run-2026-11"), [storeTick]);
  const costData = useMemo(() => getPayrollCostByMonthChartData(), [storeTick]);
  const statusData = useMemo(() => getPayrollStatusChartData(), [storeTick]);
  const records = useMemo(() => getPayrollRecords("run-2026-11"), [storeTick]);
  const openAnomalies = useMemo(
    () =>
      getAnomalies("run-2026-11").filter((a) => a.status === "Needs review"),
    [storeTick]
  );

  // If the signed-in user is an Employee, show their role-tailored summary banner at top
  // while also allowing inspection of the Employee home metrics (PRD Section 4)
  if (user.role === "Employee") {
    const ewaStatus = getEmployeeEwaStatus(user.employeeId);
    const myAttendance = getAttendanceRecords(user.employeeId);
    const todayRec = myAttendance.find((a) => a.date === "2026-11-03");

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-muted mt-1">
              {user.department} · Staff ID: SGL-1002 · Period: November 2026
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <LiveDateTimeBadge />
            <Link
              href="/attendance"
              style={{ backgroundColor: "var(--primary)" }}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
            >
              <Clock className="h-4 w-4" />
              <span>Open Clock-In & Attendance</span>
            </Link>
          </div>
        </div>

        {/* Employee 3 summary cards (PRD Section 4: Today's clock-in, attendance this period, EWA available) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="veltra-card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">
                Today&apos;s Clock-In (03 Nov 2026)
              </span>
              <StatusPill status={todayRec?.clockIn ? "Present" : "Pending"} />
            </div>
            <div className="mt-3 text-2xl font-bold text-text tabular-nums">
              {todayRec?.clockIn ? `${todayRec.clockIn} AM` : "Not clocked in"}
            </div>
            <p className="mt-2 text-xs text-muted">
              Biometric & mobile sync status:{" "}
              <strong className="text-text">{todayRec?.syncStatus ?? "Synced"}</strong>
            </p>
            <Link
              href="/attendance"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Clock in / out now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="veltra-card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">
                Attendance This Period
              </span>
              <StatusPill status="On Track" variant="green" />
            </div>
            <div className="mt-3 text-2xl font-bold text-text tabular-nums">
              15 / 15 Days
            </div>
            <p className="mt-2 text-xs text-muted">
              2.5 overtime hours logged in November 2026
            </p>
            <Link
              href="/payslips"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>View my payslips</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="veltra-card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">
                Simulated EWA Available Now
              </span>
              <StatusPill status="Simulation" variant="violet" />
            </div>
            <div className="mt-3 text-2xl font-bold text-text tabular-nums">
              {formatGHS(ewaStatus.availableNowPesewas)}
            </div>
            <p className="mt-2 text-xs text-muted tabular-nums">
              Earned so far: {formatGHS(ewaStatus.earnedToDatePesewas)} · Taken:{" "}
              {formatGHS(ewaStatus.takenThisPeriodPesewas)}
            </p>
            <Link
              href="/ewa"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Request simulated EWA</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
              HR & Payroll Dashboard
            </h1>
            <StatusPill status={summary.currentRun.status} />
          </div>
          <p className="text-xs text-muted mt-1">
            Sunda Ghana Limited · Active Cycle:{" "}
            <strong className="text-text">{summary.currentRun.periodLabel}</strong> · Pay Date:{" "}
            <strong className="text-text">{formatDate(summary.currentRun.payDate)}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Date & Time on Dashboard */}
          <LiveDateTimeBadge />

          {/* Demo Chart State Controls (to inspect empty & loading states per PRD Section 9 & 13 Step 3) */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
            <span className="text-muted font-medium">Chart States:</span>
            <button
              type="button"
              onClick={() => {
                setSimulateLoading(false);
                setSimulateEmpty(false);
              }}
              className={`rounded px-2 py-0.5 font-semibold ${
                !simulateLoading && !simulateEmpty
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:text-text"
              }`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => {
                setSimulateLoading(true);
                setSimulateEmpty(false);
              }}
              className={`rounded px-2 py-0.5 font-semibold ${
                simulateLoading
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:text-text"
              }`}
            >
              Skeleton
            </button>
            <button
              type="button"
              onClick={() => {
                setSimulateEmpty(true);
                setSimulateLoading(false);
              }}
              className={`rounded px-2 py-0.5 font-semibold ${
                simulateEmpty
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:text-text"
              }`}
            >
              Empty
            </button>
          </div>

          <Link
            href="/payroll"
            style={{ backgroundColor: "var(--primary)" }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Open Payroll Run</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Near-Deadline Banner (PRD Section 7.2 & 11.2: "A banner when a payroll deadline is near, with a link to the open run") */}
      <div
        style={{
          backgroundColor: "var(--status-amber-bg)",
          color: "var(--status-amber-fg)",
        }}
        className="rounded-card border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start sm:items-center gap-3">
          <CalendarClock className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs">
            <span className="font-bold">
              Payroll Approval Deadline in 2 Days ({formatDate(summary.currentRun.deadlineDate)}):
            </span>{" "}
            The <strong>{summary.currentRun.periodLabel}</strong> run ({summary.currentRun.employeeCount} employees) has{" "}
            <strong>{openAnomalies.length} flagged records</strong> needing review before final submission.
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/anomalies"
            className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-text border border-border hover:border-primary"
          >
            Review {openAnomalies.length} Flags
          </Link>
          <Link
            href="/payroll"
            style={{ backgroundColor: "var(--primary)" }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          >
            <span>Go to Open Run</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards (PRD Section 7.2: Total payroll cost, Net pay, Statutory deductions, Flagged records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Total Payroll Cost */}
        <div className="veltra-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              Total Payroll Cost
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-text tabular-nums">
            {formatGHS(summary.totalPayrollCostPesewas)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
            <span
              style={{
                backgroundColor: "var(--status-green-bg)",
                color: "var(--status-green-fg)",
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold tabular-nums shrink-0"
            >
              <TrendingUp className="h-3 w-3" />
              +{summary.costChangePercent}%
            </span>
            <span className="text-muted whitespace-nowrap">vs Oct 2026</span>
          </div>
        </div>

        {/* Card 2: Net Pay */}
        <div className="veltra-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              Employee Net Pay
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{
                backgroundColor: "var(--status-green-bg)",
                color: "var(--status-green-fg)",
              }}
            >
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-text tabular-nums">
            {formatGHS(summary.netPayPesewas)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
            <span
              style={{
                backgroundColor: "var(--status-green-bg)",
                color: "var(--status-green-fg)",
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold tabular-nums shrink-0"
            >
              <TrendingUp className="h-3 w-3" />
              +{summary.netChangePercent}%
            </span>
            <span className="text-muted whitespace-nowrap">vs Oct 2026</span>
          </div>
        </div>

        {/* Card 3: Statutory Deductions */}
        <div className="veltra-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              Statutory Deductions (PAYE + SSNIT)
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{
                backgroundColor: "var(--blue-soft)",
                color: "var(--text)",
              }}
            >
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-text tabular-nums">
            {formatGHS(summary.statutoryDeductionsPesewas)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
            <span
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold tabular-nums shrink-0"
            >
              +{summary.statutoryChangePercent}%
            </span>
            <span className="text-muted whitespace-nowrap">GRA Act 1178</span>
          </div>
        </div>

        {/* Card 4: Flagged Records */}
        <div className="veltra-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              Flagged Records (Needs Review)
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{
                backgroundColor:
                  summary.flaggedRecordsCount > 0
                    ? "var(--status-red-bg)"
                    : "var(--status-green-bg)",
                color:
                  summary.flaggedRecordsCount > 0
                    ? "var(--status-red-fg)"
                    : "var(--status-green-fg)",
              }}
            >
              {summary.flaggedRecordsCount > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-text tabular-nums">
            {summary.flaggedRecordsCount}{" "}
            <span className="text-sm font-medium text-muted">
              / {summary.totalFlaggedInPeriod} total
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-3 text-xs">
            <StatusPill
              status={
                summary.flaggedRecordsCount > 0 ? "Needs review" : "All reviewed"
              }
              variant={summary.flaggedRecordsCount > 0 ? "red" : "green"}
            />
            <Link
              href="/anomalies"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
            >
              <span>Open queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Headline Charts: Payroll Cost by Month (Stacked Columns) & Payroll Status (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <PayrollCostChart
            data={costData}
            loading={simulateLoading}
            empty={simulateEmpty}
          />
        </div>
        <div className="lg:col-span-5">
          <PayrollStatusChart
            data={statusData}
            loading={simulateLoading}
            empty={simulateEmpty}
          />
        </div>
      </div>

      {/* Searchable, Filterable, Paginated, Exportable Payroll Register Table */}
      <PayrollRecordsTable
        records={records}
        periodLabel={summary.currentRun.periodLabel}
        externalSearch={globalSearch}
      />
    </div>
  );
}
