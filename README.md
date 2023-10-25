# Web Socket Server for passing messages from MQTT to FE applications.

## Getting Started

To run the components locally, follow these steps:

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
```bash
   npm install
   yarn
```
4. Run the development server:
```bash
   npm run dev
   yarn dev
```
5. WebSocketServer will be available on  [ws://localhost:8080](ws://localhost:8080)

## Triggers

The following triggers are configured in GCP:
 - push to (main|dev) branch to build and deploy to the corresponding environments
 - push to any branch to build an image and push to GCR

## Build an image & deploy to Teknoir DEV cloud

Run the following command from the root of the repo:

> The only params that can be modified are **SHORT_SHA** and **BRANCH_NAME**. Usually these would be filled in by the build trigger, but this is a manual build and in this context they just tag the image. 

```
gcloud --project=teknoir-mgmt builds submit . \
--config=cloudbuild.yaml \
--timeout=3600 \
--substitutions=\
_DEPLOY_TO_GKE_DEV="true",\
SHORT_SHA="test",\
BRANCH_NAME="dev",\
_CLOUDSDK_COMPUTE_ZONE="us-central1-c",\
_CLOUDSDK_CONTAINER_CLUSTER="teknoir-poc",\
_TARGET_CLUSTER_NAME="teknoir-dev-cluster"
```

## Build an image & deploy to Teknoir cloud 

Run the following command from the root of the repo:

> The only params that can be modified are **SHORT_SHA** and **BRANCH_NAME**. Usually these would be filled in by the build trigger, but this is a manual build and in this context they just tag the image. 

```
gcloud --project=teknoir-mgmt builds submit . \
--config=cloudbuild.yaml \
--timeout=3600 \
--substitutions=\
_DEPLOY_TO_GKE_PROD="true",\
SHORT_SHA="1.0.0",\
BRANCH_NAME="main",\
_CLOUDSDK_COMPUTE_ZONE="us-central1-c",\
_CLOUDSDK_CONTAINER_CLUSTER="teknoir",\
_TARGET_CLUSTER_NAME="teknoir-cluster"
```
