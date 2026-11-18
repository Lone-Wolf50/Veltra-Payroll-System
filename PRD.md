# Veltra Payroll System: Frontend PRD

Version 1.0 (completed) · 03 Nov 2026 · Builds on the 02 Nov 2026 draft

## 1. Overview

The frontend is the web interface of Veltra, a payroll platform for Sunda Ghana Limited. It covers attendance, payroll, statutory deductions, fraud and anomaly flags, multi-stage approvals and simulated Earned Wage Access (EWA). It follows the two reference dashboards: a layout with a left sidebar, summary cards, clear charts and searchable tables.

The frontend is built first, on mock data, before the Supabase backend exists. The mock data is shaped like the database tables so the real data can replace it without redesigning any screen.

**Scope note from the proposal:** the project is a prototype evaluated with simulated or anonymized data. It does not connect to live banking or mobile-money services, does not install biometric hardware, and treats the existing biometric system as a source of attendance data. EWA payments are simulated.

## 2. Decisions (all open questions closed)

| Question | Decision |
| --- | --- |
| System name | **Veltra.** Use the name and a simple wordmark in the sidebar and sign-in screen. Keep the name in one config constant so it can be changed in one place. |
| Accent color | **Violet** (#6C4DF6 in light mode). The UPSA navy and gold are not used in the interface. |
| Theme | **Light and dark mode.** Light is the default; the user can switch from the user menu, and "System" follows the device setting. The choice is remembered. |
| Libraries | **shadcn/ui, Recharts and TanStack Table are confirmed**, together with React Hook Form + Zod, Lucide and Dexie.js (later). |
| First screen to build for the demo | **HR/Payroll dashboard** (build step 3, preceded by the foundation in step 1). |
| Approval stages and EWA limits | **Set in Settings, not in code.** Build the Settings screen now with the starting values in section 8. Changing a stage or a limit later needs no code change. |

## 3. Goals and non-goals

**Goals**

- One consistent interface for five roles, each seeing only what it needs.
- Charts that answer a question at a glance: cost trend, status, deductions, anomalies, EWA use.
- A phone-friendly clock-in that still works offline.
- A frontend that can be built and demoed on mock data before the backend exists.
- Light and dark themes that share one set of components.

**In scope:** all screens, components, charts, offline states, theming and navigation.

**Out of scope:** live banking or mobile-money payments, biometric hardware, and the Supabase backend itself (connected after the frontend).

## 4. Users and roles

The sidebar, dashboard and available actions change with the signed-in role. The database will enforce the same limits later; the interface only reflects them.

| Role | Main goal | Home screen shows |
| --- | --- | --- |
| Employee | Clock in and out, see own attendance and payslip, request EWA | Today's clock-in card, own attendance this period, EWA available now |
| Supervisor | Check team attendance and give first-stage approval | Team attendance, items waiting for approval |
| HR/Payroll Officer | Run payroll, review flagged records | Payroll summary cards, cost chart, anomaly queue |
| Finance | Final approval and payment verification | Approval queue, payroll status, EWA advances to recover |
| System Admin | Users, roles, rules and EWA limits | User list, rule and limit settings, audit trail |

## 5. Design direction

The look is the shared style of the two references: a soft page background, rounded cards, a sidebar with one highlighted item, one violet accent for actions and the main chart series, and pastel blue, green and amber for secondary data and status. All colors live as tokens in one Tailwind theme file, with a light and a dark value for each.

### 5.1 Color tokens

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| page | #F4F5F7 | #0F1117 | Page background |
| surface | #FFFFFF | #181B24 | Cards, sidebar, tables |
| border | #E5E7EB | #2A2F3B | Card and table borders, chart gridlines |
| text | #1F2430 | #E8EAF0 | Headings and body |
| muted | #6B7280 | #9AA3B2 | Labels, helper text |
| primary | #6C4DF6 | #8B73FF | Buttons, active nav item, main chart series |
| primary-soft | #E9E5FF | #2A2450 | Active nav background, secondary bar segment |
| teal | #2FB7A6 | #3CCDBB | Second chart color, positive trend, donut |
| blue-soft | #DCE8FF | #1E2F52 | Pastel stacked segment, Pending approval |
| status-green | #17784B on #E3F6EC | #6EDBA5 on #12301F | Paid, Approved, Completed pills |
| status-amber | #8A5A00 on #FFF4D6 | #F5C76B on #3A2D0B | Pending pills, warnings |
| status-red | #B42B2B on #FDE8E8 | #FF9B9B on #3F1717 | Unpaid, Rejected, anomaly flags |

The hex values were matched by eye from the reference screenshots. Treat them as starting values and fine-tune them in the theme file. The dark values must be checked for WCAG AA contrast (4.5:1 for body text, 3:1 for large text and chart marks).

### 5.2 Style rules

- Cards: 12 px radius, 1 px border, very light shadow in light mode (border only in dark mode); 24 px spacing between cards.
- One accent color per screen: violet for actions, pastels for data. Never use red for decoration, only for problems.
- Status is always a pill with text plus color, so it still reads without color.
- Typeface: Inter (or the system sans), 14 px body, 28 px page title, numbers in tabular figures.
- Money is shown as GHS 12,500.00; dates as 02 Nov 2026.
- Implementation: Tailwind `darkMode: "class"`, tokens defined as CSS variables on `:root` and `.dark`, and components read only the variables, never raw hex values. Charts also read the variables so they switch theme without code changes.

## 6. Navigation and pages

One left sidebar with the same order of items for everyone; items a role cannot use are hidden. The top bar holds search, the online/offline indicator, notifications, the theme toggle and the user menu.

| Page | Employee | Supervisor | HR/Payroll | Finance | Admin |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Clock-in and my attendance | Yes | Yes | – | – | – |
| Team attendance | – | Yes | Yes | – | – |
| Payroll runs | – | – | Yes | View | View |
| Payroll run detail | – | – | Yes | Yes | View |
| Anomalies | – | – | Yes | View | View |
| Approvals | – | Yes | Yes | Yes | – |
| My payslips | Yes | Yes | Yes | Yes | Yes |
| Earned Wage Access | Request | – | Recover and view | View | Settings |
| Employees | – | – | Yes | View | Yes |
| Reports | – | – | Yes | Yes | Yes |
| Audit trail | – | – | – | View | Yes |
| Settings (users, rules, EWA limits) | – | – | – | – | Yes |

## 7. Screen requirements

1. **Sign in.** Email and password, role-based redirect to the home screen, clear error messages, "signed in as" shown in the user menu. In the prototype, mock users (one per role) are listed on the sign-in screen for demo use only.
2. **HR/Payroll dashboard** (modeled on both references, the first demo screen).
   - Four summary cards: total payroll cost, net pay, statutory deductions, flagged records; each with change versus last period.
   - Payroll cost chart (stacked columns by month) and a payroll status chart.
   - A banner when a payroll deadline is near, with a link to the open run.
   - Payroll table below: employee, department, gross, deductions, net, status pill; search, filter by status and department, pagination, export.
3. **Employee clock-in.** A large Clock in / Clock out button, the time shown live, a confirmation with the recorded time, and a list of this period's attendance. Works offline: the entry shows a "pending" badge until synced.
4. **Payroll run.** Create a run for a pay period, see calculated pay, overtime and statutory deductions (PAYE, SSNIT) per employee, open one employee for a breakdown, then submit for approval. Submit is disabled while offline.
5. **Anomaly review.** A queue of flagged records, each showing the rule that fired, the employee, the evidence and the amount involved. The officer marks it Corrected or Confirmed legitimate with a required note; the run is recalculated after a correction. A flag means "needs review", not "fraud", and the wording on screen must say so.
6. **Approvals.** A list of runs waiting for the user's stage (Supervisor, then HR/Payroll, then Finance). Approve or reject with a comment; a stepper shows which stage the run is at and who approved.
7. **Earned Wage Access (employee).** Shows earned so far, the amount available now, and advances already taken; an amount field checks the limit as you type, and the request result states why it was declined when it is. Clearly labeled as a simulation.
8. **Payslips.** Current and past payslips for the signed-in user, printable.
9. **Settings (Admin).** Users and roles, the five anomaly rules with their thresholds, the approval stages, statutory rates, and EWA limits (percentage of earned wages, per-request cap). Changes are written to the audit trail.
10. **Audit trail.** Read-only, filterable list of who did what and when.
11. **Reports.** Payroll summary, statutory deduction summary, anomaly report and EWA transaction report, each filterable by period and exportable.
12. **Employees.** Searchable list with a detail view (department, status, pay structure, masked bank details). Bank details are masked by default (for example \*\*\*\*4821) and shown in full only on request to roles that may see them.

## 8. Configurable rules

Statutory rates, approval stages and EWA limits are not hard-coded. They live in one rules object that the Settings screen edits (mock data now, a database table later), as the proposal requires: statutory rules are configurable, the approval sequence is confirmed during requirements gathering, and EWA works against configured limits.

**Statutory deductions** are checked against the Ghana Revenue Authority's [PAYE page](https://gra.gov.gh/domestic-tax/tax-types/paye/), as of 03 Nov 2026. The bands below are the ones under the Income Tax (Amendment) Act, 2026 (Act 1178), in force from 1 September 2026.

| Rule | Value in the system |
| --- | --- |
| Approval sequence | Supervisor, then HR/Payroll, then Finance. Reorderable in Settings |
| SSNIT employee contribution | 5.5% of basic salary, deducted before PAYE is calculated |
| SSNIT employer contribution | 13.5% of basic salary, shown on reports and not deducted from net pay |
| PAYE | Monthly bands below, applied to chargeable income (taxable pay less the SSNIT employee contribution) |
| EWA percentage of earned wages | 50% |
| EWA per-request cap | GHS 1,000.00 |
| EWA eligibility | Active permanent employee with no open anomaly flag |

The two EWA values and the eligibility rule are the initial settings of the prototype. Both are edited in Settings and every change is written to the audit trail.

### Monthly PAYE bands (resident individuals, from 01 Sep 2026)

| Band | Chargeable income (GHS) | Rate | Upper limit of band (GHS) |
| --- | --- | --- | --- |
| First | 588.00 | 0% | 588.00 |
| Next | 80.00 | 5% | 668.00 |
| Next | 100.00 | 10% | 768.00 |
| Next | 2,900.00 | 17.5% | 3,668.00 |
| Next | 16,000.00 | 25% | 19,668.00 |
| Next | 30,332.00 | 30% | 50,000.00 |
| Exceeding | 50,000.00 | 35% | none |

Payroll for January to August 2026 used the earlier bands, so the rules object stores bands with an effective date and a run uses the bands in force for its pay period.

**Test case for the mock data:** basic salary GHS 5,000.00. SSNIT employee contribution 275.00, chargeable income 4,725.00, PAYE 785.75 (4.00 + 10.00 + 507.50 + 264.25), net pay 3,939.25. This ignores allowances and reliefs.

### 8.1 The five anomaly rules

From the proposal: duplicate payment-account details, inconsistent employee records, unusual overtime, attendance-payroll mismatch, and payments to inactive employees.

| Rule | Fires when | Threshold setting |
| --- | --- | --- |
| Duplicate account | Two or more employees share the same bank or mobile-money account | None (exact match) |
| Inconsistent record | Required employee fields conflict or are missing | List of checked fields |
| Abnormal overtime | Overtime hours in a period exceed the limit | Hours per period, per department |
| Attendance mismatch | Days paid differ from days attended | Tolerance in days |
| Inactive employee paid | Pay is calculated for an employee marked inactive or terminated | None |

## 9. Charts and data visualization

Every chart answers one question and is chosen for that question. Seven charts cover the system; the first two are the headline charts on the HR/Payroll dashboard.

| Chart | Question it answers | Type | Data | Who sees it |
| --- | --- | --- | --- | --- |
| Payroll cost by month | Is cost rising, and what is it made of? | Stacked columns, last 6 months | Net pay, overtime, statutory deductions per month | HR/Payroll, Finance, Admin |
| Payroll status | Where is each run in the process? | Donut with count in the center, or segmented bar | Runs by Draft, Pending approval, Approved, Paid | HR/Payroll, Finance |
| Statutory deductions | How much goes to PAYE and SSNIT? | Horizontal bars | Amount per deduction type, current period | HR/Payroll, Finance |
| Anomalies by rule | Which checks fire most? | Horizontal bars with a small monthly trend line | Flag count for each of the five rules | HR/Payroll, Admin |
| Overtime by department | Who is above normal? | Columns with a dashed threshold line | Overtime hours per department against the configured limit | HR/Payroll, Supervisor |
| EWA usage | How much is advanced and recovered? | Line chart, two series | Advances taken and amounts recovered per period; progress bar for the user's own limit | Employee (own limit), Finance, Admin |
| My attendance | Am I on track this period? | Progress ring plus weekly bar | Days present against days expected | Employee, Supervisor |

**Rules for every chart**

- Library: Recharts, restyled with the palette (violet main series, teal second, pastel blue and amber for the rest). No default colors, no 3D, no gradients.
- Series colors come from theme variables, so charts switch correctly between light and dark mode.
- Hover tooltip shows the exact value in GHS; the active bar or point is highlighted, as in the second reference.
- A short legend, labeled axes with units, gridlines in the border color, and values formatted as GHS 12,500.
- Cards are titled with the question or the metric, with a "More details" link to the underlying table.
- Every chart has an empty state ("No payroll runs yet") and a loading skeleton.
- A threshold or anomaly is marked with a labeled line or marker, never by color alone.
- Charts resize to one column on a phone and keep the same colors in the same order.

## 10. Offline and sync experience

The interface must always say whether the user is online, and what is safe to do. The connection indicator sits in the top bar on every screen.

| State | What the user sees | What is allowed |
| --- | --- | --- |
| Online | Green dot, "Online" | Everything their role permits |
| Offline | Amber banner "You are offline. Changes will sync when you reconnect." | View cached own data, clock in and out, save drafts |
| Pending item | Amber "Pending" badge on each queued entry | Entry stays until the server confirms it |
| Syncing | Spinner and count, "Syncing 3 items" | Normal use |
| Sync done | Short confirmation toast, badge removed | Normal use |
| Sync failed | Red notice with the item and a Retry button | Item is kept, never discarded |

- Actions that need a live connection (approvals, payroll submission, EWA decisions) stay visible but disabled offline, with the reason in a tooltip: "Needs a connection".
- Screens that would show data that is never stored locally (bank details, past payroll, other employees, audit records) show "Available when online" instead of stale data.
- On logout the local data is cleared and the user is told so.
- In the mock-data phase, the online/offline state can be simulated with a developer toggle so every state can be demoed without disconnecting.

## 11. Technical approach

| Need | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) with TypeScript | Agreed stack; routing, layouts per role, server code later |
| Styling | Tailwind CSS with the palette as theme tokens, class-based dark mode | One place to change colors in both themes |
| Components | shadcn/ui (built on Radix) | Accessible buttons, dialogs, tabs, tables; styled with Tailwind |
| Charts | Recharts | Works directly in React, easy to style to the palette |
| Tables | TanStack Table | Sorting, filtering and pagination for payroll lists |
| Forms | React Hook Form with Zod | Validation for clock-in, EWA amount, settings |
| Icons | Lucide | Clean line icons like the references |
| Theme switching | next-themes | Light, dark and system modes with no flash on load |
| Offline | Dexie.js and Web Crypto (later) | Agreed design; added after the online screens work |
| Data | Mock data first, then Supabase | Frontend can be demoed before the backend |

### 11.1 Project structure

```
app/
  (auth)/login
  (app)/dashboard, attendance, payroll, anomalies,
        approvals, ewa, employees, reports, audit, settings
components/
  ui/ (shadcn), charts/, layout/ (sidebar, topbar), tables/
lib/
  mock/ (employees, attendance, payroll, anomalies, ewa, rules)
  data/ (data access layer: getPayrollRuns(), getEmployees(), ...)
  format.ts (GHS and dates), roles.ts (who sees what)
  theme (Tailwind tokens, light and dark)
```

Screens never import mock files directly. They call the functions in `lib/data`, which return mock data now and Supabase data later. This is what makes the backend swap invisible to the screens.

### 11.2 Mock data

The mock data uses the same eight entities as the database: Employee, Attendance, Payroll, Statutory Deduction, EWA Request, Anomaly Record, Approval and User.

- Size: about 60 employees across 5 departments is enough for every screen; the generator takes a count so it can produce 2,836 (Sunda's permanent workforce) to test table pagination and chart performance.
- Six months of payroll history, so the cost chart has a real trend.
- Seed on purpose: 8 to 12 flagged records covering all five anomaly rules, one run in each status (Draft, Pending approval, Approved, Paid), a run with a deadline in 2 days (to show the banner), and a few EWA requests including one declined.
- All names, accounts and amounts are fictional.
- Relationships follow the proposal's data model: an employee has many attendance, payroll, EWA and anomaly records; each payroll record has one statutory deduction record, any anomaly records, and one approval record tracking its stages.

### 11.3 Frontend rules for money

Amounts are stored and calculated as integer pesewas (GHS 12,500.00 = 1250000) and formatted only in `format.ts`. This avoids floating point errors in payroll totals and keeps the later database swap straightforward.

## 12. Non-functional requirements

- **Responsive:** designed laptop-first (sidebar visible) and fully usable on a phone: the sidebar becomes a menu, cards stack in one column, tables scroll sideways or become cards. Clock-in is designed phone-first.
- **Accessibility:** text contrast at WCAG AA in both themes, every action reachable by keyboard, visible focus rings, labels on all form fields, status never shown by color alone.
- **Performance:** first screen loads quickly on a mobile connection; tables are paginated; charts load after the page content.
- **Consistency:** one set of components and spacing; the same status pills, money and date formats on every screen, in both themes.
- **Safety in the interface:** destructive or final actions (submit payroll, approve, decline an anomaly) ask for confirmation; no personal or bank data is written to the browser console or the URL.
- **Language and format:** English; amounts in Ghana cedis (GHS), dates as 02 Nov 2026.

## 13. Build plan and acceptance criteria

The frontend is built in six steps, each demoable on its own. No dates are set; they depend on available time after the defense.

| Step | Scope | Done when |
| --- | --- | --- |
| 1. Foundation | Next.js and Tailwind project, light and dark tokens, theme toggle, sidebar and top bar, role-based navigation, sign-in with mock users | Each of the five mock users signs in, sees only their sidebar items, and the theme switches with no flash and no unreadable text |
| 2. Employee side | Clock-in screen, attendance list, my payslips, my attendance chart | An employee can clock in and out, see the entry in the list, and open and print a payslip |
| 3. HR/Payroll dashboard (first demo) | Summary cards, payroll cost chart, payroll status chart, payroll table, payroll run and detail screens | Matches the two references in structure; table search, filters, pagination and export work; charts show tooltips, empty and loading states; works in both themes |
| 4. Controls | Anomaly queue and review, approvals with the stage stepper, anomalies-by-rule and overtime charts | An anomaly can be resolved only with a note; a run moves through all three approval stages and the stepper shows who approved |
| 5. EWA and admin | EWA request and limit check, EWA usage chart, settings, audit trail, reports | Changing an EWA limit in Settings changes the check on the employee screen and creates an audit entry |
| 6. Offline and polish | Connection indicator, pending and sync states, empty and loading states, responsive and accessibility pass | Every state in section 10 can be demoed; keyboard-only run through each role's main task; contrast check passes in both themes |

Step 3 is the first thing to show a supervisor, because it is the screen that looks most like the two references. Steps 1 and 3 together are the minimum for that demo.

## 14. Risks and notes

| Risk | Mitigation |
| --- | --- |
| Statutory rates change (PAYE bands were amended in 2026) | Rates are configuration with effective dates; bands were checked against the GRA page on 03 Nov 2026 and should be rechecked before the evaluation |
| Approval sequence differs at Sunda | The stepper reads its stages from the rules object, so a changed sequence needs no screen changes |
| Dark mode doubles the visual testing | Test components in both themes from step 1, not at the end |
| Mock data hides real-data problems (long names, large tables) | The generator can produce 2,836 employees; test pagination at that size |
| System name may change again | Name stored in one constant plus one logo component |

## 15. Definition of done for the frontend

- All screens in section 7 exist for the roles in section 6, on mock data.
- All seven charts in section 9 work with tooltips, empty and loading states, in both themes.
- Every offline state in section 10 can be demonstrated.
- Keyboard and contrast checks pass for each role's main task.
- No screen reads mock files directly; all data comes through `lib/data`.
- The rules in section 8 can be edited in Settings and the change is visible in the screens that use them and in the audit trail.
