"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getAttendanceRecords, recordClockAction } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Clock, CheckCircle2, WifiOff, MapPin } from "lucide-react";

const WEEKLY_ATTENDANCE_DATA = [
  { day: "Mon", hours: 8.5 },
  { day: "Tue", hours: 8.0 },
  { day: "Wed", hours: 9.0 },
  { day: "Thu", hours: 8.0 },
  { day: "Fri", hours: 8.5 },
];

export default function AttendancePage() {
  const { user, connectionState } = useAuth();
  const records = getAttendanceRecords(user.employeeId);

  const [liveTime, setLiveTime] = useState("08:02:14");
  const [lastConfirmation, setLastConfirmation] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setLiveTime(`${hh}:${mm}:${ss}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayRecord = records.find((r) => r.date === "2026-11-03");
  const isClockedIn = Boolean(todayRecord?.clockIn && !todayRecord?.clockOut);

  const handleClockToggle = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const shortTime = `${hh}:${mm}`;

    const action = isClockedIn ? "clock_out" : "clock_in";
    recordClockAction({
      employeeId: user.employeeId,
      employeeName: user.name,
      department: user.department,
      action,
      timeStr: shortTime,
    });

    setLastConfirmation(
      `${
        action === "clock_in" ? "Clocked in" : "Clocked out"
      } at ${shortTime} on 03 Nov 2026 (${
        connectionState === "offline"
          ? "Queued offline — Pending sync"
          : "Synced with server"
      })`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-text leading-tight">
          Clock-In & My Attendance
        </h1>
        <p className="text-xs text-muted mt-1">
          Phone-friendly biometric & mobile attendance terminal · Works offline and queues entries with a Pending badge until synced.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Phone-First Clock-In Card (PRD Section 7.3 & 10) */}
        <div className="lg:col-span-5 veltra-card p-6 flex flex-col items-center text-center justify-between">
          <div className="w-full flex items-center justify-between text-xs text-muted border-b border-border pb-3">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Sunda Ghana Plant 1 (Accra)
            </span>
            <StatusPill
              status={connectionState === "offline" ? "Offline Queue" : "Online"}
              variant={connectionState === "offline" ? "amber" : "green"}
            />
          </div>

          <div className="my-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Current Local Time · 03 Nov 2026
            </div>
            <div className="mt-1 text-4xl font-bold text-text tabular-nums tracking-tight">
              {liveTime}
            </div>
          </div>

          {/* Large Clock In / Clock Out Button */}
          <button
            type="button"
            onClick={handleClockToggle}
            style={{
              backgroundColor: isClockedIn
                ? "var(--teal)"
                : "var(--primary)",
            }}
            className="w-full max-w-xs rounded-2xl py-5 px-6 text-base font-bold text-white shadow-md hover:opacity-95 transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            <div className="flex items-center justify-center gap-2.5">
              <Clock className="h-5 w-5" />
              <span>{isClockedIn ? "Clock Out for Shift" : "Clock In Now"}</span>
            </div>
          </button>

          {lastConfirmation && (
            <div
              style={{
                backgroundColor:
                  connectionState === "offline"
                    ? "var(--status-amber-bg)"
                    : "var(--status-green-bg)",
                color:
                  connectionState === "offline"
                    ? "var(--status-amber-fg)"
                    : "var(--status-green-fg)",
              }}
              className="mt-4 w-full rounded-lg p-3 text-xs font-semibold flex items-center justify-center gap-2"
            >
              {connectionState === "offline" ? (
                <WifiOff className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>{lastConfirmation}</span>
            </div>
          )}

          <p className="mt-4 text-[11px] text-muted">
            Tip: Toggle &ldquo;Offline&rdquo; in the top bar connection menu to see new entries queued with an amber <strong>Pending</strong> badge.
          </p>
        </div>

        {/* Right: Chart 7 - My Attendance (Progress Ring + Weekly Bar - PRD Section 9) */}
        <div className="lg:col-span-7 veltra-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-text">
              My Attendance This Period
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Am I on track this period? (Days present against days expected)
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 items-center gap-6">
            {/* Progress Ring */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center">
              <div className="relative h-36 w-36 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - 15 / 22)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-text tabular-nums">
                    15 / 22
                  </span>
                  <span className="text-[11px] text-muted">Days Present</span>
                </div>
              </div>
              <span className="mt-2 text-xs font-semibold text-teal">
                100% of elapsed shift days attended
              </span>
            </div>

            {/* Weekly Hours Bar */}
            <div className="sm:col-span-7 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_ATTENDANCE_DATA} barSize={24}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    unit="h"
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--primary-soft)", opacity: 0.3 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-surface p-2 text-xs shadow-md">
                          <strong>{d.day}:</strong> {d.hours} hrs logged
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Period Attendance Log Table */}
      <div className="veltra-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold text-text">
            Recorded Attendance Log
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Entries recorded while offline display an amber &ldquo;Pending&rdquo; badge until synced.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-page/70 text-[11px] uppercase tracking-wider font-semibold text-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Clock In</th>
                <th className="px-4 py-3">Clock Out</th>
                <th className="px-4 py-3">Hours Worked</th>
                <th className="px-4 py-3">Shift Status</th>
                <th className="px-4 py-3">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm tabular-nums">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-page/60">
                  <td className="px-4 py-3.5 font-medium text-text">
                    {formatDate(rec.date)}
                  </td>
                  <td className="px-4 py-3.5 text-text">{rec.employeeName}</td>
                  <td className="px-4 py-3.5 text-text">
                    {rec.clockIn ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-text">
                    {rec.clockOut ?? "Active Shift"}
                  </td>
                  <td className="px-4 py-3.5 text-text">
                    {rec.hoursWorked} hrs{" "}
                    {rec.overtimeHours > 0 && (
                      <span className="text-xs text-primary">
                        (+{rec.overtimeHours}h OT)
                      </span>
                    )}
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
