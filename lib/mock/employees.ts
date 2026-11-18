import { Employee, Department, EmployeeStatus } from "../types";

const FIRST_NAMES = [
  "Akua", "Kwame", "Kofi", "Abena", "Yaw", "Ama", "Kojo", "Efua", "Kwesi", "Adwoa",
  "Fiifi", "Esi", "Nana", "Afia", "Kwabena", "Yaa", "Baffour", "Akosua", "Edem", "Sena",
  "Selorm", "Dzifa", "Kafui", "Mawuli", "Eyram", "Tetteh", "Naa", "Nii", "Ofori", "Agyeman",
];

const LAST_NAMES = [
  "Mensah", "Osei", "Owusu", "Boateng", "Asante", "Appiah", "Acheampong", "amoah", "Agyei", "Frimpong",
  "Boadu", "Danso", "Gyamfi", "Kumi", "Opoku", "Sarpong", "Tetteh", "Quaye", "Lartey", "Bortey",
  "Gbedemah", "Agbeko", "Dogbe", "Ankrah", "badu", "nyarko", "Donkor", "Antwi", "Yeboah", "wiredu",
];

const DEPARTMENTS: Department[] = [
  "Manufacturing & Assembly",
  "Logistics & Warehouse",
  "Sales & Distribution",
  "Finance & Accounting",
  "HR & Corporate Admin",
];

const JOB_TITLES: Record<Department, string[]> = {
  "Manufacturing & Assembly": [
    "Plant Operator",
    "Line Technician",
    "Quality Assurance Inspector",
    "Shift Supervisor",
    "Process Engineer",
  ],
  "Logistics & Warehouse": [
    "Inventory Coordinator",
    "Forklift Operator",
    "Fleet Dispatcher",
    "Warehouse Supervisor",
    "Supply Chain Analyst",
  ],
  "Sales & Distribution": [
    "Regional Sales Executive",
    "Key Account Officer",
    "Trade Marketing Rep",
    "Distribution Coordinator",
    "Commercial Lead",
  ],
  "Finance & Accounting": [
    "Accounts Payable Officer",
    "Payroll & Tax Accountant",
    "Treasury Analyst",
    "Senior Finance Officer",
    "Cost Controller",
  ],
  "HR & Corporate Admin": [
    "HR & Payroll Officer",
    "People Operations Specialist",
    "Compliance & Audit Officer",
    "Systems Administrator",
    "Facilities Coordinator",
  ],
};

const BANKS = [
  "GCB Bank",
  "Ecobank Ghana",
  "Stanbic Bank",
  "Fidelity Bank",
  "Absa Bank Ghana",
  "CalBank",
];

function cap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generates deterministic fictional employees for Sunda Ghana Limited.
 * Default count is 60, and supports generating 2,836 (Sunda's permanent workforce)
 * to test table pagination and chart performance as specified in PRD 11.2.
 */
export function generateEmployees(count: number = 60): Employee[] {
  const list: Employee[] = [];

  // Seed first 5 employees matching our 5 demo users + PRD Section 8 test case (GHS 5,000.00 basic)
  const seeded: Partial<Employee>[] = [
    {
      id: "emp-001",
      staffId: "SGL-1001",
      firstName: "Akua",
      lastName: "Mensah",
      department: "HR & Corporate Admin",
      jobTitle: "HR & Payroll Officer",
      basicSalaryPesewas: 500000, // Exact PRD Section 8 test case: GHS 5,000.00
      transportAllowancePesewas: 0,
      housingAllowancePesewas: 0,
      bankName: "Ecobank Ghana",
      bankAccountNumber: "144100284821",
      status: "Active",
    },
    {
      id: "emp-002",
      staffId: "SGL-1002",
      firstName: "Kwame",
      lastName: "Osei",
      department: "Manufacturing & Assembly",
      jobTitle: "Line Technician",
      basicSalaryPesewas: 380000, // GHS 3,800.00
      transportAllowancePesewas: 40000,
      housingAllowancePesewas: 30000,
      bankName: "GCB Bank",
      bankAccountNumber: "101129384910",
      status: "Active",
    },
    {
      id: "emp-003",
      staffId: "SGL-1003",
      firstName: "Kofi",
      lastName: "Owusu",
      department: "Manufacturing & Assembly",
      jobTitle: "Shift Supervisor",
      basicSalaryPesewas: 620000, // GHS 6,200.00
      transportAllowancePesewas: 60000,
      housingAllowancePesewas: 50000,
      bankName: "Stanbic Bank",
      bankAccountNumber: "904000381726",
      status: "Active",
    },
    {
      id: "emp-004",
      staffId: "SGL-1004",
      firstName: "Abena",
      lastName: "Boateng",
      department: "Finance & Accounting",
      jobTitle: "Senior Finance Officer",
      basicSalaryPesewas: 780000, // GHS 7,800.00
      transportAllowancePesewas: 80000,
      housingAllowancePesewas: 70000,
      bankName: "Absa Bank Ghana",
      bankAccountNumber: "034199283745",
      status: "Active",
    },
    {
      id: "emp-005",
      staffId: "SGL-1005",
      firstName: "Yaw",
      lastName: "Asante",
      department: "HR & Corporate Admin",
      jobTitle: "Systems Administrator",
      basicSalaryPesewas: 720000, // GHS 7,200.00
      transportAllowancePesewas: 65000,
      housingAllowancePesewas: 55000,
      bankName: "Fidelity Bank",
      bankAccountNumber: "240019283711",
      status: "Active",
    },
    // Exact Sunda Ghana Excel Formula Sheet Employees (Row 1, 2, 3)
    {
      id: "emp-006",
      staffId: "100001",
      firstName: "Jane",
      lastName: "Doe",
      department: "Manufacturing & Assembly", // Production
      jobTitle: "Main Plant Operator (Excel Row 1)",
      seniorityLevel: "Seniors",
      joinDate: "2015-07-23",
      basicSalaryPesewas: 300800, // Basic Wage STD: GHS 3,008.00
      positionStdPesewas: 133000, // Position STD: GHS 1,330.00
      performanceStdPesewas: 144600, // Performance STD: GHS 1,446.00
      transportAllowancePesewas: 0,
      housingAllowancePesewas: 0,
      bankName: "Ecobank Ghana",
      bankAccountNumber: "144100881001",
      status: "Active",
    },
    {
      id: "emp-007",
      staffId: "100002",
      firstName: "John",
      lastName: "Doe",
      department: "Logistics & Warehouse", // Packaging
      jobTitle: "Packaging Supervisor (Excel Row 2)",
      seniorityLevel: "Seniors",
      joinDate: "2015-12-22",
      basicSalaryPesewas: 94000, // Basic Wage STD: GHS 940.00
      positionStdPesewas: 174300, // Position STD: GHS 1,743.00
      performanceStdPesewas: 33000, // Performance STD: GHS 330.00
      transportAllowancePesewas: 0,
      housingAllowancePesewas: 0,
      bankName: "Ecobank Ghana",
      bankAccountNumber: "144100998877",
      status: "Active",
    },
    {
      id: "emp-008",
      staffId: "100003",
      firstName: "Ama",
      lastName: "Kwabena",
      department: "Sales & Distribution", // Distribution
      jobTitle: "Distribution Lead (Excel Row 3)",
      seniorityLevel: "Seniors",
      joinDate: "2015-12-21",
      basicSalaryPesewas: 251900, // Basic Wage STD: GHS 2,519.00
      positionStdPesewas: 111500, // Position STD: GHS 1,115.00
      performanceStdPesewas: 121100, // Performance STD: GHS 1,211.00
      transportAllowancePesewas: 0,
      housingAllowancePesewas: 0,
      bankName: "GCB Bank",
      bankAccountNumber: "101129881003",
      status: "Active",
    },
  ];

  for (let i = 0; i < count; i++) {
    const idx = i + 1;
    const id = `emp-${String(idx).padStart(3, "0")}`;
    const staffId = `SGL-${1000 + idx}`;

    if (i < seeded.length) {
      const s = seeded[i];
      const fullName = `${s.firstName} ${s.lastName}`;
      list.push({
        id: s.id!,
        staffId: s.staffId!,
        firstName: s.firstName!,
        lastName: s.lastName!,
        fullName,
        email: `${s.firstName!.toLowerCase()}.${s.lastName!.toLowerCase()}@sundaghana.com`,
        phone: `+233 24 ${String(4100000 + idx * 137).slice(0, 7)}`,
        department: s.department!,
        jobTitle: s.jobTitle!,
        status: s.status!,
        employmentType: "Permanent",
        seniorityLevel: s.seniorityLevel ?? "Seniors",
        joinDate: s.joinDate ?? `2023-0${(i % 8) + 1}-15`,
        basicSalaryPesewas: s.basicSalaryPesewas!,
        positionStdPesewas: s.positionStdPesewas,
        performanceStdPesewas: s.performanceStdPesewas,
        transportAllowancePesewas: s.transportAllowancePesewas!,
        housingAllowancePesewas: s.housingAllowancePesewas!,
        bankName: s.bankName!,
        bankAccountNumber: s.bankAccountNumber!,
        ssnitNumber: `C00${8421000 + idx}`,
        ghanaCardNumber: `GHA-${721450000 + idx}-${idx % 9}`,
      });
      continue;
    }

    const firstName = FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length];
    const lastName = cap(LAST_NAMES[(i * 11 + 5) % LAST_NAMES.length]);
    const fullName = `${firstName} ${lastName}`;

    // Weighted department distribution (Manufacturing & Logistics largest at Sunda)
    const deptWeights: Department[] = [
      "Manufacturing & Assembly",
      "Manufacturing & Assembly",
      "Logistics & Warehouse",
      "Sales & Distribution",
      "Finance & Accounting",
      "HR & Corporate Admin",
    ];
    const department = deptWeights[i % deptWeights.length];
    const titles = JOB_TITLES[department];
    const jobTitle = titles[i % titles.length];

    // Intentional anomaly seeds for specific employees:
    // emp-012 & emp-018: Inactive / Terminated employees
    let status: EmployeeStatus = "Active";
    if (idx === 12) status = "Inactive";
    if (idx === 18) status = "Terminated";

    // Salary bands between GHS 2,600 and GHS 11,500
    const baseSteps = [280000, 320000, 360000, 420000, 480000, 500000, 560000, 650000, 820000, 950000];
    const basicSalaryPesewas = baseSteps[i % baseSteps.length];
    const transportAllowancePesewas = idx === 1 ? 0 : Math.round(basicSalaryPesewas * 0.08);
    const housingAllowancePesewas = idx % 3 === 0 ? Math.round(basicSalaryPesewas * 0.1) : 0;

    // Intentional duplicate bank account for emp-007 and emp-014 (Duplicate account rule)
    let bankAccountNumber = `${102000000000 + idx * 91827}`;
    let bankName = BANKS[i % BANKS.length];
    if (idx === 7 || idx === 14) {
      bankAccountNumber = "144100998877";
      bankName = "Ecobank Ghana";
    }

    // Intentional missing SSNIT / Ghana Card for emp-009 & emp-021 (Inconsistent record rule)
    const ssnitNumber = idx === 9 ? "MISSING" : `C00${8421000 + idx}`;
    const ghanaCardNumber = idx === 21 ? "CONFLICT-ID" : `GHA-${721450000 + idx}-${idx % 9}`;

    list.push({
      id,
      staffId,
      firstName,
      lastName,
      fullName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@sundaghana.com`,
      phone: `+233 24 ${String(4100000 + idx * 313).slice(0, 7)}`,
      department,
      jobTitle,
      status,
      employmentType: "Permanent",
      joinDate: `202${1 + (i % 5)}-0${(i % 9) + 1}-10`,
      basicSalaryPesewas,
      transportAllowancePesewas,
      housingAllowancePesewas,
      bankName,
      bankAccountNumber,
      ssnitNumber,
      ghanaCardNumber,
    });
  }

  return list;
}

export const INITIAL_EMPLOYEES: Employee[] = generateEmployees(60);
