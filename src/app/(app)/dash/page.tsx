import { getDashboardRawData } from "@/features/dashboard/queries"
import { DashboardView } from "@/features/dashboard/components/DashboardView"

export default async function DashPage() {
  try {
    const data = await getDashboardRawData()
    // Validate data shape before passing to client
    if (!data || typeof data !== 'object') {
      return <div style={{padding:40,color:'red'}}>DashPage: getDashboardRawData returned invalid data</div>
    }
    return <DashboardView data={data} />
  } catch (e: any) {
    return (
      <div style={{padding:40}}>
        <h2 style={{color:'red'}}>DashPage error</h2>
        <pre>{e.message}</pre>
        <pre>{e.stack?.split('\n').slice(0,10).join('\n')}</pre>
      </div>
    )
  }
}
