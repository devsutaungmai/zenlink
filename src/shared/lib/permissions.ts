// Permission definitions for the role-based access control system

export const PERMISSION_CATEGORIES = {
  DASHBOARD: 'Dashboard',
  EMPLOYEES: 'Employees',
  SCHEDULE: 'Schedule',
  ATTENDANCE: 'Attendance',
  PAYROLL: 'Payroll',
  REPORTS: 'Reports',
  SETTINGS: 'Settings',
  DEPARTMENTS: 'Departments',
  CATEGORIES: 'Categories',
  FUNCTIONS: 'Functions',
  ROLES: 'Roles & Permissions',
  INVOICES: 'Invoices',
  CUSTOMERS: 'Customers',
  PRODUCTS: 'Products',
  EVENTS: 'Events',
} as const

export type PermissionCategory = typeof PERMISSION_CATEGORIES[keyof typeof PERMISSION_CATEGORIES]

// All available permissions in the system
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Employees
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_VIEW_ALL: 'employees.view_all', // View all employees regardless of department
  EMPLOYEES_VIEW_CONTACT: 'employees.view_contact', // View contact info (phone, email)
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_INVITE: 'employees.invite',
  EMPLOYEES_SET_PIN: 'employees.set_pin',
  EMPLOYEES_VIEW_SENSITIVE: 'employees.view_sensitive', // SSN, bank account, etc.
  
  // Departments
  DEPARTMENTS_VIEW: 'departments.view',
  DEPARTMENTS_CREATE: 'departments.create',
  DEPARTMENTS_EDIT: 'departments.edit',
  DEPARTMENTS_DELETE: 'departments.delete',
  
  // Employee Groups
  EMPLOYEE_GROUPS_VIEW: 'employee_groups.view',
  EMPLOYEE_GROUPS_CREATE: 'employee_groups.create',
  EMPLOYEE_GROUPS_EDIT: 'employee_groups.edit',
  EMPLOYEE_GROUPS_DELETE: 'employee_groups.delete',
  
  // Schedule
  SCHEDULE_VIEW: 'schedule.view',
  SCHEDULE_VIEW_ALL: 'schedule.view_all', // View all departments
  SCHEDULE_CREATE: 'schedule.create',
  SCHEDULE_EDIT: 'schedule.edit',
  SCHEDULE_DELETE: 'schedule.delete',
  SCHEDULE_PUBLISH: 'schedule.publish',
  SCHEDULE_TEMPLATES: 'schedule.templates',
  
  // Shifts
  SHIFTS_VIEW: 'shifts.view',
  SHIFTS_CREATE: 'shifts.create',
  SHIFTS_EDIT: 'shifts.edit',
  SHIFTS_DELETE: 'shifts.delete',
  SHIFTS_EXCHANGE_APPROVE: 'shifts.exchange_approve',
  
  // Attendance
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_VIEW_ALL: 'attendance.view_all',
  ATTENDANCE_VIEW_OWN_HOURS: 'attendance.view_own_hours',
  ATTENDANCE_CLOCK_IN_OUT: 'attendance.clock_in_out',
  ATTENDANCE_EDIT: 'attendance.edit',
  ATTENDANCE_APPROVE: 'attendance.approve',
  
  // Punch Clock
  PUNCH_CLOCK_SETTINGS: 'punch_clock.settings',
  
  // Availability
  AVAILABILITY_VIEW: 'availability.view',
  AVAILABILITY_EDIT: 'availability.edit',
  AVAILABILITY_APPROVE: 'availability.approve',
  
  // Sick Leave
  SICK_LEAVE_VIEW: 'sick_leave.view',
  SICK_LEAVE_CREATE: 'sick_leave.create',
  SICK_LEAVE_APPROVE: 'sick_leave.approve',
  
  // Payroll
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_PERIODS_MANAGE: 'payroll.periods_manage',
  PAYROLL_ENTRIES_VIEW: 'payroll.entries_view',
  PAYROLL_ENTRIES_EDIT: 'payroll.entries_edit',
  PAYROLL_EXPORT: 'payroll.export',
  PAY_RULES_VIEW: 'pay_rules.view',
  PAY_RULES_MANAGE: 'pay_rules.manage',
  SALARY_CODES_MANAGE: 'salary_codes.manage',
  OVERTIME_RULES_MANAGE: 'overtime_rules.manage',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_PAYROLL: 'reports.payroll',
  REPORTS_ATTENDANCE: 'reports.attendance',
  REPORTS_HOURS: 'reports.hours',
  REPORTS_EXPORT: 'reports.export',
  
  // Contracts
  CONTRACTS_VIEW: 'contracts.view',
  CONTRACTS_CREATE: 'contracts.create',
  CONTRACTS_EDIT: 'contracts.edit',
  CONTRACTS_DELETE: 'contracts.delete',
  CONTRACT_TEMPLATES_MANAGE: 'contract_templates.manage',
  
  // Dashboard
  DASHBOARD_VIEW_STATS: 'dashboard.view_stats',
  DASHBOARD_VIEW_WEEKLY_SHIFTS: 'dashboard.view_weekly_shifts',
  DASHBOARD_VIEW_MOST_ACTIVE: 'dashboard.view_most_active',
  DASHBOARD_VIEW_SHIFT_COMPLETION: 'dashboard.view_shift_completion',
  DASHBOARD_VIEW_ATTENDANCE_FEED: 'dashboard.view_attendance_feed',
  
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_BUSINESS: 'settings.business',
  SETTINGS_LABOR_LAW: 'settings.labor_law',
  SETTINGS_SHIFT_TYPES: 'settings.shift_types',
  SETTINGS_PEOPLE_GENERAL: 'settings.people_general',
  
  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_EDIT: 'categories.edit',
  CATEGORIES_DELETE: 'categories.delete',
  
  // Functions
  FUNCTIONS_VIEW: 'functions.view',
  FUNCTIONS_CREATE: 'functions.create',
  FUNCTIONS_EDIT: 'functions.edit',
  FUNCTIONS_DELETE: 'functions.delete',
  
  // Roles & Permissions
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN: 'roles.assign',
  
  // Invoices
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_DELETE: 'invoices.delete',
  INVOICES_SEND: 'invoices.send',
  INVOICES_EXPORT: 'invoices.export',
  INVOICES_MARK_PAID: 'invoices.mark_paid',
  INVOICES_CREDIT_NOTE: 'invoices.credit_note',
  INVOICES_SETTINGS: 'invoices.settings',
  
  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_SETTINGS: 'customers.settings',
  
  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_SETTINGS: 'products.settings',
  
  // Events
  EVENTS_VIEW: 'events.view',
  EVENTS_CREATE: 'events.create',
  EVENTS_EDIT: 'events.edit',
  EVENTS_DELETE: 'events.delete',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Permission metadata for display in UI
export interface PermissionInfo {
  code: Permission
  name: string
  description: string
  category: PermissionCategory
}

export const PERMISSION_INFO: Record<Permission, PermissionInfo> = {
  // Dashboard
  [PERMISSIONS.DASHBOARD_VIEW]: {
    code: PERMISSIONS.DASHBOARD_VIEW,
    name: 'View Dashboard',
    description: 'Access to the main dashboard',
    category: PERMISSION_CATEGORIES.DASHBOARD,
  },
  
  // Employees
  [PERMISSIONS.EMPLOYEES_VIEW]: {
    code: PERMISSIONS.EMPLOYEES_VIEW,
    name: 'View Employees',
    description: 'View employee list and basic details',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_VIEW_ALL]: {
    code: PERMISSIONS.EMPLOYEES_VIEW_ALL,
    name: 'View All Employees',
    description: 'View all employees regardless of department restrictions',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_VIEW_CONTACT]: {
    code: PERMISSIONS.EMPLOYEES_VIEW_CONTACT,
    name: 'View Contact Info',
    description: 'View employee contact information (phone, email)',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_CREATE]: {
    code: PERMISSIONS.EMPLOYEES_CREATE,
    name: 'Create Employees',
    description: 'Add new employees to the system',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_EDIT]: {
    code: PERMISSIONS.EMPLOYEES_EDIT,
    name: 'Edit Employees',
    description: 'Modify employee information',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_DELETE]: {
    code: PERMISSIONS.EMPLOYEES_DELETE,
    name: 'Delete Employees',
    description: 'Remove employees from the system',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_VIEW_SENSITIVE]: {
    code: PERMISSIONS.EMPLOYEES_VIEW_SENSITIVE,
    name: 'View Sensitive Data',
    description: 'Access sensitive employee data (SSN, bank account)',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_INVITE]: {
    code: PERMISSIONS.EMPLOYEES_INVITE,
    name: 'Send Invitations',
    description: 'Send email invitations to employees',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.EMPLOYEES_SET_PIN]: {
    code: PERMISSIONS.EMPLOYEES_SET_PIN,
    name: 'Set Employee PIN',
    description: 'Set or reset employee PIN codes',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  
  // Departments
  [PERMISSIONS.DEPARTMENTS_VIEW]: {
    code: PERMISSIONS.DEPARTMENTS_VIEW,
    name: 'View Departments',
    description: 'View department list',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  [PERMISSIONS.DEPARTMENTS_CREATE]: {
    code: PERMISSIONS.DEPARTMENTS_CREATE,
    name: 'Create Departments',
    description: 'Add new departments',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  [PERMISSIONS.DEPARTMENTS_EDIT]: {
    code: PERMISSIONS.DEPARTMENTS_EDIT,
    name: 'Edit Departments',
    description: 'Modify department settings',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  [PERMISSIONS.DEPARTMENTS_DELETE]: {
    code: PERMISSIONS.DEPARTMENTS_DELETE,
    name: 'Delete Departments',
    description: 'Remove departments',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  
  // Employee Groups
  [PERMISSIONS.EMPLOYEE_GROUPS_VIEW]: {
    code: PERMISSIONS.EMPLOYEE_GROUPS_VIEW,
    name: 'View Employee Groups',
    description: 'View employee groups list',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  [PERMISSIONS.EMPLOYEE_GROUPS_CREATE]: {
    code: PERMISSIONS.EMPLOYEE_GROUPS_CREATE,
    name: 'Create Employee Groups',
    description: 'Add new employee groups',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  [PERMISSIONS.EMPLOYEE_GROUPS_EDIT]: {
    code: PERMISSIONS.EMPLOYEE_GROUPS_EDIT,
    name: 'Edit Employee Groups',
    description: 'Modify employee group settings',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  [PERMISSIONS.EMPLOYEE_GROUPS_DELETE]: {
    code: PERMISSIONS.EMPLOYEE_GROUPS_DELETE,
    name: 'Delete Employee Groups',
    description: 'Remove employee groups',
    category: PERMISSION_CATEGORIES.DEPARTMENTS,
  },
  
  // Schedule
  [PERMISSIONS.SCHEDULE_VIEW]: {
    code: PERMISSIONS.SCHEDULE_VIEW,
    name: 'View Schedule',
    description: 'View own or team schedule',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SCHEDULE_VIEW_ALL]: {
    code: PERMISSIONS.SCHEDULE_VIEW_ALL,
    name: 'View All Schedules',
    description: 'View schedules for all departments',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SCHEDULE_CREATE]: {
    code: PERMISSIONS.SCHEDULE_CREATE,
    name: 'Create Schedule',
    description: 'Create new schedules and shifts',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SCHEDULE_EDIT]: {
    code: PERMISSIONS.SCHEDULE_EDIT,
    name: 'Edit Schedule',
    description: 'Modify existing schedules',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SCHEDULE_DELETE]: {
    code: PERMISSIONS.SCHEDULE_DELETE,
    name: 'Delete Schedule',
    description: 'Remove schedules and shifts',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SCHEDULE_PUBLISH]: {
    code: PERMISSIONS.SCHEDULE_PUBLISH,
    name: 'Publish Schedule',
    description: 'Publish schedules to employees',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SCHEDULE_TEMPLATES]: {
    code: PERMISSIONS.SCHEDULE_TEMPLATES,
    name: 'Manage Templates',
    description: 'Create and manage schedule templates',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  
  // Shifts
  [PERMISSIONS.SHIFTS_VIEW]: {
    code: PERMISSIONS.SHIFTS_VIEW,
    name: 'View Shifts',
    description: 'View shift details',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SHIFTS_CREATE]: {
    code: PERMISSIONS.SHIFTS_CREATE,
    name: 'Create Shifts',
    description: 'Create new shifts',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SHIFTS_EDIT]: {
    code: PERMISSIONS.SHIFTS_EDIT,
    name: 'Edit Shifts',
    description: 'Modify shift details',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SHIFTS_DELETE]: {
    code: PERMISSIONS.SHIFTS_DELETE,
    name: 'Delete Shifts',
    description: 'Remove shifts',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.SHIFTS_EXCHANGE_APPROVE]: {
    code: PERMISSIONS.SHIFTS_EXCHANGE_APPROVE,
    name: 'Approve Shift Exchanges',
    description: 'Approve or reject shift exchange requests',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  
  // Attendance
  [PERMISSIONS.ATTENDANCE_VIEW]: {
    code: PERMISSIONS.ATTENDANCE_VIEW,
    name: 'View Attendance',
    description: 'View own attendance records',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  [PERMISSIONS.ATTENDANCE_VIEW_ALL]: {
    code: PERMISSIONS.ATTENDANCE_VIEW_ALL,
    name: 'View All Attendance',
    description: 'View attendance for all employees',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  [PERMISSIONS.ATTENDANCE_VIEW_OWN_HOURS]: {
    code: PERMISSIONS.ATTENDANCE_VIEW_OWN_HOURS,
    name: 'View Own Hours',
    description: 'View own working hours and attendance history',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  [PERMISSIONS.ATTENDANCE_CLOCK_IN_OUT]: {
    code: PERMISSIONS.ATTENDANCE_CLOCK_IN_OUT,
    name: 'Clock In/Out',
    description: 'Record own clock in/out',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  [PERMISSIONS.ATTENDANCE_EDIT]: {
    code: PERMISSIONS.ATTENDANCE_EDIT,
    name: 'Edit Attendance',
    description: 'Modify attendance records',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  [PERMISSIONS.ATTENDANCE_APPROVE]: {
    code: PERMISSIONS.ATTENDANCE_APPROVE,
    name: 'Approve Attendance',
    description: 'Approve or reject attendance records',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  
  // Punch Clock
  [PERMISSIONS.PUNCH_CLOCK_SETTINGS]: {
    code: PERMISSIONS.PUNCH_CLOCK_SETTINGS,
    name: 'Punch Clock Settings',
    description: 'Configure punch clock settings',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  
  // Availability
  [PERMISSIONS.AVAILABILITY_VIEW]: {
    code: PERMISSIONS.AVAILABILITY_VIEW,
    name: 'View Availability',
    description: 'View employee availability',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.AVAILABILITY_EDIT]: {
    code: PERMISSIONS.AVAILABILITY_EDIT,
    name: 'Edit Availability',
    description: 'Set own availability',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  [PERMISSIONS.AVAILABILITY_APPROVE]: {
    code: PERMISSIONS.AVAILABILITY_APPROVE,
    name: 'Approve Availability',
    description: 'Approve availability requests',
    category: PERMISSION_CATEGORIES.SCHEDULE,
  },
  
  // Sick Leave
  [PERMISSIONS.SICK_LEAVE_VIEW]: {
    code: PERMISSIONS.SICK_LEAVE_VIEW,
    name: 'View Sick Leave',
    description: 'View sick leave records',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  [PERMISSIONS.SICK_LEAVE_CREATE]: {
    code: PERMISSIONS.SICK_LEAVE_CREATE,
    name: 'Create Sick Leave',
    description: 'Report sick leave',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  [PERMISSIONS.SICK_LEAVE_APPROVE]: {
    code: PERMISSIONS.SICK_LEAVE_APPROVE,
    name: 'Approve Sick Leave',
    description: 'Approve or process sick leave requests',
    category: PERMISSION_CATEGORIES.ATTENDANCE,
  },
  
  // Payroll
  [PERMISSIONS.PAYROLL_VIEW]: {
    code: PERMISSIONS.PAYROLL_VIEW,
    name: 'View Payroll',
    description: 'View payroll information',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.PAYROLL_PERIODS_MANAGE]: {
    code: PERMISSIONS.PAYROLL_PERIODS_MANAGE,
    name: 'Manage Payroll Periods',
    description: 'Create and manage payroll periods',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.PAYROLL_ENTRIES_VIEW]: {
    code: PERMISSIONS.PAYROLL_ENTRIES_VIEW,
    name: 'View Payroll Entries',
    description: 'View payroll entries',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.PAYROLL_ENTRIES_EDIT]: {
    code: PERMISSIONS.PAYROLL_ENTRIES_EDIT,
    name: 'Edit Payroll Entries',
    description: 'Modify payroll entries',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.PAYROLL_EXPORT]: {
    code: PERMISSIONS.PAYROLL_EXPORT,
    name: 'Export Payroll',
    description: 'Export payroll data',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.PAY_RULES_VIEW]: {
    code: PERMISSIONS.PAY_RULES_VIEW,
    name: 'View Pay Rules',
    description: 'View pay rules configuration',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.PAY_RULES_MANAGE]: {
    code: PERMISSIONS.PAY_RULES_MANAGE,
    name: 'Manage Pay Rules',
    description: 'Create and modify pay rules',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.SALARY_CODES_MANAGE]: {
    code: PERMISSIONS.SALARY_CODES_MANAGE,
    name: 'Manage Salary Codes',
    description: 'Create and modify salary codes',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  [PERMISSIONS.OVERTIME_RULES_MANAGE]: {
    code: PERMISSIONS.OVERTIME_RULES_MANAGE,
    name: 'Manage Overtime Rules',
    description: 'Configure overtime rules',
    category: PERMISSION_CATEGORIES.PAYROLL,
  },
  
  // Reports
  [PERMISSIONS.REPORTS_VIEW]: {
    code: PERMISSIONS.REPORTS_VIEW,
    name: 'View Reports',
    description: 'Access reports section',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  [PERMISSIONS.REPORTS_PAYROLL]: {
    code: PERMISSIONS.REPORTS_PAYROLL,
    name: 'Payroll Reports',
    description: 'View payroll reports',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  [PERMISSIONS.REPORTS_ATTENDANCE]: {
    code: PERMISSIONS.REPORTS_ATTENDANCE,
    name: 'Attendance Reports',
    description: 'View attendance reports',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  [PERMISSIONS.REPORTS_HOURS]: {
    code: PERMISSIONS.REPORTS_HOURS,
    name: 'Hours Reports',
    description: 'View hours/time reports',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  [PERMISSIONS.REPORTS_EXPORT]: {
    code: PERMISSIONS.REPORTS_EXPORT,
    name: 'Export Reports',
    description: 'Export report data',
    category: PERMISSION_CATEGORIES.REPORTS,
  },
  
  // Contracts
  [PERMISSIONS.CONTRACTS_VIEW]: {
    code: PERMISSIONS.CONTRACTS_VIEW,
    name: 'View Contracts',
    description: 'View employee contracts',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.CONTRACTS_CREATE]: {
    code: PERMISSIONS.CONTRACTS_CREATE,
    name: 'Create Contracts',
    description: 'Create new contracts',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.CONTRACTS_EDIT]: {
    code: PERMISSIONS.CONTRACTS_EDIT,
    name: 'Edit Contracts',
    description: 'Modify contracts',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.CONTRACTS_DELETE]: {
    code: PERMISSIONS.CONTRACTS_DELETE,
    name: 'Delete Contracts',
    description: 'Remove contracts',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  [PERMISSIONS.CONTRACT_TEMPLATES_MANAGE]: {
    code: PERMISSIONS.CONTRACT_TEMPLATES_MANAGE,
    name: 'Manage Contract Templates',
    description: 'Create and modify contract templates',
    category: PERMISSION_CATEGORIES.EMPLOYEES,
  },
  
  // Dashboard
  [PERMISSIONS.DASHBOARD_VIEW_STATS]: {
    code: PERMISSIONS.DASHBOARD_VIEW_STATS,
    name: 'View Dashboard Stats',
    description: 'View overall dashboard statistics',
    category: PERMISSION_CATEGORIES.DASHBOARD,
  },
  [PERMISSIONS.DASHBOARD_VIEW_WEEKLY_SHIFTS]: {
    code: PERMISSIONS.DASHBOARD_VIEW_WEEKLY_SHIFTS,
    name: 'View Weekly Shifts',
    description: 'View weekly shifts overview on dashboard',
    category: PERMISSION_CATEGORIES.DASHBOARD,
  },
  [PERMISSIONS.DASHBOARD_VIEW_MOST_ACTIVE]: {
    code: PERMISSIONS.DASHBOARD_VIEW_MOST_ACTIVE,
    name: 'View Most Active Employee',
    description: 'View most active employee statistics',
    category: PERMISSION_CATEGORIES.DASHBOARD,
  },
  [PERMISSIONS.DASHBOARD_VIEW_SHIFT_COMPLETION]: {
    code: PERMISSIONS.DASHBOARD_VIEW_SHIFT_COMPLETION,
    name: 'View Shift Completion',
    description: 'View shift completion chart and statistics',
    category: PERMISSION_CATEGORIES.DASHBOARD,
  },
  [PERMISSIONS.DASHBOARD_VIEW_ATTENDANCE_FEED]: {
    code: PERMISSIONS.DASHBOARD_VIEW_ATTENDANCE_FEED,
    name: 'View Attendance Feed',
    description: 'View recent attendance activity feed',
    category: PERMISSION_CATEGORIES.DASHBOARD,
  },
  
  // Settings
  [PERMISSIONS.SETTINGS_VIEW]: {
    code: PERMISSIONS.SETTINGS_VIEW,
    name: 'View Settings',
    description: 'Access settings section',
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  [PERMISSIONS.SETTINGS_BUSINESS]: {
    code: PERMISSIONS.SETTINGS_BUSINESS,
    name: 'Business Settings',
    description: 'Modify business settings',
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  [PERMISSIONS.SETTINGS_LABOR_LAW]: {
    code: PERMISSIONS.SETTINGS_LABOR_LAW,
    name: 'Labor Law Settings',
    description: 'Configure labor law settings',
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  [PERMISSIONS.SETTINGS_SHIFT_TYPES]: {
    code: PERMISSIONS.SETTINGS_SHIFT_TYPES,
    name: 'Manage Shift Types',
    description: 'Configure shift types',
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  [PERMISSIONS.SETTINGS_PEOPLE_GENERAL]: {
    code: PERMISSIONS.SETTINGS_PEOPLE_GENERAL,
    name: 'People General Settings',
    description: 'Configure employee management settings',
    category: PERMISSION_CATEGORIES.SETTINGS,
  },
  
  // Categories
  [PERMISSIONS.CATEGORIES_VIEW]: {
    code: PERMISSIONS.CATEGORIES_VIEW,
    name: 'View Categories',
    description: 'View department categories',
    category: PERMISSION_CATEGORIES.CATEGORIES,
  },
  [PERMISSIONS.CATEGORIES_CREATE]: {
    code: PERMISSIONS.CATEGORIES_CREATE,
    name: 'Create Categories',
    description: 'Create new department categories',
    category: PERMISSION_CATEGORIES.CATEGORIES,
  },
  [PERMISSIONS.CATEGORIES_EDIT]: {
    code: PERMISSIONS.CATEGORIES_EDIT,
    name: 'Edit Categories',
    description: 'Edit existing department categories',
    category: PERMISSION_CATEGORIES.CATEGORIES,
  },
  [PERMISSIONS.CATEGORIES_DELETE]: {
    code: PERMISSIONS.CATEGORIES_DELETE,
    name: 'Delete Categories',
    description: 'Delete department categories',
    category: PERMISSION_CATEGORIES.CATEGORIES,
  },
  
  // Functions
  [PERMISSIONS.FUNCTIONS_VIEW]: {
    code: PERMISSIONS.FUNCTIONS_VIEW,
    name: 'View Functions',
    description: 'View employee functions',
    category: PERMISSION_CATEGORIES.FUNCTIONS,
  },
  [PERMISSIONS.FUNCTIONS_CREATE]: {
    code: PERMISSIONS.FUNCTIONS_CREATE,
    name: 'Create Functions',
    description: 'Create new employee functions',
    category: PERMISSION_CATEGORIES.FUNCTIONS,
  },
  [PERMISSIONS.FUNCTIONS_EDIT]: {
    code: PERMISSIONS.FUNCTIONS_EDIT,
    name: 'Edit Functions',
    description: 'Edit existing employee functions',
    category: PERMISSION_CATEGORIES.FUNCTIONS,
  },
  [PERMISSIONS.FUNCTIONS_DELETE]: {
    code: PERMISSIONS.FUNCTIONS_DELETE,
    name: 'Delete Functions',
    description: 'Delete employee functions',
    category: PERMISSION_CATEGORIES.FUNCTIONS,
  },
  
  // Roles & Permissions
  [PERMISSIONS.ROLES_VIEW]: {
    code: PERMISSIONS.ROLES_VIEW,
    name: 'View Roles',
    description: 'View roles list',
    category: PERMISSION_CATEGORIES.ROLES,
  },
  [PERMISSIONS.ROLES_CREATE]: {
    code: PERMISSIONS.ROLES_CREATE,
    name: 'Create Roles',
    description: 'Create new roles',
    category: PERMISSION_CATEGORIES.ROLES,
  },
  [PERMISSIONS.ROLES_EDIT]: {
    code: PERMISSIONS.ROLES_EDIT,
    name: 'Edit Roles',
    description: 'Modify role permissions',
    category: PERMISSION_CATEGORIES.ROLES,
  },
  [PERMISSIONS.ROLES_DELETE]: {
    code: PERMISSIONS.ROLES_DELETE,
    name: 'Delete Roles',
    description: 'Remove roles',
    category: PERMISSION_CATEGORIES.ROLES,
  },
  [PERMISSIONS.ROLES_ASSIGN]: {
    code: PERMISSIONS.ROLES_ASSIGN,
    name: 'Assign Roles',
    description: 'Assign roles to users',
    category: PERMISSION_CATEGORIES.ROLES,
  },
  
  // Invoices
  [PERMISSIONS.INVOICES_VIEW]: {
    code: PERMISSIONS.INVOICES_VIEW,
    name: 'View Invoices',
    description: 'View invoice list and details',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_CREATE]: {
    code: PERMISSIONS.INVOICES_CREATE,
    name: 'Create Invoices',
    description: 'Create new invoices',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_EDIT]: {
    code: PERMISSIONS.INVOICES_EDIT,
    name: 'Edit Invoices',
    description: 'Modify existing invoices',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_DELETE]: {
    code: PERMISSIONS.INVOICES_DELETE,
    name: 'Delete Invoices',
    description: 'Remove invoices from the system',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_SEND]: {
    code: PERMISSIONS.INVOICES_SEND,
    name: 'Send Invoices',
    description: 'Send invoices via email to customers',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_EXPORT]: {
    code: PERMISSIONS.INVOICES_EXPORT,
    name: 'Export Invoices',
    description: 'Export invoices to PDF',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_MARK_PAID]: {
    code: PERMISSIONS.INVOICES_MARK_PAID,
    name: 'Mark as Paid',
    description: 'Register customer payments',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_CREDIT_NOTE]: {
    code: PERMISSIONS.INVOICES_CREDIT_NOTE,
    name: 'Create Credit Notes',
    description: 'Issue credit notes for invoices',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  [PERMISSIONS.INVOICES_SETTINGS]: {
    code: PERMISSIONS.INVOICES_SETTINGS,
    name: 'Invoice Settings',
    description: 'Configure invoice form and general settings',
    category: PERMISSION_CATEGORIES.INVOICES,
  },
  
  // Customers
  [PERMISSIONS.CUSTOMERS_VIEW]: {
    code: PERMISSIONS.CUSTOMERS_VIEW,
    name: 'View Customers',
    description: 'View customer list and details',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_CREATE]: {
    code: PERMISSIONS.CUSTOMERS_CREATE,
    name: 'Create Customers',
    description: 'Add new customers',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_EDIT]: {
    code: PERMISSIONS.CUSTOMERS_EDIT,
    name: 'Edit Customers',
    description: 'Modify customer information',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_DELETE]: {
    code: PERMISSIONS.CUSTOMERS_DELETE,
    name: 'Delete Customers',
    description: 'Remove customers from the system',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  [PERMISSIONS.CUSTOMERS_SETTINGS]: {
    code: PERMISSIONS.CUSTOMERS_SETTINGS,
    name: 'Customer Settings',
    description: 'Configure customer form settings',
    category: PERMISSION_CATEGORIES.CUSTOMERS,
  },
  
  // Products
  [PERMISSIONS.PRODUCTS_VIEW]: {
    code: PERMISSIONS.PRODUCTS_VIEW,
    name: 'View Products',
    description: 'View product list and details',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_CREATE]: {
    code: PERMISSIONS.PRODUCTS_CREATE,
    name: 'Create Products',
    description: 'Add new products',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_EDIT]: {
    code: PERMISSIONS.PRODUCTS_EDIT,
    name: 'Edit Products',
    description: 'Modify product information',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_DELETE]: {
    code: PERMISSIONS.PRODUCTS_DELETE,
    name: 'Delete Products',
    description: 'Remove products from the system',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  [PERMISSIONS.PRODUCTS_SETTINGS]: {
    code: PERMISSIONS.PRODUCTS_SETTINGS,
    name: 'Product Settings',
    description: 'Configure product form settings',
    category: PERMISSION_CATEGORIES.PRODUCTS,
  },
  
  // Events
  [PERMISSIONS.EVENTS_VIEW]: {
    code: PERMISSIONS.EVENTS_VIEW,
    name: 'View Events',
    description: 'View events and announcements list',
    category: PERMISSION_CATEGORIES.EVENTS,
  },
  [PERMISSIONS.EVENTS_CREATE]: {
    code: PERMISSIONS.EVENTS_CREATE,
    name: 'Create Events',
    description: 'Create new events and announcements',
    category: PERMISSION_CATEGORIES.EVENTS,
  },
  [PERMISSIONS.EVENTS_EDIT]: {
    code: PERMISSIONS.EVENTS_EDIT,
    name: 'Edit Events',
    description: 'Modify existing events and announcements',
    category: PERMISSION_CATEGORIES.EVENTS,
  },
  [PERMISSIONS.EVENTS_DELETE]: {
    code: PERMISSIONS.EVENTS_DELETE,
    name: 'Delete Events',
    description: 'Remove events and announcements',
    category: PERMISSION_CATEGORIES.EVENTS,
  },
}

// Get all permissions grouped by category
export function getPermissionsByCategory(): Record<PermissionCategory, PermissionInfo[]> {
  const grouped: Record<string, PermissionInfo[]> = {}
  
  Object.values(PERMISSION_INFO).forEach((permission) => {
    if (!grouped[permission.category]) {
      grouped[permission.category] = []
    }
    grouped[permission.category].push(permission)
  })
  
  return grouped as Record<PermissionCategory, PermissionInfo[]>
}

// Default system roles with their permissions
export const DEFAULT_ROLES = {
  ADMIN: {
    name: 'Admin',
    description: 'Full access to all features',
    isSystem: true,
    permissions: Object.values(PERMISSIONS), // All permissions
  },
  MANAGER: {
    name: 'Manager',
    description: 'Manage employees, schedules, and attendance',
    isSystem: true,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.EMPLOYEES_VIEW,
      PERMISSIONS.EMPLOYEES_CREATE,
      PERMISSIONS.EMPLOYEES_EDIT,
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.EMPLOYEE_GROUPS_VIEW,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.SCHEDULE_VIEW_ALL,
      PERMISSIONS.SCHEDULE_CREATE,
      PERMISSIONS.SCHEDULE_EDIT,
      PERMISSIONS.SCHEDULE_DELETE,
      PERMISSIONS.SCHEDULE_PUBLISH,
      PERMISSIONS.SCHEDULE_TEMPLATES,
      PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.SHIFTS_CREATE,
      PERMISSIONS.SHIFTS_EDIT,
      PERMISSIONS.SHIFTS_DELETE,
      PERMISSIONS.SHIFTS_EXCHANGE_APPROVE,
      PERMISSIONS.ATTENDANCE_VIEW,
      PERMISSIONS.ATTENDANCE_VIEW_ALL,
      PERMISSIONS.ATTENDANCE_EDIT,
      PERMISSIONS.ATTENDANCE_APPROVE,
      PERMISSIONS.AVAILABILITY_VIEW,
      PERMISSIONS.AVAILABILITY_APPROVE,
      PERMISSIONS.SICK_LEAVE_VIEW,
      PERMISSIONS.SICK_LEAVE_APPROVE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_ATTENDANCE,
      PERMISSIONS.REPORTS_HOURS,
    ],
  },
  SCHEDULER: {
    name: 'Scheduler',
    description: 'Manage schedules and shifts',
    isSystem: true,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.EMPLOYEES_VIEW,
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.SCHEDULE_VIEW_ALL,
      PERMISSIONS.SCHEDULE_CREATE,
      PERMISSIONS.SCHEDULE_EDIT,
      PERMISSIONS.SCHEDULE_DELETE,
      PERMISSIONS.SCHEDULE_PUBLISH,
      PERMISSIONS.SCHEDULE_TEMPLATES,
      PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.SHIFTS_CREATE,
      PERMISSIONS.SHIFTS_EDIT,
      PERMISSIONS.SHIFTS_DELETE,
      PERMISSIONS.AVAILABILITY_VIEW,
    ],
  },
  PAYROLL_ADMIN: {
    name: 'Payroll Admin',
    description: 'Manage payroll and compensation',
    isSystem: true,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.EMPLOYEES_VIEW,
      PERMISSIONS.EMPLOYEES_VIEW_SENSITIVE,
      PERMISSIONS.ATTENDANCE_VIEW,
      PERMISSIONS.ATTENDANCE_VIEW_ALL,
      PERMISSIONS.PAYROLL_VIEW,
      PERMISSIONS.PAYROLL_PERIODS_MANAGE,
      PERMISSIONS.PAYROLL_ENTRIES_VIEW,
      PERMISSIONS.PAYROLL_ENTRIES_EDIT,
      PERMISSIONS.PAYROLL_EXPORT,
      PERMISSIONS.PAY_RULES_VIEW,
      PERMISSIONS.PAY_RULES_MANAGE,
      PERMISSIONS.SALARY_CODES_MANAGE,
      PERMISSIONS.OVERTIME_RULES_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_PAYROLL,
      PERMISSIONS.REPORTS_HOURS,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  EMPLOYEE: {
    name: 'Employee',
    description: 'Basic employee access',
    isSystem: true,
    isDefault: true,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.ATTENDANCE_VIEW,
      PERMISSIONS.ATTENDANCE_VIEW_OWN_HOURS,
      PERMISSIONS.ATTENDANCE_CLOCK_IN_OUT,
      PERMISSIONS.AVAILABILITY_VIEW,
      PERMISSIONS.AVAILABILITY_EDIT,
      PERMISSIONS.SICK_LEAVE_VIEW,
      PERMISSIONS.SICK_LEAVE_CREATE,
    ],
  },
}
