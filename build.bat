@echo off
REM dsh-client build script — packages Windows portable .exe
setlocal

cd /d "%~dp0"

echo ===========================================================
echo  dsh-client — Windows portable build
echo ===========================================================
echo.

REM 1. Install dependencies (idempotent)
echo [1/3] Installing npm dependencies...
call npm install
if errorlevel 1 goto :err
echo.

REM 2. Build portable .exe (single-file, no install required)
echo [2/3] Building portable executable...
call npm run build:portable
if errorlevel 1 goto :err
echo.

REM 3. Report
echo ===========================================================
echo  Done!
echo  Output: %CD%\dist\dsh-client-portable-0.1.0.exe
echo ===========================================================
echo.
goto :eof

:err
echo.
echo BUILD FAILED — see npm output above.
exit /b 1
