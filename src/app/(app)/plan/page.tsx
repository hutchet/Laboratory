import { listTestItems, listTestPacks, listTestPlans, listProjectOptions, listSampleOptions, listEquipmentOptions, listMemberOptions } from "@/features/plan/queries"
import { PlanView } from "@/features/plan/components/PlanView"

export default async function PlanPage() {
  const [items, packs, plans, projects, samples, equipmentOptions, memberOptions] = await Promise.all([
    listTestItems(), listTestPacks(), listTestPlans(), listProjectOptions(), listSampleOptions(), listEquipmentOptions(), listMemberOptions(),
  ])
  return <PlanView items={items} packs={packs} plans={plans} projects={projects} samples={samples} equipmentOptions={equipmentOptions} memberOptions={memberOptions} />
}
