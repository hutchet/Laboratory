"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { AddButton } from "@/shared/ui/add-button"
import { IconButton } from "@/shared/ui/icon-button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { SearchInput } from "@/shared/ui/search-input"
import { ActionIcon } from "@/shared/ui/icons"
import { Perm } from "@/shared/lib/rbac-client"
import { saveCustomer, deleteCustomer } from "../actions"
import type { CustomerRow } from "../types"

function fmtVal(v:number){ if(v>=1e9) return `${(v/1e9).toLocaleString("vi-VN",{maximumFractionDigits:1})} tỷ đ`; if(v>=1e6) return `${Math.round(v/1e6).toLocaleString("vi-VN")} triệu đ`; if(v>0) return `${v.toLocaleString("vi-VN")} đ`; return "0 đ" }
function initials(name:string){ const w=name.trim().split(/\s+/); return (w.length>=2?(w[0][0]+w[w.length-1][0]):name.slice(0,2)).toUpperCase() }
const AV_COLORS=["#1d5fd6","#2e7d32","#7c3aed","#c62828","#e37c13","#0097a7"]

export function CustomersView({ customers }:{ customers:CustomerRow[] }) {
  const [q,setQ]=useState("")
  const [editing,setEditing]=useState<CustomerRow|null>(null)
  const [showForm,setShowForm]=useState(false)
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null)
  const [pending,startTransition]=useTransition()
  const kpis=useMemo(()=>({total:customers.length,withProj:customers.filter(c=>c.projectCount>0).length,totalProjects:customers.reduce((s,c)=>s+c.projectCount,0),totalValue:customers.reduce((s,c)=>s+c.displayValue,0)}),[customers])
  const filtered=useMemo(()=>customers.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())),[customers,q])
  function handleSubmit(fd:FormData){
    const input={id:editing?.id,name:String(fd.get("name")||"")||"Khách hàng",contact:String(fd.get("contact")||"")||null,email:String(fd.get("email")||"")||null,phone:String(fd.get("phone")||"")||null,address:String(fd.get("address")||"")||null,value:fd.get("value")?Number(fd.get("value")):null,notes:String(fd.get("notes")||"")||null}
    startTransition(async()=>{ await saveCustomer(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete(){ if(!confirmDeleteId) return; const id=confirmDeleteId; startTransition(async()=>{ await deleteCustomer(id); setConfirmDeleteId(null) }) }
  return (
    <PageShell title="Khách hàng">
      <div className="kpis-tier" style={{marginBottom:20}}>
        <KpiCard label="Tổng khách hàng" value={kpis.total} />
        <KpiCard label="Đang có dự án" value={kpis.withProj} tone="warning" />
        <KpiCard label="Tổng dự án liên quan" value={kpis.totalProjects} tone="success" />
        <KpiCard label="Tổng giá trị hợp đồng" value={fmtVal(kpis.totalValue)} tone="danger" />
      </div>
      <div className="section-head">
        <h3>Tất cả khách hàng</h3>
        <div className="tools">
          <SearchInput value={q} onChange={setQ} placeholder="Tìm khách hàng..." width={220} />
          <Perm minPerm="manager"><AddButton label="Khách hàng mới" onClick={()=>{setEditing(null);setShowForm(v=>!v)}} /></Perm>
        </div>
      </div>
      {/* Thẻ thêm/sửa khách hàng — chuẩn hóa khớp Dự án/Trung tâm: hiện/ẩn NGAY TRONG luồng trang,
          dưới nút "+ Khách hàng mới" và trên lưới thẻ khách hàng — KHÔNG dùng popup FormModal nữa
          (đúng quy tắc: thẻ ẩn/hiện inline chỉ áp dụng cho + Thêm mới, popup FormModal dùng ở nơi khác). */}
      <div className="card" style={{marginBottom:18,display:showForm?"block":"none"}}>
        <form id="tf-customer-form" onSubmit={e=>{e.preventDefault();handleSubmit(new FormData(e.currentTarget))}}>
          <div className="row">
            <div className="field" style={{flex:2,minWidth:220}}><label>Tên *</label><input name="name" required defaultValue={editing?.name??""} placeholder="VD: Công ty ABC" /></div>
            <div className="field" style={{flex:1,minWidth:180}}><label>Người liên hệ</label><input name="contact" defaultValue={editing?.contact??""} placeholder="VD: Nguyễn Văn A" /></div>
            <div className="field" style={{flex:1,minWidth:140}}><label>Số điện thoại</label><input name="phone" defaultValue={editing?.phone??""} placeholder="09xxxxxxxx" /></div>
          </div>
          <div className="row" style={{marginTop:10}}>
            <div className="field" style={{flex:1,minWidth:200}}><label>Email</label><input name="email" type="email" defaultValue={editing?.email??""} placeholder="ten@congty.com" /></div>
            <div className="field" style={{flex:2,minWidth:220}}><label>Địa chỉ</label><input name="address" defaultValue={editing?.address??""} placeholder="Địa chỉ khách hàng" /></div>
          </div>
          <div className="row" style={{marginTop:10}}>
            <div className="field" style={{flex:1,minWidth:180}}><label>Giá trị hợp đồng (VNĐ)</label><input type="number" name="value" defaultValue={editing?.value??""} /></div>
            <div className="field" style={{flex:1,width:"100%"}}><label>Ghi chú</label><input name="notes" defaultValue={editing?.notes??""} placeholder="Ghi chú thêm" /></div>
          </div>
          <div className="row" style={{marginTop:12}}>
            <button type="submit" className="btn-pri" style={{display:"flex",alignItems:"center",gap:6}} disabled={pending}>{editing?"Lưu thay đổi":(<><ActionIcon name="add" size={16} />Thêm khách hàng</>)}</button>
            <button type="button" className="btn-line" onClick={()=>{setShowForm(false);setEditing(null)}}>Hủy</button>
          </div>
        </form>
      </div>
      {filtered.length===0?(<div className="empty">Chưa có khách hàng nào.</div>):(
        <div className="cu-grid">
          {filtered.map((c,i)=>(
            <div key={c.id} className="cucard">
              <div className="cucard-head">
                <div className="cu-avatar" style={{background:AV_COLORS[i%AV_COLORS.length]}}>{initials(c.name)}</div>
                <div className="cucard-title">
                  <h4>{c.name}</h4>
                  <div className="cu-sub">{c.contact||"Chưa có người liên hệ"}</div>
                </div>
                <div className="cucard-acts">
                  <IconButton icon="edit" variant="ghost" size={30} title="Sửa" onClick={()=>{setEditing(c);setShowForm(true)}} />
                  <IconButton icon="delete" variant="danger" size={30} title="Xoá" onClick={()=>setConfirmDeleteId(c.id)} />
                </div>
              </div>
              <div className="cucard-info">
                {c.email&&(
                  <div className="cu-info-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 6c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6z"/><path d="m22 6-10 7L2 6"/></svg>
                    <span>{c.email}</span>
                  </div>
                )}
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
              </div>
              <div className="center-card-summary">
                <div className="sum-item"><b>{c.projectCount}</b><span>Dự án</span></div>
                <div className="sum-item"><b>{c.activeProjectCount}</b><span>Đang chạy</span></div>
                <div className="sum-item"><b>{c.displayValue>0?fmtVal(c.displayValue):"—"}</b><span>Giá trị HĐ</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!confirmDeleteId} title="Xoá khách hàng?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={()=>setConfirmDeleteId(null)} />
    </PageShell>
  )
}
export default CustomersView
