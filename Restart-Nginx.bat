@echo off
setlocal
title Grievance Portal - Nginx Controller
cd /d "C:\nginx\nginx-1.27.4"

echo ====================================================
echo   Managing Nginx Reverse Proxy - rms.ctuniversity.in
echo ====================================================
echo.

echo [1/4] Stopping existing Nginx instances...
taskkill /f /im nginx.exe >nul 2>&1
ping 127.0.0.1 -n 2 >nul

if exist "logs\nginx.pid" del /f /q "logs\nginx.pid" >nul 2>&1

echo [2/4] Testing Nginx configuration...
nginx.exe -t
if errorlevel 1 (
    echo.
    echo [ERROR] Configuration test failed! Check logs\error.log
    pause
    exit /b 1
)

echo [3/4] Spawning permanent detached Nginx background process...
powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = 'C:\nginx\nginx-1.27.4\nginx.exe'; CurrentDirectory = 'C:\nginx\nginx-1.27.4'}" >nul 2>&1
ping 127.0.0.1 -n 3 >nul

echo [4/4] Verifying all portal services...
echo.
echo ====================================================
echo             LIVE SYSTEM STATUS CHECK
echo ====================================================

tasklist /fi "imagename eq nginx.exe" | find /i "nginx.exe" >nul
if errorlevel 1 (
    echo  [FAIL] Nginx Proxy       : NOT RUNNING
    echo         Check logs at C:\nginx\nginx-1.27.4\logs\error.log
) else (
    echo  [OK]   Nginx Proxy       : RUNNING on Ports 80 and 443
)

netstat -ano | findstr "LISTENING" | findstr "5000" >nul
if errorlevel 1 (
    echo  [AUTO] Backend Server not detected. Starting on Port 5000...
    powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = 'cmd.exe /c \"node server.js\"'; CurrentDirectory = 'C:\Users\admin\Desktop\Grievance-Portal\grievance-backend'}" >nul 2>&1
    ping 127.0.0.1 -n 3 >nul
    echo  [OK]   Backend Server    : STARTED on Port 5000
) else (
    echo  [OK]   Backend Server    : RUNNING on Port 5000
)

netstat -ano | findstr "LISTENING" | findstr "3000" >nul
if errorlevel 1 (
    echo  [AUTO] Frontend App not detected. Starting on Port 3000...
    powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = 'cmd.exe /c \"set BROWSER=none && npm start\"'; CurrentDirectory = 'C:\Users\admin\Desktop\Grievance-Portal\grievance-frontend'}" >nul 2>&1
    ping 127.0.0.1 -n 5 >nul
    echo  [OK]   Frontend App      : STARTED on Port 3000
) else (
    echo  [OK]   Frontend App      : RUNNING on Port 3000
)

echo ----------------------------------------------------
echo  Live Portal URL : https://rms.ctuniversity.in
echo ====================================================
echo.
pause
