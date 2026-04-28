@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM seed-12months-asp.bat
REM Injecte 12 mois d'historique réaliste pour la démo ASP SIGNALISATION.
REM ─────────────────────────────────────────────────────────────────────────────

echo.
echo ^!  Ce script va EFFACER toutes les données ASP Signalisation et injecter
echo    12 mois d'activité réaliste (Mai 2025 ^→ Avril 2026).
echo    ~130 chantiers · 5 équipes · signalisation ^& marquage Lyon/Rhône.
echo.
set /p CONFIRM="Confirmer ? (oui/non) : "
if /i not "%CONFIRM%"=="oui" (
  echo Annulé.
  exit /b 0
)

echo.
echo Copie du seed dans le container...
docker compose cp api/prisma/seed-12months-asp.ts api:/app/prisma/seed-12months-asp.ts

echo.
echo Lancement du seed 12 mois ASP...
docker compose exec api npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed-12months-asp.ts

if %ERRORLEVEL% neq 0 (
  echo.
  echo ERREUR : le seed a échoué.
  exit /b 1
)

echo.
echo ✓ Historique 12 mois ASP injecté. Ouvrez http://localhost:8090
echo   Connexion : admin@asp-signalisation.fr  /  Demo1234!
echo.
