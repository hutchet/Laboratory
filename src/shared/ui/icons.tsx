import type { CSSProperties } from "react"

// Bo icon SVG duoc port 1:1 tu taskflow_original.html:
// - NAV_PATHS: 21 icon sidebar (data-page="...", dong 3095-3123) + logout, stroke-width 1.8.
// - ACTION_PATHS: object `icons` cua ban goc (dong ~8241-8248, class msr-svg), stroke-width 2.
// Thay the hoan toan cho font "Material Symbols Rounded" (.msr) da dung SAI truoc day —
// ban goc KHONG dung icon font, chi dung SVG net mong (fill=none/stroke=currentColor).

type IconProps = {
	size?: number
	strokeWidth?: number
	className?: string
	style?: CSSProperties
}

const NAV_PATHS = {
	dash: (
		<>
			<rect x="3" y="3" width="7" height="7" rx="1.5" />
			<rect x="14" y="3" width="7" height="7" rx="1.5" />
			<rect x="14" y="14" width="7" height="7" rx="1.5" />
			<rect x="3" y="14" width="7" height="7" rx="1.5" />
		</>
	),
	projects: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
	centers: (
		<>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M3 9h18" />
			<path d="M9 21V9" />
		</>
	),
	customers: (
		<>
			<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
			<path d="M22 21v-1a4 4 0 0 0-3-3.87" />
		</>
	),
	samples: (
		<>
			<path d="M9 2v6l-5.5 9.5A2 2 0 0 0 5.24 21h13.52a2 2 0 0 0 1.74-3.5L15 8V2" />
			<path d="M9 2h6" />
			<path d="M8.5 13h7" />
		</>
	),
	plan: (
		<>
			<rect x="3" y="4" width="10" height="3" rx="1" />
			<rect x="3" y="10.5" width="16" height="3" rx="1" />
			<rect x="3" y="17" width="7" height="3" rx="1" />
		</>
	),
	equipment: (
		<>
			<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
			<polyline points="3.27 6.96 12 12.01 20.73 6.96" />
			<line x1="12" y1="22.08" x2="12" y2="12" />
		</>
	),
	analytics: (
		<>
			<line x1="18" y1="20" x2="18" y2="10" />
			<line x1="12" y1="20" x2="12" y2="4" />
			<line x1="6" y1="20" x2="6" y2="14" />
		</>
	),
	"quote-depreciation": (
		<>
			<path d="M20 7h-9" />
			<path d="M14 17H5" />
			<circle cx="17" cy="17" r="3" />
			<circle cx="7" cy="7" r="3" />
		</>
	),
	"quote-overview": (
		<>
			<line x1="12" y1="1" x2="12" y2="23" />
			<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
		</>
	),
	"quote-catalog": (
		<>
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
		</>
	),
	"quote-matrix": (
		<>
			<rect x="3" y="3" width="7" height="7" />
			<rect x="14" y="3" width="7" height="7" />
			<rect x="3" y="14" width="7" height="7" />
			<rect x="14" y="14" width="7" height="7" />
		</>
	),
	"quote-personnel": (
		<>
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</>
	),
	"quote-variable": (
		<>
			<path d="M3 3v18h18" />
			<path d="M7 14l4-4 4 4 5-6" />
		</>
	),
	report: (
		<>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
			<line x1="16" y1="13" x2="8" y2="13" />
			<line x1="16" y1="17" x2="8" y2="17" />
		</>
	),
	tasks: (
		<>
			<polyline points="9 11 12 14 22 4" />
			<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
		</>
	),
	members: (
		<>
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</>
	),
	purchase: (
		<>
			<circle cx="9" cy="21" r="1" />
			<circle cx="20" cy="21" r="1" />
			<path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
		</>
	),
	auditplan: (
		<>
			<rect x="3" y="4" width="18" height="18" rx="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</>
	),
	quality: (
		<>
			<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
			<polyline points="9 12 11 14 15 10" />
		</>
	),
	settings: (
		<>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
		</>
	),
	logout: (
		<>
			<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
			<polyline points="16 17 21 12 16 7" />
			<line x1="21" y1="12" x2="9" y2="12" />
		</>
	),
} as const

export type NavIconName = keyof typeof NAV_PATHS

export function NavIcon({ name, size = 22, strokeWidth = 1.8, className, style }: IconProps & { name: NavIconName }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			style={style}
		>
			{NAV_PATHS[name]}
		</svg>
	)
}

const ACTION_PATHS = {
	add: (
		<>
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</>
	),
	edit: (
		<>
			<path d="M12 20h9" />
			<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
		</>
	),
	// SVG rac chinh xac IC.trash cua ban goc (taskflow_original.html dong 4636) —
	// truoc day dung nham bien the "trash-2" (co 2 gach doc ben trong + nap tach
	// rieng) nen bi lech hinh dang so voi anh tham chieu (hinh 1).
	delete: (
		<>
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
		</>
	),
	personAdd: (
		<>
			<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="8.5" cy="7" r="4" />
			<line x1="20" y1="8" x2="20" y2="14" />
			<line x1="23" y1="11" x2="17" y2="11" />
		</>
	),
	close: (
		<>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</>
	),
	restartAlt: (
		<>
			<path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
			<polyline points="21 3 21 8 16 8" />
		</>
	),
	check: <polyline points="20 6 9 17 4 12" />,
	save: (
		<>
			<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
			<polyline points="17 21 17 13 7 13 7 21" />
			<polyline points="7 3 7 8 15 8" />
		</>
	),
} as const

export type ActionIconName = keyof typeof ACTION_PATHS

export function ActionIcon({ name, size = 20, strokeWidth = 2, className, style }: IconProps & { name: ActionIconName }) {
	return (
		<svg
			className={`msr-svg${className ? ` ${className}` : ""}`}
			viewBox="0 0 24 24"
			width={size}
			height={size}
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={style}
		>
			{ACTION_PATHS[name]}
		</svg>
	)
}

// Icon mui ten dinh huong (port tu directionSvg() ban goc, taskflow_original.html
// dong ~7552: cac glyph '‹' '›' '⌄' '⌃' duoc doi thanh SVG net mong tai runtime).
// Dung cho moi nut "sys-arrow-control"/"sys-arrow-glyph" (chevron mo ke hoach thu
// nghiem, mui ten len/xuong cua droplist) — KHONG dung ky tu unicode tho nhu truoc
// day vi se sai hinh dang so voi anh tham chieu (hinh 3).
const DIRECTION_PATHS = {
	chevronLeft: <path d="M14.5 5.5 8.5 12l6 6.5" />,
	chevronRight: <path d="m9.5 5.5 6 6.5-6 6.5" />,
	chevronDown: <path d="m6 9 6 6 6-6" />,
	chevronUp: <path d="m6 15 6-6 6 6" />,
} as const

export type DirectionIconName = keyof typeof DIRECTION_PATHS

export function DirectionIcon({ name, size = 20, strokeWidth = 2, className, style }: IconProps & { name: DirectionIconName }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			style={style}
			aria-hidden="true"
		>
			{DIRECTION_PATHS[name]}
		</svg>
	)
}
