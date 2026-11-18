"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { VeltraLogo } from "@/components/ui/logo";
import { useAuth } from "@/components/providers/auth-provider";
import { ROLE_DESCRIPTIONS, Role } from "@/lib/roles";
import { SYSTEM_NAME, COMPANY_NAME } from "@/lib/config";
import { ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { allUsers, signInAsRole, signInWithEmail } = useAuth();

  const [email, setEmail] = useState("akua.mensah@sundaghana.com");
  const [password, setPassword] = useState("••••••••••••");
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("HR/Payroll");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter both your email address and password.");
      return;
    }
    const res = signInWithEmail(email);
    if (!res.ok) {
      setError(res.error ?? "Invalid credentials.");
      return;
    }
    router.push("/dashboard");
  };

  const handleSelectDemoUser = (uEmail: string, uRole: Role) => {
    setEmail(uEmail);
    setPassword("••••••••••••");
    setSelectedRole(uRole);
    setError(null);
  };

  const handleInstantSignIn = (uRole: Role) => {
    signInAsRole(uRole);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-page flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Sign in form */}
        <div className="lg:col-span-5 veltra-card p-6 sm:p-8">
          <VeltraLogo showSubtitle />

          <h1 className="mt-6 text-[24px] font-bold tracking-tight text-text">
            Sign in to {SYSTEM_NAME}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {COMPANY_NAME} · Payroll, Attendance & Controls
          </p>

          {error && (
            <div
              style={{
                backgroundColor: "var(--status-red-bg)",
                color: "var(--status-red-fg)",
              }}
              className="mt-4 flex items-start gap-2 rounded-lg p-3 text-xs font-medium"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-text mb-1.5"
              >
                Work Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-text focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-text mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-text focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="submit"
              style={{ backgroundColor: "var(--primary)" }}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Sign in to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal shrink-0" />
            <span>
              Prototype evaluated on simulated & anonymized Sunda Ghana dataset.
            </span>
          </div>
        </div>

        {/* Right column: 5 Mock Users for Demo Use (PRD Section 7.1 & 13 Step 1) */}
        <div className="lg:col-span-7 veltra-card p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-text">
                Prototype Demo Accounts (5 Roles)
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Click any role to populate credentials or sign in immediately to inspect its role-based navigation and dashboard.
              </p>
            </div>
            <span
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0"
            >
              Demo Only
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {allUsers.map((u) => {
              const roleMeta = ROLE_DESCRIPTIONS[u.role];
              const isSelected = selectedRole === u.role;

              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectDemoUser(u.email, u.role)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-primary bg-primary-soft/30"
                      : "border-border bg-page/60 hover:bg-page"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 mt-0.5"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--primary)"
                            : "var(--muted)",
                        }}
                      >
                        {u.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-text">
                            {u.name}
                          </span>
                          <span
                            style={{
                              backgroundColor: "var(--primary-soft)",
                              color: "var(--primary)",
                            }}
                            className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                          >
                            {roleMeta.title}
                          </span>
                          {u.role === "HR/Payroll" && (
                            <span
                              style={{
                                backgroundColor: "var(--status-green-bg)",
                                color: "var(--status-green-fg)",
                              }}
                              className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                            >
                              First Demo Screen
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">{u.email}</p>
                        <p className="text-xs text-text/80 mt-1">
                          {roleMeta.summary}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstantSignIn(u.role);
                      }}
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span>Launch as {u.role}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
