"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { qrDataUrl } from "@/lib/qrcode"
import { Check, Copy, KeyRound, LogOut, Mail, Shield, ShieldCheck, Smartphone } from "lucide-react"
import { useAuth } from "@/app/providers"
import { apiRequest } from "@/lib/api/client"
import { useToast } from "@/components/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DangerZone, InfoCard, SectionHeader } from "../field-primitives"

// Three-step delete flow:
//   idle    → user hasn't opened the dialog
//   request → dialog open, "Send OTP" button visible
//   confirm → OTP sent; OTP input + "DELETE" string + final Confirm button
type DeleteStep = "idle" | "request" | "confirm"

// Two-factor setup/disable flow:
//   idle   → user hasn't opened either dialog
//   setup  → enable dialog open: QR + manual secret + code input
//   disable → disable dialog open: current code input only
type TotpStep = "idle" | "setup" | "disable"

export function SecuritySection() {
  const { profile, session, user, logout, logoutAllDevices, refreshRoles } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const email = session?.user?.email ?? profile?.email ?? ""
  const phone = (profile?.phone ?? "").replace(/^\+91/, "")
  const emailVerified = !!user?.emailVerified
  const totpEnabled = !!user?.totpEnabled

  const [step, setStep] = useState<DeleteStep>("idle")
  const [otp, setOtp] = useState("")
  const [busy, setBusy] = useState(false)
  const dialogOpen = step !== "idle"

  const [loggingOutAll, setLoggingOutAll] = useState(false)
  const handleLogoutAllDevices = async () => {
    setLoggingOutAll(true)
    try {
      await logoutAllDevices()
      router.push("/")
    } catch (err) {
      toast({
        title: "Couldn't sign out everywhere",
        description: err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      })
      setLoggingOutAll(false)
    }
  }

  const [totpStep, setTotpStep] = useState<TotpStep>("idle")
  const [totpBusy, setTotpBusy] = useState(false)
  const [totpCode, setTotpCode] = useState("")
  const [totpSecret, setTotpSecret] = useState("")
  const [totpQrSrc, setTotpQrSrc] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)
  const totpDialogOpen = totpStep !== "idle"
  const canVerifyTotp = /^\d{6}$/.test(totpCode) && !totpBusy

  const resetTotpDialog = () => {
    setTotpStep("idle")
    setTotpBusy(false)
    setTotpCode("")
    setTotpSecret("")
    setTotpQrSrc(null)
    setSecretCopied(false)
  }

  const handleCopySecret = async () => {
    if (!totpSecret) return
    try {
      await navigator.clipboard.writeText(totpSecret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Clipboard access was blocked — try copying manually.",
        variant: "destructive",
      })
    }
  }

  const handleOpenEnable2FA = async () => {
    setTotpStep("setup")
    setTotpBusy(true)
    try {
      const res = await apiRequest<{ data: { secret: string; otpauthUrl?: string } }>(
        "/user/me/2fa/setup",
        { method: "POST", auth: true },
      )
      setTotpSecret(res.data.secret)
      if (res.data.otpauthUrl) {
        const url = await qrDataUrl(res.data.otpauthUrl, { width: 200, margin: 2 }).catch(
          () => null,
        )
        setTotpQrSrc(url)
      }
    } catch (err) {
      toast({
        title: "Couldn't start setup",
        description: err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      })
      resetTotpDialog()
    } finally {
      setTotpBusy(false)
    }
  }

  const handleVerify2FA = async () => {
    setTotpBusy(true)
    try {
      await apiRequest("/user/me/2fa/verify", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ code: totpCode }),
      })
      toast({ title: "Two-factor authentication enabled" })
      resetTotpDialog()
      await refreshRoles()
    } catch (err) {
      toast({
        title: "Verification failed",
        description: err instanceof Error ? err.message : "Check the code and try again.",
        variant: "destructive",
      })
      setTotpBusy(false)
    }
  }

  const handleDisable2FA = async () => {
    setTotpBusy(true)
    try {
      await apiRequest("/user/me/2fa/disable", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ code: totpCode }),
      })
      toast({ title: "Two-factor authentication disabled" })
      resetTotpDialog()
      await refreshRoles()
    } catch (err) {
      toast({
        title: "Couldn't disable",
        description: err instanceof Error ? err.message : "Check the code and try again.",
        variant: "destructive",
      })
      setTotpBusy(false)
    }
  }

  const resetDialog = () => {
    setStep("idle")
    setOtp("")
    setBusy(false)
  }

  const handleOpenDialog = () => {
    if (busy) return
    setStep("request")
  }

  const handleSendOtp = async () => {
    setBusy(true)
    try {
      await apiRequest("/user/me/delete/request-otp", {
        method: "POST",
        auth: true,
      })
      toast({
        title: "Code sent",
        description: `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
      })
      setStep("confirm")
    } catch (err) {
      toast({
        title: "Couldn't send code",
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmDelete = async () => {
    setBusy(true)
    try {
      await apiRequest("/user/me/delete/confirm", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ otp }),
      })
      // Backend already cleared cookies. Tear down local state on this
      // tab + sibling tabs, then bounce home so the now-deleted user
      // doesn't sit on an authed page.
      try {
        await logout()
      } catch {
        // logout's /auth/logout call may 401 because cookies are gone —
        // safe to ignore, providers.logout still clears local state.
      }
      router.push("/")
    } catch (err) {
      toast({
        title: "Deletion failed",
        description:
          err instanceof Error
            ? err.message
            : "Check the code and try again.",
        variant: "destructive",
      })
      setBusy(false)
    }
  }

  const canConfirm = /^\d{6}$/.test(otp) && !busy

  return (
    <div className="space-y-5">
      <SectionHeader icon={Shield} title="Security" subtitle="Protect your account." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <InfoCard
          icon={Mail}
          label="Email"
          value={email}
          pill={emailVerified ? "Verified" : "Unverified"}
          pillTone={emailVerified ? "emerald" : "amber"}
        />
        <InfoCard
          icon={KeyRound}
          label="Password"
          value="Last changed —"
          action={
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-(--brand-blue) hover:underline"
            >
              Change
            </Link>
          }
        />
        <InfoCard
          icon={Smartphone}
          label="Phone"
          value={phone ? `+91 ${phone}` : "Not set"}
          pill={phone ? "Not linked" : "Add number"}
          pillTone="amber"
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">Two-factor authentication</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  totpEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {totpEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {totpEnabled
                ? "A 6-digit code from your authenticator app is required at sign-in."
                : "Add an extra layer of security at sign-in."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (totpEnabled ? setTotpStep("disable") : void handleOpenEnable2FA())}
          disabled={totpBusy}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {totpEnabled ? "Disable" : "Enable"}
        </button>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <LogOut className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Log out of all devices</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Ends every signed-in session, including this one — use this if you think a device
              was compromised.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogoutAllDevices()}
          disabled={loggingOutAll}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {loggingOutAll ? "Signing out..." : "Log out everywhere"}
        </button>
      </div>

      <DangerZone
        title="Delete account"
        description="Permanently delete your account and all associated tickets and history. An admin can recover within 24 hours; after that everything is irrecoverable."
        actionLabel="Request deletion"
        onAction={handleOpenDialog}
        disabled={busy}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetDialog()
        }}
      >
        <DialogContent>
          {step === "request" && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm account deletion</DialogTitle>
                <DialogDescription>
                  We&apos;ll email a 6-digit confirmation code to{" "}
                  <span className="font-medium text-slate-900">{email}</span>.
                  After you enter the code, your account is scheduled for
                  permanent removal in 24 hours.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={handleSendOtp} disabled={busy}>
                  {busy ? "Sending..." : "Send code"}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle>Enter confirmation code</DialogTitle>
                <DialogDescription>
                  Check your inbox for the 6-digit code we just sent to{" "}
                  <span className="font-medium text-slate-900">{email}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">
                    6-digit code
                  </span>
                  <Input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="mt-1 text-center text-lg tracking-[0.4em]"
                    disabled={busy}
                  />
                </label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetDialog} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={!canConfirm}
                >
                  {busy ? "Deleting..." : "Delete my account"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={totpDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetTotpDialog()
        }}
      >
        <DialogContent>
          {totpStep === "setup" && (
            <>
              <DialogHeader>
                <DialogTitle>Set up two-factor authentication</DialogTitle>
                <DialogDescription>
                  Scan the QR code with an authenticator app (Google Authenticator, Authy,
                  1Password, etc.), then enter the 6-digit code it shows.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                {totpQrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={totpQrSrc}
                    alt="Two-factor authentication QR code"
                    width={180}
                    height={180}
                    className="rounded-lg border border-slate-200"
                  />
                ) : totpBusy ? (
                  <p className="text-xs text-slate-500">Generating...</p>
                ) : null}

                {totpSecret ? (
                  <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-600">
                      Can&apos;t scan? Copy the setup key instead
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCopySecret()}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {secretCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                ) : null}

                <label className="block w-full">
                  <span className="text-xs font-medium text-slate-700">6-digit code</span>
                  <Input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="mt-1 border-slate-200 bg-white text-center text-lg tracking-[0.4em]"
                    disabled={totpBusy}
                  />
                </label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetTotpDialog} disabled={totpBusy}>
                  Cancel
                </Button>
                <Button onClick={handleVerify2FA} disabled={!canVerifyTotp}>
                  {totpBusy ? "Verifying..." : "Verify & enable"}
                </Button>
              </DialogFooter>
            </>
          )}

          {totpStep === "disable" && (
            <>
              <DialogHeader>
                <DialogTitle>Disable two-factor authentication</DialogTitle>
                <DialogDescription>
                  Enter your current authenticator code to confirm.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">6-digit code</span>
                  <Input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="mt-1 text-center text-lg tracking-[0.4em]"
                    disabled={totpBusy}
                  />
                </label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetTotpDialog} disabled={totpBusy}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDisable2FA} disabled={!canVerifyTotp}>
                  {totpBusy ? "Disabling..." : "Disable"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
