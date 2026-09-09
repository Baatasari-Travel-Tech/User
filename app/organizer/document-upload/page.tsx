"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
// html2canvas + jsPDF are ~550 KB combined and only needed when the organizer
// actually generates the agreement PDF — dynamically imported inside
// buildAgreementPdf() so they don't bloat this route's initial load.
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PageShell, SectionCard } from "@/components/platform/page-shell"
import { useAuth } from "@/app/providers"
import {
  completeOrganizerDocuments,
  fetchOrganizerDocumentBlob,
  uploadOrganizerDocument,
} from "@/lib/api/organizer-documents"

type SignatureTab = "upload" | "draw"

const todayLabel = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

const BAATASARI_LEGAL_NAME = "Simha Karthik Reddy"
const BAATASARI_TRADE_NAME = "Baatasari"
const BAATASARI_GSTIN = "37HRGPR8105H1ZD"
const BAATASARI_NOTICE_EMAIL = "contact-us@baatasari.com"
const BAATASARI_ADDRESS_LINES = [
  "28/1A-4-145/41, Sathyamjee Layout",
  "Near General Shop, Navalak Gardens",
  "Nellore, Sri Potti Sriramulu Nellore",
  "Andhra Pradesh - 524002",
]
const MAX_AGREEMENT_UPLOAD_BYTES = 25 * 1024 * 1024

// Inline styles (the agreement is rasterized by html2canvas, which strips
// stylesheets — so every rule must be inline and inherit the container font).
const agSectionTitle: CSSProperties = { margin: "16px 0 6px", fontWeight: 700 }
const agPara: CSSProperties = { margin: "0 0 8px" }
const agList: CSSProperties = { margin: "0 0 8px 18px", padding: 0 }

const formatValue = (value: string | null | undefined, fallback = "Not provided") => {
  const nextValue = value?.trim()
  return nextValue && nextValue.length > 0 ? nextValue : fallback
}

const triggerPdfDownload = (blob: Blob, fileName: string) => {
  const downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = downloadUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500)
}

export default function OrganizerDocumentUploadPage() {
  const router = useRouter()
  const { user, profile, organizerProfile, organizerVerificationStatus, refreshOrganizerStatus } = useAuth()

  const [panFileName, setPanFileName] = useState<string | null>(null)
  const [isUploadingPan, setIsUploadingPan] = useState(false)
  const [panUploaded, setPanUploaded] = useState(false)
  const [agreementDownloaded, setAgreementDownloaded] = useState(false)
  const [isBuildingAgreement, setIsBuildingAgreement] = useState(false)
  const [agreementModalOpen, setAgreementModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [signatureTab, setSignatureTab] = useState<SignatureTab>("upload")
  const [uploadScale, setUploadScale] = useState(1)
  const [uploadRotation, setUploadRotation] = useState(0)
  const [uploadImage, setUploadImage] = useState<HTMLImageElement | null>(null)

  const agreementRef = useRef<HTMLDivElement>(null)
  const uploadPreviewRef = useRef<HTMLCanvasElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const drawPointRef = useRef<{ x: number; y: number } | null>(null)
  const uploadObjectUrlRef = useRef<string | null>(null)

  const organizerDisplayName = useMemo(() => {
    const fullName = profile?.full_name?.trim()
    if (fullName) return fullName
    const orgName = organizerProfile?.orgName?.trim()
    if (orgName) return orgName
    return user?.email ?? "Organizer"
    // Whole objects as dependencies, not optional-chained members.
    //
    // With `[organizerProfile?.orgName, profile?.full_name, user?.email]` the
    // React Compiler reported "existing memoization could not be preserved" —
    // it cannot match an optional chain in the dependency list to the same
    // expression in the body, so it gives up on the whole component rather
    // than risk changing its behaviour.
    //
    // Depending on the objects is marginally broader (a change to any field
    // recomputes a string), which costs three comparisons and buys back
    // compilation for everything in this file.
  }, [organizerProfile, profile, user])

  const organizerAddress = useMemo(() => {
    const parts = [
      organizerProfile?.address,
      organizerProfile?.city,
      organizerProfile?.state,
      organizerProfile?.pincode ? `PIN ${organizerProfile.pincode}` : null,
    ]
      .map((part) => part?.trim() ?? "")
      .filter((part) => part.length > 0)
    if (parts.length === 0) return "Not provided"
    return parts.join(", ")
    // Same reason as organizerDisplayName above: optional chains in a
    // dependency list defeat the React Compiler.
  }, [organizerProfile])

  const organizerEntityTypeLabel =
    organizerProfile?.entityType === "INDIVIDUAL" ? "Individual" : "Organization"
  const hasStoredAgreement = Boolean(organizerProfile?.agreementDocumentKey)

  useEffect(() => {
    if (!user) return
    if (user.role !== "ORGANIZER") {
      router.replace("/403")
      return
    }
    if (user.onboardingStatus !== "COMPLETED") {
      router.replace("/organizer/onboarding")
      return
    }
    if (organizerVerificationStatus === "EMAIL_NOT_VERIFIED") {
      router.replace("/organizer/email-verification")
      return
    }
    if (organizerVerificationStatus === "PENDING") {
      router.replace("/organizer/pending")
      return
    }
    if (organizerVerificationStatus === "APPROVED") {
      router.replace("/organizer/dashboard")
    }
  }, [organizerVerificationStatus, router, user])

  // Seed the two checklist flags from the loaded profile, during render.
  //
  // They cannot be plain derived values: the page also sets them locally the
  // moment an upload or a download finishes, before the profile is refetched.
  // So they are state that STARTS from a prop — React's documented "adjust
  // state when a prop changes" — and doing it in an effect meant one frame
  // showing both steps incomplete before they flipped.
  const [syncedProfile, setSyncedProfile] = useState(organizerProfile)
  if (organizerProfile && organizerProfile !== syncedProfile) {
    setSyncedProfile(organizerProfile)
    setPanUploaded(Boolean(organizerProfile.panDocumentKey))
    setAgreementDownloaded(Boolean(organizerProfile.agreementDownloadedAt))
  }

  useEffect(() => {
    return () => {
      if (uploadObjectUrlRef.current) {
        URL.revokeObjectURL(uploadObjectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!signatureModalOpen && !agreementModalOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = overflow
    }
  }, [agreementModalOpen, signatureModalOpen])

  const renderUploadPreview = useCallback(() => {
    const canvas = uploadPreviewRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = "#f8fafc"
    context.fillRect(0, 0, canvas.width, canvas.height)

    if (!uploadImage) return
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseScale = Math.min((canvas.width * 0.75) / uploadImage.width, (canvas.height * 0.75) / uploadImage.height)
    const width = uploadImage.width * baseScale * uploadScale
    const height = uploadImage.height * baseScale * uploadScale

    context.save()
    context.translate(centerX, centerY)
    context.rotate((uploadRotation * Math.PI) / 180)
    context.drawImage(uploadImage, -width / 2, -height / 2, width, height)
    context.restore()
  }, [uploadImage, uploadRotation, uploadScale])

  useEffect(() => {
    renderUploadPreview()
  }, [renderUploadPreview])

  const handleUploadSignatureFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Signature upload must be an image file.")
      return
    }
    if (uploadObjectUrlRef.current) {
      URL.revokeObjectURL(uploadObjectUrlRef.current)
    }
    const objectUrl = URL.createObjectURL(file)
    uploadObjectUrlRef.current = objectUrl
    const image = new Image()
    image.onload = () => {
      setUploadImage(image)
      setUploadScale(1)
      setUploadRotation(0)
      setError(null)
    }
    image.src = objectUrl
  }

  const saveUploadedSignature = () => {
    if (!uploadImage) {
      setError("Upload a signature image first.")
      return
    }
    const canvas = document.createElement("canvas")
    canvas.width = 700
    canvas.height = 250
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseScale = Math.min((canvas.width * 0.75) / uploadImage.width, (canvas.height * 0.75) / uploadImage.height)
    const width = uploadImage.width * baseScale * uploadScale
    const height = uploadImage.height * baseScale * uploadScale
    context.save()
    context.translate(centerX, centerY)
    context.rotate((uploadRotation * Math.PI) / 180)
    context.drawImage(uploadImage, -width / 2, -height / 2, width, height)
    context.restore()

    setSignatureDataUrl(canvas.toDataURL("image/png"))
    setSignatureModalOpen(false)
    setSuccess("Organizer signature captured.")
  }

  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setError(null)
  }

  const drawAtPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const beginDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.cancelable) {
      event.preventDefault()
    }
    const canvas = drawCanvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId)
    }
    const point = drawAtPoint(event)
    if (!point) return
    drawingRef.current = true
    drawPointRef.current = point
    context.lineWidth = 3
    context.lineCap = "round"
    context.strokeStyle = "#0f172a"
  }

  const continueDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.cancelable) {
      event.preventDefault()
    }
    if (!drawingRef.current) return
    const canvas = drawCanvasRef.current
    const context = canvas?.getContext("2d")
    const point = drawAtPoint(event)
    if (!canvas || !context || !point || !drawPointRef.current) return
    context.beginPath()
    context.moveTo(drawPointRef.current.x, drawPointRef.current.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    drawPointRef.current = point
  }

  const endDraw = (event?: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event?.cancelable) {
      event.preventDefault()
    }
    if (event) {
      const canvas = drawCanvasRef.current
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    }
    drawingRef.current = false
    drawPointRef.current = null
  }

  const saveDrawnSignature = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    setSignatureDataUrl(canvas.toDataURL("image/png"))
    setSignatureModalOpen(false)
    setSuccess("Organizer signature captured.")
  }

  const handlePanUpload = async (file: File) => {
    try {
      setError(null)
      setSuccess(null)
      if (!isPdfFile(file)) {
        throw new Error("PAN file must be a PDF.")
      }
      setIsUploadingPan(true)
      await uploadOrganizerDocument("pan", file)
      setPanUploaded(true)
      setPanFileName(file.name)
      await refreshOrganizerStatus()
      setSuccess("PAN PDF selected and uploaded securely.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "PAN upload failed.")
    } finally {
      setIsUploadingPan(false)
    }
  }

  const buildAgreementPdf = async () => {
    if (!agreementRef.current) {
      throw new Error("Agreement view is not ready yet.")
    }
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ])
    const renderScale = Math.min(window.devicePixelRatio || 1, 1.5)
    const canvas = await html2canvas(agreementRef.current, {
      scale: renderScale,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: agreementRef.current.scrollWidth,
      windowHeight: agreementRef.current.scrollHeight,
      onclone: (clonedDocument: Document) => {
        clonedDocument.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove())
        clonedDocument.documentElement.style.backgroundColor = "#ffffff"
        clonedDocument.documentElement.style.color = "#111827"
        if (clonedDocument.body) {
          clonedDocument.body.style.backgroundColor = "#ffffff"
          clonedDocument.body.style.color = "#111827"
        }
      },
    })
    const imageData = canvas.toDataURL("image/jpeg", 0.82)
    const pdf = new jsPDF("p", "pt", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 24
    const renderWidth = pageWidth - margin * 2
    const renderHeight = (canvas.height * renderWidth) / canvas.width

    let heightLeft = renderHeight
    let y = margin
    pdf.addImage(imageData, "JPEG", margin, y, renderWidth, renderHeight)
    heightLeft -= pageHeight - margin * 2

    while (heightLeft > 0) {
      y = margin - (renderHeight - heightLeft)
      pdf.addPage()
      pdf.addImage(imageData, "JPEG", margin, y, renderWidth, renderHeight)
      heightLeft -= pageHeight - margin * 2
    }

    return pdf.output("blob")
  }

  const handleDownloadAgreement = async () => {
    try {
      setError(null)
      setSuccess(null)
      setIsBuildingAgreement(true)
      if (hasStoredAgreement && !signatureDataUrl) {
        const existingAgreementBlob = await fetchOrganizerDocumentBlob("agreement")
        triggerPdfDownload(
          existingAgreementBlob,
          `baatasari-organizer-agreement-${user?.id ?? "signed"}.pdf`
        )
        setAgreementDownloaded(true)
        setSuccess("Agreement downloaded.")
        return
      }

      if (!panUploaded) {
        throw new Error("Upload PAN PDF before downloading agreement.")
      }
      if (!signatureDataUrl) {
        throw new Error("Add organizer signature before downloading agreement.")
      }

      const agreementBlob = await buildAgreementPdf()
      if (agreementBlob.size > MAX_AGREEMENT_UPLOAD_BYTES) {
        throw new Error("Agreement file is too large. Please keep signature image smaller and retry.")
      }
      triggerPdfDownload(agreementBlob, `baatasari-organizer-agreement-${user?.id ?? "signed"}.pdf`)
      await uploadOrganizerDocument("agreement", agreementBlob)
      setAgreementDownloaded(true)
      await refreshOrganizerStatus()
      setSuccess("Agreement downloaded and stored securely.")
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Agreement generation failed.")
    } finally {
      setIsBuildingAgreement(false)
    }
  }

  const handleSubmitDocuments = async () => {
    try {
      setError(null)
      setSuccess(null)
      if (!panUploaded || (!signatureDataUrl && !hasStoredAgreement)) {
        throw new Error("Upload PAN PDF and sign the agreement before submitting.")
      }
      setIsSubmitting(true)

      if (signatureDataUrl) {
        const agreementBlob = await buildAgreementPdf()
        if (agreementBlob.size > MAX_AGREEMENT_UPLOAD_BYTES) {
          throw new Error("Agreement file is too large. Please keep signature image smaller and retry.")
        }
        await uploadOrganizerDocument("agreement", agreementBlob)
      }

      await completeOrganizerDocuments({})
      await refreshOrganizerStatus()
      router.replace("/organizer/pending")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit documents.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderAgreementContainer = (withRef = false, compact = false) => {
    const organizerGstinDisplay = organizerProfile?.gstNumber?.trim()
      ? organizerProfile.gstNumber
      : "Not registered — GST Undertaking accepted"
    const organizerBankDetails =
      [
        organizerProfile?.bankAccountName,
        organizerProfile?.bankName,
        organizerProfile?.bankAccountNumber,
        organizerProfile?.bankIfsc,
      ]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(", ") || "To be filled"

    return (
      <div
        ref={withRef ? agreementRef : undefined}
        style={{
          width: "100%",
          minWidth: compact ? "auto" : "780px",
          backgroundColor: "#ffffff",
          color: "#111827",
          border: "1px solid #cbd5e1",
          borderRadius: "14px",
          padding: compact ? "16px" : "24px",
          fontFamily: "Times New Roman, Georgia, serif",
          fontSize: compact ? "12px" : "13px",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b7280" }}>
          Privileged and Confidential
        </p>
        <h3 style={{ margin: "10px 0 10px", fontSize: compact ? "20px" : "24px", lineHeight: 1.2, textAlign: "center" }}>
          Event Organizer Agreement
        </h3>

        <p style={agPara}>
          This Agreement (&ldquo;Agreement&rdquo;) is made on this <strong>{todayLabel}</strong> (&ldquo;Signing Date&rdquo;)
          between:
        </p>
        <p style={agPara}>
          <strong>{BAATASARI_LEGAL_NAME}</strong>, a Sole Proprietor operating under the name and style &ldquo;
          {BAATASARI_TRADE_NAME}&rdquo;, having its principal place of business at {BAATASARI_ADDRESS_LINES.join(", ")},
          GSTIN: {BAATASARI_GSTIN} (hereinafter referred to as &ldquo;Baatasari&rdquo; or the &ldquo;Platform&rdquo;, which
          expression shall, unless repugnant to the context or meaning thereof, be deemed to include its successors and
          permitted assigns);
        </p>
        <p style={{ ...agPara, fontWeight: 700 }}>AND</p>
        <p style={agPara}>
          <strong>{organizerDisplayName}</strong>, an {organizerEntityTypeLabel}, having its address at {organizerAddress}{" "}
          (hereinafter referred to as the &ldquo;Event Organizer&rdquo;);
        </p>
        <p style={agPara}>
          Baatasari and the Event Organizer shall hereinafter be individually referred to as a &ldquo;Party&rdquo; and
          collectively as the &ldquo;Parties&rdquo;.
        </p>

        <div style={{ marginTop: "10px", border: "1px solid #d1d5db", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: compact ? "fixed" : "auto" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    width: "28%",
                    borderRight: "1px solid #d1d5db",
                    borderBottom: "1px solid #d1d5db",
                    padding: "10px",
                    fontWeight: 700,
                    wordBreak: "break-word",
                  }}
                >
                  Platform (First Party)
                </td>
                <td style={{ borderBottom: "1px solid #d1d5db", padding: "10px", wordBreak: "break-word" }}>
                  {BAATASARI_LEGAL_NAME}, Sole Proprietor trading as {BAATASARI_TRADE_NAME} (baatasari.com)
                  <br />
                  Address: {BAATASARI_ADDRESS_LINES.join(", ")}
                  <br />
                  GSTIN: {BAATASARI_GSTIN}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    width: "28%",
                    borderRight: "1px solid #d1d5db",
                    padding: "10px",
                    fontWeight: 700,
                    wordBreak: "break-word",
                  }}
                >
                  Event Organizer (Second Party)
                </td>
                <td style={{ padding: "10px", wordBreak: "break-word" }}>
                  {organizerDisplayName} ({organizerEntityTypeLabel})
                  <br />
                  Address: {organizerAddress}
                  <br />
                  Email: {formatValue(organizerProfile?.contactEmail, user?.email ?? "Not provided")}
                  <br />
                  Phone: {formatValue(organizerProfile?.contactPhone)}
                  <br />
                  PAN: {formatValue(organizerProfile?.panNumber, "Pending")} &nbsp;|&nbsp; GSTIN: {organizerGstinDisplay}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ ...agSectionTitle, marginTop: "16px" }}>Recitals</p>
        <p style={agPara}>
          (A) Baatasari is engaged in the business of operating an online platform (www.baatasari.com and mobile
          application) that enables customers to discover, connect with, and book various local events, experiences,
          workshops, performances, meetups, and activities without accessing physical points of sale.
        </p>
        <p style={agPara}>
          (B) The Event Organizer is organizing an Event (as defined below) and has approached Baatasari for listing and
          booking services through the Platform.
        </p>
        <p style={agPara}>
          (C) Based on the representations and assurances made by the Event Organizer, the Parties are entering into this
          Agreement to record the terms and conditions based on which Baatasari shall provide the Services for the Event.
        </p>
        <p style={agPara}>
          NOW THEREFORE, in consideration of the mutual promises and agreements expressed herein, the Parties agree as
          follows:
        </p>

        <p style={agSectionTitle}>1. Definitions</p>
        <p style={agPara}>
          The following capitalized words and expressions shall have the respective meanings set forth below:
        </p>
        <ul style={agList}>
          <li><strong>&ldquo;Confidential Information&rdquo;</strong> — Includes inventions, ideas, know-how, techniques, processes, designs, data, Intellectual Property Rights, software, business information, customer data, etc., disclosed by either Party.</li>
          <li><strong>&ldquo;Customers&rdquo;</strong> — Persons who book Tickets through the Platform.</li>
          <li><strong>&ldquo;Event&rdquo;</strong> — All events, workshops, experiences, or activities listed by the Event Organizer on the Platform.</li>
          <li><strong>&ldquo;Intellectual Property Rights&rdquo;</strong> — All rights in copyrights, trademarks, trade names, logos, patents, know-how, software, etc.</li>
          <li><strong>&ldquo;Losses&rdquo;</strong> — All liabilities, damages, penalties, costs, expenses, legal fees, etc.</li>
          <li><strong>&ldquo;Platform&rdquo;</strong> — www.baatasari.com, mobile applications, and any other channels operated or associated with Baatasari.</li>
          <li><strong>&ldquo;Ticket / Booking&rdquo;</strong> — Any ticket or reservation issued to Customers through the Platform.</li>
          <li><strong>&ldquo;Venue&rdquo;</strong> — The location(s) where the Event will take place.</li>
        </ul>

        <p style={agSectionTitle}>2. Appointment &amp; Services</p>
        <p style={agPara}>
          2.1 The Event Organizer hereby appoints Baatasari to facilitate online discovery, promotion, and booking of
          Tickets for the Event through the Platform (&ldquo;Services&rdquo;).
        </p>
        <p style={agPara}>2.2 It is clarified that:</p>
        <ul style={agList}>
          <li>Baatasari is a service provider offering booking facilitation.</li>
          <li>The sale/booking of Tickets is concluded directly between the Event Organizer and the Customer.</li>
          <li>Tickets are issued on behalf of the Event Organizer.</li>
          <li>Baatasari is not responsible for bookings made outside the Platform.</li>
        </ul>
        <p style={agPara}>2.3 The appointment is made on a non-exclusive basis.</p>

        <p style={agSectionTitle}>3. Responsibilities of the Event Organizer</p>
        <p style={agPara}>The Event Organizer shall:</p>
        <ol style={agList} type="a">
          <li>Be responsible for end-to-end execution and delivery of the Event.</li>
          <li>Notify Baatasari of all discounts, schemes, or benefits at least 3 days in advance.</li>
          <li>Obtain all necessary approvals, licenses, permissions, clearances (including from police, fire, entertainment tax, etc.), and insurance at its sole cost.</li>
          <li>Comply with all applicable laws, including GST, Income Tax, DPDP Act 2023, and COVID/local guidelines.</li>
          <li>Provide accurate and complete information about the Event.</li>
          <li>Ensure safety and security of Customers at the Event.</li>
          <li>Promptly notify Baatasari of any delay, postponement, or cancellation.</li>
          <li>Handle all customer complaints and grievances within 72 hours.</li>
          <li>Provide valid PAN and GSTIN or accept the GST Undertaking.</li>
          <li>Indemnify Baatasari against any claims arising from the Event.</li>
          <li>Not engage in illegal or unfair trade practices.</li>
          <li>Maintain valid agreements with venue owners, vendors, and performers.</li>
          <li>Procure appropriate insurance policies for the Event.</li>
        </ol>

        <p style={agSectionTitle}>4. Responsibilities of Baatasari</p>
        <p style={agPara}>
          Baatasari shall render the Services in a professional manner by providing the Platform for listing, discovery,
          and online booking.
        </p>

        <p style={agSectionTitle}>5. Consideration &amp; Payment Terms</p>
        <p style={agPara}>5.1 Baatasari will charge a Platform Fee of ₹10 (Rupees Ten) per ticket (or as mutually agreed) + applicable taxes.</p>
        <p style={agPara}>5.2 Payment Gateway fees (Razorpay) shall be charged as per actuals and may be absorbed by Organizer or passed to Customer as selected during event creation.</p>
        <p style={agPara}>5.3 Baatasari shall release the Organizer&rsquo;s share after deduction of Platform Fee, PG Fee, TCS (if applicable), and any other charges, within T+7 days after the Event (subject to Razorpay settlement policy).</p>
        <p style={agPara}>5.4 In case of cancellations or refunds, the Organizer shall reimburse Baatasari immediately for any amounts already settled.</p>
        <p style={agPara}>5.5 Baatasari shall raise an invoice for its Platform Fees.</p>

        <p style={agSectionTitle}>6. Taxes &amp; GST Compliance</p>
        <p style={agPara}>6.1 Organizer is solely responsible for its tax compliance including charging and remitting GST on tickets.</p>
        <p style={agPara}>6.2 Baatasari, as an E-commerce Operator, shall collect TCS @ 0.5% as per GST law and file GSTR-8.</p>
        <p style={agPara}>6.3 Organizer shall indemnify Baatasari against any tax demands, interest, or penalties arising due to Organizer&rsquo;s non-compliance.</p>

        <p style={agSectionTitle}>7. Material Changes / Cancellation</p>
        <p style={agPara}>
          If the Event is cancelled, postponed, or materially changed, Baatasari may charge cancellation fees and process
          refunds. Organizer shall reimburse all refund amounts to Baatasari within 7 days.
        </p>

        <p style={agSectionTitle}>8. Intellectual Property Rights</p>
        <p style={agPara}>
          Each Party retains its own IP. Organizer grants Baatasari a limited license to use Event content for promotion on
          the Platform.
        </p>

        <p style={agSectionTitle}>9. Limitation of Liability</p>
        <p style={agPara}>
          Baatasari&rsquo;s total liability shall not exceed the Platform Fees received. Baatasari shall not be liable for
          indirect, consequential, or punitive damages.
        </p>

        <p style={agSectionTitle}>10. Indemnity</p>
        <p style={agPara}>
          Organizer shall indemnify and hold harmless Baatasari against all Losses arising from breach of this Agreement,
          the Event, or tax non-compliance.
        </p>

        <p style={agSectionTitle}>11. Term and Termination</p>
        <p style={agPara}>11.1 This Agreement shall remain valid for 12 months or until all payments are settled.</p>
        <p style={agPara}>11.2 Either Party may terminate with 30 days&rsquo; notice.</p>
        <p style={agPara}>11.3 Baatasari may terminate immediately for breach, legal risk, or reputation damage.</p>

        <p style={agSectionTitle}>12. Confidentiality, Force Majeure, Governing Law</p>
        <ul style={agList}>
          <li>Governing Law: Laws of India.</li>
          <li>Dispute Resolution: Arbitration in Visakhapatnam.</li>
          <li>Confidentiality &amp; Force Majeure: Standard clauses as per industry practice.</li>
        </ul>

        <p style={agSectionTitle}>13. Miscellaneous</p>
        <p style={agPara}>Entire Agreement, Severability, Waiver, Counterparts, etc.</p>

        <p style={agPara}>
          IN WITNESS WHEREOF the Parties have executed this Agreement on the date mentioned above.
        </p>

        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid #d1d5db",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ flex: "1 1 260px", border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px" }}>
            <p style={{ margin: 0, fontWeight: 700 }}>For Baatasari</p>
            <p style={{ margin: "4px 0 10px", fontSize: "12px", color: "#4b5563" }}>Sole Proprietor / Authorized Signatory</p>
            <div style={{ minHeight: "76px", display: "flex", alignItems: "center" }}>
              <img
                src="/Signature.png"
                alt="Baatasari authorized signature"
                style={{ maxHeight: "64px", width: "auto", objectFit: "contain" }}
              />
            </div>
            <p style={{ margin: "8px 0 0" }}>Name: {BAATASARI_LEGAL_NAME}</p>
            <p style={{ margin: "2px 0 0" }}>GSTIN: {BAATASARI_GSTIN}</p>
            <p style={{ margin: "2px 0 0" }}>Date: {todayLabel}</p>
          </div>
          <div style={{ flex: "1 1 260px", border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px" }}>
            <p style={{ margin: 0, fontWeight: 700 }}>For Event Organizer</p>
            <p style={{ margin: "4px 0 10px", fontSize: "12px", color: "#4b5563" }}>Authorized Signatory</p>
            <div
              style={{
                minHeight: "76px",
                border: "1px dashed #94a3b8",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {signatureDataUrl ? (
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  style={{ width: "100%", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                >
                  <img
                    src={signatureDataUrl}
                    alt="Organizer signature"
                    style={{ maxHeight: "58px", width: "100%", objectFit: "contain" }}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  style={{
                    border: "1px solid #111827",
                    borderRadius: "999px",
                    padding: "8px 14px",
                    background: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Click to sign
                </button>
              )}
            </div>
            <p style={{ margin: "8px 0 0" }}>Name: {organizerDisplayName}</p>
            <p style={{ margin: "2px 0 0" }}>Date: {todayLabel}</p>
          </div>
        </div>

        <p style={{ ...agSectionTitle, textAlign: "center", marginTop: "18px" }}>Schedule 1 — Particulars of the Event Organizer</p>
        <div style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px" }}>
          <p style={{ margin: "0 0 4px" }}>Name: {organizerDisplayName}</p>
          <p style={{ margin: "0 0 4px" }}>Address: {organizerAddress}</p>
          <p style={{ margin: "0 0 4px" }}>PAN: {formatValue(organizerProfile?.panNumber, "Pending")}</p>
          <p style={{ margin: "0 0 4px" }}>GSTIN: {organizerGstinDisplay}</p>
          <p style={{ margin: 0 }}>Bank Account Details: {organizerBankDetails}</p>
        </div>

        <p style={{ ...agSectionTitle, textAlign: "center" }}>Schedule 2 — Commercial Arrangement</p>
        <div style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px" }}>
          <p style={{ margin: "0 0 4px" }}>Platform Fee: ₹10 per ticket</p>
          <p style={{ margin: "0 0 4px" }}>Settlement Timeline: T+7 days</p>
          <p style={{ margin: "0 0 8px" }}>Term: 12 months</p>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Notices</p>
          <p style={{ margin: "0 0 2px" }}>To Baatasari: {BAATASARI_NOTICE_EMAIL}</p>
          <p style={{ margin: "0 0 2px" }}>Address: {BAATASARI_ADDRESS_LINES.join(", ")}</p>
          <p style={{ margin: "0 0 2px" }}>
            To Organizer: {formatValue(organizerProfile?.contactEmail, user?.email ?? "Not provided")}
          </p>
          <p style={{ margin: 0 }}>Address: {organizerAddress}</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requireOnboarding={false}>
      <PageShell
        className="px-2 sm:px-3 lg:px-6 [&>section]:px-3 [&>section]:sm:px-5"
        eyebrow="Organizer document upload"
        title="Upload Compliance Documents"
        description="Email verification is complete. Upload PAN and signed agreement to move into final approval review."
      >
        <div className="grid min-w-0 gap-6">
          <SectionCard
            title="PAN Card Upload"
            description="Upload PAN card as PDF. Upload starts immediately after file selection."
            className="min-w-0 p-4 sm:p-5"
          >
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                PAN card PDF
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null
                    if (!nextFile) return
                    void handlePanUpload(nextFile)
                  }}
                  disabled={isUploadingPan}
                  className="min-w-0 w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            {isUploadingPan ? <p className="mt-2 text-sm text-amber-700">Uploading PAN PDF...</p> : null}
            {!isUploadingPan && panUploaded ? (
              <p className="mt-2 text-sm text-emerald-700">
                PAN document uploaded{panFileName ? `: ${panFileName}` : ""}.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Agreement"
            description="Open the agreement, sign inside the document, then use Download and Submit."
            className="min-w-0 p-4 sm:p-5"
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  Open agreement, click the organizer signature area inside the document to sign, then click Done.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAgreementModalOpen(true)}
                    className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
                  >
                    Open agreement
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M7 13L13 7M8 7H13V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => void handleDownloadAgreement()}
                  disabled={isBuildingAgreement || (!hasStoredAgreement && (!panUploaded || !signatureDataUrl))}
                  className="w-full rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60 sm:w-auto"
                >
                  {isBuildingAgreement
                    ? "Preparing agreement..."
                    : hasStoredAgreement && !signatureDataUrl
                      ? "Download uploaded agreement"
                      : "Download"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitDocuments()}
                  disabled={isSubmitting || !panUploaded || (!signatureDataUrl && !hasStoredAgreement)}
                  className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>

              {agreementDownloaded ? (
                <p className="text-right text-sm text-emerald-700">Agreement downloaded.</p>
              ) : (
                <p className="text-right text-sm text-slate-500">
                  Download is optional. Submit unlocks after PAN upload and signing the agreement.
                </p>
              )}
            </div>
          </SectionCard>

          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: "-10000px",
              top: 0,
              width: "820px",
              maxWidth: "100vw",
              opacity: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {renderAgreementContainer(true)}
          </div>

          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}
        </div>
      </PageShell>

      {agreementModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex min-h-full items-start justify-center py-1 sm:items-center sm:py-4">
            <div
              tabIndex={-1}
              className="min-w-0 max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl sm:p-6"
            >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-900">Agreement</h3>
              <button
                type="button"
                onClick={() => setAgreementModalOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="mt-4 min-w-0 overflow-x-hidden rounded-xl border border-slate-200 bg-white p-2">
              <div className="mx-auto min-w-0">{renderAgreementContainer(false, true)}</div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAgreementModalOpen(false)}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {signatureModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex min-h-full items-start justify-center py-1 sm:items-center sm:py-4">
            <div className="min-w-0 w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Organizer Signature</h3>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSignatureTab("upload")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  signatureTab === "upload" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                Upload image
              </button>
              <button
                type="button"
                onClick={() => setSignatureTab("draw")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  signatureTab === "draw" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                Draw signature
              </button>
            </div>

            {signatureTab === "upload" ? (
              <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[1fr_220px]">
                <div className="min-w-0 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleUploadSignatureFile(event.target.files?.[0] ?? null)}
                    className="min-w-0 w-full max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <canvas ref={uploadPreviewRef} width={620} height={180} className="w-full max-w-full rounded-lg border border-slate-200 bg-slate-50" />
                </div>
                <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Scale
                    <input
                      type="range"
                      min={0.4}
                      max={2.2}
                      step={0.05}
                      value={uploadScale}
                      onChange={(event) => setUploadScale(Number(event.target.value))}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Rotation
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={uploadRotation}
                      onChange={(event) => setUploadRotation(Number(event.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={saveUploadedSignature}
                    className="mt-2 w-full rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Use uploaded signature
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <canvas
                  ref={drawCanvasRef}
                  width={900}
                  height={280}
                  className="touch-none select-none w-full max-w-full rounded-lg border border-slate-200 bg-white"
                  onPointerDown={beginDraw}
                  onPointerMove={continueDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                  onPointerCancel={endDraw}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={clearDrawCanvas}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={saveDrawnSignature}
                    className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Use drawn signature
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  )
}
