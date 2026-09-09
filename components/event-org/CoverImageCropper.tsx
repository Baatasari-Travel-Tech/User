"use client"

import React, { useEffect, useRef, useState } from "react"

// Event covers are 2:3 portrait (poster style) to match how they're shown on
// the events pages. The cropper frames to that exact ratio so the upload is
// WYSIWYG. The organizer can zoom out to fit a whole poster (letterboxed on
// white) or zoom in to fill.
const TARGET_WIDTH = 1000
const TARGET_HEIGHT = 1500
const MAX_BOX_WIDTH = 320
const FILL_COLOR = "#ffffff"

interface CoverImageCropperProps {
  source: string
  onCancel: () => void
  onApply: (file: File, previewUrl: string) => void
}

const CoverImageCropper: React.FC<CoverImageCropperProps> = ({ source, onCancel, onApply }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 })

  const boxRef = useRef<HTMLDivElement>(null)
  // Measure the frame's real size so scaling always matches what's on screen
  // (the frame is responsive and can be narrower than MAX_BOX_WIDTH).
  const [box, setBox] = useState({ width: MAX_BOX_WIDTH, height: Math.round((MAX_BOX_WIDTH * TARGET_HEIGHT) / TARGET_WIDTH) })

  useEffect(() => {
    const element = boxRef.current
    if (!element) return
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const img = new Image()
    img.onload = () => setImage(img)
    img.src = source
  }, [source])

  // zoom is a multiplier on the "contain" scale: zoom 1 = the whole image fits
  // inside the frame; larger zoom fills/crops. Default to filling the frame.
  const containScale =
    image && box.width > 0 && box.height > 0
      ? Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight)
      : 0
  const coverScale =
    image && box.width > 0 && box.height > 0
      ? Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight)
      : 0
  const coverZoom = containScale > 0 ? coverScale / containScale : 1
  const maxZoom = Math.max(coverZoom * 3, 4)

  // Start fitted — the whole image is visible inside the frame — so the
  // organizer can see everything before deciding to zoom in and fill.
  //
  // Adjusted during render rather than in an effect, which would show the
  // previous crop for one frame. Each `source` builds a fresh Image object, so
  // comparing identity gives the same "once per loaded image" behaviour the
  // old defaultedRef had, without a ref that render can't see.
  const [defaultedFor, setDefaultedFor] = useState<HTMLImageElement | null>(null)
  if (image && containScale > 0 && defaultedFor !== image) {
    setDefaultedFor(image)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const getMetrics = (nextZoom = zoom) => {
    if (!image || containScale <= 0) return null
    const scaledWidth = image.naturalWidth * containScale * nextZoom
    const scaledHeight = image.naturalHeight * containScale * nextZoom
    const maxX = Math.max(0, (scaledWidth - box.width) / 2)
    const maxY = Math.max(0, (scaledHeight - box.height) / 2)
    return { scaledWidth, scaledHeight, maxX, maxY }
  }

  const clampOffset = (next: { x: number; y: number }, nextZoom = zoom) => {
    const metrics = getMetrics(nextZoom)
    if (!metrics) return { x: 0, y: 0 }
    return {
      x: Math.min(metrics.maxX, Math.max(-metrics.maxX, next.x)),
      y: Math.min(metrics.maxY, Math.max(-metrics.maxY, next.y)),
    }
  }

  const handleApply = async () => {
    if (!image) return
    const metrics = getMetrics()
    if (!metrics || box.width <= 0) return

    // Map the on-screen frame to the 1200×630 output, drawing the whole image
    // transformed exactly as previewed, on a white fill behind any letterbox.
    const outputScale = TARGET_WIDTH / box.width
    const destWidth = metrics.scaledWidth * outputScale
    const destHeight = metrics.scaledHeight * outputScale
    const destX = TARGET_WIDTH / 2 + offset.x * outputScale - destWidth / 2
    const destY = TARGET_HEIGHT / 2 + offset.y * outputScale - destHeight / 2

    const canvas = document.createElement("canvas")
    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT
    const context = canvas.getContext("2d")
    if (!context) return

    context.fillStyle = FILL_COLOR
    context.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    context.drawImage(image, destX, destY, destWidth, destHeight)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9))
    if (!blob) return

    const file = new File([blob], "event-cover.webp", { type: "image/webp" })
    onApply(file, URL.createObjectURL(file))
  }

  const metrics = getMetrics()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white p-5 shadow-[0_30px_70px_rgba(15,23,42,0.3)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Adjust cover</p>
            <h2 className="text-xl font-semibold text-slate-900">Frame your event cover</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            ref={boxRef}
            className="relative aspect-[2/3] w-full max-w-[320px] touch-none select-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              setDragStart({ x: event.clientX, y: event.clientY })
              setOffsetStart(offset)
            }}
            onPointerMove={(event) => {
              if (!dragStart) return
              setOffset(
                clampOffset({
                  x: offsetStart.x + (event.clientX - dragStart.x),
                  y: offsetStart.y + (event.clientY - dragStart.y),
                }),
              )
            }}
            onPointerUp={() => setDragStart(null)}
            onPointerLeave={() => setDragStart(null)}
          >
            {image && metrics ? (
              <div
                className="absolute inset-0 cursor-grab bg-no-repeat active:cursor-grabbing"
                style={{
                  backgroundImage: `url(${source})`,
                  backgroundSize: `${metrics.scaledWidth}px ${metrics.scaledHeight}px`,
                  backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
                }}
              />
            ) : null}
          </div>

          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Zoom</p>
              <span className="text-xs text-slate-400">Fit ↔ Fill</span>
            </div>
            <input
              className="mt-2 w-full accent-slate-900"
              type="range"
              min={1}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={(event) => {
                const nextZoom = Number(event.target.value)
                setZoom(nextZoom)
                setOffset((previous) => clampOffset(previous, nextZoom))
              }}
            />
            <p className="mt-1 text-xs text-slate-500">
              Zoom out to fit the whole image (a poster sits on a white background), or zoom in to fill. Drag to reposition.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleApply()}
            className="w-full max-w-sm rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Use this cover
          </button>
        </div>
      </div>
    </div>
  )
}

export default CoverImageCropper
