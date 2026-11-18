"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getPayrollRuns,
  getPayrollRecords,
  submitDraftRunForApproval,
  getStatutoryBreakdownChartData,
} from "@/lib/data";
import { formatGHS, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { PayrollRecordsTable } from "@/components/tables/payroll-table";
import { StatutoryDeductionsChart } from "@/components/charts/secondary-charts";
import {
  Send,
  WifiOff,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

export default function PayrollRunsPage() {
  const { user, connectionState } = useAuth();
  const runs = getPayrollRuns();

  const [selectedRunId, setSelectedRunId] = useState("run-2026-11");
  const [confirmSubmitId, setConfirmSubmitId] = useState<string | null>(null);

  const activeRun = runs.find((r) => r.id === selectedRunId) ?? runs[runs.length - 1];
  const records = getPayrollRecords(activeRun.id);
  const statutoryChartData = getStatutoryBreakdownChartData(activeRun.id);

  const isOffline = connectionState === "offline";
  const canEdit = user.role === "HR/Payroll";

  const handleConfirmSubmit = () => {
    if (!confirmSubmitId) return;
    submitDraftRunForApproval({
      runId: confirmSubmitId,
      actorName: user.name,
      actorRole: user.role,
    });
    setConfirmSubmitId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            Payroll Runs & Statutory Calculation
          </h1>
          <p className="text-xs text-muted mt-1">
            Inspect pay periods, GRA Act 1178 PAYE & SSNIT deductions, and submit runs for multi-stage approval.
          </p>
        </div>

        {/* Submit for approval button (Disabled offline with "Needs a connection" per PRD Section 7.4 & 10) */}
        {canEdit && activeRun.status === "Draft" && (
          <div className="relative group">
            <button
              type="button"
              disabled={isOffline}
              onClick={() => setConfirmSubmitId(activeRun.id)}
              style={
                !isOffline ? { backgroundColor: "var(--primary)" } : undefined
              }
              title={isOffline ? "Needs a connection" : "Submit run for approval"}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm ${
                isOffline
                  ? "bg-page border border-border text-muted cursor-not-allowed"
                  : "text-white hover:opacity-95"
              }`}
            >
              {isOffline ? (
                <WifiOff className="h-4 w-4 text-status-amber-fg" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>
                {isOffline
                  ? "Submit for Approval (Needs a connection)"
                  : "Submit Run for Approval"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Run selector cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {runs
          .slice()
          .reverse()
          .slice(0, 4)
          .map((run) => {
            const isSelected = run.id === activeRun.id;
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => setSelectedRunId(run.id)}
                className={`veltra-card p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text">
                    {run.periodShort}
                  </span>
                  <StatusPill status={run.status} />
                </div>
                <div className="mt-2.5 text-lg font-bold text-text tabular-nums">
                  {formatGHS(run.totalPayrollCostPesewas)}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted tabular-nums">
                  <span>{run.employeeCount} employees</span>
                  <span>Pay: {formatDate(run.payDate)}</span>
                </div>
              </button>
            );
          })}
      </div>

      {/* Selected Run Detail Card + Statutory Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 veltra-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-text">
                  {activeRun.periodLabel} Summary
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Created by {activeRun.createdBy} · Cutoff:{" "}
                  {formatDate(activeRun.deadlineDate)}
                </p>
              </div>
              <StatusPill status={activeRun.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs tabular-nums">
              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">Total Basic Salary</span>
                <span className="text-sm font-bold text-text mt-1 block">
                  {formatGHS(activeRun.totalBasicPesewas)}
                </span>
              </div>
              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">Overtime & Allowances</span>
                <span className="text-sm font-bold text-text mt-1 block">
                  {formatGHS(
                    activeRun.totalOvertimePesewas +
                      activeRun.totalAllowancesPesewas
                  )}
                </span>
              </div>
              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">Total Gross Pay</span>
                <span className="text-sm font-bold text-text mt-1 block">
                  {formatGHS(activeRun.totalGrossPesewas)}
                </span>
              </div>
              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">GRA PAYE Income Tax</span>
                <span className="text-sm font-bold text-text mt-1 block">
                  {formatGHS(activeRun.totalPayePesewas)}
                </span>
              </div>
              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">SSNIT Employee (5.5%)</span>
                <span className="text-sm font-bold text-text mt-1 block">
                  {formatGHS(activeRun.totalSsnitEmployeePesewas)}
                </span>
              </div>
              <div
                style={{
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
                className="rounded-lg p-3 border border-border"
              >
                <span className="font-medium block">Total Net Disbursement</span>
                <span className="text-sm font-bold mt-1 block">
                  {formatGHS(activeRun.totalNetPesewas)}
                </span>
              </div>
            </div>
          </div>

          {/* Stage Stepper preview */}
          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {activeRun.approvalStages.map((st, i) => (
                <div key={st.stageName} className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${
                      st.status === "Approved"
                        ? "bg-status-green-bg text-status-green-fg"
                        : st.status === "Pending"
                        ? "bg-status-amber-bg text-status-amber-fg"
                        : "bg-page text-muted border border-border"
                    }`}
                  >
                    {st.status === "Approved" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    <span>
                      {i + 1}. {st.stageName}
                    </span>
                  </span>
                  {i < activeRun.approvalStages.length - 1 && (
                    <span className="text-muted">→</span>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/approvals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
            >
              <span>Approval Queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <StatutoryDeductionsChart data={statutoryChartData} />
        </div>
      </div>

      {/* Employee records table for the selected run */}
      <PayrollRecordsTable
        records={records}
        periodLabel={activeRun.periodLabel}
      />

      {/* Confirmation dialog for submitting run */}
      {confirmSubmitId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="veltra-card max-w-md w-full p-6">
            <h3 className="text-base font-bold text-text">
              Submit Payroll Run for Approval?
            </h3>
            <p className="mt-2 text-xs text-muted">
              This will move <strong>{activeRun.periodLabel}</strong> from Draft to Stage 1 Approval and record an entry in the Audit Trail.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitId(null)}
                className="rounded-lg border border-border bg-page px-3.5 py-2 text-xs font-semibold text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                style={{ backgroundColor: "var(--primary)" }}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
