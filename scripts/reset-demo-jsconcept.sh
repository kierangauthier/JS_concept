#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# reset-demo-jsconcept.sh
# Remet la base en état démo propre pour JS Concept.
# À lancer depuis la racine du projet : ./scripts/reset-demo-jsconcept.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

cd "$(dirname "$0")/.."

echo ""
echo "⚠️  Ce script va EFFACER toutes les données JS Concept et réinjecter"
echo "   les données démo (vrais clients, vrais chantiers, 2 factures en retard)."
echo ""
read -p "Confirmer ? (oui/non) : " CONFIRM
if [ "$CONFIRM" != "oui" ]; then
  echo "Annulé."
  exit 0
fi

echo ""
echo "1/3 → Chargement des variables d'environnement..."
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "     .env chargé"
else
  echo "     ⚠️  Pas de .env trouvé — utilisation des variables système"
fi

echo ""
echo "2/3 → Lancement du seed JS Concept..."
cd api
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-demo-jsconcept.ts

echo ""
echo "3/3 → Vérification rapide..."
npx ts-node --compiler-options '{"module":"CommonJS"}' -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const invoices = await prisma.invoice.findMany({
    where: { companyId: 'co_js', status: 'overdue' },
    select: { reference: true, amount: true, dueDate: true }
  });
  console.log('');
  console.log('Factures EN RETARD (déclencheront l\\'alerte IA) :');
  invoices.forEach(i => {
    console.log('  ' + i.reference + ' — ' + i.amount + '€ — échue le ' + i.dueDate.toLocaleDateString('fr-FR'));
  });
  const clients = await prisma.client.count({ where: { companyId: 'co_js' } });
  const jobs    = await prisma.job.count({ where: { companyId: 'co_js' } });
  const quotes  = await prisma.quote.count({ where: { companyId: 'co_js' } });
  console.log('');
  console.log('Clients : ' + clients + ' | Chantiers : ' + jobs + ' | Devis : ' + quotes);
  await prisma.\$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
"

echo ""
echo "✅ Base prête pour la démo JS Concept."
echo ""
echo "   Connexion admin : e.sauron@js-concept.fr / Demo1234!"
echo "   Connexion admin : b.faure@js-concept.fr  / Demo1234!"
echo ""
