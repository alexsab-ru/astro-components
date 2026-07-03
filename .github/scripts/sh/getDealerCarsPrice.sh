#!/bin/bash

get_env_value() {
    local key="$1"
    local value="${!key}"
    if [ -n "$value" ]; then
        echo "$value"
        return 0
    fi

    if [ -f .env ]; then
        grep "^${key}=" .env | tail -n 1 | cut -d '=' -f 2- | sed 's/^"//; s/"$//; s/^'\''//; s/'\''$//'
    fi
}

# Если CSV_URL не установлен, пытаемся получить его из .env
if [ -z "$CSV_URL" ] && [ -f .env ]; then
    export CSV_URL=$(grep '^DEALER_CARS_PRICE_CSV_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

export DEALER_CARS_PRICE_OVERRIDE="$(get_env_value "DEALER_CARS_PRICE_OVERRIDE")"
DEALER_CARS_PRICE_OVERRIDE_NORMALIZED=$(echo "$DEALER_CARS_PRICE_OVERRIDE" | tr '[:upper:]' '[:lower:]')

if [ -z "$DEALER_CARS_PRICE_OVERRIDE_NORMALIZED" ]; then
    echo "Проброс отключен, укажите явно значение ключа DEALER_CARS_PRICE_OVERRIDE=true или DEALER_CARS_PRICE_OVERRIDE=false"
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
fi

if [ "$DEALER_CARS_PRICE_OVERRIDE_NORMALIZED" != "true" ] && [ "$DEALER_CARS_PRICE_OVERRIDE_NORMALIZED" != "false" ]; then
    echo "Error: DEALER_CARS_PRICE_OVERRIDE must be explicitly true or false"
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
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
export OUTPUT_PATHS="./src/data/site/dealer-cars_price.json"
export OUTPUT_FORMAT="detailed"

# Запускаем скрипт
if ! node .github/scripts/GSheetFetcher.js; then
    if [ "$IGNORE_ERRORS" = "1" ]; then
        echo "IGNORE_ERRORS=1: Пропускаем ошибку GSheetFetcher.js и продолжаем выполнение"
        exit 0
    else
        exit 1
    fi
fi
