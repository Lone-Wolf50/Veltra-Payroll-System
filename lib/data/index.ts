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
import { INITIAL_SYSTEM_RULES, calculateStatutoryAndNet } from "../mock/rules";

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
  connectionState: ConnectionState;
  pendingSyncCount: number;
}

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

// --- Audit Trail & Department Overtime ---
export function getAuditTrail(): AuditEntry[] {
  return store.auditTrail;
}

export { getOvertimeByDepartment, calculateStatutoryAndNet };
