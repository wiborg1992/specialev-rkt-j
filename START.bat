@echo off
chcp 65001 >nul
title Meeting AI · Grundfos
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║      Meeting AI · Grundfos               ║
echo  ║      Powered by Claude AI                ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Opret genvej på Skrivebordet (automatisk, kører kun hvis den mangler) ──
powershell -NoProfile -Command ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$lnk = Join-Path $desktop 'Meeting AI Grundfos.lnk';" ^
  "if (-not (Test-Path $lnk)) {" ^
  "  $ws = New-Object -ComObject WScript.Shell;" ^
  "  $s = $ws.CreateShortcut($lnk);" ^
  "  $s.TargetPath = '%~f0';" ^
  "  $s.WorkingDirectory = '%~dp0';" ^
  "  $s.IconLocation = 'shell32.dll,14';" ^
  "  $s.Description = 'Start Meeting AI Visualizer for Grundfos';" ^
  "  $s.Save();" ^
  "  Write-Host '  [OK] Genvej oprettet: Meeting AI Grundfos.lnk'" ^
  "} else {" ^
  "  Write-Host '  [OK] Genvej findes allerede paa Skrivebordet'" ^
  "}"

echo.

:: ── Tjek om .env eksisterer, opret hvis mangler ────────────────────────────
if not exist ".env" (
    echo  [!] Ingen .env fil fundet.
    echo      Opretter .env med standardindstillinger...
    echo.
    set /p "AKEY=  Indtast din ANTHROPIC_API_KEY (eller tryk Enter for at springe over): "
    (
        echo ANTHROPIC_API_KEY=%AKEY%
        echo ASSEMBLYAI_API_KEY=0ab51a7a235942369faa3ac775cda746
        echo PORT=3000
    ) > .env
    echo  [OK] .env oprettet.
    echo.
)

:: ── Tjek Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [FEJL] Node.js ikke fundet.
    echo.
    echo  Installer Node.js fra: https://nodejs.org  (vaelg LTS-versionen)
    echo  Dobbeltklik derefter paa START.bat igen.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% fundet

:: ── Sæt port og åbn browser ────────────────────────────────────────────────
set PORT=3000
echo  [OK] Starter server paa http://localhost:%PORT%
echo.
echo  ──────────────────────────────────────────
echo   Aabner Chrome/Edge om 2 sekunder...
echo   Luk dette vindue for at stoppe serveren.
echo  ──────────────────────────────────────────
echo.

:: Åbn browser efter 2 sek. — prøv Chrome, Edge, så standard
start "" /b cmd /c "timeout /t 2 >nul && (start chrome http://localhost:%PORT% 2>nul || start msedge http://localhost:%PORT% 2>nul || start http://localhost:%PORT%)"

:: ── Start server ────────────────────────────────────────────────────────────
node server.js

echo.
echo  [!] Serveren er stoppet.
pause
