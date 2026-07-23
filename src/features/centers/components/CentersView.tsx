"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { AddButton } from "@/shared/ui/add-button"
import { ActionIcon } from "@/shared/ui/icons"
import { IconButton } from "@/shared/ui/icon-button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { SearchInput } from "@/shared/ui/search-input"
import { ArrowButton } from "@/shared/ui/arrow-button"
import { PlainSelect } from "@/shared/ui/plain-select"
import { Perm } from "@/shared/lib/rbac-client"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { saveCenter, deleteCenter, saveGroup, deleteGroup, grantViewerAccess, revokeViewerAccess } from "../actions"
import type { CenterRow, GroupRow, ViewerAccessGrant, ViewerCandidate } from "../types"

function fmtVal(v:number){ if(v>=1e9) return `${(v/1e9).toLocaleString("vi-VN",{maximumFractionDigits:1})} tỷ đ`; if(v>=1e6) return `${Math.round(v/1e6).toLocaleString("vi-VN")} triệu đ`; if(v>0) return `${v.toLocaleString("vi-VN")} đ`; return "0 đ" }
function initials(name:string){ return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() }
const AV_COLORS=["#2e7d32","#1d5fd6","#7c3aed","#c62828","#e37c13"]
const PAGE_SIZE = 8

export function CentersView({ centers, groups = [], memberOptions = [], viewerCandidates = [], viewerGrants = [] }:{ centers:CenterRow[]; groups?: GroupRow[]; memberOptions?: Array<{ id: string; name: string }>; viewerCandidates?: ViewerCandidate[]; viewerGrants?: ViewerAccessGrant[] }) {
  const [q,setQ]=useState("")
  const [page,setPage]=useState(1)
  const [editing,setEditing]=useState<CenterRow|null>(null)
  const [showForm,setShowForm]=useState(false)
  const [confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null)
  const [pending,startTransition]=useTransition()
  // Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
  // Nhom van hanh (Section 3 va 12): quan ly Nhom van hanh theo tung Trung tam.
  const [openGroupsFor,setOpenGroupsFor]=useState<string|null>(null)
  const [editingGroup,setEditingGroup]=useState<GroupRow|null>(null)
  const [confirmDeleteGroupId,setConfirmDeleteGroupId]=useState<string|null>(null)
  // Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
  // Nhom van hanh (Section 11): cap quyen xem (read-only) them Trung tam cho viewer.
  const [openViewersFor,setOpenViewersFor]=useState<string|null>(null)
  const [confirmRevokeId,setConfirmRevokeId]=useState<string|null>(null)
  function handleGrantSubmit(centerId:string, fd:FormData){
    const userId=String(fd.get("viewerUserId")||"")
    if(!userId) return
    startTransition(async()=>{ await grantViewerAccess({userId,centerId}) })
  }
  function confirmRevoke(){ if(!confirmRevokeId) return; const id=confirmRevokeId; startTransition(async()=>{ await revokeViewerAccess(id); setConfirmRevokeId(null) }) }
  function handleGroupSubmit(centerId:string, fd:FormData){
    const input={id:editingGroup?.id,name:String(fd.get("gname")||""),centerId,teamLeadId:String(fd.get("teamLeadId")||"")||null}
    if(!input.name) return
    startTransition(async()=>{ await saveGroup(input); setEditingGroup(null) })
  }
  function confirmDeleteGroup(){ if(!confirmDeleteGroupId) return; const id=confirmDeleteGroupId; startTransition(async()=>{ await deleteGroup(id); setConfirmDeleteGroupId(null) }) }
  const kpis=useMemo(()=>({total:centers.length,totalProjects:centers.reduce((s,c)=>s+c.projectCount,0),totalValue:centers.reduce((s,c)=>s+c.totalValue,0),totalCustomerLinks:centers.reduce((s,c)=>s+c.customerCount,0)}),[centers])
  const trends=useMemo(()=>({total:computeSimpleTrend(centers,c=>true,c=>c.createdAt),projects:computeSimpleTrend(centers,c=>c.projectCount>0,c=>c.createdAt),value:computeSimpleTrend(centers,c=>c.totalValue>0,c=>c.createdAt),customers:computeSimpleTrend(centers,c=>c.customerCount>0,c=>c.createdAt)}),[centers])
  const filtered=useMemo(()=>centers.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())),[centers,q])
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const safePage=Math.min(page,pageCount)
  const pageItems=useMemo(()=>filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE),[filtered,safePage])
  function handleSubmit(fd:FormData){
    const input={id:editing?.id,name:String(fd.get("name")||"")||"Trung tâm",address:String(fd.get("address")||"")||null,manager:String(fd.get("manager")||"")||null,phone:String(fd.get("phone")||"")||null,notes:String(fd.get("notes")||"")||null,elecPrice:fd.get("elecPrice")?Number(fd.get("elecPrice")):null,rentPrice:fd.get("rentPrice")?Number(fd.get("rentPrice")):null}
    startTransition(async()=>{ await saveCenter(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete(){ if(!confirmDeleteId) return; const id=confirmDeleteId; startTransition(async()=>{ await deleteCenter(id); setConfirmDeleteId(null) }) }
  return (
    <PageShell title="Trung tâm thử nghiệm">
      <div id="page-centers" style={{display:"flex",flexDirection:"column",minHeight:"calc(100vh - 108px)"}}>
      <div className="kpis-tier" style={{marginBottom:20}}>
        <KpiCard label="Tổng trung tâm" value={kpis.total} tone="blue" trend={trends.total} />
        <KpiCard label="Tổng dự án liên kết" value={kpis.totalProjects} tone="warning" trend={trends.projects} />
        <KpiCard label="Tổng giá trị dự án" value={fmtVal(kpis.totalValue)} tone="success" trend={trends.value} />
        <KpiCard label="Khách hàng liên quan" value={kpis.totalCustomerLinks} tone="danger" trend={trends.customers} />
      </div>
      <div className="section-head">
        <h3>Tất cả trung tâm thử nghiệm</h3>
        <div className="tools">
          <SearchInput value={q} onChange={(v)=>{setQ(v);setPage(1)}} placeholder="Tìm trung tâm..." width={220} />
          <Perm minPerm="dept_head"><AddButton label="Trung tâm mới" onClick={()=>{setEditing(null);setShowForm(v=>!v)}} /></Perm>
        </div>
      </div>
      {/* Thẻ thêm/sửa trung tâm — khớp đúng cấu trúc bản gốc taskflow_original.html dòng 3415
          (<div class="card hidden" id="ct-form">): hiện/ẩn NGAY TRONG luồng trang, dưới nút
          "+ Trung tâm mới" và trên lưới thẻ trung tâm — KHÔNG phải popup che màn hình (FormModal
          trước đó sai, cùng dạng lỗi đã sửa ở trang Dự án bản w). */}
      <div key={editing?.id ?? "new"} className="card" style={{marginBottom:18,display:showForm?"block":"none"}}>
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
          {pageItems.map((c,i)=>(
            <div key={c.id} className="cucard">
              <div className="cucard-head">
                <div className="cu-avatar" style={{background:AV_COLORS[i%AV_COLORS.length]}}>{initials(c.name)}</div>
                <div className="cucard-title">
                  <h4>{c.name}</h4>
                  <div className="cu-sub">{c.manager||"Chưa có người quản lý"}</div>
                </div>
                <div className="cucard-acts">
                  <IconButton icon="edit" variant="ghost" size={30} title="Sửa" onClick={()=>{setEditing(c);setShowForm(true)}} />
                  <IconButton icon="delete" variant="danger" size={30} title="Xoá" onClick={()=>setConfirmDeleteId(c.id)} />
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
              <div style={{padding:"10px 14px 14px",borderTop:"1px solid #eef0f3"}}>
                <button type="button" onClick={()=>{setOpenGroupsFor(openGroupsFor===c.id?null:c.id);setEditingGroup(null)}} style={{border:"none",background:"none",color:"#1d5fd6",fontSize:12,fontWeight:600,cursor:"pointer",padding:0}}>
                  {openGroupsFor===c.id?"▲ Ẩn nhóm vận hành":`▼ Nhóm vận hành (${groups.filter(g=>g.centerId===c.id).length})`}
                </button>
                {openGroupsFor===c.id&&(
                  <div style={{marginTop:10}}>
                    {groups.filter(g=>g.centerId===c.id).map(g=>(
                      <div key={g.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f4f4f5"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{g.name}</div>
                          <div style={{fontSize:11,color:"#6b7280"}}>Trưởng nhóm: {g.teamLeadName??"Chưa có"} · {g.memberCount} thành viên</div>
                        </div>
                        <Perm minPerm="dept_head">
                          <span style={{display:"flex",gap:6}}>
                            <IconButton icon="edit" variant="ghost" size={26} title="Sửa nhóm" onClick={()=>setEditingGroup(g)} />
                            <IconButton icon="delete" variant="danger" size={26} title="Xoá nhóm" onClick={()=>setConfirmDeleteGroupId(g.id)} />
                          </span>
                        </Perm>
                      </div>
                    ))}
                    {groups.filter(g=>g.centerId===c.id).length===0&&(
                      <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic",padding:"6px 0"}}>Trung tâm này chưa có nhóm vận hành nào.</div>
                    )}
                    <Perm minPerm="dept_head">
                      <form onSubmit={e=>{e.preventDefault();handleGroupSubmit(c.id,new FormData(e.currentTarget));e.currentTarget.reset()}} style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                        <div className="field" style={{flex:1,minWidth:140}}>
                          <label style={{fontSize:11}}>{editingGroup&&editingGroup.centerId===c.id?"Sửa tên nhóm":"Tên nhóm mới"}</label>
                          <input name="gname" required defaultValue={editingGroup&&editingGroup.centerId===c.id?editingGroup.name:""} placeholder="VD: Nhóm vận hành A" />
                        </div>
                        <div className="field" style={{flex:1,minWidth:140}}>
                          <label style={{fontSize:11}}>Trưởng nhóm</label>
                          <PlainSelect name="teamLeadId" defaultValue={editingGroup&&editingGroup.centerId===c.id?editingGroup.teamLeadId??"":""} wrapStyle={{marginTop:0}}>
                            <option value="">— Chưa có —</option>
                            {memberOptions.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                          </PlainSelect>
                        </div>
                        <button type="submit" className="btn-pri" style={{padding:"7px 12px",fontSize:12}} disabled={pending}>{editingGroup&&editingGroup.centerId===c.id?"Lưu":"Thêm"}</button>
                        {editingGroup&&editingGroup.centerId===c.id&&<button type="button" className="btn-line" style={{padding:"7px 12px",fontSize:12}} onClick={()=>setEditingGroup(null)}>Huỷ</button>}
                      </form>
                    </Perm>
                  </div>
                )}
                <Perm minPerm="dept_head">
                  <button type="button" onClick={()=>setOpenViewersFor(openViewersFor===c.id?null:c.id)} style={{border:"none",background:"none",color:"#1d5fd6",fontSize:12,fontWeight:600,cursor:"pointer",padding:0,marginTop:8,display:"block"}}>
                    {openViewersFor===c.id?"▲ Ẩn quyền xem":`▼ Quyền xem (viewer) (${viewerGrants.filter(v=>v.centerId===c.id).length})`}
                  </button>
                  {openViewersFor===c.id&&(
                    <div style={{marginTop:10}}>
                      {viewerGrants.filter(v=>v.centerId===c.id).map(v=>(
                        <div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f4f4f5"}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:600}}>{v.viewerName}</div>
                            <div style={{fontSize:11,color:"#6b7280"}}>{v.viewerEmail??""}</div>
                          </div>
                          <IconButton icon="delete" variant="danger" size={26} title="Thu hồi quyền xem" onClick={()=>setConfirmRevokeId(v.id)} />
                        </div>
                      ))}
                      {viewerGrants.filter(v=>v.centerId===c.id).length===0&&(
                        <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic",padding:"6px 0"}}>Chưa cấp quyền xem trung tâm này cho tài khoản “Chỉ xem” nào.</div>
                      )}
                      {viewerCandidates.length===0?(
                        <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic",padding:"6px 0"}}>Chưa có tài khoản “Chỉ xem” nào để cấp quyền (tạo ở trang Thành viên với vai trò “Chỉ xem”).</div>
                      ):(
                        <form onSubmit={e=>{e.preventDefault();handleGrantSubmit(c.id,new FormData(e.currentTarget));e.currentTarget.reset()}} style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                          <div className="field" style={{flex:1,minWidth:180}}>
                            <label style={{fontSize:11}}>Cấp quyền xem cho</label>
                            <PlainSelect name="viewerUserId" required defaultValue="" wrapStyle={{marginTop:0}}>
                              <option value="" disabled>— Chọn tài khoản Chỉ xem —</option>
                              {viewerCandidates.map(v=><option key={v.userId} value={v.userId}>{v.name}{v.email?` (${v.email})`:""}</option>)}
                            </PlainSelect>
                          </div>
                          <button type="submit" className="btn-pri" style={{padding:"7px 12px",fontSize:12}} disabled={pending}>Cấp quyền</button>
                        </form>
                      )}
                    </div>
                  )}
                </Perm>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length>0 && (
        <div className="pager" id="ct-pager" style={{position:"sticky",bottom:0,background:"var(--bg,#f3f4f6)",zIndex:5,borderTop:"2px solid var(--line,#e4e8f0)",marginTop:"auto",...(pageCount<=1?{justifyContent:"flex-start",width:"fit-content"}:{})}}>
          <span className="info">Hiện thị {(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE,filtered.length)} / {filtered.length} trung tâm</span>
          {pageCount>1 && (
          <div className="pages">
            <ArrowButton direction="chevronLeft" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1} ariaLabel="Trang trước" />
            {Array.from({length:pageCount},(_,i)=>i+1).map(n=>(<button key={n} className={`pg${n===safePage?" active":""}`} onClick={()=>setPage(n)}>{n}</button>))}
            <ArrowButton direction="chevronRight" onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={safePage===pageCount} ariaLabel="Trang sau" />
          </div>
          )}
        </div>
      )}

      </div>
      <ConfirmDialog open={!!confirmDeleteId} title="Xoá trung tâm?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={()=>setConfirmDeleteId(null)} />
      <ConfirmDialog open={!!confirmDeleteGroupId} title="Xoá nhóm vận hành?" description="Các thành viên thuộc nhóm này sẽ mất liên kết nhóm (vẫn giữ liên kết Trung tâm). Hành động này không thể hoàn tác." danger onConfirm={confirmDeleteGroup} onCancel={()=>setConfirmDeleteGroupId(null)} />
      <ConfirmDialog open={!!confirmRevokeId} title="Thu hồi quyền xem?" description="Tài khoản này sẽ không còn xem được dữ liệu của trung tâm này nữa." danger onConfirm={confirmRevoke} onCancel={()=>setConfirmRevokeId(null)} />
    </PageShell>
  )
}
export default CentersView
