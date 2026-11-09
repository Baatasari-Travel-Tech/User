/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * A phone photo is 3 to 10 MB. Uploading that over a mobile connection (and
 * then having the server shrink it) was the slow part of the talent sign-up.
 * Here it is resized so its longer side is at most `maxSide` pixels and saved as
 * WebP, which brings it to a few hundred KB: the upload is quick and the server
 * has almost nothing left to do. The picture's rotation (EXIF) is applied, so a
 * sideways phone photo comes out upright.
 *
 * Throws when the browser cannot read the file as an image (for example a HEIC
 * photo in a browser that does not support it): the caller shows a message.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error("That image could not be read. Use a JPG, PNG or WEBP photo.")
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    throw new Error("Your browser could not prepare the photo. Try another one.")
  }
  context.imageSmoothingQuality = "high"
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  const webp = await toBlob("image/webp")
  const blob = webp && webp.type === "image/webp" ? webp : await toBlob("image/jpeg")
  if (!blob) throw new Error("Your browser could not prepare the photo. Try another one.")

  const type = blob.type || "image/jpeg"
  return new File([blob], type === "image/webp" ? "photo.webp" : "photo.jpg", { type })
}
