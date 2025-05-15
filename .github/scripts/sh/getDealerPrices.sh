#!/bin/bash

# Если DEALER_PRICE_CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$CSV_URL" ] && [ -f .env ]; then
    export CSV_URL=$(grep '^DEALER_PRICE_CSV_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [ -z "$CSV_URL" ]; then
    echo "Error: DEALER_PRICE_CSV_URL is not found"
    exit 0
fi

# Если QUERY_STRING не установлен, пытаемся получить его из .env
if [ -z "$QUERY_STRING" ] && [ -f .env ]; then
    export QUERY_STRING=$(grep '^DEALER_PRICE_CSV_COLUMN=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

# Проверяем, что QUERY_STRING установлен
if [ -z "$QUERY_STRING" ]; then
    echo "Error: DEALER_PRICE_CSV_COLUMN is not found"
    exit 0
fi

# Если KEY_MAPPING не установлен, пытаемся получить его из .env
if [ -z "$KEY_MAPPING" ] && [ -f .env ]; then
    export KEY_MAPPING=$(grep '^DEALER_PRICE_KEY_MAPPING=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что KEY_MAPPING установлен
if [ -z "$KEY_MAPPING" ]; then
    echo "Error: DEALER_PRICE_KEY_MAPPING is not found"
    # exit 1
fi

# Устанавливаем остальные переменные
export KEY_COLUMN="Модель"
export OUTPUT_PATHS="./src/data/dealer-models_price.json"
# export OUTPUT_FORMAT="simple"
export OUTPUT_FORMAT="detailed"

# Запускаем скрипт
node .github/scripts/GSheetFetcher.js
