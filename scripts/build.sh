#!/usr/bin/env bash
set -eo pipefail

safeImageTag() {
  local branchName="$1"

  # Replace slashes with dashes and remove characters that are not allowed
  local safeTag="${branchName//\//-}"
  safeTag="${safeTag//[^a-zA-Z0-9_.-]/}"

  # Ensure the tag does not start with a period or a dash
  safeTag="${safeTag/#[-.]/}"

  # Truncate to 128 characters to meet Docker's tag length limit
  safeTag="${safeTag:0:128}"

  echo "$safeTag"
}

export BRANCH_NAME=${BRANCH_NAME:-"dev"}
export SHORT_SHA=${SHORT_SHA:-$(date +%Y%m%d-%H%M%S)}
export SAFE_TAG=$(safeImageTag "${SHORT_SHA}")
export NODE_VERSION="22"
export NAMESPACE=gcr.io

docker buildx build . \
  --platform=linux/amd64 \
  --push \
  --build-arg NODE_VERSION=$NODE_VERSION \
  --tag us-docker.pkg.dev/teknoir/$NAMESPACE/wss-mqtt:${BRANCH_NAME}-${SAFE_TAG}