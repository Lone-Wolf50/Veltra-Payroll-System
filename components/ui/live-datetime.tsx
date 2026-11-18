"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function LiveDateTimeBadge() {
  const [dateTimeText, setDateTimeText] = useState("03 Nov 2026 · --:--:--");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const mon = MONTHS[now.getMonth()];
      const year = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setDateTimeText(`${day} ${mon} ${year} · ${hh}:${mm}:${ss}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text tabular-nums">
      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
      <span>{dateTimeText}</span>
    </div>
  );
}
