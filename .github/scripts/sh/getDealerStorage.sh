#!/bin/bash

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$CSV_URL" ] && [ -f .env ]; then
    CSV_URL=$(grep '^DEALER_STORAGE_CSV_URL=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [ -z "$CSV_URL" ]; then
    echo "Error: DEALER_STORAGE_CSV_URL or USED_CARS_STORAGE_CSV_URL is not found"
    exit 1
fi

# Если QUERY_STRING не установлен, пытаемся получить его из .env
if [ -z "$QUERY_STRING" ] && [ -f .env ]; then
    QUERY_STRING=$(grep '^DEALER_STORAGE_CSV_COLUMN=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

# Проверяем, что QUERY_STRING установлен
if [ -z "$QUERY_STRING" ]; then
    echo "Error: DEALER_STORAGE_CSV_COLUMN or USED_CARS_STORAGE_CSV_COLUMN is not found"
    exit 1
fi

# Кодируем QUERY_STRING для URL
QUERY_STRING=$(echo "$QUERY_STRING" | sed 's/ /%20/g')

# Регулярное выражение для извлечения идентификатора документа и gid
regex=".*/d/([^/]+)/edit.*gid=([0-9]+)"

echo "Исходный URL: $CSV_URL"
echo "соответствие: $CSV_URL =~ $regex"

if [[ $CSV_URL =~ $regex ]]; then
    # Извлекаем document_id и gid из URL
    document_id="${BASH_REMATCH[1]}"
    gid="${BASH_REMATCH[2]}"
    
    # Формируем новый URL для скачивания
    DOWNLOAD_URL="https://docs.google.com/spreadsheets/d/${document_id}/gviz/tq?gid=${gid}&tqx=out:CSV&headers=1&tq=${QUERY_STRING}"
    
    echo "Преобразованный URL: $DOWNLOAD_URL"

    # Раскомментируйте для скачивания и обработки
    curl "$DOWNLOAD_URL" -o data.csv
    python3 .github/scripts/CarFeedProcessorCSV.py
else
    echo "Ошибка: URL не соответствует ожидаемому формату." >&2
    exit 1
fi
