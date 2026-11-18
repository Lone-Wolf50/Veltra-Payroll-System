"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getSystemRules,
  updateSystemRules,
  getMockUsers,
} from "@/lib/data";
import { SystemRules } from "@/lib/types";
import { Role } from "@/lib/roles";
import { formatGHS, cedisToPesewas, pesewasToCedis } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Save,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Sliders,
  Landmark,
  ShieldAlert,
  Users,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const initialRules = getSystemRules();
  const mockUsers = getMockUsers();

  const [draft, setDraft] = useState<SystemRules>(() =>
    JSON.parse(JSON.stringify(initialRules))
  );
  const [ewaCapCedis, setEwaCapCedis] = useState(
    String(pesewasToCedis(initialRules.ewaPerRequestCapPesewas))
  );
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.approvalSequence.length) return;
    const seq = [...draft.approvalSequence];
    const temp = seq[index];
    seq[index] = seq[target];
    seq[target] = temp;
    setDraft({ ...draft, approvalSequence: seq });
    setSavedBanner(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const capPesewas = cedisToPesewas(Number(ewaCapCedis) || 1000);
    const updated: SystemRules = {
      ...draft,
      ewaPerRequestCapPesewas: capPesewas,
    };

    const summary = `Updated EWA limits (${updated.ewaMaxPercentage}% of earned wages, cap ${formatGHS(
      capPesewas
    )}), overtime threshold (${
      updated.anomalyRules.abnormal_overtime.maxHoursPerPeriod
    }h), attendance tolerance (${
      updated.anomalyRules.attendance_mismatch.toleranceDays
    }d), and approval sequence (${updated.approvalSequence.join(" → ")}).`;

    updateSystemRules({
      updatedRules: updated,
      actorName: user.name,
      actorRole: user.role,
      changeSummary: summary,
    });

    setDraft(updated);
    setSavedBanner(summary);
  };

  const activePaye =
    draft.payeSchedules.find((s) => s.id === draft.activePayeScheduleId) ??
    draft.payeSchedules[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
            System Settings & Configurable Rules
          </h1>
          <p className="text-xs text-muted mt-1">
            All approval stages, EWA limits, anomaly thresholds, and statutory rates live here — no code changes required. Every update is logged to the Audit Trail.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          style={{ backgroundColor: "var(--primary)" }}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          <Save className="h-4 w-4" />
          <span>Save Configuration & Log to Audit Trail</span>
        </button>
      </div>

      {savedBanner && (
        <div
          style={{
            backgroundColor: "var(--status-green-bg)",
            color: "var(--status-green-fg)",
          }}
          className="rounded-card border border-border p-4 flex items-start gap-3 text-xs font-medium"
          role="status"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block">
              Settings saved and written to the System Audit Trail:
            </strong>
            <span>{savedBanner}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Approval Stages & EWA Limits */}
        <div className="lg:col-span-6 space-y-6">
          {/* Approval Sequence Card */}
          <div className="veltra-card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-text">
                Multi-Stage Approval Sequence (Reorderable)
              </h2>
            </div>
            <p className="text-xs text-muted">
              The Approvals stepper reads its stages directly from this sequence. Default: Supervisor → HR/Payroll → Finance.
            </p>

            <div className="space-y-2">
              {draft.approvalSequence.map((stageRole, idx) => (
                <div
                  key={stageRole}
                  className="flex items-center justify-between rounded-lg bg-page p-3 border border-border"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{
                        backgroundColor: "var(--primary-soft)",
                        color: "var(--primary)",
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-text">
                      Stage {idx + 1}: {stageRole}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStage(idx, -1)}
                      className="rounded border border-border bg-surface p-1 text-muted hover:text-text disabled:opacity-30"
                      aria-label={`Move ${stageRole} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === draft.approvalSequence.length - 1}
                      onClick={() => moveStage(idx, 1)}
                      className="rounded border border-border bg-surface p-1 text-muted hover:text-text disabled:opacity-30"
                      aria-label={`Move ${stageRole} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EWA Limits Card */}
          <div className="veltra-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-text">
                Simulated Earned Wage Access (EWA) Limits
              </h2>
              <StatusPill status="Live Limit Check" variant="violet" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label
                  htmlFor="ewa-pct"
                  className="block font-semibold text-text mb-1.5"
                >
                  Max % of Earned Wages
                </label>
                <input
                  id="ewa-pct"
                  type="number"
                  min={10}
                  max={100}
                  value={draft.ewaMaxPercentage}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ewaMaxPercentage: Number(e.target.value) || 50,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm font-bold text-text tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="ewa-cap"
                  className="block font-semibold text-text mb-1.5"
                >
                  Per-Request Cap (GHS)
                </label>
                <input
                  id="ewa-cap"
                  type="number"
                  step="50"
                  min={50}
                  value={ewaCapCedis}
                  onChange={(e) => setEwaCapCedis(e.target.value)}
                  className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm font-bold text-text tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-lg bg-page p-3 border border-border text-xs text-muted">
              <strong>Eligibility Rule:</strong> Active permanent employee with no open anomaly flag. Changing these values immediately updates the real-time limit checker on the EWA screen.
            </div>
          </div>
        </div>

        {/* 2. Five Anomaly Rules & Thresholds */}
        <div className="lg:col-span-6 veltra-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-text">
              Five Automated Anomaly Control Rules
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {/* Rule 1 */}
            <div className="rounded-lg bg-page p-3.5 border border-border flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-text">1. Duplicate account</div>
                <p className="text-muted mt-0.5">
                  {draft.anomalyRules.duplicate_account.description}
                </p>
              </div>
              <StatusPill status="Exact Match" variant="neutral" />
            </div>

            {/* Rule 2 */}
            <div className="rounded-lg bg-page p-3.5 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-text">2. Inconsistent record</div>
                <StatusPill status="Required Fields" variant="neutral" />
              </div>
              <p className="text-muted">
                Checked fields:{" "}
                <strong className="text-text">
                  {draft.anomalyRules.inconsistent_record.checkedFields.join(", ")}
                </strong>
              </p>
            </div>

            {/* Rule 3 */}
            <div className="rounded-lg bg-page p-3.5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-text">3. Abnormal overtime</div>
                <p className="text-muted mt-0.5">
                  Fires when overtime hours in a period exceed the department threshold.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <label htmlFor="ot-limit" className="font-semibold text-text">
                  Max Hrs:
                </label>
                <input
                  id="ot-limit"
                  type="number"
                  min={10}
                  max={120}
                  value={draft.anomalyRules.abnormal_overtime.maxHoursPerPeriod}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      anomalyRules: {
                        ...draft.anomalyRules,
                        abnormal_overtime: {
                          ...draft.anomalyRules.abnormal_overtime,
                          maxHoursPerPeriod: Number(e.target.value) || 40,
                        },
                      },
                    })
                  }
                  className="w-20 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text tabular-nums"
                />
              </div>
            </div>

            {/* Rule 4 */}
            <div className="rounded-lg bg-page p-3.5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-text">4. Attendance mismatch</div>
                <p className="text-muted mt-0.5">
                  Fires when days paid differ from biometric days attended beyond tolerance.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <label htmlFor="att-tol" className="font-semibold text-text">
                  Tolerance (Days):
                </label>
                <input
                  id="att-tol"
                  type="number"
                  min={0}
                  max={10}
                  value={draft.anomalyRules.attendance_mismatch.toleranceDays}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      anomalyRules: {
                        ...draft.anomalyRules,
                        attendance_mismatch: {
                          ...draft.anomalyRules.attendance_mismatch,
                          toleranceDays: Number(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  className="w-20 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text tabular-nums"
                />
              </div>
            </div>

            {/* Rule 5 */}
            <div className="rounded-lg bg-page p-3.5 border border-border flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-text">
                  5. Inactive employee paid
                </div>
                <p className="text-muted mt-0.5">
                  {draft.anomalyRules.inactive_employee_paid.description}
                </p>
              </div>
              <StatusPill status="Zero Tolerance" variant="red" />
            </div>
          </div>
        </div>
      </form>

      {/* 3. GRA Statutory PAYE Bands & SSNIT Rates (PRD Section 8) */}
      <div className="veltra-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-base font-bold text-text">
                Statutory Rates — GRA Monthly PAYE Bands & SSNIT
              </h2>
              <p className="text-xs text-muted">
                {activePaye.name} · {activePaye.actReference} (Effective{" "}
                {activePaye.effectiveFrom})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="rounded-md bg-page px-2.5 py-1 border border-border">
              SSNIT Employee: {draft.ssnitEmployeeRatePercent}%
            </span>
            <span className="rounded-md bg-page px-2.5 py-1 border border-border">
              SSNIT Employer: {draft.ssnitEmployerRatePercent}%
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="border-b border-border bg-page/70 uppercase tracking-wider font-semibold text-muted">
                <th className="px-4 py-2.5">Band</th>
                <th className="px-4 py-2.5">Chargeable Income (GHS)</th>
                <th className="px-4 py-2.5">Tax Rate</th>
                <th className="px-4 py-2.5">Upper Limit of Band (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activePaye.bands.map((b, i) => (
                <tr key={i} className="hover:bg-page/50">
                  <td className="px-4 py-2.5 font-semibold text-text">
                    {b.label}
                  </td>
                  <td className="px-4 py-2.5 text-text">
                    {b.bandWidthCedis !== null
                      ? b.bandWidthCedis.toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                        })
                      : "50,000.00"}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-primary">
                    {b.ratePercent}%
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {b.upperLimitCedis !== null
                      ? b.upperLimitCedis.toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                        })
                      : "none"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Users & Roles Table */}
      <div className="veltra-card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-text">
            Configured Users & Role Access Matrix
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {mockUsers.map((u) => (
            <div
              key={u.id}
              className="rounded-lg bg-page p-3.5 border border-border space-y-1"
            >
              <StatusPill status={u.role} variant="violet" />
              <div className="font-bold text-text pt-1">{u.name}</div>
              <div className="text-muted truncate">{u.email}</div>
              <div className="text-[11px] text-muted">{u.department}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
