#!/usr/bin/env bash
#
# Общий жизненный цикл локального сервера для скриптов, которым нужно
# что-то проверить на поднятом сайте: поднять, дождаться, погасить.
#
# Подключается через `source`. Вызывающий обязан поставить trap:
#   source .github/scripts/sh/localServer.sh
#   trap local_server_stop EXIT INT TERM
#   local_server_start 4343 npx astro dev --port 4343
#
# Зачем отдельная библиотека: раньше и test_links_local, и lighthouse
# поднимали сервер однострочником в package.json по схеме
# `команда & sleep N && дальше`, и оба ломались одинаково — сервер оставался
# жить, а пауза угадывалась. Логика уборки нетривиальная (дети, эскалация
# сигналов), и держать её в двух местах — значит чинить дважды.

LOCAL_SERVER_PID=""
LOCAL_SERVER_LOG=""
LOCAL_SERVER_PORT=""
LOCAL_SERVER_HOST="127.0.0.1"
LOCAL_SERVER_READY_TIMEOUT="${LOCAL_SERVER_READY_TIMEOUT:-120}"

# Ответил ли сервер хоть чем-нибудь.
#
# Именно «хоть чем-нибудь»: на многих сайтах корень отдаёт 404 или 500, и
# требовать 2xx означало бы ждать готовности до таймаута у полностью
# исправного сервера. Битый корень — это то, что проверка должна найти,
# а не повод не начинать.
local_server_responded() {
	local code
	code="$(curl -s -o /dev/null -w '%{http_code}' "http://$LOCAL_SERVER_HOST:$LOCAL_SERVER_PORT/" 2>/dev/null || true)"
	[ -n "$code" ] && [ "$code" != "000" ]
}

# local_server_start <порт> <команда запуска...>
local_server_start() {
	LOCAL_SERVER_PORT="$1"
	shift

	if lsof -i ":$LOCAL_SERVER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
		echo "❌ Порт $LOCAL_SERVER_PORT уже занят. Освободите его или задайте другой порт."
		return 1
	fi

	LOCAL_SERVER_LOG="$(mktemp -t local-server-log)"

	echo "▶ Поднимаю сервер на $LOCAL_SERVER_HOST:$LOCAL_SERVER_PORT"
	"$@" >"$LOCAL_SERVER_LOG" 2>&1 &
	LOCAL_SERVER_PID=$!

	local waited=0
	while ! local_server_responded; do
		if ! kill -0 "$LOCAL_SERVER_PID" 2>/dev/null; then
			echo "❌ Сервер упал на старте:"
			tail -20 "$LOCAL_SERVER_LOG"
			return 1
		fi
		if [ "$waited" -ge "$LOCAL_SERVER_READY_TIMEOUT" ]; then
			echo "❌ Сервер не ответил за ${LOCAL_SERVER_READY_TIMEOUT}с. Последние строки лога:"
			tail -20 "$LOCAL_SERVER_LOG"
			return 1
		fi
		sleep 1
		waited=$((waited + 1))
	done

	echo "✔ Сервер готов за ${waited}с"
}

# Гасит только свой сервер — по PID, а не по маске имени процесса.
# Сохраняет и возвращает исходный код выхода, чтобы годиться как trap EXIT.
local_server_stop() {
	local status=$?

	if [ -n "$LOCAL_SERVER_PID" ] && kill -0 "$LOCAL_SERVER_PID" 2>/dev/null; then
		echo "▶ Останавливаю сервер (PID $LOCAL_SERVER_PID)"
		# Сначала дети: сервер запускается через обёртку npx, и убийство
		# только родителя оставило бы слушающий порт процесс сиротой.
		pkill -TERM -P "$LOCAL_SERVER_PID" 2>/dev/null || true
		kill -TERM "$LOCAL_SERVER_PID" 2>/dev/null || true

		local waited=0
		while kill -0 "$LOCAL_SERVER_PID" 2>/dev/null && [ "$waited" -lt 20 ]; do
			sleep 0.5
			waited=$((waited + 1))
		done

		if kill -0 "$LOCAL_SERVER_PID" 2>/dev/null; then
			echo "⚠ Сервер не завершился по SIGTERM, посылаю SIGKILL"
			pkill -KILL -P "$LOCAL_SERVER_PID" 2>/dev/null || true
			kill -KILL "$LOCAL_SERVER_PID" 2>/dev/null || true
		fi

		LOCAL_SERVER_PID=""
	fi

	[ -n "$LOCAL_SERVER_LOG" ] && rm -f "$LOCAL_SERVER_LOG"
	return $status
}
