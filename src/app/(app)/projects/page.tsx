import { listProjects, listCustomerOptions, listCenterOptions } from "@/features/projects/queries"
import { ProjectsView } from "@/features/projects/components/ProjectsView"

export default async function ProjectsPage() {
  const [projects, customers, centers] = await Promise.all([listProjects(), listCustomerOptions(), listCenterOptions()])
  return <ProjectsView projects={projects} customers={customers} centers={centers} />
}
