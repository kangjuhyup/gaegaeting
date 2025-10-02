# K3s Single Node Infrastructure

k3s 싱글노드 클러스터 설치 및 관리를 위한 Infrastructure as Code (IaC) 구성입니다.

## 📁 구조

```
infra/k3s/
├── terraform/          # Terraform 인프라 구성
├── scripts/            # 설치/관리 스크립트
├── configs/            # k3s 설정 파일
├── monitoring/         # 모니터링 설정
└── README.md          # 본 문서
```

## 🚀 빠른 시작

### 1. 로컬 개발 환경 (단일 서버)

```bash
# k3s 설치
./scripts/install-k3s.sh

# kubeconfig 설정
./scripts/setup-kubeconfig.sh

# 기본 네임스페이스 및 리소스 생성
./scripts/setup-resources.sh
```

### 2. 클라우드 환경 (Terraform)

```bash
cd terraform/

# AWS
terraform workspace select aws
terraform init
terraform plan
terraform apply

# Google Cloud
terraform workspace select gcp
terraform init
terraform plan
terraform apply
```

## 📋 사전 요구사항

### 로컬 환경
- Ubuntu 20.04+ 또는 CentOS 7+
- 최소 2GB RAM, 2 CPU 코어
- 10GB 이상 디스크 공간

### 클라우드 환경
- AWS CLI 또는 gcloud CLI 설정
- Terraform 1.0+
- 적절한 클라우드 자격증명

## 🔧 구성 요소

### k3s 기본 설정
- 단일 노드 클러스터
- Traefik 인그레스 컨트롤러
- Local Path Provisioner
- ServiceLB (MetalLB 대안)

### 추가 구성 요소
- cert-manager (Let's Encrypt)
- Prometheus + Grafana 모니터링
- 로그 수집 (Fluent Bit)
- 백업 자동화

## 📊 모니터링

```bash
# Prometheus 접속
kubectl port-forward -n monitoring svc/prometheus-server 9090:80

# Grafana 접속
kubectl port-forward -n monitoring svc/grafana 3000:80
```

## 🔒 보안

- Network Policies 적용
- RBAC 구성
- Secret 암호화
- 정기 보안 업데이트

## 🛠 유지보수

```bash
# k3s 업그레이드
./scripts/upgrade-k3s.sh

# 백업 생성
./scripts/backup-cluster.sh

# 백업 복원
./scripts/restore-cluster.sh [backup-file]

# 클러스터 상태 확인
./scripts/health-check.sh
```

## 📚 참고 자료

- [k3s 공식 문서](https://docs.k3s.io/)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [Terraform 공식 문서](https://terraform.io/docs/)