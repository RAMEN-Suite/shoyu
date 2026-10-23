FROM node:24-alpine AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
  NPM_CONFIG_FUND=false

FROM base AS build
COPY client .
RUN cp src/index.docker.html src/index.html \
  && npm ci \
  && npm run build

FROM caddy:2.11.4-alpine AS runtime
WORKDIR /app

RUN addgroup -S -g 10001 webuser \
  && adduser -S -u 10001 webuser -G webuser \
  && apk add --no-cache gettext-envsubst=0.24.1-r1 \
  && setcap -r /usr/bin/caddy

COPY --from=build --chown=webuser:webuser /app/dist/shoyu/browser /usr/share/caddy

RUN cat > /etc/caddy/Caddyfile <<'EOF'
{
    admin off
    persist_config off
}
:8080 {
    root * /tmp/www
    try_files {path} {path}/ /index.html
    file_server
}
EOF

COPY client/NOTICES.md .

RUN cat > /usr/local/bin/shoyu-entrypoint <<'EOF' \
  && chmod +x /usr/local/bin/shoyu-entrypoint
#!/bin/sh
set -eu

: "${CLIENT_LANG:=en}"
: "${CLIENT_TITLE:=Shoyu – Graph-based Digital Edition}"
: "${CLIENT_DESCRIPTION:=Graph-based Digital Edition.}"
: "${CLIENT_BASE_HREF:=/}"
: "${CLIENT_FAVICON_HREF:=/favicon.ico}"

rm -rf /tmp/www
mkdir -p /tmp/www
cp -R /usr/share/caddy/. /tmp/www/

envsubst '${CLIENT_LANG} ${CLIENT_TITLE} ${CLIENT_DESCRIPTION} ${CLIENT_BASE_HREF} ${CLIENT_FAVICON_HREF}' \
  < /usr/share/caddy/index.html \
  > /tmp/www/index.html

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
EOF

USER webuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080 || exit 1

CMD ["shoyu-entrypoint"]
