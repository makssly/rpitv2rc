#!/bin/bash

LOCAL_DIR="/opt/signage/video"
MANIFEST_LOCAL="$LOCAL_DIR/manifest.json"
MANIFEST_TMP="/tmp/manifest.json"
DOWNLOAD_DIR="/tmp/signage_download"

# server and creds
SERVER_URL="https://kubetest.ink/media"
CREDS="pi_client:121506e33ef593ac9cd"

mkdir -p "$LOCAL_DIR" "$DOWNLOAD_DIR"

# download manifest
curl -s -u "$CREDS" "$SERVER_URL/manifest.json" > "$MANIFEST_TMP"

if [ ! -s "$MANIFEST_TMP" ] || grep -q "<html>" "$MANIFEST_TMP"; then
    echo "ERROR: server is down of wrong manifest"
    exit 1
fi

# check changes
if [ -f "$MANIFEST_LOCAL" ] && cmp -s "$MANIFEST_TMP" "$MANIFEST_LOCAL"; then
    echo "No new files found"
    rm "$MANIFEST_TMP"
    exit 0
fi

echo "New files found. Download..."
rm -rf ${DOWNLOAD_DIR:?}/*

# manifest parsing
while IFS=$'\t' read -r filename expected_hash; do
    [ -z "$filename" ] && continue

    echo "Downloading: $filename"
    curl -s -L -u "$CREDS" --continue-at - "$SERVER_URL/$filename" > "$DOWNLOAD_DIR/$filename"

    # check hash
    LOCAL_HASH=$(sha256sum "$DOWNLOAD_DIR/$filename" | awk '{print $1}')
    if [ "$LOCAL_HASH" != "$expected_hash" ]; then
        echo "ERROR: File $filename hash mismatch"
        exit 1
    fi
done < <(jq -r '.[] | "\(.name)\t\(.hash)"' "$MANIFEST_TMP")

# update folder
rm -rf "$LOCAL_DIR"/*
mv "$DOWNLOAD_DIR"/* "$LOCAL_DIR/"
mv "$MANIFEST_TMP" "$MANIFEST_LOCAL"

echo "Sync completed with no errors"
systemctl restart signage-player.service