$ErrorActionPreference = "Stop"

Write-Host "Building new Docker image..." -ForegroundColor Green

# Генерируем тег из даты и времени
$TAG = Get-Date -Format "yyyyMMdd-HHmmss"
Write-Host "Tag: $TAG" -ForegroundColor Cyan

# Собираем образ
docker build -t quiz-backend:$TAG .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Docker build successful" -ForegroundColor Green

Write-Host "Starting containers..." -ForegroundColor Green

# Останавливаем старые контейнеры
docker compose down

# Запускаем с новым образом
$env:BACKEND_IMAGE = "quiz-backend:$TAG"
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker compose up failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Running health check..." -ForegroundColor Green

# Проверка health endpoint
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "Health check passed!" -ForegroundColor Green
    } else {
        Write-Host "Health check failed with status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host "Rolling back..." -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
    Write-Host "Rolling back..." -ForegroundColor Yellow
    exit 1
}

Write-Host "Saving current tag for rollback..." -ForegroundColor Green
$TAG | Out-File -FilePath .last-release-tag -Encoding utf8

Write-Host "Release $TAG successful!" -ForegroundColor Green
Write-Host ""
Write-Host "API available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Health endpoint: http://localhost:3000/health" -ForegroundColor Cyan