#!/bin/sh
set -e
/usr/local/bin/gen-certs.sh
/usr/local/bin/gen-encodings.sh
exec nginx -g 'daemon off;'
