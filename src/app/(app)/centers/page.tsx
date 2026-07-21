import { listCenters, listGroups, listMemberOptions, listViewerCandidates, listViewerAccessGrants } from "@/features/centers/queries"
import { CentersView } from "@/features/centers/components/CentersView"

export default async function CentersPage() {
  const [centers, groups, memberOptions, viewerCandidates, viewerGrants] = await Promise.all([
    listCenters(),
    listGroups(),
    listMemberOptions(),
    listViewerCandidates(),
    listViewerAccessGrants(),
  ])
  return <CentersView centers={centers} groups={groups} memberOptions={memberOptions} viewerCandidates={viewerCandidates} viewerGrants={viewerGrants} />
}
