#!/usr/bin/env bash
set -euo pipefail

# This script is intended to run on the K3s node via SSH (GitHub Actions).
# It "adopts" an existing Helm-installed Argo CD by creating GitOps Applications:
# - root-app -> manages infra/k3s/argocd/applications/*
# - argocd   -> self-manages Argo CD via infra/k3s/helm/argocd-chart (wrapper chart)
#
# It does NOT uninstall Argo CD.
# Optionally, you can delete the Helm release secrets to prevent accidental helm upgrades:
#   DELETE_HELM_RELEASE_SECRETS=1 ./migrate-argocd-to-gitops.sh

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

echo "[migrate-argocd] using KUBECONFIG=${KUBECONFIG}"

echo "[migrate-argocd] cluster connectivity check"
kubectl version --short >/dev/null

echo "[migrate-argocd] ensure namespace argocd"
kubectl get namespace argocd >/dev/null 2>&1 || kubectl create namespace argocd

echo "[migrate-argocd] apply root-app"
kubectl apply -f - <<'YAML'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/kangjuhyup/gaegaeting
    targetRevision: develop
    path: infra/k3s/argocd/applications
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
YAML

echo "[migrate-argocd] apply self-managed argocd Application"
kubectl apply -f - <<'YAML'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/kangjuhyup/gaegaeting
    targetRevision: develop
    path: infra/k3s/helm/argocd-chart
    helm:
      releaseName: argocd
      valueFiles:
        - ../argocd/values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
YAML

if [[ "${DELETE_HELM_RELEASE_SECRETS:-0}" == "1" ]]; then
  echo "[migrate-argocd] deleting helm release secrets for argocd (prevents future helm upgrades)"
  kubectl -n argocd delete secret -l owner=helm,name=argocd --ignore-not-found
fi

echo "[migrate-argocd] done. current applications:"
kubectl -n argocd get applications.argoproj.io || true


