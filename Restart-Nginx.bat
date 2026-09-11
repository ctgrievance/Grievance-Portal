@echo off
cd /d "C:\nginx\nginx-1.27.4"
echo ====================================================
echo   Restarting Nginx Reverse Proxy (rms.ctuniversity.in)
echo ====================================================
echo.
echo Stopping any running Nginx processes...
taskkill /f /im nginx.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting Nginx...
start "" nginx.exe
timeout /t 1 /nobreak >nul

tasklist /fi "imagename eq nginx.exe" | find /i "nginx.exe" >nul
if errorlevel 1 (
    echo [ERROR] Failed to start Nginx. Check logs at C:\nginx\nginx-1.27.4\logs\error.log
) else (
    echo [SUCCESS] Nginx is running on ports 80 and 443!
    echo Grievance Portal is live at: https://rms.ctuniversity.in
)
echo.
pause
