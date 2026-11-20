"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getEmployeeEwaStatus,
  getEwaRequests,
  submitSimulatedEwaRequest,
  getEwaUsageChartData,
} from "@/lib/data";
import { formatGHS, formatDateTime, cedisToPesewas } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { EwaUsageChart } from "@/components/charts/secondary-charts";
import {
  Info,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Settings,
} from "lucide-react";

export default function EwaPage() {
  const { user, connectionState } = useAuth();
  const isEmployee = user.role === "Employee";
  const [selectedEmpId, setSelectedEmpId] = useState("emp-002");
  const [amountInput, setAmountInput] = useState("250");
  const [resultFeedback, setResultFeedback] = useState<{
    approved: boolean;
    message: string;
  } | null>(null);

  const effectiveEmpId = isEmployee ? user.employeeId : selectedEmpId;
  const ewaStatus = getEmployeeEwaStatus(effectiveEmpId);
  const visibleRequests = isEmployee
    ? getEwaRequests(user.employeeId)
    : getEwaRequests();
  const usageChartData = getEwaUsageChartData();
  const isOffline = connectionState === "offline";

  const requestedCedis = Number(amountInput) || 0;
  const requestedPesewas = cedisToPesewas(requestedCedis);

  // Live check as user types (PRD Section 7.7: "an amount field checks the limit as you type")
  let liveValidationWarning: string | null = null;
  if (ewaStatus.ineligibleReason) {
    liveValidationWarning = ewaStatus.ineligibleReason;
  } else if (requestedPesewas > ewaStatus.perRequestCapPesewas) {
    liveValidationWarning = `Amount exceeds the configured per-request cap of ${formatGHS(
      ewaStatus.perRequestCapPesewas
    )}.`;
  } else if (requestedPesewas > ewaStatus.availableNowPesewas) {
    liveValidationWarning = `Amount exceeds your available balance of ${formatGHS(
      ewaStatus.availableNowPesewas
    )} (${ewaStatus.rules.ewaMaxPercentage}% of earned wages less advances already taken).`;
  } else if (requestedPesewas <= 0) {
    liveValidationWarning = "Enter an amount greater than GHS 0.00.";
  }

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = submitSimulatedEwaRequest({
      employeeId: effectiveEmpId,
      amountPesewas: requestedPesewas,
    });
    setResultFeedback({
      approved: res.approved,
      message: res.message,
    });
  };

  const progressPercent = Math.min(
    100,
    Math.round(
      (ewaStatus.takenThisPeriodPesewas /
        Math.max(1, ewaStatus.maxAllowedPesewas)) *
        100
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
              Earned Wage Access (EWA)
            </h1>
            <StatusPill status="Simulated Disbursement" variant="violet" />
          </div>
          <p className="text-xs text-muted mt-1">
            Configured Limits: <strong>{ewaStatus.rules.ewaMaxPercentage}%</strong> of earned wages · Per-Request Cap:{" "}
            <strong>{formatGHS(ewaStatus.perRequestCapPesewas)}</strong> · Active permanent employees with no open anomaly flags.
          </p>
        </div>

        {user.role === "Admin" && (
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text hover:border-primary"
          >
            <Settings className="h-3.5 w-3.5 text-primary" />
            <span>Edit EWA Limits in Settings</span>
          </Link>
        )}
      </div>

      {/* Simulation Notice Banner (PRD Section 7.7) */}
      <div
        style={{
          backgroundColor: "var(--primary-soft)",
          color: "var(--primary)",
        }}
        className="rounded-card border border-border p-4 flex items-center gap-3 text-xs font-medium"
      >
        <Info className="h-5 w-5 shrink-0" />
        <span>
          <strong>Simulation Mode:</strong> Earned Wage Access requests and payroll deductions are simulated against configured limits. No live bank or mobile-money transfer is executed.
        </span>
      </div>

      {/* Main Grid: Request & Live Limit Checker + EWA Usage Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 veltra-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-text">
                Simulated EWA Request & Limit Check
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Checks eligibility and configured caps as you type.
              </p>
            </div>

            {user.role !== "Employee" && (
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  setResultFeedback(null);
                }}
                aria-label="Test employee for EWA simulation"
                className="rounded-lg border border-border bg-page px-2.5 py-1.5 text-xs font-semibold text-text"
              >
                <option value="emp-002">Kwame Osei (Eligible)</option>
                <option value="emp-007">Kojo Appiah (Has Open Flag)</option>
                <option value="emp-012">Esi Boadu (Inactive Status)</option>
              </select>
            )}
          </div>

          {/* 3 Summary Metrics: Earned so far, Available now, Advances taken */}
          <div className="grid grid-cols-3 gap-3 text-xs tabular-nums">
            <div className="rounded-lg bg-page p-3 border border-border">
              <span className="text-muted block">Earned So Far</span>
              <span className="text-sm font-bold text-text mt-1 block">
                {formatGHS(ewaStatus.earnedToDatePesewas)}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
              className="rounded-lg p-3 border border-border"
            >
              <span className="font-medium block">Available Now</span>
              <span className="text-sm font-bold mt-1 block">
                {formatGHS(ewaStatus.availableNowPesewas)}
              </span>
            </div>
            <div className="rounded-lg bg-page p-3 border border-border">
              <span className="text-muted block">Already Taken</span>
              <span className="text-sm font-bold text-text mt-1 block">
                {formatGHS(ewaStatus.takenThisPeriodPesewas)}
              </span>
            </div>
          </div>

          {/* Progress Bar for own limit */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 tabular-nums">
              <span className="font-semibold text-text">
                Period Limit Usage ({progressPercent}%)
              </span>
              <span className="text-muted">
                {formatGHS(ewaStatus.takenThisPeriodPesewas)} /{" "}
                {formatGHS(ewaStatus.maxAllowedPesewas)} max
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-page overflow-hidden border border-border">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: "var(--primary)",
                }}
              />
            </div>
          </div>

          {/* Amount Form with Real-Time Limit Check */}
          <form onSubmit={handleRequestSubmit} className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="ewa-amount-input"
                className="block text-xs font-semibold text-text mb-1.5"
              >
                Simulated Advance Amount (GHS)
              </label>
              <input
                id="ewa-amount-input"
                type="number"
                step="10"
                min="0"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setResultFeedback(null);
                }}
                className="w-full rounded-lg border border-border bg-page px-3.5 py-2 text-sm font-bold text-text tabular-nums focus:border-primary focus:bg-surface focus:outline-none"
              />
            </div>

            {liveValidationWarning ? (
              <div
                style={{
                  backgroundColor: "var(--status-amber-bg)",
                  color: "var(--status-amber-fg)",
                }}
                className="rounded-lg p-3 text-xs font-medium flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Limit / Eligibility Check:</strong>{" "}
                  {liveValidationWarning} (Submitting will record a Declined request with this reason.)
                </span>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "var(--status-green-bg)",
                  color: "var(--status-green-fg)",
                }}
                className="rounded-lg p-3 text-xs font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Within configured limit ({formatGHS(requestedPesewas)} ≤{" "}
                  {formatGHS(ewaStatus.availableNowPesewas)} available).
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isOffline || requestedPesewas <= 0}
              title={isOffline ? "Needs a connection" : "Submit simulated EWA request"}
              style={
                !isOffline ? { backgroundColor: "var(--primary)" } : undefined
              }
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${
                isOffline
                  ? "bg-page border border-border text-muted cursor-not-allowed"
                  : "text-white hover:opacity-95"
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Submit Simulated Request (Needs a connection)</span>
                </>
              ) : (
                <span>Submit Simulated EWA Request</span>
              )}
            </button>
          </form>

          {resultFeedback && (
            <div
              style={{
                backgroundColor: resultFeedback.approved
                  ? "var(--status-green-bg)"
                  : "var(--status-red-bg)",
                color: resultFeedback.approved
                  ? "var(--status-green-fg)"
                  : "var(--status-red-fg)",
              }}
              className="rounded-lg p-3 text-xs font-semibold"
              role="alert"
            >
              {resultFeedback.message}
            </div>
          )}
        </div>

        <div className="lg:col-span-6">
          {isEmployee ? (
            <div className="veltra-card p-6 space-y-4 h-full">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-text">
                  How Your EWA Limit Is Calculated
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Based on your Monthly Basic Salary and current eligibility status.
                </p>
              </div>
              <div className="space-y-2.5 text-xs tabular-nums">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted">Monthly Basic Salary</span>
                  <span className="font-bold text-text">
                    {formatGHS(ewaStatus.employee.basicSalaryPesewas)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted">Earned So Far (15 / 22 working days)</span>
                  <span className="font-semibold text-text">
                    {formatGHS(ewaStatus.earnedToDatePesewas)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted">
                    {ewaStatus.rules.ewaMaxPercentage}% of Earned Wages
                  </span>
                  <span className="font-semibold text-text">
                    {formatGHS(ewaStatus.maxByPercentPesewas)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted">Per-Request Cap (System Rule)</span>
                  <span className="font-semibold text-text">
                    {formatGHS(ewaStatus.perRequestCapPesewas)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted">Eligibility Status</span>
                  <StatusPill
                    status={ewaStatus.ineligibleReason ? "Ineligible" : "Eligible"}
                    variant={ewaStatus.ineligibleReason ? "red" : "green"}
                  />
                </div>
              </div>
            </div>
          ) : (
            <EwaUsageChart data={usageChartData} />
          )}
        </div>
      </div>

      {/* EWA Request History & Recovery Table */}
      <div className="veltra-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold text-text">
            {isEmployee
              ? "My EWA Requests & Recovery Log"
              : "Simulated EWA Transactions & Recovery Log"}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {isEmployee
              ? "Your personal advance requests and scheduled payroll recoveries."
              : "Includes approved advances scheduled for payroll recovery and declined requests with reasons."}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-page/70 text-[11px] uppercase tracking-wider font-semibold text-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Earned To Date</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Decision / Recovery Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm tabular-nums">
              {visibleRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-xs text-muted"
                  >
                    You have not made any Earned Wage Access requests yet.
                  </td>
                </tr>
              ) : (
                visibleRequests.map((req) => (
                <tr key={req.id} className="hover:bg-page/60">
                  <td className="px-4 py-3.5 text-xs text-muted">
                    {formatDateTime(req.requestedAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-text">
                      {req.employeeName}
                    </div>
                    <div className="text-xs text-muted">{req.staffId}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-text">
                    {req.periodShort}
                  </td>
                  <td className="px-4 py-3.5 text-text">
                    {formatGHS(req.earnedToDatePesewas)}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-text">
                    {formatGHS(req.amountRequestedPesewas)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={req.status} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted max-w-xs">
                    {req.declineReason ??
                      (req.status === "Recovered"
                        ? "Deducted from net pay"
                        : "Queued for Nov 2026 payroll deduction")}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
