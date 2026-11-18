"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getEmployees } from "@/lib/data";
import { Employee } from "@/lib/types";
import { formatGHS, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { Search, Eye, EyeOff, WifiOff, X, Shield } from "lucide-react";

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

  const canUnmaskBank =
    user.role === "HR/Payroll" || user.role === "Finance" || user.role === "Admin";

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
    if (!canUnmaskBank) return;
    setUnmaskedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            Employee Master Directory
          </h1>
          <p className="text-xs text-muted mt-1">
            {employees.length} workforce records · Bank account details are masked by default (e.g. ****4821) and revealed only on request.
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
                <th className="px-4 py-3">Basic Salary</th>
                <th className="px-4 py-3">Bank Account (Masked)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm tabular-nums">
              {filtered.slice(0, 30).map((emp) => {
                const isUnmasked = Boolean(unmaskedIds[emp.id]);
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
                        {canUnmaskBank && (
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
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEmp(emp)}
                        className="rounded-lg border border-border bg-page px-2.5 py-1 text-xs font-semibold text-text hover:border-primary"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Detail Modal */}
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
              <div className="rounded-lg bg-page p-3 border border-border">
                <span className="text-muted block">SSNIT / Ghana Card</span>
                <strong className="text-text font-semibold mt-1 block">
                  {selectedEmp.ssnitNumber}
                </strong>
              </div>
            </div>

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
              {canUnmaskBank && (
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
              )}
            </div>

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
