"use client"

import { useCallback, useRef, useState } from "react"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const CROP_CONTAINER_SIZE = 240
const OUTPUT_SIZE = 512

type Offset = { x: number; y: number }

export type UseAvatarCrop = ReturnType<typeof useAvatarCrop>

export function useAvatarCrop(options: {
  onCropped: (file: File) => void
  onError: (message: string) => void
}) {
  const { onCropped, onError } = options

  const [cropSource, setCropSource] = useState<string | null>(null)
  const [isCropOpen, setIsCropOpen] = useState(false)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState<Offset>({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<Offset | null>(null)
  const [offsetStart, setOffsetStart] = useState<Offset>({ x: 0, y: 0 })
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null)

  const getCropMetrics = useCallback(
    (zoom: number = cropZoom) => {
      if (!cropImage) return null
      const baseScale = Math.max(
        CROP_CONTAINER_SIZE / cropImage.naturalWidth,
        CROP_CONTAINER_SIZE / cropImage.naturalHeight,
      )
      const scaledWidth = cropImage.naturalWidth * baseScale * zoom
      const scaledHeight = cropImage.naturalHeight * baseScale * zoom
      const maxX = Math.max(0, (scaledWidth - CROP_CONTAINER_SIZE) / 2)
      const maxY = Math.max(0, (scaledHeight - CROP_CONTAINER_SIZE) / 2)
      return { containerSize: CROP_CONTAINER_SIZE, baseScale, scaledWidth, scaledHeight, maxX, maxY }
    },
    [cropImage, cropZoom],
  )

  const clampOffset = useCallback(
    (offset: Offset, zoom: number = cropZoom): Offset => {
      const metrics = getCropMetrics(zoom)
      if (!metrics) return { x: 0, y: 0 }
      return {
        x: Math.min(metrics.maxX, Math.max(-metrics.maxX, offset.x)),
        y: Math.min(metrics.maxY, Math.max(-metrics.maxY, offset.y)),
      }
    },
    [cropZoom, getCropMetrics],
  )

  const handleAvatarChange = useCallback(
    (file: File | null) => {
      if (!file) return

      if (!ALLOWED_TYPES.includes(file.type)) {
        onError("Only PNG, JPG, or WEBP images are allowed.")
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        onError("Image must be 5MB or less.")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        if (!result) return
        const img = new Image()
        img.onload = () => {
          setCropImage(img)
          setCropSource(result)
          setCropZoom(1)
          setCropOffset({ x: 0, y: 0 })
          setIsCropOpen(true)
        }
        img.src = result
      }
      reader.readAsDataURL(file)
    },
    [onError],
  )

  const closeCrop = useCallback(() => {
    setIsCropOpen(false)
    setCropSource(null)
    setCropImage(null)
  }, [])

  const applyCrop = useCallback(async () => {
    if (!cropImage) return
    const metrics = getCropMetrics()
    if (!metrics) return

    const scale = metrics.baseScale * cropZoom
    const sourceSize = metrics.containerSize / scale
    const sourceX = (cropImage.naturalWidth - sourceSize) / 2 - cropOffset.x / scale
    const sourceY = (cropImage.naturalHeight - sourceSize) / 2 - cropOffset.y / scale

    const canvas = document.createElement("canvas")
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      cropImage,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      Math.min(sourceSize, cropImage.naturalWidth),
      Math.min(sourceSize, cropImage.naturalHeight),
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    )

    if (!blob || blob.size > MAX_FILE_SIZE) {
      onError("Cropped image is too large. Try zooming out.")
      return
    }

    const croppedFile = new File([blob], "avatar.webp", { type: "image/webp" })
    setIsCropOpen(false)
    onCropped(croppedFile)
  }, [cropImage, cropOffset.x, cropOffset.y, cropZoom, getCropMetrics, onCropped, onError])

  return {
    isCropOpen,
    cropSource,
    cropZoom,
    cropOffset,
    dragStart,
    offsetStart,
    setCropZoom,
    setCropOffset,
    setDragStart,
    setOffsetStart,
    getCropMetrics,
    clampOffset,
    handleAvatarChange,
    closeCrop,
    applyCrop,
  }
}

export function AvatarCropDialog({ crop }: { crop: UseAvatarCrop }) {
  const containerRef = useRef<HTMLDivElement>(null)
  if (!crop.isCropOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white p-5 shadow-[0_30px_70px_rgba(15,23,42,0.3)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Adjust image</p>
            <h3 className="text-xl font-semibold text-slate-900">Set your profile crop</h3>
          </div>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-50"
            onClick={crop.closeCrop}
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_190px]">
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div
              ref={containerRef}
              className="relative h-60 w-60 overflow-hidden rounded-full border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                crop.setDragStart({ x: event.clientX, y: event.clientY })
                crop.setOffsetStart(crop.cropOffset)
              }}
              onPointerMove={(event) => {
                if (!crop.dragStart) return
                const next = {
                  x: crop.offsetStart.x + (event.clientX - crop.dragStart.x),
                  y: crop.offsetStart.y + (event.clientY - crop.dragStart.y),
                }
                crop.setCropOffset(crop.clampOffset(next))
              }}
              onPointerUp={() => crop.setDragStart(null)}
              onPointerLeave={() => crop.setDragStart(null)}
            >
              {crop.cropSource ? (
                <div
                  className="absolute inset-0 bg-cover bg-no-repeat bg-center"
                  style={{
                    backgroundImage: `url(${crop.cropSource})`,
                    backgroundSize: `${crop.getCropMetrics()?.scaledWidth ?? 240}px ${crop.getCropMetrics()?.scaledHeight ?? 240}px`,
                    backgroundPosition: `calc(50% + ${crop.cropOffset.x}px) calc(50% + ${crop.cropOffset.y}px)`,
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-700">Zoom</p>
              <input
                className="mt-3 w-full accent-brand-900"
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={crop.cropZoom}
                onChange={(event) => {
                  const nextZoom = Number(event.target.value)
                  crop.setCropZoom(nextZoom)
                  crop.setCropOffset((prev) => crop.clampOffset(prev, nextZoom))
                }}
              />
              <p className="mt-2 text-xs text-slate-500">Drag to reposition.</p>
            </div>

            <button
              className="w-full rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
              onClick={crop.applyCrop}
            >
              Use this image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
