"use client";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB before processing
const MAX_DIMENSION = 1600;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export class ImageError extends Error {}

/**
 * Re-encodes a user's photo in the browser before upload.
 *
 * Drawing the image onto a canvas and exporting a fresh JPEG throws away ALL metadata,
 * including EXIF GPS coordinates that phones embed (i.e. where the photo was taken —
 * often the uploader's home). It also caps the size so storage costs stay predictable.
 */
export async function sanitiseImage(file: File): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) {
    throw new ImageError("Please upload a JPEG, PNG or WebP image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageError("That image is over 10 MB.");
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Your browser couldn't process that image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new ImageError("Your browser couldn't process that image.");
  return blob;
}
