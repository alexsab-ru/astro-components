#!/bin/bash

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$CSV_URL" ] && [ -f .env ]; then
    export CSV_URL=$(grep '^DEALER_CARS_PRICE_CSV_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [[ ! "$CSV_URL" =~ ^https?:// ]]; then
    echo "Error: DEALER_CARS_PRICE_CSV_URL is not found or empty"
    # Если IGNORE_ERRORS=1, не считаем это ошибкой
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
fi

# Устанавливаем остальные переменные
export QUERY_STRING="SELECT A, B, C, D"
export KEY_COLUMN="VIN"
export OUTPUT_PATHS="./src/data/dealer-cars_price.json"
export OUTPUT_FORMAT="detailed"

# Запускаем скрипт
node .github/scripts/GSheetFetcher.js
