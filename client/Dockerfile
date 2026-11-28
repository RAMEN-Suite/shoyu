FROM node:24.22.2-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8 AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
  NPM_CONFIG_FUND=false

FROM base AS build
COPY client .
RUN cp src/index.docker.html src/index.html \
  && npm ci \
  && npm run build

FROM caddy:2.11.7-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5 AS caddy
RUN setcap -r /usr/bin/caddy

FROM alpine:3@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS runtime
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
    encode gzip
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
