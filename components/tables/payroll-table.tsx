"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { PayrollRecord, Department } from "@/lib/types";
import { formatGHS } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  X,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

const columnHelper = createColumnHelper<PayrollRecord>();

const DEPARTMENTS: Department[] = [
  "Manufacturing & Assembly",
  "Logistics & Warehouse",
  "Sales & Distribution",
  "Finance & Accounting",
  "HR & Corporate Admin",
];

export function PayrollRecordsTable({
  records,
  periodLabel,
  externalSearch = "",
}: {
  records: PayrollRecord[];
  periodLabel: string;
  externalSearch?: string;
}) {
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch]);

  const filteredData = useMemo(() => {
    return records.filter((rec) => {
      if (statusFilter !== "All" && rec.status !== statusFilter) return false;
      if (deptFilter !== "All" && rec.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          rec.employeeName.toLowerCase().includes(q) ||
          rec.staffId.toLowerCase().includes(q) ||
          rec.department.toLowerCase().includes(q) ||
          rec.jobTitle.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [records, statusFilter, deptFilter, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("employeeName", {
        header: "Employee",
        cell: (info) => {
          const r = info.row.original;
          return (
            <div>
              <div className="font-semibold text-text flex items-center gap-1.5">
                <span>{r.employeeName}</span>
                {r.staffId === "SGL-1001" && (
                  <span
                    style={{
                      backgroundColor: "var(--primary-soft)",
                      color: "var(--primary)",
                    }}
                    className="rounded px-1.5 py-0.2 text-[10px] font-semibold"
                    title="PRD Section 8 Verified Test Case (Basic GHS 5,000.00)"
                  >
                    GRA Test Case
                  </span>
                )}
                {(r.staffId === "100001" ||
                  r.staffId === "100002" ||
                  r.staffId === "100003") && (
                  <span
                    style={{
                      backgroundColor: "var(--status-green-bg)",
                      color: "var(--status-green-fg)",
                    }}
                    className="rounded px-1.5 py-0.2 text-[10px] font-semibold"
                    title="Exact Sunda Ghana Limited Excel Formula Row"
                  >
                    Excel Formula Row
                  </span>
                )}
              </div>
              <div className="text-xs text-muted">
                {r.staffId} · {r.jobTitle}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("department", {
        header: "Department",
        cell: (info) => (
          <span className="text-xs font-medium text-text">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("grossPayPesewas", {
        header: "Gross Pay",
        cell: (info) => (
          <span className="tabular-nums font-medium text-text">
            {formatGHS(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("totalDeductionsPesewas", {
        header: "Deductions (PAYE + NSSF)",
        cell: (info) => {
          const r = info.row.original;
          return (
            <div className="tabular-nums">
              <div className="font-medium text-text">
                {formatGHS(info.getValue())}
              </div>
              <div className="text-[11px] text-muted">
                GRA {formatGHS(r.totalGraTaxPesewas ?? r.payePesewas)} · NSSF{" "}
                {formatGHS(r.ssnitEmployeePesewas)}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("netPayPesewas", {
        header: "Net Pay",
        cell: (info) => (
          <span className="tabular-nums font-bold text-text">
            {formatGHS(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const r = info.row.original;
          return (
            <StatusPill
              status={r.hasOpenAnomaly ? "Needs review" : r.status}
              variant={r.hasOpenAnomaly ? "red" : undefined}
            />
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button
            type="button"
            onClick={() => setSelectedRecord(info.row.original)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-page px-2.5 py-1 text-xs font-semibold text-text hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Breakdown</span>
          </button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleExportCsv = () => {
    const headers = [
      "Staff ID",
      "Employee Name",
      "Department",
      "Should Work Days",
      "Actual Working Days",
      "Paid Days",
      "Basic Salary STD (GHS)",
      "Daily Wage STD (GHS)",
      "Hourly Wage STD (GHS)",
      "Allowances & Bonus (GHS)",
      "Workday OT Hours (1.2x)",
      "Workday OT Salary (GHS)",
      "Saturday OT Hours (1.5x)",
      "Saturday OT Salary (GHS)",
      "Sunday OT Hours (2.0x)",
      "Sunday OT Salary (GHS)",
      "Total Overtime Salary (GHS)",
      "Gross Salary (GHS)",
      "NSSF EE 5.5% (GHS)",
      "NSSF ER 13% (GHS)",
      "Bonus Tax Base 15% (GHS)",
      "Bonus Tax 5% (GHS)",
      "Excess Bonus (GHS)",
      "PAYE Base (GHS)",
      "PAYE (GHS)",
      "Total GRA (GHS)",
      "Net Pay (GHS)",
      "HR Cost (GHS)",
      "Tier 1 SSNIT 13.5% (GHS)",
      "Tier 2 PETRA 5% (GHS)",
      "Status",
    ];
    const rows = filteredData.map((r) => [
      r.staffId,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      r.daysExpected,
      r.daysAttended,
      r.daysPaid,
      (r.basicSalaryPesewas / 100).toFixed(2),
      ((r.dailyWageStdPesewas ?? Math.round(r.basicSalaryPesewas / 20)) / 100).toFixed(2),
      ((r.hourlyWageStdPesewas ?? Math.round(r.basicSalaryPesewas / 160)) / 100).toFixed(2),
      (r.allowancesPesewas / 100).toFixed(2),
      r.workdayOtHours ?? 0,
      ((r.workdayOtPayPesewas ?? 0) / 100).toFixed(2),
      r.saturdayOtHours ?? 0,
      ((r.saturdayOtPayPesewas ?? 0) / 100).toFixed(2),
      r.sundayOtHours ?? 0,
      ((r.sundayOtPayPesewas ?? 0) / 100).toFixed(2),
      (r.overtimePayPesewas / 100).toFixed(2),
      (r.grossPayPesewas / 100).toFixed(2),
      (r.ssnitEmployeePesewas / 100).toFixed(2),
      ((r.nssfEmployer13Pesewas ?? r.ssnitEmployerPesewas) / 100).toFixed(2),
      ((r.bonusTaxBasePesewas ?? 0) / 100).toFixed(2),
      ((r.bonusTaxPesewas ?? 0) / 100).toFixed(2),
      ((r.excessBonusPesewas ?? 0) / 100).toFixed(2),
      (r.chargeableIncomePesewas / 100).toFixed(2),
      (r.payePesewas / 100).toFixed(2),
      ((r.totalGraTaxPesewas ?? r.payePesewas) / 100).toFixed(2),
      (r.netPayPesewas / 100).toFixed(2),
      ((r.hrCostPesewas ?? r.grossPayPesewas + r.ssnitEmployerPesewas) / 100).toFixed(2),
      ((r.tier1SsnitPesewas ?? r.ssnitEmployerPesewas) / 100).toFixed(2),
      ((r.tier2PetraPesewas ?? 0) / 100).toFixed(2),
      r.hasOpenAnomaly ? "Needs review" : r.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veltra-payroll-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="veltra-card overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-text">
            Employee Payroll Register ({periodLabel})
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Showing {filteredData.length} of {records.length} employee records · Calculated under GRA Act 1178 (Sep 2026)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search input */}
          <div className="relative">
            <label htmlFor="payroll-table-search" className="sr-only">
              Search payroll table
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              id="payroll-table-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter employee or ID..."
              className="rounded-lg border border-border bg-page pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none"
            />
          </div>

          {/* Department filter */}
          <div>
            <label htmlFor="payroll-dept-filter" className="sr-only">
              Filter by department
            </label>
            <select
              id="payroll-dept-filter"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-lg border border-border bg-page px-3 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label htmlFor="payroll-status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="payroll-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-page px-3 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Flagged">Needs review (Flagged)</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-page focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-border bg-page/70 text-[11px] uppercase tracking-wider font-semibold text-muted"
              >
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-text focus:outline-none"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-xs text-muted"
                >
                  No payroll records match the current search or filter criteria.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-page/60 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3.5 whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
        <div className="tabular-nums">
          Page{" "}
          <strong className="text-text">
            {table.getState().pagination.pageIndex + 1}
          </strong>{" "}
          of{" "}
          <strong className="text-text">
            {Math.max(1, table.getPageCount())}
          </strong>{" "}
          ({filteredData.length} total records)
        </div>

        <div className="flex items-center gap-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
            className="rounded-md border border-border bg-page px-2 py-1 text-xs text-text"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 font-medium text-text disabled:opacity-40 hover:bg-page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev</span>
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 font-medium text-text disabled:opacity-40 hover:bg-page"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Employee Statutory & Pay Breakdown Modal (PRD Section 7.4 & Section 8) */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="breakdown-modal-title"
        >
          <div className="veltra-card w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3
                  id="breakdown-modal-title"
                  className="text-base font-bold text-text"
                >
                  {selectedRecord.employeeName} ({selectedRecord.staffId})
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {selectedRecord.department} · {selectedRecord.jobTitle} ·{" "}
                  {periodLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1 text-muted hover:bg-page hover:text-text"
                aria-label="Close breakdown modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedRecord.hasOpenAnomaly && (
              <div
                style={{
                  backgroundColor: "var(--status-red-bg)",
                  color: "var(--status-red-fg)",
                }}
                className="mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  This record has an open flag ("Needs review") in the Anomaly Queue.
                </span>
              </div>
            )}

            <div className="mt-4 space-y-3 text-xs tabular-nums max-h-[70vh] overflow-y-auto pr-1">
              {/* 1. Wage Standards & Working Days */}
              <div className="rounded-lg bg-page p-3 border border-border space-y-1.5">
                <div className="font-semibold text-text mb-1 flex items-center justify-between">
                  <span>
                    1. Basic Salary & Hourly Rate ({selectedRecord.daysAttended}/
                    {selectedRecord.daysExpected} actual · {selectedRecord.daysPaid} paid days)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Basic Salary (Monthly STD):</span>
                  <span className="font-semibold text-text">
                    {formatGHS(selectedRecord.basicSalaryPesewas)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Daily Wage (Basic ÷ {selectedRecord.daysExpected} days):
                  </span>
                  <span className="font-semibold text-text">
                    {formatGHS(
                      selectedRecord.dailyWageStdPesewas ??
                        Math.round(selectedRecord.basicSalaryPesewas / 20)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Hourly Wage (Daily ÷ 8 hrs):
                  </span>
                  <span className="font-bold text-primary">
                    {formatGHS(
                      selectedRecord.hourlyWageStdPesewas ??
                        Math.round(selectedRecord.basicSalaryPesewas / 160)
                    )}
                    /hr
                  </span>
                </div>
              </div>

              {/* 2. Earned Wages & Bonus Breakdown */}
              <div className="rounded-lg bg-page p-3 border border-border space-y-1.5">
                <div className="font-semibold text-text mb-1">
                  2. Earned Wages & Allowances / Bonus
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Basic Wage Earned:</span>
                  <span className="font-semibold text-text">
                    {formatGHS(selectedRecord.basicSalaryPesewas)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold text-text">
                  <span>Allowances & Bonus (Before Tax):</span>
                  <span>{formatGHS(selectedRecord.allowancesPesewas)}</span>
                </div>
              </div>

              {/* 3. Step-by-Step Overtime Calculation (OT Hours * Hourly Wage * Rate) */}
              <div className="rounded-lg bg-page p-3 border border-border space-y-1.5">
                <div className="font-semibold text-text mb-1 flex items-center justify-between">
                  <span>3. Overtime Calculation (OT Hours × Hourly Wage × Rate)</span>
                  <span className="text-[11px] font-bold text-primary">
                    Hourly Wage:{" "}
                    {formatGHS(
                      selectedRecord.hourlyWageStdPesewas ??
                        Math.round(selectedRecord.basicSalaryPesewas / 160)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Workday OT ({selectedRecord.workdayOtHours ?? 0} hrs ×{" "}
                    {formatGHS(
                      selectedRecord.hourlyWageStdPesewas ??
                        Math.round(selectedRecord.basicSalaryPesewas / 160)
                    )}{" "}
                    × 1.2):
                  </span>
                  <span className="font-semibold text-text">
                    {formatGHS(selectedRecord.workdayOtPayPesewas ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Saturday OT ({selectedRecord.saturdayOtHours ?? 0} hrs ×{" "}
                    {formatGHS(
                      selectedRecord.hourlyWageStdPesewas ??
                        Math.round(selectedRecord.basicSalaryPesewas / 160)
                    )}{" "}
                    × 1.5):
                  </span>
                  <span className="font-semibold text-text">
                    {formatGHS(selectedRecord.saturdayOtPayPesewas ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    Sunday OT ({selectedRecord.sundayOtHours ?? 0} hrs ×{" "}
                    {formatGHS(
                      selectedRecord.hourlyWageStdPesewas ??
                        Math.round(selectedRecord.basicSalaryPesewas / 160)
                    )}{" "}
                    × 2.0):
                  </span>
                  <span className="font-semibold text-text">
                    {formatGHS(selectedRecord.sundayOtPayPesewas ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold text-text">
                  <span>
                    Total Overtime Salary ({selectedRecord.overtimeHours} hrs total):
                  </span>
                  <span>{formatGHS(selectedRecord.overtimePayPesewas)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border font-bold text-text text-sm">
                  <span>Gross Salary (Basic + Allowances/Bonus + Total OT):</span>
                  <span>{formatGHS(selectedRecord.grossPayPesewas)}</span>
                </div>
              </div>

              {/* 3. Statutory Deductions: NSSF, Bonus Tax (5%), Junior OT Tax (5%/10%), PAYE & Total GRA */}
              <div className="rounded-lg bg-page p-3 border border-border space-y-1.5">
                <div className="font-semibold text-text mb-1 flex items-center justify-between">
                  <span>
                    3. Statutory Deductions (NSSF, Bonus Tax, OT Tax & PAYE)
                  </span>
                  <span className="text-[11px] font-bold text-primary">
                    Class: {selectedRecord.seniorityLevel ?? "Seniors"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">
                    NSSF EE / SSNIT Employee (5.5% of Basic):
                  </span>
                  <span className="font-semibold text-text">
                    - {formatGHS(selectedRecord.ssnitEmployeePesewas)}
                  </span>
                </div>
                {(selectedRecord.otTaxPesewas ?? 0) > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted">
                      Junior OT Tax (5% up to 50% Basic, 10% excess on{" "}
                      {formatGHS(selectedRecord.otTaxBasePesewas ?? 0)} OT Base):
                    </span>
                    <span className="font-semibold text-text">
                      - {formatGHS(selectedRecord.otTaxPesewas ?? 0)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted">
                      OT Tax (0 for Seniors — OT{" "}
                      {formatGHS(
                        selectedRecord.cashAllowancePesewas ??
                          selectedRecord.overtimePayPesewas
                      )}{" "}
                      moves to Cash Allowance):
                    </span>
                    <span className="font-semibold text-text">GHS 0.00</span>
                  </div>
                )}
                {(selectedRecord.bonusTaxPesewas ?? 0) > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">
                        Bonus Tax Base (15% of Basic ={" "}
                        {formatGHS(selectedRecord.bonusTaxBasePesewas ?? 0)}) · Excess Bonus:{" "}
                        {formatGHS(selectedRecord.excessBonusPesewas ?? 0)}:
                      </span>
                      <span className="font-semibold text-text">
                        Bonus Tax (5%): - {formatGHS(selectedRecord.bonusTaxPesewas ?? 0)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">
                    PAYE Base (Basic - NSSF EE + Cash Allow. + Excess Bonus):
                  </span>
                  <span className="font-medium text-muted">
                    {formatGHS(selectedRecord.chargeableIncomePesewas)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">GRA PAYE Tax:</span>
                  <span className="font-semibold text-text">
                    - {formatGHS(selectedRecord.payePesewas)}
                  </span>
                </div>
                {((selectedRecord.bonusTaxPesewas ?? 0) > 0 ||
                  (selectedRecord.otTaxPesewas ?? 0) > 0) && (
                  <div className="flex justify-between">
                    <span className="text-muted">
                      Total GRA (PAYE + Bonus Tax + OT Tax):
                    </span>
                    <span className="font-semibold text-text">
                      - {formatGHS(selectedRecord.totalGraTaxPesewas ?? selectedRecord.payePesewas)}
                    </span>
                  </div>
                )}
                {selectedRecord.ewaRecoveryPesewas > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">Simulated EWA Advance Recovery:</span>
                    <span className="font-semibold text-text">
                      - {formatGHS(selectedRecord.ewaRecoveryPesewas)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-border font-bold text-text">
                  <span>Total Employee Deductions:</span>
                  <span>- {formatGHS(selectedRecord.totalDeductionsPesewas)}</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
                className="rounded-lg p-3.5 flex items-center justify-between text-sm font-bold"
              >
                <span>Net Pay (Gross - NSSF EE - Total GRA):</span>
                <span>{formatGHS(selectedRecord.netPayPesewas)}</span>
              </div>

              <div className="rounded-lg bg-page p-2.5 border border-border space-y-1 text-[11px] text-muted">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal" />
                    NSSF ER (13%): {formatGHS(selectedRecord.nssfEmployer13Pesewas ?? selectedRecord.ssnitEmployerPesewas)} · Tier 1 SSNIT (13.5%): {formatGHS(selectedRecord.tier1SsnitPesewas ?? selectedRecord.ssnitEmployerPesewas)} · Tier 2 PETRA (5%): {formatGHS(selectedRecord.tier2PetraPesewas ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold text-text pt-1 border-t border-border">
                  <span>Total HR Cost (Gross Salary + 13% NSSF ER):</span>
                  <span>
                    {formatGHS(
                      selectedRecord.hrCostPesewas ??
                        selectedRecord.grossPayPesewas + selectedRecord.ssnitEmployerPesewas
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{ backgroundColor: "var(--primary)" }}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
