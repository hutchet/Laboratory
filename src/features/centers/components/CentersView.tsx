"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { Perm } from "@/shared/lib/rbac-client"
import { saveCenter, deleteCenter } from "../actions"
import type { CenterRow } from "../types"

function fmtVal(v:number){ if(v>=1e9) return `${(v/1e9).toLocaleString("vi-VN",{maximumFractionDigits:1})} tỷ đ`; if(v>=1e6) return `${Math.round(v/1e6).toLocaleString("vi-VN")} triệu đ`; if(v>0) return `${v.toLocaleString("vi-VN")} đ`; return "0 đ" }
function initials(name:string){ return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() }
const AV_COLORS=["#2e7d32","#1d5fd6","#7c3aed","#c62828","#e37c13"]

export function CentersView({ centers }:{ centers:CenterRow[] }) {
  const [q,setQ]=useState("")
  const [editing,setEditing]=useState<CenterRow|null>(null)
  const [showForm,setShowForm]=useState(false)
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null)
  const [pending,startTransition]=useTransition()
  const kpis=useMemo(()=>({total:centers.length,totalProjects:centers.reduce((s,c)=>s+c.projectCount,0),totalValue:centers.reduce((s,c)=>s+c.totalValue,0),totalCustomerLinks:centers.reduce((s,c)=>s+c.customerCount,0)}),[centers])
  const filtered=useMemo(()=>centers.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())),[centers,q])
  function handleSubmit(fd:FormData){
    const input={id:editing?.id,name:String(fd.get("name")||"")||"Trung tâm",address:String(fd.get("address")||"")||null,manager:String(fd.get("manager")||"")||null,phone:String(fd.get("phone")||"")||null,notes:String(fd.get("notes")||"")||null,elecPrice:fd.get("elecPrice")?Number(fd.get("elecPrice")):null,rentPrice:fd.get("rentPrice")?Number(fd.get("rentPrice")):null}
    startTransition(async()=>{ await saveCenter(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete(){ if(!confirmDeleteId) return; const id=confirmDeleteId; startTransition(async()=>{ await deleteCenter(id); setConfirmDeleteId(null) }) }
  return (
    <PageShell title="Trung tâm thử nghiệm" actions={<Perm minPerm="manager"><button type="button" onClick={()=>{setEditing(null);setShowForm(true)}} style={{padding:"8px 18px",borderRadius:10,border:"none",background:"#1d5fd6",color:"#fff",fontWeight:600,fontSize:13.5,cursor:"pointer"}}>+ Trung tâm mới</button></Perm>}>
      <div className="kpis" style={{marginBottom:20,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <KpiCard label="Tổng trung tâm" value={kpis.total} />
        <KpiCard label="Tổng dự án liên kết" value={kpis.totalProjects} tone="warning" />
        <KpiCard label="Tổng giá trị dự án" value={fmtVal(kpis.totalValue)} tone="success" />
        <KpiCard label="Khách hàng liên quan" value={kpis.totalCustomerLinks} tone="danger" />
      </div>
      <div className="section-head">
        <h3>Tất cả trung tâm thử nghiệm</h3>
        <div className="tools">
          <div style={{position:"relative"}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm trung tâm..." style={{padding:"7px 12px 7px 32px",borderRadius:10,border:"1px solid #dfe3e8",fontSize:13,width:220}} /><span className="msr" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9aa1ab",fontSize:16}}>search</span></div>
        </div>
      </div>
      {filtered.length===0?(<div className="empty">Chưa có trung tâm nào.</div>):(
        <div id="eq-center-cards">
          {filtered.map((c,i)=>(
            <div key={c.id} className="center-card">
              <div className="center-card-head">
                <div style={{display:"flex",alignItems:"flex-start",gap:14,flex:1}}>
                  <div style={{width:48,height:48,borderRadius:12,flexShrink:0,background:AV_COLORS[i%AV_COLORS.length],color:"#fff",display:"grid",placeItems:"center",fontWeight:700,fontSize:15}}>{initials(c.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="center-card-title"><h3>{c.name}</h3><span>{c.manager??"—"}</span></div>
                    <div className="center-card-meta" style={{marginTop:8}}>
                      {c.phone&&<span>{c.phone}</span>}
                      {c.address&&<span>{c.address}</span>}
                    </div>
                  </div>
                </div>
                <div className="center-card-actions">
                  <button type="button" onClick={()=>{setEditing(c);setShowForm(true)}} style={{border:"none",background:"#f0f2f5",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:13,display:"grid",placeItems:"center"}} title="Sửa"><span className="msr" style={{fontSize:16}}>edit</span></button>
                  <button type="button" onClick={()=>setConfirmDeleteId(c.id)} style={{border:"none",background:"#fef2f2",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:13,display:"grid",placeItems:"center"}} title="Xoá"><span className="msr" style={{fontSize:16,color:"#c62828"}}>delete</span></button>
                </div>
              </div>
              <div className="center-card-summary">
                <div className="sum-item"><b>{c.projectCount}</b><span>Dự án</span></div>
                <div className="sum-item"><b>{c.activeProjectCount}</b><span>Đang chạy</span></div>
                <div className="sum-item"><b>{fmtVal(c.totalValue)}</b><span>Giá trị</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <FormModal open={showForm} title={editing?"Sửa trung tâm":"Thêm trung tâm mới"} onClose={()=>{setShowForm(false);setEditing(null)}} onSubmit={()=>{const f=document.getElementById("tf-center-form") as HTMLFormElement|null;if(f)handleSubmit(new FormData(f))}} submitting={pending}>
        <form id="tf-center-form" onSubmit={e=>e.preventDefault()} style={{display:"flex",flexDirection:"column",gap:12}}>
          <label style={{fontSize:12,fontWeight:600}}>Tên *<input name="name" required defaultValue={editing?.name??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label>
          <div style={{display:"flex",gap:12}}><label style={{fontSize:12,fontWeight:600,flex:1}}>Phụ trách<input name="manager" defaultValue={editing?.manager??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label><label style={{fontSize:12,fontWeight:600,flex:1}}>Sđt<input name="phone" defaultValue={editing?.phone??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label></div>
          <label style={{fontSize:12,fontWeight:600}}>Địa chỉ<input name="address" defaultValue={editing?.address??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label>
          <div style={{display:"flex",gap:12}}><label style={{fontSize:12,fontWeight:600,flex:1}}>Giá điện (đ/kWh)<input type="number" name="elecPrice" defaultValue={editing?.elecPrice??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label><label style={{fontSize:12,fontWeight:600,flex:1}}>Giá thuê nhà xưởng (đ/m²/giờ)<input type="number" name="rentPrice" defaultValue={editing?.rentPrice??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label></div>
          <label style={{fontSize:12,fontWeight:600}}>Ghi chú<textarea name="notes" defaultValue={editing?.notes??""} style={{width:"100%",padding:8,borderRadius:6,border:"1px solid #dfe3e8",marginTop:4}} /></label>
        </form>
      </FormModal>
      <ConfirmDialog open={!!confirmDeleteId} title="Xoá trung tâm?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={()=>setConfirmDeleteId(null)} />
    </PageShell>
  )
}
export default CentersView
