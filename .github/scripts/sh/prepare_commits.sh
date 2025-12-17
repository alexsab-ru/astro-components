#!/bin/bash
# prepare_commits.sh

EMPTY_SHA="0000000000000000000000000000000000000000"

########################################
# Определяет основную ветку origin
# Приоритет: BASE_BRANCH/DEFAULT_BRANCH env vars,
# затем origin/HEAD, затем популярные ветки.
########################################
detect_default_branch() {
    if [ -n "${BASE_BRANCH:-}" ]; then
        echo "${BASE_BRANCH}"
        return 0
    fi

    if [ -n "${DEFAULT_BRANCH:-}" ]; then
        echo "${DEFAULT_BRANCH}"
        return 0
    fi

    local head_ref
    head_ref=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null || true)
    if [ -n "$head_ref" ]; then
        head_ref=${head_ref#refs/remotes/origin/}
        echo "$head_ref"
        return 0
    fi

    local head_branch
    head_branch=$(git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')
    if [ -n "$head_branch" ]; then
        echo "$head_branch"
        return 0
    fi

    for candidate in develop main master; do
        if git show-ref --verify --quiet "refs/remotes/origin/$candidate"; then
            echo "$candidate"
            return 0
        fi
    done

    echo ""
}

########################################
# Обеспечивает наличие удалённой ветки локально
########################################
ensure_remote_branch() {
    local branch="$1"
    if [ -z "$branch" ]; then
        return 1
    fi

    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        return 0
    fi

    git fetch origin "${branch}:refs/remotes/origin/${branch}" >/dev/null 2>&1
}

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
    local -a commits=()
    # Инициализируем строку для запоминания хеша
    local compare_hash=""

    local git_range=""
    if [ "$before_sha" = "$EMPTY_SHA" ]; then
        local base_branch=""
        base_branch=$(detect_default_branch)

        local merge_base=""
        if [ -n "$base_branch" ]; then
            if ensure_remote_branch "$base_branch"; then
                merge_base=$(git merge-base "$after_sha" "origin/$base_branch" 2>/dev/null || true)
            else
                echo "Warning: Failed to fetch base branch '$base_branch'. Falling back to single commit range." >&2
            fi
        fi

        if [ -n "$merge_base" ]; then
            if [ "$merge_base" = "$after_sha" ]; then
                git_range=""
                compare_hash=""
            else
                git_range="${merge_base}..${after_sha}"
                compare_hash="${merge_base}..${after_sha}"
            fi
        else
            git_range="${after_sha}^!"
            compare_hash=""
        fi
    else
        git_range="${before_sha}..${after_sha}"
        compare_hash="${before_sha}..${after_sha}"
    fi

    # Читаем вывод git log в массив (поддерживает bash и zsh)
    if [ -n "$git_range" ]; then
        while IFS= read -r commit_line || [ -n "$commit_line" ]; do
            [ -n "$commit_line" ] && commits+=("$commit_line")
        done < <(git log --pretty=format:"<code>%h</code> - %an, %ar : %s" "$git_range")
    fi

    # Сохраняем результат в глобальные переменные
    if [ ${#commits[@]} -gt 0 ]; then
        COMMIT_ARRAY=("${commits[@]}")
    else
        COMMIT_ARRAY=()
    fi
    COMPARE_HASH="$compare_hash"
    return 0
}

########################################
# Функция для создания заголовка и разделения текста на части
# Принимает:
#   repository_name, ref_name, actor, repository, compare_hash, include_header и массив commit_messages
# Результат: разбитые чанки сохраняются в ./tmp_messages/part_X.txt,
#          функция возвращает количество частей.
########################################
prepare_commits_message() {
    local repository_name=$(trim_quotes "$1")
    local ref_name=$(trim_quotes "$2")
    local actor=$(trim_quotes "$3")
    local repository=$(trim_quotes "$4")
    local compare_hash=$(trim_quotes "$5")
    local include_header=$(trim_quotes "$6")
    shift 6
    local commit_messages=("$@")
    
    # Приводим include_header к нормализованному виду (по умолчанию true)
    if [ -z "$include_header" ]; then
        include_header="true"
    fi
    local include_header_normalized=$(printf '%s' "$include_header" | tr '[:upper:]' '[:lower:]')
    case "$include_header_normalized" in
        true|1|yes|on)
            include_header="true"
            ;;
        false|0|no|off)
            include_header="false"
            ;;
        *)
            echo "Warning: Unknown include_header value '$include_header'. Defaulting to true." >&2
            include_header="true"
            ;;
    esac
    
    # Максимальная длина сообщения в Telegram
    local MAX_LENGTH=4096
    # Длина для эллипсиса и дополнительного пробела
    local ELLIPSIS_LENGTH=4

    local TOTAL_COMMITS=${#commit_messages[@]}
    
    # Подготовка заголовка (включаем только если include_header = true)
    # Новая переменная include_header позволяет контролировать отображение заголовка
    # По умолчанию заголовок включен (true), но может быть отключен (false)
    if [ "$include_header" = "true" ]; then
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
    else
        # Если заголовок не нужен, устанавливаем пустую строку
        HEADER=""
    fi

    # Создаем временную директорию для сообщений
    mkdir -p ./tmp_messages || { echo "Error: Failed to create tmp_messages directory" >&2; return 1; }

    # Разбиваем сообщение на части по количеству символов
    local PART_INDEX=0
    
    # Формируем начальный чанк в зависимости от наличия заголовка
    if [ -n "$HEADER" ]; then
        local CHUNK="$HEADER\n\n"
        local CURRENT_LENGTH=${#CHUNK}
        # Максимальная длина для одного коммита (с учетом заголовка и отступов)
        local MAX_COMMIT_LENGTH=$(($MAX_LENGTH - ${#HEADER} - 30))
    else
        local CHUNK=""
        local CURRENT_LENGTH=0
        # Максимальная длина для одного коммита (без заголовка)
        local MAX_COMMIT_LENGTH=$(($MAX_LENGTH - 30))
    fi

    if [ $TOTAL_COMMITS -gt 0 ]; then
        for COMMIT in "${commit_messages[@]}"; do
            # Добавляем перевод строки к коммиту
            COMMIT_WITH_NEWLINE="$COMMIT\n"
            COMMIT_LENGTH=${#COMMIT_WITH_NEWLINE}

            # Проверяем длину коммита
            if [ $COMMIT_LENGTH -gt $MAX_COMMIT_LENGTH ]; then
                echo "Warning: Commit message is too long and will be truncated" >&2
                            
                # Обрезаем коммит с учетом места под эллипсис
                local truncated_commit="${COMMIT_WITH_NEWLINE:0:$(($MAX_COMMIT_LENGTH - $ELLIPSIS_LENGTH))} ..."
                
                # Получаем все открытые теги с учетом вложенности
                local opened_tags_result=$(get_opened_tags "$truncated_commit")

                # Закрываем все открытые теги в обратном порядке (LIFO)
                if [ -n "$opened_tags_result" ]; then
                    echo "DEBUG: Found open tags: '$opened_tags_result'" >&2
                    
                    # Строим закрывающие теги в обратном порядке
                    local tags_to_close=""
                    local remaining_tags="$opened_tags_result"
                    
                    # Берем теги с конца строки
                    while [ -n "$remaining_tags" ]; do
                        if [[ "$remaining_tags" == *" "* ]]; then
                            # Есть еще теги - берем последний
                            local last_tag="${remaining_tags##* }"
                            remaining_tags="${remaining_tags% *}"
                            echo "DEBUG: Processing tag: '$last_tag'" >&2
                            tags_to_close="${tags_to_close}</$last_tag>"
                        else
                            # Последний тег
                            echo "DEBUG: Processing last tag: '$remaining_tags'" >&2
                            tags_to_close="${tags_to_close}</$remaining_tags>"
                            break
                        fi
                    done
                    
                    echo "DEBUG: Tags to close: '$tags_to_close'" >&2
                    truncated_commit="${truncated_commit}${tags_to_close}"
                else
                    echo "DEBUG: No open tags found" >&2
                fi

                
                COMMIT_WITH_NEWLINE="${truncated_commit}\n"
                COMMIT_LENGTH=${#COMMIT_WITH_NEWLINE}
            fi

            # Проверяем, поместится ли следующий коммит (заменили bash-специфичную конструкцию)
            local total_length=$(($CURRENT_LENGTH + $COMMIT_LENGTH))
            if [ $total_length -gt $MAX_LENGTH ]; then
                # Сохраняем текущий чанк
                printf "%b" "$CHUNK" > "./tmp_messages/part_${PART_INDEX}.txt" || { echo "Error: Failed to write to file" >&2; return 1; }
                PART_INDEX=$(($PART_INDEX + 1))
                
                # Начинаем новый чанк с заголовка (если он есть)
                if [ -n "$HEADER" ]; then
                    CHUNK="$HEADER\n\n$COMMIT_WITH_NEWLINE"
                    CURRENT_LENGTH=$((${#HEADER} + 2 + $COMMIT_LENGTH))
                else
                    CHUNK="$COMMIT_WITH_NEWLINE"
                    CURRENT_LENGTH=$COMMIT_LENGTH
                fi
            else
                # Добавляем коммит к текущему чанку
                CHUNK="${CHUNK}${COMMIT_WITH_NEWLINE}"
                CURRENT_LENGTH=$(($CURRENT_LENGTH + $COMMIT_LENGTH))
            fi
        done
    fi

    # Сохраняем последний чанк, если он не пустой
    if [ -n "$HEADER" ]; then
        # Если есть заголовок, проверяем что чанк не равен только заголовку
        if [ "$CHUNK" != "$HEADER\n\n" ]; then
            printf "%b" "$CHUNK" > "./tmp_messages/part_${PART_INDEX}.txt" || { echo "Error: Failed to write to file" >&2; return 1; }
            PART_INDEX=$(($PART_INDEX + 1))
        fi
    else
        # Если заголовка нет, сохраняем чанк если он не пустой
        if [ -n "$CHUNK" ]; then
            printf "%b" "$CHUNK" > "./tmp_messages/part_${PART_INDEX}.txt" || { echo "Error: Failed to write to file" >&2; return 1; }
            PART_INDEX=$(($PART_INDEX + 1))
        fi
    fi

    echo $PART_INDEX
}

########################################
# Функция для получения всех открытых HTML тегов из строки
# Максимально простая версия без отладки
########################################
get_opened_tags() {
    local input="$1"
    
    # Создаем временный файл для работы
    local temp_file=$(mktemp)
    local result_file=$(mktemp)
    
    # Записываем входные данные во временный файл
    printf '%s\n' "$input" > "$temp_file"
    
    # Обрабатываем в отдельном процессе
    (
        stack=""
        
        while IFS= read -r line || [ -n "$line" ]; do
            # Пропускаем пустые строки
            [ -z "$line" ] && continue
            
            # Извлекаем все теги
            tags=$(printf '%s\n' "$line" | grep -oE '<[^>]+>' 2>/dev/null || true)
            [ -z "$tags" ] && continue
            
            printf '%s\n' "$tags" | while IFS= read -r tag_match; do
                [ -z "$tag_match" ] && continue
                
                # Определяем тип тега
                if [[ $tag_match == "</"* ]]; then
                    # Закрывающий тег
                    tag_name=$(printf '%s' "$tag_match" | sed 's|^</||; s|>.*||; s| .*||')
                    
                    # Удаляем из стека (простая замена)
                    if [[ "$stack" == *"|$tag_name|"* ]]; then
                        stack=$(printf '%s' "$stack" | sed "s/|$tag_name|/|/")
                    elif [[ "$stack" == "$tag_name|"* ]]; then
                        stack=$(printf '%s' "$stack" | sed "s/^$tag_name|//")
                    elif [[ "$stack" == *"|$tag_name" ]]; then
                        stack=$(printf '%s' "$stack" | sed "s/|$tag_name$//")
                    elif [[ "$stack" == "$tag_name" ]]; then
                        stack=""
                    fi
                else
                    # Открывающий тег
                    tag_name=$(printf '%s' "$tag_match" | sed 's|^<||; s|>.*||; s| .*||')
                    
                    # Пропускаем самозакрывающиеся теги
                    case "$tag_name" in
                        img|br|hr|input|meta|link) continue ;;
                    esac
                    
                    # Добавляем в стек
                    if [ -z "$stack" ]; then
                        stack="$tag_name"
                    else
                        stack="$stack|$tag_name"
                    fi
                fi
            done
        done < "$temp_file"
        
        # Выводим результат
        if [ -n "$stack" ]; then
            printf '%s' "$stack" | tr '|' ' '
        fi
    ) > "$result_file" 2>/dev/null
    
    # Читаем результат
    cat "$result_file" 2>/dev/null
    
    # Очищаем временные файлы
    rm -f "$temp_file" "$result_file" 2>/dev/null
}

########################################
# Функция для разделения текста на массив по двойным переносам строк
# Принимает: текст
# Результат: глобальная переменная TEXT_ARRAY
########################################
split_text_to_array() {
    local input_text="$1"
    
    # Очищаем массив
    TEXT_ARRAY=()
    
    # Если текст пустой, возвращаем пустой массив
    if [ -z "$input_text" ]; then
        return 0
    fi
    
    # Создаем временный файл для работы
    local temp_input=$(mktemp)
    local temp_output=$(mktemp)
    
    # Записываем входной текст
    printf '%s' "$input_text" > "$temp_input"
    
    # Используем Python для разделения по двойным переносам с сохранением одинарных
    python3 -c "
import sys
import re

# Читаем весь текст
with open('$temp_input', 'r') as f:
    text = f.read()

# Разделяем по двойным переносам (двум или более подряд идущим \n)
chunks = re.split(r'\n\s*\n', text)

# Обрабатываем каждую часть
for chunk in chunks:
    chunk = chunk.strip()
    if chunk:
        print('|||CHUNK_START|||')
        # Выводим chunk как есть, сохраняя одинарные переносы
        print(f'\n{chunk}\n')
        print('|||CHUNK_END|||')
" > "$temp_output"

    # Читаем результат с сохранением переносов строк
    local current_chunk=""
    local in_chunk=false
    
    while IFS= read -r line || [ -n "$line" ]; do
        if [ "$line" = "|||CHUNK_START|||" ]; then
            in_chunk=true
            current_chunk=""
        elif [ "$line" = "|||CHUNK_END|||" ]; then
            if [ -n "$current_chunk" ]; then
                TEXT_ARRAY+=("$current_chunk")
            fi
            in_chunk=false
            current_chunk=""
        elif [ "$in_chunk" = true ]; then
            # Добавляем строку с переносом (совместимо с zsh)
            if [ -z "$current_chunk" ]; then
                current_chunk="$line"
            else
                current_chunk="${current_chunk}
${line}"
            fi
        fi
    done < "$temp_output"
    
    # Очищаем временные файлы
    rm -f "$temp_input" "$temp_output" 2>/dev/null
    
    return 0
}
