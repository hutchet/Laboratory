import { listMembers, getCurrentMemberInfo } from "@/features/members/queries"
import { MembersView } from "@/features/members/components/MembersView"

export default async function MembersPage() {
  const [members, currentMember] = await Promise.all([listMembers(), getCurrentMemberInfo()])
  return <MembersView members={members} currentMember={currentMember} />
}
