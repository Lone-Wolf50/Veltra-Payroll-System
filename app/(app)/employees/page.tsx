"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { getEmployees } from "@/lib/data";
import { Employee } from "@/lib/types";
import { formatGHS, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Search,
  Eye,
  EyeOff,
  WifiOff,
  X,
  Shield,
  FileSignature,
  FolderCheck,
  CheckCircle2,
  Printer,
  Mail,
} from "lucide-react";

function maskBankAccount(account: string): string {
  if (account.length <= 4) return account;
  return `****${account.slice(-4)}`;
}

export default function EmployeesPage() {
  const { user, connectionState } = useAuth();
  const employees = getEmployees();

  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({});
  const [contractEmp, setContractEmp] = useState<Employee | null>(null);
  const [letterType, setLetterType] = useState<
    "Appointment Letter" | "Confirmation Letter" | "Contract Renewal"
  >("Appointment Letter");
  const [issuedMap, setIssuedMap] = useState<Record<string, string>>({});

  // PRD Section 10: "Screens that would show data that is never stored locally
  // (bank details, past payroll, other employees, audit records) show 'Available when online' instead of stale data."
  if (connectionState === "offline") {
    return (
      <div className="veltra-card p-10 text-center max-w-xl mx-auto my-8">
        <WifiOff className="h-10 w-10 text-status-amber-fg mx-auto mb-3" />
        <h1 className="text-lg font-bold text-text">Available when online</h1>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          For security and privacy, other employees&apos; master records and bank details are never cached locally on the device. Reconnect to view the employee directory.
        </p>
      </div>
    );
  }

  // Payroll Confidentiality Rule:
  // Only HR/Payroll and Finance can view employee salary figures or unmask bank accounts.
  // Admin is restricted to Contract Letters Issuing & Employee Personnel Filing.
  const canViewPayrollConfidential =
    user.role === "HR/Payroll" || user.role === "Finance";
  const isAdmin = user.role === "Admin";

  const filtered = employees.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.staffId.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.jobTitle.toLowerCase().includes(q)
    );
  });

  const toggleMask = (id: string) => {
    if (!canViewPayrollConfidential) return;
    setUnmaskedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleIssueContract = (emp: Employee) => {
    setIssuedMap((prev) => ({
      ...prev,
      [emp.id]: `${letterType} issued & filed (${formatDate("2026-11-18")})`,
    }));
    setContractEmp(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            {isAdmin
              ? "Contract Letters Issuing & Personnel Filing"
              : "Employee Master Directory"}
          </h1>
          <p className="text-xs text-muted mt-1">
            {isAdmin
              ? `${employees.length} personnel files · Issue contract letters and verify onboarding documents. Confidential salary & bank payroll figures are restricted to HR/Payroll and Finance.`
              : `${employees.length} workforce records · Bank account details are masked by default (e.g. ****4821) and revealed only on request.`}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <label htmlFor="emp-dir-search" className="sr-only">
            Search employees
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="emp-dir-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, staff ID, dept..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="veltra-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-page/70 text-[11px] uppercase tracking-wider font-semibold text-muted">
                <th className="px-4 py-3">Staff ID & Name</th>
                <th className="px-4 py-3">Department & Role</th>
                <th className="px-4 py-3">Status</th>
                {canViewPayrollConfidential ? (
                  <>
                    <th className="px-4 py-3">Basic Salary</th>
                    <th className="px-4 py-3">Bank Account (Masked)</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3">Contract & Personnel File</th>
                    <th className="px-4 py-3">Statutory IDs on File</th>
                  </>
                )}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm tabular-nums">
              {filtered.slice(0, 30).map((emp) => {
                const isUnmasked = Boolean(unmaskedIds[emp.id]);
                const customFileStatus = issuedMap[emp.id];
                const hasMissingId =
                  emp.ssnitNumber === "MISSING" ||
                  emp.ghanaCardNumber === "CONFLICT-ID";

                return (
                  <tr key={emp.id} className="hover:bg-page/60">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text">
                        {emp.fullName}
                      </div>
                      <div className="text-xs text-muted">
                        {emp.staffId} · Joined {formatDate(emp.joinDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs font-semibold text-text">
                        {emp.department}
                      </div>
                      <div className="text-xs text-muted">{emp.jobTitle}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={emp.status} />
                    </td>

                    {canViewPayrollConfidential ? (
                      <>
                        <td className="px-4 py-3.5 font-semibold text-text">
                          {formatGHS(emp.basicSalaryPesewas)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text">
                              {emp.bankName} ·{" "}
                              <strong>
                                {isUnmasked
                                  ? emp.bankAccountNumber
                                  : maskBankAccount(emp.bankAccountNumber)}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleMask(emp.id)}
                              className="rounded p-1 text-muted hover:text-primary"
                              title={
                                isUnmasked
                                  ? "Hide bank account number"
                                  : "Reveal full bank account number"
                              }
                              aria-label="Toggle bank account visibility"
                            >
                              {isUnmasked ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3.5">
                          {customFileStatus ? (
                            <span
                              style={{
                                backgroundColor: "var(--status-green-bg)",
                                color: "var(--status-green-fg)",
                              }}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{customFileStatus}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text">
                              <FolderCheck className="h-3.5 w-3.5 text-teal" />
                              <span>
                                {emp.employmentType} Contract Filed
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill
                            status={
                              hasMissingId
                                ? "Incomplete File (Missing ID)"
                                : "Ghana Card & SSNIT Filed"
                            }
                            variant={hasMissingId ? "amber" : "green"}
                          />
                        </td>
                      </>
                    )}

                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {user.role === "HR/Payroll" && (
                          <Link
                            href={`/email?employeeId=${emp.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-primary hover:border-primary"
                            title={`Send individual email to ${emp.fullName}`}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>Email</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setContractEmp(emp);
                            setLetterType("Appointment Letter");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-primary hover:border-primary"
                        >
                          <FileSignature className="h-3.5 w-3.5" />
                          <span>Issue Letter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEmp(emp)}
                          className="rounded-lg border border-border bg-page px-2.5 py-1 text-xs font-semibold text-text hover:border-primary"
                        >
                          {isAdmin ? "Filing Dossier" : "Profile"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Contract Letter Modal */}
      {contractEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="veltra-card max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text">
                  Issue & File Contract Letter — {contractEmp.fullName}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Staff ID: {contractEmp.staffId} · {contractEmp.department} ·{" "}
                  {contractEmp.jobTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContractEmp(null)}
                className="rounded-lg p-1 text-muted hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1.5">
                  Select Contract / HR Letter Template
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      "Appointment Letter",
                      "Confirmation Letter",
                      "Contract Renewal",
                    ] as const
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLetterType(t)}
                      className={`rounded-lg border p-2.5 text-left font-semibold ${
                        letterType === t
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-page text-text"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-page p-4 border border-border space-y-2 leading-relaxed">
                <div className="font-bold text-text flex items-center justify-between border-b border-border pb-2">
                  <span>SUNDA GHANA LIMITED — OFFICIAL {letterType.toUpperCase()}</span>
                  <span className="text-muted">Ref: SGL/HR/{contractEmp.staffId}/2026</span>
                </div>
                <p className="text-text">
                  Dear <strong>{contractEmp.fullName}</strong>,
                </p>
                <p className="text-muted">
                  We are pleased to issue this official <strong>{letterType}</strong> for your role as{" "}
                  <strong className="text-text">{contractEmp.jobTitle}</strong> in the{" "}
                  <strong className="text-text">{contractEmp.department}</strong> department at Sunda Ghana Limited, effective{" "}
                  <strong className="text-text">{formatDate(contractEmp.joinDate)}</strong>.
                </p>
                <p className="text-muted">
                  A signed copy of this letter is recorded in your digital personnel file alongside your Ghana Card ({contractEmp.ghanaCardNumber}) and SSNIT registration ({contractEmp.ssnitNumber}).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-page px-3 py-2 text-xs font-semibold text-text hover:border-primary"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                <span>Print Letter</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContractEmp(null)}
                  className="rounded-lg border border-border bg-page px-3.5 py-2 text-xs font-semibold text-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleIssueContract(contractEmp)}
                  style={{ backgroundColor: "var(--primary)" }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
                >
                  <FileSignature className="h-3.5 w-3.5" />
                  <span>Issue & Save to Personnel File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail / Filing Dossier Modal */}
      {selectedEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="veltra-card max-w-lg w-full p-6">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text">
                  {selectedEmp.fullName} ({selectedEmp.staffId})
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {selectedEmp.department} · {selectedEmp.jobTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmp(null)}
                className="rounded-lg p-1 text-muted hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs tabular-nums">
              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">Employment Status</span>
                <div className="mt-1">
                  <StatusPill status={selectedEmp.status} />
                </div>
              </div>

              {canViewPayrollConfidential ? (
                <>
                  <div className="rounded-lg bg-page p-3 border border-border">
                    <span className="text-muted block">Basic Salary</span>
                    <strong className="text-sm font-bold text-text mt-1 block">
                      {formatGHS(selectedEmp.basicSalaryPesewas)}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-page p-3 border border-border">
                    <span className="text-muted block">Transport & Housing</span>
                    <strong className="text-sm font-bold text-text mt-1 block">
                      {formatGHS(
                        selectedEmp.transportAllowancePesewas +
                          selectedEmp.housingAllowancePesewas
                      )}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-page p-3 border border-border">
                    <span className="text-muted block">Contract Classification</span>
                    <strong className="text-sm font-bold text-text mt-1 block">
                      {selectedEmp.employmentType} Staff
                    </strong>
                  </div>
                  <div className="rounded-lg bg-page p-3 border border-border">
                    <span className="text-muted block">Ghana Card ID on File</span>
                    <strong className="text-text font-semibold mt-1 block">
                      {selectedEmp.ghanaCardNumber}
                    </strong>
                  </div>
                </>
              )}

              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">SSNIT Number on File</span>
                <strong className="text-text font-semibold mt-1 block">
                  {selectedEmp.ssnitNumber}
                </strong>
              </div>
            </div>

            {canViewPayrollConfidential ? (
              <div className="mt-4 rounded-lg bg-page p-3.5 border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted block">Disbursement Bank Account</span>
                  <strong className="text-text font-bold mt-0.5 block tabular-nums">
                    {selectedEmp.bankName} ·{" "}
                    {unmaskedIds[selectedEmp.id]
                      ? selectedEmp.bankAccountNumber
                      : maskBankAccount(selectedEmp.bankAccountNumber)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMask(selectedEmp.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>
                    {unmaskedIds[selectedEmp.id] ? "Mask" : "Reveal Full"}
                  </span>
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-page p-3.5 border border-border text-xs space-y-1.5">
                <div className="font-semibold text-text">
                  Personnel Filing Checklist (Payroll Figures Restricted)
                </div>
                <div className="flex items-center justify-between text-muted">
                  <span>Signed Employment Contract Letter:</span>
                  <span className="font-semibold text-status-green-fg">
                    ✓ Filed ({formatDate(selectedEmp.joinDate)})
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted">
                  <span>Salary & Bank Disbursement Figures:</span>
                  <span className="font-semibold text-muted">
                    🔒 Restricted to HR/Payroll & Finance
                  </span>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmp(null)}
                style={{ backgroundColor: "var(--primary)" }}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
