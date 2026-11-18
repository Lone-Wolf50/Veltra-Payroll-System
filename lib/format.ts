/**
 * Money & Date formatting utilities for Veltra Payroll System.
 * All currency amounts are stored and calculated as integer pesewas
 * (e.g. GHS 12,500.00 = 1250000 pesewas) to prevent floating-point issues.
 */

export function formatGHS(pesewas: number, options?: { compact?: boolean; decimals?: number }): string {
  const cedis = pesewas / 100;
  const decimals = options?.decimals ?? 2;

  if (options?.compact && Math.abs(cedis) >= 1000) {
    if (Math.abs(cedis) >= 1_000_000) {
      return `GHS ${(cedis / 1_000_000).toFixed(2)}M`;
    }
    return `GHS ${ new Intl.NumberFormat("en-GH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(cedis)) }`;
  }

  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(cedis);

  return `GHS ${formatted}`;
}

export function formatChartGHS(pesewas: number): string {
  const cedis = Math.round(pesewas / 100);
  return `GHS ${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cedis)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats an ISO date string or Date into "02 Nov 2026"
 */
export function formatDate(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats an ISO timestamp into "08:04 AM" or "02 Nov 2026, 14:22"
 */
export function formatDateTime(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} · ${hours}:${mins}`;
}

export function pesewasToCedis(pesewas: number): number {
  return Number((pesewas / 100).toFixed(2));
}

export function cedisToPesewas(cedis: number): number {
  return Math.round(cedis * 100);
}
