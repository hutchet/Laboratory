import { initials, avatarColor } from "@/shared/lib/initials"

// Additive — yeu cau "them che do gan anh avatar vao tai khoan": khi Member co
// avatar (anh do nguoi dung tu upload, luu dang data URI trong Member.avatar),
// hien thi anh do thay cho initials tron mau. Khong co avatar thi giu nguyen
// hanh vi cu (initials + mau nen theo ten) o moi noi dang dung component nay.
export type AvatarInitialsProps = { name: string; size?: number; title?: string; src?: string | null }

export function AvatarInitials({ name, size = 28, title, src }: AvatarInitialsProps) {
  const bg = avatarColor(name || "?")
  const r = Math.max(6, Math.round(size / 4))
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        data-tf-kit="avatar-initials"
        src={src}
        alt={title || name}
        title={title || name}
        style={{
          display: "inline-flex",
          width: size,
          height: size,
          borderRadius: r,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    )
  }
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
        borderRadius: r,
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
