import { PNG } from "pngjs";
import { MAX_PHOTO_BYTES, sanitizePhoto } from "../src/diary/domain/photo.js";
function png(width = 2, height = 2): Buffer {
  const value = new PNG({ width, height });
  value.data.fill(120);
  value.gamma = 0.45455;
  return PNG.sync.write(value);
}
function textChunk(value: string): Buffer {
  const payload = Buffer.from(`tEXtComment\0${value}`);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(payload.length - 4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, payload, checksum]);
}
describe("일기 사진의 픽셀 검증과 메타데이터 제거", () => {
  it("픽셀은 유지하면서 원본 gamma와 부가 데이터를 제거한다", () => {
    const original = png();
    const metadataImage = Buffer.concat([
      original.subarray(0, -12),
      textChunk("private GPS metadata"),
      original.subarray(-12),
    ]);
    const sanitized = sanitizePhoto(metadataImage);
    expect(PNG.sync.read(sanitized).data).toEqual(PNG.sync.read(original).data);
    expect(sanitized.includes(Buffer.from("gAMA"))).toBe(false);
    expect(sanitized.includes(Buffer.from("private GPS metadata"))).toBe(false);
  });
  it.each([
    { label: "SVG 위장", make: () => Buffer.from("<svg></svg>") },
    { label: "잘린 PNG", make: () => png().subarray(0, 33) },
    { label: "용량 초과", make: () => Buffer.alloc(MAX_PHOTO_BYTES + 1) },
    { label: "해상도 초과", make: () => png(1601, 1) },
  ])("$label 사진을 거절한다", ({ make }) => {
    expect(() => sanitizePhoto(make())).toThrow();
  });
  it("CRC가 손상된 이미지 데이터를 거절한다", () => {
    const bytes = png();
    bytes[45] ^= 1;
    expect(() => sanitizePhoto(bytes)).toThrow();
  });
});
