#!/bin/bash
# prepare_commits.sh

########################################
# Функция для сбора коммитов из git log
# Принимает параметры:
#   repository_name, ref_name, before_sha, after_sha, actor, repository
# Результат: глобальные переменные COMMIT_ARRAY и COMPARE_HASH
########################################
collect_commits() {
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
    
    # Инициализируем массив
    local commits=()
    # Инициализируем строку для запоминания хеша
    local compare_hash=""

    if [ "$before_sha" = "0000000000000000000000000000000000000000" ]; then
        git fetch origin HEAD || { echo "Error: Failed to fetch git repository" >&2; return 1; }
        git checkout HEAD || { echo "Error: Failed to checkout HEAD" >&2; return 1; }
        
        # Читаем вывод git log в массив
        mapfile -t commits < <(git log --pretty=format:"<code>%h</code> - %an, %ar : %s" "HEAD..${after_sha}")
        compare_hash="${after_sha}"
    else
        # Читаем вывод git log в массив
        mapfile -t commits < <(git log --pretty=format:"<code>%h</code> - %an, %ar : %s" "${before_sha}..${after_sha}")
        compare_hash="${before_sha}..${after_sha}"
    fi

    # Сохраняем результат в глобальные переменные
    COMMIT_ARRAY=("${commits[@]}")
    COMPARE_HASH="$compare_hash"
    return 0
}

########################################
# Функция для создания заголовка и разделения текста на части
# Принимает:
#   repository_name, ref_name, actor, repository, compare_hash и массив commit_messages
# Результат: разбитые чанки сохраняются в ./tmp_messages/part_X.txt,
#          функция возвращает количество частей.
########################################
prepare_commits_message() {
    local repository_name=$(trim_quotes "$1")
    local ref_name=$(trim_quotes "$2")
    local actor=$(trim_quotes "$3")
    local repository=$(trim_quotes "$4")
    local compare_hash=$(trim_quotes "$5")
    shift 5
    local commit_messages=("$@")
    
    # Максимальная длина сообщения в Telegram
    local MAX_LENGTH=4096
    # Длина для эллипсиса и дополнительного пробела
    local ELLIPSIS_LENGTH=4

    local TOTAL_COMMITS=${#commit_messages[@]}
    
    # Подготовка заголовка
    if [ -z "$compare_hash" ]; then
        # Формат для одиночного коммита или кастомного сообщения
        HEADER="<b>[${repository_name}:${ref_name}]</b> <b><a href=\"https://github.com/${repository}/commit/$(git rev-parse HEAD)\">Last commit</a></b>"
    else
        # Формат для множества коммитов
        if [ "$TOTAL_COMMITS" -eq 1 ]; then
            COMMITS_TEXT="$TOTAL_COMMITS new commit"
        else
            COMMITS_TEXT="$TOTAL_COMMITS new commits"
        fi
        HEADER="<b>[${repository_name}:${ref_name}]</b> <b><a href=\"https://github.com/${repository}/compare/${compare_hash}\">$COMMITS_TEXT</a></b> by <b><a href=\"https://github.com/${actor}\">${actor}</a></b>"
    fi

    # Создаем временную директорию для сообщений
    mkdir -p ./tmp_messages || { echo "Error: Failed to create tmp_messages directory" >&2; return 1; }

    # Разбиваем сообщение на части по количеству символов
    local PART_INDEX=0
    local CHUNK="$HEADER\n\n"
    local CURRENT_LENGTH=${#CHUNK}
    
    # Максимальная длина для одного коммита (с учетом заголовка и отступов)
    local MAX_COMMIT_LENGTH=$((MAX_LENGTH - ${#HEADER} - 2))

    for COMMIT in "${commit_messages[@]}"; do
        # Добавляем перевод строки к коммиту
        COMMIT_WITH_NEWLINE="$COMMIT\n"
        COMMIT_LENGTH=${#COMMIT_WITH_NEWLINE}

        # Проверяем длину коммита
        if [ $COMMIT_LENGTH -gt $MAX_COMMIT_LENGTH ]; then
            echo "Warning: Commit message is too long and will be truncated" >&2
            
            # Получаем все открытые и закрытые теги
            local opened_tags=($(get_opened_tags "$COMMIT_WITH_NEWLINE"))
            local closed_tags=($(get_closed_tags "$COMMIT_WITH_NEWLINE"))
            
            # Создаем массив для отслеживания открытых тегов
            local tag_stack=()
            
            # Заполняем стек открытыми тегами
            for tag in "${opened_tags[@]}"; do
                tag_stack+=("$tag")
            done
            
            # Удаляем закрытые теги из стека
            for tag in "${closed_tags[@]}"; do
                for i in "${!tag_stack[@]}"; do
                    if [[ "${tag_stack[$i]}" == "$tag" ]]; then
                        unset 'tag_stack[$i]'
                        break
                    fi
                done
            done
            
            # Обрезаем коммит с учетом места под эллипсис
            local truncated_commit="${COMMIT_WITH_NEWLINE:0:$((MAX_COMMIT_LENGTH - ELLIPSIS_LENGTH))} ..."
            
            # Закрываем все открытые теги в обратном порядке
            for ((i=${#tag_stack[@]}-1; i>=0; i--)); do
                truncated_commit+="</${tag_stack[$i]}>"
            done
            
            COMMIT_WITH_NEWLINE="${truncated_commit}\n"
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

########################################
# Функция для получения всех открытых HTML тегов из строки
# Принимает строку и возвращает массив открытых тегов
########################################
get_opened_tags() {
    local input="$1"
    local opened_tags=()
    
    # Ищем все открывающие теги
    while [[ $input =~ \<([a-z]+)[\>] ]]; do
        local tag="${BASH_REMATCH[1]}"
        # Проверяем, что это не самозакрывающийся тег
        if [[ ! $tag =~ ^(img|br|hr|input|meta|link)$ ]]; then
            opened_tags+=("$tag")
        fi
        # Удаляем найденный тег из строки для следующей итерации
        input="${input#*<}"
    done
    
    echo "${opened_tags[@]}"
}

########################################
# Функция для получения всех закрытых HTML тегов из строки
# Принимает строку и возвращает массив закрытых тегов
########################################
get_closed_tags() {
    local input="$1"
    local closed_tags=()
    
    # Ищем все закрывающие теги
    while [[ $input =~ \<\/([a-z]+)[\>] ]]; do
        local tag="${BASH_REMATCH[1]}"
        closed_tags+=("$tag")
        # Удаляем найденный тег из строки для следующей итерации
        input="${input#*</}"
    done
    
    echo "${closed_tags[@]}"
}
