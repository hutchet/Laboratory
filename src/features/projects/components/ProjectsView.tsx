"use client"
import { useMemo, useState, useTransition } from "react"
import { ProjectCard } from '@/shared/ui/project-card'
import { SearchInput } from '@/shared/ui/search-input'
import { AddButton } from '@/shared/ui/add-button'
import { CustomSelect } from '@/shared/ui/custom-select'
import { ActionIcon } from '@/shared/ui/icons'
import { ArrowButton } from '@/shared/ui/arrow-button'
import { DateField } from '@/shared/ui/date-field'
import { PageShell } from "@/shared/ui/page-shell"
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
// Khop dung logic mau trang thai cua renderProjects() ban goc: done=green-soft/green,
// not_started=neutral-soft/neutral, doing (con lai)=pri-soft/pri — dung bien CSS thay vi
// hex hardcode de an theo dung theme Material 3 + dark mode (xem .tag2 trong globals.css).
const STATUS_BG: Record<string,string> = { doing:"var(--pri-soft)", done:"var(--green-soft)", not_started:"var(--neutral-soft)" }
const STATUS_COLOR: Record<string,string> = { doing:"var(--pri)", done:"var(--green)", not_started:"var(--neutral)" }
const PRI_COLOR: Record<string,string> = { high:"var(--red)", med:"var(--amber)", low:"var(--green)" }
const PRI_BG: Record<string,string> = { high:"var(--red-soft)", med:"var(--amber-soft)", low:"var(--green-soft)" }
const AV_COLORS = ["#5b7bff","#e37c13","#2e7d32","#c62828","#7c3aed"]
function initials(name:string){ return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() }
// Khớp chính xác hàm fmtDate() trong taskflow_original.html (dd-mm-yyyy, nối bằng '-')
function fmtDate(s?: string | null){
  if(!s) return undefined
  const p = s.slice(0,10).split("-")
  return p.length===3 ? `${p[2]}-${p[1]}-${p[0]}` : s
}

export function ProjectsView({ projects, customers, centers }:{ projects:ProjectRow[]; customers:Option[]; centers:Option[] }) {
  const router = useRouter()
  const [chip,setChip] = useState("all")
  const [q,setQ] = useState("")
  const [page,setPage] = useState(1)
  const [editing,setEditing] = useState<ProjectRow|null>(null)
  const [showForm,setShowForm] = useState(false)
  const [confirmDeleteId,setConfirmDeleteId] = useState<string|null>(null)
  const [pending,startTransition] = useTransition()
  // Trang du an dung <select> goc cua trinh duyet cho Khach hang / Trung tam thu
  // nghiem trong form them/sua -> khong co nen, mui ten lech, khong co hieu ung
  // xoay khi mo (ban goc dung enhanceSystemSelects() de tu dong bien doi TAT CA
  // <select> thanh sys-custom-select). Ban Next.js khong co co che DOM-enhance
  // toan cuc nay nen phai chuyen tay sang CustomSelect + dong bo state rieng.
  const [formCustomerId,setFormCustomerId] = useState("")
  const [formCenterId,setFormCenterId] = useState("")

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
  function openAddForm(){ setEditing(null); setFormCustomerId(""); setFormCenterId(""); setShowForm(v=>!v) }
  function openEditForm(p:ProjectRow){ setEditing(p); setFormCustomerId(p.customerId??""); setFormCenterId(p.centerId??""); setShowForm(true); window.scrollTo(0,0) }
  function confirmDelete(){
    if(!confirmDeleteId) return
    const id=confirmDeleteId
    startTransition(async()=>{ await deleteProject(id); setConfirmDeleteId(null) })
  }

  return (
    <PageShell title="Dự án">
      <div id="page-projects" style={{display:"flex",flexDirection:"column",minHeight:"calc(100vh - 108px)"}}>
      <div className="kpis-tier" style={{marginBottom:20}}>
        <KpiCard label="Dự án đang hoạt động" value={kpis.active} />
        <KpiCard label="Đang thực hiện" value={kpis.doing} tone="warning" />
        <KpiCard label="Đã hoàn thành" value={kpis.done} tone="success" />
        <KpiCard label="Dự án rủi ro" value={kpis.risk} tone="danger" />
      </div>
      <div className="section-head">
        <h3>Tất cả dự án</h3>
        <div className="tools">
          <CustomSelect
            value={chip}
            onChange={(v)=>{setChip(v);setPage(1)}}
            options={CHIPS.map(c=>({value:c.id,label:c.label}))}
            width={180}
          />
          <SearchInput value={q} onChange={(v)=>{setQ(v);setPage(1)}} placeholder="Tìm dự án..." width={220} />
          <AddButton label="Dự án mới" onClick={openAddForm} />
        </div>
      </div>
      {/* Thẻ thêm/sửa dự án — khớp đúng cấu trúc bản gốc: <div class="card hidden" id="proj-form">
          hiện/ẩn NGAY TRONG luồng trang (dưới nút "+ Dự án mới", trên lưới thẻ dự án),
          KHÔNG phải popup che màn hình (FormModal trước đây sai so với taskflow_original.html
          dòng 3349). */}
      <div key={editing?.id ?? "new"} className="card" style={{marginBottom:18,display:showForm?"block":"none"}}>
        <form id="tf-project-form" onSubmit={e=>{e.preventDefault();handleSubmit(new FormData(e.currentTarget))}}>
          <div className="row">
            <div className="field" style={{flex:2,minWidth:240}}><label>Tên dự án *</label><input name="name" required defaultValue={editing?.name??""} placeholder="VD: VinFast" /></div>
            <div className="field" style={{flex:1,minWidth:200}}><label>Khách hàng</label><CustomSelect value={formCustomerId} onChange={setFormCustomerId} options={[{value:"",label:"—"},...customers.map(c=>({value:c.id,label:c.name}))]} width="100%" /></div>
            <div className="field" style={{flex:1,minWidth:200}}><label>Trung tâm thử nghiệm</label><CustomSelect value={formCenterId} onChange={setFormCenterId} options={[{value:"",label:"—"},...centers.map(c=>({value:c.id,label:c.name}))]} width="100%" /></div>
          </div>
          <div className="row" style={{marginTop:12}}>
            <div className="field" style={{flex:1,minWidth:180}}><label>Ngày bắt đầu</label><DateField name="startDate" defaultValue={editing?.startDate?editing.startDate.slice(0,10):""} /></div>
            <div className="field" style={{flex:1,minWidth:180}}><label>Ngày kết thúc</label><DateField name="endDate" defaultValue={editing?.endDate?editing.endDate.slice(0,10):""} /></div>
            <div className="field" style={{flex:1,minWidth:180}}><label>Giá trị (VNĐ)</label><input name="value" type="number" defaultValue={editing?.value??""} /></div>
          </div>
          <p style={{fontSize:"12.5px",color:"var(--muted)",marginTop:10}}>Trạng thái, ưu tiên, tiến độ và deadline được tự động tổng hợp từ các công việc có cùng tên dự án này.</p>
          <div className="row" style={{marginTop:12}}>
            <button type="submit" className="btn-pri" style={{display:"flex",alignItems:"center",gap:6}} disabled={pending}>{editing?"Lưu thay đổi":(<><ActionIcon name="add" size={16} />Thêm dự án</>)}</button>
            <button type="button" className="btn-line" onClick={()=>{setShowForm(false);setEditing(null)}}>Hủy</button>
          </div>
        </form>
      </div>
      <div className="proj-list-wrap">
      {pageItems.length===0?(
        <div className="empty">Chưa có dự án nào phù hợp.</div>
      ):(
        <div className="proj-grid">
          {pageItems.map((p,i)=>{
            const pct=Math.round(p.progress*100)
            return (
              <div key={p.id}><ProjectCard
                id={p.id}
                name={p.name}
                value={p.value!=null?p.value.toLocaleString("vi-VN")+"đ":null}
                statusLabel={PROJECT_STATUS_LABEL[p.derivedStatus]??p.derivedStatus}
                statusBg={STATUS_BG[p.derivedStatus]??"var(--neutral-soft)"}
                statusColor={STATUS_COLOR[p.derivedStatus]??"var(--neutral)"}
                priorityLabel={PROJECT_PRIORITY_LABEL[p.derivedPriority]??p.derivedPriority}
                priorityColor={PRI_COLOR[p.derivedPriority]??"var(--neutral)"}
                priorityBg={PRI_BG[p.derivedPriority]??"var(--neutral-soft)"}
                progress={pct}
                taskDone={p.taskDone}
                taskTotal={p.taskTotal}
                taskOverdue={p.taskOverdue}
                planInfo={p.planStats?.hasPlan?`${p.planStats.testCount} bài · ${p.planStats.staffCount} nhân viên`:null}
                onPlanClick={()=>router.push(`/plan?project=${p.id}`)}
                avatars={p.customer?.name?[{name:p.customer.name,color:AV_COLORS[i%AV_COLORS.length]}]:[]}
                dueDate={fmtDate(p.dueDate)}
                onEdit={()=>openEditForm(p)}
                onDelete={()=>setConfirmDeleteId(p.id)}
              /></div>
            )
          })}
        </div>
      )}
      </div>
      <div className="pager" id="proj-pager" style={{position:"sticky",bottom:0,background:"var(--bg,#f3f4f6)",zIndex:5,borderTop:"2px solid var(--line,#e4e8f0)",marginTop:"auto"}}>
        <span className="info">Hiện thị {filtered.length===0?0:(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filtered.length)} / {filtered.length} dự án</span>
        <div className="pages">
          <ArrowButton direction="chevronLeft" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1} ariaLabel="Trang trước" />
          {Array.from({length:pageCount},(_,i)=>i+1).map(n=>(<button key={n} className={`pg${n===safePage?" active":""}`} onClick={()=>setPage(n)}>{n}</button>))}
          <ArrowButton direction="chevronRight" onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={safePage===pageCount} ariaLabel="Trang sau" />
        </div>
      </div>
      </div>
      <ConfirmDialog open={!!confirmDeleteId} title="Xoá dự án?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={()=>setConfirmDeleteId(null)} />
    </PageShell>
  )
}
export default ProjectsView
