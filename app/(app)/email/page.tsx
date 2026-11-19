"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getEmployees,
  getPayrollRecords,
  getEmailLogs,
  sendHrPayrollEmail,
} from "@/lib/data";
import { Department, Employee } from "@/lib/types";
import { formatGHS, formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Mail,
  Users,
  User as UserIcon,
  Send,
  History,
  CheckCircle2,
  Search,
  FileText,
  WifiOff,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from "lucide-react";

type EmailTab = "bulk" | "individual" | "history";
type BulkAudience = "all_active" | "department" | "flagged" | "custom";

const DEPARTMENTS: Department[] = [
  "Manufacturing & Assembly",
  "Logistics & Warehouse",
  "Sales & Distribution",
  "Finance & Accounting",
  "HR & Corporate Admin",
];

const BULK_TEMPLATES = [
  {
    id: "payslip_ready",
    label: "Payslip Ready",
    subject: "November 2026 Payslip Now Available",
    title: "November 2026 Statutory Payslip Notice",
    body: "Dear {{name}},\n\nYour November 2026 statutory payslip for Sunda Ghana Limited is now available in the Veltra Payroll portal.\n\nPlease log in to review your earnings, pre-tax deductions, GRA PAYE, and SSNIT breakdown.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: true,
  },
  {
    id: "cutoff_reminder",
    label: "Payroll Cutoff Reminder",
    subject: "Reminder: November 2026 Payroll Attendance & Adjustments Cutoff",
    title: "Payroll Cycle Cutoff Reminder — November 2026",
    body: "Dear {{name}},\n\nThis is a reminder that attendance verification and payroll adjustment submissions for the {{period}} cycle close this Friday at 17:00 GMT.\n\nPlease ensure all overtime logs and deduction adjustments are submitted through your department supervisor.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: false,
  },
  {
    id: "statutory_update",
    label: "SSNIT / Ghana Card Update",
    subject: "Action Required: Statutory Record Verification (SSNIT & Ghana Card)",
    title: "Statutory Compliance & Record Verification",
    body: "Dear {{name}},\n\nAs part of our GRA Act 1178 and SSNIT compliance audit for {{department}}, please verify that your SSNIT number and Ghana Card ID on file are accurate.\n\nContact the HR/Payroll office if any updates are required.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: false,
  },
  {
    id: "general",
    label: "General HR Notice",
    subject: "HR & Payroll Notice — Sunda Ghana Limited",
    title: "Official HR & Payroll Announcement",
    body: "Dear {{name}},\n\n\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: false,
  },
];

const INDIVIDUAL_TEMPLATES = [
  {
    id: "ind_payslip",
    label: "Payslip Dispatch",
    subject: "Your November 2026 Payslip — Sunda Ghana Limited",
    title: "November 2026 Individual Payslip Dispatch",
    body: "Dear {{name}} ({{staffId}}),\n\nPlease find attached your November 2026 payroll summary. You can also download the printable PDF version from the My Payslips section of the portal.\n\nIf you have any questions regarding your deductions or net pay, please reply to HR/Payroll.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: true,
  },
  {
    id: "ind_statutory",
    label: "Missing SSNIT / ID",
    subject: "Action Required: Update Your Statutory Details ({{staffId}})",
    title: "Statutory Record Verification Request",
    body: "Dear {{name}},\n\nOur payroll compliance check flagged incomplete statutory details on your personnel file. Please provide a copy of your Ghana Card and SSNIT card to HR/Payroll before the next pay run.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: false,
  },
  {
    id: "ind_anomaly",
    label: "Payroll Clarification",
    subject: "Payroll Verification Required — November 2026 Cycle",
    title: "Attendance & Payroll Verification Notice",
    body: "Dear {{name}},\n\nWe are reviewing your November 2026 payroll record ({{department}}) and need to confirm your shift attendance / overtime entries before final approval.\n\nPlease reach out to the HR/Payroll desk at your earliest convenience.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: false,
  },
  {
    id: "ind_ewa",
    label: "EWA Recovery Notice",
    subject: "Earned Wage Access (EWA) Payroll Recovery Notice",
    title: "EWA Advance Payroll Recovery Confirmation",
    body: "Dear {{name}},\n\nThis is to confirm that your approved Earned Wage Access advance for the November 2026 cycle has been scheduled for automatic deduction on this month's payroll.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    includePayslip: false,
  },
];

function renderMergeTags(text: string, emp: Employee | undefined): string {
  if (!emp) return text;
  return text
    .replace(/\{\{name\}\}/g, emp.fullName)
    .replace(/\{\{staffId\}\}/g, emp.staffId)
    .replace(/\{\{department\}\}/g, emp.department)
    .replace(/\{\{period\}\}/g, "November 2026");
}

export default function HrPayrollEmailPage() {
  const { user, connectionState } = useAuth();
  const employees = getEmployees();
  const novRecords = getPayrollRecords("run-2026-11");
  const emailLogs = getEmailLogs();

  const isOffline = connectionState === "offline";

  const [activeTab, setActiveTab] = useState<EmailTab>("bulk");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Bulk email state
  const [bulkAudience, setBulkAudience] = useState<BulkAudience>("all_active");
  const [bulkDepartment, setBulkDepartment] = useState<Department>(
    "Manufacturing & Assembly"
  );
  const [customSearch, setCustomSearch] = useState("");
  const [customSelectedIds, setCustomSelectedIds] = useState<string[]>([]);
  const [bulkTestEmails, setBulkTestEmails] = useState("");
  const [bulkSubject, setBulkSubject] = useState(BULK_TEMPLATES[0].subject);
  const [bulkTitle, setBulkTitle] = useState(BULK_TEMPLATES[0].title);
  const [bulkBody, setBulkBody] = useState(BULK_TEMPLATES[0].body);
  const [bulkIncludePayslip, setBulkIncludePayslip] = useState(true);
  const [showBulkPreview, setShowBulkPreview] = useState(false);

  // Individual email state
  const [indSearch, setIndSearch] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    employees[1]?.id ?? employees[0]?.id ?? ""
  );
  const [indDeliveryEmail, setIndDeliveryEmail] = useState<string>(
    employees[1]?.email ?? employees[0]?.email ?? ""
  );
  const [indSubject, setIndSubject] = useState(INDIVIDUAL_TEMPLATES[0].subject);
  const [indTitle, setIndTitle] = useState(INDIVIDUAL_TEMPLATES[0].title);
  const [indBody, setIndBody] = useState(INDIVIDUAL_TEMPLATES[0].body);
  const [indIncludePayslip, setIndIncludePayslip] = useState(true);
  const [showIndPreview, setShowIndPreview] = useState(false);

  // Sent history state
  const [historyFilter, setHistoryFilter] = useState<"All" | "Bulk" | "Individual">("All");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Support deep link /email?employeeId=... from Employee Directory
  useEffect(() => {
    if (typeof window === "undefined") return;
    const empId = new URLSearchParams(window.location.search).get("employeeId");
    if (empId && employees.some((e) => e.id === empId)) {
      setSelectedEmpId(empId);
      setActiveTab("individual");
    }
  }, [employees]);

  const flaggedEmployeeIds = useMemo(
    () => new Set(novRecords.filter((r) => r.hasOpenAnomaly).map((r) => r.employeeId)),
    [novRecords]
  );

  const bulkRecipients = useMemo(() => {
    if (bulkAudience === "all_active") {
      return employees.filter((e) => e.status === "Active");
    }
    if (bulkAudience === "department") {
      return employees.filter(
        (e) => e.status === "Active" && e.department === bulkDepartment
      );
    }
    if (bulkAudience === "flagged") {
      return employees.filter((e) => flaggedEmployeeIds.has(e.id));
    }
    const idSet = new Set(customSelectedIds);
    return employees.filter((e) => idSet.has(e.id));
  }, [bulkAudience, bulkDepartment, customSelectedIds, employees, flaggedEmployeeIds]);

  const filteredCustomEmployees = useMemo(() => {
    if (!customSearch.trim()) return employees.slice(0, 60);
    const q = customSearch.toLowerCase();
    return employees
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.staffId.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [employees, customSearch]);

  const filteredIndEmployees = useMemo(() => {
    if (!indSearch.trim()) return employees.slice(0, 60);
    const q = indSearch.toLowerCase();
    return employees
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.staffId.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [employees, indSearch]);

  const selectedIndividualEmp = useMemo(
    () => employees.find((e) => e.id === selectedEmpId) ?? employees[0],
    [employees, selectedEmpId]
  );

  useEffect(() => {
    if (selectedIndividualEmp) {
      setIndDeliveryEmail(selectedIndividualEmp.email);
    }
  }, [selectedIndividualEmp]);

  const parsedBulkTestEmails = useMemo(
    () =>
      bulkTestEmails
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes("@")),
    [bulkTestEmails]
  );

  const selectedIndividualRecord = useMemo(
    () =>
      selectedIndividualEmp
        ? novRecords.find((r) => r.employeeId === selectedIndividualEmp.id)
        : undefined,
    [novRecords, selectedIndividualEmp]
  );

  const toggleCustomEmployee = (id: string) => {
    setCustomSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEmails =
      parsedBulkTestEmails.length > 0
        ? parsedBulkTestEmails
        : bulkRecipients.map((r) => r.email);

    if (
      isOffline ||
      isSending ||
      effectiveEmails.length === 0 ||
      !bulkSubject.trim() ||
      !bulkBody.trim()
    ) {
      return;
    }

    setFeedback(null);
    setErrorFeedback(null);
    setIsSending(true);

    const sampleEmp = bulkRecipients[0] ?? employees[0];
    const renderedSubject = renderMergeTags(bulkSubject, sampleEmp);
    const renderedTitle = renderMergeTags(bulkTitle, sampleEmp);
    const renderedBody = renderMergeTags(bulkBody, sampleEmp);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Bulk",
          to: effectiveEmails,
          subject: renderedSubject,
          title: renderedTitle,
          body: renderedBody,
          includePayslipSummary: bulkIncludePayslip,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        sentCount?: number;
      };

      if (!res.ok || !data.ok) {
        setErrorFeedback(data.error || "Failed to send bulk email via SMTP.");
        return;
      }

      const summaryLabel =
        parsedBulkTestEmails.length > 0
          ? `Test Delivery (${parsedBulkTestEmails.join(", ")})`
          : bulkAudience === "all_active"
          ? `All Active Staff (${bulkRecipients.length} recipients)`
          : bulkAudience === "department"
          ? `${bulkDepartment} (${bulkRecipients.length} recipients)`
          : bulkAudience === "flagged"
          ? `Flagged Payroll Records — Nov 2026 (${bulkRecipients.length} recipients)`
          : `Custom Selection (${bulkRecipients.length} recipients)`;

      sendHrPayrollEmail({
        type: "Bulk",
        subject: renderedSubject,
        title: renderedTitle,
        body: renderedBody,
        recipientSummary: summaryLabel,
        recipientEmails: effectiveEmails,
        departmentFilter:
          bulkAudience === "department" ? bulkDepartment : "All Departments",
        includePayslipSummary: bulkIncludePayslip,
        sentBy: user.name,
        sentByRole: user.role,
      });

      setFeedback(
        `Bulk email "${renderedSubject}" delivered via Gmail SMTP to ${effectiveEmails.length} recipient${
          effectiveEmails.length === 1 ? "" : "s"
        }.`
      );
    } catch {
      setErrorFeedback("Network error while contacting /api/email/send.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = indDeliveryEmail.trim();
    if (
      isOffline ||
      isSending ||
      !selectedIndividualEmp ||
      !targetEmail ||
      !indSubject.trim() ||
      !indBody.trim()
    ) {
      return;
    }

    setFeedback(null);
    setErrorFeedback(null);
    setIsSending(true);

    const renderedSubject = renderMergeTags(indSubject, selectedIndividualEmp);
    const renderedTitle = renderMergeTags(indTitle, selectedIndividualEmp);
    const renderedBody = renderMergeTags(indBody, selectedIndividualEmp);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Individual",
          to: [targetEmail],
          subject: renderedSubject,
          title: renderedTitle,
          body: renderedBody,
          includePayslipSummary: indIncludePayslip,
          payslipSummary: selectedIndividualRecord
            ? {
                periodLabel: "November 2026",
                employeeName: selectedIndividualEmp.fullName,
                staffId: selectedIndividualEmp.staffId,
                department: selectedIndividualEmp.department,
                grossPay: formatGHS(selectedIndividualRecord.grossPayPesewas),
                totalDeductions: formatGHS(
                  selectedIndividualRecord.totalDeductionsPesewas
                ),
                netPay: formatGHS(selectedIndividualRecord.netPayPesewas),
              }
            : undefined,
        }),
      });

      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setErrorFeedback(data.error || "Failed to send email via SMTP.");
        return;
      }

      sendHrPayrollEmail({
        type: "Individual",
        subject: renderedSubject,
        title: renderedTitle,
        body: renderedBody,
        recipientSummary: `${selectedIndividualEmp.fullName} (${targetEmail})`,
        recipientEmails: [targetEmail],
        includePayslipSummary: indIncludePayslip,
        sentBy: user.name,
        sentByRole: user.role,
      });

      setFeedback(
        `Email "${renderedSubject}" delivered via Gmail SMTP to ${targetEmail}.`
      );
    } catch {
      setErrorFeedback("Network error while contacting /api/email/send.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (historyFilter === "All") return emailLogs;
    return emailLogs.filter((l) => l.type === historyFilter);
  }, [emailLogs, historyFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            HR & Payroll Email
          </h1>
          <p className="text-xs text-muted mt-1">
            Sunda Ghana Limited · Send bulk staff announcements, payslip notifications, or individual employee emails.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-muted tabular-nums">
            Sent this cycle:{" "}
            <strong className="text-text">{emailLogs.length}</strong>
          </span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            backgroundColor: "var(--status-green-bg)",
            color: "var(--status-green-fg)",
          }}
          className="rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {errorFeedback && (
        <div
          style={{
            backgroundColor: "var(--status-red-bg)",
            color: "var(--status-red-fg)",
          }}
          className="rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorFeedback(null)}
            className="underline hover:opacity-80 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Offline notice */}
      {isOffline && (
        <div
          style={{
            backgroundColor: "var(--status-amber-bg)",
            color: "var(--status-amber-fg)",
          }}
          className="rounded-xl border border-border px-4 py-3 flex items-center gap-2.5 text-xs font-medium"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            You are currently offline. You can draft messages, but sending emails requires an active connection.
          </span>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("bulk")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold border transition-colors ${
            activeTab === "bulk"
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-surface text-muted hover:text-text"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Bulk Email</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("individual")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold border transition-colors ${
            activeTab === "individual"
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-surface text-muted hover:text-text"
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          <span>Individual Email</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold border transition-colors ${
            activeTab === "history"
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-surface text-muted hover:text-text"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Sent History ({emailLogs.length})</span>
        </button>
      </div>

      {/* 1. BULK EMAIL COMPOSER */}
      {activeTab === "bulk" && (
        <form onSubmit={handleSendBulk} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Audience Selection */}
          <div className="lg:col-span-5 space-y-4">
            <div className="veltra-card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-text">
                  1. Select Bulk Recipients
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Choose an employee group or hand-pick staff members.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "all_active", label: "All Active Staff" },
                  { id: "department", label: "By Department" },
                  { id: "flagged", label: "Flagged Payroll" },
                  { id: "custom", label: "Custom Selection" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBulkAudience(opt.id as BulkAudience)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold text-left transition-colors ${
                      bulkAudience === opt.id
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-page text-text hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {bulkAudience === "department" && (
                <div>
                  <label
                    htmlFor="bulk-dept-select"
                    className="block text-xs font-semibold text-text mb-1.5"
                  >
                    Department
                  </label>
                  <select
                    id="bulk-dept-select"
                    value={bulkDepartment}
                    onChange={(e) =>
                      setBulkDepartment(e.target.value as Department)
                    }
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs font-medium text-text focus:border-primary focus:outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bulkAudience === "custom" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                      <input
                        type="search"
                        value={customSearch}
                        onChange={(e) => setCustomSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="w-full rounded-lg border border-border bg-page pl-8 pr-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomSelectedIds(
                          filteredCustomEmployees.map((e) => e.id)
                        )
                      }
                      className="text-[11px] font-semibold text-primary hover:underline shrink-0"
                    >
                      Select Shown
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomSelectedIds([])}
                      className="text-[11px] font-semibold text-muted hover:text-text shrink-0"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-page">
                    {filteredCustomEmployees.map((emp) => {
                      const checked = customSelectedIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-surface"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCustomEmployee(emp.id)}
                            className="h-3.5 w-3.5 rounded accent-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-text truncate">
                              {emp.fullName}{" "}
                              <span className="text-muted font-normal">
                                ({emp.staffId})
                              </span>
                            </div>
                            <div className="text-[11px] text-muted truncate">
                              {emp.email} · {emp.department}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recipient Count Summary */}
              <div
                style={{
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
                className="rounded-lg p-3 flex items-center justify-between text-xs font-semibold tabular-nums"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  <span>
                    {parsedBulkTestEmails.length > 0
                      ? "Test Delivery Recipients"
                      : "Selected Recipients"}
                  </span>
                </span>
                <span className="text-sm font-bold">
                  {parsedBulkTestEmails.length > 0
                    ? `${parsedBulkTestEmails.length} test email${
                        parsedBulkTestEmails.length === 1 ? "" : "s"
                      }`
                    : `${bulkRecipients.length} staff`}
                </span>
              </div>

              {/* Optional Test Delivery Override */}
              <div className="pt-2 border-t border-border space-y-1.5">
                <label
                  htmlFor="bulk-test-emails"
                  className="block text-xs font-semibold text-text"
                >
                  Test Delivery Override{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="bulk-test-emails"
                  type="text"
                  value={bulkTestEmails}
                  onChange={(e) => setBulkTestEmails(e.target.value)}
                  placeholder="e.g. test1@gmail.com, test2@gmail.com"
                  className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
                />
                <p className="text-[11px] text-muted leading-relaxed">
                  Enter one or more real email addresses (comma-separated) to test live Gmail SMTP delivery instead of sending to mock @sundaghana.com addresses.
                </p>
              </div>

              {bulkRecipients.length > 0 && (
                <div className="text-[11px] text-muted">
                  Sample:{" "}
                  {bulkRecipients
                    .slice(0, 3)
                    .map((r) => r.email)
                    .join(", ")}
                  {bulkRecipients.length > 3
                    ? ` + ${bulkRecipients.length - 3} more`
                    : ""}
                </div>
              )}
            </div>
          </div>

          {/* Right: Bulk Message Composer */}
          <div className="lg:col-span-7 veltra-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-text">
                  2. Compose Bulk Message
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Use templates or merge tags to personalize each recipient&apos;s email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkPreview((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-page px-3 py-1.5 text-xs font-semibold text-text hover:border-primary"
              >
                {showBulkPreview ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span>{showBulkPreview ? "Edit Message" : "Preview"}</span>
              </button>
            </div>

            {/* Templates */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted mr-1">
                Templates:
              </span>
              {BULK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setBulkSubject(tpl.subject);
                    setBulkTitle(tpl.title);
                    setBulkBody(tpl.body);
                    setBulkIncludePayslip(tpl.includePayslip);
                  }}
                  className="rounded-md border border-border bg-page px-2.5 py-1 text-[11px] font-semibold text-text hover:border-primary hover:text-primary"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {showBulkPreview ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border border-border bg-page p-3 space-y-1">
                  <div className="text-muted">
                    From:{" "}
                    <strong className="text-text">
                      HR &amp; Payroll — Sunda Ghana Limited
                    </strong>
                  </div>
                  <div className="text-muted">
                    To:{" "}
                    <strong className="text-text">
                      {bulkRecipients[0]
                        ? `${bulkRecipients[0].fullName} <${bulkRecipients[0].email}>`
                        : "No recipients selected"}
                    </strong>{" "}
                    {bulkRecipients.length > 1 && (
                      <span className="text-muted">
                        (+ {bulkRecipients.length - 1} other recipients)
                      </span>
                    )}
                  </div>
                  <div className="text-muted pt-1 border-t border-border">
                    Subject:{" "}
                    <strong className="text-text">
                      {renderMergeTags(bulkSubject, bulkRecipients[0])}
                    </strong>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <div
                    style={{ backgroundColor: "var(--primary)" }}
                    className="px-4 py-2.5 text-white flex items-center justify-between"
                  >
                    <span className="font-bold tracking-tight">Sunda Ghana Limited</span>
                    <span className="text-[11px] opacity-90">HR &amp; Payroll</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {bulkTitle.trim() && (
                      <div className="pb-2.5 border-b border-border">
                        <h3 className="text-sm font-bold text-text">
                          {renderMergeTags(bulkTitle, bulkRecipients[0])}
                        </h3>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-text leading-relaxed">
                      {renderMergeTags(bulkBody, bulkRecipients[0])}
                    </div>
                    {bulkIncludePayslip && (
                      <div className="pt-2 border-t border-border">
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-page px-2.5 py-1.5 text-[11px] font-semibold text-primary">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Attachment: November_2026_Payslip_Summary.pdf</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="bulk-subject"
                    className="block text-xs font-semibold text-text mb-1"
                  >
                    Subject <span className="font-normal text-muted">(shown in inbox list)</span>
                  </label>
                  <input
                    id="bulk-subject"
                    type="text"
                    required
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bulk-title"
                    className="block text-xs font-semibold text-text mb-1"
                  >
                    Email Title / Heading <span className="font-normal text-muted">(bold heading inside email)</span>
                  </label>
                  <input
                    id="bulk-title"
                    type="text"
                    required
                    value={bulkTitle}
                    onChange={(e) => setBulkTitle(e.target.value)}
                    placeholder="Enter email heading or announcement title..."
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label
                      htmlFor="bulk-body"
                      className="text-xs font-semibold text-text"
                    >
                      Message
                    </label>
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="text-muted">Insert tag:</span>
                      {["{{name}}", "{{staffId}}", "{{department}}", "{{period}}"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setBulkBody((b) => `${b} ${tag}`)}
                            className="rounded border border-border bg-page px-1.5 py-0.5 font-mono text-primary hover:border-primary"
                          >
                            {tag}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <textarea
                    id="bulk-body"
                    rows={7}
                    required
                    value={bulkBody}
                    onChange={(e) => setBulkBody(e.target.value)}
                    placeholder="Write your announcement or payroll notice..."
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs text-text leading-relaxed focus:border-primary focus:bg-surface focus:outline-none"
                  />
                </div>
              </>
            )}

            <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
              <input
                type="checkbox"
                checked={bulkIncludePayslip}
                onChange={(e) => setBulkIncludePayslip(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              <span>
                Attach individual November 2026 payslip summary for each recipient
              </span>
            </label>

            <div className="pt-2 border-t border-border flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={
                  isOffline ||
                  isSending ||
                  (parsedBulkTestEmails.length === 0 && bulkRecipients.length === 0)
                }
                style={
                  !isOffline &&
                  !isSending &&
                  (parsedBulkTestEmails.length > 0 || bulkRecipients.length > 0)
                    ? { backgroundColor: "var(--primary)" }
                    : undefined
                }
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm ${
                  isOffline ||
                  isSending ||
                  (parsedBulkTestEmails.length === 0 && bulkRecipients.length === 0)
                    ? "bg-page border border-border text-muted cursor-not-allowed"
                    : "text-white hover:opacity-95"
                }`}
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>
                  {isSending
                    ? "Sending via Gmail SMTP..."
                    : isOffline
                    ? "Send Bulk Email (Needs a connection)"
                    : parsedBulkTestEmails.length > 0
                    ? `Send Test Bulk Email (${parsedBulkTestEmails.length})`
                    : `Send Bulk Email (${bulkRecipients.length} recipients)`}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 2. INDIVIDUAL EMAIL COMPOSER */}
      {activeTab === "individual" && (
        <form
          onSubmit={handleSendIndividual}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left: Employee Picker */}
          <div className="lg:col-span-5 veltra-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-text">
                1. Choose Employee
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Search by name, Staff ID, email, or department.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={indSearch}
                onChange={(e) => setIndSearch(e.target.value)}
                placeholder="Search employee..."
                className="w-full rounded-lg border border-border bg-page pl-8 pr-3 py-2 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
              />
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-page">
              {filteredIndEmployees.map((emp) => {
                const isSelected = emp.id === selectedIndividualEmp?.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmpId(emp.id)}
                    style={
                      isSelected
                        ? {
                            backgroundColor: "var(--primary-soft)",
                            color: "var(--primary)",
                          }
                        : undefined
                    }
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${
                      isSelected ? "font-semibold" : "hover:bg-surface text-text"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">
                        {emp.fullName}
                      </span>
                      <span className="text-[11px] opacity-80 shrink-0">
                        {emp.staffId}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-75 truncate mt-0.5">
                      {emp.email} · {emp.department}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Individual Email Composer */}
          <div className="lg:col-span-7 veltra-card p-5 space-y-4">
            {selectedIndividualEmp && (
              <div className="rounded-lg bg-page border border-border p-3.5 space-y-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-text">
                      Employee: {selectedIndividualEmp.fullName} ({selectedIndividualEmp.staffId})
                    </div>
                    <div className="text-muted mt-0.5">
                      {selectedIndividualEmp.department} · {selectedIndividualEmp.jobTitle}
                    </div>
                  </div>
                  {selectedIndividualRecord && (
                    <div className="sm:text-right tabular-nums shrink-0">
                      <div className="text-[11px] text-muted">Nov 2026 Net Pay</div>
                      <div className="font-bold text-primary">
                        {formatGHS(selectedIndividualRecord.netPayPesewas)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <label
                    htmlFor="ind-delivery-email"
                    className="block text-[11px] font-semibold text-muted mb-1"
                  >
                    Deliver To (editable for live test delivery)
                  </label>
                  <input
                    id="ind-delivery-email"
                    type="email"
                    required
                    value={indDeliveryEmail}
                    onChange={(e) => setIndDeliveryEmail(e.target.value)}
                    placeholder="Enter recipient email address..."
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Individual Templates & Preview Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted mr-1">
                  Templates:
                </span>
                {INDIVIDUAL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setIndSubject(tpl.subject);
                      setIndTitle(tpl.title);
                      setIndBody(tpl.body);
                      setIndIncludePayslip(tpl.includePayslip);
                    }}
                    className="rounded-md border border-border bg-page px-2.5 py-1 text-[11px] font-semibold text-text hover:border-primary hover:text-primary"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowIndPreview((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-page px-3 py-1.5 text-xs font-semibold text-text hover:border-primary"
              >
                {showIndPreview ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span>{showIndPreview ? "Edit Message" : "Preview"}</span>
              </button>
            </div>

            {showIndPreview ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border border-border bg-page p-3 space-y-1">
                  <div className="text-muted">
                    From:{" "}
                    <strong className="text-text">
                      HR &amp; Payroll — Sunda Ghana Limited
                    </strong>
                  </div>
                  <div className="text-muted">
                    To:{" "}
                    <strong className="text-text">
                      {selectedIndividualEmp
                        ? `${selectedIndividualEmp.fullName} <${selectedIndividualEmp.email}>`
                        : "No employee selected"}
                    </strong>
                  </div>
                  <div className="text-muted pt-1 border-t border-border">
                    Subject:{" "}
                    <strong className="text-text">
                      {renderMergeTags(indSubject, selectedIndividualEmp)}
                    </strong>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <div
                    style={{ backgroundColor: "var(--primary)" }}
                    className="px-4 py-2.5 text-white flex items-center justify-between"
                  >
                    <span className="font-bold tracking-tight">Sunda Ghana Limited</span>
                    <span className="text-[11px] opacity-90">HR &amp; Payroll</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {indTitle.trim() && (
                      <div className="pb-2.5 border-b border-border">
                        <h3 className="text-sm font-bold text-text">
                          {renderMergeTags(indTitle, selectedIndividualEmp)}
                        </h3>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-text leading-relaxed">
                      {renderMergeTags(indBody, selectedIndividualEmp)}
                    </div>
                    {indIncludePayslip && selectedIndividualEmp && (
                      <div className="pt-2 border-t border-border">
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-page px-2.5 py-1.5 text-[11px] font-semibold text-primary">
                          <FileText className="h-3.5 w-3.5" />
                          <span>
                            Attachment: Nov_2026_Payslip_{selectedIndividualEmp.staffId}.pdf
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="ind-subject"
                    className="block text-xs font-semibold text-text mb-1"
                  >
                    Subject <span className="font-normal text-muted">(shown in inbox list)</span>
                  </label>
                  <input
                    id="ind-subject"
                    type="text"
                    required
                    value={indSubject}
                    onChange={(e) => setIndSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ind-title"
                    className="block text-xs font-semibold text-text mb-1"
                  >
                    Email Title / Heading <span className="font-normal text-muted">(bold heading inside email)</span>
                  </label>
                  <input
                    id="ind-title"
                    type="text"
                    required
                    value={indTitle}
                    onChange={(e) => setIndTitle(e.target.value)}
                    placeholder="Enter email heading or notice title..."
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs text-text focus:border-primary focus:bg-surface focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ind-body"
                    className="block text-xs font-semibold text-text mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="ind-body"
                    rows={7}
                    required
                    value={indBody}
                    onChange={(e) => setIndBody(e.target.value)}
                    placeholder="Write a message to this employee..."
                    className="w-full rounded-lg border border-border bg-page px-3 py-2 text-xs text-text leading-relaxed focus:border-primary focus:bg-surface focus:outline-none"
                  />
                  {selectedIndividualEmp && (
                    <p className="text-[11px] text-muted mt-1">
                      Merge tags like <code className="text-primary">{"{{name}}"}</code> and{" "}
                      <code className="text-primary">{"{{staffId}}"}</code> automatically resolve to{" "}
                      <strong>{selectedIndividualEmp.fullName}</strong> ({selectedIndividualEmp.staffId}).
                    </p>
                  )}
                </div>
              </>
            )}

            <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
              <input
                type="checkbox"
                checked={indIncludePayslip}
                onChange={(e) => setIndIncludePayslip(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              <span>
                Attach employee&apos;s November 2026 payslip summary
              </span>
            </label>

            <div className="pt-2 border-t border-border flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isOffline || isSending || !selectedIndividualEmp || !indDeliveryEmail.trim()}
                style={
                  !isOffline && !isSending && selectedIndividualEmp && indDeliveryEmail.trim()
                    ? { backgroundColor: "var(--primary)" }
                    : undefined
                }
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm ${
                  isOffline || isSending || !selectedIndividualEmp || !indDeliveryEmail.trim()
                    ? "bg-page border border-border text-muted cursor-not-allowed"
                    : "text-white hover:opacity-95"
                }`}
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>
                  {isSending
                    ? "Sending via Gmail SMTP..."
                    : isOffline
                    ? "Send Email (Needs a connection)"
                    : "Send Individual Email"}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. SENT EMAIL HISTORY */}
      {activeTab === "history" && (
        <div className="veltra-card overflow-hidden">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text">
                Sent Email Log
              </h2>
              <p className="text-xs text-muted mt-0.5">
                All bulk and individual HR/Payroll emails are logged here and recorded in the Audit Trail.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {(["All", "Bulk", "Individual"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setHistoryFilter(f)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    historyFilter === f
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-page text-muted hover:text-text"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border">
            {filteredLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted">
                No sent emails match this filter.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div key={log.id} className="p-5 hover:bg-page/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill
                            status={log.type}
                            variant={log.type === "Bulk" ? "violet" : "green"}
                          />
                          <span className="text-sm font-bold text-text">
                            {log.subject}
                          </span>
                          {log.includePayslipSummary && (
                            <span className="inline-flex items-center gap-1 rounded bg-page border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                              <FileText className="h-3 w-3 text-primary" />
                              Payslip Attached
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">
                          Recipients: <strong className="text-text">{log.recipientSummary}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <div className="sm:text-right tabular-nums">
                          <div className="font-semibold text-text">
                            {log.sentBy} ({log.sentByRole})
                          </div>
                          <div className="text-[11px] text-muted">
                            {formatDateTime(log.sentAt)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLogId(isExpanded ? null : log.id)
                          }
                          className="rounded-lg border border-border bg-page p-1.5 text-muted hover:text-text"
                          aria-label="Toggle email preview"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-lg border border-border bg-page p-3.5 text-xs text-text space-y-2">
                        {log.title && (
                          <div className="font-bold text-sm text-text pb-2 border-b border-border">
                            {log.title}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {log.body}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
