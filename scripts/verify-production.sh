#!/usr/bin/env bash
# Cek cepat setelah deploy bahwa perbaikan keamanan versi >= 1.4.1 sudah aktif di produksi.
# TIDAK menulis data apa pun. Pemakaian:
#   ADMIN_USER=admin ADMIN_PASS='...' ./scripts/verify-production.sh [https://kasjepun.arcomteknologi.id]
set -u
BASE="${1:-https://kasjepun.arcomteknologi.id}"
fail=0
pass() { echo "PASS $1"; }
bad()  { echo "FAIL $1"; fail=1; }

# 1. Server hidup
[ "$(curl -s -m 10 "$BASE/api/ping")" = "pong" ] && pass "server hidup ($BASE)" || bad "server tidak menjawab /api/ping"

# 2. Callback iPaymu palsu harus ditolak (dulu: DUMMY_TRX_123 bisa melunasi tagihan TEST-TX)
code=$(curl -s -m 15 -o /dev/null -w "%{http_code}" -X POST "$BASE/api/ipaymu/callback" \
  -H 'Content-Type: application/x-www-form-urlencoded' --data 'trx_id=DUMMY_TRX_123&reference_id=TEST-TX-0&status=berhasil')
[ "$code" != "200" ] && pass "callback iPaymu palsu ditolak ($code)" || bad "callback iPaymu palsu DITERIMA (200)"

# 3. Login aplikasi Android mendapat sesi 30 hari (kode server baru), web tetap 12 jam
if [ -n "${ADMIN_USER:-}" ] && [ -n "${ADMIN_PASS:-}" ]; then
  body=$(printf '{"username":"%s","password":"%s","client":"android"}' "$ADMIN_USER" "$ADMIN_PASS")
  token=$(curl -s -m 15 -X POST "$BASE/api/login" -H 'Content-Type: application/json' -d "$body" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).token||'')}catch{console.log('')}})")
  if [ -n "$token" ]; then
    days=$(node -e "const p=JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64url'));console.log(Math.round((p.exp-Date.now()/1000)/86400))" "$token")
    [ "$days" -ge 29 ] && pass "sesi aplikasi Android ${days} hari (kode server baru aktif)" || bad "sesi Android hanya ${days} hari -> server masih kode LAMA"
    # 4. Token alg=none ditolak
    none="$(node -e "const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');console.log(b({alg:'none',typ:'JWT'})+'.'+b({id:'x',username:'x',role:'Admin'})+'.')")"
    c=$(curl -s -m 10 -o /dev/null -w "%{http_code}" "$BASE/api/warga" -H "Authorization: Bearer $none")
    [ "$c" = "401" ] && pass "token palsu (alg none) ditolak" || bad "token palsu diterima ($c)"
  else
    bad "login gagal (cek ADMIN_USER/ADMIN_PASS)"
  fi
  [ "$ADMIN_PASS" = "password" ] && bad "password admin masih bawaan 'password' -> ganti di Pengelola Sistem"
else
  echo "SKIP cek sesi 30 hari & token palsu (set ADMIN_USER dan ADMIN_PASS untuk menjalankannya)"
fi

[ $fail -eq 0 ] && echo "SEMUA CEK LOLOS" || echo "ADA CEK YANG GAGAL"
exit $fail
