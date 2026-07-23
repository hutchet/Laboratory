// Minimal dependency-free XLSX (OOXML) writer.
// Chi ho tro nhung gi can cho export bao gia: 1 sheet, merged cells, gia tri
// text/number, bold/align/fill/border co ban, column width, freeze/wrap text.
// Khong dung thu vien ngoai (sandbox khong co internet) — tu build file ZIP
// (OOXML) bang zlib co san trong Node.

import { deflateRawSync } from "zlib"

export type XlsxCellStyle = {
  bold?: boolean
  italic?: boolean
  align?: "left" | "center" | "right"
  valign?: "top" | "center" | "bottom"
  fill?: string // hex RRGGBB, khong co '#'
  color?: string // font color hex RRGGBB
  fontSize?: number
  border?: boolean
  wrap?: boolean
  numFmt?: string // e.g. "#,##0"
}

export type XlsxCell = {
  row: number // 1-based
  col: number // 1-based
  value?: string | number | null
  style?: XlsxCellStyle
}

export type XlsxSheet = {
  name: string
  cells: XlsxCell[]
  merges?: string[] // "A1:F1"
  colWidths?: Record<number, number> // 1-based col -> width
  rowHeights?: Record<number, number> // 1-based row -> height (points)
}

function colLetter(n: number): string {
  let s = ""
  let x = n
  while (x > 0) {
    const rem = (x - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

function cellRef(row: number, col: number): string {
  return `${colLetter(col)}${row}`
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ---- Minimal ZIP (store method 8 / deflate) writer with correct CRC32 ----
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buf: Buffer): number {
  let crc = -1
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

function dosDateTime(): { date: number; time: number } {
  const d = new Date()
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  return { date, time }
}

function buildZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const { date, time } = dosDateTime()
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8")
    const compressed = deflateRawSync(f.data)
    const crc = crc32(f.data)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // local file header signature
    localHeader.writeUInt16LE(20, 4) // version needed
    localHeader.writeUInt16LE(0, 6) // flags
    localHeader.writeUInt16LE(8, 8) // compression method = deflate
    localHeader.writeUInt16LE(time, 10)
    localHeader.writeUInt16LE(date, 12)
    localHeader.writeInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(f.data.length, 22)
    localHeader.writeUInt16LE(nameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28)

    const localEntry = Buffer.concat([localHeader, nameBuf, compressed])
    localParts.push(localEntry)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0) // central directory signature
    centralHeader.writeUInt16LE(20, 4) // version made by
    centralHeader.writeUInt16LE(20, 6) // version needed
    centralHeader.writeUInt16LE(0, 8) // flags
    centralHeader.writeUInt16LE(8, 10) // compression method
    centralHeader.writeUInt16LE(time, 12)
    centralHeader.writeUInt16LE(date, 14)
    centralHeader.writeInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(f.data.length, 24)
    centralHeader.writeUInt16LE(nameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30) // extra field length
    centralHeader.writeUInt16LE(0, 32) // comment length
    centralHeader.writeUInt16LE(0, 34) // disk number start
    centralHeader.writeUInt16LE(0, 36) // internal attrs
    centralHeader.writeUInt32LE(0, 38) // external attrs
    centralHeader.writeUInt32LE(offset, 42) // offset of local header

    const centralEntry = Buffer.concat([centralHeader, nameBuf])
    centralParts.push(centralEntry)

    offset += localEntry.length
  }

  const localBuf = Buffer.concat(localParts)
  const centralBuf = Buffer.concat(centralParts)

  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(localBuf.length, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([localBuf, centralBuf, end])
}

// ---- Styles registry ----
type StyleKey = string

function styleKeyOf(s: XlsxCellStyle | undefined): StyleKey {
  if (!s) return "default"
  return JSON.stringify([s.bold, s.italic, s.align, s.valign, s.fill, s.color, s.fontSize, s.border, s.wrap, s.numFmt])
}

export function buildXlsx(sheet: XlsxSheet): Buffer {
  const cellsByRow = new Map<number, XlsxCell[]>()
  let maxRow = 1
  let maxCol = 1
  for (const c of sheet.cells) {
    maxRow = Math.max(maxRow, c.row)
    maxCol = Math.max(maxCol, c.col)
    const arr = cellsByRow.get(c.row) ?? []
    arr.push(c)
    cellsByRow.set(c.row, arr)
  }

  // Build style tables
  const fonts: string[] = [`<font><sz val="11"/><name val="Calibri"/></font>`]
  const fills: string[] = [`<fill><patternFill patternType="none"/></fill>`, `<fill><patternFill patternType="gray125"/></fill>`]
  const borders: string[] = [`<border><left/><right/><top/><bottom/><diagonal/></border>`]
  const numFmts: Array<{ id: number; code: string }> = []
  let nextNumFmtId = 164

  const xfs: string[] = [`<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>`]
  const styleIndex = new Map<StyleKey, number>()
  styleIndex.set("default", 0)

  function fontIndexFor(s: XlsxCellStyle): number {
    const key = `${s.bold ? 1 : 0}|${s.italic ? 1 : 0}|${s.fontSize ?? 11}|${s.color ?? ""}`
    const idx = fonts.findIndex((_, i) => (i === 0 && key === "0|0|11|"))
    if (idx !== -1 && key === "0|0|11|") return 0
    const attrs = [
      s.bold ? "<b/>" : "",
      s.italic ? "<i/>" : "",
      `<sz val="${s.fontSize ?? 11}"/>`,
      s.color ? `<color rgb="FF${s.color}"/>` : "",
      `<name val="Calibri"/>`,
    ].join("")
    const xml = `<font>${attrs}</font>`
    let fi = fonts.indexOf(xml)
    if (fi === -1) {
      fonts.push(xml)
      fi = fonts.length - 1
    }
    return fi
  }

  function fillIndexFor(hex: string): number {
    const xml = `<fill><patternFill patternType="solid"><fgColor rgb="FF${hex}"/><bgColor rgb="FF${hex}"/></patternFill></fill>`
    let fi = fills.indexOf(xml)
    if (fi === -1) {
      fills.push(xml)
      fi = fills.length - 1
    }
    return fi
  }

  function borderIndexFor(): number {
    const xml = `<border><left style="thin"><color rgb="FFB0B0B0"/></left><right style="thin"><color rgb="FFB0B0B0"/></right><top style="thin"><color rgb="FFB0B0B0"/></top><bottom style="thin"><color rgb="FFB0B0B0"/></bottom><diagonal/></border>`
    let bi = borders.indexOf(xml)
    if (bi === -1) {
      borders.push(xml)
      bi = borders.length - 1
    }
    return bi
  }

  function numFmtIdFor(code: string): number {
    const existing = numFmts.find((n) => n.code === code)
    if (existing) return existing.id
    const id = nextNumFmtId++
    numFmts.push({ id, code })
    return id
  }

  function styleIdFor(s: XlsxCellStyle | undefined): number {
    if (!s) return 0
    const key = styleKeyOf(s)
    const existing = styleIndex.get(key)
    if (existing !== undefined) return existing
    const fontId = s.bold || s.italic || s.fontSize || s.color ? fontIndexFor(s) : 0
    const fillId = s.fill ? fillIndexFor(s.fill) : 0
    const borderId = s.border ? borderIndexFor() : 0
    const numFmtId = s.numFmt ? numFmtIdFor(s.numFmt) : 0
    const alignAttrs: string[] = []
    if (s.align) alignAttrs.push(`horizontal="${s.align}"`)
    if (s.valign) alignAttrs.push(`vertical="${s.valign === "center" ? "center" : s.valign}"`)
    if (s.wrap) alignAttrs.push(`wrapText="1"`)
    const alignXml = alignAttrs.length ? `<alignment ${alignAttrs.join(" ")}/>` : ""
    const xml = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" applyFont="1" applyFill="${s.fill ? 1 : 0}" applyBorder="${s.border ? 1 : 0}" applyAlignment="${alignAttrs.length ? 1 : 0}" applyNumberFormat="${s.numFmt ? 1 : 0}">${alignXml}</xf>`
    const idx = xfs.length
    xfs.push(xml)
    styleIndex.set(key, idx)
    return idx
  }

  // Build sheet XML rows
  const rowXmls: string[] = []
  const sortedRows = Array.from(cellsByRow.keys()).sort((a, b) => a - b)
  for (const r of sortedRows) {
    const rowCells = (cellsByRow.get(r) ?? []).slice().sort((a, b) => a.col - b.col)
    const rowHeight = sheet.rowHeights?.[r]
    const cellXmls = rowCells.map((c) => {
      const ref = cellRef(c.row, c.col)
      const sid = styleIdFor(c.style)
      if (c.value == null || c.value === "") {
        return `<c r="${ref}" s="${sid}"/>`
      }
      if (typeof c.value === "number") {
        return `<c r="${ref}" s="${sid}"><v>${c.value}</v></c>`
      }
      return `<c r="${ref}" s="${sid}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(c.value))}</t></is></c>`
    })
    const heightAttr = rowHeight ? ` ht="${rowHeight}" customHeight="1"` : ""
    rowXmls.push(`<row r="${r}"${heightAttr}>${cellXmls.join("")}</row>`)
  }

  const colsXml = sheet.colWidths
    ? `<cols>${Object.entries(sheet.colWidths)
        .map(([col, width]) => `<col min="${col}" max="${col}" width="${width}" customWidth="1"/>`)
        .join("")}</cols>`
    : ""

  const mergeXml = sheet.merges && sheet.merges.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : ""

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${cellRef(maxRow, maxCol)}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  ${colsXml}
  <sheetData>${rowXmls.join("")}</sheetData>
  ${mergeXml}
</worksheet>`

  const numFmtsXml = numFmts.length
    ? `<numFmts count="${numFmts.length}">${numFmts.map((n) => `<numFmt numFmtId="${n.id}" formatCode="${xmlEscape(n.code)}"/>`).join("")}</numFmts>`
    : ""

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${numFmtsXml}
  <fonts count="${fonts.length}">${fonts.join("")}</fonts>
  <fills count="${fills.length}">${fills.join("")}</fills>
  <borders count="${borders.length}">${borders.join("")}</borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xmlEscape(sheet.name)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

  const files = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesXml, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rootRelsXml, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbookXml, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(workbookRelsXml, "utf8") },
    { name: "xl/styles.xml", data: Buffer.from(stylesXml, "utf8") },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml, "utf8") },
  ]

  return buildZip(files)
}
