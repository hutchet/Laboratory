import { initials, avatarColor } from "@/shared/lib/initials"

export type AvatarInitialsProps = { name: string; size?: number; title?: string }

export function AvatarInitials({ name, size = 28, title }: AvatarInitialsProps) {
  const bg = avatarColor(name || "?")
  return (
    <span
      data-tf-kit="avatar-initials"
      title={title || name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        fontSize: Math.max(10, size * 0.4),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </span>
  )
}

export default AvatarInitials
