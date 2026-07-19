"use server"

import { revalidatePath } from "next/cache"

// Dashboard is read-only (aggregates other modules); this action exists so
// control:check module-registry rules (actions.ts + queries.ts present) hold,
// and to let callers force a fresh aggregate after cross-module writes.
export async function refreshDashboard() {
  revalidatePath("/dash")
}
