"use client"
import { useCallback, useEffect, useState } from "react"
import { useEscapeClose } from "@/lib/useEscapeClose"

// Tai hien co che #modal toan cuc cua ban goc (19-notifications-modal-init.js):
// Document click len [data-detail] => mo modal voi tieu de + body tu data-modal-title
// va data-modal-body embed san tu server (Server Component truyen xuat HTML).
// Custom event "tf-open-detail" cho phep mo modal co lap trinh tu bat ky Client Component.
const DETAIL_TITLES: Record<string, string> = {
  status: "Phan bo trang thai",
  priority: "Muc uu tien",
  "proj-value": "Phan bo gia tri du an",
  workload: "Khoi luong cong viec",
  activity: "Hoat dong gan day",
  overdue: "Cong viec qua han",
  "due-bars": "Cong viec/han chot",
  "kpi-proj": "KPI Du an",
  "kpi-util": "Ti le su dung",
  "kpi-avg": "Thoi gian xu ly trung binh",
  "kpi-risk": "Du an co rui ro",
  "kpi-active": "Cong viec dang hoat dong",
  "dash-projects": "Tong quan du an",
  "spot-project": "Du an duoc chu y",
  "spot-all": "Tat ca canh bao",
  "pk-active": "Du an dang hoat dong",
  "pk-prog": "Dang thuc hien",
  "pk-done": "Da hoan thanh",
  "pk-risk": "Du an rui ro",
}

const DETAIL_TITLES_VI: Record<string, string> = {
  status: "Ph\u00e2n b\u1ed5 tr\u1ea1ng th\u00e1i",
  priority: "M\u1ee9c \u01b0u ti\u00ean",
  "proj-value": "Ph\u00e2n b\u1ed1 gi\u00e1 tr\u1ecb d\u1ef1 \u00e1n",
  workload: "Kh\u1ed1i l\u01b0\u1ee3ng c\u00f4ng vi\u1ec7c",
  activity: "Ho\u1ea1t \u0111\u1ed9ng g\u1ea7n \u0111\u00e2y",
  overdue: "C\u00f4ng vi\u1ec7c qu\u00e1 h\u1ea1n",
  "due-bars": "C\u00f4ng vi\u1ec7c/h\u1ea1n ch\u1ed1t",
  "kpi-proj": "KPI D\u1ef1 \u00e1n",
  "kpi-util": "T\u1ef7 l\u1ec7 s\u1eed d\u1ee5ng",
  "kpi-avg": "Th\u1eddi gian x\u1eed l\u00fd trung b\u00ecnh",
  "kpi-risk": "D\u1ef1 \u00e1n c\u00f3 r\u1ee7i ro",
  "kpi-active": "C\u00f4ng vi\u1ec7c \u0111ang ho\u1ea1t \u0111\u1ed9ng",
  "dash-projects": "T\u1ed5ng quan d\u1ef1 \u00e1n",
  "spot-project": "D\u1ef1 \u00e1n \u0111\u01b0\u1ee3c ch\u00fa \u00fd",
  "spot-all": "T\u1ea5t c\u1ea3 c\u1ea3nh b\u00e1o",
  "pk-active": "D\u1ef1 \u00e1n \u0111ang ho\u1ea1t \u0111\u1ed9ng",
  "pk-prog": "\u0110ang th\u1ef1c hi\u1ec7n",
  "pk-done": "\u0110\u00e3 ho\u00e0n th\u00e0nh",
  "pk-risk": "D\u1ef1 \u00e1n r\u1ee7i ro",
}

type ModalState = { open: boolean; title: string; body: string; wide: boolean }

export default function GlobalDetailModal() {
  const [state, setState] = useState<ModalState>({ open: false, title: "", body: "", wide: false })

  const close = useCallback(() => setState(s => ({ ...s, open: false })), [])
  useEscapeClose(state.open, close)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.id === "gdm-backdrop") { close(); return }
      if (target.closest("button,select,input,option,label,a")) return
      const el = target.closest("[data-detail]")
      if (!el) return
      const type = (el as HTMLElement).dataset.detail!
      const title = (el as HTMLElement).dataset.modalTitle ||
        DETAIL_TITLES_VI[type] || DETAIL_TITLES[type] || type
      const body = (el as HTMLElement).dataset.modalBody || ""
      const wide = (el as HTMLElement).dataset.modalWide === "1"
      setState({ open: true, title, body, wide })
    }
    function onTfEvent(e: Event) {
      const ev = e as CustomEvent<{ type?: string; title?: string; body?: string; wide?: boolean }>
      const d = ev.detail
      const type = d.type || ""
      setState({
        open: true,
        title: d.title || DETAIL_TITLES_VI[type] || DETAIL_TITLES[type] || type,
        body: d.body || "",
        wide: !!d.wide,
      })
    }
    document.addEventListener("click", onDocClick)
    window.addEventListener("tf-open-detail", onTfEvent)
    return () => {
      document.removeEventListener("click", onDocClick)
      window.removeEventListener("tf-open-detail", onTfEvent)
    }
  }, [close])

  if (!state.open) return null

  return (
    <div
      id="gdm-backdrop"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1100,
      }}
      onClick={close}
    >
      <div
        id="modal"
        className={"modal" + (state.wide ? " wide" : "")}
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "85vh", overflow: "auto", minWidth: 320, maxWidth: state.wide ? 900 : 520 }}
      >
        <div className="modal-head">
          <h3 id="modal-title">{state.title}</h3>
          <button type="button" className="modal-x" id="modal-close" aria-label="\u0110\u00f3ng" onClick={close}>\u2715</button>
        </div>
        <div
          id="modal-body"
          className="modal-body"
          {...(state.body ? { dangerouslySetInnerHTML: { __html: state.body } } : {})}
        >
          {!state.body && <div className="empty">Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u chi ti\u1ebft.</div>}
        </div>
      </div>
    </div>
  )
}
