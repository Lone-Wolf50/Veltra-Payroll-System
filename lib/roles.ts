export type Role =
  | "Employee"
  | "Supervisor"
  | "HR/Payroll"
  | "Finance"
  | "Admin";

export type NavPermission = "yes" | "view" | "request" | "recover" | "settings" | "none";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: string;
  permissions: Record<Role, NavPermission>;
}

/**
 * Exact navigation order and role visibility from PRD Section 6:
 * One left sidebar with the same order of items for everyone;
 * items a role cannot use ("none") are hidden.
 */
export const NAVIGATION_ITEMS: NavItemConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    permissions: {
      Employee: "yes",
      Supervisor: "yes",
      "HR/Payroll": "yes",
      Finance: "yes",
      Admin: "yes",
    },
  },
  {
    id: "my-attendance",
    label: "Clock-in & Attendance",
    href: "/attendance",
    icon: "Clock",
    permissions: {
      Employee: "yes",
      Supervisor: "yes",
      "HR/Payroll": "none",
      Finance: "none",
      Admin: "none",
    },
  },
  {
    id: "team-attendance",
    label: "Team Attendance",
    href: "/team-attendance",
    icon: "UsersRound",
    permissions: {
      Employee: "none",
      Supervisor: "yes",
      "HR/Payroll": "yes",
      Finance: "none",
      Admin: "none",
    },
  },
  {
    id: "payroll-runs",
    label: "Payroll Runs",
    href: "/payroll",
    icon: "Wallet",
    permissions: {
      Employee: "none",
      Supervisor: "none",
      "HR/Payroll": "yes",
      Finance: "view",
      Admin: "view",
    },
  },
  {
    id: "anomalies",
    label: "Anomalies",
    href: "/anomalies",
    icon: "AlertTriangle",
    permissions: {
      Employee: "none",
      Supervisor: "none",
      "HR/Payroll": "yes",
      Finance: "view",
      Admin: "view",
    },
  },
  {
    id: "approvals",
    label: "Approvals",
    href: "/approvals",
    icon: "CheckCircle2",
    permissions: {
      Employee: "none",
      Supervisor: "yes",
      "HR/Payroll": "yes",
      Finance: "yes",
      Admin: "none",
    },
  },
  {
    id: "payslips",
    label: "My Payslips",
    href: "/payslips",
    icon: "FileText",
    permissions: {
      Employee: "yes",
      Supervisor: "yes",
      "HR/Payroll": "yes",
      Finance: "yes",
      Admin: "yes",
    },
  },
  {
    id: "ewa",
    label: "Earned Wage Access",
    href: "/ewa",
    icon: "Banknote",
    permissions: {
      Employee: "request",
      Supervisor: "none",
      "HR/Payroll": "recover",
      Finance: "view",
      Admin: "settings",
    },
  },
  {
    id: "employees",
    label: "Employees",
    href: "/employees",
    icon: "UserCheck",
    permissions: {
      Employee: "none",
      Supervisor: "none",
      "HR/Payroll": "yes",
      Finance: "view",
      Admin: "yes",
    },
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    icon: "BarChart3",
    permissions: {
      Employee: "none",
      Supervisor: "none",
      "HR/Payroll": "yes",
      Finance: "yes",
      Admin: "yes",
    },
  },
  {
    id: "audit",
    label: "Audit Trail",
    href: "/audit",
    icon: "History",
    permissions: {
      Employee: "none",
      Supervisor: "none",
      "HR/Payroll": "none",
      Finance: "view",
      Admin: "yes",
    },
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    permissions: {
      Employee: "none",
      Supervisor: "none",
      "HR/Payroll": "none",
      Finance: "none",
      Admin: "yes",
    },
  },
];

export function getVisibleNavItems(role: Role): NavItemConfig[] {
  return NAVIGATION_ITEMS.filter((item) => item.permissions[role] !== "none");
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  if (pathname === "/dashboard" || pathname === "/login") return true;
  if (pathname.startsWith("/payroll/")) {
    const perm = NAVIGATION_ITEMS.find((i) => i.id === "payroll-runs")?.permissions[role];
    return perm !== undefined && perm !== "none";
  }
  const matched = NAVIGATION_ITEMS.find((item) => pathname.startsWith(item.href));
  if (!matched) return true;
  return matched.permissions[role] !== "none";
}

export const ROLE_DESCRIPTIONS: Record<Role, { title: string; summary: string }> = {
  Employee: {
    title: "Employee",
    summary: "Clock in and out, view own attendance & payslips, request simulated EWA",
  },
  Supervisor: {
    title: "Supervisor",
    summary: "Check team attendance and give first-stage payroll approval",
  },
  "HR/Payroll": {
    title: "HR/Payroll Officer",
    summary: "Run payroll, review flagged anomaly records, manage statutory deductions",
  },
  Finance: {
    title: "Finance Officer",
    summary: "Final approval, payment verification, and EWA advance recovery tracking",
  },
  Admin: {
    title: "System Admin",
    summary: "Manage users, roles, anomaly thresholds, statutory rules, and EWA limits",
  },
};
