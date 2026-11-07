#!/bin/bash
set -euo pipefail

LOCAL_SOURCE="${1:-tmp/image_mirror/cars/}"
DRY_RUN="${DRY_RUN:-0}"

get_env_value() {
    local key="$1"
    local env_value="${!key:-}"
    if [ -n "$env_value" ]; then
        printf '%s' "$env_value"
        return
    fi

    if [ -f ".env" ]; then
        awk -F= -v key="$key" '$1 == key { value = substr($0, index($0, "=") + 1); sub(/^"/, "", value); sub(/"$/, "", value); print value; exit }' .env
    fi
}

for key in CDN_SSH_HOST CDN_SSH_USER CDN_SSH_PORT CDN_SSH_KEY_PATH CDN_REMOTE_PATH CDN_SSH_KNOWN_HOSTS; do
    export "$key=$(get_env_value "$key")"
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARGS=(upload "$LOCAL_SOURCE")
if [ "$DRY_RUN" = "1" ]; then
    ARGS+=(--dry-run)
fi

exec python3 "$SCRIPT_DIR/../cdn_ssh.py" "${ARGS[@]}"
