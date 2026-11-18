import { SystemRules, PayeBand } from "../types";

export const INITIAL_SYSTEM_RULES: SystemRules = {
  approvalSequence: ["Supervisor", "HR/Payroll", "Finance"],
  ssnitEmployeeRatePercent: 5.5,
  ssnitEmployerRatePercent: 13.0, // Matches Sunda Excel NSSF ER (13%), with Tier 1 SSNIT 13.5% & Tier 2 PETRA 5% tracked alongside
  activePayeScheduleId: "act-1178-sep-2026",
  payeSchedules: [
    {
      id: "act-1178-sep-2026",
      name: "GRA Monthly PAYE Bands (from 01 Sep 2026)",
      effectiveFrom: "2026-09-01",
      actReference: "Income Tax (Amendment) Act, 2026 (Act 1178)",
      bands: [
        { label: "First", bandWidthCedis: 588.0, ratePercent: 0, upperLimitCedis: 588.0 },
        { label: "Next", bandWidthCedis: 80.0, ratePercent: 5, upperLimitCedis: 668.0 },
        { label: "Next", bandWidthCedis: 100.0, ratePercent: 10, upperLimitCedis: 768.0 },
        { label: "Next", bandWidthCedis: 2900.0, ratePercent: 17.5, upperLimitCedis: 3668.0 },
        { label: "Next", bandWidthCedis: 16000.0, ratePercent: 25, upperLimitCedis: 19668.0 },
        { label: "Next", bandWidthCedis: 30332.0, ratePercent: 30, upperLimitCedis: 50000.0 },
        { label: "Exceeding", bandWidthCedis: null, ratePercent: 35, upperLimitCedis: null },
      ],
    },
    {
      id: "sunda-excel-2026",
      name: "Sunda Ghana Excel Formula Schedule (490 / 110 / 130 / 3,166.67)",
      effectiveFrom: "2026-01-01",
      actReference: "Sunda Ghana Limited Excel Payroll Formula Sheet",
      bands: [
        { label: "First", bandWidthCedis: 490.0, ratePercent: 0, upperLimitCedis: 490.0 },
        { label: "Next", bandWidthCedis: 110.0, ratePercent: 5, upperLimitCedis: 600.0 },
        { label: "Next", bandWidthCedis: 130.0, ratePercent: 10, upperLimitCedis: 730.0 },
        { label: "Next", bandWidthCedis: 3166.67, ratePercent: 17.5, upperLimitCedis: 3896.67 },
        { label: "Next", bandWidthCedis: 16000.0, ratePercent: 25, upperLimitCedis: 19896.67 },
        { label: "Next", bandWidthCedis: 30520.0, ratePercent: 30, upperLimitCedis: 50416.67 },
        { label: "Exceeding", bandWidthCedis: null, ratePercent: 35, upperLimitCedis: null },
      ],
    },
  ],
  ewaMaxPercentage: 50,
  ewaPerRequestCapPesewas: 100000, // GHS 1,000.00
  ewaRequireActivePermanent: true,
  ewaRequireNoOpenAnomaly: true,
  anomalyRules: {
    duplicate_account: {
      enabled: true,
      name: "Duplicate account",
      description: "Two or more employees share the same bank or mobile-money account",
    },
    inconsistent_record: {
      enabled: true,
      name: "Inconsistent record",
      description: "Required employee fields conflict or are missing",
      checkedFields: ["SSNIT Number", "Ghana Card ID", "Bank Account Number", "Basic Salary"],
    },
    abnormal_overtime: {
      enabled: true,
      name: "Abnormal overtime",
      description: "Overtime hours in a period exceed the configured department threshold",
      maxHoursPerPeriod: 40,
    },
    attendance_mismatch: {
      enabled: true,
      name: "Attendance mismatch",
      description: "Days paid differ from biometric days attended beyond tolerance",
      toleranceDays: 1,
    },
    inactive_employee_paid: {
      enabled: true,
      name: "Inactive employee paid",
      description: "Pay is calculated for an employee marked Inactive or Terminated",
    },
  },
};

/**
 * Full Sunda Ghana Excel Payroll Formula Engine:
 *
 * 1. Standards & Rates:
 *    - Total Gross STD = Basic Wage STD + Position STD + Performance STD
 *    - Daily Wage STD = Basic Wage STD / Should Working Days (default 20)
 *    - Hourly Wage STD = Daily Wage STD / 8
 *
 * 2. Earned Wages & Bonus:
 *    - Basic Wage Earned = Basic Wage STD * (Paid Days / Should Working Days)
 *    - Position Earned = Position STD
 *    - Performance Earned = Performance STD * (Coefficient Score / 100)
 *    - Overproduction Allowance = Basic Wage STD * Overproduction Coefficient
 *    - Total Bonus = Position Earned + Performance Earned + Other Income (before tax) + Full Attendance + Lunch Allowance
 *
 * 3. Multi-Rate Overtime (4 Tiers):
 *    - Workday OT Salary = Workday OT Hours * Hourly Wage STD * 1.2
 *    - Saturday OT Salary = Saturday OT Hours * Hourly Wage STD * 1.5
 *    - Sunday OT Salary = Sunday OT Hours * Hourly Wage STD * 2.0
 *    - Holiday OT Salary = Holiday OT Hours * Hourly Wage STD * 2.0
 *    - Total Overtime Salary = Workday OT + Saturday OT + Sunday OT + Holiday OT
 *
 * 4. Gross Salary:
 *    - Gross Salary = Basic Wage Earned + Total Bonus + Total Overtime Salary
 *
 * 5. Statutory Deductions (NSSF, Bonus Tax 5%, PAYE, Tier 1 & Tier 2):
 *    - NSSF EE (5.5%) = Basic Wage Earned * 5.5%
 *    - NSSF ER (13%) = Basic Wage Earned * 13.0%
 *    - Tier 1 SSNIT (13.5%) = Basic Wage Earned * 13.5%
 *    - Tier 2 PETRA (5%) = Basic Wage Earned * 5.0%
 *    - Bonus Tax Base = min(Total Bonus, Basic Wage Earned * 15%)  (GRA 15% of Basic cap)
 *    - Bonus Tax (5%) = Bonus Tax Base * 5%
 *    - Excess Bonus = max(0, Total Bonus - Bonus Tax Base)
 *    - Cash Allowance = Total Overtime Salary
 *    - PAYE Base (Chargeable Income) = Basic Wage Earned - NSSF EE + Cash Allowance + Excess Bonus
 *    - PAYE = Progressive GRA Bands applied to PAYE Base
 *    - Total GRA = Bonus Tax + OT Tax + PAYE
 *    - Net Pay = Gross Salary - NSSF EE - Total GRA - After-Tax Deductions (including EWA recovery)
 *    - HR Cost = Gross Salary + NSSF ER (13%)
 */
export function calculateSundaExcelPayroll(params: {
  basicSalaryPesewas: number;
  positionStdPesewas?: number;
  performanceStdPesewas?: number;
  seniorityLevel?: "Seniors" | "Juniors";
  shouldWorkingDays?: number;
  actualWorkingDays?: number;
  paidDays?: number;
  coefficientScore?: number; // e.g. 1.5, 1.0, 2.0
  otherIncomePesewas?: number; // Leave pay, key position, production incentive, overproduction allowance
  fullAttendanceBonusPesewas?: number;
  lunchAllowancePesewas?: number;
  workdayOtHours?: number;
  saturdayOtHours?: number;
  sundayOtHours?: number;
  holidayOtHours?: number;
  ewaRecoveryPesewas?: number;
  useExcelPayeBands?: boolean;
  rules?: SystemRules;
  periodMonth?: string;
}) {
  const rules = params.rules ?? INITIAL_SYSTEM_RULES;
  const shouldDays = params.shouldWorkingDays ?? 20;
  const paidDays = params.paidDays ?? shouldDays;
  const seniority = params.seniorityLevel ?? "Seniors";

  const basicStdCedis = params.basicSalaryPesewas / 100;
  const positionStdCedis = (params.positionStdPesewas ?? 0) / 100;
  const performanceStdCedis = (params.performanceStdPesewas ?? 0) / 100;
  const totalGrossStdCedis = basicStdCedis + positionStdCedis + performanceStdCedis;

  const dailyWageStdCedis = basicStdCedis / shouldDays;
  const hourlyWageStdCedis = dailyWageStdCedis / 8;

  const basicEarnedCedis = basicStdCedis * (paidDays / shouldDays);
  const positionEarnedCedis = positionStdCedis;
  const coeff = params.coefficientScore ?? 0;
  const performanceEarnedCedis =
    Math.round(performanceStdCedis * (coeff / 100) * 100) / 100;

  const otherIncomeCedis = (params.otherIncomePesewas ?? 0) / 100;
  const fullAttendanceCedis = (params.fullAttendanceBonusPesewas ?? 0) / 100;
  const lunchCedis = (params.lunchAllowancePesewas ?? 0) / 100;

  const totalBonusCedis =
    Math.round(
      (positionEarnedCedis +
        performanceEarnedCedis +
        otherIncomeCedis +
        fullAttendanceCedis +
        lunchCedis) *
        100
    ) / 100;

  // 4-tier Overtime Calculation
  const wdHours = params.workdayOtHours ?? 0;
  const satHours = params.saturdayOtHours ?? 0;
  const sunHours = params.sundayOtHours ?? 0;
  const holHours = params.holidayOtHours ?? 0;

  const workdayOtCedis = Math.round(wdHours * hourlyWageStdCedis * 1.2 * 100) / 100;
  const saturdayOtCedis = Math.round(satHours * hourlyWageStdCedis * 1.5 * 100) / 100;
  const sundayOtCedis = Math.round(sunHours * hourlyWageStdCedis * 2.0 * 100) / 100;
  const holidayOtCedis = Math.round(holHours * hourlyWageStdCedis * 2.0 * 100) / 100;

  const totalOvertimeCedis =
    Math.round((workdayOtCedis + saturdayOtCedis + sundayOtCedis + holidayOtCedis) * 100) /
    100;

  const grossSalaryCedis =
    Math.round((basicEarnedCedis + totalBonusCedis + totalOvertimeCedis) * 100) / 100;

  // NSSF & Pension Tiers
  const nssfEeCedis = Math.round(basicEarnedCedis * 0.055 * 100) / 100;
  const nssfEr13Cedis = Math.round(basicEarnedCedis * 0.13 * 100) / 100;
  const tier1SsnitCedis = Math.round(basicEarnedCedis * 0.135 * 100) / 100;
  const tier2PetraCedis = Math.round(basicEarnedCedis * 0.05 * 100) / 100;

  // Bonus Tax (5% up to 15% of Basic Wage Earned when using Excel bonus schedule)
  const hasExcelBonusStructure =
    positionStdCedis > 0 ||
    performanceStdCedis > 0 ||
    fullAttendanceCedis > 0 ||
    lunchCedis > 0;

  const bonusTaxBaseCedis = hasExcelBonusStructure
    ? Math.round(Math.min(totalBonusCedis, basicEarnedCedis * 0.15) * 100) / 100
    : 0;
  const bonusTaxCedis = Math.round(bonusTaxBaseCedis * 0.05 * 100) / 100;
  const excessBonusCedis =
    Math.round((totalBonusCedis - bonusTaxBaseCedis) * 100) / 100;

  // Overtime Tax vs Cash Allowance (Confirmed from Excel screenshot Row 4):
  // If Juniors AND qualifying income (Basic Earned + Excess Bonus) <= 1,500 GHS/month:
  //   OT Tax Base = Total Overtime Salary
  //   First 50% of Basic Earned is taxed at 5%; excess OT is taxed at 10%
  //   Cash Allowance = 0
  // Otherwise (Seniors, or above threshold):
  //   OT Tax Base = 0, OT Tax = 0
  //   Cash Allowance = Total Overtime Salary (added to PAYE Base)
  const qualifiesForJuniorOtTax =
    seniority === "Juniors" && basicEarnedCedis + excessBonusCedis <= 1500;

  let otTaxBaseCedis = 0;
  let otTaxCedis = 0;
  let cashAllowanceCedis = totalOvertimeCedis;

  if (qualifiesForJuniorOtTax && totalOvertimeCedis > 0) {
    otTaxBaseCedis = totalOvertimeCedis;
    cashAllowanceCedis = 0;
    const halfBasicCedis = basicEarnedCedis * 0.5;
    if (otTaxBaseCedis <= halfBasicCedis) {
      otTaxCedis = Math.round(otTaxBaseCedis * 0.05 * 100) / 100;
    } else {
      otTaxCedis =
        Math.round(
          (halfBasicCedis * 0.05 + (otTaxBaseCedis - halfBasicCedis) * 0.1) * 100
        ) / 100;
    }
  }

  // PAYE Base = Basic Earned - NSSF EE (unrounded 5.5%) + Cash Allowance + Excess Bonus
  const rawNssfEe = basicEarnedCedis * 0.055;
  const payeBaseCedis =
    Math.round(
      Math.max(0, basicEarnedCedis - rawNssfEe + cashAllowanceCedis + excessBonusCedis) *
        100
    ) / 100;

  const useExcelBands =
    params.useExcelPayeBands ||
    (params.periodMonth && params.periodMonth < "2026-09");
  const schedule =
    (useExcelBands
      ? rules.payeSchedules.find((s) => s.id === "sunda-excel-2026")
      : rules.payeSchedules.find((s) => s.id === rules.activePayeScheduleId)) ??
    rules.payeSchedules[0];

  const payePesewas = computePayeFromBands(
    Math.round(payeBaseCedis * 100),
    schedule.bands
  );
  const payeCedis = payePesewas / 100;

  const totalGraCedis =
    Math.round((bonusTaxCedis + otTaxCedis + payeCedis) * 100) / 100;
  const ewaRecoveryCedis = (params.ewaRecoveryPesewas ?? 0) / 100;

  const totalDeductionsCedis =
    Math.round((nssfEeCedis + totalGraCedis + ewaRecoveryCedis) * 100) / 100;
  const netPayCedis =
    Math.round(Math.max(0, grossSalaryCedis - totalDeductionsCedis) * 100) / 100;
  const hrCostCedis = Math.round((grossSalaryCedis + nssfEr13Cedis) * 100) / 100;

  const toP = (c: number) => Math.round(c * 100);

  return {
    basicSalaryPesewas: toP(basicEarnedCedis),
    allowancesPesewas: toP(totalBonusCedis),
    overtimePayPesewas: toP(totalOvertimeCedis),
    grossPayPesewas: toP(grossSalaryCedis),
    ssnitEmployeePesewas: toP(nssfEeCedis),
    ssnitEmployerPesewas: toP(nssfEr13Cedis),
    chargeableIncomePesewas: toP(payeBaseCedis),
    payePesewas: toP(payeCedis),
    ewaRecoveryPesewas: toP(ewaRecoveryCedis),
    totalDeductionsPesewas: toP(totalDeductionsCedis),
    netPayPesewas: toP(netPayCedis),
    // Detailed Excel formula fields
    seniorityLevel: seniority,
    dailyWageStdPesewas: toP(dailyWageStdCedis),
    hourlyWageStdPesewas: toP(hourlyWageStdCedis),
    positionStdPesewas: toP(positionStdCedis),
    performanceStdPesewas: toP(performanceStdCedis),
    totalGrossStdPesewas: toP(totalGrossStdCedis),
    coefficientScore: coeff,
    positionEarnedPesewas: toP(positionEarnedCedis),
    performanceEarnedPesewas: toP(performanceEarnedCedis),
    otherIncomePesewas: toP(otherIncomeCedis),
    fullAttendanceBonusPesewas: toP(fullAttendanceCedis),
    lunchAllowancePesewas: toP(lunchCedis),
    totalBonusPesewas: toP(totalBonusCedis),
    workdayOtHours: wdHours,
    saturdayOtHours: satHours,
    sundayOtHours: sunHours,
    holidayOtHours: holHours,
    workdayOtPayPesewas: toP(workdayOtCedis),
    saturdayOtPayPesewas: toP(saturdayOtCedis),
    sundayOtPayPesewas: toP(sundayOtCedis),
    holidayOtPayPesewas: toP(holidayOtCedis),
    bonusTaxBasePesewas: toP(bonusTaxBaseCedis),
    bonusTaxPesewas: toP(bonusTaxCedis),
    otTaxBasePesewas: toP(otTaxBaseCedis),
    otTaxPesewas: toP(otTaxCedis),
    cashAllowancePesewas: toP(cashAllowanceCedis),
    excessBonusPesewas: toP(excessBonusCedis),
    payeBasePesewas: toP(payeBaseCedis),
    totalGraTaxPesewas: toP(totalGraCedis),
    nssfEmployer13Pesewas: toP(nssfEr13Cedis),
    tier1SsnitPesewas: toP(tier1SsnitCedis),
    tier2PetraPesewas: toP(tier2PetraCedis),
    hrCostPesewas: toP(hrCostCedis),
  };
}

/**
 * Standard wrapper used by existing screens and PRD Section 8 test case.
 */
export function calculateStatutoryAndNet(params: {
  basicSalaryPesewas: number;
  allowancesPesewas?: number;
  overtimePayPesewas?: number;
  ewaRecoveryPesewas?: number;
  rules?: SystemRules;
  periodMonth?: string; // "2026-11"
}) {
  const rules = params.rules ?? INITIAL_SYSTEM_RULES;
  const basic = params.basicSalaryPesewas;
  const allowances = params.allowancesPesewas ?? 0;
  const overtime = params.overtimePayPesewas ?? 0;
  const ewaRecovery = params.ewaRecoveryPesewas ?? 0;

  const grossPayPesewas = basic + allowances + overtime;

  const ssnitEmployeePesewas = Math.round(basic * (rules.ssnitEmployeeRatePercent / 100));
  const ssnitEmployerPesewas = Math.round(basic * (rules.ssnitEmployerRatePercent / 100));

  const chargeableIncomePesewas = Math.max(0, grossPayPesewas - ssnitEmployeePesewas);

  const usePreSep =
    params.periodMonth && params.periodMonth < "2026-09";
  const schedule =
    (usePreSep
      ? rules.payeSchedules.find((s) => s.id === "sunda-excel-2026")
      : rules.payeSchedules.find((s) => s.id === rules.activePayeScheduleId)) ??
    rules.payeSchedules[0];

  const payePesewas = computePayeFromBands(chargeableIncomePesewas, schedule.bands);

  const totalDeductionsPesewas = ssnitEmployeePesewas + payePesewas + ewaRecovery;
  const netPayPesewas = Math.max(0, grossPayPesewas - totalDeductionsPesewas);

  return {
    basicSalaryPesewas: basic,
    allowancesPesewas: allowances,
    overtimePayPesewas: overtime,
    grossPayPesewas,
    ssnitEmployeePesewas,
    ssnitEmployerPesewas,
    chargeableIncomePesewas,
    payePesewas,
    ewaRecoveryPesewas: ewaRecovery,
    totalDeductionsPesewas,
    netPayPesewas,
  };
}

export function computePayeFromBands(chargeableIncomePesewas: number, bands: PayeBand[]): number {
  let remainingCedis = chargeableIncomePesewas / 100;
  let totalTaxCedis = 0;

  for (const band of bands) {
    if (remainingCedis <= 0) break;

    if (band.bandWidthCedis === null) {
      totalTaxCedis += remainingCedis * (band.ratePercent / 100);
      remainingCedis = 0;
    } else {
      const taxableInBand = Math.min(remainingCedis, band.bandWidthCedis);
      totalTaxCedis += taxableInBand * (band.ratePercent / 100);
      remainingCedis -= taxableInBand;
    }
  }

  return Math.round(totalTaxCedis * 100);
}
