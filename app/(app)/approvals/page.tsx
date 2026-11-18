"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getPayrollRuns,
  actOnPayrollRunApproval,
  getSystemRules,
} from "@/lib/data";
import { formatGHS, formatDate, formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CheckCircle2,
  XCircle,
  Clock,
  WifiOff,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

export default function ApprovalsPage() {
  const { user, connectionState } = useAuth();
  const runs = getPayrollRuns().slice().reverse();
  const rules = getSystemRules();

  const [commentByRun, setCommentByRun] = useState<Record<string, string>>({});
  const [errorByRun, setErrorByRun] = useState<Record<string, string>>({});

  const isOffline = connectionState === "offline";

  const handleDecision = (runId: string, decision: "Approved" | "Rejected") => {
    const comment = (commentByRun[runId] ?? "").trim();
    if (!comment) {
      setErrorByRun((prev) => ({
        ...prev,
        [runId]: "Please enter an approval or rejection comment for the audit trail.",
      }));
      return;
    }

    actOnPayrollRunApproval({
      runId,
      decision,
      comment,
      actorName: user.name,
      actorRole: user.role,
    });
    setCommentByRun((prev) => ({ ...prev, [runId]: "" }));
    setErrorByRun((prev) => ({ ...prev, [runId]: "" }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            Multi-Stage Payroll Approvals
          </h1>
          <p className="text-xs text-muted mt-1">
            Configured sequence:{" "}
            <strong className="text-text">
              {rules.approvalSequence.join(" → ")}
            </strong>{" "}
            (Editable in Settings). Signed in as{" "}
            <strong className="text-primary">{user.role}</strong>.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {runs.map((run) => {
          const pendingStage = run.approvalStages.find(
            (s) => s.status === "Pending"
          );
          const isMyTurn = pendingStage?.stageName === user.role;

          return (
            <div key={run.id} className="veltra-card p-6 space-y-5">
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-text">
                      {run.periodLabel}
                    </h2>
                    <StatusPill status={run.status} />
                    {isMyTurn && (
                      <span
                        style={{
                          backgroundColor: "var(--primary-soft)",
                          color: "var(--primary)",
                        }}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      >
                        Waiting for your stage ({user.role})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1 tabular-nums">
                    {run.employeeCount} Employees · Total Cost:{" "}
                    <strong className="text-text">
                      {formatGHS(run.totalPayrollCostPesewas)}
                    </strong>{" "}
                    · Net Pay:{" "}
                    <strong className="text-text">
                      {formatGHS(run.totalNetPesewas)}
                    </strong>{" "}
                    · Pay Date: {formatDate(run.payDate)}
                  </p>
                </div>
              </div>

              {/* Stage Stepper (PRD Section 7.6 & 14) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {run.approvalStages.map((stage, idx) => {
                  const approved = stage.status === "Approved";
                  const pending = stage.status === "Pending";
                  const rejected = stage.status === "Rejected";

                  return (
                    <div
                      key={`${run.id}-${stage.stageName}`}
                      className={`rounded-xl border p-4 ${
                        approved
                          ? "border-border bg-status-green-bg/30"
                          : pending
                          ? "border-primary bg-primary-soft/25"
                          : "border-border bg-page/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text">
                          Stage {idx + 1}: {stage.stageName}
                        </span>
                        <StatusPill status={stage.status} />
                      </div>

                      {stage.actorName ? (
                        <div className="mt-2.5 text-xs space-y-1">
                          <div className="font-semibold text-text">
                            {stage.actorName}
                          </div>
                          {stage.actedAt && (
                            <div className="text-[11px] text-muted">
                              {formatDateTime(stage.actedAt)}
                            </div>
                          )}
                          {stage.comment && (
                            <p className="text-xs text-muted italic mt-1">
                              &ldquo;{stage.comment}&rdquo;
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2.5 text-xs text-muted">
                          {pending
                            ? `Awaiting ${stage.stageName} review and sign-off.`
                            : "Waiting for earlier stage completion."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Controls if Pending */}
              {pendingStage && (
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label
                        htmlFor={`comment-${run.id}`}
                        className="sr-only"
                      >
                        Approval or rejection comment
                      </label>
                      <input
                        id={`comment-${run.id}`}
                        type="text"
                        value={commentByRun[run.id] ?? ""}
                        onChange={(e) => {
                          setCommentByRun((prev) => ({
                            ...prev,
                            [run.id]: e.target.value,
                          }));
                          if (errorByRun[run.id]) {
                            setErrorByRun((prev) => ({ ...prev, [run.id]: "" }));
                          }
                        }}
                        placeholder={`Add required comment for ${pendingStage.stageName} stage sign-off...`}
                        className="h-10 w-full rounded-lg border border-border bg-page px-3.5 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        disabled={isOffline}
                        title={
                          isOffline
                            ? "Needs a connection"
                            : `Approve as ${pendingStage.stageName}`
                        }
                        onClick={() => handleDecision(run.id, "Approved")}
                        style={
                          !isOffline
                            ? { backgroundColor: "var(--primary)" }
                            : undefined
                        }
                        className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold ${
                          isOffline
                            ? "bg-page border border-border text-muted cursor-not-allowed"
                            : "text-white hover:opacity-95"
                        }`}
                      >
                        {isOffline ? (
                          <WifiOff className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isOffline
                            ? "Approve (Needs a connection)"
                            : `Approve Stage (${pendingStage.stageName})`}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isOffline}
                        title={isOffline ? "Needs a connection" : "Reject with comment"}
                        onClick={() => handleDecision(run.id, "Rejected")}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-xs font-semibold text-status-red-fg hover:bg-status-red-bg disabled:opacity-40"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                  {errorByRun[run.id] && (
                    <p className="text-xs font-medium text-status-red-fg">
                      {errorByRun[run.id]}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
