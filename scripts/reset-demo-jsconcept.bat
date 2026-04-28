@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM reset-demo-jsconcept.bat
REM Remet la base en état démo propre pour JS Concept.
REM À lancer depuis la racine du projet : scripts\reset-demo-jsconcept.bat
REM ─────────────────────────────────────────────────────────────────────────────

echo.
echo ^^!  Ce script va EFFACER toutes les données JS Concept et réinjecter
echo    les données démo (vrais clients, vrais chantiers, 2 factures en retard).
echo.
set /p CONFIRM="Confirmer ? (oui/non) : "
if /i not "%CONFIRM%"=="oui" (
  echo Annulé.
  exit /b 0
)

echo.
echo 1/2 - Lancement du seed JS Concept dans le container...
docker compose exec api npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed-demo-jsconcept.ts

if %ERRORLEVEL% neq 0 (
  echo.
  echo ERREUR : le seed a échoué. Vérifiez que les containers sont démarrés.
  echo Lancez d'abord : docker compose up -d
  exit /b 1
)

echo.
echo 2/2 - Vérification rapide...
docker compose exec api npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function check() { const invoices = await prisma.invoice.findMany({ where: { companyId: 'co_js', status: 'overdue' }, select: { reference: true, amount: true, dueDate: true } }); console.log(''); console.log('Factures EN RETARD :'); invoices.forEach(i => { console.log('  ' + i.reference + ' - ' + i.amount + 'EUR - échue le ' + i.dueDate.toLocaleDateString('fr-FR')); }); const clients = await prisma.client.count({ where: { companyId: 'co_js' } }); const jobs = await prisma.job.count({ where: { companyId: 'co_js' } }); console.log(''); console.log('Clients : ' + clients + ' | Chantiers : ' + jobs); await prisma.$disconnect(); } check().catch(e => { console.error(e); process.exit(1); });"

echo.
echo ✓ Base prête pour la démo JS Concept.
echo.
echo   Connexion : e.sauron@js-concept.fr  /  Demo1234!
echo   Connexion : b.faure@js-concept.fr   /  Demo1234!
echo.
