# 빌드 스테이지
FROM node:20-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 매니저 설치
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# 전체 워크스페이스 복사 (모노레포 구조 지원)
COPY . .

# 의존성 설치
RUN yarn install

# @core 패키지들 먼저 빌드
RUN yarn workspace @core/logger build

RUN yarn workspace gateway build

# 실행 스테이지
FROM node:20-alpine AS runner

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 매니저 설치
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# 필요한 파일만 복사
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=builder /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder /app/packages/core ./packages/core

# 프로덕션 모드로 의존성 설치
ENV NODE_ENV=production
RUN yarn workspaces focus gateway --production


# 애플리케이션 실행
CMD ["node", "packages/gateway/dist/src/main.js"]
