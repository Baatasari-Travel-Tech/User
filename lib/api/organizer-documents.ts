"use client"

import { apiRequest } from "@/lib/api/client"
import { useAuthStore } from "@/lib/auth/store"

type OrganizerDocumentType = "pan" | "agreement"

const API_PREFIX = "/api/v1"

const withPrefix = (path: string) => {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${API_PREFIX}${normalized}`
}

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string; code?: string }
    return payload.message ?? "Request failed."
  } catch {
    return "Request failed."
  }
}

export const uploadOrganizerDocument = async (documentType: OrganizerDocumentType, file: Blob) => {
  return apiRequest<{ data: { document: { type: OrganizerDocumentType; objectKey: string } } }>(
    `/organizer/documents/${documentType}`,
    {
      method: "PUT",
      auth: true,
      timeoutMs: 60000,
      headers: {
        "Content-Type": "application/pdf",
      },
      body: file,
    }
  )
}

export const completeOrganizerDocuments = async (payload: Record<string, never> | Record<string, unknown> = {}) => {
  return apiRequest("/organizer/documents/complete", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  })
}

export const fetchOrganizerDocumentBlob = async (documentType: OrganizerDocumentType) => {
  const activeRole = useAuthStore.getState().activeRole
  const headers = new Headers()
  if (activeRole) {
    headers.set("x-active-role", activeRole)
  }

  const response = await fetch(withPrefix(`/organizer/documents/${documentType}`), {
    method: "GET",
    credentials: "include",
    headers,
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.blob()
}

export type { OrganizerDocumentType }
