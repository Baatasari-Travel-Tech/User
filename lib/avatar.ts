const DEFAULT_AVATAR_BASE_URL =
  "https://baatasari-events-public-535709430287-ap-south-2-an.s3.ap-south-2.amazonaws.com"

const avatarBaseUrl = (
  process.env.NEXT_PUBLIC_AVATAR_BASE_URL?.trim() || DEFAULT_AVATAR_BASE_URL
).replace(/\/+$/, "")

export type AvatarType = "users" | "organizers"

const toEpochVersion = (value?: string | number | null) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value)
  }

  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) {
      return Math.floor(asNumber)
    }

    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return null
}

export const getAvatarImageUrl = (type: AvatarType, id: string, version?: string | number | null) => {
  const objectKey = `avatars/${type}/${encodeURIComponent(id)}.webp`
  const normalizedVersion = toEpochVersion(version)
  const versionParam = normalizedVersion !== null ? `?v=${normalizedVersion}` : ""

  return `${avatarBaseUrl}/${objectKey}${versionParam}`
}

export const DEFAULT_AVATAR_IMAGE = "/avatar.webp"
