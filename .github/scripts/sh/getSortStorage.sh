#!/bin/bash

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$AIR_STORAGE_CSV_URL" ] && [ -f .env ]; then
    export CSV_URL=$(grep '^SORT_STORAGE_CSV_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [ -z "$CSV_URL" ]; then
    echo "Error: SORT_STORAGE_CSV_URL is not found"
    exit 1
fi

# Устанавливаем остальные переменные
export QUERY_STRING="SELECT A, B"
export KEY_COLUMN="VIN"
export OUTPUT_PATHS="./sort_storage.json"
export OUTPUT_FORMAT="simple"

# Запускаем скрипт
node .github/scripts/GSheetFetcher.js
