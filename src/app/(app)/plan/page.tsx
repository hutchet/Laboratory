import { listTestItems, listTestPacks, listTestPlans, listProjectOptions, listSampleOptions, listEquipmentOptions, listMemberOptions } from "@/features/plan/queries"
import { PlanView } from "@/features/plan/components/PlanView"

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const [{ project }, items, packs, plans, projects, samples, equipmentOptions, memberOptions] = await Promise.all([
    searchParams, listTestItems(), listTestPacks(), listTestPlans(), listProjectOptions(), listSampleOptions(), listEquipmentOptions(), listMemberOptions(),
  ])
  return <PlanView items={items} packs={packs} plans={plans} projects={projects} samples={samples} equipmentOptions={equipmentOptions} memberOptions={memberOptions} initialProjectFilter={project || ""} />
}
