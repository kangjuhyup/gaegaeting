# 모바일 UI 개발 배포

사용자 앱에 모바일 로그인·가입 화면, 프로필·펫 등록, 추천 카드, 주요 메뉴 하단 탭과 로그아웃을 통합한다. 스토리보드는 실제 앱과 별개의 화면 검토 경로로 유지한다.

로그인 직후 Gateway에서 프로필·펫 등록 상태를 조회한다. 프로필 미등록은 내 정보, 펫 미등록은 내 펫, 모두 등록된 계정은 추천 메인으로 이동한다. 조회 실패는 재시도 화면으로 처리하며 등록 상태를 추측하지 않는다.

추천과 등록은 기존 개발 API를 사용한다. 보낸 관심·채팅은 사용자가 정한 UI 선행 범위에 따라 샘플 화면이며 서버 미연동을 화면에 표시한다. 메시지는 화면 메모리에서만 유지한다. 새 Chat 서비스·DB·scope나 사용자 데이터 변경은 없다.

320px 이상 화면의 reflow, 44px 터치 영역, 16px 입력, 하단 safe area, 상태별 이동과 중복 전송 방지, 한글 IME, 로그아웃을 검증한다. `pnpm test:ui`로 등록 상태별 이동·추천 카드·채팅 UI·로그아웃 상태 테스트를 실행하며 이미지 발행 CI에서도 검사한다.

사용자·관리자 로그인에 공유되는 인증 입력 화면의 모바일 개선도 포함한다. 기존 개발 Auth 확인 화면의 `xsrf token invalid` 문제는 k3s 에이전트에게 별도 전달된 미해결 항목으로, UI 릴리즈가 이를 해결했다고 간주하지 않는다.

이번 사용자 지시로 모바일 변경의 커밋과 원격 개발 배포가 승인되었다. UI는 core 릴리즈, 저장된 추천 상태 라벨 수정은 Match 릴리즈로 통합하고 정확한 이미지 digest를 GitOps에 반영한다. 다른 서비스 이미지·데이터는 보존한다.
# Deployment route correction

Remote post-rollout checks found that the image's HTTP server omitted the new
likes, chats, chat-room and storyboard SPA routes. Client navigation worked, but
direct navigation and refresh returned 404. Add only those user-app routes,
with bounded chat identifiers; administrator and filesystem path boundaries remain
enforced. HTTP GET/HEAD and rejected-path regressions cover the packaged server.
