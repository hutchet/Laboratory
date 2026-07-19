import {
  listQuotes, listCustomerOptions, listProjectOptions, listTestCatalog,
  getPersonnelRateConfig, listPersonnelRouting, listDepreciationAssets,
  listVariableCosts, listEquipmentPricing,
} from "@/features/quotes/queries"
import { OverviewView } from "@/features/quotes/components/OverviewView"
import { CatalogView } from "@/features/quotes/components/CatalogView"
import { MatrixView } from "@/features/quotes/components/MatrixView"
import { PersonnelView } from "@/features/quotes/components/PersonnelView"
import { VariableView } from "@/features/quotes/components/VariableView"
import { DepreciationView } from "@/features/quotes/components/DepreciationView"

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const activeTab = tab || "quote-overview"

  switch (activeTab) {
    case "quote-catalog": {
      const items = await listTestCatalog()
      return <CatalogView items={items} />
    }
    case "quote-matrix": {
      const items = await listEquipmentPricing()
      return <MatrixView items={items} />
    }
    case "quote-personnel": {
      const [config, routing] = await Promise.all([getPersonnelRateConfig(), listPersonnelRouting()])
      return <PersonnelView config={config} routing={routing} />
    }
    case "quote-variable": {
      const items = await listVariableCosts()
      return <VariableView items={items} />
    }
    case "quote-depreciation": {
      const items = await listDepreciationAssets()
      return <DepreciationView items={items} />
    }
    case "quote-overview":
    default: {
      const [quotes, customers, projects] = await Promise.all([listQuotes(), listCustomerOptions(), listProjectOptions()])
      return <OverviewView quotes={quotes} customers={customers} projects={projects} />
    }
  }
}
