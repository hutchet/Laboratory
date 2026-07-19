// Port 1:1 tu du lieu goc dung cho renderDash() (taskflow_original.html dong
// 4649-5132) - Dashboard doc du lieu tho tu cac module khac va tu tinh toan
// (khong co bang rieng), nen types o day la "raw" shape lay tu DB, con phan
// tinh toan (KPI, due-bars, spotlight, workload...) nam trong compute.ts.

export type DashboardStats = {
  kpi: { label: string; value: number; unit?: string }[]
  taskDue: number
  taskOverdue: number
  quotePending: number
  activeProjects: number
  pendingSamples: number
  equipmentInMaintenance: number
}

export type BreakdownItem = { label: string; count: number; color: string }

export type DashTaskRaw = {
  id: string
  title: string
  status: string | null
  priority: string | null
  projectId: string | null
  projectName: string | null
  assigneeId: string | null
  dueDate: string | null
}

export type DashProjectRaw = {
  id: string
  name: string
  status: string | null
  // Derived from linked Tasks (mirrors features/projects/queries.ts) since status
  // is no longer stored manually — true when the project has tasks and all are done.
  derivedDone: boolean
  value: number | null
  endDate: string | null
}

export type DashMemberRaw = {
  id: string
  name: string
  role: string | null
}

export type DashSampleRaw = {
  id: string
  status: string | null
}

export type DashEquipmentRaw = {
  id: string
  name: string
  category: string | null
  status: string | null
  calLast: string | null
  calInterval: number | null
}

export type DashQuoteRaw = {
  id: string
  status: string | null
  totalAmount: number | null
}

export type DashCustomerRaw = {
  id: string
  name: string
}

export type DashTestItemRaw = {
  id: string
  progress: number | null
  picId: string | null
}

export type DashBookingRaw = {
  id: string
  equipmentId: string
  startTime: string
}

export type DashboardRawData = {
  tasks: DashTaskRaw[]
  projects: DashProjectRaw[]
  members: DashMemberRaw[]
  samples: DashSampleRaw[]
  equipment: DashEquipmentRaw[]
  quotes: DashQuoteRaw[]
  customers: DashCustomerRaw[]
  testItems: DashTestItemRaw[]
  bookings: DashBookingRaw[]
}
