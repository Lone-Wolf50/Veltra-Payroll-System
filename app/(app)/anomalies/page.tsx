"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getAnomalies,
  getAnomaliesByRuleChartData,
  getOvertimeByDepartment,
  resolveAnomaly,
  getSystemRules,
} from "@/lib/data";
import { AnomalyRecord } from "@/lib/types";
import { formatGHS, formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  AnomaliesByRuleChart,
  OvertimeByDepartmentChart,
} from "@/components/charts/secondary-charts";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Wrench,
  ShieldCheck,
  X,
} from "lucide-react";

export default function AnomaliesPage() {
  const { user, connectionState } = useAuth();
  const anomalies = getAnomalies("run-2026-11");
  const ruleChartData = getAnomaliesByRuleChartData();
  const overtimeData = getOvertimeByDepartment();
  const rules = getSystemRules();

  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterRule, setFilterRule] = useState<string>("All");
  const [activeAnomaly, setActiveAnomaly] = useState<AnomalyRecord | null>(null);
  const [resolutionChoice, setResolutionChoice] = useState<
    "Corrected" | "Confirmed legitimate"
  >("Corrected");
  const [resolutionNote, setResolutionNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const canResolve = user.role === "HR/Payroll";
  const isOffline = connectionState === "offline";

  const filtered = anomalies.filter((a) => {
    if (filterStatus !== "All" && a.status !== filterStatus) return false;
    if (filterRule !== "All" && a.ruleId !== filterRule) return false;
    return true;
  });

  const handleOpenResolveModal = (
    item: AnomalyRecord,
    defaultChoice: "Corrected" | "Confirmed legitimate"
  ) => {
    setActiveAnomaly(item);
    setResolutionChoice(defaultChoice);
    setResolutionNote("");
    setNoteError(null);
  };

  const handleConfirmResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnomaly) return;
    if (!resolutionNote.trim() || resolutionNote.trim().length < 6) {
      setNoteError(
        "A resolution note is required (minimum 6 characters) to document the payroll audit trail."
      );
      return;
    }
    resolveAnomaly({
      anomalyId: activeAnomaly.id,
      resolution: resolutionChoice,
      note: resolutionNote.trim(),
      actorName: user.name,
      actorRole: user.role,
    });
    setActiveAnomaly(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            Anomaly Review Queue
          </h1>
          <p className="text-xs text-muted mt-1">
            Automated pre-payroll control checks across all five configured rules.
          </p>
        </div>
        <StatusPill
          status={`${
            anomalies.filter((a) => a.status === "Needs review").length
          } Flagged — Needs Review`}
          variant="red"
        />
      </div>

      {/* Mandatory Wording Banner (PRD Section 7.5: 'A flag means "needs review", not "fraud", and the wording on screen must say so.') */}
      <div
        style={{
          backgroundColor: "var(--blue-soft)",
          color: "var(--text)",
        }}
        className="rounded-card border border-border p-4 flex items-start gap-3 text-xs"
      >
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">
            Important Control Notice: A flag means &ldquo;needs review&rdquo;, not &ldquo;fraud&rdquo;.
          </strong>{" "}
          Flagged records highlight automated threshold or data variances (duplicate bank accounts, missing statutory IDs, overtime above limit, attendance variance, or inactive status) so the HR/Payroll Officer can verify and mark them{" "}
          <strong>Corrected</strong> (recalculating the run) or{" "}
          <strong>Confirmed legitimate</strong> with a required audit note.
        </div>
      </div>

      {/* Charts: Anomalies by Rule + Overtime by Department (PRD Section 9 & 13 Step 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomaliesByRuleChart data={ruleChartData} />
        <OvertimeByDepartmentChart
          data={overtimeData}
          threshold={rules.anomalyRules.abnormal_overtime.maxHoursPerPeriod}
        />
      </div>

      {/* Filter Bar & Queue List */}
      <div className="veltra-card overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text">
              Flagged Records ({filtered.length})
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Period: November 2026 · Resolving as &ldquo;Corrected&rdquo; immediately recalculates the payroll run.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by review status"
              className="rounded-lg border border-border bg-page px-3 py-1.5 text-xs font-medium text-text"
            >
              <option value="All">All Statuses</option>
              <option value="Needs review">Needs review</option>
              <option value="Corrected">Corrected</option>
              <option value="Confirmed legitimate">Confirmed legitimate</option>
            </select>

            <select
              value={filterRule}
              onChange={(e) => setFilterRule(e.target.value)}
              aria-label="Filter by anomaly rule"
              className="rounded-lg border border-border bg-page px-3 py-1.5 text-xs font-medium text-text"
            >
              <option value="All">All 5 Control Rules</option>
              <option value="duplicate_account">Duplicate account</option>
              <option value="inconsistent_record">Inconsistent record</option>
              <option value="abnormal_overtime">Abnormal overtime</option>
              <option value="attendance_mismatch">Attendance mismatch</option>
              <option value="inactive_employee_paid">Inactive employee paid</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-border">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-page/50 transition-colors"
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={item.status} />
                  <span
                    style={{
                      backgroundColor: "var(--primary-soft)",
                      color: "var(--primary)",
                    }}
                    className="rounded-md px-2 py-0.5 text-xs font-semibold"
                  >
                    Rule: {item.ruleName}
                  </span>
                  <span className="text-sm font-bold text-text">
                    {item.employeeName} ({item.staffId})
                  </span>
                  <span className="text-xs text-muted">· {item.department}</span>
                </div>

                <p className="text-xs text-text leading-relaxed">
                  <strong>Evidence:</strong> {item.evidence}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted tabular-nums">
                  <span>
                    Amount Involved:{" "}
                    <strong className="text-text">
                      {formatGHS(item.amountInvolvedPesewas)}
                    </strong>
                  </span>
                  <span>Detected: {formatDateTime(item.detectedAt)}</span>
                </div>

                {item.resolutionNote && (
                  <div className="mt-2 rounded-lg bg-page p-2.5 border border-border text-xs">
                    <span className="font-semibold text-text">
                      Resolution Note ({item.resolvedBy}):
                    </span>{" "}
                    <span className="text-muted">{item.resolutionNote}</span>
                  </div>
                )}
              </div>

              {item.status === "Needs review" && (
                <div className="flex items-center gap-2 shrink-0">
                  {canResolve ? (
                    <>
                      <button
                        type="button"
                        disabled={isOffline}
                        title={isOffline ? "Needs a connection" : "Mark Corrected & recalculate"}
                        onClick={() => handleOpenResolveModal(item, "Corrected")}
                        style={
                          !isOffline
                            ? { backgroundColor: "var(--primary)" }
                            : undefined
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                          isOffline
                            ? "bg-page border border-border text-muted cursor-not-allowed"
                            : "text-white hover:opacity-95"
                        }`}
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Mark Corrected</span>
                      </button>

                      <button
                        type="button"
                        disabled={isOffline}
                        title={
                          isOffline
                            ? "Needs a connection"
                            : "Confirm legitimate with required note"
                        }
                        onClick={() =>
                          handleOpenResolveModal(item, "Confirmed legitimate")
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:border-primary disabled:opacity-40"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-teal" />
                        <span>Confirm Legitimate</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted italic">
                      View only (HR/Payroll resolves flags)
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Required Note Resolution Modal */}
      {activeAnomaly && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="veltra-card w-full max-w-lg p-6">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text">
                  Resolve Flagged Record ({activeAnomaly.ruleName})
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {activeAnomaly.employeeName} ({activeAnomaly.staffId}) · Amount Involved:{" "}
                  {formatGHS(activeAnomaly.amountInvolvedPesewas)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAnomaly(null)}
                className="rounded-lg p-1 text-muted hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolution} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Resolution Outcome
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Corrected", "Confirmed legitimate"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setResolutionChoice(opt)}
                      className={`rounded-lg border p-2.5 text-left text-xs font-semibold ${
                        resolutionChoice === opt
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-page text-text"
                      }`}
                    >
                      <div>{opt}</div>
                      <div className="text-[11px] font-normal text-muted mt-0.5">
                        {opt === "Corrected"
                          ? "Adjusts record & recalculates payroll run"
                          : "Keeps calculation & logs justification"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="resolution-note"
                  className="block text-xs font-semibold text-text mb-1.5"
                >
                  Required Audit Note <span className="text-status-red-fg">*</span>
                </label>
                <textarea
                  id="resolution-note"
                  rows={3}
                  required
                  value={resolutionNote}
                  onChange={(e) => {
                    setResolutionNote(e.target.value);
                    setNoteError(null);
                  }}
                  placeholder="State the verification steps taken or correction applied..."
                  className="w-full rounded-lg border border-border bg-page p-2.5 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
                />
                {noteError && (
                  <p className="mt-1 text-xs font-medium text-status-red-fg">
                    {noteError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAnomaly(null)}
                  className="rounded-lg border border-border bg-page px-3.5 py-2 text-xs font-semibold text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: "var(--primary)" }}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                >
                  Save Resolution & Recalculate Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
