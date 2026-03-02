#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# ConceptManager — Reset complet environnement pilote
# Usage: bash e2e/reset-pilot.sh
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

echo "🔄 Reset ConceptManager pilot environment..."
echo ""

# 1. Reset DB + reseed
echo "📦 Reset database + seed..."
docker compose exec -T api sh -c "npx prisma migrate reset --force 2>&1"
echo "✅ DB reset + base seed done"

# 2. E2E seed
echo "🧪 Applying E2E seed..."
docker compose exec -T api npx ts-node prisma/seed-e2e.ts
echo "✅ E2E seed done"

# 3. Purge MinIO
echo "🗑️  Purging MinIO files..."
docker compose exec -T minio sh -c "
  mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null
  mc rm --recursive --force local/concept-files/ 2>/dev/null || true
  mc mb local/concept-files 2>/dev/null || true
" 2>/dev/null
echo "✅ MinIO purged"

# 4. Health check
echo ""
echo "🏥 Health check..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$STATUS" = "200" ]; then
  echo "✅ API healthy"
else
  echo "❌ API unhealthy (HTTP $STATUS)"
  exit 1
fi

echo ""
echo "🎉 Environment ready for pilot"
echo "   Frontend: http://localhost:8080"
echo "   API:      http://localhost:3000/api"
echo "   Login:    admin@asp.fr / Demo1234!"
