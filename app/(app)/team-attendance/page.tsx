"use client";

import React from "react";
import { getAttendanceRecords, getOvertimeByDepartment, getSystemRules } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import { OvertimeByDepartmentChart } from "@/components/charts/secondary-charts";

export default function TeamAttendancePage() {
  const records = getAttendanceRecords();
  const overtimeData = getOvertimeByDepartment();
  const rules = getSystemRules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
          Team Attendance & Overtime Monitor
        </h1>
        <p className="text-xs text-muted mt-1">
          Supervisor & HR overview of shift attendance logs and department overtime limits.
        </p>
      </div>

      <OvertimeByDepartmentChart
        data={overtimeData}
        threshold={rules.anomalyRules.abnormal_overtime.maxHoursPerPeriod}
      />

      <div className="veltra-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold text-text">
            Recent Team Biometric & Mobile Logs
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-page/70 text-[11px] uppercase tracking-wider font-semibold text-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Clock In</th>
                <th className="px-4 py-3">Clock Out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm tabular-nums">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-page/60">
                  <td className="px-4 py-3.5 font-medium text-text">
                    {formatDate(rec.date)}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-text">
                    {rec.employeeName}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted">
                    {rec.department}
                  </td>
                  <td className="px-4 py-3.5 text-text">{rec.clockIn ?? "—"}</td>
                  <td className="px-4 py-3.5 text-text">
                    {rec.clockOut ?? "On Shift"}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={rec.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={rec.syncStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
