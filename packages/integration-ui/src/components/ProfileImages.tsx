import { useCallback, useEffect, useId, useState } from 'react';
import { graphql, errorMessage } from '../lib/api.js';
import { prepareProfileImage, uploadProfileImage } from '../lib/profile-images.js';
import type { AppConfig } from '../types.js';
import { Alert, Button, Spinner } from './Ui.js';

export type ProfileImage = { kind: 'USER' | 'PET'; targetId: string; imageNo: number; status: 'UPLOADING' | 'PENDING' | 'APPROVED' | 'REJECTED'; url?: string; updatedAt: string };
const fields = 'kind targetId imageNo status url updatedAt';
const labels = { UPLOADING: '업로드 미완료', PENDING: '승인 대기', APPROVED: '승인됨', REJECTED: '거절됨' };

export function ProfileImages({ config, token, petId, title = '프로필 사진', onApprovedPhoto }: {
  config: AppConfig; token?: string; petId?: number; title?: string; onApprovedPhoto?: (url?: string) => void;
}) {
  const inputId = useId();
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [selected, setSelected] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const isPet = petId !== undefined;
  const reload = useCallback(async () => {
    if (!token) return;
    const query = isPet ? `query MyPetImageUploads($petId: Int!) { myPetImageUploads(petId: $petId) { ${fields} } }` : `query MyProfileImageUploads { myProfileImageUploads { ${fields} } }`;
    const data = await graphql<{ myPetImageUploads?: ProfileImage[]; myProfileImageUploads?: ProfileImage[] }>(config.gatewayUrl, query, isPet ? { petId } : {}, token);
    const result = data.myPetImageUploads ?? data.myProfileImageUploads ?? [];
    setImages(result);
    onApprovedPhoto?.(result.find(image => image.status === 'APPROVED')?.url);
    setLoaded(true);
  }, [config.gatewayUrl, token, isPet, petId, onApprovedPhoto]);
  useEffect(() => { void reload().catch(cause => setError(errorMessage(cause))); }, [reload]);
  useEffect(() => {
    if (!selected) { setPreview(undefined); return; }
    const url = URL.createObjectURL(selected);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selected]);

  async function complete(imageNo: number) {
    const query = isPet ? `mutation CompletePetImage($petId: Int!, $imageNo: Int!) { completePetImage(petId: $petId, imageNo: $imageNo) { ${fields} } }`
      : `mutation CompleteProfileImage($imageNo: Int!) { completeProfileImage(imageNo: $imageNo) { ${fields} } }`;
    await graphql(config.gatewayUrl, query, { imageNo, ...(isPet ? { petId } : {}) }, token);
    setMessage('사진을 제출했습니다. 관리자 승인 후 다른 사용자에게 보여요.');
  }
  async function run(action: () => Promise<void>, refresh = true) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); if (refresh) await reload(); }
    catch (cause) { setError(errorMessage(cause)); await reload().catch(() => undefined); }
    finally { setBusy(false); }
  }
  async function upload() {
    if (!selected || !token) return;
    await run(async () => {
      const imageNo = Array.from({ length: 6 }, (_, i) => i).find(i => !images.some(image => image.imageNo === i && image.status !== 'REJECTED'));
      if (imageNo === undefined) throw new Error('사진은 최대 6장까지 등록할 수 있습니다. 기존 사진을 삭제한 후 다시 올려 주세요.');
      const body = await prepareProfileImage(selected);
      const query = isPet ? `mutation GeneratePetPresignedUrl($petId: Int!, $imageNo: Int!) { generatePetPresignedUrl(petId: $petId, imageNo: $imageNo) { url expiresIn } }`
        : `mutation GeneratePresignedUrl($imageNo: Int!) { generatePresignedUrl(imageNo: $imageNo) { url expiresIn } }`;
      const data = await graphql<{ generatePetPresignedUrl?: { url: string }; generatePresignedUrl?: { url: string } }>(config.gatewayUrl, query, { imageNo, ...(isPet ? { petId } : {}) }, token);
      const url = data.generatePetPresignedUrl?.url ?? data.generatePresignedUrl?.url;
      if (!url) throw new Error('사진 업로드를 시작할 수 없습니다.');
      await uploadProfileImage(url, body);
      await complete(imageNo);
      setSelected(undefined);
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      if (input) input.value = '';
    });
  }
  async function remove(image: ProfileImage) {
    await run(async () => {
      const query = isPet ? `mutation DeletePetImage($petId: Int!, $imageNo: Int!) { deletePetImage(petId: $petId, imageNo: $imageNo) }`
        : `mutation DeleteProfileImage($imageNo: Int!) { deleteProfileImage(imageNo: $imageNo) }`;
      await graphql(config.gatewayUrl, query, { imageNo: image.imageNo, ...(isPet ? { petId } : {}) }, token);
      setMessage('사진을 삭제했습니다.');
    });
  }
  return <section className="photo-panel" aria-label={title}>
    <h3>{title}</h3>
    <p>최대 6장 · PNG, JPG, WebP · 5MB 이하<br />관리자가 확인한 사진만 공개 프로필에 표시됩니다.</p>
    <div className="photo-grid">
      {images.map(image => <article className="photo-card" key={image.imageNo}>
        {image.url ? <img src={image.url} alt={`${title} ${image.imageNo + 1}`} referrerPolicy="no-referrer" /> : <div className="photo-placeholder">사진 {image.imageNo + 1}</div>}
        <strong className={`photo-status photo-status--${image.status.toLowerCase()}`}>{labels[image.status]}</strong>
        <div className="button-row">
          {image.status === 'UPLOADING' && <Button type="button" variant="secondary" disabled={busy} onClick={() => void run(() => complete(image.imageNo))}>제출 재시도</Button>}
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove(image)}>삭제</Button>
        </div>
      </article>)}
    </div>
    <label className="field" htmlFor={inputId}><span className="field__label">사진 선택</span>
      <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !token} onChange={event => { setSelected(event.target.files?.[0]); setError(''); setMessage(''); }} />
    </label>
    {preview && <img className="photo-selected-preview" src={preview} alt="선택한 사진 미리보기" />}
    <div className="button-row">
      <Button type="button" disabled={!selected || busy || !loaded || !token} onClick={() => void upload()}>{busy && <Spinner />}사진 업로드</Button>
      <Button type="button" variant="ghost" disabled={busy || !token} onClick={() => void run(reload, false)}>상태 새로고침</Button>
    </div>
    {error && <Alert type="error">{error}</Alert>}
    {message && <Alert type="success">{message}</Alert>}
  </section>;
}
