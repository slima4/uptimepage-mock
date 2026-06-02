FROM nginx:alpine

RUN apk add --no-cache openssl coreutils

COPY gen-certs.sh /usr/local/bin/gen-certs.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY nginx.conf /etc/nginx/nginx.conf
RUN chmod +x /usr/local/bin/gen-certs.sh /usr/local/bin/entrypoint.sh

EXPOSE 443
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
