# run_dev.ps1
# Script khoi chay 1-click cho du an TravelEasy (Frontend va Backend tren 1 cong 8000)

Write-Host "=== 1. BIEN DICH SVELTE FRONTEND ===" -ForegroundColor Cyan
cd "$PSScriptRoot\frontend"
npm run build

Write-Host "=== 2. KHOI CHAY FASTAPI BACKEND ===" -ForegroundColor Green
cd "$PSScriptRoot\backend"
..\venv\Scripts\python -m uvicorn app.api.main:app --reload --host 0.0.0.0 --port 8000
