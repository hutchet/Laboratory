"use client"

import { useToolbarEnforce } from "@/lib/useToolbarEnforce"

// Gan 1 lan duy nhat o layout de ap dung chuan hoa toolbar/nut dieu huong cho
// toan bo 19 trang, giong cach ban HTML goc chay 1 script scan() toan cuc.
export default function ToolbarEnforcer() {
  useToolbarEnforce()
  return null
}
