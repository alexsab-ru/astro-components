#!/bin/bash
# send_telegram.sh

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

send_telegram_messages() {
    # Очищаем входные параметры от кавычек
    local token=$(trim_quotes "$1")
    local chat_ids=$(trim_quotes "$2")
    local total_parts=$(trim_quotes "$3")
    local parse_mode=$(trim_quotes "$4")

    # Защита от "невидимых" символов из CI/YAML:
    # - убираем carriage return (\r), который часто попадает из CRLF
    # - убираем переносы строк
    # - обрезаем пробелы по краям
    # Это нужно, чтобы "Markdown", "Markdown\r" и " Markdown " обрабатывались одинаково.
    parse_mode="${parse_mode//$'\r'/}"
    parse_mode="${parse_mode//$'\n'/}"
    parse_mode="$(echo "$parse_mode" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

    # Нормализуем регистр для удобства и стабильности.
    # Так мы поддерживаем варианты вида markdown / MARKDOWN / markdownv2.
    case "$parse_mode" in
        html|HTML|Html) parse_mode="HTML" ;;
        markdown|MARKDOWN|Markdown) parse_mode="Markdown" ;;
        markdownv2|MARKDOWNV2|MarkdownV2|Markdownv2) parse_mode="MarkdownV2" ;;
    esac

    # Устанавливаем HTML как значение по умолчанию, если parse_mode не указан
    if [ -z "$parse_mode" ]; then
        parse_mode="HTML"
    fi

    if [ -z "$token" ] || [ -z "$chat_ids" ] || [ -z "$total_parts" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_telegram_messages token chat_ids total_parts [parse_mode]" >&2
        return 1
    fi

    # Проверяем, что parse_mode имеет допустимое значение
    if [[ ! "$parse_mode" =~ ^(HTML|Markdown|MarkdownV2)$ ]]; then
        echo "Error: Invalid parse_mode. Must be one of: HTML, Markdown, MarkdownV2" >&2
        # Диагностика для CI: выводим "сырое" значение в безопасном виде (%q)
        # и длину строки. Это помогает быстро увидеть скрытые символы.
        printf 'Error: Received parse_mode=%q (length=%d)\n' "$parse_mode" "${#parse_mode}" >&2
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
            
            # Формируем базовый URL запроса
            local request_url="https://api.telegram.org/bot${token}/sendMessage"
            # Формируем тело запроса.
            # parse_mode добавляем только когда он реально задан.
            # Это позволяет легко сделать fallback без parse_mode.
            local request_data="chat_id=${chat_id}&text=${MESSAGE}&disable_web_page_preview=true"
            if [ -n "$parse_mode" ]; then
                request_data="${request_data}&parse_mode=${parse_mode}"
            fi
            
            # Добавляем message_thread_id, если он есть
            if [ ! -z "$message_thread_id" ]; then
                request_data="${request_data}&message_thread_id=${message_thread_id}"
            fi
            
            RESPONSE=$(curl -s -X POST "$request_url" -d "$request_data")

            # Защита от частых ошибок Telegram при разборе Markdown/HTML.
            # Если в тексте есть "сломанная" сущность, Telegram возвращает:
            # "can't parse entities".
            # В этом случае повторяем отправку как plain text (без parse_mode),
            # чтобы сообщение не терялось из-за одного спецсимвола.
            if ! echo "$RESPONSE" | grep -q '"ok":true' && \
               echo "$RESPONSE" | grep -q "can't parse entities" && \
               [ -n "$parse_mode" ]; then
                echo "Warning: Telegram parse error for chat $chat_id, retrying without parse_mode" >&2
                local fallback_request_data="chat_id=${chat_id}&text=${MESSAGE}&disable_web_page_preview=true"
                if [ ! -z "$message_thread_id" ]; then
                    fallback_request_data="${fallback_request_data}&message_thread_id=${message_thread_id}"
                fi
                RESPONSE=$(curl -s -X POST "$request_url" -d "$fallback_request_data")
            fi

            if ! echo "$RESPONSE" | grep -q '"ok":true'; then
                echo "Error sending message part $i to chat $chat_id: $RESPONSE" >&2
            fi
            
            # Добавляем небольшую задержку между отправками сообщений
            sleep 1
        done
    done <<< "$chat_ids"
}

send_telegram_message() {
    # Очищаем входные параметры от кавычек
    local token=$(trim_quotes "$1")
    local chat_ids=$(trim_quotes "$2")
    local message=$(trim_quotes "$3")
    local parse_mode=$(trim_quotes "$4")

    # Защита от "невидимых" символов из CI/YAML:
    # - убираем carriage return (\r), который часто попадает из CRLF
    # - убираем переносы строк
    # - обрезаем пробелы по краям
    # Это нужно, чтобы "Markdown", "Markdown\r" и " Markdown " обрабатывались одинаково.
    parse_mode="${parse_mode//$'\r'/}"
    parse_mode="${parse_mode//$'\n'/}"
    parse_mode="$(echo "$parse_mode" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

    # Нормализуем регистр для удобства и стабильности.
    # Так мы поддерживаем варианты вида markdown / MARKDOWN / markdownv2.
    case "$parse_mode" in
        html|HTML|Html) parse_mode="HTML" ;;
        markdown|MARKDOWN|Markdown) parse_mode="Markdown" ;;
        markdownv2|MARKDOWNV2|MarkdownV2|Markdownv2) parse_mode="MarkdownV2" ;;
    esac

    # Устанавливаем HTML как значение по умолчанию, если parse_mode не указан
    if [ -z "$parse_mode" ]; then
        parse_mode="HTML"
    fi

    if [ -z "$token" ] || [ -z "$chat_ids" ] || [ -z "$message" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_telegram_message token chat_ids message [parse_mode]" >&2
        return 1
    fi

    # Проверяем, что parse_mode имеет допустимое значение
    if [[ ! "$parse_mode" =~ ^(HTML|Markdown|MarkdownV2)$ ]]; then
        echo "Error: Invalid parse_mode. Must be one of: HTML, Markdown, MarkdownV2" >&2
        # Диагностика для CI: выводим "сырое" значение в безопасном виде (%q)
        # и длину строки. Это помогает быстро увидеть скрытые символы.
        printf 'Error: Received parse_mode=%q (length=%d)\n' "$parse_mode" "${#parse_mode}" >&2
        return 1
    fi

    # Разбиваем chat_ids по переносу строки
    while IFS= read -r chat_line; do
        # Разбиваем строку по запятой или слешу
        IFS=',/' read -r chat_id message_thread_id <<< "$chat_line"
        
        echo "Sending message to Telegram chat $chat_id"
        
        # Формируем базовый URL запроса
        local request_url="https://api.telegram.org/bot${token}/sendMessage"
        # Формируем тело запроса.
        # parse_mode добавляем только когда он реально задан.
        # Это позволяет легко сделать fallback без parse_mode.
        local request_data="chat_id=${chat_id}&text=${message}&disable_web_page_preview=true"
        if [ -n "$parse_mode" ]; then
            request_data="${request_data}&parse_mode=${parse_mode}"
        fi
        
        # Добавляем message_thread_id, если он есть
        if [ ! -z "$message_thread_id" ]; then
            request_data="${request_data}&message_thread_id=${message_thread_id}"
        fi
        
        RESPONSE=$(curl -s -X POST "$request_url" -d "$request_data")

        # Защита от частых ошибок Telegram при разборе Markdown/HTML.
        # Если в тексте есть "сломанная" сущность, Telegram возвращает:
        # "can't parse entities".
        # В этом случае повторяем отправку как plain text (без parse_mode),
        # чтобы сообщение не терялось из-за одного спецсимвола.
        if ! echo "$RESPONSE" | grep -q '"ok":true' && \
           echo "$RESPONSE" | grep -q "can't parse entities" && \
           [ -n "$parse_mode" ]; then
            echo "Warning: Telegram parse error for chat $chat_id, retrying without parse_mode" >&2
            local fallback_request_data="chat_id=${chat_id}&text=${message}&disable_web_page_preview=true"
            if [ ! -z "$message_thread_id" ]; then
                fallback_request_data="${fallback_request_data}&message_thread_id=${message_thread_id}"
            fi
            RESPONSE=$(curl -s -X POST "$request_url" -d "$fallback_request_data")
        fi

        if ! echo "$RESPONSE" | grep -q '"ok":true'; then
            echo "Error sending message to chat $chat_id: $RESPONSE" >&2
        fi
        
        # Добавляем небольшую задержку между отправками сообщений
        sleep 1
    done <<< "$chat_ids"
}
