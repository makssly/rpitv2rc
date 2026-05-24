#!/bin/bash

TARGET_DIR="/media"
MANIFEST_FILE="$TARGET_DIR/manifest.json"
MANIFEST_TMP="/tmp/manifest.json.tmp"

echo "Manifest gen started"

while true; do
    # json
    echo "[" > "$MANIFEST_TMP"
    first=true

    # 
    cd "$TARGET_DIR" || exit 1


    find . -maxdepth 1 -type f \( -iname "*.mp4" -o -iname "*.mov" \) | sed 's|^\./||' | while read -r file; do
        if [[ "$file" == *.tmp ]] || [[ "$file" == .* ]]; then
            continue
        fi

        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$MANIFEST_TMP"
        fi
        
        HASH=$(sha256sum "$file" | awk '{print $1}')
        SIZE=$(stat -c%s "$file")
        
        echo "  {\"name\": \"$file\", \"hash\": \"$HASH\", \"size\": $SIZE}" >> "$MANIFEST_TMP"
    done

    echo "]" >> "$MANIFEST_TMP"

    # update manifest
    mv "$MANIFEST_TMP" "$MANIFEST_FILE"
    chmod 644 "$MANIFEST_FILE"

    sleep 60
done