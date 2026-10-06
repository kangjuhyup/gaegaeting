export abstract class WalkingPhotoStorage {
  abstract uploadUrl(key: string): Promise<string>;
  abstract read(key: string, maxBytes: number): Promise<Uint8Array>;
  abstract write(key: string, bytes: Uint8Array): Promise<void>;
  abstract downloadUrl(key: string): Promise<string>;
  abstract delete(key: string): Promise<void>;
}
