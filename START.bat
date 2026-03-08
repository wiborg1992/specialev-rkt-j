@echo off
title Meeting AI - Grundfos
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Meeting AI - Grundfos / Claude AI
echo  ==========================================
echo.

:: ── Opret genvej paa Skrivebordet (kun hvis den mangler) ───────────────────
powershell -NoProfile -Command "$desktop=[Environment]::GetFolderPath('Desktop');$lnk=Join-Path $desktop 'Meeting AI Grundfos.lnk';if(-not(Test-Path $lnk)){$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut($lnk);$s.TargetPath='%~f0';$s.WorkingDirectory='%~dp0';$s.IconLocation='shell32.dll,14';$s.Description='Start Meeting AI for Grundfos';$s.Save();Write-Host '  [OK] Genvej oprettet paa Skrivebordet'}else{Write-Host '  [OK] Genvej findes allerede'}"

echo.

:: ── Tjek .env ──────────────────────────────────────────────────────────────
if not exist ".env" (
    echo  [!] Ingen .env fil fundet - opretter en...
    echo.
    set /p "AKEY=  Indtast ANTHROPIC_API_KEY (Enter for at springe over): "
    (
        echo ANTHROPIC_API_KEY=%AKEY%
        echo ASSEMBLYAI_API_KEY=0ab51a7a235942369faa3ac775cda746
        echo PORT=3000
    ) > .env
    echo  [OK] .env oprettet.
    echo.
)

:: ── Tjek Node.js ───────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [FEJL] Node.js ikke installeret.
    echo.
    echo  Download fra: https://nodejs.org  (vaelg LTS)
    echo  Dobbeltklik paa START.bat igen bagefter.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% fundet
echo  [OK] Starter server paa http://localhost:3000
echo.
echo  ------------------------------------------
echo   Aabner browser om 2 sekunder...
echo   Luk dette vindue for at stoppe serveren.
echo  ------------------------------------------
echo.

:: ── Aaben browser ──────────────────────────────────────────────────────────
start "" /b cmd /c "timeout /t 2 >nul && (start chrome http://localhost:3000 2>nul || start msedge http://localhost:3000 2>nul || start http://localhost:3000)"

:: ── Start server ───────────────────────────────────────────────────────────
node server.js

echo.
echo  Serveren er stoppet.
pause
