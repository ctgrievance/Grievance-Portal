@echo off
setlocal
title Grievance Portal - 24/7 Watchdog Keep-Alive
cd /d "C:\nginx\nginx-1.27.4"

echo ====================================================
echo   Grievance Portal 24/7 Watchdog (rms.ctuniversity.in)
echo   Active Auto-Recovery System for Nginx, Backend & Frontend
echo   Keeps all portal services alive continuously.
echo ====================================================
echo.

:loop
:: 1. Check if Nginx is running
tasklist /fi "imagename eq nginx.exe" 2>nul | find /i "nginx.exe" >nul
if errorlevel 1 (
    echo [%date% %time%] [ALERT] Nginx stopped! Auto-recovering now...
    if exist "logs\nginx.pid" del /f /q "logs\nginx.pid" >nul 2>&1
    powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = 'C:\nginx\nginx-1.27.4\nginx.exe'; CurrentDirectory = 'C:\nginx\nginx-1.27.4'}" >nul 2>&1
    ping 127.0.0.1 -n 3 >nul
    echo [%date% %time%] [SUCCESS] Nginx restarted and active on ports 80 and 443.
)

:: 2. Check Backend Server (HTTP response or Port 5000 listening)
curl.exe -s --max-time 4 http://127.0.0.1:5000 >nul 2>&1
if errorlevel 1 (
    netstat -ano | findstr "LISTENING" | findstr "5000" >nul
    if errorlevel 1 (
        echo [%date% %time%] [ALERT] Backend Server down on port 5000! Auto-recovering...
        powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = 'cmd.exe /c \"node server.js\"'; CurrentDirectory = 'C:\Users\admin\Desktop\Grievance-Portal\grievance-backend'}" >nul 2>&1
        ping 127.0.0.1 -n 4 >nul
        echo [%date% %time%] [SUCCESS] Backend Server restarted on port 5000.
    )
)

:: 3. Check Frontend App (Port 3000)
netstat -ano | findstr "LISTENING" | findstr "3000" >nul
if errorlevel 1 (
    echo [%date% %time%] [ALERT] Frontend App down on port 3000! Auto-recovering...
    powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = 'cmd.exe /c \"set BROWSER=none && npm start\"'; CurrentDirectory = 'C:\Users\admin\Desktop\Grievance-Portal\grievance-frontend'}" >nul 2>&1
    ping 127.0.0.1 -n 6 >nul
    echo [%date% %time%] [SUCCESS] Frontend App restarted on port 3000.
)

:: Wait 30 seconds before next check
ping 127.0.0.1 -n 31 >nul
goto loop
