FROM node:24.22.2-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
  NPM_CONFIG_FUND=false

FROM base AS build
COPY client .
RUN cp src/index.docker.html src/index.html \
  && npm ci \
  && npm run build

FROM caddy:2.11.4-alpine@sha256:6aeddd44c3078b0f9a35206472a11420648a79c184603ef95957d0a20044cb2b AS caddy
RUN setcap -r /usr/bin/caddy

FROM alpine:3@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a AS runtime
WORKDIR /app
ENV XDG_CONFIG_HOME=/config \
  XDG_DATA_HOME=/data

RUN addgroup -S -g 10001 webuser \
  && adduser -S -u 10001 webuser -G webuser \
  && apk add --no-cache mailcap=2.1.54-r0 \
  && mkdir -p /etc/caddy /usr/share/caddy

COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY --from=build --chown=webuser:webuser /app/dist/shoyu/browser /usr/share/caddy
COPY client/NOTICES.md .

RUN cat > /etc/caddy/Caddyfile <<'EOF'
{
    admin off
    persist_config off
}
:8080 {
    root * /usr/share/caddy
    try_files {path} {path}/ /index.html
    # Only the static index.html from this image. Template functions can read the environment and files: never
    # enable them for proxied or user-supplied content, and keep secrets out of this container's environment.
    @index path / /index.html
    templates @index {
        mime text/html
    }
    file_server
}
EOF


USER 10001:10001
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -q -O /dev/null http://127.0.0.1:8080 || exit 1"]

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
