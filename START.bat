@echo off
title Meeting AI Visualizer
cd /d "%~dp0"

:: ── Lav en genvej på Skrivebordet (kører kun første gang) ──────────────────
:: Finder det rigtige Skrivebord automatisk (OneDrive eller lokal)
powershell -NoProfile -Command ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); $lnk = Join-Path $desktop 'Meeting AI Visualizer.lnk'; if (-not (Test-Path $lnk)) { $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($lnk); $s.TargetPath = '%~f0'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,22'; $s.Description = 'Start Meeting AI Visualizer'; $s.Save(); Write-Host ' [OK] Genvej oprettet paa Skrivebordet!' }"

echo.
echo  ==========================================
echo   Meeting AI Visualizer - Starter...
echo  ==========================================
echo.

:: ── Prøv Node.js ───────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Node.js fundet - starter server.js ...
    echo  Chrome aabner om et ojeblik pa http://localhost:3000
    echo.
    start "" /b cmd /c "timeout /t 2 >nul && start chrome http://localhost:3000"
    node server.js
    goto :end
)

:: ── Prøv Python ────────────────────────────────────────────────────────────
where python >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python fundet - starter server.py ...
    echo  Chrome aabner automatisk om et ojeblik...
    echo.
    python server.py
    goto :end
)

:: ── Prøv Python3 ───────────────────────────────────────────────────────────
where python3 >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python3 fundet - starter server.py ...
    echo.
    python3 server.py
    goto :end
)

:: ── Ingen runtime fundet ───────────────────────────────────────────────────
echo  [FEJL] Hverken Node.js eller Python er installeret pa denne computer.
echo.
echo  Installer en af disse og dobbeltklik paa START.bat igen:
echo.
echo    Node.js  ^>  https://nodejs.org        (vaelg "LTS"-versionen)
echo    Python   ^>  https://python.org/downloads
echo.
pause
goto :end

:end
pause
