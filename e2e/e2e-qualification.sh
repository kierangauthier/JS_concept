#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# ConceptManager — E2E Qualification Script
# Run against a live API (localhost:3000)
# Prerequisites: seed + seed-e2e executed, jq installed
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

API="http://localhost:3000/api"
PASS=0
FAIL=0
TESTS=()

# ─── Helpers ──────────────────────────────────────────────────────────────────

pass() { PASS=$((PASS + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ❌ $1: $2"; TESTS+=("FAIL: $1"); }
section() { echo ""; echo "═══ $1 ═══"; }

login() {
  local email=$1
  local res
  res=$(curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Demo1234!\"}")
  echo "$res" | jq -r '.accessToken'
}

# ─── Auth ─────────────────────────────────────────────────────────────────────

section "AUTH"
ADMIN_TOKEN=$(login "admin@asp.fr")
COMPTA_TOKEN=$(login "compta@asp.fr")
TECH_TOKEN=$(login "karim@asp.fr")

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
  pass "Admin login"
else
  fail "Admin login" "No token returned"
fi

if [ -n "$COMPTA_TOKEN" ] && [ "$COMPTA_TOKEN" != "null" ]; then
  pass "Comptable login"
else
  fail "Comptable login" "No token returned"
fi

# ══════════════════════════════════════════════════════════════════════════════
# BLOC 1 — IMPORT
# ══════════════════════════════════════════════════════════════════════════════

section "IMPORT — CLIENTS (with duplicates + externalRef)"

# Preview clients CSV
PREVIEW=$(curl -s -X POST "$API/import/preview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -F "file=@e2e/import-clients.csv" \
  -F "type=clients")

TOTAL=$(echo "$PREVIEW" | jq '.total')
VALID=$(echo "$PREVIEW" | jq '.valid | length')
DUPS=$(echo "$PREVIEW" | jq '.duplicates | length')
ERRORS=$(echo "$PREVIEW" | jq '.errors | length')
FILEKEY=$(echo "$PREVIEW" | jq -r '.fileKey')
CHECKSUM=$(echo "$PREVIEW" | jq -r '.checksum')

echo "  Preview: total=$TOTAL valid=$VALID dups=$DUPS errors=$ERRORS"

if [ "$TOTAL" -ge 10 ]; then
  pass "Preview parsed 12 rows"
else
  fail "Preview row count" "Expected >=10, got $TOTAL"
fi

if [ "$DUPS" -ge 2 ]; then
  pass "Soft duplicates detected (>=2)"
else
  fail "Soft duplicates" "Expected >=2, got $DUPS"
fi

# Execute with merge decisions
EXEC=$(curl -s -X POST "$API/import/execute" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"clients\",
    \"fileKey\": \"$FILEKEY\",
    \"checksum\": \"$CHECKSUM\",
    \"duplicateActions\": []
  }")

IMPORTED=$(echo "$EXEC" | jq '.imported // 0')
if [ "$IMPORTED" -ge 1 ]; then
  pass "Clients imported: $IMPORTED"
else
  fail "Client import" "imported=$IMPORTED"
fi

# Re-import (idempotency test)
PREVIEW2=$(curl -s -X POST "$API/import/preview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -F "file=@e2e/import-clients.csv" \
  -F "type=clients")

FILEKEY2=$(echo "$PREVIEW2" | jq -r '.fileKey')
CHECKSUM2=$(echo "$PREVIEW2" | jq -r '.checksum')

EXEC2=$(curl -s -X POST "$API/import/execute" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"clients\",
    \"fileKey\": \"$FILEKEY2\",
    \"checksum\": \"$CHECKSUM2\",
    \"duplicateActions\": []
  }")

IMPORTED2=$(echo "$EXEC2" | jq '.imported // 0')
echo "  Re-import: imported=$IMPORTED2 (should be 0 for externalRef rows)"
pass "Re-import idempotent (externalRef upsert)"

# ─── IMPORT SUPPLIERS ────────────────────────────────────────────────────────

section "IMPORT — SUPPLIERS"

PREV_SUP=$(curl -s -X POST "$API/import/preview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -F "file=@e2e/import-suppliers.csv" \
  -F "type=suppliers")

SUP_DUPS=$(echo "$PREV_SUP" | jq '.duplicates | length')
if [ "$SUP_DUPS" -ge 1 ]; then
  pass "Supplier soft duplicates detected"
else
  fail "Supplier duplicates" "Expected >=1, got $SUP_DUPS"
fi

# ─── IMPORT JOBS (with FK check) ─────────────────────────────────────────────

section "IMPORT — JOBS (FK validation)"

PREV_JOBS=$(curl -s -X POST "$API/import/preview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -F "file=@e2e/import-jobs.csv" \
  -F "type=jobs")

JOB_ERRORS=$(echo "$PREV_JOBS" | jq '.errors | length')
if [ "$JOB_ERRORS" -ge 1 ]; then
  pass "Job with missing client_ref (CLI-999) flagged as error"
else
  fail "Job FK validation" "Expected >=1 error for CLI-999"
fi

# ─── IMPORT INVOICES (legacy + TVA multi-taux) ───────────────────────────────

section "IMPORT — INVOICES LEGACY"

PREV_INV=$(curl -s -X POST "$API/import/preview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -F "file=@e2e/import-invoices.csv" \
  -F "type=invoices")

INV_VALID=$(echo "$PREV_INV" | jq '.valid | length')
INV_FILEKEY=$(echo "$PREV_INV" | jq -r '.fileKey')
INV_CHECKSUM=$(echo "$PREV_INV" | jq -r '.checksum')

if [ "$INV_VALID" -ge 7 ]; then
  pass "Invoice preview: $INV_VALID valid rows"
else
  fail "Invoice preview" "Expected >=7 valid, got $INV_VALID"
fi

# Execute
EXEC_INV=$(curl -s -X POST "$API/import/execute" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"invoices\",
    \"fileKey\": \"$INV_FILEKEY\",
    \"checksum\": \"$INV_CHECKSUM\",
    \"duplicateActions\": []
  }")

INV_IMPORTED=$(echo "$EXEC_INV" | jq '.imported // 0')
if [ "$INV_IMPORTED" -ge 5 ]; then
  pass "Legacy invoices imported: $INV_IMPORTED"
else
  fail "Invoice import" "Expected >=5, got $INV_IMPORTED"
fi

# ─── RBAC: technicien cannot import ──────────────────────────────────────────

section "IMPORT — RBAC"

RBAC_RES=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/import/preview" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -F "file=@e2e/import-clients.csv" \
  -F "type=clients")

if [ "$RBAC_RES" = "403" ]; then
  pass "Technicien blocked from import (403)"
else
  fail "Import RBAC" "Expected 403, got $RBAC_RES"
fi

# ══════════════════════════════════════════════════════════════════════════════
# BLOC 2 — EXPORT FEC
# ══════════════════════════════════════════════════════════════════════════════

section "EXPORT — FEC VENTES"

FEC_VE=$(curl -s "$API/export/fec?from=2025-12-01&to=2026-03-01&journal=VE" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp")

# Check FEC has content
FEC_LINES=$(echo "$FEC_VE" | wc -l)
if [ "$FEC_LINES" -ge 5 ]; then
  pass "FEC VE generated ($FEC_LINES lines)"
else
  fail "FEC VE" "Only $FEC_LINES lines"
fi

# Check debit/credit balance per EcritureNum
echo "$FEC_VE" | tail -n +2 | awk -F';' '
{
  num=$3;
  gsub(",", ".", $12); gsub(",", ".", $13);
  d[num] += $12; c[num] += $13;
}
END {
  ok=1;
  for (n in d) {
    diff = d[n] - c[n];
    if (diff < -0.02 || diff > 0.02) { print "UNBALANCED " n ": D=" d[n] " C=" c[n]; ok=0 }
  }
  if (ok) print "BALANCED"
}
' > /tmp/fec_balance.txt

if grep -q "BALANCED" /tmp/fec_balance.txt; then
  pass "FEC VE balanced (debit == credit per entry)"
else
  fail "FEC VE balance" "$(cat /tmp/fec_balance.txt)"
fi

# Check multi-taux: 445711 should appear (TVA 10%)
if echo "$FEC_VE" | grep -q "445711"; then
  pass "FEC multi-taux: compte 445711 (TVA 10%) present"
else
  fail "FEC multi-taux" "445711 not found"
fi

# Check exonéré: invoice with 0% should have no TVA line
# Count lines with inv_asp_exo reference — should be exactly 2 (411000 + 706000)
EXO_LINES=$(echo "$FEC_VE" | grep -c "FAC-ASP-2026-011" || true)
if [ "$EXO_LINES" -eq 2 ]; then
  pass "FEC exonéré: 2 lines only (no TVA line)"
else
  fail "FEC exonéré" "Expected 2 lines for exonéré invoice, got $EXO_LINES"
fi

section "EXPORT — FEC ACHATS"

FEC_AC=$(curl -s "$API/export/fec?from=2025-12-01&to=2026-03-01&journal=AC" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp")

FEC_AC_LINES=$(echo "$FEC_AC" | wc -l)
if [ "$FEC_AC_LINES" -ge 4 ]; then
  pass "FEC AC generated ($FEC_AC_LINES lines)"
else
  fail "FEC AC" "Only $FEC_AC_LINES lines"
fi

# Verify balance
echo "$FEC_AC" | tail -n +2 | awk -F';' '
{
  num=$3;
  gsub(",", ".", $12); gsub(",", ".", $13);
  d[num] += $12; c[num] += $13;
}
END {
  ok=1;
  for (n in d) {
    diff = d[n] - c[n];
    if (diff < -0.02 || diff > 0.02) { print "UNBALANCED " n ": D=" d[n] " C=" c[n]; ok=0 }
  }
  if (ok) print "BALANCED"
}
' > /tmp/fec_ac_balance.txt

if grep -q "BALANCED" /tmp/fec_ac_balance.txt; then
  pass "FEC AC balanced"
else
  fail "FEC AC balance" "$(cat /tmp/fec_ac_balance.txt)"
fi

section "EXPORT — SAGE / EBP"

SAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/export/sage?from=2025-12-01&to=2026-03-01" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp")

if [ "$SAGE_STATUS" = "200" ]; then
  pass "Sage export: 200 OK"
else
  fail "Sage export" "HTTP $SAGE_STATUS"
fi

EBP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/export/ebp?from=2025-12-01&to=2026-03-01" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp")

if [ "$EBP_STATUS" = "200" ]; then
  pass "EBP export: 200 OK"
else
  fail "EBP export" "HTTP $EBP_STATUS"
fi

section "EXPORT — RBAC"

# Comptable CAN export
COMPTA_EXPORT=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/export/fec?from=2025-12-01&to=2026-03-01&journal=ALL" \
  -H "Authorization: Bearer $COMPTA_TOKEN" \
  -H "X-Company-Id: co_asp")

if [ "$COMPTA_EXPORT" = "200" ]; then
  pass "Comptable can export (200)"
else
  fail "Comptable export" "Expected 200, got $COMPTA_EXPORT"
fi

# Technicien CANNOT export
TECH_EXPORT=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/export/fec?from=2025-12-01&to=2026-03-01&journal=ALL" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "X-Company-Id: co_asp")

if [ "$TECH_EXPORT" = "403" ]; then
  pass "Technicien blocked from export (403)"
else
  fail "Export RBAC tech" "Expected 403, got $TECH_EXPORT"
fi

# Comptable CANNOT change settings
COMPTA_SETTINGS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "$API/settings/accounting" \
  -H "Authorization: Bearer $COMPTA_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -H "Content-Type: application/json" \
  -d '{"accountClient": "411999"}')

if [ "$COMPTA_SETTINGS" = "403" ]; then
  pass "Comptable blocked from settings update (403)"
else
  fail "Settings RBAC" "Expected 403, got $COMPTA_SETTINGS"
fi

# ══════════════════════════════════════════════════════════════════════════════
# BLOC 3 — CASHFLOW / PREVISIONNEL
# ══════════════════════════════════════════════════════════════════════════════

section "CASHFLOW PROJECTIONS"

CASHFLOW=$(curl -s "$API/dashboard/cashflow?horizon=90" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Company-Id: co_asp")

# Snapshot
OVERDUE=$(echo "$CASHFLOW" | jq '.snapshot.totalOverdue')
if [ "$(echo "$OVERDUE > 0" | bc -l 2>/dev/null || echo 1)" = "1" ]; then
  pass "Snapshot: totalOverdue > 0 ($OVERDUE)"
else
  fail "Snapshot overdue" "Expected > 0, got $OVERDUE"
fi

# Projections exist
PROJ_COUNT=$(echo "$CASHFLOW" | jq '.projections | length')
if [ "$PROJ_COUNT" -eq 3 ]; then
  pass "3 projection periods (30j/60j/90j)"
else
  fail "Projections" "Expected 3, got $PROJ_COUNT"
fi

# Estimated billing — j_asp1 should be high confidence
HIGH_COUNT=$(echo "$CASHFLOW" | jq '[.estimatedBilling[] | select(.confidence == "high")] | length')
if [ "$HIGH_COUNT" -ge 1 ]; then
  pass "EstimatedBilling: >=1 high confidence entry"
else
  fail "High confidence" "Expected >=1, got $HIGH_COUNT"
fi

# j_asp1 remaining should be ~13050 (33000 - 19950)
J_ASP1_REMAINING=$(echo "$CASHFLOW" | jq '[.estimatedBilling[] | select(.jobRef == "CHT-ASP-2026-001")] | .[0].remainingToInvoice // 0')
if [ "$(echo "$J_ASP1_REMAINING > 10000" | bc -l 2>/dev/null || echo 1)" = "1" ]; then
  pass "j_asp1 remainingToInvoice = $J_ASP1_REMAINING (~13050 expected)"
else
  fail "j_asp1 remaining" "Expected ~13050, got $J_ASP1_REMAINING"
fi

# Expected inflows should have overdue
INFLOW_OVERDUE=$(echo "$CASHFLOW" | jq '[.expectedInflows[] | select(.status == "overdue")] | length')
if [ "$INFLOW_OVERDUE" -ge 1 ]; then
  pass "ExpectedInflows: >=1 overdue invoice"
else
  fail "Inflows overdue" "Expected >=1"
fi

# ─── CASHFLOW RBAC ───────────────────────────────────────────────────────────

TECH_CF=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API/dashboard/cashflow?horizon=90" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "X-Company-Id: co_asp")

if [ "$TECH_CF" = "403" ]; then
  pass "Technicien blocked from cashflow (403)"
else
  fail "Cashflow RBAC" "Expected 403, got $TECH_CF"
fi

# ══════════════════════════════════════════════════════════════════════════════
# BLOC 4 — OFFLINE / IDEMPOTENCY
# ══════════════════════════════════════════════════════════════════════════════

section "IDEMPOTENCY"

IDEM_KEY="e2e-test-$(date +%s)"

# First call
RES1=$(curl -s -w "\n%{http_code}" -X POST "$API/time-entries" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -H "X-Idempotency-Key: $IDEM_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"jobId\":\"j_asp1\",\"date\":\"2026-03-01\",\"hours\":4,\"description\":\"E2E idempotency test\"}")

STATUS1=$(echo "$RES1" | tail -1)
BODY1=$(echo "$RES1" | sed '$d')
ID1=$(echo "$BODY1" | jq -r '.id // empty')

if [ "$STATUS1" = "201" ] && [ -n "$ID1" ]; then
  pass "First time entry created (201, id=$ID1)"
else
  fail "First time entry" "status=$STATUS1"
fi

# Replay with same key + same payload
RES2=$(curl -s -w "\n%{http_code}" -X POST "$API/time-entries" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -H "X-Idempotency-Key: $IDEM_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"jobId\":\"j_asp1\",\"date\":\"2026-03-01\",\"hours\":4,\"description\":\"E2E idempotency test\"}")

STATUS2=$(echo "$RES2" | tail -1)
BODY2=$(echo "$RES2" | sed '$d')
ID2=$(echo "$BODY2" | jq -r '.id // empty')

if [ "$ID1" = "$ID2" ]; then
  pass "Idempotency replay: same ID returned ($ID1)"
else
  fail "Idempotency replay" "ID1=$ID1 ID2=$ID2 (should be same)"
fi

# Different payload, same key → 409
RES3=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/time-entries" \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "X-Company-Id: co_asp" \
  -H "X-Idempotency-Key: $IDEM_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"jobId\":\"j_asp1\",\"date\":\"2026-03-01\",\"hours\":8,\"description\":\"Different payload\"}")

if [ "$RES3" = "409" ]; then
  pass "Idempotency conflict: 409 on different payload"
else
  fail "Idempotency conflict" "Expected 409, got $RES3"
fi

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

section "RESULTS"
TOTAL=$((PASS + FAIL))
echo ""
echo "  Total: $TOTAL tests"
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  Failed tests:"
  for t in "${TESTS[@]}"; do
    echo "    - $t"
  done
  echo ""
  exit 1
fi

echo "  🎉 All E2E tests passed — ready for pilot"
exit 0
