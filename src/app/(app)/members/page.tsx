import { listMembers, getCurrentMemberInfo, listCenterOptions, listGroupOptions } from "@/features/members/queries"
import { MembersView } from "@/features/members/components/MembersView"

export default async function MembersPage() {
  const [members, currentMember, centerOptions, groupOptions] = await Promise.all([
    listMembers(),
    getCurrentMemberInfo(),
    listCenterOptions(),
    listGroupOptions(),
  ])
  return <MembersView members={members} currentMember={currentMember} centerOptions={centerOptions} groupOptions={groupOptions} />
}
