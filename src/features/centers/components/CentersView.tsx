"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { AddButton } from "@/shared/ui/add-button"
import { ActionIcon } from "@/shared/ui/icons"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { SearchInput } from "@/shared/ui/search-input"
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
    <PageShell title="Trung tâm thử nghiệm">
      <div className="kpis" style={{marginBottom:20,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <KpiCard label="Tổng trung tâm" value={kpis.total} />
        <KpiCard label="Tổng dự án liên kết" value={kpis.totalProjects} tone="warning" />
        <KpiCard label="Tổng giá trị dự án" value={fmtVal(kpis.totalValue)} tone="success" />
        <KpiCard label="Khách hàng liên quan" value={kpis.totalCustomerLinks} tone="danger" />
      </div>
      <div className="section-head">
        <h3>Tất cả trung tâm thử nghiệm</h3>
        <div className="tools">
          <SearchInput value={q} onChange={setQ} placeholder="Tìm trung tâm..." width={220} />
          <Perm minPerm="manager"><AddButton label="Trung tâm mới" onClick={()=>{setEditing(null);setShowForm(v=>!v)}} /></Perm>
        </div>
      </div>
      {/* Thẻ thêm/sửa trung tâm — khớp đúng cấu trúc bản gốc taskflow_original.html dòng 3415
          (<div class="card hidden" id="ct-form">): hiện/ẩn NGAY TRONG luồng trang, dưới nút
          "+ Trung tâm mới" và trên lưới thẻ trung tâm — KHÔNG phải popup che màn hình (FormModal
          trước đó sai, cùng dạng lỗi đã sửa ở trang Dự án bản w). */}
      <div className="card" style={{marginBottom:18,display:showForm?"block":"none"}}>
        <form id="tf-center-form" onSubmit={e=>{e.preventDefault();handleSubmit(new FormData(e.currentTarget))}}>
          <div className="row">
            <div className="field" style={{flex:2,minWidth:220}}><label>Tên trung tâm *</label><input name="name" required defaultValue={editing?.name??""} placeholder="VD: Trung tâm thử nghiệm Pin" /></div>
            <div className="field" style={{flex:1,minWidth:180}}><label>Người quản lý</label><input name="manager" defaultValue={editing?.manager??""} placeholder="VD: Nguyễn Văn A" /></div>
            <div className="field" style={{flex:1,minWidth:140}}><label>Số điện thoại</label><input name="phone" defaultValue={editing?.phone??""} placeholder="09xxxxxxxx" /></div>
          </div>
          <div className="row" style={{marginTop:10}}>
            <div className="field" style={{flex:2,minWidth:220}}><label>Địa chỉ</label><input name="address" defaultValue={editing?.address??""} placeholder="Địa chỉ trung tâm" /></div>
            <div className="field" style={{flex:1,width:"100%"}}><label>Ghi chú</label><input name="notes" defaultValue={editing?.notes??""} placeholder="Ghi chú thêm" /></div>
          </div>
          <div className="row" style={{marginTop:10}}>
            <div className="field" style={{flex:1,minWidth:180}}><label>Giá điện (đ/kWh)</label><input type="number" name="elecPrice" defaultValue={editing?.elecPrice??""} /></div>
            <div className="field" style={{flex:1,minWidth:220}}><label>Giá thuê nhà xưởng (đ/m²/giờ)</label><input type="number" name="rentPrice" defaultValue={editing?.rentPrice??""} /></div>
          </div>
          <div className="row" style={{marginTop:12}}>
            <button type="submit" className="btn-pri" style={{display:"flex",alignItems:"center",gap:6}} disabled={pending}>{editing?"Lưu thay đổi":(<><ActionIcon name="add" size={16} />Thêm trung tâm</>)}</button>
            <button type="button" className="btn-line" onClick={()=>{setShowForm(false);setEditing(null)}}>Hủy</button>
          </div>
        </form>
      </div>
      {filtered.length===0?(<div className="empty">Chưa có trung tâm nào.</div>):(
        <div className="cu-grid" id="ct-grid">
          {filtered.map((c,i)=>(
            <div key={c.id} className="cucard">
              <div className="cucard-head">
                <div className="cu-avatar" style={{background:AV_COLORS[i%AV_COLORS.length]}}>{initials(c.name)}</div>
                <div className="cucard-title">
                  <h4>{c.name}</h4>
                  <div className="cu-sub">{c.manager||"Chưa có người quản lý"}</div>
                </div>
                <div className="cucard-acts">
                  <button type="button" className="icon-act pri" onClick={()=>{setEditing(c);setShowForm(true)}} title="Sửa">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                  </button>
                  <button type="button" className="icon-act del" onClick={()=>setConfirmDeleteId(c.id)} title="Xoá">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div className="cucard-info">
                {c.phone&&(
                  <div className="cu-info-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.79 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3.5a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.address&&(
                  <div className="cu-info-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{c.address}</span>
                  </div>
                )}
                {!c.phone&&!c.address&&(
                  <div className="cu-info-row"><span style={{fontStyle:"italic",fontSize:12}}>Chưa có thông tin liên hệ</span></div>
                )}
              </div>
              <div className="cucard-footer">
                <div className="cu-stat"><span className="cu-stat-v">{c.projectCount}</span><span className="cu-stat-l">Dự án</span></div>
                <div className="cu-divider" />
                <div className="cu-stat"><span className="cu-stat-v" style={{color:"var(--green)"}}>{c.activeProjectCount}</span><span className="cu-stat-l">Đang chạy</span></div>
                <div className="cu-divider" />
                <div className="cu-stat"><span className="cu-stat-v" style={{color:"var(--amber)"}}>{fmtVal(c.totalValue)}</span><span className="cu-stat-l">Giá trị</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá trung tâm?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={()=>setConfirmDeleteId(null)} />
    </PageShell>
  )
}
export default CentersView
