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
import { listCenterOptions } from "@/features/equipment/queries"

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const activeTab = tab || "quote-overview"

  switch (activeTab) {
    case "quote-catalog": {
      const [items, config, routing, centers] = await Promise.all([listTestCatalog(), getPersonnelRateConfig(), listPersonnelRouting(), listCenterOptions()])
      return <CatalogView items={items} personnelConfig={config} routing={routing} centers={centers} />
    }
    case "quote-matrix": {
      const [items, centers] = await Promise.all([listEquipmentPricing(), listCenterOptions()])
      return <MatrixView items={items} centers={centers} />
    }
    case "quote-personnel": {
      const [config, routing, centers] = await Promise.all([getPersonnelRateConfig(), listPersonnelRouting(), listCenterOptions()])
      return <PersonnelView config={config} routing={routing} centers={centers} />
    }
    case "quote-variable": {
      const [items, centers] = await Promise.all([listVariableCosts(), listCenterOptions()])
      return <VariableView items={items} centers={centers} />
    }
    case "quote-depreciation": {
      const [items, centers] = await Promise.all([listDepreciationAssets(), listCenterOptions()])
      return <DepreciationView items={items} centers={centers} />
    }
    case "quote-overview":
    default: {
      const [quotes, customers, projects, testCatalog] = await Promise.all([listQuotes(), listCustomerOptions(), listProjectOptions(), listTestCatalog()])
      return <OverviewView quotes={quotes} customers={customers} projects={projects} testCatalog={testCatalog} />
    }
  }
}
