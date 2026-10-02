import assert from 'node:assert/strict';
import test from 'node:test';
import { StorageService } from '../packages/core/storage/dist/src/index.js';

test('browser upload URLs do not require the checksum of an empty server-side body', async () => {
  const storage = new StorageService('us-east-1', 'https://storage.example.test', 'private-user', 'test-key', 'test-secret', 'profiles');
  const { presignedUrl } = await storage.generateUploadPresignedUrl({ type: 'image', key: 'uploads/photo.png', expires: 300 });
  const url = new URL(presignedUrl);
  assert.equal(url.origin, 'https://storage.example.test');
  assert.equal(url.pathname, '/private-user/profiles/uploads/photo.png');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
  assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false);
  assert.equal(url.searchParams.has('x-amz-sdk-checksum-algorithm'), false);
});
