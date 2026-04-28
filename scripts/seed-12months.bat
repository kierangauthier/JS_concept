@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM seed-12months.bat
REM Injecte 12 mois d'historique réaliste pour la démo JS CONCEPT.
REM ─────────────────────────────────────────────────────────────────────────────

echo.
echo ^^!  Ce script va EFFACER toutes les données JS Concept et injecter
echo    12 mois d'activité réaliste (Mai 2025 → Avril 2026).
echo    CA croissant, clients récurrents, 2 factures en retard.
echo.
set /p CONFIRM="Confirmer ? (oui/non) : "
if /i not "%CONFIRM%"=="oui" (
  echo Annulé.
  exit /b 0
)

echo.
echo Copie du seed dans le container...
docker compose cp api/prisma/seed-12months-jsconcept.ts api:/app/prisma/seed-12months-jsconcept.ts

echo.
echo Lancement du seed 12 mois...
docker compose exec api npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed-12months-jsconcept.ts

if %ERRORLEVEL% neq 0 (
  echo.
  echo ERREUR : le seed a échoué.
  exit /b 1
)

echo.
echo ✓ Historique 12 mois injecté. Ouvrez http://localhost:8090
echo.
