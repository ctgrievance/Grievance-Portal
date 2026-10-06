@echo off
cd /d "%~dp0"
node server.js >> "%~dp0backend.log" 2>&1
