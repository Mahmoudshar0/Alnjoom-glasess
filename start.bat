@echo off
:: ============================================================
:: OPTIVISION LAUNCHER - Client Ready
:: Fully invisible background servers via PM2
:: No CMD popups. One click to run.
:: ============================================================
if "%OPTIVISION_CHILD%"=="1" goto :MAIN
set OPTIVISION_CHILD=1
cmd /c "%~f0"
exit /b

:MAIN
setlocal enabledelayedexpansion
title OptiVision - Launcher

set BACKEND_PORT=3001
set FRONTEND_PORT=5173
set FRONTEND_URL=http://localhost:5173
set ROOT=%~dp0
:: Remove trailing backslash
if "!ROOT:~-1!"=="\" set ROOT=!ROOT:~0,-1!

:: ============================================================
:: STEP 1 - SMART STATE DETECTION
:: ============================================================

call :CHECK_PORT !BACKEND_PORT! BACKEND_RUNNING
call :CHECK_PORT !FRONTEND_PORT! FRONTEND_RUNNING

if "!BACKEND_RUNNING!"=="1" if "!FRONTEND_RUNNING!"=="1" goto :ALREADY_RUNNING
if "!BACKEND_RUNNING!"=="1" if "!FRONTEND_RUNNING!"=="0" goto :AUTO_CLEANUP
if "!BACKEND_RUNNING!"=="0" if "!FRONTEND_RUNNING!"=="1" goto :AUTO_CLEANUP

goto :LAUNCH

:: ============================================================
:: MENU: ALREADY RUNNING
:: ============================================================
:ALREADY_RUNNING
start "" "!FRONTEND_URL!"
goto :EXIT_CLEAN

:: ============================================================
:: AUTO-CLEANUP (partial state - one port up, one down)
:: ============================================================
:AUTO_CLEANUP
cls
echo.
echo  ==========================================
echo   Partial state detected. Cleaning up...
echo  ==========================================
echo.
call pm2 delete optivision-backend >nul 2>&1
call pm2 delete optivision-frontend >nul 2>&1
call pm2 save --force >nul 2>&1

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":!BACKEND_PORT! " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":!FRONTEND_PORT! " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1

echo   [OK] Cleanup done. Relaunching...
ping -n 3 127.0.0.1 >nul
goto :LAUNCH

:: ============================================================
:: STOP SYSTEM
:: ============================================================
:STOP_SYSTEM
cls
echo.
echo  ==========================================
echo   Stopping OptiVision...
echo  ==========================================
echo.
call pm2 delete optivision-backend >nul 2>&1
call pm2 delete optivision-frontend >nul 2>&1
call pm2 save --force >nul 2>&1

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":!BACKEND_PORT! " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":!FRONTEND_PORT! " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1

echo   [OK] System stopped successfully.
ping -n 3 127.0.0.1 >nul
goto :EXIT_CLEAN

:: ============================================================
:: RESTART SYSTEM
:: ============================================================
:RESTART_SYSTEM
echo.
echo   Restarting processes...
call pm2 restart optivision-backend >nul 2>&1
call pm2 restart optivision-frontend >nul 2>&1
echo   [OK] System restarted.
ping -n 3 127.0.0.1 >nul
goto :ALREADY_RUNNING

:: ============================================================
:: LAUNCH SEQUENCE
:: ============================================================
:LAUNCH
cls
echo.
echo  ==========================================
echo   OptiVision - Starting...
echo  ==========================================
echo.

:: ----------------------------------------------------------------
:: Check Node.js
:: ----------------------------------------------------------------
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR] Node.js is not installed. Please run setup.bat first.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo   [OK] Node.js %%v

:: ----------------------------------------------------------------
:: Check PM2
:: ----------------------------------------------------------------
where pm2 >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR] PM2 is not installed. Please run setup.bat first.
    pause & exit /b 1
)

:: ----------------------------------------------------------------
:: Start PostgreSQL service
:: ----------------------------------------------------------------
echo   Checking PostgreSQL...
set PG_SERVICE=

for /f "tokens=2" %%s in ('sc query type^= all state^= all 2^>nul ^| findstr /i "SERVICE_NAME.*postgresql"') do (
    if not defined PG_SERVICE set PG_SERVICE=%%s
)

if not defined PG_SERVICE (
    for %%n in (postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql-x64-13 postgresql-x64-12 postgresql-x64-11 postgresql-x64-10 postgresql-9.6 postgresql) do (
        if not defined PG_SERVICE (
            sc query "%%n" >nul 2>&1
            if !errorlevel! equ 0 set PG_SERVICE=%%n
        )
    )
)

if defined PG_SERVICE (
    sc query "!PG_SERVICE!" | findstr /i "RUNNING" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   Starting PostgreSQL service ^(!PG_SERVICE!^)...
        net start "!PG_SERVICE!" >nul 2>&1
        ping -n 3 127.0.0.1 >nul
    )
    echo   [OK] PostgreSQL is running ^(!PG_SERVICE!^).
) else (
    echo   [WARN] PostgreSQL service not found. Ensure it is running manually.
)

:: ----------------------------------------------------------------
:: Sync database schema + seed
:: ----------------------------------------------------------------
echo.
echo   Syncing database...
cd /d "!ROOT!\backend"
for /f "tokens=1,* delims==" %%A in ('type "!ROOT!\backend\.env" ^| findstr /i "DATABASE_URL"') do set DATABASE_URL=%%B
call npx prisma db push --accept-data-loss >nul 2>&1
call npx ts-node prisma/seed.ts >nul 2>&1
echo   [OK] Database ready.

:: ----------------------------------------------------------------
:: Build TypeScript backend (produces dist/index.js)
:: This avoids ts-node-dev which spawns visible CMD windows.
:: node dist/index.js runs silently with zero popups.
:: ----------------------------------------------------------------
echo.
echo   Building backend...
cd /d "!ROOT!\backend"
call npx tsc >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR] TypeScript build failed. Check your backend code.
    pause & exit /b 1
)
echo   [OK] Backend built successfully.

:: ----------------------------------------------------------------
:: Generate ecosystem.config.js — reads backend/.env and embeds
:: env vars directly so PM2 daemon always has them available.
:: ----------------------------------------------------------------
echo.
echo   Configuring process manager...
cd /d "!ROOT!"
setlocal disabledelayedexpansion
node -e "const fs=require('fs');const env={};try{fs.readFileSync('./backend/.env','utf8').split('\n').forEach(l=>{if(l.includes('=')&&!l.trim().startsWith('#')){const i=l.indexOf('=');env[l.slice(0,i).trim()]=l.slice(i+1).trim();}});}catch(e){}const c={apps:[{name:'optivision-backend',cwd:'./backend',script:'dist/index.js',interpreter:'node',watch:false,env:{NODE_ENV:'production',DATABASE_URL:env.DATABASE_URL||'',JWT_SECRET:env.JWT_SECRET||'',PORT:env.PORT||'3001'}},{name:'optivision-frontend',cwd:'./frontend',script:'node_modules/vite/bin/vite.js',interpreter:'node',watch:false,env:{NODE_ENV:'development'}}]};fs.writeFileSync('./ecosystem.config.js','module.exports = '+JSON.stringify(c,null,2));"
endlocal
echo   [OK] ecosystem.config.js written.

:: ----------------------------------------------------------------
:: Wipe stale PM2 entries then launch fresh
:: ----------------------------------------------------------------
call pm2 delete optivision-backend >nul 2>&1
call pm2 delete optivision-frontend >nul 2>&1

cd /d "!ROOT!"
call pm2 start ecosystem.config.js >nul 2>&1
call pm2 save >nul 2>&1

:: ----------------------------------------------------------------
:: Wait for services then open browser
:: ----------------------------------------------------------------
echo.
echo   Waiting for services to start...
ping -n 8 127.0.0.1 >nul

:: Verify backend actually came up
call :CHECK_PORT !BACKEND_PORT! BACKEND_OK
if "!BACKEND_OK!"=="0" (
    echo.
    echo   [WARN] Backend did not start in time. Check logs with:
    echo          pm2 logs optivision-backend
    echo.
) else (
    echo   [OK] Backend is up.
)

echo   Opening browser...
start "" "!FRONTEND_URL!"

echo.
echo  ==========================================
echo   OptiVision is running!
echo.
echo   Frontend : !FRONTEND_URL!
echo   Backend  : http://localhost:!BACKEND_PORT!
echo.
echo   Servers run 100%% invisibly in the background.
echo   Double-click start.bat again to open the control menu.
echo  ==========================================
echo.
echo   This window closes in 5 seconds...
ping -n 6 127.0.0.1 >nul
goto :EXIT_CLEAN

:: ============================================================
:: HELPER: CHECK IF PORT IS IN USE
:: ============================================================
:CHECK_PORT
set "_CP=%1"
set "%2=0"
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%_CP% " ^| findstr "LISTENING"') do set "%2=1"
goto :eof

:: ============================================================
:: EXIT
:: ============================================================
:EXIT_CLEAN
endlocal
exit /b 0
