#!/usr/bin/env bash
#
# Прогон Lighthouse по локально собранному сайту.
#
# Прежний однострочник в package.json делал это так:
#   astro build && astro preview --port 4343 & sleep 5 && npx lighthouse ...
# и был сломан даже сильнее, чем проверка ссылок:
#   1. приоритет операторов. В фон уходит ВЕСЬ `astro build && astro preview`,
#      а `sleep 5 && npx lighthouse` идёт следом в переднем плане. То есть
#      lighthouse стартовал через пять секунд после начала СБОРКИ, а не после
#      готовности сервера, и на любой реальной сборке стучался в мёртвый порт;
#   2. сервер не гасился вообще никогда — ни при успехе, ни при ошибке;
#   3. `sleep 5` — та же гонка, что и в проверке ссылок;
#   4. `astro build` в обход хука prebuild — без него не генерируется brand.css.
set -e
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./localServer.sh
source "$SCRIPT_DIR/localServer.sh"

PORT="${LIGHTHOUSE_PORT:-4343}"
REPORT="./lighthouse-report-$(date +%Y-%m-%d-%H-%M-%S).json"

trap local_server_stop EXIT INT TERM

# Именно pnpm build, а не astro build: хук prebuild генерирует src/scss/brand.css,
# и в обход него сборка падает на «Can't resolve ./brand.css». Прежний
# однострочник звал astro build напрямую и спотыкался об это же.
echo "▶ Собираю сайт"
pnpm build

local_server_start "$PORT" npx astro preview --port "$PORT"

echo "▶ Запускаю Lighthouse, отчёт → $REPORT"
npx lighthouse "http://$LOCAL_SERVER_HOST:$PORT" --output=json --output-path="$REPORT"
echo "✔ Отчёт сохранён: $REPORT"
