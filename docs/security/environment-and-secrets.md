# 환경변수 및 비밀정보 보안 지침

이 저장소는 공개 저장소를 전제로 한다. Git에 들어간 값은 `.gitignore` 추가나 후속 커밋 삭제만으로 회수되지 않는다고 간주한다.

## 분류와 저장 위치

| 구분 | 예시 | 허용 위치 |
| --- | --- | --- |
| 공개 설정 | 포트, 공개 issuer, client ID, API resource | 코드, 예제 파일 |
| 비밀 | 비밀번호, client secret, cookie/JWKS/OTP 키, 내부 assertion 키, DB URL | 승인된 비밀 저장소, 로컬 ignored 파일 |
| 단기 자격증명 | access/refresh token, authorization code, 세션 쿠키 | 프로세스 메모리 또는 보호된 런타임 저장소만 |

다음 값은 코드, manifest, fixture, 문서 예시, CLI 인자, 스크린샷 및 로그에 실제 값을 넣지 않는다.

- access token, refresh token, ID token, authorization code 및 세션 쿠키;
- OAuth/OIDC client secret과 내부 assertion signing secret;
- DB URL, 사용자 비밀번호, root 비밀번호;
- private key, Doppler service token, cloud/registry 자격증명;
- 운영 환경변수 덤프와 사용자 개인정보.

Base64 인코딩은 암호화가 아니다. 인프라의 비밀 공급과 회전은 별도 인프라 저장소에서 관리하고, 애플리케이션은 필요한 값만 런타임에 전달받는다.

## 로컬 개발

1. `packages/<service>/.env` 또는 프로세스 환경변수로 해당 서비스의 연결 설정을 공급한다.
2. 각 비밀은 서로 독립적인 고엔트로피 값으로 생성하고 재사용하지 않는다. 생성과 보관은 Doppler 또는 승인된 password manager를 우선 사용한다.
3. 파일을 사용할 경우 권한을 현재 사용자에게만 제한하고 Git 상태에서 추적되지 않는지 확인한다.
4. 개발·테스트·운영 값과 OAuth client를 분리한다. 운영 비밀을 로컬 통합 테스트에 사용하지 않는다.
5. shell history에 남는 inline 환경변수나 CLI 인자를 피한다. `set -x`와 전체 `env` 출력도 금지한다.

Doppler 구성과 기존 `doppler run -- ...` 흐름은 유지한다. `.doppler.yaml` 같은 로컬 연결 정보가 추가될 경우 공개 가능한 프로젝트/환경 식별자만 포함하는지 별도로 검토하고 service token은 절대 커밋하지 않는다.

## 애플리케이션과 로그

- 시작 시 필수 변수의 존재와 형식만 검증하고 값 자체는 오류 메시지에 포함하지 않는다.
- 인증 헤더, 쿠키, URL query, request body와 introspection 응답 전체를 로그로 남기지 않는다.
- 오류 추적 및 APM의 request capture, breadcrumb, source map 공개 범위를 검토한다.
- 민감 필드는 이름 기반 마스킹에만 의존하지 말고 logging allowlist를 사용한다.
- 사용자 입력이나 pull request 코드가 secret-bearing shell, template 또는 `eval` 문맥에 들어가지 않게 한다.

## GitHub Actions와 저장소 설정

- GitHub Secrets/Environments에 값을 저장하고 환경별 approval과 최소 권한을 적용한다.
- workflow 기본 권한은 read-only로 두고 필요한 job에만 좁혀서 올린다.
- fork pull request에는 비밀을 전달하지 않는다. 신뢰되지 않은 PR 코드를 비밀이 있는 컨텍스트에서 checkout·실행하지 않는다.
- 비밀을 `echo`, step output, artifact, cache 또는 test report에 넣지 않는다. 임시 파일은 최소 권한으로 만들고 job 종료 시 제거한다.
- 저장소에서 secret scanning과 push protection을 활성화하고 경고 bypass 권한을 제한한다.
- **Settings → Security → Code security and analysis**에서 private vulnerability reporting을 활성화하고 `SECURITY.md`의 신고 경로가 실제로 보이는지 확인한다.

공개 전에는 현재 tree뿐 아니라 전체 Git 이력을 secret scanner로 검사한다. `.env*`, private key, credential archive가 추적 중인지 확인하고 workflow와 문서의 샘플 값을 사람이 함께 검토한다. 과거에 실제 값이었을 가능성이 있는 값은 탐지 여부와 무관하게 교체한다.

## 유출 대응

1. 공개 채널에 값을 다시 복사하지 말고 사건 시각·위치·영향 범위를 비공개로 기록한다.
2. 해당 provider에서 secret/token을 즉시 revoke 또는 rotate한다. DB credential, refresh session, 파생 키 등 연결된 자격증명도 평가한다.
3. 배포 환경에 새 값을 반영하고 정상 동작과 이전 값의 실패를 확인한다.
4. 현재 tree와 전체 이력을 검사해 추가 노출과 사용 흔적을 찾는다.
5. history rewrite가 필요하면 maintainer와 fork/clone 영향 및 force-push 일정을 조율한다. 이력 삭제만으로 rotation을 대체하지 않는다.
6. 원인, 탐지 공백, 재발 방지 조치와 완료 증거를 비공개 incident record에 남긴다.

## 참고

- [GitHub: Securing your repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)
- [GitHub: Secret scanning and push protection](https://docs.github.com/en/code-security/getting-started/github-security-features)
- [GitHub: Private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting)
- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
