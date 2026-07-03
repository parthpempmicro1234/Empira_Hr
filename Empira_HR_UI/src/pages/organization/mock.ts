export type BusinessUnit = {
  id: string;
  name: string;
};

export type Department = {
  id: string;
  name: string;
  businessUnitId: string;
};

export type SubDepartment = {
  id: string;
  name: string;
  departmentId: string;
};

export type Employee = {
  id: string;
  code: string;
  displayName: string;
  initials: string;
  title: string;
  businessUnitId: string;
  departmentId: string;
  subDepartmentId?: string;
  location: string;
  workEmail: string;
  phone?: string;
  managerId?: string;
};

export type OrgNode = {
  id: string;
  employeeId: string;
  reports: OrgNode[];
};

export const businessUnits: BusinessUnit[] = [
  { id: 'bu-empiric', name: 'Empiric Infotech LLP' },
  { id: 'bu-products', name: 'Products' },
  { id: 'bu-services', name: 'Services' },
];

export const departments: Department[] = [
  { id: 'dep-mgmt', name: 'Management', businessUnitId: 'bu-empiric' },
  { id: 'dep-eng', name: 'Engineering', businessUnitId: 'bu-empiric' },
  { id: 'dep-hr', name: 'Human Resources', businessUnitId: 'bu-empiric' },
  { id: 'dep-sales', name: 'Sales', businessUnitId: 'bu-services' },
  { id: 'dep-design', name: 'Design', businessUnitId: 'bu-products' },
];

export const subDepartments: SubDepartment[] = [
  { id: 'sub-web', name: 'Web', departmentId: 'dep-eng' },
  { id: 'sub-ml', name: 'Machine Learning', departmentId: 'dep-eng' },
  { id: 'sub-ops', name: 'Operations', departmentId: 'dep-mgmt' },
  { id: 'sub-talent', name: 'Talent', departmentId: 'dep-hr' },
  { id: 'sub-product', name: 'Product', departmentId: 'dep-design' },
];

const EMP: Employee[] = [
  {
    id: 'e-pp',
    code: '176',
    displayName: 'Parth Patel',
    initials: 'PP',
    title: 'Python Developer',
    businessUnitId: 'bu-empiric',
    departmentId: 'dep-eng',
    subDepartmentId: 'sub-web',
    location: 'Adajan Surat',
    workEmail: 'parth.p@empiricinfotech.com',
    phone: '+91-9184165585',
    managerId: 'e-hk',
  },
  {
    id: 'e-hk',
    code: '024',
    displayName: 'Hemant Kewalramani',
    initials: 'HK',
    title: 'Software Developer',
    businessUnitId: 'bu-empiric',
    departmentId: 'dep-mgmt',
    subDepartmentId: 'sub-ops',
    location: 'Adajan Surat',
    workEmail: 'hk.empiric@gmail.com',
  },
  {
    id: 'e-mr',
    code: '301',
    displayName: 'Manali Rathod',
    initials: 'MR',
    title: 'Software Developer',
    businessUnitId: 'bu-empiric',
    departmentId: 'dep-eng',
    subDepartmentId: 'sub-web',
    location: 'Surat',
    workEmail: 'manali.r@empiricinfotech.com',
    managerId: 'e-hk',
  },
  {
    id: 'e-vb',
    code: '318',
    displayName: 'Vaishnav Bari',
    initials: 'VB',
    title: 'Python Developer',
    businessUnitId: 'bu-empiric',
    departmentId: 'dep-eng',
    subDepartmentId: 'sub-web',
    location: 'Surat',
    workEmail: 'vaishnav.b@empiricinfotech.com',
    managerId: 'e-hk',
  },
  {
    id: 'e-mp',
    code: '322',
    displayName: 'Mihir Patel',
    initials: 'MP',
    title: 'Software Developer',
    businessUnitId: 'bu-empiric',
    departmentId: 'dep-eng',
    subDepartmentId: 'sub-web',
    location: 'Ahmedabad',
    workEmail: 'mihir.p@empiricinfotech.com',
    managerId: 'e-hk',
  },
  {
    id: 'e-tk',
    code: '334',
    displayName: 'Tanvi Kulkarni',
    initials: 'TK',
    title: 'Machine Learning Engineer',
    businessUnitId: 'bu-empiric',
    departmentId: 'dep-eng',
    subDepartmentId: 'sub-ml',
    location: 'Pune',
    workEmail: 'tanvi.k@empiricinfotech.com',
    managerId: 'e-hk',
  },
  {
    id: 'e-as',
    code: '410',
    displayName: 'Aarav Shah',
    initials: 'AS',
    title: 'HR Executive',
    businessUnitId: 'bu-empiric',
    departmentId: 'dep-hr',
    subDepartmentId: 'sub-talent',
    location: 'Surat',
    workEmail: 'aarav.s@empiricinfotech.com',
    managerId: 'e-hk',
  },
  {
    id: 'e-np',
    code: '512',
    displayName: 'Nisha Patel',
    initials: 'NP',
    title: 'Product Designer',
    businessUnitId: 'bu-products',
    departmentId: 'dep-design',
    subDepartmentId: 'sub-product',
    location: 'Remote',
    workEmail: 'nisha.p@empiricinfotech.com',
    managerId: 'e-hk',
  },
  {
    id: 'e-rk',
    code: '540',
    displayName: 'Rohan Kapadia',
    initials: 'RK',
    title: 'Sales Executive',
    businessUnitId: 'bu-services',
    departmentId: 'dep-sales',
    location: 'Mumbai',
    workEmail: 'rohan.k@empiricinfotech.com',
    managerId: 'e-hk',
  },
];

// Expand to a scrollable dataset (UI-only).
export const employees: Employee[] = Array.from({ length: 28 }).flatMap((_, idx) => {
  const base = EMP[idx % EMP.length]!;
  const n = idx + 1;
  const suffix = n <= EMP.length ? '' : ` ${n}`;
  const code = String(Number(base.code) + idx).padStart(3, '0');
  return [
    {
      ...base,
      id: `${base.id}-${idx}`,
      code,
      displayName: `${base.displayName}${suffix}`,
      initials: base.initials,
      workEmail: base.workEmail.replace('@', `+${idx}@`),
    },
  ];
});

export function byId<T extends { id: string }>(items: T[], id: string | undefined) {
  return id ? items.find((x) => x.id === id) : undefined;
}

export function getDeptName(depId: string) {
  return departments.find((d) => d.id === depId)?.name ?? '—';
}

export function getBuName(buId: string) {
  return businessUnits.find((b) => b.id === buId)?.name ?? '—';
}

export function getSubDeptName(subId?: string) {
  return subDepartments.find((s) => s.id === subId)?.name ?? '—';
}

export const orgDataCompany: OrgNode = {
  id: 'root',
  employeeId: employees[1]?.id ?? 'e-hk',
  reports: [
    { id: 'n1', employeeId: employees[0]?.id ?? 'e-pp', reports: [] },
    { id: 'n2', employeeId: employees[2]?.id ?? 'e-mr', reports: [] },
    { id: 'n3', employeeId: employees[3]?.id ?? 'e-vb', reports: [] },
    { id: 'n4', employeeId: employees[4]?.id ?? 'e-mp', reports: [] },
    { id: 'n5', employeeId: employees[5]?.id ?? 'e-tk', reports: [] },
  ],
};

export const orgDataDepartment: OrgNode = {
  id: 'root-dep',
  employeeId: employees[1]?.id ?? 'e-hk',
  reports: [
    { id: 'd1', employeeId: employees[0]?.id ?? 'e-pp', reports: [] },
    { id: 'd2', employeeId: employees[2]?.id ?? 'e-mr', reports: [] },
    { id: 'd3', employeeId: employees[3]?.id ?? 'e-vb', reports: [] },
  ],
};

export const orgDataMe: OrgNode = {
  id: 'root-me',
  employeeId: employees[0]?.id ?? 'e-pp',
  reports: [
    { id: 'm1', employeeId: employees[6]?.id ?? 'e-as', reports: [] },
    { id: 'm2', employeeId: employees[7]?.id ?? 'e-np', reports: [] },
  ],
};

