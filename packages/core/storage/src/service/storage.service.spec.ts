import { Readable } from 'node:stream';
import { jest } from '@jest/globals';
import { HeadObjectCommand, GetObjectCommand, PutObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service.js';

const bytes = Buffer.from('bounded image bytes');
const metadata = { ETag: '"v1"', ContentLength: bytes.length, ContentType: 'image/png' };
function fixture(head = metadata, object = metadata, chunks: Iterable<Uint8Array> = [bytes]) {
  const body = Readable.from(chunks);
  const send = jest.fn(async (command: unknown) => {
    if (command instanceof HeadObjectCommand) return head;
    if (command instanceof GetObjectCommand) return { ...object, Body: body };
    if (command instanceof PutObjectCommand) return {};
    throw new Error('Unexpected storage command');
  });
  const storage = new StorageService('us-east-1', 'https://storage.example.test', 'private-user', 'key', 'secret', 'profiles');
  Object.assign(storage, { s3Client: { send } });
  return { storage, send, body };
}

describe('profile image snapshot', () => {
  test('stores exactly the bounded GET bytes without CopyObject or a second source read', async () => {
    const { storage, send } = fixture();
    const snapshot = await storage.readImageSnapshot('uploads/a.png', 1024);
    bytes[0] = 66; // A later staging overwrite cannot modify the buffered snapshot.
    try {
      await storage.writeImageSnapshot('review/b.png', snapshot);
      const commands = send.mock.calls.map(([command]) => command);
      expect(commands).toHaveLength(3);
      expect((commands[1] as GetObjectCommand).input).toEqual({ Bucket: 'private-user', Key: 'profiles/uploads/a.png', IfMatch: '"v1"' });
      expect((commands[2] as PutObjectCommand).input).toEqual({
        Bucket: 'private-user', Key: 'profiles/review/b.png', Body: Buffer.from('bounded image bytes'),
        ContentType: 'image/png', CacheControl: 'private, max-age=300',
      });
      expect(commands.some(command => command instanceof CopyObjectCommand)).toBe(false);
    } finally { bytes[0] = 98; }
  });

  test.each([
    ['changed ETag even if provider ignores IfMatch', { ...metadata, ETag: '"v2"' }],
    ['wrong media type', { ...metadata, ContentType: 'text/plain' }],
    ['changed content length', { ...metadata, ContentLength: bytes.length + 1 }],
  ])('rejects %s and closes the response without PUT', async (_reason, object) => {
    const { storage, send, body } = fixture(metadata, object);
    await expect(storage.readImageSnapshot('uploads/a.png', 1024)).rejects.toThrow('INVALID_PROFILE_IMAGE');
    expect(body.destroyed).toBe(true);
    expect(send.mock.calls.some(([command]) => command instanceof PutObjectCommand)).toBe(false);
  });

  test.each([
    ['exceeds maximum', { ...metadata, ContentLength: 1025 }],
    ['empty object', { ...metadata, ContentLength: 0 }],
    ['missing ETag', { ...metadata, ETag: '' }],
    ['wrong media type', { ...metadata, ContentType: 'image/jpeg' }],
  ])('rejects HEAD %s before reading', async (_reason, head) => {
    const { storage, send } = fixture(head);
    await expect(storage.readImageSnapshot('uploads/a.png', 1024)).rejects.toThrow('INVALID_PROFILE_IMAGE');
    expect(send).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['oversized actual stream', [Buffer.alloc(1025)]],
    ['declared length is smaller than stream', [bytes, Buffer.from('extra')]],
    ['truncated stream', [bytes.subarray(0, 5)]],
  ])('rejects %s without PUT', async (_reason, chunks) => {
    const { storage, body } = fixture(metadata, metadata, chunks);
    await expect(storage.readImageSnapshot('uploads/a.png', 1024)).rejects.toThrow('INVALID_PROFILE_IMAGE');
    expect(body.destroyed).toBe(true);
  });

  test('propagates conditional GET failure without a write', async () => {
    const { storage, send } = fixture();
    send.mockImplementationOnce(async () => metadata).mockImplementationOnce(async () => { throw new Error('PreconditionFailed'); });
    await expect(storage.readImageSnapshot('uploads/a.png', 1024)).rejects.toThrow('PreconditionFailed');
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('rejects stream failure and closes the body', async () => {
    const chunks = (async function* () { yield bytes.subarray(0, 2); throw new Error('network error'); })();
    const { storage, body } = fixture(metadata, metadata, chunks as any);
    await expect(storage.readImageSnapshot('uploads/a.png', 1024)).rejects.toThrow('network error');
    expect(body.destroyed).toBe(true);
  });
});
