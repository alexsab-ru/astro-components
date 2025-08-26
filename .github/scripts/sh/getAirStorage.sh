#!/bin/bash

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$CSV_URL" ] && [ -f .env ]; then
    export CSV_URL=$(grep '^AIR_STORAGE_CSV_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [[ ! "$CSV_URL" =~ ^https?:// ]]; then
    echo "Error: AIR_STORAGE_CSV_URL is not found or empty"
    # Если IGNORE_ERRORS=1, не считаем это ошибкой
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
fi

# Устанавливаем остальные переменные
export QUERY_STRING="SELECT A, B"
export KEY_COLUMN="VIN"
export OUTPUT_PATHS="./src/data/air_storage.json"
export OUTPUT_FORMAT="simple"

# Запускаем скрипт
node .github/scripts/GSheetFetcher.js
