"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { useRouter } from "next/navigation"
import { saveProject, deleteProject } from "../actions"
import { PROJECT_STATUS_LABEL, PROJECT_PRIORITY_LABEL, type ProjectRow, type Option } from "../types"

const PAGE_SIZE = 9
const CHIPS = [
  { id: "all", label: "Tất cả" },
  { id: "doing", label: "Đang thực hiện" },
  { id: "done", label: "Hoàn thành" },
  { id: "risk", label: "Có rủi ro" },
]
const STATUS_BG: Record<string,string> = { doing:"#e8f0fe", done:"#e8f5e9", not_started:"#f3f4f6" }
const STATUS_COLOR: Record<string,string> = { doing:"#1d5fd6", done:"#2e7d32", not_started:"#5b637a" }
const PRI_COLOR: Record<string,string> = { high:"#c62828", med:"#e37c13", low:"#2e7d32" }
const AV_COLORS = ["#5b7bff","#e37c13","#2e7d32","#c62828","#7c3aed"]
function initials(name:string){ return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() }

export function ProjectsView({ projects, customers, centers }:{ projects:ProjectRow[]; customers:Option[]; centers:Option[] }) {
  const router = useRouter()
  const [chip,setChip] = useState("all")
  const [q,setQ] = useState("")
  const [page,setPage] = useState(1)
  const [editing,setEditing] = useState<ProjectRow|null>(null)
  const [showForm,setShowForm] = useState(false)
  const [confirmDeleteId,setConfirmDeleteId] = useState<string|null>(null)
  const [pending,startTransition] = useTransition()

  const kpis = useMemo(()=>({ active:projects.length, doing:projects.filter(p=>p.derivedStatus==="doing").length, done:projects.filter(p=>p.derivedStatus==="done").length, risk:projects.filter(p=>p.risk).length }),[projects])
  const filtered = useMemo(()=>projects.filter(p=>{
    if(chip==="doing"&&p.derivedStatus!=="doing") return false
    if(chip==="done"&&p.derivedStatus!=="done") return false
    if(chip==="risk"&&!p.risk) return false
    if(q&&!p.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }),[projects,chip,q])
  const pageCount = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const safePage = Math.min(page,pageCount)
  const pageItems = useMemo(()=>filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE),[filtered,safePage])

  function handleSubmit(formData:FormData){
    const input={id:editing?.id,name:String(formData.get("name")||"")||"Dự án mới",customerId:String(formData.get("customerId")||"")||null,centerId:String(formData.get("centerId")||"")||null,value:formData.get("value")?Number(formData.get("value")):null,startDate:String(formData.get("startDate")||"")||null,endDate:String(formData.get("endDate")||"")||null}
    startTransition(async()=>{ await saveProject(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete(){
    if(!confirmDeleteId) return
    const id=confirmDeleteId
    startTransition(async()=>{ await deleteProject(id); setConfirmDeleteId(null) })
  }

  return (
    <PageShell title="Dự án">
      <div id="page-projects" style={{display:"flex",flexDirection:"column",minHeight:"calc(100vh - 108px)"}}>
      <div className="kpis" style={{marginBottom:20,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <KpiCard label="Dự án đang hoạt động" value={kpis.active} />
        <KpiCard label="Đang thực hiện" value={kpis.doing} tone="warning" />
        <KpiCard label="Đã hoàn thành" value={kpis.done} tone="success" />
        <KpiCard label="Dự án rủi ro" value={kpis.risk} tone="danger" />
      </div>
      <div className="section-head">
        <h3>Tất cả dự án</h3>
        <div className="tools">
          <div style={{display:"flex",gap:6}}>
            {CHIPS.map(c=>(
              <button key={c.id} type="button" onClick={()=>{setChip(c.id);setPage(1)}} style={{padding:"6px 14px",borderRadius:999,border:"1px solid #dfe3e8",background:chip===c.id?"#1d5fd6":"#fff",color:chip===c.id?"#fff":"#333",fontSize:12.5,fontWeight:chip===c.id?600:400,cursor:"pointer"}}>{c.label}</button>
            ))}
          </div>
          <div style={{position:"relative"}}>
            <input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Tìm dự án..." style={{padding:"7px 12px 7px 32px",borderRadius:10,border:"1px solid #dfe3e8",fontSize:13,width:200}} />
            <span className="msr" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9aa1ab",fontSize:16}}>search</span>
          </div>
          <button type="button" style={{padding:"7px 14px",borderRadius:10,border:"1px solid #dfe3e8",background:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><span className="msr" style={{fontSize:16}}>filter_list</span>Bộ lọc</button>
          <button type="button" onClick={()=>{setEditing(null);setShowForm(true)}} style={{padding:"7px 16px",borderRadius:10,border:"none",background:"#1d5fd6",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <span className="msr" style={{fontSize:16}}>add</span>Dự án mới
          </button>
        </div>
      </div>
      <div className="proj-list-wrap">
      {pageItems.length===0?(
        <div className="empty">Chưa có dự án nào phù hợp.</div>
      ):(
        <div className="proj-grid">
          {pageItems.map((p,i)=>{
            const pct=Math.round(p.progress*100)
            return (
              <div key={p.id} className="pcard">
                <div className="pt">
                  <h4>{p.name}</h4>
                  <div className="pacts">
                    <button type="button" onClick={()=>{setEditing(p);setShowForm(true)}} style={{border:"none",background:"#f0f2f5",borderRadius:8,width:30,height:30,cursor:"pointer",display:"grid",placeItems:"center"}} title="Sửa"><span className="msr" style={{fontSize:16}}>edit</span></button>
                    <button type="button" onClick={()=>setConfirmDeleteId(p.id)} style={{border:"none",background:"#fef2f2",borderRadius:8,width:30,height:30,cursor:"pointer",display:"grid",placeItems:"center"}} title="Xoá"><span className="msr" style={{fontSize:16,color:"#c62828"}}>delete</span></button>
                  </div>
                </div>
                <div className="tags">
                  <span style={{fontSize:12,fontWeight:600,padding:"4px 10px",borderRadius:20,background:STATUS_BG[p.derivedStatus]??"#f3f4f6",color:STATUS_COLOR[p.derivedStatus]??"#5b637a"}}>{PROJECT_STATUS_LABEL[p.derivedStatus]??p.derivedStatus}</span>
                  <span style={{fontSize:12,fontWeight:600,padding:"4px 10px",borderRadius:20,background:"#fff3e0",color:PRI_COLOR[p.derivedPriority]??"#333"}}>{PROJECT_PRIORITY_LABEL[p.derivedPriority]??p.derivedPriority}</span>
                </div>
                <div className="pbox">
                  <div className="prow"><span>Tiến độ</span><b>{pct}%</b></div>
                  <div className="pbar"><i style={{width:`${pct}%`}} /></div>
                  <div style={{fontSize:12,color:"var(--muted)",marginTop:6}}>{p.taskDone}/{p.taskTotal} công việc hoàn thành{p.taskOverdue?` · ${p.taskOverdue} quá hạn`:""}</div>
                </div>
                <div style={{fontSize:12.5}}>
                  {p.planStats?.hasPlan?(
                    <button type="button" onClick={()=>router.push(`/plan?project=${p.id}`)} style={{border:"none",background:"none",color:"#1d5fd6",cursor:"pointer",padding:0}}>
                      {p.planStats.testCount} bài · {p.planStats.staffCount} nhân viên ›
                    </button>
                  ):(<span style={{color:"#9aa1ab"}}>Chưa có kế hoạch thử nghiệm</span>)}
                </div>
                <div className="pfoot">
                  <div className="avstack">
                    {p.customer?.name&&(
                      <div className="a" style={{background:AV_COLORS[i%AV_COLORS.length]}} title={p.customer.name}>{initials(p.customer.name)}</div>
                    )}
                  </div>
                  {p.dueDate&&<span className="due">Hạn: {new Date(p.dueDate).toLocaleDateString("vi-VN")}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
      <div className="pager" id="proj-pager" style={{position:"sticky",bottom:0,background:"var(--bg,#f3f4f6)",zIndex:5,borderTop:"2px solid var(--line,#e4e8f0)",marginTop:"auto"}}>
        <span className="info">Hiện thị {filtered.length===0?0:(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filtered.length)} / {filtered.length} dự án</span>
        <div className="pages">
          <button className="pg" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}>‹</button>
          {Array.from({length:pageCount},(_,i)=>i+1).map(n=>(<button key={n} className={`pg${n===safePage?" active":""}`} onClick={()=>setPage(n)}>{n}</button>))}
          <button className="pg" onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={safePage===pageCount}>›</button>
        </div>
      </div>
      <FormModal open={showForm} title={editing?"Sửa dự án":"Thêm dự án mới"} onClose={()=>{setShowForm(false);setEditing(null)}} onSubmit={()=>{const f=document.getElementById("tf-project-form") as HTMLFormElement|null;if(f)handleSubmit(new FormData(f))}} submitting={pending}>
        <form id="tf-project-form" onSubmit={e=>e.preventDefault()} style={{display:"flex",flexDirection:"column",gap:12}}>
          <label style={{fontSize:12,fontWeight:600}}>Tên dự án *<input name="name" required defaultValue={editing?.name??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label>
          <div style={{display:"flex",gap:12}}>
            <label style={{fontSize:12,fontWeight:600,flex:1}}>Khách hàng<select name="customerId" defaultValue={editing?.customerId??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}}><option value="">—</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label style={{fontSize:12,fontWeight:600,flex:1}}>Trung tâm<select name="centerId" defaultValue={editing?.centerId??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}}><option value="">—</option>{centers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <div style={{display:"flex",gap:12}}>
            <label style={{fontSize:12,fontWeight:600,flex:1}}>Ngày bắt đầu<input type="date" name="startDate" defaultValue={editing?.startDate?editing.startDate.slice(0,10):""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label>
            <label style={{fontSize:12,fontWeight:600,flex:1}}>Ngày kết thúc<input type="date" name="endDate" defaultValue={editing?.endDate?editing.endDate.slice(0,10):""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label>
          </div>
          <label style={{fontSize:12,fontWeight:600}}>Giá trị (VNĐ)<input name="value" type="number" defaultValue={editing?.value??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label>
        </form>
      </FormModal>
      </div>
      <ConfirmDialog open={!!confirmDeleteId} title="Xoá dự án?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={()=>setConfirmDeleteId(null)} />
    </PageShell>
  )
}
export default ProjectsView
