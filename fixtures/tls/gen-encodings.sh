#!/bin/sh
# Pre-builds the content-encoding fixture bodies served verbatim by nginx.
# These cannot live on the Cloudflare Worker: the edge re-compresses encoded
# bodies (double-encoding them) and cannot serve a deliberately corrupt one.
set -eu

WWW=${WWW:-/www}
mkdir -p "$WWW"

printf 'uptimepage-mock gzip ok\n' | gzip -c >"$WWW/gzip.bin"
printf 'uptimepage-mock brotli ok\n' | brotli -c >"$WWW/brotli.bin"
# Valid gzip magic followed by garbage -> a decode failure, not a real stream.
printf '\037\213\010\000\001\002\003\004\005\006\007' >"$WWW/bad-gzip.bin"

echo "encoding fixtures generated in $WWW:"
ls -1 "$WWW"
