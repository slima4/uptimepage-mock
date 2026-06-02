#!/bin/sh
# Generates a local CA and per-scenario leaf certs into $CERT_DIR, regenerated on
# every container start so "expiring" is always EXPIRING_DAYS from now. Validity
# windows are set via OpenSSL -not_before/-not_after (OpenSSL >= 3.5).
#
# valid/expiring/expired/wronghost are signed by the CA (ca.crt) -> import that CA
# to test trusted-chain (verify_tls) success and cert-expiry thresholds.
# selfsigned is a standalone self-signed leaf -> always untrusted.
set -eu

CERT_DIR=${CERT_DIR:-/certs}
DOMAIN=${TLS_DOMAIN:-tls.mock.uptimepage.dev}
EXPIRING_DAYS=${EXPIRING_DAYS:-10}
case "$EXPIRING_DAYS" in
  '' | *[!0-9]*)
    echo "EXPIRING_DAYS must be a non-negative integer; falling back to 10" >&2
    EXPIRING_DAYS=10
    ;;
esac
mkdir -p "$CERT_DIR"

at() { date -u -d "$1" +%Y%m%d%H%M%SZ; }

# Local CA.
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" \
  -subj "/CN=uptimepage-mock local CA" -days 3650 \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" >/dev/null 2>&1

# sign <name> <san> <not_before> <not_after>  -> CA-signed leaf + fullchain.
sign() {
  name=$1
  san=$2
  printf 'subjectAltName=DNS:%s\n' "$san" >"$CERT_DIR/$name.ext"
  openssl req -newkey rsa:2048 -nodes \
    -keyout "$CERT_DIR/$name.key" -out "$CERT_DIR/$name.csr" \
    -subj "/CN=$san" >/dev/null 2>&1
  openssl x509 -req -in "$CERT_DIR/$name.csr" \
    -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial \
    -not_before "$3" -not_after "$4" \
    -extfile "$CERT_DIR/$name.ext" -out "$CERT_DIR/$name.crt" >/dev/null 2>&1
  cat "$CERT_DIR/$name.crt" "$CERT_DIR/ca.crt" >"$CERT_DIR/$name.fullchain.crt"
  rm -f "$CERT_DIR/$name.csr" "$CERT_DIR/$name.ext"
}

NOW=$(at now)
sign valid     "valid.$DOMAIN"        "$NOW"             "$(at '+825 days')"
sign expiring  "expiring.$DOMAIN"     "$NOW"             "$(at "+${EXPIRING_DAYS} days")"
sign expired   "expired.$DOMAIN"      "$(at '-60 days')" "$(at '-1 days')"
sign wronghost "not-the-host.invalid" "$NOW"             "$(at '+825 days')"

# Standalone self-signed leaf (never chains to the CA).
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$CERT_DIR/selfsigned.key" -out "$CERT_DIR/selfsigned.crt" \
  -subj "/CN=selfsigned.$DOMAIN" -addext "subjectAltName=DNS:selfsigned.$DOMAIN" \
  -days 825 >/dev/null 2>&1

echo "certs generated in $CERT_DIR (expiring in ${EXPIRING_DAYS}d):"
ls -1 "$CERT_DIR"/*.crt
