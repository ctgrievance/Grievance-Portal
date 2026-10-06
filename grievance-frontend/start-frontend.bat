@echo off
cd /d "%~dp0"
npm start >> "%~dp0frontend.log" 2>&1
