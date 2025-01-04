#!/bin/bash
# send_telegram.sh

send_telegram_messages() {
    # Очищаем входные параметры от кавычек
    local token=$(trim_quotes "$1")
    local chat_id=$(trim_quotes "$2")
    local total_parts=$(trim_quotes "$3")

    if [ -z "$token" ] || [ -z "$chat_id" ] || [ -z "$total_parts" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_telegram_messages token chat_id total_parts" >&2
        return 1
    fi

    for i in $(seq 0 $((total_parts - 1))); do
        if [ ! -f "./tmp_messages/part_${i}.txt" ]; then
            echo "Error: Message file part_${i}.txt not found" >&2
            continue
        fi

        MESSAGE=$(cat "./tmp_messages/part_${i}.txt")
        echo "Sending part $i to Telegram"
        
        RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" \
            -d "chat_id=${chat_id}" \
            -d "parse_mode=HTML" \
            -d "text=${MESSAGE}" \
            -d "disable_web_page_preview=true")

        if ! echo "$RESPONSE" | grep -q '"ok":true'; then
            echo "Error sending message part $i: $RESPONSE" >&2
        fi
        
        # Добавляем небольшую задержку между отправками сообщений
        sleep 1
    done
}