import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

interface PayslipSummaryPayload {
  periodLabel: string;
  employeeName: string;
  staffId: string;
  department: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
}

interface SendEmailPayload {
  to: string[];
  subject: string;
  title?: string;
  body: string;
  type?: "Bulk" | "Individual";
  includePayslipSummary?: boolean;
  payslipSummary?: PayslipSummaryPayload;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBrandedHtml(params: {
  title?: string;
  body: string;
  includePayslipSummary?: boolean;
  payslipSummary?: PayslipSummaryPayload;
}): string {
  const titleHtml = params.title?.trim()
    ? `<h2 style="margin:0 0 16px 0;padding-bottom:12px;border-bottom:1px solid #e5e7eb;font-size:18px;line-height:1.35;color:#111827;">${escapeHtml(
        params.title.trim()
      )}</h2>`
    : "";

  const bodyHtml = escapeHtml(params.body.trim()).replace(/\n/g, "<br />");

  const payslipHtml =
    params.includePayslipSummary && params.payslipSummary
      ? `
      <div style="margin-top:20px;padding:16px;border:1px solid #e5e7eb;border-radius:10px;background-color:#f9fafb;">
        <div style="font-size:12px;font-weight:700;color:#6c5ce7;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;">
          Payslip Summary — ${escapeHtml(params.payslipSummary.periodLabel)}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#111827;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Employee</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;">${escapeHtml(
              params.payslipSummary.employeeName
            )} (${escapeHtml(params.payslipSummary.staffId)})</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Department</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;">${escapeHtml(
              params.payslipSummary.department
            )}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Gross Earnings</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;">${escapeHtml(
              params.payslipSummary.grossPay
            )}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Total Deductions</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;">${escapeHtml(
              params.payslipSummary.totalDeductions
            )}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 0 0;border-top:1px solid #e5e7eb;font-weight:700;color:#6c5ce7;">Net Pay Disbursed</td>
            <td style="padding:8px 0 0 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;color:#6c5ce7;">${escapeHtml(
              params.payslipSummary.netPay
            )}</td>
          </tr>
        </table>
      </div>`
      : params.includePayslipSummary
      ? `
      <div style="margin-top:20px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;background-color:#f9fafb;font-size:12px;color:#4b5563;">
        <strong style="color:#6c5ce7;">Payslip Notice:</strong> Your November 2026 statutory payslip is ready to view and download in the Veltra Payroll portal.
      </div>`
      : "";

  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background-color:#6c5ce7;padding:18px 24px;color:#ffffff;">
          <div style="font-size:16px;font-weight:700;letter-spacing:-0.01em;">Sunda Ghana Limited</div>
          <div style="font-size:12px;opacity:0.9;margin-top:2px;">HR &amp; Payroll · Veltra Payroll System</div>
        </div>
        <div style="padding:24px;">
          ${titleHtml}
          <div style="font-size:14px;line-height:1.65;color:#1f2937;">
            ${bodyHtml}
          </div>
          ${payslipHtml}
        </div>
        <div style="padding:14px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;">
          This message was sent from the Veltra HR &amp; Payroll portal for Sunda Ghana Limited.
        </div>
      </div>
    </body>
  </html>`;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as SendEmailPayload;
    const recipients = Array.isArray(payload.to)
      ? payload.to.map((e) => e.trim()).filter(Boolean)
      : [];

    if (recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one recipient email address is required." },
        { status: 400 }
      );
    }

    if (!payload.subject?.trim() || !payload.body?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Subject and message body are required." },
        { status: 400 }
      );
    }

    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.EMAIL_PORT || 465);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Gmail SMTP password (EMAIL_PASS) is not set in .env.local. Paste your 16-character Gmail App Password into .env.local and restart the dev server.",
        },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const html = buildBrandedHtml({
      title: payload.title,
      body: payload.body,
      includePayslipSummary: payload.includePayslipSummary,
      payslipSummary: payload.payslipSummary,
    });

    const plainText = [
      payload.title?.trim() ? `${payload.title.trim()}\n${"=".repeat(payload.title.trim().length)}\n` : "",
      payload.body.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    // For bulk sends with multiple recipients, use BCC so staff don't see each other's emails
    const isBulkMultiple = payload.type === "Bulk" && recipients.length > 1;

    const info = await transporter.sendMail({
      from: `"HR & Payroll — Sunda Ghana Limited" <${user}>`,
      to: isBulkMultiple ? user : recipients[0],
      bcc: isBulkMultiple ? recipients : undefined,
      subject: payload.subject.trim(),
      text: plainText,
      html,
    });

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      sentCount: recipients.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email via SMTP.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
