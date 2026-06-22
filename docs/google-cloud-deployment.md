# Google Cloud Deployment

This repository contains three deployable components:

- `backend`: Node/Express API for Cloud Run.
- `frontend`: Vite static frontend served by Nginx on Cloud Run.
- `otp-project`: OpenTripPlanner runtime recommended for Compute Engine.

The commands below use these placeholders:

- `PROJECT_ID`: your Google Cloud project ID.
- `REGION`: Cloud Run and Artifact Registry region, for example `us-central1`.
- `REPOSITORY`: Artifact Registry Docker repository, for example `medio`.
- `BACKEND_URL`: final backend Cloud Run URL.
- `FRONTEND_URL`: final frontend Cloud Run URL.
- `OTP_PRIVATE_IP`: internal IP address of the OTP Compute Engine VM.

## Enable APIs

```sh
gcloud config set project PROJECT_ID

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  compute.googleapis.com
```

## Create Artifact Registry

```sh
gcloud artifacts repositories create REPOSITORY \
  --repository-format=docker \
  --location=REGION \
  --description="Medio deployment images"
```

## Build and Push Images

The frontend embeds `VITE_BACKEND_URL` at build time. After the backend service name is chosen, pass the backend URL into Cloud Build.

```sh
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=REGION,_REPOSITORY=REPOSITORY,_VITE_BACKEND_URL=BACKEND_URL
```

Images pushed:

- `REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/medio-backend:latest`
- `REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/medio-frontend:latest`

## Deploy Backend to Cloud Run

Set secrets and sensitive values as Cloud Run env vars or Secret Manager references. The command below uses plain env vars for clarity.

```sh
gcloud run deploy medio-api \
  --image=REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/medio-backend:latest \
  --region=REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars='^|^NODE_ENV=production|FRONTEND_URL=FRONTEND_URL|ALLOWED_ORIGINS=FRONTEND_URL|CAPACITOR_ORIGINS=capacitor://localhost,http://localhost,https://localhost|OTP_BASE_URL=http://OTP_PRIVATE_IP:8080|JWT_ISSUER=medio-api|JWT_AUDIENCE=medio-web|JWT_EXPIRES_IN=7d|BCRYPT_ROUNDS=12|LOG_LEVEL=info' \
  --set-env-vars='^|^MONGO_URI=YOUR_MONGO_URI|JWT_SECRET=YOUR_32_PLUS_CHAR_SECRET|GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET|GOOGLE_CALLBACK_URL=https://BACKEND_CLOUD_RUN_HOST/api/auth/google/callback'
```

After deployment, get the backend URL:

```sh
gcloud run services describe medio-api \
  --region=REGION \
  --format='value(status.url)'
```

If the backend URL changes from the `BACKEND_URL` used in the frontend build, rebuild the frontend image with the correct `_VITE_BACKEND_URL`.

## Deploy Frontend to Cloud Run

```sh
gcloud run deploy medio-web \
  --image=REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/medio-frontend:latest \
  --region=REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1
```

After deployment, get the frontend URL:

```sh
gcloud run services describe medio-web \
  --region=REGION \
  --format='value(status.url)'
```

Update the backend service with the final frontend origin:

```sh
gcloud run services update medio-api \
  --region=REGION \
  --update-env-vars=FRONTEND_URL=FRONTEND_URL,ALLOWED_ORIGINS=FRONTEND_URL
```

## Deploy OTP to Compute Engine

Build and push the OTP image locally or with a separate Cloud Build command:

```sh
gcloud builds submit otp-project \
  --tag=REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/medio-otp:latest
```

Create a VM with container runtime support:

```sh
gcloud compute instances create-with-container medio-otp \
  --zone=REGION-a \
  --machine-type=e2-medium \
  --container-image=REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/medio-otp:latest \
  --container-env=PORT=8080,JAVA_OPTS=-Xmx700m \
  --tags=medio-otp \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --boot-disk-size=20GB
```

Allow backend traffic to OTP on the internal network. Replace `BACKEND_SERVERLESS_CONNECTOR_RANGE` with the source range used by your Serverless VPC Access connector, or restrict the source to your chosen private network design.

```sh
gcloud compute firewall-rules create allow-medio-otp-internal \
  --allow=tcp:8080 \
  --target-tags=medio-otp \
  --source-ranges=BACKEND_SERVERLESS_CONNECTOR_RANGE
```

If Cloud Run must reach the VM by private IP, configure a Serverless VPC Access connector and attach it to the backend:

```sh
gcloud compute networks vpc-access connectors create medio-connector \
  --region=REGION \
  --range=10.8.0.0/28

gcloud run services update medio-api \
  --region=REGION \
  --vpc-connector=medio-connector \
  --vpc-egress=private-ranges-only \
  --update-env-vars=OTP_BASE_URL=http://OTP_PRIVATE_IP:8080
```

## Required Environment Variables

Backend:

- `NODE_ENV=production`
- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`
- `CAPACITOR_ORIGINS`
- `OTP_BASE_URL`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_EXPIRES_IN`
- `BCRYPT_ROUNDS`
- `LOG_LEVEL`

Frontend build:

- `VITE_BACKEND_URL`

OTP:

- `PORT=8080`
- `JAVA_OPTS=-Xmx700m` or another value sized for the deployed graph and VM memory.
