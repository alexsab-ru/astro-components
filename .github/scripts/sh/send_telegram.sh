#!/bin/bash
# send_telegram.sh

send_telegram_messages() {
    # Очищаем входные параметры от кавычек
    local token=$(trim_quotes "$1")
    local chat_ids=$(trim_quotes "$2")
    local total_parts=$(trim_quotes "$3")

    if [ -z "$token" ] || [ -z "$chat_ids" ] || [ -z "$total_parts" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: send_telegram_messages token chat_ids total_parts" >&2
        return 1
    fi

    # Разбиваем chat_ids по переносу строки
    while IFS= read -r chat_line; do
        # Разбиваем строку по запятой
        IFS=',' read -r chat_id message_thread_id <<< "$chat_line"
        
        for i in $(seq 0 $((total_parts - 1))); do
            if [ ! -f "./tmp_messages/part_${i}.txt" ]; then
                echo "Error: Message file part_${i}.txt not found" >&2
                continue
            fi

            MESSAGE=$(cat "./tmp_messages/part_${i}.txt")
            echo "Sending part $i to Telegram chat $chat_id"
            
            # Формируем базовый URL запроса
            local request_url="https://api.telegram.org/bot${token}/sendMessage"
            local request_data="chat_id=${chat_id}&parse_mode=HTML&text=${MESSAGE}&disable_web_page_preview=true"
            
            # Добавляем message_thread_id, если он есть
            if [ ! -z "$message_thread_id" ]; then
                request_data="${request_data}&message_thread_id=${message_thread_id}"
            fi
            
            RESPONSE=$(curl -s -X POST "$request_url" -d "$request_data")

            if ! echo "$RESPONSE" | grep -q '"ok":true'; then
                echo "Error sending message part $i to chat $chat_id: $RESPONSE" >&2
            fi
            
            # Добавляем небольшую задержку между отправками сообщений
            sleep 1
        done
    done <<< "$chat_ids"
}