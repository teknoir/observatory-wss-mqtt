#!/bin/bash

# This script is used to deploy the application to GKE

if [ "${_DEPLOY_TO_GKE_DEV}" == "true" ]; then

    # Set variables 
    APP_NAMESPACE="demonstrations"
    CONTROLLER_NAMESPACE="teknoir"

    # Get kubeconfig creds
    gcloud container clusters get-credentials "${TARGET_CLUSTER_NAME}" --project "${CLOUDSDK_CONTAINER_CLUSTER}" --zone "${CLOUDSDK_COMPUTE_ZONE}" 

    # Create deployment
    kubectl delete deployment wss-mqtt || true
    kubectl create deployment wss-mqtt --image="us-docker.pkg.dev/teknoir/gcr.io/wss-mqtt:${BRANCH_NAME}-${SHORT_SHA}" -n ${APP_NAMESPACE} 

fi
