#!/usr/bin/env bash
#
# Проверка ссылок на локально поднятом сайте.
#
# Прежний однострочник в package.json делал это так:
#   astro dev --port 4343 & sleep 10 && ... && pkill -f 'astro dev'
# и ломался тремя способами сразу:
#   1. pkill -f 'astro dev' убивал ЛЮБОЙ astro dev на машине — в соседнем
#      worktree, в другом проекте, чужой;
#   2. из-за `&&` уборка не выполнялась, если проверка нашла битые ссылки,
#      и сервер оставался жить до перезагрузки;
#   3. `sleep 10` — гонка: на холодном старте сервер не успевал, на тёплом
#      десять секунд тратились впустую.
set -e
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./localServer.sh
source "$SCRIPT_DIR/localServer.sh"

PORT="${LINK_CHECK_PORT:-4343}"
LOCAL_SERVER_READY_TIMEOUT="${LINK_CHECK_READY_TIMEOUT:-$LOCAL_SERVER_READY_TIMEOUT}"

trap local_server_stop EXIT INT TERM

ASTRO_DEV_OPEN=0 local_server_start "$PORT" npx astro dev --port "$PORT"

echo "▶ Начинаю проверку ссылок"
DOMAIN="$LOCAL_SERVER_HOST:$PORT" node .github/scripts/checkLinks/checkLinks.js
