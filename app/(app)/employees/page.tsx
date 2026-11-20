"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getEmployees,
  addEmployee,
  bulkAddEmployees,
  removeEmployee,
} from "@/lib/data";
import { Department, Employee, EmploymentType } from "@/lib/types";
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
  UserPlus,
  Upload,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const DEPARTMENTS: Department[] = [
  "Manufacturing & Assembly",
  "Logistics & Warehouse",
  "Sales & Distribution",
  "Finance & Accounting",
  "HR & Corporate Admin",
];

const BANKS = [
  "GCB Bank",
  "Ecobank Ghana",
  "Stanbic Bank",
  "Fidelity Bank",
  "Absa Bank Ghana",
  "CalBank",
];

interface ParsedCsvEmployeeRow {
  rowNum: number;
  employee: Omit<Employee, "id" | "fullName">;
  error?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePesewas(val: string): number {
  const n = parseFloat((val || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}

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
  const [banner, setBanner] = useState<string | null>(null);

  // HR/Payroll: Add single employee modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    staffId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "Manufacturing & Assembly" as Department,
    jobTitle: "",
    employmentType: "Permanent" as EmploymentType,
    seniorityLevel: "Juniors" as "Seniors" | "Juniors",
    joinDate: "2026-11-19",
    ssnitNumber: "",
    ghanaCardNumber: "",
    basicSalaryGhs: "",
    positionStdGhs: "",
    performanceStdGhs: "",
    transportAllowanceGhs: "",
    housingAllowanceGhs: "",
    bankName: "Ecobank Ghana",
    bankAccountNumber: "",
  });

  // HR/Payroll: Bulk CSV upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [csvRows, setCsvRows] = useState<ParsedCsvEmployeeRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // HR/Payroll: Remove employee confirmation state
  const [removeTargetEmp, setRemoveTargetEmp] = useState<Employee | null>(null);

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
  const isHrPayroll = user.role === "HR/Payroll";
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

  const resetAddForm = () => {
    setAddError(null);
    setFormState({
      staffId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "Manufacturing & Assembly",
      jobTitle: "",
      employmentType: "Permanent",
      seniorityLevel: "Juniors",
      joinDate: "2026-11-19",
      ssnitNumber: "",
      ghanaCardNumber: "",
      basicSalaryGhs: "",
      positionStdGhs: "",
      performanceStdGhs: "",
      transportAllowanceGhs: "",
      housingAllowanceGhs: "",
      bankName: "Ecobank Ghana",
      bankAccountNumber: "",
    });
  };

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const basicPesewas = parsePesewas(formState.basicSalaryGhs);
    if (basicPesewas <= 0) {
      setAddError("Basic Wage STD must be greater than GHS 0.00.");
      return;
    }

    const res = addEmployee({
      employee: {
        staffId: formState.staffId.trim(),
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        email:
          formState.email.trim() ||
          `${formState.firstName.trim().toLowerCase()}.${formState.lastName
            .trim()
            .toLowerCase()}@sundaghana.com`,
        phone: formState.phone.trim() || "+233 24 000 0000",
        department: formState.department,
        jobTitle: formState.jobTitle.trim() || "Staff Member",
        status: "Active",
        employmentType: formState.employmentType,
        seniorityLevel: formState.seniorityLevel,
        joinDate: formState.joinDate || "2026-11-19",
        basicSalaryPesewas: basicPesewas,
        positionStdPesewas: parsePesewas(formState.positionStdGhs),
        performanceStdPesewas: parsePesewas(formState.performanceStdGhs),
        transportAllowancePesewas: parsePesewas(formState.transportAllowanceGhs),
        housingAllowancePesewas: parsePesewas(formState.housingAllowanceGhs),
        bankName: formState.bankName,
        bankAccountNumber: formState.bankAccountNumber.trim(),
        ssnitNumber: formState.ssnitNumber.trim() || "MISSING",
        ghanaCardNumber: formState.ghanaCardNumber.trim() || "MISSING",
      },
      actorName: user.name,
      actorRole: user.role,
    });

    if (!res.ok) {
      setAddError(res.error || "Could not add employee.");
      return;
    }

    setBanner(
      `Added ${res.employee?.fullName} (${res.employee?.staffId}) to the Employee Master Directory.`
    );
    setShowAddModal(false);
    resetAddForm();
  };

  const handleDownloadCsvTemplate = () => {
    const headers = [
      "Staff ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Department",
      "Job Title",
      "Employment Type",
      "Seniority",
      "Join Date",
      "SSNIT Number",
      "Ghana Card ID",
      "Basic Wage STD (GHS)",
      "Position STD (GHS)",
      "Performance STD (GHS)",
      "Transport Allowance (GHS)",
      "Housing Allowance (GHS)",
      "Bank Name",
      "Bank Account Number",
    ];
    const sampleRows = [
      [
        "SGL-2001",
        "Esi",
        "Mensah",
        "esi.mensah@sundaghana.com",
        "+233 24 551 2001",
        "Manufacturing & Assembly",
        "Plant Operator",
        "Permanent",
        "Juniors",
        "2026-11-19",
        "C089200145120",
        "GHA-720194812-3",
        "2800.00",
        "600.00",
        "450.00",
        "200.00",
        "150.00",
        "Ecobank Ghana",
        "144100992001",
      ],
      [
        "SGL-2002",
        "Kojo",
        "Boateng",
        "kojo.boateng@sundaghana.com",
        "+233 20 882 2002",
        "Logistics & Warehouse",
        "Inventory Coordinator",
        "Permanent",
        "Seniors",
        "2026-11-19",
        "C089200245121",
        "GHA-720194813-4",
        "3500.00",
        "900.00",
        "650.00",
        "250.00",
        "200.00",
        "GCB Bank",
        "101129882002",
      ],
    ];
    const csv = [headers.join(","), ...sampleRows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sunda-employees-upload-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setCsvRows([]);
        setCsvError("CSV file must include a header row and at least one employee row.");
        return;
      }

      const existingIds = new Set(
        employees.map((emp) => emp.staffId.toLowerCase())
      );
      const seenInFile = new Set<string>();
      const parsed: ParsedCsvEmployeeRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const [
          staffId = "",
          firstName = "",
          lastName = "",
          email = "",
          phone = "",
          deptRaw = "",
          jobTitle = "",
          empTypeRaw = "",
          seniorityRaw = "",
          joinDate = "",
          ssnitNumber = "",
          ghanaCardNumber = "",
          basicGhs = "",
          positionGhs = "",
          performanceGhs = "",
          transportGhs = "",
          housingGhs = "",
          bankName = "",
          bankAccountNumber = "",
        ] = cols;

        const dept: Department = DEPARTMENTS.includes(deptRaw as Department)
          ? (deptRaw as Department)
          : "Manufacturing & Assembly";
        const employmentType: EmploymentType =
          empTypeRaw.toLowerCase() === "contract" ? "Contract" : "Permanent";
        const seniorityLevel: "Seniors" | "Juniors" =
          seniorityRaw.toLowerCase() === "seniors" ? "Seniors" : "Juniors";
        const basicSalaryPesewas = parsePesewas(basicGhs);

        let error: string | undefined;
        if (!staffId) error = "Missing Staff ID";
        else if (existingIds.has(staffId.toLowerCase()))
          error = "Duplicate Staff ID (already exists)";
        else if (seenInFile.has(staffId.toLowerCase()))
          error = "Duplicate Staff ID in CSV";
        else if (!firstName || !lastName) error = "Missing first or last name";
        else if (basicSalaryPesewas <= 0) error = "Invalid Basic Wage STD";
        else if (!bankAccountNumber) error = "Missing Bank Account Number";

        if (staffId) seenInFile.add(staffId.toLowerCase());

        parsed.push({
          rowNum: i + 1,
          error,
          employee: {
            staffId,
            firstName,
            lastName,
            email:
              email ||
              `${firstName.toLowerCase()}.${lastName.toLowerCase()}@sundaghana.com`,
            phone: phone || "+233 24 000 0000",
            department: dept,
            jobTitle: jobTitle || "Staff Member",
            status: "Active",
            employmentType,
            seniorityLevel,
            joinDate: joinDate || "2026-11-19",
            basicSalaryPesewas,
            positionStdPesewas: parsePesewas(positionGhs),
            performanceStdPesewas: parsePesewas(performanceGhs),
            transportAllowancePesewas: parsePesewas(transportGhs),
            housingAllowancePesewas: parsePesewas(housingGhs),
            bankName: bankName || "Ecobank Ghana",
            bankAccountNumber,
            ssnitNumber: ssnitNumber || "MISSING",
            ghanaCardNumber: ghanaCardNumber || "MISSING",
          },
        });
      }

      setCsvRows(parsed);
    };
    reader.readAsText(file);
  };

  const validCsvRows = csvRows.filter((r) => !r.error);

  const handleConfirmCsvImport = () => {
    if (validCsvRows.length === 0) return;
    const res = bulkAddEmployees({
      employees: validCsvRows.map((r) => r.employee),
      actorName: user.name,
      actorRole: user.role,
    });
    setBanner(
      `Uploaded ${res.added.length} new employee${
        res.added.length === 1 ? "" : "s"
      } from ${csvFileName || "CSV"}${
        res.skipped.length > 0 ? ` (${res.skipped.length} skipped)` : ""
      }.`
    );
    setShowUploadModal(false);
    setCsvRows([]);
    setCsvFileName("");
    setCsvError(null);
  };

  const handleConfirmRemove = () => {
    if (!removeTargetEmp) return;
    const res = removeEmployee({
      employeeId: removeTargetEmp.id,
      actorName: user.name,
      actorRole: user.role,
    });
    if (res.ok && res.removed) {
      setBanner(
        `Removed ${res.removed.fullName} (${res.removed.staffId}) from the Employee Master Directory.`
      );
      if (selectedEmp?.id === res.removed.id) setSelectedEmp(null);
    }
    setRemoveTargetEmp(null);
  };

  const totalGrossStdPreviewPesewas =
    parsePesewas(formState.basicSalaryGhs) +
    parsePesewas(formState.positionStdGhs) +
    parsePesewas(formState.performanceStdGhs);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
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

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:shrink-0">
          <div className="relative w-full sm:w-56">
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

          {isHrPayroll && (
            <>
              <button
                type="button"
                onClick={() => {
                  setCsvRows([]);
                  setCsvFileName("");
                  setCsvError(null);
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text hover:border-primary hover:text-primary whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>Upload CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAddForm();
                  setShowAddModal(true);
                }}
                style={{ backgroundColor: "var(--primary)" }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Employee</span>
              </button>
            </>
          )}
        </div>
      </div>

      {banner && (
        <div
          style={{
            backgroundColor: "var(--status-green-bg)",
            color: "var(--status-green-fg)",
          }}
          className="rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{banner}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="underline hover:opacity-80 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

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
                        {isHrPayroll && (
                          <button
                            type="button"
                            onClick={() => setRemoveTargetEmp(emp)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-page px-2 py-1 text-xs font-semibold text-muted hover:border-status-red-fg hover:text-status-red-fg"
                            title={`Remove ${emp.fullName}`}
                            aria-label={`Remove ${emp.fullName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
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

      {/* HR/Payroll: Add Single Employee Modal */}
      {showAddModal && isHrPayroll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-employee-modal-title"
        >
          <form
            onSubmit={handleAddEmployeeSubmit}
            className="veltra-card w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3
                  id="add-employee-modal-title"
                  className="text-base font-bold text-text"
                >
                  Add New Employee
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Upload generated Staff ID, personal details, salary standards, and bank account info.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-page hover:text-text"
                aria-label="Close add employee modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div
                style={{
                  backgroundColor: "var(--status-red-bg)",
                  color: "var(--status-red-fg)",
                }}
                className="mt-4 rounded-lg px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div className="mt-4 space-y-5 text-xs">
              {/* Section 1: Staff ID & Personal Details */}
              <div className="space-y-3">
                <div className="font-bold text-text border-b border-border pb-1.5">
                  1. Staff ID &amp; Personal Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Staff ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.staffId}
                      onChange={(e) =>
                        setFormState({ ...formState, staffId: e.target.value })
                      }
                      placeholder="e.g. SGL-1061"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.firstName}
                      onChange={(e) =>
                        setFormState({ ...formState, firstName: e.target.value })
                      }
                      placeholder="e.g. Ama"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.lastName}
                      onChange={(e) =>
                        setFormState({ ...formState, lastName: e.target.value })
                      }
                      placeholder="e.g. Mensah"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) =>
                        setFormState({ ...formState, email: e.target.value })
                      }
                      placeholder="name@sundaghana.com"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formState.phone}
                      onChange={(e) =>
                        setFormState({ ...formState, phone: e.target.value })
                      }
                      placeholder="+233 24 000 0000"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Department *
                    </label>
                    <select
                      value={formState.department}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          department: e.target.value as Department,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.jobTitle}
                      onChange={(e) =>
                        setFormState({ ...formState, jobTitle: e.target.value })
                      }
                      placeholder="e.g. Plant Operator"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Join Date
                    </label>
                    <input
                      type="date"
                      value={formState.joinDate}
                      onChange={(e) =>
                        setFormState({ ...formState, joinDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Employment Type
                    </label>
                    <select
                      value={formState.employmentType}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          employmentType: e.target.value as EmploymentType,
                        })
                      }
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Seniority
                    </label>
                    <select
                      value={formState.seniorityLevel}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          seniorityLevel: e.target.value as "Seniors" | "Juniors",
                        })
                      }
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                    >
                      <option value="Juniors">Juniors</option>
                      <option value="Seniors">Seniors</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      SSNIT Number
                    </label>
                    <input
                      type="text"
                      value={formState.ssnitNumber}
                      onChange={(e) =>
                        setFormState({ ...formState, ssnitNumber: e.target.value })
                      }
                      placeholder="C089..."
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Ghana Card ID
                    </label>
                    <input
                      type="text"
                      value={formState.ghanaCardNumber}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          ghanaCardNumber: e.target.value,
                        })
                      }
                      placeholder="GHA-..."
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Salary Standards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span className="font-bold text-text">
                    2. Salary Standards (GHS)
                  </span>
                  <span className="text-[11px] font-bold text-primary tabular-nums">
                    Total Gross STD: {formatGHS(totalGrossStdPreviewPesewas)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Basic Wage STD (GHS) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formState.basicSalaryGhs}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          basicSalaryGhs: e.target.value,
                        })
                      }
                      placeholder="3000.00"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text tabular-nums focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Position STD (GHS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.positionStdGhs}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          positionStdGhs: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text tabular-nums focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Performance STD (GHS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.performanceStdGhs}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          performanceStdGhs: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text tabular-nums focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Transport Allowance (GHS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.transportAllowanceGhs}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          transportAllowanceGhs: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text tabular-nums focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Housing Allowance (GHS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.housingAllowanceGhs}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          housingAllowanceGhs: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text tabular-nums focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Bank Account Info */}
              <div className="space-y-3">
                <div className="font-bold text-text border-b border-border pb-1.5">
                  3. Bank Account Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Bank Name *
                    </label>
                    <select
                      value={formState.bankName}
                      onChange={(e) =>
                        setFormState({ ...formState, bankName: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text focus:border-primary focus:outline-none"
                    >
                      {BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-muted mb-1">
                      Bank Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.bankAccountNumber}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          bankAccountNumber: e.target.value,
                        })
                      }
                      placeholder="e.g. 144100992001"
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text tabular-nums focus:border-primary focus:bg-surface focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-border bg-page px-4 py-2 text-xs font-semibold text-text hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ backgroundColor: "var(--primary)" }}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Save Employee</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HR/Payroll: Bulk Upload Employees (CSV) Modal */}
      {showUploadModal && isHrPayroll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-csv-modal-title"
        >
          <div className="veltra-card w-full max-w-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3
                  id="upload-csv-modal-title"
                  className="text-base font-bold text-text"
                >
                  Bulk Upload Employees (CSV)
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Upload generated Staff IDs, personal details, salary standards, and bank accounts in one batch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-page hover:text-text"
                aria-label="Close bulk upload modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg border border-border bg-page p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-text">
                    Step 1: Download the Sunda CSV Template
                  </div>
                  <p className="text-muted mt-0.5">
                    Includes columns for Staff ID, personal details, Basic/Position/Performance STD, allowances, and bank info.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:border-primary shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              <div className="rounded-lg border border-dashed border-border bg-page p-4 space-y-2">
                <label
                  htmlFor="employee-csv-input"
                  className="block font-bold text-text"
                >
                  Step 2: Select Filled CSV File
                </label>
                <input
                  id="employee-csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text hover:file:border-primary"
                />
                {csvFileName && (
                  <p className="text-[11px] text-muted">
                    Loaded: <strong className="text-text">{csvFileName}</strong> ({csvRows.length} rows parsed,{" "}
                    <strong className="text-status-green-fg">{validCsvRows.length} valid</strong>)
                  </p>
                )}
              </div>

              {csvError && (
                <div
                  style={{
                    backgroundColor: "var(--status-red-bg)",
                    color: "var(--status-red-fg)",
                  }}
                  className="rounded-lg px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {csvRows.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-page/70 text-[11px] uppercase font-semibold text-muted">
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Staff ID</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Department</th>
                          <th className="px-3 py-2">Basic STD</th>
                          <th className="px-3 py-2">Bank</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border tabular-nums">
                        {csvRows.map((row) => (
                          <tr key={row.rowNum}>
                            <td className="px-3 py-2 text-muted">{row.rowNum}</td>
                            <td className="px-3 py-2 font-semibold text-text">
                              {row.employee.staffId || "—"}
                            </td>
                            <td className="px-3 py-2 text-text">
                              {row.employee.firstName} {row.employee.lastName}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {row.employee.department}
                            </td>
                            <td className="px-3 py-2 text-text">
                              {formatGHS(row.employee.basicSalaryPesewas)}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {row.employee.bankName}
                            </td>
                            <td className="px-3 py-2">
                              {row.error ? (
                                <StatusPill status={row.error} variant="red" />
                              ) : (
                                <StatusPill status="Ready" variant="green" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg border border-border bg-page px-4 py-2 text-xs font-semibold text-text hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validCsvRows.length === 0}
                onClick={handleConfirmCsvImport}
                style={
                  validCsvRows.length > 0
                    ? { backgroundColor: "var(--primary)" }
                    : undefined
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold ${
                  validCsvRows.length === 0
                    ? "bg-page border border-border text-muted cursor-not-allowed"
                    : "text-white hover:opacity-95"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>
                  Import {validCsvRows.length} Employee
                  {validCsvRows.length === 1 ? "" : "s"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR/Payroll: Confirm Remove Employee Modal */}
      {removeTargetEmp && isHrPayroll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-emp-modal-title"
        >
          <div className="veltra-card w-full max-w-md p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: "var(--status-red-bg)",
                  color: "var(--status-red-fg)",
                }}
                className="rounded-lg p-2 shrink-0"
              >
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="remove-emp-modal-title"
                  className="text-base font-bold text-text"
                >
                  Remove Employee?
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Are you sure you want to remove{" "}
                  <strong className="text-text">{removeTargetEmp.fullName}</strong>{" "}
                  ({removeTargetEmp.staffId} · {removeTargetEmp.department}) from
                  the Employee Master Directory? This action will be recorded in
                  the System Audit Trail.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTargetEmp(null)}
                className="rounded-lg border border-border bg-page px-4 py-2 text-xs font-semibold text-text hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                style={{
                  backgroundColor: "var(--status-red-fg)",
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Member</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
