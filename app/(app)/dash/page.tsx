import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export default async function DashPage() {
  const session = await auth()

  const [taskCount, projectCount, equipmentCount, bookingCount, quoteCount, customerCount, memberCount, purchaseCount, auditPlanCount] = await Promise.all([
    db.task.count(),
    db.project.count(),
    db.equipment.count(),
    db.equipmentBooking.count(),
    db.quote.count(),
    db.customer.count(),
    db.member.count(),
    db.purchaseItem.count(),
    db.auditPlan.count(),
  ])

  const cards = [
    { label: "Tasks", count: taskCount, href: "/tasks" },
    { label: "Projects", count: projectCount, href: "/projects" },
    { label: "Equipment", count: equipmentCount, href: "/equipment" },
    { label: "Bookings", count: bookingCount, href: "/equipment" },
    { label: "Quotes", count: quoteCount, href: "/quote" },
    { label: "Customers", count: customerCount, href: "/customers" },
    { label: "Members", count: memberCount, href: "/members" },
    { label: "Purchase items", count: purchaseCount, href: "/purchase" },
    { label: "Audit plans", count: auditPlanCount, href: "/auditplan" },
  ]

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Xin chao, {session?.user?.email ?? "ban"}.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(140px, 1fr))", gap: 16, marginTop: 24, maxWidth: 700 }}>
        {cards.map((c) => (
          <a key={c.label} href={c.href} style={{ textDecoration: "none", color: "#333", border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.count}</div>
            <div style={{ color: "#666" }}>{c.label}</div>
          </a>
        ))}
      </div>
    </main>
  )
}
