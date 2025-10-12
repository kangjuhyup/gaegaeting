# ![개개팅 로고](./docs//logo.png) 개개팅



## 📚 API 문서

[API Document 보러가기](https://kangjuhyup.github.io/gaegaeting/docs/#/)

## 아키텍쳐
```mermaid
%% 색 초기화(선택)
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor': '#f5f7fb', 'primaryTextColor':'#2c3e50', 'lineColor':'#95a5a6'
}}}%%

flowchart LR
  subgraph Clients["Clients"]
    M["Flutter App (iOS/Android)"]
    W["Web (Next.js)"]
  end

  subgraph OCI["OCI A1 Instance (Single Node)"]
    subgraph K3S["k3s (single-node)"]
      TR["Traefik Ingress (ACME, TLS, WAF/Limits)"]
      ARGO["Argo CD (GitOps)"]

      %% ── App 영역 ─────────────────────────────────────────
      subgraph Apps["App Mesh (Namespaces)"]
        GW["API Gateway / BFF"]
        APPS["(All App Services)"]
      end

      %% ── Data 영역(Elasticsearch 포함) ───────────────────
      subgraph Data["Data"]
        MYSQL["MySQL (Primary + Read Replica)"]
        REDIS["Redis"]
        ES["Elasticsearch"]
      end

      %% ── Observability/Log ───────────────────────────────
      subgraph Observability["Observability"]
        KB["Kibana"]
        FB["Filebeat (DaemonSet)"]
        GRAF["Grafana"]
      end

      %% ── Messaging(내부) ─────────────────────────────────
      subgraph Messaging["Messaging (Internal)"]
        KAFKA["Kafka (KRaft, 1 broker)"]
      end
    end
  end

  %% ── 외부 서비스 분리 ────────────────────────────────────
  subgraph AWS["AWS"]
    SNS["AWS SNS (External Event Listener)"]
    LAMBDA["AWS Lambda (Event Processor)"]
  end

  subgraph WASABI_EXT["Wasabi"]
    WASABI["Wasabi S3-Compatible (Object Storage)"]
  end
  
  subgraph GITHUB["Github"]
	  REPOSITORY["Repository"]
	  REGISTRY["Registry"]
	  WORKFLOW["CI/CD"]
	end

  %% ── Edges (Ingress/API) ─────────────────────────────────
  M -->|HTTPS&WSS| TR
  W -->|HTTPS| TR
  TR --> GW
  GW --> APPS

  %% ── Data 접근 ───────────────────────────────────────────
  APPS --> MYSQL
  APPS --> REDIS
  APPS --> ES

  %% ── Storage (Wasabi) ────────────────────────────────────
  APPS -->|media/files, backups| WASABI
  MYSQL -. backups/export .-> WASABI
  WASABI -. restore .-> MYSQL
  WASABI -. event .-> SNS

  %% ── Messaging / Events (외부 AWS) ───────────────────────
  APPS -->|Domain Events : HTTP/SNS Publish| SNS
  SNS --> LAMBDA
  LAMBDA -->|Callback/Webhook| TR
  TR --> GW

  %% ── Observability ───────────────────────────────────────
  APPS -->|logs| FB
  FB --> ES
  ES --> KB
  ES --> GRAF

  %% ── Kafka ↔ App 서비스 연결 ─────────────────
  APPS <-->|events/streams| KAFKA
  
  %% ── GitOps 연결 ─────────────────
  GITHUB --> ARGO

%% ─────────────────────────────────────────────────────────
%% linkStyle: 선언된 순서대로 0부터 색 적용
%% 0-3: Ingress/API (파랑)
linkStyle 0,1,2,3 stroke:#1DA3DD,stroke-width:2px;

%% 4-6: Data 접근 (초록)
linkStyle 4,5,6 stroke:#2ECC71,stroke-width:2px;

%% 7-10: Wasabi(Storage) (주황) / 점선은 백업/복구/이벤트
linkStyle 7 stroke:#F39C12,stroke-width:2px;
linkStyle 8,9,10 stroke:#F39C12,stroke-width:2px,stroke-dasharray: 5 5;

%% 11-14: AWS 메시징 경로 (보라)
linkStyle 11,12,13,14 stroke:#9B59B6,stroke-width:2px;

%% 15-18: Observability (회색)
linkStyle 15,16,17,18 stroke:#7F8C8D,stroke-width:2px;

%% 19: Kafka 내부 이벤트 (빨강)
linkStyle 19 stroke:#E74C3C,stroke-width:2px;
```
## 로컬 환경 구성

### 1. Doppler 설치 및 연동

#### Doppler CLI 설치
```bash
# macOS
brew install dopplerhq/cli/doppler

# Linux
(curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sudo sh

# Windows (PowerShell)
# https://docs.doppler.com/docs/install-cli 참고
```

#### Doppler 로그인 및 설정
```bash
# 1. Doppler 로그인
doppler login

# 2. 프로젝트 루트에서 Doppler 설정
doppler setup

# 3. 설정 확인
doppler run -- env | grep DOPPLER
```

#### 각 서비스별 환경변수 사용
```bash
# Account 서비스 실행
doppler run -- yarn workspace account start:dev

# Match 서비스 실행
doppler run -- yarn workspace match start:dev

# Chat 서비스 실행
doppler run -- yarn workspace chat start:dev
```

### 2. Docker Compose로 인프라 구동

#### 필수 인프라 서비스 시작
```bash
# 모든 인프라 서비스 시작 (MySQL, Redis, Kafka 등)
docker-compose up -d

# 특정 서비스만 시작
docker-compose up -d mysql redis

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f [service-name]
```

#### 인프라 서비스 종료
```bash
# 모든 서비스 종료 (데이터 유지)
docker-compose down

# 모든 서비스 종료 및 볼륨 삭제 (데이터 삭제)
docker-compose down -v
```

#### 주요 서비스 접속 정보
- **MySQL**: `localhost:3306`
- **Redis**: `localhost:6379`
- **Kafka**: `localhost:9092`

## Typescript 프로젝트 
### 실행 방법
```bash
# yarn berry typescript sdk 설치
yarn dlx @yarnpkg/sdks vscode
# 프로젝트 의존성 설치
yarn
# 프로젝트 실행 (ex. account )
yarn workspace account run:dev
```
### Core 모듈 패키지 적용 방법
1. 각 프로젝트 package.json 에 dependency 추가
```json
"dependencies": {
  "@core/database": "*",
  // @core/database 의 peerDependencies에 선언된 패키지도 추가 필요
}
```
2. Core 모듈 빌드
```bash
yarn workspace @core/database build
```
3. 패키지내 필요한 파일에 모듈 import
```javasacript
import { DatabaseModule } from '@core/database';
```
3-1. 경로 에러가 날 경우 대처 방법
- 루트의 tsconfig.json 에 paths 에 모듈 경로가 존재하는지 확인
```json
"paths": {
  "@core/database/*": ["packages/core/database/src/*"],
}
```
- typescript 서버 재실행