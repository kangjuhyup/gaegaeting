# K3s Cluster Infrastructure

개개팅(gaegaeting) 프로젝트를 위한 k3s 클러스터 Infrastructure as Code (IaC) 구성입니다.

## 📁 구조

```
infra/k3s/
├── ansible/
│   ├── inventory/          # Ansible 인벤토리 설정
│   ├── playbooks/          # Ansible playbooks
│   ├── roles/              # Ansible roles
│   │   ├── system/         # 시스템 초기 설정
│   │   ├── k3s/            # k3s 설치 및 설정
│   │   ├── helm/           # Helm 차트 배포
│   │   ├── monitoring/     # 모니터링 스택
│   │   └── backup/         # 백업 자동화
│   └── ansible.cfg
├── helm/
│   ├── mysql/              # MySQL Helm values
│   ├── redis/              # Redis Helm values
│   ├── kafka/              # Kafka + Schema Registry values
│   ├── elk/                # ELK Stack values
│   ├── argocd/             # ArgoCD values
│   └── README.md
└── README.md              # 본 문서
```

## 🚀 빠른 시작

### GitHub Actions를 통한 자동 배포

1. **GitHub Secrets 설정**
   - `DOPPLER_TOKEN`: Doppler service token
   - `DEPLOY_HOST`: 서버 IP 주소
   - `DEPLOY_USER`: SSH 사용자 (예: ubuntu)
   - `DEPLOY_SSH_KEY`: SSH private key

2. **Doppler Secrets 설정** (`infra/prd` 프로젝트)
   - `K3S_TOKEN`: k3s 클러스터 토큰
   - `MYSQL_ROOT_PASSWORD`
   - `MYSQL_PASSWORD`
   - `REDIS_PASSWORD`
   - `ARGOCD_ADMIN_PASSWORD`

3. **배포 실행**
   ```bash
   # infra 브랜치에 push하면 자동 배포
   git push origin infra

   # 또는 GitHub Actions UI에서 수동 실행
   # Actions → K3s Cluster Deploy → Run workflow
   ```

### Ansible을 통한 수동 배포

```bash
cd infra/k3s/ansible

# 전체 스택 배포
doppler run -- ansible-playbook playbooks/site.yml

# 특정 태그만 실행
doppler run -- ansible-playbook playbooks/site.yml --tags k3s
doppler run -- ansible-playbook playbooks/site.yml --tags helm
doppler run -- ansible-playbook playbooks/site.yml --tags monitoring

# 특정 단계 스킵
doppler run -- ansible-playbook playbooks/site.yml --skip-tags backup
```

## 📋 사전 요구사항

### 서버 스펙
**개발 환경 (최소)**
- Ubuntu 20.04+ (ARM64/AMD64)
- 4GB RAM, 2 CPU 코어
- 50GB 디스크 공간

**프로덕션 환경 (권장)**
- Ubuntu 22.04 LTS (ARM64/AMD64)
- 16GB RAM, 8 CPU 코어
- 200GB SSD

### 로컬 개발 환경
- Python 3.11+
- Ansible 2.15+
- Doppler CLI (secrets 관리)
- SSH 접근 권한

## 🔧 구성 요소

### k3s 클러스터 (Ansible roles)
- **system**: 시스템 초기 설정 (방화벽, swap 비활성화, 커널 파라미터)
- **k3s**: k3s 서버 설치 및 설정
- **helm**: Helm 설치 및 차트 배포
- **monitoring**: Prometheus + Grafana (선택적)
- **backup**: etcd 백업 자동화 (선택적)

### 배포되는 애플리케이션 (Helm Charts)

#### 데이터베이스
- **MySQL** (bitnami/mysql)
  - 1 Master + 1 Replica
  - 자동 복제 및 failover
  - Metrics 수집 지원

- **Redis** (bitnami/redis)
  - Master-Replica 구조
  - Sentinel 기반 HA
  - 자동 failover

#### 메시징
- **Kafka** (bitnami/kafka)
  - 3 Kafka brokers
  - 3 Zookeeper nodes
  - Schema Registry (Avro 지원)
  - JMX Metrics

#### 로깅
- **ELK Stack** (elastic/elasticsearch)
  - Elasticsearch: 데이터 저장 및 검색
  - Logstash: 로그 수집 및 파싱
  - Kibana: 시각화 대시보드

#### GitOps
- **ArgoCD** (argo/argo-cd)
  - GitOps 기반 배포
  - Application Set Controller
  - Slack 알림 연동

## 📊 모니터링 및 접속

### 서비스 접속

```bash
# kubectl 설정 (서버에서)
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# MySQL
kubectl port-forward -n database svc/mysql-master 3306:3306

# Redis
kubectl port-forward -n database svc/redis-master 6379:6379

# Kafka
kubectl port-forward -n messaging svc/kafka 9092:9092

# Schema Registry
kubectl port-forward -n messaging svc/schema-registry 8081:8081

# Kibana
kubectl port-forward -n logging svc/kibana 5601:5601

# ArgoCD UI
kubectl port-forward -n argocd svc/argocd-server 8080:80
# 접속: http://localhost:8080
# 초기 비밀번호 확인: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Prometheus (monitoring role 활성화 시)
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Grafana (monitoring role 활성화 시)
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

### 클러스터 상태 확인

```bash
# 노드 상태
kubectl get nodes

# 모든 파드 상태
kubectl get pods -A

# 헬름 릴리스 확인
helm list -A

# 리소스 사용량
kubectl top nodes
kubectl top pods -A

# 특정 서비스 로그 확인
kubectl logs -n database deploy/mysql-master
kubectl logs -n messaging deploy/kafka-0
```

## 🔒 보안

- **방화벽**: UFW/firewalld 설정으로 필수 포트만 개방
- **RBAC**: Kubernetes 네이티브 RBAC 활성화
- **Secrets**: Doppler를 통한 중앙 관리
- **Network Policies**: 네임스페이스 간 트래픽 제어 (선택적)
- **이미지 정책**: 공식 이미지 사용 및 정기 업데이트

## 🛠 유지보수

### k3s 클러스터 관리

```bash
# SSH로 서버 접속
ssh -i ~/.ssh/id_rsa ubuntu@<server-ip>

# k3s 서비스 상태
sudo systemctl status k3s

# k3s 재시작
sudo systemctl restart k3s

# k3s 로그 확인
sudo journalctl -u k3s -f
```

### 백업 및 복원

```bash
# 서버에서 백업 실행
sudo /var/backups/k3s/scripts/backup-k3s.sh

# 백업 목록 확인
ls -lh /var/backups/k3s/etcd/

# 복원 (주의: 현재 데이터 덮어씀)
sudo /var/backups/k3s/scripts/restore-k3s.sh /var/backups/k3s/etcd/k3s-etcd-YYYYMMDD-HHMMSS.db

# 오래된 백업 정리
sudo /var/backups/k3s/scripts/cleanup-backups.sh
```

### Helm 차트 업그레이드

```bash
# Helm 저장소 업데이트
helm repo update

# 특정 차트 업그레이드
helm upgrade mysql bitnami/mysql \
  --namespace database \
  -f /path/to/helm/mysql/values.yaml

# 릴리스 히스토리
helm history mysql -n database

# 롤백
helm rollback mysql 1 -n database
```

### 문제 해결

```bash
# Pod 상세 정보
kubectl describe pod <pod-name> -n <namespace>

# 이벤트 확인
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# 리소스 부족 확인
kubectl describe nodes

# PVC 상태 확인
kubectl get pvc -A

# 서비스 엔드포인트 확인
kubectl get endpoints -n <namespace>
```

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      k3s Cluster                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Database   │  │  Messaging  │  │   Logging   │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ MySQL       │  │ Kafka       │  │ Elastic     │         │
│  │ - Master    │  │ - 3 Brokers │  │ - ES        │         │
│  │ - Replica   │  │ - ZooKeeper │  │ - Logstash  │         │
│  │             │  │ - Schema    │  │ - Kibana    │         │
│  │ Redis       │  │   Registry  │  │             │         │
│  │ - Sentinel  │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │              ArgoCD (GitOps)                     │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │         Monitoring (Optional)                    │        │
│  │         Prometheus + Grafana                     │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```