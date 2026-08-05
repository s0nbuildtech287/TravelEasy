# run_dev.ps1
# Script khởi chạy nhanh dự án TravelEasy trên Windows

# 1. Khởi chạy FastAPI Backend trong cửa sổ PowerShell mới
Write-Host "🚀 Đang khởi chạy FastAPI Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  Write-Host '=== FASTAPI BACKEND SERVER ===' -ForegroundColor Green
  cd '$PSScriptRoot'
  if (Test-Path '.\venv\Scripts\activate.ps1') {
      & '.\venv\Scripts\Activate.ps1'
      Write-Host 'Đã kích hoạt môi trường venv!' -ForegroundColor Yellow
  } else {
      Write-Host 'Môi trường venv không tồn tại. Đang chạy mặc định...' -ForegroundColor Red
  }
  cd backend
  python -m uvicorn app.api.main:app --reload --host 0.0.0.0 --port 8000
"

# 2. Khởi chạy Svelte Frontend trong cửa sổ PowerShell mới
Write-Host "🎨 Đang khởi chạy Svelte Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  Write-Host '=== SVELTE FRONTEND SERVER ===' -ForegroundColor Cyan
  cd '$PSScriptRoot\frontend'
  npm run dev -- --host
"

Write-Host "✅ Đã gửi lệnh khởi chạy! Hai cửa sổ PowerShell mới sẽ hiển thị nhật ký (logs)." -ForegroundColor Yellow
Write-Host "👉 Backend chạy tại: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "👉 Frontend chạy tại: http://localhost:5173 (hoặc 5500 tùy cấu hình)" -ForegroundColor Yellow
