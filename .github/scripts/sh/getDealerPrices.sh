#!/bin/sh

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$DOWNLOAD_URL" ] && [ -f .env ]; then
    export DOWNLOAD_URL=$(grep '^DEALER_PRICE_CSV_URL=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: DEALER_PRICE_CSV_URL or USED_CARS_STORAGE_CSV_URL is not found"
    exit 1
fi

# Если QUERY_STRING не установлен, пытаемся получить его из .env
if [ -z "$QUERY_STRING" ] && [ -f .env ]; then
    export QUERY_STRING=$(grep '^DEALER_PRICE_CSV_COLUMN=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

# Проверяем, что QUERY_STRING установлен
if [ -z "$QUERY_STRING" ]; then
    echo "Error: DEALER_PRICE_CSV_COLUMN or USED_CARS_STORAGE_CSV_COLUMN is not found"
    exit 1
fi

# Кодируем QUERY_STRING для URL
export QUERY_STRING=$(echo "$QUERY_STRING" | sed 's/ /%20/g')

# Извлечение document_id с помощью sed
document_id=$(echo "$DOWNLOAD_URL" | sed -n 's/.*\/d\/\([^\/]*\)\/edit.*/\1/p')
# Извлечение gid с помощью sed
gid=$(echo "$DOWNLOAD_URL" | sed -n 's/.*gid=\([0-9]*\).*/\1/p')

export KEY_COLUMN="Модель"
export OUTPUT_PATHS="./src/data/models-dealer_price.json"


if [ -n "$document_id" ] && [ -n "$gid" ]; then
    # Формируем новый URL для скачивания
    export CSV_URL="https://docs.google.com/spreadsheets/d/${document_id}/gviz/tq?gid=${gid}&tqx=out:CSV&headers=1&tq=${QUERY_STRING}"
    
    echo "Преобразованный URL: $CSV_URL"

    node .github/scripts/getDealerPrices.js
else
    echo "Ошибка: URL не соответствует ожидаемому формату." >&2
    exit 1
fi
