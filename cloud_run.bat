@echo off
set PROJECT_ID=legel-assistent-466812
set REPOSITORY_NAME=ecommerce
set REGION=europe-west2
set IMAGE_NAME=ecommerce-api
set IMAGE_TAG=v7
set SERVICE_NAME=ecommerce-api

REM Authenticate with Google Cloud
echo Authenticating with Google Cloud...
gcloud auth configure-docker %REGION%-docker.pkg.dev --quiet

REM Set the project
gcloud config set project %PROJECT_ID%

REM Create artifacts repository if it doesn't exist (uncomment if needed)
REM gcloud artifacts repositories create %REPOSITORY_NAME% --repository-format=docker --location=%REGION%

REM Build the Docker image
echo Building Docker image...
docker build --no-cache -t %IMAGE_NAME%:%IMAGE_TAG% .

REM Tag the image for Artifact Registry
docker tag %IMAGE_NAME%:%IMAGE_TAG% %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY_NAME%/%IMAGE_NAME%:%IMAGE_TAG%

REM Push the image to Artifact Registry
echo Pushing image to Artifact Registry...
docker push %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY_NAME%/%IMAGE_NAME%:%IMAGE_TAG%

REM Deploy to Cloud Run
echo Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
  --image %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY_NAME%/%IMAGE_NAME%:%IMAGE_TAG% ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --timeout=600s ^
  --min-instances=1 ^
  --memory=2Gi ^
  --concurrency=80 ^
  --cpu=2 ^
  --port=3000 ^
  --set-env-vars "NODE_ENV=production" ^
  --set-env-vars "API_PORT=4000" ^
  --set-env-vars "API_PREFIX=api/v1" ^
  --set-env-vars "MONGODB_URI=mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce" ^
  --set-env-vars "MONGODB_DB_NAME=E-commerce" ^
  --set-env-vars "JWT_SECRET=2de564a705a3f047dd12699732cfac7c7af59422df41421a91bba5c25a880ce4874116f52c9bc37b570d9abc3ac7cf5a5075e3e7044753ef5366f143868405ac" ^
  --set-env-vars "API_BASE_URL=https://ecommerce-api-895210689446.europe-west2.run.app" ^
  --set-env-vars "STOREFRONT_URL=*" ^
  --set-env-vars "VENDOR_URL=*" ^
  --set-env-vars "ADMIN_URL=*"

echo.
echo Deployment complete!
echo.
echo IMPORTANT: After first deployment, update API_BASE_URL with the actual Cloud Run URL:
echo   gcloud run services describe %SERVICE_NAME% --region %REGION% --format="value(status.url)"
echo Then redeploy with the correct URL.
echo.
echo URLs:
echo   Storefront: https://ecommerce-api-895210689446.europe-west2.run.app/
echo   Login:      https://ecommerce-api-895210689446.europe-west2.run.app/login
echo   Vendor:     https://ecommerce-api-895210689446.europe-west2.run.app/vendor/
echo   Admin:      https://ecommerce-api-895210689446.europe-west2.run.app/admin/
echo   API Docs:   https://ecommerce-api-895210689446.europe-west2.run.app/api/docs
