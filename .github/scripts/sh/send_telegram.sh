#!/bin/bash
# send_telegram.sh

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

is_response_ok() {
    local response="$1"
    echo "$response" | grep -q '"ok":true'
}

# Telegram отвергает сообщение целиком, если разметка не сходится: непарные *, _, [
# или обратные кавычки в пользовательском тексте. Такое сообщение лучше доставить
# без форматирования, чем не доставить вовсе.
should_retry_without_parse_mode() {
    local response="$1"
    local parse_mode="$2"

    if [ -z "$parse_mode" ]; then
        return 1
    fi

    if echo "$response" | grep -Eqi "can't parse entities|unsupported start tag|can't find end tag|tag must be|entity name"; then
        return 0
    fi

    return 1
}

post_telegram_message() {
    local token="$1"
    local chat_id="$2"
    local message="$3"
    local parse_mode="$4"
    local message_thread_id="$5"

    local request_url="https://api.telegram.org/bot${token}/sendMessage"
    local curl_args=(
        -sS
        -X POST
        "$request_url"
        --data-urlencode "chat_id=${chat_id}"
        --data-urlencode "text=${message}"
        --data "disable_web_page_preview=true"
    )

    if [ -n "$parse_mode" ]; then
        curl_args+=(--data-urlencode "parse_mode=${parse_mode}")
    fi

    if [ -n "$message_thread_id" ]; then
        curl_args+=(--data-urlencode "message_thread_id=${message_thread_id}")
    fi

    curl "${curl_args[@]}"
}

send_with_fallback() {
    local token="$1"
    local chat_id="$2"
    local message="$3"
    local parse_mode="$4"
    local message_thread_id="$5"

    local response
    response=$(post_telegram_message "$token" "$chat_id" "$message" "$parse_mode" "$message_thread_id")

    if ! is_response_ok "$response" && should_retry_without_parse_mode "$response" "$parse_mode"; then
        echo "Warning: parse_mode=$parse_mode failed for chat $chat_id, retrying without parse_mode" >&2
        response=$(post_telegram_message "$token" "$chat_id" "$message" "" "$message_thread_id")
    fi

    echo "$response"
}

# Максимум для rich message — 32768 UTF-8 символов. Режем с запасом на служебную шапку.
RICH_MESSAGE_MAX_CHARS=30000

# Отправка одного Rich Message (метод sendRichMessage).
#
# В отличие от sendMessage с parse_mode=Markdown, тут не нужно ничего экранировать:
# rich_message.markdown принимает GitHub Flavored Markdown как есть, поэтому тело
# PR с таблицами, списками и inline-кодом уходит без ошибок "can't parse entities".
#
# Тело запроса собирает jq — он же и экранирует всё для JSON. Никакой конкатенации
# строк с пользовательским текстом, иначе кавычки и переводы строк ломают payload.
post_rich_message() {
    local token="$1"
    local chat_id="$2"
    local markdown="$3"
    local message_thread_id="$4"

    local payload
    payload=$(jq -n \
        --arg chat_id "$chat_id" \
        --arg markdown "$markdown" \
        --arg thread "$message_thread_id" \
        '{chat_id: $chat_id, rich_message: {markdown: $markdown}}
         + (if ($thread | test("^[0-9]+$")) then {message_thread_id: ($thread | tonumber)} else {} end)')

    curl -sS -X POST \
        "https://api.telegram.org/bot${token}/sendRichMessage" \
        -H "Content-Type: application/json" \
        --data-binary "$payload"
}

send_rich_telegram_message() {
    local token=$(trim_quotes "$1")
    local chat_ids=$(trim_quotes "$2")
    # markdown НЕ прогоняем через trim_quotes: это произвольный текст,
    # у которого начальная/конечная кавычка может быть значимой.
    local markdown="$3"

    if [ -z "$token" ] || [ -z "$markdown" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_rich_telegram_message token chat_ids markdown" >&2
        return 1
    fi

    if [ -z "$chat_ids" ]; then
        echo "Warning: chat_ids is empty, skipping Telegram message send" >&2
        return 0
    fi

    if ! command -v jq >/dev/null 2>&1; then
        echo "Error: jq is required for sendRichMessage" >&2
        return 1
    fi

    if [ "${#markdown}" -gt "$RICH_MESSAGE_MAX_CHARS" ]; then
        echo "Warning: message is ${#markdown} chars, truncating to $RICH_MESSAGE_MAX_CHARS" >&2
        markdown="${markdown:0:$RICH_MESSAGE_MAX_CHARS}

_…сообщение обрезано по лимиту Telegram_"
    fi

    while IFS= read -r chat_line; do
        IFS=',/' read -r chat_id message_thread_id <<< "$chat_line"

        [ -z "$chat_id" ] && continue

        echo "Sending rich message to Telegram chat $chat_id"

        RESPONSE=$(post_rich_message "$token" "$chat_id" "$markdown" "$message_thread_id")

        if ! is_response_ok "$RESPONSE"; then
            # sendRichMessage — новый метод. Если он недоступен, уведомление
            # всё равно должно дойти, пусть и без форматирования.
            echo "Warning: sendRichMessage failed for chat $chat_id: $RESPONSE" >&2
            echo "Falling back to plain sendMessage without parse_mode" >&2

            local curl_args=(-sS -X POST "https://api.telegram.org/bot${token}/sendMessage"
                --data-urlencode "chat_id=${chat_id}"
                --data-urlencode "text=${markdown}"
                --data-urlencode "disable_web_page_preview=true"
            )
            if [ -n "$message_thread_id" ]; then
                curl_args+=(--data-urlencode "message_thread_id=${message_thread_id}")
            fi
            RESPONSE=$(curl "${curl_args[@]}")

            if ! is_response_ok "$RESPONSE"; then
                echo "Error sending message to chat $chat_id: $RESPONSE" >&2
            fi
        fi

        sleep 1
    done <<< "$chat_ids"
}

send_telegram_messages() {
    # Очищаем входные параметры от кавычек
    local token=$(trim_quotes "$1")
    local chat_ids=$(trim_quotes "$2")
    local total_parts=$(trim_quotes "$3")
    local parse_mode=$(trim_quotes "$4")

    # Устанавливаем HTML как значение по умолчанию, если parse_mode не указан
    if [ -z "$parse_mode" ]; then
        parse_mode="HTML"
    fi

    if [ -z "$token" ] || [ -z "$total_parts" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_telegram_messages token chat_ids total_parts [parse_mode]" >&2
        return 1
    fi

    # Ненастроенный чат — это пробел в конфиге, а не сбой: предупреждаем и выходим,
    # иначе весь job падает из-за незаданного секрета.
    if [ -z "$chat_ids" ]; then
        echo "Warning: TELEGRAM_TO (chat_ids) is empty, skipping Telegram messages send" >&2
        return 0
    fi

    # Проверяем, что parse_mode имеет допустимое значение
    if [[ ! "$parse_mode" =~ ^(HTML|Markdown|MarkdownV2)$ ]]; then
        echo "Error: Invalid parse_mode. Must be one of: HTML, Markdown, MarkdownV2" >&2
        return 1
    fi

    # Разбиваем chat_ids по переносу строки
    while IFS= read -r chat_line; do
        # Разбиваем строку по запятой или слешу
        IFS=',/' read -r chat_id message_thread_id <<< "$chat_line"
        
        for i in $(seq 0 $((total_parts - 1))); do
            if [ ! -f "./tmp_messages/part_${i}.txt" ]; then
                echo "Error: Message file part_${i}.txt not found" >&2
                continue
            fi

            MESSAGE=$(cat "./tmp_messages/part_${i}.txt")
            echo -e "${BGYELLOW}Sending part $i to Telegram chat $chat_id${Color_Off}"
            echo "MESSAGE: $MESSAGE"

            RESPONSE=$(send_with_fallback "$token" "$chat_id" "$MESSAGE" "$parse_mode" "$message_thread_id")

            if ! is_response_ok "$RESPONSE"; then
                echo "Error sending message part $i to chat $chat_id: $RESPONSE" >&2
            fi
            
            # Добавляем небольшую задержку между отправками сообщений
            sleep 1
        done
    done <<< "$chat_ids"
}

send_telegram_file() {
    local token=$(trim_quotes "$1")
    local chat_ids=$(trim_quotes "$2")
    local file_path=$(trim_quotes "$3")
    local caption=$(trim_quotes "$4")

    if [ -z "$token" ] || [ -z "$chat_ids" ] || [ -z "$file_path" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_telegram_file token chat_ids file_path [caption]" >&2
        return 1
    fi

    if [ ! -f "$file_path" ]; then
        echo "Error: File not found: $file_path" >&2
        return 1
    fi

    while IFS= read -r chat_line; do
        IFS=',/' read -r chat_id message_thread_id <<< "$chat_line"

        echo -e "${BGGREEN}Sending file $(basename $file_path) to Telegram chat $chat_id${Color_Off}"

        local curl_args=(-s -X POST "https://api.telegram.org/bot${token}/sendDocument"
            -F "chat_id=${chat_id}"
            -F "document=@${file_path}"
        )

        if [ -n "$caption" ]; then
            curl_args+=(-F "caption=${caption}")
        fi

        if [ -n "$message_thread_id" ]; then
            curl_args+=(-F "message_thread_id=${message_thread_id}")
        fi

        RESPONSE=$(curl "${curl_args[@]}")

        if ! echo "$RESPONSE" | grep -q '"ok":true'; then
            echo "Error sending file to chat $chat_id: $RESPONSE" >&2
        fi

        sleep 1
    done <<< "$chat_ids"
}

send_telegram_message() {
    # Очищаем входные параметры от кавычек
    local token=$(trim_quotes "$1")
    local chat_ids=$(trim_quotes "$2")
    local message=$(trim_quotes "$3")
    local parse_mode=$(trim_quotes "$4")

    # Устанавливаем HTML как значение по умолчанию, если parse_mode не указан
    if [ -z "$parse_mode" ]; then
        parse_mode="HTML"
    fi

    if [ -z "$token" ] || [ -z "$message" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_telegram_message token chat_ids message [parse_mode]" >&2
        return 1
    fi

    # Ненастроенный чат — пробел в конфиге, а не сбой (см. send_telegram_messages).
    if [ -z "$chat_ids" ]; then
        echo "Warning: chat_ids is empty, skipping Telegram message send" >&2
        return 0
    fi

    # Проверяем, что parse_mode имеет допустимое значение
    if [[ ! "$parse_mode" =~ ^(HTML|Markdown|MarkdownV2)$ ]]; then
        echo "Error: Invalid parse_mode. Must be one of: HTML, Markdown, MarkdownV2" >&2
        return 1
    fi

    # Разбиваем chat_ids по переносу строки
    while IFS= read -r chat_line; do
        # Разбиваем строку по запятой или слешу
        IFS=',/' read -r chat_id message_thread_id <<< "$chat_line"
        
        echo "Sending message to Telegram chat $chat_id"

        RESPONSE=$(send_with_fallback "$token" "$chat_id" "$message" "$parse_mode" "$message_thread_id")

        if ! is_response_ok "$RESPONSE"; then
            echo "Error sending message to chat $chat_id: $RESPONSE" >&2
        fi
        
        # Добавляем небольшую задержку между отправками сообщений
        sleep 1
    done <<< "$chat_ids"
}
