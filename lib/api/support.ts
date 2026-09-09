"use client"

import { apiRequest } from "@/lib/api/client"
import type { ApiEnvelope } from "@/types/api"

export type SupportMessage = {
  id: string
  userId: string
  email: string
  phone: string
  problem: string
  status: "OPEN" | "RESOLVED"
  createdAt: string
  resolvedAt: string | null
  // Present only on the admin list response.
  name?: string | null
}

export const getMyOpenSupportMessage = async (): Promise<SupportMessage | null> => {
  const res = await apiRequest<ApiEnvelope<{ message: SupportMessage | null }>>("/support/messages/me", {
    auth: true,
  })
  return res.data.message
}

export const sendSupportMessage = async (payload: { phone: string; problem: string }): Promise<SupportMessage> => {
  const res = await apiRequest<ApiEnvelope<{ message: SupportMessage }>>("/support/messages", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  })
  return res.data.message
}
