"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getEmployeePayslips } from "@/lib/data";
import { formatGHS, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { VeltraLogo } from "@/components/ui/logo";
import { Printer, FileText } from "lucide-react";

export default function PayslipsPage() {
  const { user } = useAuth();
  const payslips = getEmployeePayslips(user.employeeId);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const active = payslips[selectedIdx] ?? payslips[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            My Payslips
          </h1>
          <p className="text-xs text-muted mt-1">
            Current and past payslips for <strong>{user.name}</strong> · Printable statutory breakdown.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          style={{ backgroundColor: "var(--primary)" }}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Save PDF Payslip</span>
        </button>
      </div>

      {/* Period selector tabs */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        {payslips.map((p, idx) => (
          <button
            key={p.run.id}
            type="button"
            onClick={() => setSelectedIdx(idx)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
              idx === selectedIdx
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-text hover:bg-page"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{p.run.periodShort}</span>
          </button>
        ))}
      </div>

      {/* Printable Payslip Document */}
      {active && (
        <div className="veltra-card p-6 sm:p-8 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <VeltraLogo showSubtitle />
              <p className="text-xs text-muted mt-2">
                Sunda Ghana Limited · Official Statutory Payslip
              </p>
            </div>
            <div className="sm:text-right">
              <div className="text-base font-bold text-text">
                {active.run.periodLabel}
              </div>
              <div className="text-xs text-muted mt-0.5">
                Pay Date: {formatDate(active.run.payDate)}
              </div>
              <div className="mt-1.5">
                <StatusPill status={active.record.status} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-border pb-5">
            <div>
              <span className="text-muted block">Employee Name</span>
              <strong className="text-text font-bold mt-0.5 block">
                {active.record.employeeName}
              </strong>
            </div>
            <div>
              <span className="text-muted block">Staff ID</span>
              <strong className="text-text font-bold mt-0.5 block">
                {active.record.staffId}
              </strong>
            </div>
            <div>
              <span className="text-muted block">Department</span>
              <strong className="text-text font-bold mt-0.5 block">
                {active.record.department}
              </strong>
            </div>
            <div>
              <span className="text-muted block">Days Attended</span>
              <strong className="text-text font-bold mt-0.5 block tabular-nums">
                {active.record.daysAttended} / {active.record.daysExpected} Days
              </strong>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs tabular-nums">
            <div className="space-y-2 rounded-lg bg-page p-4 border border-border">
              <div className="font-bold text-text border-b border-border pb-2">
                Earnings
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Basic Salary</span>
                <span className="font-semibold text-text">
                  {formatGHS(active.record.basicSalaryPesewas)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Allowances</span>
                <span className="font-semibold text-text">
                  {formatGHS(active.record.allowancesPesewas)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">
                  Overtime Pay ({active.record.overtimeHours} hrs)
                </span>
                <span className="font-semibold text-text">
                  {formatGHS(active.record.overtimePayPesewas)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-bold text-text">
                <span>Gross Earnings</span>
                <span>{formatGHS(active.record.grossPayPesewas)}</span>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-page p-4 border border-border">
              <div className="font-bold text-text border-b border-border pb-2">
                Statutory & Other Deductions
              </div>
              <div className="flex justify-between">
                <span className="text-muted">SSNIT Employee (5.5%)</span>
                <span className="font-semibold text-text">
                  {formatGHS(active.record.ssnitEmployeePesewas)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">GRA PAYE Income Tax</span>
                <span className="font-semibold text-text">
                  {formatGHS(active.record.payePesewas)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Simulated EWA Recovery</span>
                <span className="font-semibold text-text">
                  {formatGHS(active.record.ewaRecoveryPesewas)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-bold text-text">
                <span>Total Deductions</span>
                <span>{formatGHS(active.record.totalDeductionsPesewas)}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "var(--primary-soft)",
              color: "var(--primary)",
            }}
            className="mt-5 rounded-xl p-4 flex items-center justify-between text-base font-bold tabular-nums"
          >
            <span>Net Pay Disbursed</span>
            <span>{formatGHS(active.record.netPayPesewas)}</span>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-muted tabular-nums">
            <span>
              Chargeable Income: {formatGHS(active.record.chargeableIncomePesewas)}
            </span>
            <span>
              Employer SSNIT (13.5%):{" "}
              {formatGHS(active.record.ssnitEmployerPesewas)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
