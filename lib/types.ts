import { Role } from "./roles";
export type { Role };

export type Department =
  | "Manufacturing & Assembly"
  | "Logistics & Warehouse"
  | "Sales & Distribution"
  | "Finance & Accounting"
  | "HR & Corporate Admin";

export type EmployeeStatus = "Active" | "Inactive" | "Terminated";
export type EmploymentType = "Permanent" | "Contract";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId: string;
  department: Department;
  avatarInitials: string;
}

export interface Employee {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  department: Department;
  jobTitle: string;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  seniorityLevel?: "Seniors" | "Juniors";
  joinDate: string; // ISO date
  basicSalaryPesewas: number; // Basic Wage STD (integer pesewas)
  positionStdPesewas?: number; // Position STD
  performanceStdPesewas?: number; // Performance STD
  transportAllowancePesewas: number;
  housingAllowancePesewas: number;
  bankName: string;
  bankAccountNumber: string; // e.g. "014029384821"
  ssnitNumber: string;
  ghanaCardNumber: string;
}

export type AttendanceStatus = "Present" | "Late" | "Absent" | "Half Day";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // "07:56"
  clockOut: string | null; // "17:04"
  hoursWorked: number;
  overtimeHours: number;
  status: AttendanceStatus;
  syncStatus: "Synced" | "Pending";
}

export type PayrollRunStatus = "Draft" | "Pending approval" | "Approved" | "Paid";

export interface StatutoryDeduction {
  id: string;
  payrollRecordId: string;
  employeeId: string;
  period: string; // e.g., "Nov 2026"
  basicSalaryPesewas: number;
  ssnitEmployeePesewas: number; // 5.5% of basic
  ssnitEmployerPesewas: number; // 13.5% of basic (not deducted from net)
  chargeableIncomePesewas: number;
  payePesewas: number;
  totalEmployeeStatutoryPesewas: number; // ssnitEmployee + paye
}

export interface PayrollRecord {
  id: string;
  runId: string;
  employeeId: string;
  staffId: string;
  employeeName: string;
  department: Department;
  jobTitle: string;
  employeeStatus: EmployeeStatus;
  daysExpected: number; // Should Working Days (default 20)
  daysAttended: number; // Actual working days
  daysPaid: number; // Paid days
  overtimeHours: number; // Total OT Hours (Workday + Saturday + Sunday + Holiday)
  workdayOtHours?: number;
  saturdayOtHours?: number;
  sundayOtHours?: number;
  holidayOtHours?: number;
  workdayOtPayPesewas?: number;
  saturdayOtPayPesewas?: number;
  sundayOtPayPesewas?: number;
  holidayOtPayPesewas?: number;
  dailyWageStdPesewas?: number;
  hourlyWageStdPesewas?: number;
  positionStdPesewas?: number;
  performanceStdPesewas?: number;
  totalGrossStdPesewas?: number;
  coefficientScore?: number;
  positionEarnedPesewas?: number;
  performanceEarnedPesewas?: number;
  otherIncomePesewas?: number;
  otherDeductionBeforeTaxPesewas?: number;
  fullAttendanceBonusPesewas?: number;
  lunchAllowancePesewas?: number;
  totalBonusPesewas?: number;
  bonusTaxBasePesewas?: number;
  bonusTaxPesewas?: number;
  otTaxBasePesewas?: number;
  otTaxPesewas?: number;
  cashAllowancePesewas?: number;
  excessBonusPesewas?: number;
  payeBasePesewas?: number;
  totalGraTaxPesewas?: number;
  nssfEmployer13Pesewas?: number;
  tier1SsnitPesewas?: number;
  tier2PetraPesewas?: number;
  hrCostPesewas?: number;
  seniorityLevel?: "Seniors" | "Juniors";
  basicSalaryPesewas: number;
  allowancesPesewas: number;
  overtimePayPesewas: number;
  grossPayPesewas: number;
  ssnitEmployeePesewas: number;
  ssnitEmployerPesewas: number;
  chargeableIncomePesewas: number;
  payePesewas: number;
  ewaRecoveryPesewas: number;
  totalDeductionsPesewas: number; // ssnitEmployee + totalGraTax + ewaRecovery
  netPayPesewas: number;
  status: "Paid" | "Approved" | "Pending" | "Flagged" | "Draft";
  hasOpenAnomaly: boolean;
  anomalyCount: number;
}

export interface ApprovalStageEntry {
  stageName: Role; // "Supervisor" | "HR/Payroll" | "Finance"
  status: "Approved" | "Pending" | "Rejected" | "Waiting";
  actorName?: string;
  actedAt?: string;
  comment?: string;
}

export interface PayrollRun {
  id: string;
  periodLabel: string; // e.g., "November 2026"
  periodShort: string; // e.g., "Nov 2026"
  periodMonth: string; // "2026-11"
  payDate: string; // "2026-11-28"
  deadlineDate: string; // "2026-11-05"
  status: PayrollRunStatus;
  employeeCount: number;
  totalBasicPesewas: number;
  totalAllowancesPesewas: number;
  totalOvertimePesewas: number;
  totalGrossPesewas: number;
  totalSsnitEmployeePesewas: number;
  totalSsnitEmployerPesewas: number;
  totalPayePesewas: number;
  totalStatutoryPesewas: number; // ssnitEmployee + paye
  totalOtherDeductionBeforeTaxPesewas?: number;
  totalEwaRecoveryPesewas: number;
  totalNetPesewas: number;
  totalPayrollCostPesewas: number; // gross + ssnitEmployer
  flaggedCount: number;
  currentApprovalStage: Role | "Completed";
  approvalStages: ApprovalStageEntry[];
  createdBy: string;
  createdAt: string;
}

export type AnomalyRuleId =
  | "duplicate_account"
  | "inconsistent_record"
  | "abnormal_overtime"
  | "attendance_mismatch"
  | "inactive_employee_paid";

export type AnomalyResolutionStatus =
  | "Needs review"
  | "Corrected"
  | "Confirmed legitimate";

export interface AnomalyRecord {
  id: string;
  runId: string;
  periodShort: string;
  payrollRecordId: string;
  employeeId: string;
  staffId: string;
  employeeName: string;
  department: Department;
  ruleId: AnomalyRuleId;
  ruleName: string;
  severity: "High" | "Medium";
  evidence: string;
  amountInvolvedPesewas: number;
  status: AnomalyResolutionStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  detectedAt: string;
}

export type EwaRequestStatus = "Approved" | "Recovered" | "Pending" | "Declined";

export interface EwaRequest {
  id: string;
  employeeId: string;
  staffId: string;
  employeeName: string;
  department: Department;
  periodShort: string;
  requestedAt: string;
  earnedToDatePesewas: number;
  availableLimitPesewas: number;
  amountRequestedPesewas: number;
  status: EwaRequestStatus;
  declineReason?: string;
}

export interface PayeBand {
  label: string;
  bandWidthCedis: number | null; // null for "Exceeding"
  ratePercent: number;
  upperLimitCedis: number | null;
}

export interface PayeSchedule {
  id: string;
  name: string;
  effectiveFrom: string; // "2026-09-01"
  actReference: string;
  bands: PayeBand[];
}

export interface SystemRules {
  approvalSequence: Role[]; // Default: ["Supervisor", "HR/Payroll", "Finance"]
  ssnitEmployeeRatePercent: number; // 5.5
  ssnitEmployerRatePercent: number; // 13.5
  activePayeScheduleId: string;
  payeSchedules: PayeSchedule[];
  ewaMaxPercentage: number; // 50
  ewaPerRequestCapPesewas: number; // 100000 (GHS 1,000.00)
  ewaRequireActivePermanent: boolean;
  ewaRequireNoOpenAnomaly: boolean;
  anomalyRules: {
    duplicate_account: {
      enabled: boolean;
      name: string;
      description: string;
    };
    inconsistent_record: {
      enabled: boolean;
      name: string;
      description: string;
      checkedFields: string[];
    };
    abnormal_overtime: {
      enabled: boolean;
      name: string;
      description: string;
      maxHoursPerPeriod: number;
    };
    attendance_mismatch: {
      enabled: boolean;
      name: string;
      description: string;
      toleranceDays: number;
    };
    inactive_employee_paid: {
      enabled: boolean;
      name: string;
      description: string;
    };
  };
}

export interface EmailLogEntry {
  id: string;
  type: "Bulk" | "Individual";
  subject: string;
  body: string;
  recipientSummary: string;
  recipientCount: number;
  recipientEmails: string[];
  departmentFilter?: string;
  includePayslipSummary?: boolean;
  sentBy: string;
  sentByRole: Role;
  sentAt: string;
  status: "Sent";
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: Role;
  category: "Payroll" | "Anomaly" | "Approval" | "Settings" | "EWA" | "Auth" | "Email";
  action: string;
  details: string;
}
