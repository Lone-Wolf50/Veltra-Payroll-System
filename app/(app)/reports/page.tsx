"use client";

import React, { useState } from "react";
import {
  getPayrollRuns,
  getAnomalies,
  getEwaRequests,
  getStatutoryBreakdownChartData,
  getEwaUsageChartData,
} from "@/lib/data";
import { formatGHS, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  StatutoryDeductionsChart,
  EwaUsageChart,
} from "@/components/charts/secondary-charts";
import { Download, FileSpreadsheet } from "lucide-react";

type ReportTab = "payroll" | "statutory" | "anomalies" | "ewa";

export default function ReportsPage() {
  const runs = getPayrollRuns().filter((r) => !r.id.endsWith("-supp"));
  const [selectedRunId, setSelectedRunId] = useState("run-2026-11");
  const [activeTab, setActiveTab] = useState<ReportTab>("payroll");

  const activeRun =
    runs.find((r) => r.id === selectedRunId) ?? runs[runs.length - 1];
  const statutoryData = getStatutoryBreakdownChartData(activeRun.id);
  const anomalies = getAnomalies(activeRun.id);
  const ewaRequests = getEwaRequests();
  const ewaChartData = getEwaUsageChartData();

  const handleExportReport = () => {
    const content = `Veltra Report Export - ${activeTab.toUpperCase()} (${
      activeRun.periodLabel
    })\nGenerated on: 03 Nov 2026\nTotal Payroll Cost: ${formatGHS(
      activeRun.totalPayrollCostPesewas
    )}\nNet Pay: ${formatGHS(activeRun.totalNetPesewas)}\nGRA PAYE: ${formatGHS(
      activeRun.totalPayePesewas
    )}\nSSNIT Employee (5.5%): ${formatGHS(
      activeRun.totalSsnitEmployeePesewas
    )}\nSSNIT Employer (13.5%): ${formatGHS(
      activeRun.totalSsnitEmployerPesewas
    )}\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veltra-${activeTab}-report-${activeRun.periodMonth}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            Compliance & Financial Reports
          </h1>
          <p className="text-xs text-muted mt-1">
            Filterable by period and exportable · Payroll Summary, GRA Statutory Deductions, Anomaly Control Log & Simulated EWA Report.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            aria-label="Filter report period"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text"
          >
            {runs
              .slice()
              .reverse()
              .map((r) => (
                <option key={r.id} value={r.id}>
                  Period: {r.periodLabel}
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={handleExportReport}
            style={{ backgroundColor: "var(--primary)" }}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 4 Report Category Tabs (PRD Section 7.11) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: "payroll", label: "1. Payroll Summary" },
          { id: "statutory", label: "2. Statutory Deduction Summary" },
          { id: "anomalies", label: "3. Anomaly Control Report" },
          { id: "ewa", label: "4. EWA Transaction Report" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as ReportTab)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors ${
              activeTab === tab.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "payroll" && (
        <div className="veltra-card p-6 space-y-4">
          <h2 className="text-base font-bold text-text">
            Payroll Summary Report — {activeRun.periodLabel}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs tabular-nums">
            <div className="rounded-lg bg-page p-4 border border-border">
              <span className="text-muted block">Total Payroll Cost</span>
              <strong className="text-lg font-bold text-text mt-1 block">
                {formatGHS(activeRun.totalPayrollCostPesewas)}
              </strong>
            </div>
            <div className="rounded-lg bg-page p-4 border border-border">
              <span className="text-muted block">Gross Pay</span>
              <strong className="text-lg font-bold text-text mt-1 block">
                {formatGHS(activeRun.totalGrossPesewas)}
              </strong>
            </div>
            <div className="rounded-lg bg-page p-4 border border-border">
              <span className="text-muted block">Employee Statutory (PAYE + SSNIT)</span>
              <strong className="text-lg font-bold text-text mt-1 block">
                {formatGHS(activeRun.totalStatutoryPesewas)}
              </strong>
            </div>
            <div className="rounded-lg bg-page p-4 border border-border">
              <span className="text-muted block">Net Pay Disbursed</span>
              <strong className="text-lg font-bold text-primary mt-1 block">
                {formatGHS(activeRun.totalNetPesewas)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === "statutory" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <StatutoryDeductionsChart data={statutoryData} />
          </div>
          <div className="lg:col-span-6 veltra-card p-6 space-y-3 text-xs tabular-nums">
            <h2 className="text-base font-bold text-text">
              GRA & SSNIT Remittance Schedule ({activeRun.periodLabel})
            </h2>
            <p className="text-muted">
              Calculated under the Income Tax (Amendment) Act, 2026 (Act 1178) in force from 01 Sep 2026.
            </p>
            <div className="space-y-2 pt-2">
              {statutoryData.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between rounded-lg bg-page p-3 border border-border"
                >
                  <div>
                    <div className="font-bold text-text">{d.name}</div>
                    <div className="text-muted text-[11px]">{d.rateLabel}</div>
                  </div>
                  <div className="text-sm font-bold text-text">
                    {formatGHS(d.amountPesewas)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "anomalies" && (
        <div className="veltra-card p-6 space-y-4">
          <h2 className="text-base font-bold text-text">
            Anomaly Control Report ({anomalies.length} records in {activeRun.periodShort})
          </h2>
          <div className="divide-y divide-border text-xs">
            {anomalies.map((a) => (
              <div
                key={a.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-text">
                    {a.employeeName} ({a.staffId})
                  </span>{" "}
                  · <span className="text-primary font-semibold">{a.ruleName}</span>
                  <p className="text-muted mt-0.5">{a.evidence}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 tabular-nums">
                  <span className="font-bold text-text">
                    {formatGHS(a.amountInvolvedPesewas)}
                  </span>
                  <StatusPill status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ewa" && (
        <div className="space-y-6">
          <EwaUsageChart data={ewaChartData} />
          <div className="veltra-card p-6 space-y-3">
            <h2 className="text-base font-bold text-text">
              Simulated EWA Advances & Recovery Ledger
            </h2>
            <div className="divide-y divide-border text-xs tabular-nums">
              {ewaRequests.map((r) => (
                <div
                  key={r.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-text">
                      {r.employeeName} ({r.staffId})
                    </span>{" "}
                    · <span className="text-muted">{r.periodShort}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-text">
                      {formatGHS(r.amountRequestedPesewas)}
                    </span>
                    <StatusPill status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
