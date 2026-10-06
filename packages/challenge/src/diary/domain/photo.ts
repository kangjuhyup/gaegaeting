import { PNG } from "pngjs";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Decode then encode pixels only: removes EXIF, text, timestamps and ancillary metadata. */
export function sanitizePhoto(bytes: Uint8Array): Buffer {
  const input = Buffer.from(bytes);
  if (
    input.length < 33 ||
    input.length > MAX_PHOTO_BYTES ||
    !input
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    input.toString("ascii", 12, 16) !== "IHDR"
  )
    throw new Error("INVALID_PHOTO");
  const width = input.readUInt32BE(16),
    height = input.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 1600 || height > 1600)
    throw new Error("INVALID_PHOTO");
  const decoded = PNG.sync.read(input, { checkCRC: true });
  const pixels = new PNG({ width: decoded.width, height: decoded.height });
  pixels.data = decoded.data;
  const clean = PNG.sync.write(pixels, { colorType: 6 });
  if (clean.length > MAX_PHOTO_BYTES) throw new Error("INVALID_PHOTO");
  return clean;
}
