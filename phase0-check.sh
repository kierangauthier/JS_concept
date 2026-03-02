# =========================
# CONFIG
# =========================
BASE="http://localhost:3000"

# Users seed (selon le message Claude)
ADMIN_EMAIL="marc@asp-signalisation.fr"
TECH_EMAIL="tdufr@asp-signalisation.fr"
PWD="password123"

# Helper: extract JSON field with python
jget () { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

echo "== 0) Health (optionnel) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/health" || true
echo

# =========================
# A) AUTH / REFRESH
# =========================
echo "== 1) Login ADMIN =="
LOGIN_ADMIN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PWD\"}")
echo "$LOGIN_ADMIN" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"

ADMIN_ACCESS=$(echo "$LOGIN_ADMIN" | jget "['accessToken']")
ADMIN_REFRESH=$(echo "$LOGIN_ADMIN" | jget "['refreshToken']")
echo "ADMIN_ACCESS: ${ADMIN_ACCESS:0:25}..."
echo "ADMIN_REFRESH: ${ADMIN_REFRESH:0:25}..."
echo

echo "== 2) /api/me avec access token ADMIN =="
curl -s -X GET "$BASE/api/me" \
  -H "Authorization: Bearer $ADMIN_ACCESS" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo

echo "== 3) Refresh ADMIN (rotation attendue) =="
REFRESH1=$(curl -s -X POST "$BASE/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$ADMIN_REFRESH\"}")
echo "$REFRESH1" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"

ADMIN_ACCESS_2=$(echo "$REFRESH1" | jget "['accessToken']")
ADMIN_REFRESH_2=$(echo "$REFRESH1" | jget "['refreshToken']")
echo "NEW_ADMIN_REFRESH != OLD ?"
python3 - <<PY
old="$ADMIN_REFRESH"
new="$ADMIN_REFRESH_2"
print("OK" if old!=new else "NOT OK (refresh not rotated)")
PY
echo

echo "== 4) Reuse detection : réutiliser l'ancien refresh (doit échouer 401/403) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$ADMIN_REFRESH\"}"
echo

# =========================
# B) MULTI-ENTITÉ
# =========================
echo "== 5) ADMIN: X-Company-Id=GROUP (doit être 200) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X GET "$BASE/api/clients" \
  -H "Authorization: Bearer $ADMIN_ACCESS_2" \
  -H "X-Company-Id: GROUP"
echo

echo "== 6) ADMIN: X-Company-Id=ASP (200) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X GET "$BASE/api/clients" \
  -H "Authorization: Bearer $ADMIN_ACCESS_2" \
  -H "X-Company-Id: ASP"
echo

echo "== 7) ADMIN: X-Company-Id=JS (200) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X GET "$BASE/api/clients" \
  -H "Authorization: Bearer $ADMIN_ACCESS_2" \
  -H "X-Company-Id: JS"
echo

# =========================
# C) TECHNICIEN SCOPING
# =========================
echo "== 8) Login TECH =="
LOGIN_TECH=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TECH_EMAIL\",\"password\":\"$PWD\"}")
echo "$LOGIN_TECH" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"

TECH_ACCESS=$(echo "$LOGIN_TECH" | jget "['accessToken']")
TECH_REFRESH=$(echo "$LOGIN_TECH" | jget "['refreshToken']")
echo "TECH_ACCESS: ${TECH_ACCESS:0:25}..."
echo

echo "== 9) TECH: essayer X-Company-Id=JS (doit être 403) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X GET "$BASE/api/jobs" \
  -H "Authorization: Bearer $TECH_ACCESS" \
  -H "X-Company-Id: JS"
echo

echo "== 10) TECH: essayer X-Company-Id=GROUP (doit être 403) =="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X GET "$BASE/api/jobs" \
  -H "Authorization: Bearer $TECH_ACCESS" \
  -H "X-Company-Id: GROUP"
echo

echo "== 11) TECH: X-Company-Id=ASP (doit être 200) et retour filtré =="
JOBS_TECH=$(curl -s -X GET "$BASE/api/jobs" \
  -H "Authorization: Bearer $TECH_ACCESS" \
  -H "X-Company-Id: ASP")
echo "$JOBS_TECH" | python3 - <<'PY'
import sys, json
data=json.load(sys.stdin)
print("Count jobs returned:", len(data) if isinstance(data, list) else "NOT A LIST")
# Print first 3 refs if available
if isinstance(data, list):
  for j in data[:3]:
    print("-", j.get("reference") or j.get("ref") or j.get("id"))
PY
echo

echo "== 12) TECH: /api/time-entries (200) et idéalement seulement ses entrées =="
TE_TECH=$(curl -s -X GET "$BASE/api/time-entries" \
  -H "Authorization: Bearer $TECH_ACCESS" \
  -H "X-Company-Id: ASP")
echo "$TE_TECH" | python3 - <<'PY'
import sys, json
data=json.load(sys.stdin)
print("Count time entries returned:", len(data) if isinstance(data, list) else "NOT A LIST")
if isinstance(data, list) and data:
  # show unique userId/userEmail fields if present
  keys=set()
  for t in data:
    for k in ("userId","userEmail","user","userName"):
      if k in t: keys.add(k)
  print("Fields present among:", sorted(keys))
  print("Sample:", {k:data[0].get(k) for k in ("id","date","hours","userId","userEmail","userName") if k in data[0]})
PY
echo

# =========================
# D) AUDIT (mutation + vérif manuelle)
# =========================
echo "== 13) Mutation pour déclencher AuditLog (dupliquer un devis) =="
# Récupère 1 devis
QUOTES=$(curl -s -X GET "$BASE/api/quotes" \
  -H "Authorization: Bearer $ADMIN_ACCESS_2" \
  -H "X-Company-Id: ASP")
QUOTE_ID=$(echo "$QUOTES" | python3 - <<'PY'
import sys,json
data=json.load(sys.stdin)
print(data[0]["id"] if isinstance(data,list) and data else "")
PY
)
echo "Using QUOTE_ID=$QUOTE_ID"

if [ -n "$QUOTE_ID" ]; then
  curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/quotes/$QUOTE_ID/duplicate" \
    -H "Authorization: Bearer $ADMIN_ACCESS_2" \
    -H "X-Company-Id: ASP"
else
  echo "No quote found, skip."
fi
echo

echo "== 14) Vérif AuditLog (manuelle via Prisma Studio) =="
echo "Ouvre: cd api && npm run db:studio"
echo "Puis table AuditLog : tu dois voir une entrée action=duplicate entity=Quote entityId=$QUOTE_ID (ou équivalent)."
echo