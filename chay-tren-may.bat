@echo off
chcp 65001 >nul
cd /d "%~dp0"
set /p TEACHER_PASS=Nhap mat khau giao vien (go khong dau): 
echo.
node server.js
pause
