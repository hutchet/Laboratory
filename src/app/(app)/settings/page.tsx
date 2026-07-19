import { getSettings } from "@/features/settings/queries"
import { SettingsView } from "@/features/settings/components/SettingsView"

export default async function SettingsPage() {
  const settings = await getSettings()
  return <SettingsView settings={settings} />
}
