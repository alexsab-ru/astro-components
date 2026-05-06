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
        awk -F= -v key="$key" '$1 == key { sub(/^"/, "", $2); sub(/"$/, "", $2); print $2; exit }' .env
    fi
}

CDN_SSH_HOST="$(get_env_value CDN_SSH_HOST)"
CDN_SSH_USER="$(get_env_value CDN_SSH_USER)"
CDN_SSH_KEY_PATH="$(get_env_value CDN_SSH_KEY_PATH)"
CDN_REMOTE_PATH="$(get_env_value CDN_REMOTE_PATH)"

if [ -z "$CDN_SSH_HOST" ] || [ -z "$CDN_SSH_USER" ]; then
    echo "Error: CDN_SSH_HOST and CDN_SSH_USER are required" >&2
    exit 1
fi

if [ ! -d "$LOCAL_SOURCE" ]; then
    echo "Image mirror directory not found: $LOCAL_SOURCE"
    exit 0
fi

REMOTE_PATH="${CDN_REMOTE_PATH:-.}"
SSH_ARGS="-o IdentitiesOnly=yes -o BatchMode=yes"

if [ -n "$CDN_SSH_KEY_PATH" ]; then
    if [ ! -f "$CDN_SSH_KEY_PATH" ]; then
        echo "Error: CDN_SSH_KEY_PATH file not found: $CDN_SSH_KEY_PATH" >&2
        exit 1
    fi
    SSH_ARGS="-i $CDN_SSH_KEY_PATH $SSH_ARGS"
fi

RSYNC_ARGS=(-rzO --no-perms --itemize-changes)
if [ "$DRY_RUN" = "1" ]; then
    RSYNC_ARGS+=(-n)
fi

rsync "${RSYNC_ARGS[@]}" \
    -e "ssh $SSH_ARGS" \
    "${LOCAL_SOURCE%/}/" \
    "$CDN_SSH_USER@$CDN_SSH_HOST:$REMOTE_PATH/"
