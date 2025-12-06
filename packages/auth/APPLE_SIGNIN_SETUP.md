# Apple Sign In 설정 가이드

## 1. Apple Developer 계정 설정

### 1.1 App ID 생성 및 설정
1. [Apple Developer Console](https://developer.apple.com/account/) 접속
2. **Certificates, Identifiers & Profiles** → **Identifiers** 이동
3. **+** 버튼 클릭하여 새 App ID 생성
4. **App ID** 선택 후 다음 정보 입력:
   - **Description**: 앱 설명
   - **Bundle ID**: `com.yourcompany.yourapp` (예: `com.gaegaeting.app`)
5. **Capabilities**에서 **Sign In with Apple** 체크
6. **Continue** → **Register**

### 1.2 Service ID 생성
1. **Identifiers** → **+** 버튼 클릭
2. **Services IDs** 선택
3. 다음 정보 입력:
   - **Description**: 서비스 설명 (예: "Gaegaeting Web Service")
   - **Identifier**: `com.yourcompany.yourapp.service` (예: `com.gaegaeting.service`)
4. **Continue** → **Register**
5. 생성된 Service ID 클릭
6. **Sign In with Apple** 체크 후 **Configure** 클릭
7. **Primary App ID** 선택 (위에서 생성한 App ID)
8. **Website URLs** 섹션에서:
   - **Domains and Subdomains**: `yourdomain.com`
   - **Return URLs**: `https://yourdomain.com/auth/apple/callback`
9. **Save** → **Continue** → **Save**

### 1.3 Key 생성
1. **Keys** → **+** 버튼 클릭
2. **Key Name** 입력 (예: "Gaegaeting Sign In Key")
3. **Sign In with Apple** 체크
4. **Configure** 클릭
5. **Primary App ID** 선택
6. **Save** → **Continue** → **Register**
7. **Download** 버튼 클릭하여 `.p8` 파일 다운로드 (한 번만 다운로드 가능!)
8. **Key ID** 기록 (예: `ABC123DEF4`)

### 1.4 Team ID 확인
1. **Membership** 섹션에서 **Team ID** 확인 (예: `XYZ987ABC6`)

## 2. 환경 변수 설정

`.env` 또는 `.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# Apple Sign In 설정
APPLE_TEAM_ID=XYZ987ABC6              # Apple Developer Team ID
APPLE_KEY_ID=ABC123DEF4               # 생성한 Key의 Key ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----"            # .p8 파일의 내용 (전체 내용, 줄바꿈 포함)
APPLE_CLIENT_ID=com.gaegaeting.service # Service ID
```

### APPLE_PRIVATE_KEY 설정 방법
`.p8` 파일을 열어서 전체 내용을 복사하세요:
```bash
cat /path/to/AuthKey_ABC123DEF4.p8
```

출력된 내용을 그대로 `APPLE_PRIVATE_KEY`에 넣되, 줄바꿈을 유지해야 합니다:
```env
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(여러 줄)
-----END PRIVATE KEY-----"
```

또는 한 줄로 변환:
```bash
cat AuthKey_ABC123DEF4.p8 | tr '\n' ' '
```

## 3. 클라이언트 설정

### iOS 앱 설정
1. Xcode에서 프로젝트 열기
2. **Signing & Capabilities** 탭
3. **+ Capability** → **Sign In with Apple** 추가
4. **Info.plist**에 다음 추가:
```xml
<key>ASAuthorizationAppleIDProvider</key>
<string>com.gaegaeting.service</string>
```

### 웹 설정
1. Apple 로그인 버튼 구현
2. 클라이언트에서 받은 `idToken`을 서버의 `appleSignin` mutation으로 전달

## 4. GraphQL Mutation 사용

```graphql
mutation {
  appleSignin(
    idToken: "eyJraWQiOiJlWGF1bm1..."
    authorizationCode: "c1234567890abcdef..."
    user: "{\"email\":\"user@example.com\",\"name\":{\"firstName\":\"John\",\"lastName\":\"Doe\"}}"
  ) {
    accessToken
    refreshToken
    expiresIn
  }
}
```

## 5. 테스트

### 테스트 계정 생성
1. [Apple Developer Console](https://developer.apple.com/account/) → **Users and Access** → **Sandbox Testers**
2. **+** 버튼으로 테스트 계정 추가
3. 테스트 계정으로 로그인 테스트

## 6. 주의사항

1. **Private Key 보안**: `.p8` 파일은 절대 공개 저장소에 커밋하지 마세요
2. **Key ID와 Team ID**: 정확히 입력해야 합니다
3. **Service ID**: 클라이언트에서 사용하는 Service ID와 일치해야 합니다
4. **토큰 검증**: 프로덕션에서는 반드시 Apple의 JWKS를 사용하여 JWT 서명을 검증해야 합니다
5. **이메일**: 사용자가 이메일 공유를 거부할 수 있으므로, 첫 로그인 시에만 이메일을 받을 수 있습니다

## 7. 문제 해결

### "Invalid client" 에러
- Service ID가 올바른지 확인
- Service ID의 Sign In with Apple 설정이 완료되었는지 확인

### "Invalid token" 에러
- Key ID와 Team ID가 올바른지 확인
- Private Key가 올바르게 설정되었는지 확인 (줄바꿈 포함)

### 이메일을 받을 수 없는 경우
- 사용자가 이메일 공유를 거부했을 수 있음
- 첫 로그인 시에만 이메일을 받을 수 있음

