#!/bin/sh

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$CSV_URL" ] && [ -f .env ]; then
    CSV_URL=$(grep '^DEALER_STORAGE_CSV_URL=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [[ ! "$CSV_URL" =~ ^https?:// ]]; then
    echo "Error: DEALER_STORAGE_CSV_URL or USED_CARS_STORAGE_CSV_URL is not found or empty"
    # Если IGNORE_ERRORS=1, не считаем это ошибкой
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
fi

# Если QUERY_STRING не установлен, пытаемся получить его из .env
if [ -z "$QUERY_STRING" ] && [ -f .env ]; then
    QUERY_STRING=$(grep '^DEALER_STORAGE_CSV_COLUMN=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

# Проверяем, что QUERY_STRING установлен
if [ -z "$QUERY_STRING" ]; then
    echo "Error: DEALER_STORAGE_CSV_COLUMN or USED_CARS_STORAGE_CSV_COLUMN is not found"
    # Если IGNORE_ERRORS=1, не считаем это ошибкой
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
fi

# Кодируем QUERY_STRING для URL
QUERY_STRING=$(echo "$QUERY_STRING" | sed 's/ /%20/g')

# Извлечение document_id с помощью sed
document_id=$(echo "$CSV_URL" | sed -n 's/.*\/d\/\([^\/]*\)\/edit.*/\1/p')
# Извлечение gid с помощью sed
gid=$(echo "$CSV_URL" | sed -n 's/.*gid=\([0-9]*\).*/\1/p')

if [ -n "$document_id" ] && [ -n "$gid" ]; then
    # Формируем новый URL для скачивания
    DOWNLOAD_URL="https://docs.google.com/spreadsheets/d/${document_id}/gviz/tq?gid=${gid}&tqx=out:CSV&headers=1&tq=${QUERY_STRING}"
    
    echo "Преобразованный URL: $DOWNLOAD_URL"

    # Путь к сохраняемому CSV-файлу (можно переопределить через ENV)
    CSV_FILE_PATH=${CSV_FILE_PATH:-data.csv}
    # Путь к выходному XML-файлу (можно переопределить через ENV)
    XML_FILE_PATH=${XML_FILE_PATH:-cars.xml}

    # Проверяем и создаём директории для файлов, если их нет
    CSV_DIR=$(dirname "$CSV_FILE_PATH")
    XML_DIR=$(dirname "$XML_FILE_PATH")
    [ ! -d "$CSV_DIR" ] && mkdir -p "$CSV_DIR"
    [ ! -d "$XML_DIR" ] && mkdir -p "$XML_DIR"

    # Раскомментируйте для скачивания и обработки
    curl "$DOWNLOAD_URL" -o "$CSV_FILE_PATH"
    # Передаем путь к CSV и XML в Python-скрипт
    python3 .github/scripts/CarFeedProcessorCSV.py --csv "$CSV_FILE_PATH" --xml "$XML_FILE_PATH"

    # Имя переменной для .env (по умолчанию XML_URL_DATA_CARS_CAR)
    XML_ENV_VAR_NAME=${XML_ENV_VAR_NAME:-XML_URL_DATA_CARS_CAR}

    if [ -f "$XML_FILE_PATH" ]; then
        if ! grep -q "^${XML_ENV_VAR_NAME}=./$XML_FILE_PATH" .env; then
            echo "${XML_ENV_VAR_NAME}=$XML_FILE_PATH" >> .env
            echo "file $XML_FILE_PATH added to .env as $XML_ENV_VAR_NAME"
        else
            echo "file $XML_FILE_PATH already exists in .env as $XML_ENV_VAR_NAME"
        fi
    fi
else
    echo "Ошибка: URL не соответствует ожидаемому формату." >&2
    # Если IGNORE_ERRORS=1, не считаем это ошибкой
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
fi
