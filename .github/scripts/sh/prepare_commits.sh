#!/bin/bash
# prepare_commits.sh

prepare_commits() {
    # Очищаем входные параметры от кавычек
    local repository_name=$(trim_quotes "$1")
    local ref_name=$(trim_quotes "$2")
    local before_sha=$(trim_quotes "$3")
    local after_sha=$(trim_quotes "$4")
    local actor=$(trim_quotes "$5")
    local repository=$(trim_quotes "$6")

    # Проверка наличия всех параметров
    if [ -z "$repository_name" ] || [ -z "$ref_name" ] || [ -z "$before_sha" ] || [ -z "$after_sha" ] || [ -z "$actor" ] || [ -z "$repository" ]; then
        echo "Error: Missing required parameters" >&2
        echo "Usage: prepare_commits repository_name ref_name before_sha after_sha actor repository" >&2
        return 1
    fi

    # Максимальная длина сообщения в Telegram
    local MAX_LENGTH=4096
    # Длина для эллипсиса и дополнительного пробела
    local ELLIPSIS_LENGTH=4
    
    # Инициализируем массив
    declare -a readarray

    if [ "$before_sha" = "0000000000000000000000000000000000000000" ]; then
        git fetch origin HEAD || { echo "Error: Failed to fetch git repository" >&2; return 1; }
        git checkout HEAD || { echo "Error: Failed to checkout HEAD" >&2; return 1; }
        
        # Читаем вывод git log в массив
        mapfile -t readarray < <(git log --pretty=format:"<code>%h</code> - %an, %ar : %s" "HEAD..${after_sha}")
        COMPARE_HASH="${after_sha}"
    else
        # Читаем вывод git log в массив
        mapfile -t readarray < <(git log --pretty=format:"<code>%h</code> - %an, %ar : %s" "${before_sha}..${after_sha}")
        COMPARE_HASH="${before_sha}..${after_sha}"
    fi

    TOTAL_COMMITS=${#readarray[@]}
    
    if [ "$TOTAL_COMMITS" -eq 1 ]; then
        COMMITS_TEXT="$TOTAL_COMMITS new commit"
    else
        COMMITS_TEXT="$TOTAL_COMMITS new commits"
    fi

    # Подготовка заголовка
    HEADER="<b>[${repository_name}:${ref_name}]</b> <b><a href=\"https://github.com/${repository}/compare/${COMPARE_HASH}\">$COMMITS_TEXT</a></b> by <b><a href=\"https://github.com/${actor}\">${actor}</a></b>"

    # Создаем временную директорию для сообщений
    mkdir -p ./tmp_messages || { echo "Error: Failed to create tmp_messages directory" >&2; return 1; }

    # Разбиваем сообщение на части по количеству символов
    PART_INDEX=0
    CHUNK="$HEADER\n\n"
    CURRENT_LENGTH=${#CHUNK}
    
    # Максимальная длина для одного коммита (с учетом заголовка и отступов)
    local MAX_COMMIT_LENGTH=$((MAX_LENGTH - ${#HEADER} - 2))

    for COMMIT in "${readarray[@]}"; do
        # Добавляем перевод строки к коммиту
        COMMIT_WITH_NEWLINE="$COMMIT\n"
        COMMIT_LENGTH=${#COMMIT_WITH_NEWLINE}

        # Проверяем длину коммита
        if [ $COMMIT_LENGTH -gt $MAX_COMMIT_LENGTH ]; then
            echo "Warning: Commit message is too long and will be truncated" >&2
            # Обрезаем коммит с учетом места под эллипсис
            COMMIT_WITH_NEWLINE="${COMMIT_WITH_NEWLINE:0:$((MAX_COMMIT_LENGTH - ELLIPSIS_LENGTH))} ...\n"
            COMMIT_LENGTH=${#COMMIT_WITH_NEWLINE}
        fi

        # Проверяем, поместится ли следующий коммит
        if ((CURRENT_LENGTH + COMMIT_LENGTH > MAX_LENGTH)); then
            # Сохраняем текущий чанк
            printf "%b" "$CHUNK" > "./tmp_messages/part_${PART_INDEX}.txt" || { echo "Error: Failed to write to file" >&2; return 1; }
            PART_INDEX=$((PART_INDEX + 1))
            
            # Начинаем новый чанк с заголовка
            CHUNK="$HEADER\n\n$COMMIT_WITH_NEWLINE"
            CURRENT_LENGTH=$((${#HEADER} + 2 + COMMIT_LENGTH))
        else
            # Добавляем коммит к текущему чанку
            CHUNK+="$COMMIT_WITH_NEWLINE"
            CURRENT_LENGTH=$((CURRENT_LENGTH + COMMIT_LENGTH))
        fi
    done

    # Сохраняем последний чанк, если он не пустой
    if [ "$CHUNK" != "$HEADER\n\n" ]; then
        printf "%b" "$CHUNK" > "./tmp_messages/part_${PART_INDEX}.txt" || { echo "Error: Failed to write to file" >&2; return 1; }
        PART_INDEX=$((PART_INDEX + 1))
    fi

    echo $PART_INDEX
}
