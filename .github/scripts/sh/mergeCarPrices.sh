#!/bin/bash

# Читаем флаги из .env, если они не установлены снаружи
if [ -z "$DISABLE_FEED_PRICE" ] && [ -f .env ]; then
    export DISABLE_FEED_PRICE=$(grep '^DISABLE_FEED_PRICE=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

if [ -z "$DISABLE_FEED_BENEFIT" ] && [ -f .env ]; then
    export DISABLE_FEED_BENEFIT=$(grep '^DISABLE_FEED_BENEFIT=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

if [ -z "$DISABLE_GSHEET_PRICE" ] && [ -f .env ]; then
    export DISABLE_GSHEET_PRICE=$(grep '^DISABLE_GSHEET_PRICE=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

if [ -z "$DISABLE_GSHEET_BENEFIT" ] && [ -f .env ]; then
    export DISABLE_GSHEET_BENEFIT=$(grep '^DISABLE_GSHEET_BENEFIT=' .env | cut -d '=' -f 2- | sed 's/^"//; s/"$//')
fi

node .github/scripts/mergeCarPrices.js
