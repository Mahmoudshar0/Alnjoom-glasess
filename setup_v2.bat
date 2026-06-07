@echo off
:: ============================================================
:: OPTIVISION AUTONOMOUS SETUP SCRIPT (Win 8 / 10 / 11)
:: ============================================================
if "%OPTIVISION_CHILD%"=="1" goto :MAIN
set OPTIVISION_CHILD=1
cmd /c "%~f0"
exit /b

:MAIN
setlocal enabledelayedexpansion
title OptiVision - Setup

echo.
echo   Removing download security restrictions...
powershell -Command "Get-ChildItem -Path '%~dp0' -Filter '*.bat' | Unblock-File" >nul 2>&1
echo   Done.
echo.

echo ============================================================
echo   OptiVision — Automated Setup ^& Environment Solver
echo   Compatible with Windows 8 / 8.1 / 10 / 11
echo ============================================================
echo.

echo [CHECKING] Verifying and solving required tools...
echo.
set ERRORS=0

:: ----------------------------------------------------------------
:: Internet connection (checked first — required for all installs)
:: ----------------------------------------------------------------
ping -n 1 -w 3000 8.8.8.8 >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR]   No internet connection detected.
    echo             Internet is required to install dependencies.
    set /a ERRORS+=1
) else (
    echo   [OK]      Internet connection OK.
)

:: ----------------------------------------------------------------
:: Node.js
:: ----------------------------------------------------------------
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo   [MISSING] Node.js is NOT installed.

    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [SOLVER]  Attempting to install Node.js automatically via winget...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        if !errorlevel! neq 0 (
            echo   [ERROR]   Auto-install failed. Please install manually.
            set /a ERRORS+=1
        ) else (
            echo   [OK]      Node.js installed. Refreshing PATH for this session...
            for %%D in (
                "C:\Program Files\nodejs"
                "C:\Program Files (x86)\nodejs"
                "%LOCALAPPDATA%\Programs\nodejs"
            ) do (
                if exist "%%~D\node.exe" (
                    set "PATH=%%~D;!PATH!"
                    echo   [OK]      Node.js detected at %%~D
                )
            )
        )
    ) else (
        echo   [SOLVER]  Windows 8 detected ^(no winget^). Opening download page...
        start https://nodejs.org
        echo             Please install the LTS version and run setup again.
        set /a ERRORS+=1
    )
) else (
    for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
    echo   [OK]      Node.js  !NODE_VER!
)

:: ----------------------------------------------------------------
:: Git
:: ----------------------------------------------------------------
where git >nul 2>&1
if !errorlevel! neq 0 (
    echo   [MISSING] Git is NOT installed.

    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [SOLVER]  Attempting to install Git automatically via winget...
        winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
        if !errorlevel! neq 0 (
            echo   [ERROR]   Auto-install failed. Please install manually.
            set /a ERRORS+=1
        ) else (
            echo   [OK]      Git installed. Refreshing PATH for this session...
            for %%D in (
                "C:\Program Files\Git\cmd"
                "C:\Program Files (x86)\Git\cmd"
                "%LOCALAPPDATA%\Programs\Git\cmd"
            ) do (
                if exist "%%~D\git.exe" (
                    set "PATH=%%~D;!PATH!"
                    echo   [OK]      Git detected at %%~D
                )
            )
        )
    ) else (
        echo   [SOLVER]  Windows 8 detected ^(no winget^). Opening download page...
        start https://git-scm.com/download/win
        echo             Please install Git and run setup again.
        set /a ERRORS+=1
    )
) else (
    for /f "tokens=*" %%v in ('git --version 2^>nul') do set GIT_VER=%%v
    echo   [OK]      !GIT_VER!
)

:: ----------------------------------------------------------------
:: PostgreSQL
:: ----------------------------------------------------------------
set PG_BIN_PATH=
where psql >nul 2>&1

if !errorlevel! neq 0 (
    echo   [WARN]    PostgreSQL not found in PATH. Searching hard drive...

    for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
        if exist "%%D\bin\psql.exe" set PG_BIN_PATH=%%D\bin
    )

    if defined PG_BIN_PATH (
        echo   [SOLVER]  Found PostgreSQL at: !PG_BIN_PATH!
        echo             Adding to system PATH automatically...

        set "PATH=!PG_BIN_PATH!;!PATH!"

        for /f "tokens=2*" %%A in ('reg query HKCU\Environment /v PATH 2^>nul') do set "USER_PATH=%%B"
        if not defined USER_PATH (
            setx PATH "!PG_BIN_PATH!" >nul
        ) else (
            echo !USER_PATH! | findstr /i /c:"!PG_BIN_PATH!" >nul
            if !errorlevel! neq 0 (
                setx PATH "!USER_PATH!;!PG_BIN_PATH!" >nul
            )
        )
        echo   [OK]      PATH resolved.
    ) else (
        echo   [MISSING] PostgreSQL is not installed.

        where winget >nul 2>&1
        if !errorlevel! equ 0 (
            echo   [SOLVER]  Attempting silent background installation via winget...
            echo             ^(This will install PostgreSQL 16. Port 5432. Password: 'postgres'^)
            winget install -e --id PostgreSQL.PostgreSQL.16 --silent --accept-package-agreements --accept-source-agreements --override "--mode unattended --superpassword postgres --serverport 5432"
            if !errorlevel! equ 0 (
                echo   [OK]      PostgreSQL installed automatically!
                for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
                    if exist "%%D\bin\psql.exe" (
                        set "PATH=%%D\bin;!PATH!"
                        setx PATH "%%D\bin;!PATH!" >nul 2>&1
                    )
                )
            ) else (
                echo   [ERROR]   Silent install failed.
                set /a ERRORS+=1
            )
        ) else (
            echo   [SOLVER]  Windows 8 detected ^(no winget^). Opening download page...
            start https://www.postgresql.org/download/windows/
            echo             Please install PostgreSQL, use 'postgres' as password, and run setup again.
            set /a ERRORS+=1
        )
    )
)

:: Final check for psql after potential pathing/install
where psql >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%v in ('psql --version 2^>nul') do set PG_VER=%%v
    echo   [OK]      !PG_VER!
)

:: ----------------------------------------------------------------
:: PM2
:: ----------------------------------------------------------------
where pm2 >nul 2>&1
if !errorlevel! neq 0 (
    echo   [MISSING] PM2 is NOT installed. Installing globally...
    call npm install -g pm2
    if !errorlevel! neq 0 (
        echo   [ERROR]   PM2 install failed. Check your internet connection.
        set /a ERRORS+=1
    ) else (
        echo   [OK]      PM2 installed. Refreshing PATH for this session...
        for /f "tokens=*" %%p in ('npm root -g 2^>nul') do (
            set "NPM_GLOBAL=%%p"
            set "NPM_GLOBAL=!NPM_GLOBAL:\node_modules=!"
        )
        if defined NPM_GLOBAL (
            set "PATH=!NPM_GLOBAL!;!PATH!"
            echo   [OK]      npm global bin added to session PATH.
        )
    )
) else (
    for /f "tokens=*" %%v in ('pm2 -v 2^>nul') do set PM2_VER=%%v
    echo   [OK]      PM2 v!PM2_VER!
)

:: ----------------------------------------------------------------
:: Halt if required tools are still missing
:: ----------------------------------------------------------------
if !ERRORS! neq 0 (
    echo.
    echo ============================================================
    echo   SETUP HALTED: Please fix the missing items above and retry.
    echo   ^(If browser tabs opened automatically, install those first^).
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo ============================================================

:: ============================================================
:: SECTION 2 - DATABASE PASSWORD & ENV GENERATION
:: ============================================================

echo [CONFIG] Setting up Environment Variables...
echo.

cd /d "%~dp0backend"

set PG_PASS=postgres
set /p USER_PASS="Enter your PostgreSQL password (press Enter to use default 'postgres'): "
if not "!USER_PASS!"=="" set PG_PASS=!USER_PASS!

echo   [SOLVER]  Generating backend\.env file...
echo DATABASE_URL=postgresql://postgres:!PG_PASS!@localhost:5432/optivision > .env
echo JWT_SECRET=optivision-secret-!RANDOM!-!RANDOM! >> .env
echo PORT=3001 >> .env

set DATABASE_URL=postgresql://postgres:!PG_PASS!@localhost:5432/optivision

echo   [OK]      .env file configured successfully.
echo.

:: ============================================================
:: SECTION 3 - DATABASE AUTO-CREATION
:: ============================================================

echo [CHECKING] Checking PostgreSQL Database...
echo.

set PGPASSWORD=!PG_PASS!

psql -U postgres -d postgres -c "SELECT 1;" >nul 2>&1
if !errorlevel! neq 0 (
    echo   [ERROR]   Cannot connect to PostgreSQL.
    echo             Is the service running? Is the password '!PG_PASS!' correct?
    set PGPASSWORD=
    pause
    exit /b 1
)

psql -U postgres -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'optivision';" | findstr "1" >nul
if !errorlevel! neq 0 (
    echo   [SOLVER]  Database 'optivision' does not exist. Creating it...
    psql -U postgres -d postgres -c "CREATE DATABASE optivision;" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK]      Database 'optivision' created successfully.
    ) else (
        echo   [ERROR]   Failed to create database.
        set PGPASSWORD=
        pause
        exit /b 1
    )
) else (
    echo   [OK]      Database 'optivision' already exists.
)

set PGPASSWORD=
echo.
echo ============================================================

:: ============================================================
:: SECTION 4 - INSTALL DEPENDENCIES
:: ============================================================

echo [1/5] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if !errorlevel! neq 0 (
    echo   [ERROR]   Backend npm install failed. Check your internet connection.
    pause & exit /b 1
)
echo   [OK]      Backend packages installed.
echo.

echo [2/5] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if !errorlevel! neq 0 (
    echo   [ERROR]   Frontend npm install failed. Check your internet connection.
    pause & exit /b 1
)
echo   [OK]      Frontend packages installed.
echo.

:: ============================================================
:: SECTION 5 - DATABASE SCHEMA SYNC
:: ============================================================

echo [3/5] Syncing database schema...
cd /d "%~dp0backend"
call npx prisma db push --accept-data-loss
if !errorlevel! neq 0 (
    echo   [ERROR]   Database schema sync failed.
    echo             Make sure PostgreSQL is running and the password is correct.
    pause & exit /b 1
)
echo   [OK]      Database schema is up to date.
echo.

echo [3.5/5] Generating Prisma client...
cd /d "%~dp0backend"
call npx prisma generate
if !errorlevel! neq 0 (
    echo   [ERROR]   Prisma client generation failed.
    pause & exit /b 1
)
echo   [OK]      Prisma client generated.
echo.

@REM echo [4/5] Seeding database (Admin account)...
@REM cd /d "%~dp0backend"
@REM call npx ts-node prisma/seed.ts
@REM if !errorlevel! neq 0 (
@REM     echo   [WARN]    Seeding skipped ^(admin account may already exist^). Continuing...
@REM ) else (
@REM     echo   [OK]      Database seeded.
@REM )
@REM echo.

:: ============================================================
:: SECTION 6 - BUILD BACKEND (TypeScript compile check)
:: ============================================================

echo [5/5] Building backend ^(TypeScript compile check^)...
cd /d "%~dp0backend"
call npx tsc
if !errorlevel! neq 0 (
    echo   [ERROR]   TypeScript build failed.
    echo             The backend has compile errors. Please check the output above.
    pause & exit /b 1
)
echo   [OK]      Backend compiled successfully.
echo.

:: ============================================================
:: AUTO-IMPORT INVENTORY (if backup file exists)
:: ============================================================

if exist "%~dp0data\inventory.sql" (
    echo [BONUS] Found inventory backup. Importing inventory data...
    set _PSQL=psql
    where psql >nul 2>&1
    if !errorlevel! neq 0 (
        for /d %%V in ("C:\Program Files\PostgreSQL\*") do (
            if exist "%%V\bin\psql.exe" set _PSQL=%%V\bin\psql.exe
        )
    )
    set PGPASSWORD=!PG_PASS!
    "!_PSQL!" -U postgres -d optivision -f "%~dp0data\inventory.sql" >nul 2>&1
    set PGPASSWORD=
    if !errorlevel! equ 0 (
        echo   [OK]      Inventory data imported successfully.
    ) else (
        echo   [WARN]    Inventory import had issues. You can re-import manually later.
    )
    echo.
)

:: ============================================================
:: DONE
:: ============================================================

echo ============================================================
echo.
echo   SETUP COMPLETE!
echo.
@REM echo   Login credentials:
@REM echo     Email:    admin@optivision.com
@REM echo     Password: admin123
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3001
echo   LAN      : http://YOUR-IP:5173
echo.
echo ============================================================
echo.

:: Ask if user wants to launch now
set /p LAUNCH="Launch OptiVision now? (Y/N): "
if /i "!LAUNCH!"=="Y" (
    echo.
    echo   Starting OptiVision...
    call "%~dp0start.bat"
) else (
    echo.
    echo   To start the app, double-click start.bat
    echo.
    pause
)

endlocal