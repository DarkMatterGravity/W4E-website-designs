@echo off
cd /d "%~dp0"
if not exist node_modules (
  call npm ci
  if errorlevel 1 exit /b 1
)
echo Website: http://127.0.0.1:4173
echo Content manager: http://127.0.0.1:4173/admin/
echo Keep this window open while reviewing or editing.
call npm run dev
pause
