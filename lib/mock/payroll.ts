import {
  Employee,
  PayrollRun,
  PayrollRecord,
  AnomalyRecord,
  EwaRequest,
  AttendanceRecord,
  AuditEntry,
  Department,
} from "../types";
import { INITIAL_EMPLOYEES } from "./employees";
import {
  INITIAL_SYSTEM_RULES,
  calculateStatutoryAndNet,
  calculateSundaExcelPayroll,
} from "./rules";

/**
 * Generates 6 months of payroll runs (Jun 2026 to Nov 2026) so the cost chart
 * has a real 6-month trend, with runs in Draft, Pending approval, Approved, and Paid statuses.
 * Also seeds 10 anomaly records covering all 5 rules, and a run with a deadline in 2 days (05 Nov 2026).
 */
export function buildInitialPayrollData(employees: Employee[] = INITIAL_EMPLOYEES) {
  const periods = [
    {
      id: "run-2026-06",
      periodLabel: "June 2026",
      periodShort: "Jun 2026",
      periodMonth: "2026-06",
      payDate: "2026-06-27",
      deadlineDate: "2026-06-25",
      status: "Paid" as const,
      overtimeMultiplier: 0.85,
      createdAt: "2026-06-20T09:15:00Z",
    },
    {
      id: "run-2026-07",
      periodLabel: "July 2026",
      periodShort: "Jul 2026",
      periodMonth: "2026-07",
      payDate: "2026-07-28",
      deadlineDate: "2026-07-25",
      status: "Paid" as const,
      overtimeMultiplier: 0.92,
      createdAt: "2026-07-20T10:00:00Z",
    },
    {
      id: "run-2026-08",
      periodLabel: "August 2026",
      periodShort: "Aug 2026",
      periodMonth: "2026-08",
      payDate: "2026-08-28",
      deadlineDate: "2026-08-25",
      status: "Paid" as const,
      overtimeMultiplier: 1.0,
      createdAt: "2026-08-21T08:45:00Z",
    },
    {
      id: "run-2026-09",
      periodLabel: "September 2026",
      periodShort: "Sep 2026",
      periodMonth: "2026-09",
      payDate: "2026-09-28",
      deadlineDate: "2026-09-25",
      status: "Paid" as const,
      overtimeMultiplier: 1.08,
      createdAt: "2026-09-20T11:20:00Z",
    },
    {
      id: "run-2026-10",
      periodLabel: "October 2026",
      periodShort: "Oct 2026",
      periodMonth: "2026-10",
      payDate: "2026-10-28",
      deadlineDate: "2026-10-25",
      status: "Approved" as const,
      overtimeMultiplier: 1.12,
      createdAt: "2026-10-21T09:30:00Z",
    },
    {
      id: "run-2026-11",
      periodLabel: "November 2026",
      periodShort: "Nov 2026",
      periodMonth: "2026-11",
      payDate: "2026-11-27",
      deadlineDate: "2026-11-05", // 2 days from 03 Nov 2026 -> triggers near-deadline banner!
      status: "Pending approval" as const,
      overtimeMultiplier: 1.18,
      createdAt: "2026-11-01T08:30:00Z",
    },
    {
      id: "run-2026-11-supp",
      periodLabel: "November 2026 (Mid-Month Shift Adjustment)",
      periodShort: "Nov 2026 (Draft)",
      periodMonth: "2026-11",
      payDate: "2026-11-30",
      deadlineDate: "2026-11-18",
      status: "Draft" as const,
      overtimeMultiplier: 0.4,
      createdAt: "2026-11-03T07:50:00Z",
    },
  ];

  // Seeded anomaly employees in Nov 2026 run (10 flagged records covering all 5 rules)
  const anomalyConfigs: Record<
    number,
    {
      ruleId: AnomalyRecord["ruleId"];
      ruleName: string;
      severity: "High" | "Medium";
      evidence: string;
      overtimeHoursOverride?: number;
      daysAttendedOverride?: number;
      daysPaidOverride?: number;
    }
  > = {
    10: {
      ruleId: "duplicate_account",
      ruleName: "Duplicate account",
      severity: "High",
      evidence: "Bank account ****8877 (Ecobank Ghana) is shared with SGL-1014 (Afia Opoku).",
    },
    14: {
      ruleId: "duplicate_account",
      ruleName: "Duplicate account",
      severity: "High",
      evidence: "Bank account ****8877 (Ecobank Ghana) is shared with SGL-1010 (Adwoa Frimpong).",
    },
    9: {
      ruleId: "inconsistent_record",
      ruleName: "Inconsistent record",
      severity: "Medium",
      evidence: "Mandatory SSNIT contributor number is missing on employee master record.",
    },
    21: {
      ruleId: "inconsistent_record",
      ruleName: "Inconsistent record",
      severity: "Medium",
      evidence: "Ghana Card identification number conflicts with SSNIT biometric registry.",
    },
    13: {
      ruleId: "abnormal_overtime",
      ruleName: "Abnormal overtime",
      severity: "High",
      evidence: "58.0 overtime hours logged in period (exceeds 40 hr department threshold by 18 hrs).",
      overtimeHoursOverride: 58,
    },
    15: {
      ruleId: "abnormal_overtime",
      ruleName: "Abnormal overtime",
      severity: "Medium",
      evidence: "49.5 overtime hours logged in period (exceeds 40 hr department threshold by 9.5 hrs).",
      overtimeHoursOverride: 49.5,
    },
    11: {
      ruleId: "attendance_mismatch",
      ruleName: "Attendance mismatch",
      severity: "High",
      evidence: "20 days paid in payroll calculation vs 15 biometric clock-in days recorded (5-day variance).",
      daysAttendedOverride: 15,
      daysPaidOverride: 20,
    },
    19: {
      ruleId: "attendance_mismatch",
      ruleName: "Attendance mismatch",
      severity: "Medium",
      evidence: "20 days paid in payroll calculation vs 17 biometric clock-in days recorded (3-day variance).",
      daysAttendedOverride: 17,
      daysPaidOverride: 20,
    },
    12: {
      ruleId: "inactive_employee_paid",
      ruleName: "Inactive employee paid",
      severity: "High",
      evidence: "Employee status is marked Inactive (Unpaid Leave since 14 Oct 2026) but full basic pay was generated.",
    },
    18: {
      ruleId: "inactive_employee_paid",
      ruleName: "Inactive employee paid",
      severity: "High",
      evidence: "Employee status is marked Terminated (Exit date 28 Sep 2026) but included in active run.",
    },
  };

  const runs: PayrollRun[] = [];
  const recordsByRun: Record<string, PayrollRecord[]> = {};
  const anomalies: AnomalyRecord[] = [];

  for (const p of periods) {
    const isMainNov = p.id === "run-2026-11";
    const isSuppDraft = p.id === "run-2026-11-supp";
    const runEmployees = isSuppDraft ? employees.slice(0, 18) : employees;

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

    const runRecords: PayrollRecord[] = [];

    runEmployees.forEach((emp, idx) => {
      const empNum = idx + 1;
      const anomalySpec = isMainNov ? anomalyConfigs[empNum] : undefined;

      // Exact Sunda Ghana Excel Formula Sheet rows for 100001 (Jane Doe), 100002 (John Doe), 100003 (Ama Kwabena)
      const excelRowSpecs: Record<
        string,
        {
          shouldWorkingDays: number;
          actualWorkingDays: number;
          paidDays: number;
          coefficientScore: number;
          otherIncomePesewas: number;
          fullAttendanceBonusPesewas: number;
          lunchAllowancePesewas: number;
          workdayOtHours: number;
          saturdayOtHours: number;
          sundayOtHours: number;
          holidayOtHours: number;
        }
      > = {
        "100001": {
          shouldWorkingDays: 20,
          actualWorkingDays: 20,
          paidDays: 20,
          coefficientScore: 1.5,
          otherIncomePesewas: 152120, // GHS 1,521.20 (Leave pay 320 + Key Pos 150 + Prod Inc 600 + Overprod 451.20)
          fullAttendanceBonusPesewas: 20000, // GHS 200.00
          lunchAllowancePesewas: 10000, // GHS 100.00
          workdayOtHours: 80,
          saturdayOtHours: 51,
          sundayOtHours: 41,
          holidayOtHours: 0,
        },
        "100002": {
          shouldWorkingDays: 20,
          actualWorkingDays: 19,
          paidDays: 20,
          coefficientScore: 1.0,
          otherIncomePesewas: 34500, // GHS 345.00 (Leave pay 345)
          fullAttendanceBonusPesewas: 10000, // GHS 100.00
          lunchAllowancePesewas: 15000, // GHS 150.00
          workdayOtHours: 81,
          saturdayOtHours: 32,
          sundayOtHours: 31.5,
          holidayOtHours: 0,
        },
        "100003": {
          shouldWorkingDays: 20,
          actualWorkingDays: 20,
          paidDays: 20,
          coefficientScore: 2.0,
          otherIncomePesewas: 21200, // GHS 212.00 (Leave pay 162 + Key Pos 50)
          fullAttendanceBonusPesewas: 16000, // GHS 160.00
          lunchAllowancePesewas: 12000, // GHS 120.00
          workdayOtHours: 78.5,
          saturdayOtHours: 51,
          sundayOtHours: 40,
          holidayOtHours: 0,
        },
      };

      const excelSpec = excelRowSpecs[emp.staffId];

      // Calculate overtime hours
      let overtimeHours = 0;
      if (excelSpec) {
        overtimeHours =
          excelSpec.workdayOtHours +
          excelSpec.saturdayOtHours +
          excelSpec.sundayOtHours +
          excelSpec.holidayOtHours;
      } else if (empNum === 1) {
        // Keep emp-001 (Akua Mensah) exact to PRD Section 8 test case: GHS 5,000 basic, 0 allowances, 0 overtime
        overtimeHours = 0;
      } else if (anomalySpec?.overtimeHoursOverride !== undefined) {
        overtimeHours = anomalySpec.overtimeHoursOverride;
      } else if (
        emp.department === "Manufacturing & Assembly" ||
        emp.department === "Logistics & Warehouse"
      ) {
        overtimeHours = Math.round(((empNum * 5) % 24) * p.overtimeMultiplier);
      } else {
        overtimeHours = Math.round(((empNum * 3) % 10) * p.overtimeMultiplier);
      }

      const ewaRecoveryPesewas =
        isMainNov && (empNum === 2 || empNum === 16) ? 45000 : 0; // GHS 450 recovery

      let calc: ReturnType<typeof calculateSundaExcelPayroll>;

      if (excelSpec) {
        calc = calculateSundaExcelPayroll({
          basicSalaryPesewas: emp.basicSalaryPesewas,
          positionStdPesewas: 0,
          performanceStdPesewas: 0,
          seniorityLevel: emp.seniorityLevel ?? "Seniors",
          shouldWorkingDays: excelSpec.shouldWorkingDays,
          actualWorkingDays: excelSpec.actualWorkingDays,
          paidDays: excelSpec.paidDays,
          coefficientScore: 1.0,
          otherIncomePesewas: excelSpec.otherIncomePesewas,
          fullAttendanceBonusPesewas: excelSpec.fullAttendanceBonusPesewas,
          lunchAllowancePesewas: excelSpec.lunchAllowancePesewas,
          workdayOtHours: excelSpec.workdayOtHours,
          saturdayOtHours: excelSpec.saturdayOtHours,
          sundayOtHours: excelSpec.sundayOtHours,
          holidayOtHours: excelSpec.holidayOtHours,
          ewaRecoveryPesewas: 0,
          useExcelPayeBands: true,
          rules: INITIAL_SYSTEM_RULES,
          periodMonth: p.periodMonth,
        });
      } else if (empNum === 1) {
        const stdCalc = calculateStatutoryAndNet({
          basicSalaryPesewas: emp.basicSalaryPesewas,
          allowancesPesewas: 0,
          overtimePayPesewas: 0,
          ewaRecoveryPesewas: 0,
          rules: INITIAL_SYSTEM_RULES,
          periodMonth: p.periodMonth,
        });
        calc = {
          ...stdCalc,
          seniorityLevel: "Seniors",
          dailyWageStdPesewas: Math.round(emp.basicSalaryPesewas / 20),
          hourlyWageStdPesewas: Math.round(emp.basicSalaryPesewas / 160),
          positionStdPesewas: 0,
          performanceStdPesewas: 0,
          totalGrossStdPesewas: emp.basicSalaryPesewas,
          coefficientScore: 1.0,
          positionEarnedPesewas: 0,
          performanceEarnedPesewas: 0,
          otherIncomePesewas: 0,
          fullAttendanceBonusPesewas: 0,
          lunchAllowancePesewas: 0,
          totalBonusPesewas: 0,
          workdayOtHours: 0,
          saturdayOtHours: 0,
          sundayOtHours: 0,
          holidayOtHours: 0,
          workdayOtPayPesewas: 0,
          saturdayOtPayPesewas: 0,
          sundayOtPayPesewas: 0,
          holidayOtPayPesewas: 0,
          bonusTaxBasePesewas: 0,
          bonusTaxPesewas: 0,
          otTaxBasePesewas: 0,
          otTaxPesewas: 0,
          cashAllowancePesewas: 0,
          excessBonusPesewas: 0,
          payeBasePesewas: stdCalc.chargeableIncomePesewas,
          totalGraTaxPesewas: stdCalc.payePesewas,
          nssfEmployer13Pesewas: Math.round(emp.basicSalaryPesewas * 0.13),
          tier1SsnitPesewas: Math.round(emp.basicSalaryPesewas * 0.135),
          tier2PetraPesewas: Math.round(emp.basicSalaryPesewas * 0.05),
          hrCostPesewas:
            stdCalc.grossPayPesewas + Math.round(emp.basicSalaryPesewas * 0.13),
        };
      } else {
        const wdHours = Math.round(overtimeHours * 0.55);
        const satHours = Math.round(overtimeHours * 0.25);
        const sunHours = Math.max(0, overtimeHours - wdHours - satHours);
        calc = calculateSundaExcelPayroll({
          basicSalaryPesewas: emp.basicSalaryPesewas,
          positionStdPesewas: 0,
          performanceStdPesewas: 0,
          seniorityLevel: emp.basicSalaryPesewas <= 350000 ? "Juniors" : "Seniors",
          shouldWorkingDays: 20,
          actualWorkingDays: anomalySpec?.daysAttendedOverride ?? 20,
          paidDays: anomalySpec?.daysPaidOverride ?? 20,
          coefficientScore: 1.0,
          otherIncomePesewas: emp.transportAllowancePesewas + emp.housingAllowancePesewas,
          fullAttendanceBonusPesewas: 10000,
          lunchAllowancePesewas: 10000,
          workdayOtHours: wdHours,
          saturdayOtHours: satHours,
          sundayOtHours: sunHours,
          holidayOtHours: 0,
          ewaRecoveryPesewas,
          useExcelPayeBands: false,
          rules: INITIAL_SYSTEM_RULES,
          periodMonth: p.periodMonth,
        });
      }

      const hasOpenAnomaly = Boolean(anomalySpec);
      if (hasOpenAnomaly) flaggedCount += 1;

      const recStatus: PayrollRecord["status"] = hasOpenAnomaly
        ? "Flagged"
        : p.status === "Paid"
        ? "Paid"
        : p.status === "Approved"
        ? "Approved"
        : p.status === "Draft"
        ? "Draft"
        : "Pending";

      const recordId = `prec-${p.id}-${emp.id}`;

      const record: PayrollRecord = {
        id: recordId,
        runId: p.id,
        employeeId: emp.id,
        staffId: emp.staffId,
        employeeName: emp.fullName,
        department: emp.department,
        jobTitle: emp.jobTitle,
        employeeStatus: emp.status,
        daysExpected: excelSpec?.shouldWorkingDays ?? 20,
        daysAttended:
          excelSpec?.actualWorkingDays ?? anomalySpec?.daysAttendedOverride ?? 20,
        daysPaid: excelSpec?.paidDays ?? anomalySpec?.daysPaidOverride ?? 20,
        overtimeHours,
        workdayOtHours: calc.workdayOtHours,
        saturdayOtHours: calc.saturdayOtHours,
        sundayOtHours: calc.sundayOtHours,
        holidayOtHours: calc.holidayOtHours,
        workdayOtPayPesewas: calc.workdayOtPayPesewas,
        saturdayOtPayPesewas: calc.saturdayOtPayPesewas,
        sundayOtPayPesewas: calc.sundayOtPayPesewas,
        holidayOtPayPesewas: calc.holidayOtPayPesewas,
        dailyWageStdPesewas: calc.dailyWageStdPesewas,
        hourlyWageStdPesewas: calc.hourlyWageStdPesewas,
        positionStdPesewas: calc.positionStdPesewas,
        performanceStdPesewas: calc.performanceStdPesewas,
        totalGrossStdPesewas: calc.totalGrossStdPesewas,
        coefficientScore: calc.coefficientScore,
        positionEarnedPesewas: calc.positionEarnedPesewas,
        performanceEarnedPesewas: calc.performanceEarnedPesewas,
        otherIncomePesewas: calc.otherIncomePesewas,
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
        status: recStatus,
        hasOpenAnomaly,
        anomalyCount: hasOpenAnomaly ? 1 : 0,
      };

      runRecords.push(record);

      if (anomalySpec) {
        anomalies.push({
          id: `anom-${empNum}`,
          runId: p.id,
          periodShort: p.periodShort,
          payrollRecordId: recordId,
          employeeId: emp.id,
          staffId: emp.staffId,
          employeeName: emp.fullName,
          department: emp.department,
          ruleId: anomalySpec.ruleId,
          ruleName: anomalySpec.ruleName,
          severity: anomalySpec.severity,
          evidence: anomalySpec.evidence,
          amountInvolvedPesewas:
            anomalySpec.ruleId === "abnormal_overtime"
              ? calc.overtimePayPesewas
              : calc.netPayPesewas,
          status: "Needs review",
          detectedAt: "2026-11-02T16:10:00Z",
        });
      }

      totalBasicPesewas += calc.basicSalaryPesewas;
      totalAllowancesPesewas += calc.allowancesPesewas;
      totalOvertimePesewas += calc.overtimePayPesewas;
      totalGrossPesewas += calc.grossPayPesewas;
      totalSsnitEmployeePesewas += calc.ssnitEmployeePesewas;
      totalSsnitEmployerPesewas += calc.ssnitEmployerPesewas;
      totalPayePesewas += calc.payePesewas;
      totalEwaRecoveryPesewas += calc.ewaRecoveryPesewas;
      totalNetPesewas += calc.netPayPesewas;
    });

    recordsByRun[p.id] = runRecords;

    const approvalStages: PayrollRun["approvalStages"] =
      p.status === "Paid" || p.status === "Approved"
        ? [
            {
              stageName: "Supervisor",
              status: "Approved",
              actorName: "Kofi Owusu",
              actedAt: `${p.periodMonth}-22T11:15:00Z`,
              comment: "Team attendance and shift logs verified.",
            },
            {
              stageName: "HR/Payroll",
              status: "Approved",
              actorName: "Akua Mensah",
              actedAt: `${p.periodMonth}-23T14:40:00Z`,
              comment: "Statutory GRA PAYE & SSNIT deductions reconciled.",
            },
            {
              stageName: "Finance",
              status: "Approved",
              actorName: "Abena Boateng",
              actedAt: `${p.periodMonth}-24T16:05:00Z`,
              comment: "Treasury funds confirmed and payment batch approved.",
            },
          ]
        : p.status === "Pending approval"
        ? [
            {
              stageName: "Supervisor",
              status: "Approved",
              actorName: "Kofi Owusu",
              actedAt: "2026-11-02T15:20:00Z",
              comment: "Manufacturing & warehouse biometric logs checked.",
            },
            {
              stageName: "HR/Payroll",
              status: "Pending",
            },
            {
              stageName: "Finance",
              status: "Waiting",
            },
          ]
        : [
            { stageName: "Supervisor", status: "Waiting" },
            { stageName: "HR/Payroll", status: "Waiting" },
            { stageName: "Finance", status: "Waiting" },
          ];

    const currentApprovalStage: PayrollRun["currentApprovalStage"] =
      p.status === "Paid" || p.status === "Approved"
        ? "Completed"
        : p.status === "Pending approval"
        ? "HR/Payroll"
        : "Supervisor";

    runs.push({
      id: p.id,
      periodLabel: p.periodLabel,
      periodShort: p.periodShort,
      periodMonth: p.periodMonth,
      payDate: p.payDate,
      deadlineDate: p.deadlineDate,
      status: p.status,
      employeeCount: runEmployees.length,
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
      currentApprovalStage,
      approvalStages,
      createdBy: "Akua Mensah",
      createdAt: p.createdAt,
    });
  }

  return { runs, recordsByRun, anomalies };
}

export const INITIAL_EWA_REQUESTS: EwaRequest[] = [
  {
    id: "ewa-001",
    employeeId: "emp-002",
    staffId: "SGL-1002",
    employeeName: "Kwame Osei",
    department: "Manufacturing & Assembly",
    periodShort: "Nov 2026",
    requestedAt: "2026-11-01T10:15:00Z",
    earnedToDatePesewas: 210000, // GHS 2,100.00
    availableLimitPesewas: 100000, // GHS 1,000.00 cap
    amountRequestedPesewas: 45000, // GHS 450.00
    status: "Approved",
  },
  {
    id: "ewa-002",
    employeeId: "emp-008",
    staffId: "SGL-1008",
    employeeName: "Efua Amoah",
    department: "Sales & Distribution",
    periodShort: "Nov 2026",
    requestedAt: "2026-11-02T09:12:00Z",
    earnedToDatePesewas: 195000,
    availableLimitPesewas: 97500,
    amountRequestedPesewas: 45000,
    status: "Approved",
  },
  {
    id: "ewa-003",
    employeeId: "emp-016",
    staffId: "SGL-1016",
    employeeName: "Yaa Sarpong",
    department: "Logistics & Warehouse",
    periodShort: "Nov 2026",
    requestedAt: "2026-11-02T14:30:00Z",
    earnedToDatePesewas: 240000,
    availableLimitPesewas: 100000,
    amountRequestedPesewas: 45000,
    status: "Approved",
  },
  {
    id: "ewa-004",
    employeeId: "emp-007",
    staffId: "SGL-1007",
    employeeName: "Kojo Appiah",
    department: "Manufacturing & Assembly",
    periodShort: "Nov 2026",
    requestedAt: "2026-11-02T17:45:00Z",
    earnedToDatePesewas: 180000,
    availableLimitPesewas: 0,
    amountRequestedPesewas: 60000,
    status: "Declined",
    declineReason: "Ineligible: Employee has an open anomaly flag (Duplicate account) requiring review.",
  },
  {
    id: "ewa-005",
    employeeId: "emp-010",
    staffId: "SGL-1010",
    employeeName: "Adwoa Frimpong",
    department: "Finance & Accounting",
    periodShort: "Oct 2026",
    requestedAt: "2026-10-16T11:20:00Z",
    earnedToDatePesewas: 280000,
    availableLimitPesewas: 100000,
    amountRequestedPesewas: 80000,
    status: "Recovered",
  },
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: "att-101",
    employeeId: "emp-002",
    employeeName: "Kwame Osei",
    department: "Manufacturing & Assembly",
    date: "2026-11-03",
    clockIn: "07:52",
    clockOut: null,
    hoursWorked: 6.5,
    overtimeHours: 0,
    status: "Present",
    syncStatus: "Synced",
  },
  {
    id: "att-102",
    employeeId: "emp-002",
    employeeName: "Kwame Osei",
    department: "Manufacturing & Assembly",
    date: "2026-11-02",
    clockIn: "07:55",
    clockOut: "17:30",
    hoursWorked: 8.5,
    overtimeHours: 1.5,
    status: "Present",
    syncStatus: "Synced",
  },
  {
    id: "att-103",
    employeeId: "emp-002",
    employeeName: "Kwame Osei",
    department: "Manufacturing & Assembly",
    date: "2026-10-30",
    clockIn: "07:49",
    clockOut: "17:05",
    hoursWorked: 8.0,
    overtimeHours: 1.0,
    status: "Present",
    syncStatus: "Synced",
  },
  {
    id: "att-104",
    employeeId: "emp-002",
    employeeName: "Kwame Osei",
    department: "Manufacturing & Assembly",
    date: "2026-10-29",
    clockIn: "08:18",
    clockOut: "17:10",
    hoursWorked: 8.0,
    overtimeHours: 0,
    status: "Late",
    syncStatus: "Synced",
  },
  {
    id: "att-105",
    employeeId: "emp-003",
    employeeName: "Kofi Owusu",
    department: "Manufacturing & Assembly",
    date: "2026-11-03",
    clockIn: "07:40",
    clockOut: null,
    hoursWorked: 6.7,
    overtimeHours: 0,
    status: "Present",
    syncStatus: "Synced",
  },
];

export const INITIAL_AUDIT_TRAIL: AuditEntry[] = [
  {
    id: "aud-001",
    timestamp: "2026-11-03T08:30:00Z",
    actorName: "Akua Mensah",
    actorRole: "HR/Payroll",
    category: "Payroll",
    action: "Generated November 2026 Payroll Run",
    details: "Calculated statutory deductions (Act 1178 PAYE schedule & 5.5% SSNIT) for 60 employees. 10 records flagged for review.",
  },
  {
    id: "aud-002",
    timestamp: "2026-11-02T17:45:00Z",
    actorName: "Veltra Automated Control",
    actorRole: "Admin",
    category: "EWA",
    action: "EWA Request Declined (SGL-1007)",
    details: "Declined GHS 600.00 simulated advance for Kojo Appiah due to open Duplicate Account anomaly flag.",
  },
  {
    id: "aud-003",
    timestamp: "2026-11-02T15:20:00Z",
    actorName: "Kofi Owusu",
    actorRole: "Supervisor",
    category: "Approval",
    action: "Stage 1 Approval Completed (Nov 2026)",
    details: "Supervisor approved November 2026 payroll run with note: 'Manufacturing & warehouse biometric logs checked.'",
  },
  {
    id: "aud-004",
    timestamp: "2026-10-24T16:05:00Z",
    actorName: "Abena Boateng",
    actorRole: "Finance",
    category: "Approval",
    action: "Final Finance Approval (Oct 2026)",
    details: "Finance approved October 2026 payroll run for disbursement.",
  },
  {
    id: "aud-005",
    timestamp: "2026-09-01T09:00:00Z",
    actorName: "Yaw Asante",
    actorRole: "Admin",
    category: "Settings",
    action: "Updated Statutory PAYE Schedule",
    details: "Activated GRA Monthly PAYE Bands under Income Tax (Amendment) Act, 2026 (Act 1178) effective 01 Sep 2026.",
  },
];

export function getOvertimeByDepartment(): {
  department: Department;
  shortName: string;
  hours: number;
  threshold: number;
}[] {
  return [
    { department: "Manufacturing & Assembly", shortName: "Manufacturing", hours: 48, threshold: 40 },
    { department: "Logistics & Warehouse", shortName: "Logistics", hours: 43, threshold: 40 },
    { department: "Sales & Distribution", shortName: "Sales", hours: 26, threshold: 40 },
    { department: "Finance & Accounting", shortName: "Finance", hours: 19, threshold: 40 },
    { department: "HR & Corporate Admin", shortName: "HR & Admin", hours: 14, threshold: 40 },
  ];
}
