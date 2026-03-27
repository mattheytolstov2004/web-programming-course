$ErrorActionPreference = "Stop"

# Проверяем наличие файла с предыдущим тегом
if (-not (Test-Path .last-release-tag)) {
    Write-Host "No previous release tag found. Cannot rollback." -ForegroundColor Red
    exit 1
}

$PREV_TAG = Get-Content .last-release-tag -Raw
$PREV_TAG = $PREV_TAG.Trim()

Write-Host "Rolling back to previous version: $PREV_TAG" -ForegroundColor Yellow

# Проверяем, существует ли образ
$imageExists = docker images -q "quiz-backend:$PREV_TAG"
if (-not $imageExists) {
    Write-Host "Image quiz-backend:$PREV_TAG not found!" -ForegroundColor Red
    Write-Host "Available images:" -ForegroundColor Yellow
    docker images | findstr quiz-backend
    exit 1
}

Write-Host "Restarting containers with previous image..." -ForegroundColor Green

# Останавливаем текущие контейнеры
docker compose down

# Запускаем с предыдущим образом
$env:BACKEND_IMAGE = "quiz-backend:$PREV_TAG"
docker compose up -d

Write-Host "Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Running health check..." -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "Rollback successful! Previous version $PREV_TAG is running." -ForegroundColor Green
    } else {
        Write-Host "Health check failed after rollback!" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "Rollback health check failed: $_" -ForegroundColor Red
    exit 1
}