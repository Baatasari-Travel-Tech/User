"use client"

import { apiRequest } from "@/lib/api/client"
import type { ApiEnvelope } from "@/types/api"

// Organizer uploads (logo, KYC PDFs, event covers) went with the legacy
// organizer screens — organizer.baatasari.com has its own copies.

type AvatarUploadPayload = {
  avatar: {
    objectKey: string
    publicUrl: string | null
    version: number
  }
}

export async function uploadUserAvatarImage(file: File) {
  // A multi-MB image PUT on a slow connection can easily outlast the
  // client's default 12s JSON-request timeout, aborting an upload that
  // would otherwise have succeeded.
  const response = await apiRequest<ApiEnvelope<AvatarUploadPayload>>("/user/avatar", {
    method: "PUT",
    auth: true,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
    timeoutMs: 60000,
  })

  return response.data.avatar
}
