#!/usr/bin/env bash
#
# Проверка ссылок на локальном сервере.
#
# Поднимает `astro dev`, дожидается готовности порта, прогоняет checkLinks.js
# и гасит сервер — что бы ни случилось.
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
# Здесь сервер убивается по своему PID через trap, а готовность определяется
# опросом порта.
set -e
set -o pipefail

PORT="${LINK_CHECK_PORT:-4343}"
HOST="127.0.0.1"
READY_TIMEOUT="${LINK_CHECK_READY_TIMEOUT:-120}"

SERVER_PID=""
SERVER_LOG="$(mktemp -t astro-dev-link-check)"

cleanup() {
	local status=$?

	if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
		echo "▶ Останавливаю сервер (PID $SERVER_PID)"
		# Сначала дети: astro dev запускается через обёртку npx, и убийство
		# только родителя оставило бы слушающий порт процесс сиротой.
		pkill -TERM -P "$SERVER_PID" 2>/dev/null || true
		kill -TERM "$SERVER_PID" 2>/dev/null || true

		local waited=0
		while kill -0 "$SERVER_PID" 2>/dev/null && [ "$waited" -lt 20 ]; do
			sleep 0.5
			waited=$((waited + 1))
		done

		if kill -0 "$SERVER_PID" 2>/dev/null; then
			echo "⚠ Сервер не завершился по SIGTERM, посылаю SIGKILL"
			pkill -KILL -P "$SERVER_PID" 2>/dev/null || true
			kill -KILL "$SERVER_PID" 2>/dev/null || true
		fi
	fi

	rm -f "$SERVER_LOG"
	return $status
}

trap cleanup EXIT INT TERM

# Ответил ли сервер хоть чем-нибудь. Именно «хоть чем-нибудь»: на многих
# сайтах корень отдаёт 404 или 500, и требовать 2xx означало бы ждать
# готовности до таймаута у полностью исправного сервера.
server_responded() {
	local code
	code="$(curl -s -o /dev/null -w '%{http_code}' "http://$HOST:$PORT/" 2>/dev/null || true)"
	[ -n "$code" ] && [ "$code" != "000" ]
}

if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
	echo "❌ Порт $PORT уже занят. Освободите его или задайте LINK_CHECK_PORT."
	exit 1
fi

echo "▶ Поднимаю astro dev на $HOST:$PORT"
ASTRO_DEV_OPEN=0 npx astro dev --port "$PORT" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

waited=0
while ! server_responded; do
	if ! kill -0 "$SERVER_PID" 2>/dev/null; then
		echo "❌ Сервер упал на старте:"
		tail -20 "$SERVER_LOG"
		exit 1
	fi
	if [ "$waited" -ge "$READY_TIMEOUT" ]; then
		echo "❌ Сервер не ответил за ${READY_TIMEOUT}с. Последние строки лога:"
		tail -20 "$SERVER_LOG"
		exit 1
	fi
	sleep 1
	waited=$((waited + 1))
done

echo "✔ Сервер готов за ${waited}с, начинаю проверку ссылок"
DOMAIN="$HOST:$PORT" node .github/scripts/checkLinks/checkLinks.js
