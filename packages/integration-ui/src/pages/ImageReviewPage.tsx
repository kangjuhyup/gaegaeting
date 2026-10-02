import { useCallback, useEffect, useState } from 'react';
import { graphql, errorMessage } from '../lib/api.js';
import type { AppConfig } from '../types.js';
import type { ProfileImage } from '../components/ProfileImages.js';
import { Alert, Button, PageTitle, Spinner } from '../components/Ui.js';

export function ImageReviewPage({ config, token, allowed }: { config: AppConfig; token?: string; allowed: boolean }) {
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [listVersion, setListVersion] = useState(0);
  const reload = useCallback(async () => {
    const data = await graphql<{ adminPendingProfileImages: ProfileImage[] }>(config.gatewayUrl,
      'query AdminPendingProfileImages { adminPendingProfileImages(limit: 50) { kind targetId imageNo status url updatedAt } }', {}, token);
    setImages(data.adminPendingProfileImages);
    // Remount previews so even cached, unchanged URLs report a fresh load.
    setViewed(new Set());
    setListVersion(version => version + 1);
    setLoaded(true);
  }, [config.gatewayUrl, token]);
  useEffect(() => { if (allowed && token) void reload().catch(cause => setError(errorMessage(cause))); }, [allowed, token, reload]);
  async function review(image: ProfileImage, approve: boolean) {
    setBusy(true); setError(''); setMessage('');
    try {
      await graphql(config.gatewayUrl,
        'mutation ReviewProfileImage($kind: String!, $targetId: String!, $imageNo: Int!, $approve: Boolean!) { reviewProfileImage(kind: $kind, targetId: $targetId, imageNo: $imageNo, approve: $approve) }',
        { kind: image.kind, targetId: image.targetId, imageNo: image.imageNo, approve }, token);
      setMessage(approve ? '사진을 승인했습니다.' : '사진을 거절했습니다.');
      await reload();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  if (!token || !allowed) return <section className="page"><Alert type="info">관리자 계정으로 로그인해 주세요.</Alert></section>;
  return <section className="page">
    <PageTitle eyebrow="관리자" title="사진 승인 대기" description="사용자와 반려견 사진을 확인한 후 승인하거나 거절해 주세요." />
    <Button type="button" variant="secondary" disabled={busy} onClick={() => { setError(''); void reload().catch(cause => setError(errorMessage(cause))); }}>목록 새로고침</Button>
    {error && <Alert type="error">{error}</Alert>}{message && <Alert type="success">{message}</Alert>}
    {loaded && !images.length && <Alert type="info">승인 대기 중인 사진이 없습니다.</Alert>}
    <div className="photo-review-grid">
      {images.map(image => <article className="card photo-review-card" key={`${listVersion}-${image.kind}-${image.targetId}-${image.imageNo}`}>
        {image.url && <img src={image.url} alt={`${image.kind === 'USER' ? '사용자' : '반려견'} 승인 대기 사진`} referrerPolicy="no-referrer" onLoad={() => setViewed(current => new Set(current).add(image.url!))} />}
        <h3>{image.kind === 'USER' ? '사용자' : '반려견'} 사진 {image.imageNo + 1}</h3>
        <p>대상: {image.targetId}<br />제출: {new Date(image.updatedAt).toLocaleString('ko-KR')}</p>
        <div className="button-row">
          <Button type="button" disabled={busy || !image.url || !viewed.has(image.url)} onClick={() => void review(image, true)}>{busy && <Spinner />}승인</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void review(image, false)}>거절</Button>
        </div>
      </article>)}
    </div>
  </section>;
}
