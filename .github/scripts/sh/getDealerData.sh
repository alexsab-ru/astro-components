#!/bin/bash

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$DEALER_PRICE_CSV_URL" ] && [ -f .env ]; then
    export DEALER_PRICE_CSV_URL=$(grep '^DEALER_PRICE_CSV_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что CSV_URL установлен
if [ -z "$DEALER_PRICE_CSV_URL" ]; then
    echo "Error: CSV_URL is not set"
    exit 1
fi

# Устанавливаем остальные переменные
export QUERY_STRING="SELECT A, B, C, D"
export KEY_COLUMN="VIN"
export OUTPUT_PATHS="./src/data/cars_dealer_price.json"

# Запускаем скрипт
node .github/scripts/getDealerData.cjs
