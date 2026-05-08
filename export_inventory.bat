@echo off
:: ============================================================
:: OPTIVISION - Export Inventory Data
:: Run this on the SOURCE machine to save inventory.
:: The exported file (data\inventory.sql) will be auto-imported
:: on the client machine when they run setup_v2.bat.
:: ============================================================
if "%OPTIVISION_CHILD%"=="1" goto :MAIN
set OPTIVISION_CHILD=1
cmd /c "%~f0"
exit /b

:MAIN
setlocal enabledelayedexpansion
title OptiVision - Export Inventory

set ROOT=%~dp0
if "!ROOT:~-1!"=="\" set ROOT=!ROOT:~0,-1!

echo.
echo  ==========================================
echo   OptiVision - Export Inventory Data
echo  ==========================================
echo.

:: ── Read postgres password ────────────────────────────────────
set PG_PASS=postgres
set /p PG_PASS="Enter PostgreSQL password (press Enter for default 'postgres'): "
echo.

:: ── Locate pg_dump ───────────────────────────────────────────
set PG_DUMP=pg_dump
where pg_dump >nul 2>&1
if !errorlevel! neq 0 (
    set PG_DUMP=
    for /d %%V in ("C:\Program Files\PostgreSQL\*") do (
        if exist "%%V\bin\pg_dump.exe" set PG_DUMP=%%V\bin\pg_dump.exe
    )
    if not defined PG_DUMP (
        echo   [ERROR] pg_dump not found.
        echo           Add PostgreSQL bin folder to PATH or install PostgreSQL.
        pause & exit /b 1
    )
    echo   [OK] Found pg_dump at: !PG_DUMP!
)

:: ── Ensure data folder exists ─────────────────────────────────
if not exist "!ROOT!\data" mkdir "!ROOT!\data"

:: ── Export ───────────────────────────────────────────────────
echo   Exporting inventory from database...
set PGPASSWORD=!PG_PASS!

"!PG_DUMP!" -U postgres -d optivision -t "\"InventoryItem\"" --data-only --inserts -f "!ROOT!\data\inventory.sql"

if !errorlevel! neq 0 (
    echo.
    echo   [ERROR] Export failed.
    echo           Make sure PostgreSQL is running and the database exists.
    set PGPASSWORD=
    pause & exit /b 1
)

set PGPASSWORD=

:: ── Count rows exported ───────────────────────────────────────
for /f %%c in ('findstr /c:"INSERT INTO" "!ROOT!\data\inventory.sql" 2^>nul') do set /a ROW_COUNT+=1
echo.
echo   [OK] Inventory exported to:  data\inventory.sql
echo.
echo   This file will be picked up automatically by setup_v2.bat
echo   when you run it on the client machine.
echo.
echo   Steps to transfer:
echo     1. Copy the entire project folder to the client machine
echo     2. Run setup_v2.bat on the client machine
echo     3. Inventory data will be imported automatically
echo.
pause
endlocal
