@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM build-and-start.bat
REM Build le frontend Vite localement, puis lance Docker Compose.
REM ─────────────────────────────────────────────────────────────────────────────

echo.
echo [1/3] Installation des dependances npm...
call npm install --legacy-peer-deps
if %ERRORLEVEL% neq 0 (
  echo ERREUR : npm install a echoue.
  exit /b 1
)

echo.
echo [2/3] Build Vite production...
call npm run build
if %ERRORLEVEL% neq 0 (
  echo ERREUR : npm run build a echoue.
  exit /b 1
)

echo.
echo [3/3] Lancement Docker Compose...
docker compose up --build -d

echo.
echo ✓ Frontend buildé et Docker lancé.
echo   Ouvrez http://localhost:8090
echo.
