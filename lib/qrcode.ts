import type {
  QRCodeRenderersOptions,
  QRCodeToDataURLOptions,
  QRCodeToStringOptions,
} from "qrcode"

/**
 * Thin lazy wrappers around `qrcode`.
 *
 * Every call site draws a QR after render — inside an effect or an event
 * handler, never during it. A static `import QRCode from "qrcode"` still put
 * the library in the initial chunk of each page that touched it and, because
 * Next server-renders client components too, in the Cloudflare server bundle
 * as well.
 *
 * That server copy is also where the build's `suspicious-nullish-coalescing`
 * esbuild warning came from: qrcode depends on pngjs, whose encoder contains
 * `(1*("Adam7"===b.interlace))??0`. Nothing on the server ever calls it — it
 * was bundled purely because the import was static.
 *
 * These are wrappers rather than a `loadQrCode()` returning the module so that
 * call sites stay single expressions: several of them sit inside object
 * literals and `??` chains where there is nowhere to put an extra statement.
 * `import()` is memoised by the module system, so calling these in a loop
 * fetches once.
 *
 * jspdf and html2canvas are already loaded this way; this matches them.
 */

const qrcode = () => import("qrcode").then((m) => m.default)

export const qrDataUrl = async (text: string, options?: QRCodeToDataURLOptions) =>
  (await qrcode()).toDataURL(text, options)

export const qrToCanvas = async (
  canvas: HTMLCanvasElement,
  text: string,
  options?: QRCodeRenderersOptions,
) => (await qrcode()).toCanvas(canvas, text, options)

export const qrToString = async (text: string, options?: QRCodeToStringOptions) =>
  (await qrcode()).toString(text, options)
