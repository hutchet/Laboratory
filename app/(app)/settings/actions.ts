"use server"

import { db } from "@/lib/db"

// Xuat toan bo du lieu nghiep vu hien co trong database thanh 1 object JSON
// (thay cho ban backup localStorage cua file HTML goc).
export async function exportAllData() {
  const [
    tasks,
    projects,
    customers,
    centers,
    members,
    equipment,
    equipmentBookings,
    quotes,
    samples,
    testPlans,
    auditPlans,
    purchaseItems,
    qualityChecklist,
    qualityAuditEntries,
  ] = await Promise.all([
    db.task.findMany(),
    db.project.findMany(),
    db.customer.findMany(),
    db.center.findMany(),
    db.member.findMany(),
    db.equipment.findMany(),
    db.equipmentBooking.findMany(),
    db.quote.findMany(),
    db.sample.findMany(),
    db.testPlan.findMany({ include: { items: true } }).catch(() => db.testPlan.findMany()),
    db.auditPlan.findMany({ include: { phases: true, items: true } }).catch(() => db.auditPlan.findMany()),
    db.purchaseItem.findMany(),
    db.qualityChecklistItem.findMany(),
    db.qualityAuditEntry.findMany(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
    customers,
    centers,
    members,
    equipment,
    equipmentBookings,
    quotes,
    samples,
    testPlans,
    auditPlans,
    purchaseItems,
    qualityChecklist,
    qualityAuditEntries,
  }
}
