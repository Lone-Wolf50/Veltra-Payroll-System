"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getLeaveRequests,
  getEmployeeLeaveBalances,
  submitLeaveRequest,
  reviewLeaveRequest,
} from "@/lib/data";
import { LeaveType } from "@/lib/types";
import { formatDate, formatDateTime, formatGHS } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CalendarDays,
  Plus,
  Upload,
  CheckCircle2,
  XCircle,
  X,
  Paperclip,
  AlertTriangle,
  ArrowRight,
  Clock,
  ShieldCheck,
} from "lucide-react";

const LEAVE_TYPES: {
  type: LeaveType;
  badge: string;
  description: string;
}[] = [
  {
    type: "Annual Leave",
    badge: "Paid · 15 working days/yr",
    description: "Deducted from actual working days; does not reduce salary.",
  },
  {
    type: "Sick Leave",
    badge: "Paid · 12 days/yr",
    description: "Deducted from actual working days; attach medical note if available.",
  },
  {
    type: "Casual Leave",
    badge: "Unpaid",
    description: "Deducted from actual working days and prorated from Basic, Position & Performance.",
  },
  {
    type: "Maternity Leave",
    badge: "Paid · 3 months (60 working days)/yr",
    description: "Paid statutory maternity leave; attach supporting medical document.",
  },
  {
    type: "Work Injury Leave",
    badge: "Paid · Indefinite",
    description: "Paid work-related injury recovery leave; attach incident/medical report.",
  },
];

function countWorkingDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function LeaveApplicationsPage() {
  const { user, connectionState } = useAuth();
  const isOffline = connectionState === "offline";
  const canApprove = user.role === "Supervisor" || user.role === "HR/Payroll";

  const balances = getEmployeeLeaveBalances(user.employeeId);
  const allRequests = getLeaveRequests();
  const myRequests = allRequests.filter((r) => r.employeeId === user.employeeId);
  const approvalQueue = allRequests;
  const pendingApprovalCount = approvalQueue.filter(
    (r) => r.status === "Pending"
  ).length;

  const [activeTab, setActiveTab] = useState<"mine" | "approvals">(
    canApprove && pendingApprovalCount > 0 ? "approvals" : "mine"
  );
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    showPayrollLink?: boolean;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Leave Application Form State
  const [leaveType, setLeaveType] = useState<LeaveType>("Annual Leave");
  const [applicationMode, setApplicationMode] = useState<"All day" | "Half day">(
    "All day"
  );
  const [startDate, setStartDate] = useState("2026-11-23");
  const [endDate, setEndDate] = useState("2026-11-24");
  const [reason, setReason] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const durationDays = useMemo(() => {
    if (applicationMode === "Half day") {
      return startDate ? 0.5 : 0;
    }
    return countWorkingDays(startDate, endDate);
  }, [applicationMode, startDate, endDate]);

  const currentTypeBalanceText = useMemo(() => {
    switch (leaveType) {
      case "Annual Leave":
        return `${balances.annualRemainingDays} working days remaining (of ${balances.annualEntitlementDays} days/year)`;
      case "Sick Leave":
        return `${balances.sickRemainingDays} days remaining (of ${balances.sickEntitlementDays} days/year)`;
      case "Maternity Leave":
        return `${balances.maternityRemainingDays} working days remaining (3 months/year)`;
      case "Casual Leave":
        return `${balances.casualUsedDays} day(s) taken this year`;
      case "Work Injury Leave":
        return `Indefinite · ${balances.workInjuryUsedDays} day(s) taken this year`;
    }
  }, [leaveType, balances]);

  const attachmentRecommended =
    leaveType === "Sick Leave" ||
    leaveType === "Maternity Leave" ||
    leaveType === "Work Injury Leave";

  const handleOpenModal = () => {
    setFormError(null);
    setLeaveType("Annual Leave");
    setApplicationMode("All day");
    setStartDate("2026-11-23");
    setEndDate("2026-11-24");
    setReason("");
    setAttachmentName("");
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (durationDays <= 0) {
      setFormError("Please select a valid working date range (End Date must be on or after Start Date).");
      return;
    }
    if (!reason.trim()) {
      setFormError("Please enter a reason for your leave application.");
      return;
    }

    const res = submitLeaveRequest({
      employeeId: user.employeeId,
      leaveType,
      applicationMode,
      startDate,
      endDate: applicationMode === "Half day" ? startDate : endDate,
      durationDays,
      reason,
      attachmentName: attachmentName || undefined,
      actorRole: user.role,
    });

    if (!res.ok) {
      setFormError(res.error || "Could not submit leave request.");
      return;
    }

    setShowModal(false);
    setFeedback({
      message: `${leaveType} application (${durationDays} day${
        durationDays === 1 ? "" : "s"
      }) submitted for approval.`,
    });
    setActiveTab("mine");
  };

  const handleReview = (
    requestId: string,
    decision: "Approved" | "Rejected"
  ) => {
    const res = reviewLeaveRequest({
      requestId,
      decision,
      reviewerName: user.name,
      reviewerRole: user.role,
      comment:
        decision === "Approved"
          ? "Approved and applied to November 2026 payroll."
          : "Declined due to operational coverage.",
    });

    if (!res.ok || !res.request) return;

    if (decision === "Approved" && res.updatedPayrollRecord) {
      const rec = res.updatedPayrollRecord;
      setFeedback({
        message: `Approved ${res.request.durationDays} day(s) of ${res.request.leaveType} for ${
          res.request.employeeName
        }. Nov 2026 payroll recalculated live: Actual ${rec.daysAttended}/${
          rec.daysExpected
        } days, Paid ${rec.daysPaid} days, Basic Earned ${formatGHS(
          rec.basicSalaryPesewas
        )}, Net Pay ${formatGHS(rec.netPayPesewas)}.`,
        showPayrollLink: user.role === "HR/Payroll",
      });
    } else {
      setFeedback({
        message: `${decision} ${res.request.leaveType} request for ${res.request.employeeName}.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            Leave Applications
          </h1>
          <p className="text-xs text-muted mt-1">
            Apply for leave, track remaining day balances, and apply approved leaves directly to monthly payroll.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          disabled={isOffline}
          style={!isOffline ? { backgroundColor: "var(--primary)" } : undefined}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm whitespace-nowrap ${
            isOffline
              ? "bg-page border border-border text-muted cursor-not-allowed"
              : "text-white hover:opacity-95"
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>New Leave Application</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            backgroundColor: "var(--status-green-bg)",
            color: "var(--status-green-fg)",
          }}
          className="rounded-xl border border-border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{feedback.message}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {feedback.showPayrollLink && (
              <Link
                href="/payroll"
                className="inline-flex items-center gap-1 underline hover:opacity-80"
              >
                <span>View Payroll Breakdown</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Leave Balance Cards (in days) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="veltra-card p-4">
          <span className="text-xs font-semibold text-muted block">Annual Leave</span>
          <div className="mt-2.5 text-2xl font-bold text-text tabular-nums">
            {balances.annualRemainingDays}{" "}
            <span className="text-xs font-medium text-muted">
              / {balances.annualEntitlementDays} days
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {balances.annualUsedDays} day(s) used this year
          </p>
        </div>

        <div className="veltra-card p-4">
          <span className="text-xs font-semibold text-muted block">Sick Leave</span>
          <div className="mt-2.5 text-2xl font-bold text-text tabular-nums">
            {balances.sickRemainingDays}{" "}
            <span className="text-xs font-medium text-muted">
              / {balances.sickEntitlementDays} days
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {balances.sickUsedDays} day(s) used this year
          </p>
        </div>

        <div className="veltra-card p-4">
          <span className="text-xs font-semibold text-muted block">Maternity Leave</span>
          <div className="mt-2.5 text-2xl font-bold text-text tabular-nums">
            {balances.maternityRemainingDays}{" "}
            <span className="text-xs font-medium text-muted">
              / {balances.maternityEntitlementDays} days
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">3 months annual entitlement</p>
        </div>

        <div className="veltra-card p-4">
          <span className="text-xs font-semibold text-muted block">Casual Leave</span>
          <div className="mt-2.5 text-2xl font-bold text-text tabular-nums">
            {balances.casualUsedDays}{" "}
            <span className="text-xs font-medium text-muted">days used</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Taken this year
          </p>
        </div>

        <div className="veltra-card p-4">
          <span className="text-xs font-semibold text-muted block">Work Injury</span>
          <div className="mt-2.5 text-2xl font-bold text-text">
            Indefinite
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {balances.workInjuryUsedDays} day(s) recorded
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("mine")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold border transition-colors ${
            activeTab === "mine"
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-surface text-muted hover:text-text"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>My Applications ({myRequests.length})</span>
        </button>

        {canApprove && (
          <button
            type="button"
            onClick={() => setActiveTab("approvals")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold border transition-colors ${
              activeTab === "approvals"
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:text-text"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              Staff Leave Approvals{" "}
              {pendingApprovalCount > 0 ? `(${pendingApprovalCount} Pending)` : ""}
            </span>
          </button>
        )}
      </div>

      {/* Tab 1: My Leave Requests */}
      {activeTab === "mine" && (
        <div className="veltra-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text">
                My Leave History — {user.name}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Absent days are tracked automatically from clock-in attendance and do not require a leave form.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {myRequests.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted">
                You have not submitted any leave applications yet. Click{" "}
                <strong className="text-text">New Leave Application</strong> to request leave.
              </div>
            ) : (
              myRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-page/40"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-text">
                        {req.leaveType}
                      </span>
                      <StatusPill status={req.status} />
                    </div>
                    <div className="text-xs text-muted tabular-nums">
                      {formatDate(req.startDate)} → {formatDate(req.endDate)} ·{" "}
                      <strong className="text-text">
                        {req.durationDays} working day{req.durationDays === 1 ? "" : "s"}
                      </strong>{" "}
                      ({req.applicationMode})
                    </div>
                    <p className="text-xs text-text">{req.reason}</p>
                    {req.attachmentName && (
                      <div className="inline-flex items-center gap-1 rounded bg-page border border-border px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Paperclip className="h-3 w-3" />
                        <span>{req.attachmentName}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs sm:text-right text-muted tabular-nums shrink-0">
                    <div>Submitted {formatDateTime(req.submittedAt)}</div>
                    {req.reviewedBy && (
                      <div className="mt-1 text-text font-medium">
                        {req.status} by {req.reviewedBy} ({req.reviewedByRole})
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Staff Leave Approvals (Supervisor & HR/Payroll) */}
      {activeTab === "approvals" && canApprove && (
        <div className="veltra-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-bold text-text">
              Staff Leave Approval Queue
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Approving a leave request automatically deducts the employee&apos;s balance and updates their November 2026 payroll calculation in real time.
            </p>
          </div>

          <div className="divide-y divide-border">
            {approvalQueue.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted">
                No staff leave applications found.
              </div>
            ) : (
              approvalQueue.map((req) => (
                <div
                  key={req.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-page/40"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-text">
                        {req.employeeName} ({req.staffId})
                      </span>
                      <span className="text-xs text-muted">· {req.department}</span>
                      <StatusPill status={req.leaveType} variant="violet" />
                      <StatusPill status={req.status} />
                    </div>
                    <div className="text-xs text-muted tabular-nums">
                      {formatDate(req.startDate)} → {formatDate(req.endDate)} ·{" "}
                      <strong className="text-text">
                        {req.durationDays} working day{req.durationDays === 1 ? "" : "s"}
                      </strong>{" "}
                      ({req.applicationMode}) · Submitted {formatDateTime(req.submittedAt)}
                    </div>
                    <p className="text-xs text-text">{req.reason}</p>
                    {req.attachmentName && (
                      <div className="inline-flex items-center gap-1 rounded bg-page border border-border px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Paperclip className="h-3 w-3" />
                        <span>Appendix: {req.attachmentName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === "Pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleReview(req.id, "Rejected")}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-page px-3 py-1.5 text-xs font-semibold text-text hover:border-status-red-fg hover:text-status-red-fg disabled:opacity-40"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleReview(req.id, "Approved")}
                          style={{ backgroundColor: "var(--primary)" }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve &amp; Apply to Payroll</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-muted sm:text-right">
                        <div className="font-semibold text-text">
                          {req.status} by {req.reviewedBy}
                        </div>
                        {req.reviewedAt && (
                          <div className="text-[11px] tabular-nums">
                            {formatDateTime(req.reviewedAt)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* New Leave Application Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
        >
          <form
            onSubmit={handleSubmit}
            className="veltra-card w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3
                  id="leave-modal-title"
                  className="text-base font-bold text-text"
                >
                  New Leave Application Form
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Applicant: <strong>{user.name}</strong> ({user.role} · {user.department})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-page hover:text-text"
                aria-label="Close leave modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  backgroundColor: "var(--status-red-bg)",
                  color: "var(--status-red-fg)",
                }}
                className="mt-4 rounded-lg px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="mt-4 space-y-4 text-xs">
              {/* Leave Type Dropdown */}
              <div>
                <label
                  htmlFor="leave-type-select"
                  className="block font-semibold text-text mb-1"
                >
                  * Application Form Type
                </label>
                <select
                  id="leave-type-select"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs font-medium text-text focus:border-primary focus:outline-none"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt.type} value={lt.type}>
                      {lt.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Available Balance */}
              <div
                style={{
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
                className="rounded-lg p-3 flex items-center justify-between gap-2"
              >
                <span className="font-semibold">Current Available Balance:</span>
                <span className="font-bold tabular-nums text-right">
                  {currentTypeBalanceText}
                </span>
              </div>

              {/* Application Mode */}
              <div>
                <span className="block font-semibold text-text mb-1.5">
                  * Application Mode
                </span>
                <div className="flex items-center gap-4">
                  {(["All day", "Half day"] as const).map((mode) => (
                    <label
                      key={mode}
                      className="inline-flex items-center gap-2 cursor-pointer font-medium text-text"
                    >
                      <input
                        type="radio"
                        name="leave-mode"
                        checked={applicationMode === mode}
                        onChange={() => setApplicationMode(mode)}
                        className="accent-primary"
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="leave-start-date"
                    className="block font-semibold text-text mb-1"
                  >
                    * Start Date
                  </label>
                  <input
                    id="leave-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                  />
                </div>
                {applicationMode === "All day" && (
                  <div>
                    <label
                      htmlFor="leave-end-date"
                      className="block font-semibold text-text mb-1"
                    >
                      * End Date
                    </label>
                    <input
                      id="leave-end-date"
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Actual Total Duration */}
              <div className="rounded-lg border border-border bg-page p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted">Actual Total Duration:</span>
                </div>
                <strong className="text-text text-sm tabular-nums">
                  {durationDays} {durationDays === 1 ? "Day" : "Days"}
                </strong>
              </div>

              {/* Reason for Leave */}
              <div>
                <label
                  htmlFor="leave-reason"
                  className="block font-semibold text-text mb-1"
                >
                  * Reason for Leave
                </label>
                <textarea
                  id="leave-reason"
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for your leave application..."
                  className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text leading-relaxed focus:border-primary focus:bg-surface focus:outline-none"
                />
              </div>

              {/* Appendix / Supporting Attachments */}
              <div>
                <label
                  htmlFor="leave-appendix"
                  className="block font-semibold text-text mb-1"
                >
                  Appendix / Attachments{" "}
                  <span className="font-normal text-muted">
                    {attachmentRecommended
                      ? "(recommended for Sick, Maternity & Work Injury leave)"
                      : "(optional)"}
                  </span>
                </label>
                <label
                  htmlFor="leave-appendix"
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-page p-4 cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-text">
                    {attachmentName
                      ? attachmentName
                      : "Click to upload medical note or supporting document"}
                  </span>
                  <span className="text-[11px] text-muted">
                    PDF, JPG, PNG, or DOCX
                  </span>
                  <input
                    id="leave-appendix"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setAttachmentName(f ? f.name : "");
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-border bg-page px-4 py-2 text-xs font-semibold text-text hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ backgroundColor: "var(--primary)" }}
                className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                <span>Submit Application</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
