# run_dev.ps1
# Script khoi chay nhanh du an TravelEasy tren Windows

Write-Host "Starting Backend FastAPI..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass", "-NoExit", "-Command", "cd '$PSScriptRoot'; if (Test-Path '.\venv\Scripts\Activate.ps1') { & '.\venv\Scripts\Activate.ps1' }; cd backend; python -m uvicorn app.api.main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "Starting Svelte Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass", "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev -- --host"

Write-Host "Server startup commands sent!" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5500" -ForegroundColor Yellow
