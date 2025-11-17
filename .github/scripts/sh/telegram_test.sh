#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
cd "$REPO_ROOT"

source "$REPO_ROOT/.github/scripts/sh/utils.sh"

EMPTY_SHA="0000000000000000000000000000000000000000"

show_help() {
  cat <<'EOF'
Usage: telegram_test.sh [OPTIONS]

Флаги:
  -p, --prepare_commits        Собрать список коммитов и подготовить сообщения.
  -s, --send_telegram          Отправить собранные сообщения в Telegram.
  -h, --help                   Показать эту справку.

Параметры (можно также задавать через одноимённые переменные окружения):
      --before SHA             Начальный SHA (BEFORE_SHA).
      --after SHA              Конечный SHA (AFTER_SHA, по умолчанию HEAD).
      --ref REF                Имя ветки / ref (REF_NAME).
      --repo-name NAME         Имя репозитория (REPOSITORY_NAME).
      --repository OWNER/REPO  Значение вроде Alexsab/alexsab.github.io.
      --actor LOGIN            Автор коммитов (ACTOR).
      --include-header VALUE   Явно указать include-header (true/false).
      --no-header              Синоним include-header=false.
      --token TOKEN            Telegram токен (TELEGRAM_TOKEN).
      --chat IDS               Telegram chat id / topic id (TELEGRAM_TO).
      --parts N                Принудительно указать количество частей для отправки.
      --parse-mode MODE        HTML, Markdown или MarkdownV2 (PARSE_MODE, по умолчанию HTML).

Примеры:
  ./telegram_test.sh -p --before abc123 --after HEAD
  ./telegram_test.sh -p -s --chat "12345/6"
EOF
}

load_env_value() {
  local key="$1"
  local current_value="$2"

  if [ -n "$current_value" ]; then
    printf '%s' "$current_value"
    return 0
  fi

  if [ -f .env ]; then
    local line
    line=$(grep -E "^${key}=" .env | tail -n 1 || true)
    if [ -n "$line" ]; then
      local value="${line#*=}"
      value=$(trim_quotes "$value")
      printf '%s' "$value"
      return 0
    fi
  fi

  printf '%s' "$current_value"
}

detect_repository_slug() {
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || true)
  if [ -z "$remote_url" ]; then
    return 1
  fi

  remote_url="${remote_url%.git}"
  remote_url="${remote_url#git@github.com:}"
  remote_url="${remote_url#https://github.com/}"
  remote_url="${remote_url#ssh://git@github.com/}"
  printf '%s' "$remote_url"
}

prepare=false
send=false

before_sha="${BEFORE_SHA:-}"
after_sha="${AFTER_SHA:-}"
ref_name="${REF_NAME:-}"
repository_name="${REPOSITORY_NAME:-}"
repository="${REPOSITORY:-}"
actor="${ACTOR:-${GITHUB_ACTOR:-}}"
include_header="${INCLUDE_HEADER:-}"
parse_mode="${PARSE_MODE:-HTML}"
token="${TELEGRAM_TOKEN:-}"
chat_ids="${TELEGRAM_TO:-}"
total_parts_override="${TOTAL_PARTS:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--prepare_commits)
      prepare=true
      shift
      ;;
    -s|--send_telegram)
      send=true
      shift
      ;;
    --before)
      before_sha="$2"
      shift 2
      ;;
    --after)
      after_sha="$2"
      shift 2
      ;;
    --ref)
      ref_name="$2"
      shift 2
      ;;
    --repo-name)
      repository_name="$2"
      shift 2
      ;;
    --repository)
      repository="$2"
      shift 2
      ;;
    --actor)
      actor="$2"
      shift 2
      ;;
    --include-header)
      include_header="$2"
      shift 2
      ;;
    --no-header)
      include_header="false"
      shift
      ;;
    --token)
      token="$2"
      shift 2
      ;;
    --chat)
      chat_ids="$2"
      shift 2
      ;;
    --parts)
      total_parts_override="$2"
      shift 2
      ;;
    --parse-mode)
      parse_mode="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Неизвестный аргумент: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

if ! $prepare && ! $send; then
  show_help
  exit 1
fi

load_prepare_defaults() {
  local repo_slug=""
  if [ -z "$repository" ] || [ -z "$repository_name" ]; then
    if repo_slug=$(detect_repository_slug) && [ -n "$repo_slug" ]; then
      if [ -z "$repository" ]; then
        repository="$repo_slug"
      fi
      if [ -z "$repository_name" ]; then
        repository_name="${repo_slug##*/}"
      fi
    fi
  fi

  if [ -z "$repository_name" ]; then
    repository_name=$(basename "$PWD")
  fi

  if [ -z "$repository" ]; then
    repository="$repository_name"
  fi

  if [ -z "$ref_name" ]; then
    ref_name=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")
  fi

  if [ -z "$after_sha" ]; then
    after_sha=$(git rev-parse HEAD 2>/dev/null || true)
  fi

  if [ -z "$after_sha" ]; then
    echo "Error: не удалось определить текущий SHA. Укажите --after." >&2
    exit 1
  fi

  if [ -z "$before_sha" ]; then
    before_sha=$(git rev-parse HEAD~1 2>/dev/null || echo "$EMPTY_SHA")
  fi

  if [ -z "$actor" ]; then
    if [ -n "${GITHUB_ACTOR:-}" ]; then
      actor="$GITHUB_ACTOR"
    elif [[ "$repository" == */* ]]; then
      actor="${repository%%/*}"
    else
      actor=$(git config user.name 2>/dev/null || whoami)
      actor="${actor// /}"
    fi
  fi
}

last_total_parts=""

if $prepare; then
  load_prepare_defaults
  echo "== Prepare commit messages =="
  echo "repository: $repository_name ($repository)"
  echo "branch/ref: $ref_name"
  echo "actor:      $actor"
  echo "range:      $before_sha .. $after_sha"

  source "$REPO_ROOT/.github/scripts/sh/prepare_commits.sh"
  collect_commits "$repository_name" "$ref_name" "$before_sha" "$after_sha" "$actor" "$repository"

  commit_count=${#COMMIT_ARRAY[@]}
  echo "Коммитов найдено: $commit_count"

  if [ ${#COMMIT_ARRAY[@]} -gt 0 ]; then
    total_parts=$(prepare_commits_message \
      "$repository_name" \
      "$ref_name" \
      "$actor" \
      "$repository" \
      "$COMPARE_HASH" \
      "$include_header" \
      "${COMMIT_ARRAY[@]}"
    )
  else
    total_parts=$(prepare_commits_message \
      "$repository_name" \
      "$ref_name" \
      "$actor" \
      "$repository" \
      "$COMPARE_HASH" \
      "$include_header"
    )
  fi

  last_total_parts="$total_parts"
  echo "Готово: $total_parts частей. Файлы: $(pwd)/tmp_messages/part_*"
fi

if $send; then
  token=$(load_env_value "TELEGRAM_TOKEN" "$token")
  chat_ids=$(load_env_value "TELEGRAM_TO" "$chat_ids")

  if [ -z "$token" ] || [ -z "$chat_ids" ]; then
    echo "Error: TELEGRAM_TOKEN и/или TELEGRAM_TO не заданы (через .env или аргументы)." >&2
    exit 1
  fi

  parts_to_send="$total_parts_override"
  if [ -z "$parts_to_send" ]; then
    parts_to_send="$last_total_parts"
  fi

  if [ -z "$parts_to_send" ]; then
    echo "Error: нечего отправлять. Сначала запустите prepare или передайте --parts." >&2
    exit 1
  fi

  if ! [[ "$parts_to_send" =~ ^[0-9]+$ ]] || [ "$parts_to_send" -le 0 ]; then
    echo "Error: некорректное количество частей: $parts_to_send" >&2
    exit 1
  fi

  echo "== Send Telegram messages =="
  echo "parse_mode: $parse_mode"
  echo "parts:      $parts_to_send"

  source "$REPO_ROOT/.github/scripts/sh/send_telegram.sh"
  send_telegram_messages "$token" "$chat_ids" "$parts_to_send" "$parse_mode"
fi
