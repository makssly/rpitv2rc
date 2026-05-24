FROM alpine:3.21
RUN apk add --no-cache bash findutils
USER 1000:1000
ENTRYPOINT ["/usr/local/bin/generate_manifest.sh"]
