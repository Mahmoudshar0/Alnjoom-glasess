@echo off
:: ============================================================
:: OPTIVISION UPDATE SCRIPT
:: Stops the system, backs up the database, then pulls latest code.
:: ============================================================
if "%OPTIVISION_CHILD%"=="1" goto :MAIN
set OPTIVISION_CHILD=1
cmd /c "%~f0"
exit /b

:MAIN
setlocal enabledelayedexpansion
title OptiVision - Update

set ROOT=%~dp0
if "!ROOT:~-1!"=="\" set ROOT=!ROOT:~0,-1!

cls
echo.
echo  ==========================================
echo   OptiVision - Update
echo  ==========================================
echo.
echo   This will:
echo     [1] Stop the running system
echo     [2] Create a database backup
echo     [3] Pull the latest code from Git
echo.
set /p CONFIRM="  Continue? (Y/N): "
if /i not "!CONFIRM!"=="Y" goto :EXIT_CLEAN

:: ============================================================
:: STEP 1 - STOP THE SYSTEM
:: ============================================================
echo.
echo ============================================================
echo   [1/3] Stopping OptiVision...
echo ============================================================
echo.

call pm2 delete optivision-backend  >nul 2>&1
call pm2 delete optivision-frontend >nul 2>&1
call pm2 save --force               >nul 2>&1

for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1

echo   [OK]  System stopped.

:: ============================================================
:: STEP 2 - DATABASE BACKUP
:: Uses Node.js (written via PowerShell) to parse DATABASE_URL
:: and call pg_dump with individual flags — same as the backend.
:: ============================================================
echo.
echo ============================================================
echo   [2/3] Creating database backup...
echo ============================================================
echo.

cd /d "!ROOT!"

:: Disable delayed expansion so ! in the JS code is not consumed by CMD
setlocal disabledelayedexpansion
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Content -Path '%TEMP%\ovbackup.js' -Encoding UTF8 -Value 'var fs=require(''fs''),path=require(''path''),cp=require(''child_process'');var env={};try{fs.readFileSync(''./backend/.env'',''utf8'').split(''\n'').forEach(function(l){if(l.includes(''='')){var i=l.indexOf(''='');env[l.slice(0,i).trim()]=l.slice(i+1).trim();}});}catch(e){process.exit(1);}var dbUrl=env[''DATABASE_URL''];if(!dbUrl){process.exit(1);}var u=new URL(dbUrl);var host=u.hostname,port=u.port||''5432'',user=decodeURIComponent(u.username),pass=decodeURIComponent(u.password),db=u.pathname.slice(1);var pgDump=''pg_dump'';var pgBase=''C:\\Program Files\\PostgreSQL'';try{var vs=fs.readdirSync(pgBase).sort(function(a,b){return parseFloat(b)-parseFloat(a);});vs.some(function(v){var c=path.join(pgBase,v,''bin'',''pg_dump.exe'');if(fs.existsSync(c)){pgDump=c;return true;}});}catch(e){}var dir=path.join(''.'',''backend'',''backups'');if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});var ts=new Date().toISOString().replace(/[:.]/g,''-'').slice(0,19);var fn=''optivision-backup-''+ts+''.sql'';var fp=path.join(dir,fn);try{cp.execFileSync(pgDump,[''-h'',host,''-p'',port,''-U'',user,''-F'',''p'',''-f'',fp,db],{env:Object.assign({},process.env,{PGPASSWORD:pass})});}catch(e){process.exit(1);}console.log(fn);'"
endlocal

if not exist "%TEMP%\ovbackup.js" (
    echo   [WARN]  Could not prepare backup script. Skipping backup.
    goto :GIT_PULL
)

set BACKUP_NAME=
for /f "tokens=*" %%F in ('node "%TEMP%\ovbackup.js" 2^>nul') do set BACKUP_NAME=%%F
del "%TEMP%\ovbackup.js" >nul 2>&1

if defined BACKUP_NAME (
    echo   [OK]  Backup saved: backups\!BACKUP_NAME!
) else (
    echo   [WARN]  Backup failed. Continuing with update anyway.
)

:: ============================================================
:: STEP 3 - GIT PULL
:: ============================================================
:GIT_PULL
echo.
echo ============================================================
echo   [3/3] Pulling latest code from Git...
echo ============================================================
echo.

where git >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR] Git is not installed or not in PATH.
    echo           Run setup_v2.bat first, then try again.
    pause
    exit /b 1
)

cd /d "!ROOT!"
git pull
if !errorlevel! neq 0 (
    echo.
    echo   [ERROR] git pull failed.
    echo           Check your internet connection and repository access.
    pause
    exit /b 1
)

echo.
echo   [OK]  Code updated successfully.

:: ============================================================
:: DONE
:: ============================================================
echo.
echo ============================================================
echo   Update complete!
echo.
echo   Next step:
echo     - Run start.bat to restart OptiVision.
echo.
echo   If packages or the database schema changed:
echo     - Run setup_v2.bat instead for a full rebuild.
echo ============================================================
echo.

:EXIT_CLEAN
pause
endlocal
