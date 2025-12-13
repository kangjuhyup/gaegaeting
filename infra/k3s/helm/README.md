# Helm Charts for k3s Deployment

이 디렉토리는 k3s 클러스터에 배포할 Helm 차트 values 파일들을 포함합니다.

## 배포되는 서비스

### 1. MySQL (1 Master + 1 Replica)
- **Chart**: bitnami/mysql
- **Namespace**: database
- **설정 파일**: `mysql/values.yaml`
- **접속 정보**:
  - Master: `mysql-master.database.svc.cluster.local:3306`
  - Replica: `mysql-replica.database.svc.cluster.local:3306`

### 2. Redis (Master-Replica with Sentinel)
- **Chart**: bitnami/redis
- **Namespace**: database
- **설정 파일**: `redis/values.yaml`
- **접속 정보**:
  - Master: `redis-master.database.svc.cluster.local:6379`
  - Replica: `redis-replica.database.svc.cluster.local:6379`
  - Sentinel: `redis-sentinel.database.svc.cluster.local:26379`

### 3. Kafka + Schema Registry (Avro)
- **Chart**: bitnami/kafka
- **Namespace**: messaging
- **설정 파일**: `kafka/values.yaml`
- **구성**:
  - Kafka brokers: 3 replicas
  - Zookeeper: 3 replicas
  - Schema Registry: 2 replicas (port 8081)
- **접속 정보**:
  - Kafka: `kafka.messaging.svc.cluster.local:9092`
  - Schema Registry: `schema-registry.messaging.svc.cluster.local:8081`

### 4. ELK Stack (Elasticsearch, Logstash, Kibana)
- **Chart**: elastic/elasticsearch
- **Namespace**: logging
- **설정 파일**: `elk/values.yaml`
- **구성**:
  - Elasticsearch: 1 node (production에서는 3 nodes 권장)
  - Logstash: 1 replica
  - Kibana: 1 replica
- **접속 정보**:
  - Elasticsearch: `elasticsearch.logging.svc.cluster.local:9200`
  - Kibana: `kibana.logging.svc.cluster.local:5601`
  - Logstash (beats): `logstash.logging.svc.cluster.local:5044`

### 5. ArgoCD
- **Chart**: argo/argo-cd
- **Namespace**: argocd
- **설정 파일**: `argocd/values.yaml`
- **구성**:
  - Server: 2 replicas
  - Repo Server: 2 replicas
  - Application Set Controller: 1 replica
- **접속 정보**:
  - UI: `argocd-server.argocd.svc.cluster.local:80`

## 배포 방법

### Ansible을 통한 자동 배포
```bash
# 모든 Helm 차트 배포
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags helm

# 특정 차트만 배포 (예: mysql)
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags helm --extra-vars "helm_charts=[{name: mysql, enabled: true}]"
```

### 수동 배포
```bash
# Helm 저장소 추가
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add elastic https://helm.elastic.co
helm repo add argo https://argoproj.github.io/argo-helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

# MySQL 배포
helm install mysql bitnami/mysql \
  --namespace database \
  --create-namespace \
  -f mysql/values.yaml

# Redis 배포
helm install redis bitnami/redis \
  --namespace database \
  -f redis/values.yaml

# Kafka 배포
helm install kafka bitnami/kafka \
  --namespace messaging \
  --create-namespace \
  -f kafka/values.yaml

# Elasticsearch 배포
helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --create-namespace \
  -f elk/values.yaml

# ArgoCD 배포
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  -f argocd/values.yaml
```

## (필수) TLS 자동 발급을 위한 cert-manager

Ingress TLS(`cert-manager.io/cluster-issuer: letsencrypt-prod`)를 사용하므로,
클러스터에 `cert-manager`와 `ClusterIssuer/letsencrypt-prod`가 먼저 있어야 합니다.

- **Ansible 자동 배포**: `site.yml --tags helm` 실행 시 `cert-manager` + `letsencrypt-prod`도 함께 설치/생성됩니다.
- **수동 배포**:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace \
  -f cert-manager/values.yaml

kubectl apply -f - <<'YAML'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: admin@gaegaeting.app
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: traefik
YAML
```

## Doppler 환경 변수 설정

다음 값들은 Doppler에 저장하고 배포 시 주입해야 합니다:

### MySQL
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `MYSQL_REPLICATION_PASSWORD`

### Redis
- `REDIS_PASSWORD`

### ArgoCD
- `ARGOCD_ADMIN_PASSWORD` (bcrypt hash)
- `GITHUB_TOKEN` (repository 접근용)

### Slack (ArgoCD Notifications)
- `SLACK_TOKEN`

## 리소스 요구사항

최소 노드 스펙:
- **CPU**: 4 cores
- **Memory**: 8GB RAM
- **Storage**: 100GB

권장 노드 스펙 (production):
- **CPU**: 8 cores
- **Memory**: 16GB RAM
- **Storage**: 200GB SSD

## 모니터링

모든 서비스는 Prometheus ServiceMonitor를 지원합니다:
- MySQL Exporter
- Redis Exporter
- Kafka JMX Exporter
- Elasticsearch Metrics
- ArgoCD Metrics

## 백업

### MySQL
```bash
# 백업
kubectl exec -n database mysql-master-0 -- mysqldump -u root -p${MYSQL_ROOT_PASSWORD} --all-databases > backup.sql

# 복원
kubectl exec -i -n database mysql-master-0 -- mysql -u root -p${MYSQL_ROOT_PASSWORD} < backup.sql
```

### Redis
```bash
# RDB 스냅샷 생성
kubectl exec -n database redis-master-0 -- redis-cli SAVE

# AOF 백업
kubectl exec -n database redis-master-0 -- redis-cli BGREWRITEAOF
```

### Kafka
- Kafka는 replication factor=2로 설정되어 있어 데이터 손실 방지
- 중요 토픽은 별도 백업 필요

## 트러블슈팅

### Pod이 Pending 상태
```bash
kubectl describe pod <pod-name> -n <namespace>
# PVC 바인딩 확인
kubectl get pvc -n <namespace>
```

### 서비스 연결 실패
```bash
# 서비스 확인
kubectl get svc -n <namespace>

# Endpoint 확인
kubectl get endpoints -n <namespace>

# 로그 확인
kubectl logs <pod-name> -n <namespace>
```

### 리소스 부족
```bash
# 노드 리소스 확인
kubectl top nodes

# Pod 리소스 사용량
kubectl top pods -A
```
