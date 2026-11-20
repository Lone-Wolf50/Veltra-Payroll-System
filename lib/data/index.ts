/**
 * Central Data Access Layer (`lib/data`)
 * PRD Section 11.1 & 15:
 * "Screens never import mock files directly. They call the functions in `lib/data`,
 * which return mock data now and Supabase data later. This is what makes the backend
 * swap invisible to the screens."
 */

import {
  User,
  Employee,
  PayrollRun,
  PayrollRecord,
  AnomalyRecord,
  EwaRequest,
  AttendanceRecord,
  SystemRules,
  AuditEntry,
  EmailLogEntry,
  LeaveRequest,
  LeaveType,
  EmployeeLeaveBalances,
  AnomalyResolutionStatus,
  Role,
} from "../types";
import { MOCK_USERS } from "../mock/users";
import { INITIAL_EMPLOYEES, generateEmployees } from "../mock/employees";
import {
  buildInitialPayrollData,
  INITIAL_EWA_REQUESTS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_AUDIT_TRAIL,
  getOvertimeByDepartment,
} from "../mock/payroll";
import {
  INITIAL_SYSTEM_RULES,
  calculateStatutoryAndNet,
  calculateSundaExcelPayroll,
  computePayeFromBands,
} from "../mock/rules";

export type ConnectionState =
  | "online"
  | "offline"
  | "syncing"
  | "sync_done"
  | "sync_failed";

interface DataStoreState {
  users: User[];
  employees: Employee[];
  workforceSizeMode: "standard_60" | "sunda_2836";
  runs: PayrollRun[];
  recordsByRun: Record<string, PayrollRecord[]>;
  anomalies: AnomalyRecord[];
  ewaRequests: EwaRequest[];
  attendance: AttendanceRecord[];
  rules: SystemRules;
  auditTrail: AuditEntry[];
  emailLogs: EmailLogEntry[];
  leaveRequests: LeaveRequest[];
  connectionState: ConnectionState;
  pendingSyncCount: number;
}

const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "lv-001",
    employeeId: "emp-002",
    staffId: "SGL-1002",
    employeeName: "Kwame Osei",
    department: "Manufacturing & Assembly",
    leaveType: "Annual Leave",
    applicationMode: "All day",
    startDate: "2026-10-12",
    endDate: "2026-10-14",
    durationDays: 3,
    reason: "Family travel to Kumasi.",
    isPaid: true,
    status: "Approved",
    submittedAt: "2026-10-05T09:15:00Z",
    reviewedBy: "Kofi Owusu",
    reviewedByRole: "Supervisor",
    reviewedAt: "2026-10-06T11:30:00Z",
    reviewComment: "Approved. Shift coverage arranged.",
  },
  {
    id: "lv-002",
    employeeId: "emp-002",
    staffId: "SGL-1002",
    employeeName: "Kwame Osei",
    department: "Manufacturing & Assembly",
    leaveType: "Casual Leave",
    applicationMode: "All day",
    startDate: "2026-11-23",
    endDate: "2026-11-24",
    durationDays: 2,
    reason: "Personal errands in Accra.",
    isPaid: false,
    status: "Pending",
    submittedAt: "2026-11-19T14:20:00Z",
  },
  {
    id: "lv-003",
    employeeId: "emp-007",
    staffId: "100002",
    employeeName: "John Doe",
    department: "Logistics & Warehouse",
    leaveType: "Sick Leave",
    applicationMode: "All day",
    startDate: "2026-11-20",
    endDate: "2026-11-21",
    durationDays: 2,
    reason: "Clinic recovery — doctor's medical note attached.",
    attachmentName: "Tema_General_Medical_Note_Nov2026.pdf",
    isPaid: true,
    status: "Pending",
    submittedAt: "2026-11-19T16:05:00Z",
  },
];

const INITIAL_EMAIL_LOGS: EmailLogEntry[] = [
  {
    id: "eml-001",
    type: "Bulk",
    subject: "October 2026 Payslips Now Available",
    title: "October 2026 Statutory Payslip Notice",
    body: "Dear Staff,\n\nYour October 2026 statutory payslip has been published and is available for download in the Veltra Payroll portal.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    recipientSummary: "All Active Staff (58 recipients)",
    recipientCount: 58,
    recipientEmails: INITIAL_EMPLOYEES.filter((e) => e.status === "Active").map((e) => e.email),
    departmentFilter: "All Departments",
    includePayslipSummary: true,
    sentBy: "Akua Mensah",
    sentByRole: "HR/Payroll",
    sentAt: "2026-10-28T16:30:00Z",
    status: "Sent",
  },
  {
    id: "eml-002",
    type: "Individual",
    subject: "Action Required: SSNIT Number Verification",
    title: "Statutory Record Verification Request",
    body: "Dear Kwame Osei,\n\nPlease submit a copy of your SSNIT card to the HR/Payroll office before the November 2026 payroll cutoff so your statutory filing remains up to date.\n\nRegards,\nHR & Payroll — Sunda Ghana Limited",
    recipientSummary: "Kwame Osei (SGL-1002)",
    recipientCount: 1,
    recipientEmails: ["kwame.osei@sundaghana.com"],
    includePayslipSummary: false,
    sentBy: "Akua Mensah",
    sentByRole: "HR/Payroll",
    sentAt: "2026-11-02T09:45:00Z",
    status: "Sent",
  },
];

const initialBuilt = buildInitialPayrollData(INITIAL_EMPLOYEES);

let store: DataStoreState = {
  users: [...MOCK_USERS],
  employees: [...INITIAL_EMPLOYEES],
  workforceSizeMode: "standard_60",
  runs: initialBuilt.runs,
  recordsByRun: initialBuilt.recordsByRun,
  anomalies: initialBuilt.anomalies,
  ewaRequests: [...INITIAL_EWA_REQUESTS],
  attendance: [...INITIAL_ATTENDANCE_RECORDS],
  rules: JSON.parse(JSON.stringify(INITIAL_SYSTEM_RULES)),
  auditTrail: [...INITIAL_AUDIT_TRAIL],
  emailLogs: [...INITIAL_EMAIL_LOGS],
  leaveRequests: [...INITIAL_LEAVE_REQUESTS],
  connectionState: "online",
  pendingSyncCount: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeDataStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

// --- Users & Auth ---
export function getMockUsers(): User[] {
  return store.users;
}

export function findUserByEmail(email: string): User | undefined {
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// --- Connection & Offline Simulator (PRD Section 10) ---
export function getConnectionStatus(): {
  state: ConnectionState;
  pendingCount: number;
} {
  const pendingAttendance = store.attendance.filter((a) => a.syncStatus === "Pending").length;
  return {
    state: store.connectionState,
    pendingCount: store.pendingSyncCount || pendingAttendance,
  };
}

export function setConnectionState(newState: ConnectionState) {
  store.connectionState = newState;
  if (newState === "syncing") {
    store.pendingSyncCount = Math.max(
      1,
      store.attendance.filter((a) => a.syncStatus === "Pending").length || 3
    );
  } else if (newState === "sync_done" || newState === "online") {
    store.attendance = store.attendance.map((a) => ({
      ...a,
      syncStatus: "Synced",
    }));
    store.pendingSyncCount = 0;
  }
  notify();
}

// --- Workforce Scale Toggle (60 vs 2,836 Sunda permanent workforce - PRD 11.2 & 14) ---
export function getWorkforceSizeMode() {
  return store.workforceSizeMode;
}

export function setWorkforceSizeMode(mode: "standard_60" | "sunda_2836") {
  if (store.workforceSizeMode === mode) return;
  store.workforceSizeMode = mode;
  const count = mode === "sunda_2836" ? 2836 : 60;
  const generatedEmployees = generateEmployees(count);
  const built = buildInitialPayrollData(generatedEmployees);
  store.employees = generatedEmployees;
  store.runs = built.runs;
  store.recordsByRun = built.recordsByRun;
  store.anomalies = built.anomalies;
  notify();
}

// --- Employees ---
export function getEmployees(): Employee[] {
  return store.employees;
}

export function getEmployeeById(id: string): Employee | undefined {
  return store.employees.find((e) => e.id === id);
}

function buildPayrollRecordForEmployee(
  emp: Employee,
  runId: string = "run-2026-11"
): PayrollRecord {
  const run = store.runs.find((r) => r.id === runId);
  const calc = calculateSundaExcelPayroll({
    basicSalaryPesewas: emp.basicSalaryPesewas,
    positionStdPesewas: emp.positionStdPesewas ?? emp.transportAllowancePesewas,
    performanceStdPesewas: emp.performanceStdPesewas ?? emp.housingAllowancePesewas,
    seniorityLevel: emp.seniorityLevel ?? "Juniors",
    shouldWorkingDays: 20,
    casualLeaveDays: 0,
    absentDays: 0,
    sickLeaveDays: 0,
    annualLeaveDays: 0,
    maternityLeaveDays: 0,
    workInjuryLeaveDays: 0,
    coefficientScore: 1.0,
    otherIncomePesewas: 0,
    otherDeductionBeforeTaxPesewas: 0,
    fullAttendanceBonusPesewas: 0,
    lunchAllowancePesewas: 0,
    workdayOtHours: 0,
    saturdayOtHours: 0,
    sundayOtHours: 0,
    holidayOtHours: 0,
    ewaRecoveryPesewas: 0,
    useExcelPayeBands: false,
    rules: store.rules,
    periodMonth: run?.periodMonth ?? "2026-11",
  });

  return {
    id: `prec-${runId}-${emp.id}`,
    runId,
    employeeId: emp.id,
    staffId: emp.staffId,
    employeeName: emp.fullName,
    department: emp.department,
    jobTitle: emp.jobTitle,
    employeeStatus: emp.status,
    daysExpected: calc.daysExpected,
    daysAttended: calc.daysAttended,
    daysPaid: calc.daysPaid,
    casualLeaveDays: calc.casualLeaveDays,
    absentDays: calc.absentDays,
    sickLeaveDays: calc.sickLeaveDays,
    annualLeaveDays: calc.annualLeaveDays,
    maternityLeaveDays: calc.maternityLeaveDays,
    workInjuryLeaveDays: calc.workInjuryLeaveDays,
    overtimeHours: 0,
    workdayOtHours: 0,
    saturdayOtHours: 0,
    sundayOtHours: 0,
    holidayOtHours: 0,
    workdayOtPayPesewas: 0,
    saturdayOtPayPesewas: 0,
    sundayOtPayPesewas: 0,
    holidayOtPayPesewas: 0,
    dailyWageStdPesewas: calc.dailyWageStdPesewas,
    hourlyWageStdPesewas: calc.hourlyWageStdPesewas,
    positionStdPesewas: calc.positionStdPesewas,
    performanceStdPesewas: calc.performanceStdPesewas,
    totalGrossStdPesewas: calc.totalGrossStdPesewas,
    coefficientScore: calc.coefficientScore,
    positionEarnedPesewas: calc.positionEarnedPesewas,
    performanceEarnedPesewas: calc.performanceEarnedPesewas,
    otherIncomePesewas: calc.otherIncomePesewas,
    otherDeductionBeforeTaxPesewas: calc.otherDeductionBeforeTaxPesewas,
    fullAttendanceBonusPesewas: calc.fullAttendanceBonusPesewas,
    lunchAllowancePesewas: calc.lunchAllowancePesewas,
    totalBonusPesewas: calc.totalBonusPesewas,
    bonusTaxBasePesewas: calc.bonusTaxBasePesewas,
    bonusTaxPesewas: calc.bonusTaxPesewas,
    otTaxBasePesewas: calc.otTaxBasePesewas,
    otTaxPesewas: calc.otTaxPesewas,
    cashAllowancePesewas: calc.cashAllowancePesewas,
    excessBonusPesewas: calc.excessBonusPesewas,
    payeBasePesewas: calc.payeBasePesewas,
    totalGraTaxPesewas: calc.totalGraTaxPesewas,
    nssfEmployer13Pesewas: calc.nssfEmployer13Pesewas,
    tier1SsnitPesewas: calc.tier1SsnitPesewas,
    tier2PetraPesewas: calc.tier2PetraPesewas,
    hrCostPesewas: calc.hrCostPesewas,
    seniorityLevel: calc.seniorityLevel,
    basicSalaryPesewas: calc.basicSalaryPesewas,
    allowancesPesewas: calc.allowancesPesewas,
    overtimePayPesewas: calc.overtimePayPesewas,
    grossPayPesewas: calc.grossPayPesewas,
    ssnitEmployeePesewas: calc.ssnitEmployeePesewas,
    ssnitEmployerPesewas: calc.ssnitEmployerPesewas,
    chargeableIncomePesewas: calc.chargeableIncomePesewas,
    payePesewas: calc.payePesewas,
    ewaRecoveryPesewas: calc.ewaRecoveryPesewas,
    totalDeductionsPesewas: calc.totalDeductionsPesewas,
    netPayPesewas: calc.netPayPesewas,
    status: "Pending",
    hasOpenAnomaly: false,
    anomalyCount: 0,
  };
}

function recalcRunTotals(runId: string) {
  const run = store.runs.find((r) => r.id === runId);
  const recs = store.recordsByRun[runId];
  if (!run || !recs) return;

  run.employeeCount = recs.length;
  run.totalBasicPesewas = recs.reduce((s, r) => s + r.basicSalaryPesewas, 0);
  run.totalAllowancesPesewas = recs.reduce((s, r) => s + r.allowancesPesewas, 0);
  run.totalOvertimePesewas = recs.reduce((s, r) => s + r.overtimePayPesewas, 0);
  run.totalGrossPesewas = recs.reduce((s, r) => s + r.grossPayPesewas, 0);
  run.totalSsnitEmployeePesewas = recs.reduce((s, r) => s + r.ssnitEmployeePesewas, 0);
  run.totalSsnitEmployerPesewas = recs.reduce((s, r) => s + r.ssnitEmployerPesewas, 0);
  run.totalPayePesewas = recs.reduce((s, r) => s + r.payePesewas, 0);
  run.totalStatutoryPesewas = run.totalSsnitEmployeePesewas + run.totalPayePesewas;
  run.totalOtherDeductionBeforeTaxPesewas = recs.reduce(
    (s, r) => s + (r.otherDeductionBeforeTaxPesewas ?? 0),
    0
  );
  run.totalEwaRecoveryPesewas = recs.reduce((s, r) => s + r.ewaRecoveryPesewas, 0);
  run.totalNetPesewas = recs.reduce((s, r) => s + r.netPayPesewas, 0);
  run.totalPayrollCostPesewas = run.totalGrossPesewas + run.totalSsnitEmployerPesewas;
}

export function addEmployee(params: {
  employee: Omit<Employee, "id" | "fullName">;
  actorName: string;
  actorRole: Role;
}): { ok: boolean; employee?: Employee; error?: string } {
  const staffIdClean = params.employee.staffId.trim();
  if (!staffIdClean) {
    return { ok: false, error: "Staff ID is required." };
  }
  const duplicate = store.employees.some(
    (e) => e.staffId.toLowerCase() === staffIdClean.toLowerCase()
  );
  if (duplicate) {
    return {
      ok: false,
      error: `Staff ID "${staffIdClean}" already exists in the employee directory.`,
    };
  }

  const firstName = params.employee.firstName.trim();
  const lastName = params.employee.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();

  const created: Employee = {
    ...params.employee,
    id: `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    staffId: staffIdClean,
    firstName,
    lastName,
    fullName,
  };

  store.employees = [created, ...store.employees];

  // Add a live demo login/role-switcher account for this newly created employee
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "EM";
  const newUser: User = {
    id: `usr-${created.id}`,
    email: created.email,
    name: created.fullName,
    role: "Employee",
    employeeId: created.id,
    department: created.department,
    avatarInitials: initials,
  };
  store.users = [...store.users, newUser];

  // Immediately calculate and add to active November 2026 Payroll Run
  const activeRunId = "run-2026-11";
  const newRec = buildPayrollRecordForEmployee(created, activeRunId);
  store.recordsByRun[activeRunId] = [
    newRec,
    ...(store.recordsByRun[activeRunId] ?? []),
  ];
  recalcRunTotals(activeRunId);

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    category: "Payroll",
    action: "Added New Employee",
    details: `Uploaded ${created.fullName} (${created.staffId}) in ${created.department} · Basic Wage STD GHS ${(
      created.basicSalaryPesewas / 100
    ).toFixed(2)} · Bank: ${created.bankName}.`,
  });

  notify();
  return { ok: true, employee: created };
}

export function bulkAddEmployees(params: {
  employees: Omit<Employee, "id" | "fullName">[];
  actorName: string;
  actorRole: Role;
}): { added: Employee[]; skipped: { staffId: string; reason: string }[] } {
  const existingIds = new Set(
    store.employees.map((e) => e.staffId.toLowerCase())
  );
  const added: Employee[] = [];
  const skipped: { staffId: string; reason: string }[] = [];
  const baseTs = Date.now();

  params.employees.forEach((emp, i) => {
    const staffIdClean = emp.staffId.trim();
    if (!staffIdClean) {
      skipped.push({ staffId: "(blank)", reason: "Missing Staff ID" });
      return;
    }
    if (existingIds.has(staffIdClean.toLowerCase())) {
      skipped.push({ staffId: staffIdClean, reason: "Duplicate Staff ID" });
      return;
    }
    const firstName = emp.firstName.trim();
    const lastName = emp.lastName.trim();
    if (!firstName || !lastName) {
      skipped.push({ staffId: staffIdClean, reason: "Missing first or last name" });
      return;
    }
    existingIds.add(staffIdClean.toLowerCase());
    added.push({
      ...emp,
      id: `emp-${baseTs}-${i}`,
      staffId: staffIdClean,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
    });
  });

  if (added.length > 0) {
    store.employees = [...added, ...store.employees];

    const newUsers: User[] = added.map((emp) => ({
      id: `usr-${emp.id}`,
      email: emp.email,
      name: emp.fullName,
      role: "Employee",
      employeeId: emp.id,
      department: emp.department,
      avatarInitials:
        `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`.toUpperCase() || "EM",
    }));
    store.users = [...store.users, ...newUsers];

    const activeRunId = "run-2026-11";
    const newRecords = added.map((emp) =>
      buildPayrollRecordForEmployee(emp, activeRunId)
    );
    store.recordsByRun[activeRunId] = [
      ...newRecords,
      ...(store.recordsByRun[activeRunId] ?? []),
    ];
    recalcRunTotals(activeRunId);

    store.auditTrail.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: params.actorName,
      actorRole: params.actorRole,
      category: "Payroll",
      action: `Bulk Uploaded ${added.length} New Employee${added.length === 1 ? "" : "s"}`,
      details: `Imported ${added.length} employee record${
        added.length === 1 ? "" : "s"
      } via CSV (${added
        .slice(0, 3)
        .map((e) => e.staffId)
        .join(", ")}${added.length > 3 ? ` +${added.length - 3} more` : ""})${
        skipped.length > 0 ? `. Skipped ${skipped.length} invalid/duplicate row(s).` : "."
      }`,
    });
    notify();
  }

  return { added, skipped };
}

export function removeEmployee(params: {
  employeeId: string;
  actorName: string;
  actorRole: Role;
}): { ok: boolean; removed?: Employee; error?: string } {
  const target = store.employees.find((e) => e.id === params.employeeId);
  if (!target) {
    return { ok: false, error: "Employee not found." };
  }

  store.employees = store.employees.filter((e) => e.id !== params.employeeId);
  store.users = store.users.filter((u) => u.employeeId !== params.employeeId);

  // Also remove from active November 2026 Payroll Run and update totals
  const activeRunId = "run-2026-11";
  if (store.recordsByRun[activeRunId]) {
    store.recordsByRun[activeRunId] = store.recordsByRun[activeRunId].filter(
      (r) => r.employeeId !== params.employeeId
    );
    recalcRunTotals(activeRunId);
  }

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    category: "Payroll",
    action: "Removed Employee",
    details: `Removed ${target.fullName} (${target.staffId}) from ${target.department} in the employee directory.`,
  });

  notify();
  return { ok: true, removed: target };
}

// --- Payroll Runs & Records ---
export function getPayrollRuns(): PayrollRun[] {
  return store.runs;
}

export function getPayrollRunById(runId: string): PayrollRun | undefined {
  return store.runs.find((r) => r.id === runId);
}

export function getActivePayrollRun(): PayrollRun {
  return store.runs.find((r) => r.id === "run-2026-11") ?? store.runs[store.runs.length - 1];
}

export function getPayrollRecords(runId: string = "run-2026-11"): PayrollRecord[] {
  return store.recordsByRun[runId] ?? [];
}

export function getEmployeePayslips(employeeId: string): {
  run: PayrollRun;
  record: PayrollRecord;
}[] {
  const results: { run: PayrollRun; record: PayrollRecord }[] = [];
  for (const run of store.runs) {
    if (run.status === "Draft") continue;
    const rec = (store.recordsByRun[run.id] ?? []).find((r) => r.employeeId === employeeId);
    if (rec) {
      results.push({ run, record: rec });
    }
  }
  return results.reverse();
}

// --- Dashboard Summary & Charts Data ---
export function getHrDashboardSummary(runId: string = "run-2026-11") {
  const currentRun = getPayrollRunById(runId) ?? getActivePayrollRun();
  const prevRun = getPayrollRunById("run-2026-10") ?? store.runs[store.runs.length - 2];

  const calcDeltaPercent = (curr: number, prev: number) => {
    if (!prev) return 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  const openFlags = store.anomalies.filter(
    (a) => a.runId === currentRun.id && a.status === "Needs review"
  ).length;

  return {
    currentRun,
    totalPayrollCostPesewas: currentRun.totalPayrollCostPesewas,
    costChangePercent: calcDeltaPercent(
      currentRun.totalPayrollCostPesewas,
      prevRun?.totalPayrollCostPesewas ?? currentRun.totalPayrollCostPesewas
    ),
    netPayPesewas: currentRun.totalNetPesewas,
    netChangePercent: calcDeltaPercent(
      currentRun.totalNetPesewas,
      prevRun?.totalNetPesewas ?? currentRun.totalNetPesewas
    ),
    statutoryDeductionsPesewas: currentRun.totalStatutoryPesewas,
    statutoryChangePercent: calcDeltaPercent(
      currentRun.totalStatutoryPesewas,
      prevRun?.totalStatutoryPesewas ?? currentRun.totalStatutoryPesewas
    ),
    flaggedRecordsCount: openFlags,
    totalFlaggedInPeriod: store.anomalies.filter((a) => a.runId === currentRun.id).length,
  };
}

export function getPayrollCostByMonthChartData() {
  // Filter to the 6 main monthly runs (Jun - Nov 2026)
  const mainRuns = store.runs.filter((r) => !r.id.endsWith("-supp")).slice(-6);
  return mainRuns.map((run) => ({
    runId: run.id,
    month: run.periodShort.replace(" 2026", ""),
    fullPeriod: run.periodLabel,
    netPayPesewas: run.totalNetPesewas,
    statutoryPesewas: run.totalStatutoryPesewas + run.totalSsnitEmployerPesewas,
    overtimePesewas: run.totalOvertimePesewas,
    totalCostPesewas: run.totalPayrollCostPesewas,
  }));
}

export function getPayrollStatusChartData() {
  const counts: Record<PayrollRun["status"], number> = {
    Paid: 0,
    Approved: 0,
    "Pending approval": 0,
    Draft: 0,
  };
  for (const r of store.runs) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  return [
    { status: "Paid", count: counts["Paid"], colorVar: "var(--teal)" },
    { status: "Approved", count: counts["Approved"], colorVar: "var(--primary)" },
    {
      status: "Pending approval",
      count: counts["Pending approval"],
      colorVar: "var(--blue-soft)",
    },
    { status: "Draft", count: counts["Draft"], colorVar: "var(--status-amber-fg)" },
  ];
}

export function getStatutoryBreakdownChartData(runId: string = "run-2026-11") {
  const run = getPayrollRunById(runId) ?? getActivePayrollRun();
  return [
    {
      name: "GRA PAYE Income Tax",
      shortName: "PAYE",
      amountPesewas: run.totalPayePesewas,
      rateLabel: "Progressive (0% – 35%)",
    },
    {
      name: "SSNIT Employer (Tier 1 & 2)",
      shortName: "SSNIT (Employer)",
      amountPesewas: run.totalSsnitEmployerPesewas,
      rateLabel: `${store.rules.ssnitEmployerRatePercent}% of Basic`,
    },
    {
      name: "SSNIT Employee Contribution",
      shortName: "SSNIT (Employee)",
      amountPesewas: run.totalSsnitEmployeePesewas,
      rateLabel: `${store.rules.ssnitEmployeeRatePercent}% of Basic`,
    },
  ];
}

// --- Anomalies & Resolution ---
export function getAnomalies(runId?: string): AnomalyRecord[] {
  if (!runId) return store.anomalies;
  return store.anomalies.filter((a) => a.runId === runId);
}

export function getAnomaliesByRuleChartData() {
  const rulesOrder: { id: AnomalyRecord["ruleId"]; label: string }[] = [
    { id: "duplicate_account", label: "Duplicate account" },
    { id: "abnormal_overtime", label: "Abnormal overtime" },
    { id: "attendance_mismatch", label: "Attendance mismatch" },
    { id: "inconsistent_record", label: "Inconsistent record" },
    { id: "inactive_employee_paid", label: "Inactive employee paid" },
  ];

  return rulesOrder.map((r) => {
    const matching = store.anomalies.filter((a) => a.ruleId === r.id);
    const openCount = matching.filter((a) => a.status === "Needs review").length;
    return {
      ruleId: r.id,
      ruleName: r.label,
      totalCount: matching.length,
      openCount,
    };
  });
}

export function resolveAnomaly(params: {
  anomalyId: string;
  resolution: "Corrected" | "Confirmed legitimate";
  note: string;
  actorName: string;
  actorRole: Role;
}) {
  const idx = store.anomalies.findIndex((a) => a.id === params.anomalyId);
  if (idx === -1) return;

  const anomaly = store.anomalies[idx];
  const updated: AnomalyRecord = {
    ...anomaly,
    status: params.resolution,
    resolutionNote: params.note,
    resolvedBy: params.actorName,
    resolvedAt: new Date().toISOString(),
  };
  store.anomalies[idx] = updated;

  // Update the payroll record & recalculate run if Corrected (PRD Section 7.5)
  const runRecords = store.recordsByRun[anomaly.runId];
  if (runRecords) {
    const recIdx = runRecords.findIndex((r) => r.id === anomaly.payrollRecordId);
    if (recIdx !== -1) {
      const rec = { ...runRecords[recIdx] };
      rec.hasOpenAnomaly = false;
      rec.anomalyCount = 0;

      if (params.resolution === "Corrected") {
        // Recalculate based on the rule that fired
        if (anomaly.ruleId === "abnormal_overtime") {
          rec.overtimeHours = store.rules.anomalyRules.abnormal_overtime.maxHoursPerPeriod;
          const hourly = Math.round(rec.basicSalaryPesewas / 176);
          rec.overtimePayPesewas = Math.round(rec.overtimeHours * hourly * 1.5);
        } else if (anomaly.ruleId === "attendance_mismatch") {
          rec.daysPaid = rec.daysAttended;
          const ratio = rec.daysAttended / rec.daysExpected;
          rec.basicSalaryPesewas = Math.round(rec.basicSalaryPesewas * ratio);
        } else if (anomaly.ruleId === "inactive_employee_paid") {
          rec.basicSalaryPesewas = 0;
          rec.allowancesPesewas = 0;
          rec.overtimePayPesewas = 0;
        }

        const recalc = calculateStatutoryAndNet({
          basicSalaryPesewas: rec.basicSalaryPesewas,
          allowancesPesewas: rec.allowancesPesewas,
          overtimePayPesewas: rec.overtimePayPesewas,
          ewaRecoveryPesewas: rec.ewaRecoveryPesewas,
          rules: store.rules,
        });
        Object.assign(rec, recalc);
      }

      rec.status = "Pending";
      runRecords[recIdx] = rec;
      recalculateRunTotals(anomaly.runId);
    }
  }

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    category: "Anomaly",
    action: `Marked anomaly '${anomaly.ruleName}' as ${params.resolution}`,
    details: `${anomaly.employeeName} (${anomaly.staffId}): ${params.note}`,
  });

  notify();
}

function recalculateRunTotals(runId: string) {
  const runIdx = store.runs.findIndex((r) => r.id === runId);
  if (runIdx === -1) return;
  const records = store.recordsByRun[runId] ?? [];

  let totalBasicPesewas = 0;
  let totalAllowancesPesewas = 0;
  let totalOvertimePesewas = 0;
  let totalGrossPesewas = 0;
  let totalSsnitEmployeePesewas = 0;
  let totalSsnitEmployerPesewas = 0;
  let totalPayePesewas = 0;
  let totalEwaRecoveryPesewas = 0;
  let totalNetPesewas = 0;
  let flaggedCount = 0;

  for (const r of records) {
    totalBasicPesewas += r.basicSalaryPesewas;
    totalAllowancesPesewas += r.allowancesPesewas;
    totalOvertimePesewas += r.overtimePayPesewas;
    totalGrossPesewas += r.grossPayPesewas;
    totalSsnitEmployeePesewas += r.ssnitEmployeePesewas;
    totalSsnitEmployerPesewas += r.ssnitEmployerPesewas;
    totalPayePesewas += r.payePesewas;
    totalEwaRecoveryPesewas += r.ewaRecoveryPesewas;
    totalNetPesewas += r.netPayPesewas;
    if (r.hasOpenAnomaly) flaggedCount += 1;
  }

  store.runs[runIdx] = {
    ...store.runs[runIdx],
    totalBasicPesewas,
    totalAllowancesPesewas,
    totalOvertimePesewas,
    totalGrossPesewas,
    totalSsnitEmployeePesewas,
    totalSsnitEmployerPesewas,
    totalPayePesewas,
    totalStatutoryPesewas: totalSsnitEmployeePesewas + totalPayePesewas,
    totalEwaRecoveryPesewas,
    totalNetPesewas,
    totalPayrollCostPesewas: totalGrossPesewas + totalSsnitEmployerPesewas,
    flaggedCount,
  };
}

// --- Approvals & Run Submission ---
export function submitDraftRunForApproval(params: {
  runId: string;
  actorName: string;
  actorRole: Role;
}) {
  const runIdx = store.runs.findIndex((r) => r.id === params.runId);
  if (runIdx === -1) return;

  const sequence = store.rules.approvalSequence;
  const firstStage = sequence[0] ?? "Supervisor";

  store.runs[runIdx] = {
    ...store.runs[runIdx],
    status: "Pending approval",
    currentApprovalStage: firstStage,
    approvalStages: sequence.map((stage, idx) => ({
      stageName: stage,
      status: idx === 0 ? "Pending" : "Waiting",
    })),
  };

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    category: "Payroll",
    action: `Submitted ${store.runs[runIdx].periodLabel} for approval`,
    details: `Run entered stage 1 (${firstStage}).`,
  });

  notify();
}

export function actOnPayrollRunApproval(params: {
  runId: string;
  decision: "Approved" | "Rejected";
  comment: string;
  actorName: string;
  actorRole: Role;
}) {
  const runIdx = store.runs.findIndex((r) => r.id === params.runId);
  if (runIdx === -1) return;

  const run = store.runs[runIdx];
  const stages = [...run.approvalStages];
  const pendingIdx = stages.findIndex((s) => s.status === "Pending");
  if (pendingIdx === -1) return;

  stages[pendingIdx] = {
    ...stages[pendingIdx],
    status: params.decision,
    actorName: params.actorName,
    actedAt: new Date().toISOString(),
    comment: params.comment,
  };

  let newRunStatus: PayrollRun["status"] = run.status;
  let nextStage: PayrollRun["currentApprovalStage"] = run.currentApprovalStage;

  if (params.decision === "Rejected") {
    newRunStatus = "Draft";
  } else {
    if (pendingIdx + 1 < stages.length) {
      stages[pendingIdx + 1] = {
        ...stages[pendingIdx + 1],
        status: "Pending",
      };
      nextStage = stages[pendingIdx + 1].stageName;
    } else {
      newRunStatus = "Approved";
      nextStage = "Completed";
      // Also update records from Pending -> Approved
      const recs = store.recordsByRun[run.id] ?? [];
      store.recordsByRun[run.id] = recs.map((r) =>
        r.hasOpenAnomaly ? r : { ...r, status: "Approved" }
      );
    }
  }

  store.runs[runIdx] = {
    ...run,
    status: newRunStatus,
    currentApprovalStage: nextStage,
    approvalStages: stages,
  };

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    category: "Approval",
    action: `${params.decision} ${run.periodLabel} (${params.actorRole} Stage)`,
    details: params.comment,
  });

  notify();
}

// --- Attendance & Clock-In ---
export function getAttendanceRecords(employeeId?: string): AttendanceRecord[] {
  if (!employeeId) return store.attendance;
  return store.attendance.filter((a) => a.employeeId === employeeId);
}

export function recordClockAction(params: {
  employeeId: string;
  employeeName: string;
  department: Employee["department"];
  action: "clock_in" | "clock_out";
  timeStr: string;
}) {
  const today = "2026-11-03";
  const isOffline = store.connectionState === "offline";
  const syncStatus: AttendanceRecord["syncStatus"] = isOffline ? "Pending" : "Synced";

  const existingIdx = store.attendance.findIndex(
    (a) => a.employeeId === params.employeeId && a.date === today
  );

  if (params.action === "clock_in") {
    if (existingIdx !== -1) {
      store.attendance[existingIdx] = {
        ...store.attendance[existingIdx],
        clockIn: params.timeStr,
        syncStatus,
      };
    } else {
      store.attendance.unshift({
        id: `att-${Date.now()}`,
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        department: params.department,
        date: today,
        clockIn: params.timeStr,
        clockOut: null,
        hoursWorked: 0,
        overtimeHours: 0,
        status: "Present",
        syncStatus,
      });
    }
  } else {
    if (existingIdx !== -1) {
      store.attendance[existingIdx] = {
        ...store.attendance[existingIdx],
        clockOut: params.timeStr,
        hoursWorked: 8.5,
        overtimeHours: 0.5,
        syncStatus,
      };
    }
  }

  if (isOffline) {
    store.pendingSyncCount += 1;
  }

  notify();
}

// --- EWA (Simulated Earned Wage Access) ---
export function getEwaRequests(employeeId?: string): EwaRequest[] {
  if (!employeeId) return store.ewaRequests;
  return store.ewaRequests.filter((e) => e.employeeId === employeeId);
}

export function getEmployeeEwaStatus(employeeId: string) {
  const emp = getEmployeeById(employeeId) ?? store.employees[1];
  const rules = store.rules;

  // Assume 15 out of 22 working days elapsed in current cycle
  const earnedToDatePesewas = Math.round(emp.basicSalaryPesewas * (15 / 22));
  const maxByPercentPesewas = Math.round(
    earnedToDatePesewas * (rules.ewaMaxPercentage / 100)
  );
  const maxAllowedPesewas = Math.min(maxByPercentPesewas, rules.ewaPerRequestCapPesewas);

  const takenThisPeriodPesewas = store.ewaRequests
    .filter(
      (r) =>
        r.employeeId === emp.id &&
        r.periodShort === "Nov 2026" &&
        (r.status === "Approved" || r.status === "Pending")
    )
    .reduce((sum, r) => sum + r.amountRequestedPesewas, 0);

  const hasOpenAnomaly = store.anomalies.some(
    (a) => a.employeeId === emp.id && a.status === "Needs review"
  );

  let ineligibleReason: string | null = null;
  if (rules.ewaRequireActivePermanent && emp.status !== "Active") {
    ineligibleReason = `Employee status is ${emp.status}. Only Active permanent employees are eligible.`;
  } else if (rules.ewaRequireNoOpenAnomaly && hasOpenAnomaly) {
    ineligibleReason =
      "Employee has an open payroll anomaly flag requiring HR review before EWA disbursement.";
  }

  const availableNowPesewas = ineligibleReason
    ? 0
    : Math.max(0, maxAllowedPesewas - takenThisPeriodPesewas);

  return {
    employee: emp,
    earnedToDatePesewas,
    maxByPercentPesewas,
    perRequestCapPesewas: rules.ewaPerRequestCapPesewas,
    maxAllowedPesewas,
    takenThisPeriodPesewas,
    availableNowPesewas,
    ineligibleReason,
    rules,
  };
}

export function submitSimulatedEwaRequest(params: {
  employeeId: string;
  amountPesewas: number;
}): { request: EwaRequest; approved: boolean; message: string } {
  const status = getEmployeeEwaStatus(params.employeeId);
  const emp = status.employee;

  let approved = true;
  let declineReason: string | undefined;

  if (status.ineligibleReason) {
    approved = false;
    declineReason = status.ineligibleReason;
  } else if (params.amountPesewas > status.perRequestCapPesewas) {
    approved = false;
    declineReason = `Requested amount exceeds configured per-request cap of GHS ${(
      status.perRequestCapPesewas / 100
    ).toFixed(2)}.`;
  } else if (params.amountPesewas > status.availableNowPesewas) {
    approved = false;
    declineReason = `Requested amount exceeds available EWA balance (${status.rules.ewaMaxPercentage}% of earned wages less prior advances).`;
  }

  const newReq: EwaRequest = {
    id: `ewa-${Date.now()}`,
    employeeId: emp.id,
    staffId: emp.staffId,
    employeeName: emp.fullName,
    department: emp.department,
    periodShort: "Nov 2026",
    requestedAt: new Date().toISOString(),
    earnedToDatePesewas: status.earnedToDatePesewas,
    availableLimitPesewas: status.availableNowPesewas,
    amountRequestedPesewas: params.amountPesewas,
    status: approved ? "Approved" : "Declined",
    declineReason,
  };

  store.ewaRequests.unshift(newReq);

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: emp.fullName,
    actorRole: "Employee",
    category: "EWA",
    action: `Simulated EWA Request ${approved ? "Approved" : "Declined"}`,
    details: `${emp.fullName} requested GHS ${(params.amountPesewas / 100).toFixed(2)}. ${
      declineReason ?? "Automatically scheduled for payroll deduction recovery."
    }`,
  });

  notify();

  return {
    request: newReq,
    approved,
    message: approved
      ? "Simulated EWA disbursement approved and queued for payroll recovery."
      : declineReason!,
  };
}

export function getEwaUsageChartData() {
  return [
    { month: "Jun", advancedPesewas: 820000, recoveredPesewas: 820000 },
    { month: "Jul", advancedPesewas: 950000, recoveredPesewas: 950000 },
    { month: "Aug", advancedPesewas: 1140000, recoveredPesewas: 1140000 },
    { month: "Sep", advancedPesewas: 1080000, recoveredPesewas: 1080000 },
    { month: "Oct", advancedPesewas: 1320000, recoveredPesewas: 1320000 },
    { month: "Nov", advancedPesewas: 1450000, recoveredPesewas: 920000 },
  ];
}

// --- Settings & Rules (PRD Section 8 & 13 Step 5) ---
export function getSystemRules(): SystemRules {
  return store.rules;
}

export function updateSystemRules(params: {
  updatedRules: SystemRules;
  actorName: string;
  actorRole: Role;
  changeSummary: string;
}) {
  store.rules = JSON.parse(JSON.stringify(params.updatedRules));

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    category: "Settings",
    action: "Updated Configurable System Rules",
    details: params.changeSummary,
  });

  notify();
}

// --- Other Deduction (Before Tax) Update ---
export function updatePayrollRecordOtherDeduction(params: {
  runId: string;
  recordId: string;
  otherDeductionBeforeTaxPesewas: number;
  actorName: string;
  actorRole: Role;
}): PayrollRecord | undefined {
  const records = store.recordsByRun[params.runId];
  if (!records) return undefined;
  const idx = records.findIndex((r) => r.id === params.recordId);
  if (idx === -1) return undefined;

  const rec = records[idx];
  const run = store.runs.find((r) => r.id === params.runId);
  const newDeduction = Math.max(0, Math.round(params.otherDeductionBeforeTaxPesewas));

  // Recompute PAYE Base (Chargeable Income) with new pre-tax deduction
  const isExcelRow =
    rec.staffId === "100001" ||
    rec.staffId === "100002" ||
    rec.staffId === "100003";
  const schedule =
    (isExcelRow || (run && run.periodMonth < "2026-09")
      ? store.rules.payeSchedules.find((s) => s.id === "sunda-excel-2026")
      : store.rules.payeSchedules.find(
          (s) => s.id === store.rules.activePayeScheduleId
        )) ?? store.rules.payeSchedules[0];

  const baseBeforePreTax =
    rec.staffId === "SGL-1001"
      ? rec.grossPayPesewas - rec.ssnitEmployeePesewas
      : Math.round(
          rec.basicSalaryPesewas -
            rec.basicSalaryPesewas * 0.055 +
            (rec.cashAllowancePesewas ?? rec.overtimePayPesewas) +
            (rec.excessBonusPesewas ?? 0)
        );

  const newPayeBasePesewas = Math.max(0, baseBeforePreTax - newDeduction);
  const newPayePesewas = computePayeFromBands(newPayeBasePesewas, schedule.bands);
  const newTotalGraTaxPesewas =
    (rec.bonusTaxPesewas ?? 0) + (rec.otTaxPesewas ?? 0) + newPayePesewas;
  const newTotalDeductionsPesewas =
    rec.ssnitEmployeePesewas +
    newDeduction +
    newTotalGraTaxPesewas +
    rec.ewaRecoveryPesewas;
  const newNetPayPesewas = Math.max(
    0,
    rec.grossPayPesewas - newTotalDeductionsPesewas
  );

  const updatedRecord: PayrollRecord = {
    ...rec,
    otherDeductionBeforeTaxPesewas: newDeduction,
    chargeableIncomePesewas: newPayeBasePesewas,
    payeBasePesewas: newPayeBasePesewas,
    payePesewas: newPayePesewas,
    totalGraTaxPesewas: newTotalGraTaxPesewas,
    totalDeductionsPesewas: newTotalDeductionsPesewas,
    netPayPesewas: newNetPayPesewas,
  };

  const updatedRecords = records.map((r, i) => (i === idx ? updatedRecord : r));
  store.recordsByRun[params.runId] = updatedRecords;

  // Recalculate parent run totals
  if (run) {
    run.totalPayePesewas = updatedRecords.reduce((s, r) => s + r.payePesewas, 0);
    run.totalStatutoryPesewas =
      run.totalSsnitEmployeePesewas + run.totalPayePesewas;
    run.totalOtherDeductionBeforeTaxPesewas = updatedRecords.reduce(
      (s, r) => s + (r.otherDeductionBeforeTaxPesewas ?? 0),
      0
    );
    run.totalNetPesewas = updatedRecords.reduce((s, r) => s + r.netPayPesewas, 0);
  }

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    category: "Payroll",
    action: "Updated Other Deduction (Before Tax)",
    details: `Set Other Deduction (Before Tax) for ${rec.employeeName} (${rec.staffId}) to GHS ${(
      newDeduction / 100
    ).toFixed(2)}. PAYE recalculated to GHS ${(newPayePesewas / 100).toFixed(
      2
    )}, Net Pay GHS ${(newNetPayPesewas / 100).toFixed(2)}.`,
  });

  notify();
  return updatedRecord;
}

// --- HR/Payroll Email (Bulk & Individual) ---
export function getEmailLogs(): EmailLogEntry[] {
  return store.emailLogs;
}

export function sendHrPayrollEmail(params: {
  type: "Bulk" | "Individual";
  subject: string;
  title?: string;
  body: string;
  recipientSummary: string;
  recipientEmails: string[];
  departmentFilter?: string;
  includePayslipSummary?: boolean;
  sentBy: string;
  sentByRole: Role;
}): EmailLogEntry {
  const entry: EmailLogEntry = {
    id: `eml-${Date.now()}`,
    type: params.type,
    subject: params.subject.trim(),
    title: params.title?.trim() || undefined,
    body: params.body.trim(),
    recipientSummary: params.recipientSummary,
    recipientCount: params.recipientEmails.length,
    recipientEmails: params.recipientEmails,
    departmentFilter: params.departmentFilter,
    includePayslipSummary: params.includePayslipSummary,
    sentBy: params.sentBy,
    sentByRole: params.sentByRole,
    sentAt: new Date().toISOString(),
    status: "Sent",
  };

  store.emailLogs = [entry, ...store.emailLogs];

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: entry.sentAt,
    actorName: params.sentBy,
    actorRole: params.sentByRole,
    category: "Email",
    action:
      params.type === "Bulk"
        ? `Sent Bulk Email (${entry.recipientCount} recipients)`
        : `Sent Individual Email`,
    details: `Subject: "${entry.subject}" · Recipients: ${entry.recipientSummary}${
      params.includePayslipSummary ? " · Included payslip summary" : ""
    }`,
  });

  notify();
  return entry;
}

// --- Leave Applications & Live Payroll Impact ---
export const LEAVE_ENTITLEMENTS = {
  annualDays: 15, // 15 working days / year (Paid)
  sickDays: 12, // 12 days / year (Paid)
  maternityDays: 60, // 3 months (~60 working days) / year (Paid)
};

export function isLeaveTypePaid(leaveType: LeaveType): boolean {
  return leaveType !== "Casual Leave";
}

export function getLeaveRequests(employeeId?: string): LeaveRequest[] {
  if (!employeeId) return store.leaveRequests;
  return store.leaveRequests.filter((r) => r.employeeId === employeeId);
}

export function getEmployeeLeaveBalances(employeeId: string): EmployeeLeaveBalances {
  const approved = store.leaveRequests.filter(
    (r) => r.employeeId === employeeId && r.status === "Approved"
  );
  const sumByType = (t: LeaveType) =>
    approved
      .filter((r) => r.leaveType === t)
      .reduce((acc, r) => acc + r.durationDays, 0);

  const annualUsedDays = sumByType("Annual Leave");
  const sickUsedDays = sumByType("Sick Leave");
  const maternityUsedDays = sumByType("Maternity Leave");
  const casualUsedDays = sumByType("Casual Leave");
  const workInjuryUsedDays = sumByType("Work Injury Leave");

  return {
    annualEntitlementDays: LEAVE_ENTITLEMENTS.annualDays,
    annualUsedDays,
    annualRemainingDays: Math.max(0, LEAVE_ENTITLEMENTS.annualDays - annualUsedDays),
    sickEntitlementDays: LEAVE_ENTITLEMENTS.sickDays,
    sickUsedDays,
    sickRemainingDays: Math.max(0, LEAVE_ENTITLEMENTS.sickDays - sickUsedDays),
    maternityEntitlementDays: LEAVE_ENTITLEMENTS.maternityDays,
    maternityUsedDays,
    maternityRemainingDays: Math.max(
      0,
      LEAVE_ENTITLEMENTS.maternityDays - maternityUsedDays
    ),
    casualUsedDays,
    workInjuryUsedDays,
  };
}

export function submitLeaveRequest(params: {
  employeeId: string;
  leaveType: LeaveType;
  applicationMode: "All day" | "Half day";
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
  attachmentName?: string;
  actorRole: Role;
}): { ok: boolean; request?: LeaveRequest; error?: string } {
  const emp = store.employees.find((e) => e.id === params.employeeId);
  if (!emp) {
    return { ok: false, error: "Employee profile not found." };
  }
  if (params.durationDays <= 0) {
    return { ok: false, error: "Leave duration must be greater than 0 days." };
  }

  const balances = getEmployeeLeaveBalances(emp.id);
  if (
    params.leaveType === "Annual Leave" &&
    params.durationDays > balances.annualRemainingDays
  ) {
    return {
      ok: false,
      error: `Requested ${params.durationDays} day(s) exceeds your remaining Annual Leave balance of ${balances.annualRemainingDays} day(s).`,
    };
  }
  if (
    params.leaveType === "Sick Leave" &&
    params.durationDays > balances.sickRemainingDays
  ) {
    return {
      ok: false,
      error: `Requested ${params.durationDays} day(s) exceeds your remaining Sick Leave balance of ${balances.sickRemainingDays} day(s).`,
    };
  }
  if (
    params.leaveType === "Maternity Leave" &&
    params.durationDays > balances.maternityRemainingDays
  ) {
    return {
      ok: false,
      error: `Requested ${params.durationDays} day(s) exceeds your remaining Maternity Leave balance of ${balances.maternityRemainingDays} day(s).`,
    };
  }

  const request: LeaveRequest = {
    id: `lv-${Date.now()}`,
    employeeId: emp.id,
    staffId: emp.staffId,
    employeeName: emp.fullName,
    department: emp.department,
    leaveType: params.leaveType,
    applicationMode: params.applicationMode,
    startDate: params.startDate,
    endDate: params.endDate,
    durationDays: params.durationDays,
    reason: params.reason.trim(),
    attachmentName: params.attachmentName || undefined,
    isPaid: isLeaveTypePaid(params.leaveType),
    status: "Pending",
    submittedAt: new Date().toISOString(),
  };

  store.leaveRequests = [request, ...store.leaveRequests];

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: request.submittedAt,
    actorName: emp.fullName,
    actorRole: params.actorRole,
    category: "Leave",
    action: `Submitted ${request.leaveType} Request`,
    details: `${emp.fullName} (${emp.staffId}) requested ${request.durationDays} day(s) of ${request.leaveType} (${request.startDate} to ${request.endDate}) — ${
      request.isPaid ? "Paid Leave" : "Unpaid Leave"
    }.`,
  });

  notify();
  return { ok: true, request };
}

export function reviewLeaveRequest(params: {
  requestId: string;
  decision: "Approved" | "Rejected";
  reviewerName: string;
  reviewerRole: Role;
  comment?: string;
}): {
  ok: boolean;
  request?: LeaveRequest;
  updatedPayrollRecord?: PayrollRecord;
  error?: string;
} {
  const idx = store.leaveRequests.findIndex((r) => r.id === params.requestId);
  if (idx === -1) return { ok: false, error: "Leave request not found." };

  const existing = store.leaveRequests[idx];
  if (existing.status !== "Pending") {
    return { ok: false, error: "This leave request has already been reviewed." };
  }

  const reviewed: LeaveRequest = {
    ...existing,
    status: params.decision,
    reviewedBy: params.reviewerName,
    reviewedByRole: params.reviewerRole,
    reviewedAt: new Date().toISOString(),
    reviewComment: params.comment?.trim() || undefined,
  };

  store.leaveRequests = store.leaveRequests.map((r, i) =>
    i === idx ? reviewed : r
  );

  let updatedPayrollRecord: PayrollRecord | undefined;

  // When approved, immediately apply leave days to the active Nov 2026 payroll run
  // using Sunda Ghana's exact Excel formulas!
  if (params.decision === "Approved") {
    const runId = "run-2026-11";
    const records = store.recordsByRun[runId];
    const run = store.runs.find((r) => r.id === runId);
    const emp = store.employees.find((e) => e.id === reviewed.employeeId);

    if (records && emp) {
      const recIdx = records.findIndex((r) => r.employeeId === reviewed.employeeId);
      if (recIdx !== -1) {
        const rec = records[recIdx];
        const casualLeaveDays =
          (rec.casualLeaveDays ?? 0) +
          (reviewed.leaveType === "Casual Leave" ? reviewed.durationDays : 0);
        const absentDays = rec.absentDays ?? 0;
        const sickLeaveDays =
          (rec.sickLeaveDays ?? 0) +
          (reviewed.leaveType === "Sick Leave" ? reviewed.durationDays : 0);
        const annualLeaveDays =
          (rec.annualLeaveDays ?? 0) +
          (reviewed.leaveType === "Annual Leave" ? reviewed.durationDays : 0);
        const maternityLeaveDays =
          (rec.maternityLeaveDays ?? 0) +
          (reviewed.leaveType === "Maternity Leave" ? reviewed.durationDays : 0);
        const workInjuryLeaveDays =
          (rec.workInjuryLeaveDays ?? 0) +
          (reviewed.leaveType === "Work Injury Leave" ? reviewed.durationDays : 0);

        const isExcelRow =
          rec.staffId === "100001" ||
          rec.staffId === "100002" ||
          rec.staffId === "100003";

        const recalc = calculateSundaExcelPayroll({
          basicSalaryPesewas: emp.basicSalaryPesewas,
          positionStdPesewas:
            rec.positionStdPesewas ?? emp.positionStdPesewas ?? emp.transportAllowancePesewas,
          performanceStdPesewas:
            rec.performanceStdPesewas ?? emp.performanceStdPesewas ?? emp.housingAllowancePesewas,
          seniorityLevel: rec.seniorityLevel ?? emp.seniorityLevel ?? "Seniors",
          shouldWorkingDays: rec.daysExpected || 20,
          casualLeaveDays,
          absentDays,
          sickLeaveDays,
          annualLeaveDays,
          maternityLeaveDays,
          workInjuryLeaveDays,
          coefficientScore: rec.coefficientScore ?? 1.0,
          otherIncomePesewas: rec.otherIncomePesewas ?? 0,
          otherDeductionBeforeTaxPesewas: rec.otherDeductionBeforeTaxPesewas ?? 0,
          fullAttendanceBonusPesewas: rec.fullAttendanceBonusPesewas ?? 0,
          lunchAllowancePesewas: rec.lunchAllowancePesewas ?? 0,
          workdayOtHours: rec.workdayOtHours ?? 0,
          saturdayOtHours: rec.saturdayOtHours ?? 0,
          sundayOtHours: rec.sundayOtHours ?? 0,
          holidayOtHours: rec.holidayOtHours ?? 0,
          ewaRecoveryPesewas: rec.ewaRecoveryPesewas,
          useExcelPayeBands: isExcelRow,
          rules: store.rules,
          periodMonth: run?.periodMonth ?? "2026-11",
        });

        updatedPayrollRecord = {
          ...rec,
          daysExpected: recalc.daysExpected,
          daysAttended: recalc.daysAttended,
          daysPaid: recalc.daysPaid,
          casualLeaveDays: recalc.casualLeaveDays,
          absentDays: recalc.absentDays,
          sickLeaveDays: recalc.sickLeaveDays,
          annualLeaveDays: recalc.annualLeaveDays,
          maternityLeaveDays: recalc.maternityLeaveDays,
          workInjuryLeaveDays: recalc.workInjuryLeaveDays,
          positionEarnedPesewas: recalc.positionEarnedPesewas,
          performanceEarnedPesewas: recalc.performanceEarnedPesewas,
          totalBonusPesewas: recalc.totalBonusPesewas,
          bonusTaxBasePesewas: recalc.bonusTaxBasePesewas,
          bonusTaxPesewas: recalc.bonusTaxPesewas,
          otTaxBasePesewas: recalc.otTaxBasePesewas,
          otTaxPesewas: recalc.otTaxPesewas,
          cashAllowancePesewas: recalc.cashAllowancePesewas,
          excessBonusPesewas: recalc.excessBonusPesewas,
          payeBasePesewas: recalc.payeBasePesewas,
          totalGraTaxPesewas: recalc.totalGraTaxPesewas,
          nssfEmployer13Pesewas: recalc.nssfEmployer13Pesewas,
          tier1SsnitPesewas: recalc.tier1SsnitPesewas,
          tier2PetraPesewas: recalc.tier2PetraPesewas,
          hrCostPesewas: recalc.hrCostPesewas,
          basicSalaryPesewas: recalc.basicSalaryPesewas,
          allowancesPesewas: recalc.allowancesPesewas,
          overtimePayPesewas: recalc.overtimePayPesewas,
          grossPayPesewas: recalc.grossPayPesewas,
          ssnitEmployeePesewas: recalc.ssnitEmployeePesewas,
          ssnitEmployerPesewas: recalc.ssnitEmployerPesewas,
          chargeableIncomePesewas: recalc.chargeableIncomePesewas,
          payePesewas: recalc.payePesewas,
          totalDeductionsPesewas: recalc.totalDeductionsPesewas,
          netPayPesewas: recalc.netPayPesewas,
        };

        const updatedRecords = records.map((r, i) =>
          i === recIdx ? updatedPayrollRecord! : r
        );
        store.recordsByRun[runId] = updatedRecords;

        if (run) {
          run.totalBasicPesewas = updatedRecords.reduce(
            (s, r) => s + r.basicSalaryPesewas,
            0
          );
          run.totalAllowancesPesewas = updatedRecords.reduce(
            (s, r) => s + r.allowancesPesewas,
            0
          );
          run.totalOvertimePesewas = updatedRecords.reduce(
            (s, r) => s + r.overtimePayPesewas,
            0
          );
          run.totalGrossPesewas = updatedRecords.reduce(
            (s, r) => s + r.grossPayPesewas,
            0
          );
          run.totalSsnitEmployeePesewas = updatedRecords.reduce(
            (s, r) => s + r.ssnitEmployeePesewas,
            0
          );
          run.totalSsnitEmployerPesewas = updatedRecords.reduce(
            (s, r) => s + r.ssnitEmployerPesewas,
            0
          );
          run.totalPayePesewas = updatedRecords.reduce(
            (s, r) => s + r.payePesewas,
            0
          );
          run.totalStatutoryPesewas =
            run.totalSsnitEmployeePesewas + run.totalPayePesewas;
          run.totalNetPesewas = updatedRecords.reduce(
            (s, r) => s + r.netPayPesewas,
            0
          );
          run.totalPayrollCostPesewas =
            run.totalGrossPesewas + run.totalSsnitEmployerPesewas;
        }
      }
    }
  }

  store.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: reviewed.reviewedAt!,
    actorName: params.reviewerName,
    actorRole: params.reviewerRole,
    category: "Leave",
    action: `${params.decision} ${reviewed.leaveType} Request`,
    details: `${params.decision} ${reviewed.durationDays} day(s) of ${reviewed.leaveType} for ${reviewed.employeeName} (${reviewed.staffId}).${
      updatedPayrollRecord
        ? ` Nov 2026 payroll recalculated: Actual ${updatedPayrollRecord.daysAttended}/${updatedPayrollRecord.daysExpected} days, Paid ${updatedPayrollRecord.daysPaid} days, Net Pay GHS ${(
            updatedPayrollRecord.netPayPesewas / 100
          ).toFixed(2)}.`
        : ""
    }`,
  });

  notify();
  return { ok: true, request: reviewed, updatedPayrollRecord };
}

// --- Audit Trail & Department Overtime ---
export function getAuditTrail(): AuditEntry[] {
  return store.auditTrail;
}

export { getOvertimeByDepartment, calculateStatutoryAndNet };
