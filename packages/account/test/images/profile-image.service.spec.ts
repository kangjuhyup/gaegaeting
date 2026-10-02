import { jest } from '@jest/globals';
import { ProfileImageService } from '../../src/common/profile-images/profile-image.service.js';
import type { ImageKind, ProfileImageRecord } from '../../src/common/profile-images/profile-image-repository.port.js';

function fixture() {
  const rows = new Map<string, ProfileImageRecord>();
  const id = (kind: string, target: string, no: number) => `${kind}/${target}/${no}`;
  const repository = {
    find: jest.fn(async (kind: string, target: string, no: number) => { const row = rows.get(id(kind, target, no)); return row ? { ...row } : null; }),
    list: jest.fn(async (kind: string, target: string) => [...rows.values()].filter(row => row.kind === kind && row.targetId === target).map(row => ({ ...row }))),
    pending: jest.fn(async (limit: number) => [...rows.values()].filter(row => row.status === 'PENDING').slice(0, limit).map(row => ({ ...row }))),
    reserve: jest.fn(async (kind: ImageKind, targetId: string, imageNo: number, key: string) => {
      rows.set(id(kind, targetId, imageNo), { kind, targetId, imageNo, key, uploadKey: key, status: 'UPLOADING', active: false, createdAt: new Date(), updatedAt: new Date() });
    }),
    transition: jest.fn(async (image: ProfileImageRecord, status: ProfileImageRecord['status'], key: string, reviewer?: string) => {
      const row = rows.get(id(image.kind, image.targetId, image.imageNo));
      if (!row || row.status !== image.status || row.uploadKey !== image.uploadKey) return false;
      Object.assign(row, { status, key, reviewedBy: reviewer, active: status === 'APPROVED', updatedAt: new Date() });
      return true;
    }),
    remove: jest.fn(async (image: ProfileImageRecord) => rows.delete(id(image.kind, image.targetId, image.imageNo))),
  };
  const header = Buffer.alloc(32); Buffer.from([137,80,78,71,13,10,26,10]).copy(header);header.write('IHDR',12);header.writeUInt32BE(100,16);header.writeUInt32BE(100,20);
  const storage = () => ({
    generateUploadPresignedUrl: jest.fn(async ({ key }: any) => ({ presignedUrl: `https://storage.test/${key}?signed=put`, path: key })),
    generateDownloadPresignedUrl: jest.fn(async ({ key }: any) => ({ presignedUrl: `https://storage.test/${key}?signed=get`, path: key })),
    readImageHeader: jest.fn(async () => ({ etag: 'same-version', bytes: header })),
    getObjectMetadata: jest.fn(async () => ({ ContentType: 'image/png', ContentLength: 100 })),
    freezeImage: jest.fn(async () => undefined), deleteObject: jest.fn(async () => undefined),
  });
  const userStorage = storage(), petStorage = storage();
  const users = { selectUserProfileFromId: jest.fn(async () => ({ id: 'owner' })) };
  const pets = { selectPetFromId: jest.fn(async () => ({ userId: 'owner' })) };
  const service = new ProfileImageService(repository as any, users as any, pets as any, userStorage as any, petStorage as any);
  return { rows, repository, userStorage, petStorage, users, pets, service };
}

describe.each(['USER', 'PET'] as const)('%s photos reviewed by an administrator', kind => {
  const targetId = kind === 'USER' ? 'owner' : '1';
  const storageFor = (f: ReturnType<typeof fixture>) => kind === 'USER' ? f.userStorage : f.petStorage;
  async function pending(f: ReturnType<typeof fixture>, imageNo = 0) {
    await f.service.begin(kind, targetId, imageNo, 'owner');
    return f.service.complete(kind, targetId, imageNo, 'owner');
  }
  test('upload completion freezes the file and keeps it private until admin approval', async () => {
    const f = fixture();
    await f.service.begin(kind, targetId, 0, 'owner');
    expect(await f.service.approvedUrls(kind, targetId)).toEqual([]);
    expect(await f.service.pending()).toEqual([]);
    const submitted = await f.service.complete(kind, targetId, 0, 'owner');
    expect(submitted).toMatchObject({ status: 'PENDING', active: false });
    expect(storageFor(f).freezeImage).toHaveBeenCalledWith(expect.stringContaining('/uploads/'), expect.stringContaining('/review/'), 'same-version');
    expect((await f.service.own(kind, targetId, 'owner'))[0].url).toContain('/review/');
    expect((await f.service.pending())[0].url).toContain('/review/');
    expect(await f.service.approvedUrls(kind, targetId)).toEqual([]);
    await f.service.review(kind, targetId, 0, true, 'admin');
    expect(await f.service.approvedUrls(kind, targetId)).toEqual([submitted.url]);
    expect((await f.service.own(kind, targetId, 'owner'))[0]).toMatchObject({ status: 'APPROVED', active: true, reviewedBy: 'admin' });
    expect(await f.service.pending()).toEqual([]);
  });
  test('repeated completion cannot replace the frozen photo or reset an approved photo', async () => {
    const f = fixture(); const first = await pending(f);
    expect((await f.service.complete(kind, targetId, 0, 'owner')).url).toBe(first.url);
    expect(storageFor(f).freezeImage).toHaveBeenCalledTimes(1);
    await f.service.review(kind, targetId, 0, true, 'admin');
    await expect(f.service.complete(kind, targetId, 0, 'owner')).rejects.toThrow('업로드 중인');
    expect(await f.service.approvedUrls(kind, targetId)).toHaveLength(1);
  });
  test('rejection never activates a photo, removes the private file and records the reviewer', async () => {
    const f = fixture(); await pending(f);
    await f.service.review(kind, targetId, 0, false, 'admin');
    expect(await f.service.approvedUrls(kind, targetId)).toEqual([]);
    expect((await f.service.own(kind, targetId, 'owner'))[0]).toMatchObject({ status: 'REJECTED', active: false, reviewedBy: 'admin' });
    expect((await f.service.own(kind, targetId, 'owner'))[0].url).toBeUndefined();
    expect(storageFor(f).deleteObject).toHaveBeenCalledWith({ key: expect.stringContaining('/review/') });
  });
  test('one concurrent reviewer wins, and a losing rejection cannot delete an approved file', async () => {
    const f = fixture(); await pending(f);
    f.repository.transition.mockResolvedValueOnce(false);
    await expect(f.service.review(kind, targetId, 0, false, 'second-admin')).rejects.toThrow('다른 검토자');
    expect(storageFor(f).deleteObject).toHaveBeenCalledTimes(1); // staging cleanup only
  });
  test('an owner may delete an uploaded photo without changing another account', async () => {
    const f = fixture(); await pending(f); await f.service.remove(kind, targetId, 0, 'owner');
    expect(await f.service.own(kind, targetId, 'owner')).toEqual([]);
  });
  test.each(['begin', 'complete', 'remove', 'own'] as const)('another account cannot %s private photos or obtain URLs', async action => {
    const f = fixture();
    const request = action === 'own' ? f.service.own(kind, targetId, 'intruder') : f.service[action](kind, targetId, 0, 'intruder');
    await expect(request).rejects.toThrow(kind === 'USER' ? '본인 사진' : '본인의 반려견');
    expect(f.repository.reserve).not.toHaveBeenCalled();
    expect(storageFor(f).generateUploadPresignedUrl).not.toHaveBeenCalled();
    expect(storageFor(f).generateDownloadPresignedUrl).not.toHaveBeenCalled();
  });
  test('missing or oversized files cannot enter the admin review queue', async () => {
    const f = fixture(); await f.service.begin(kind, targetId, 0, 'owner');
    storageFor(f).readImageHeader.mockRejectedValueOnce(new Error('INVALID_PROFILE_IMAGE'));
    await expect(f.service.complete(kind, targetId, 0, 'owner')).rejects.toThrow('5MB');
    expect(storageFor(f).freezeImage).not.toHaveBeenCalled();
    expect(await f.service.pending()).toEqual([]);
  });
  test('non-PNG bytes cannot be submitted or activated', async () => {
    const f = fixture(); await f.service.begin(kind, targetId, 0, 'owner');
    storageFor(f).readImageHeader.mockResolvedValueOnce({ etag: 'text', bytes: Buffer.from('<svg>not a PNG</svg>') });
    await expect(f.service.complete(kind, targetId, 0, 'owner')).rejects.toThrow('지원하지 않는');
    expect(await f.service.pending()).toEqual([]);
  });
  test('missing frozen files cannot be approved', async () => {
    const f = fixture(); await pending(f); storageFor(f).getObjectMetadata.mockResolvedValueOnce(undefined as any);
    await expect(f.service.review(kind, targetId, 0, true, 'admin')).rejects.toThrow('사진 파일');
    expect(await f.service.approvedUrls(kind, targetId)).toEqual([]);
  });
  test.each([-1, 6, 1.5])('invalid photo slot %s is rejected without reserving storage', async no => {
    const f = fixture(); await expect(f.service.begin(kind, targetId, no, 'owner')).rejects.toThrow('최대 6장');
    expect(f.repository.reserve).not.toHaveBeenCalled();
  });
});
