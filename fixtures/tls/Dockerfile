FROM nginx:alpine

RUN apk add --no-cache openssl coreutils brotli

COPY gen-certs.sh /usr/local/bin/gen-certs.sh
COPY gen-encodings.sh /usr/local/bin/gen-encodings.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY nginx.conf /etc/nginx/nginx.conf
RUN chmod +x /usr/local/bin/gen-certs.sh /usr/local/bin/gen-encodings.sh /usr/local/bin/entrypoint.sh

EXPOSE 80 443
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
