#!/bin/bash

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

# Получаем пути из .env файла
JSON_PATH=$(cat .env | grep JSON_PATH= | cut -d '=' -f 2)
DOMAIN_NAME=$(cat .env | grep DOMAIN= | cut -d '=' -f 2)

echo "Using JSON_PATH: $JSON_PATH"
echo "Using DOMAIN_NAME: $DOMAIN_NAME"

# Список файлов для скачивания
FILES=(
    "banners.json"
    "cars.json"
    "faq.json"
    "models-sections.yml"
    "models.json"
    "reviews.json"
    "salons.json"
    "scripts.json"
    "seo.json"
    "services.json"
    "settings.json"
    "socials.json"
    "special-services.json"
)

# Создаем директорию для данных
mkdir -p src/data

# Скачиваем каждый файл
for file in "${FILES[@]}"; do
    echo "Checking file: $file"
    if curl --output /dev/null --silent --fail -r 0-0 "$JSON_PATH/$DOMAIN_NAME/data/$file"; then
        echo "Downloading $file..."
        curl "$JSON_PATH/$DOMAIN_NAME/data/$file" -o "src/data/$file"
        echo "Successfully downloaded $file"
    else
        echo "\n${BGRED}File not found, skipping...${Color_Off}\n"
    fi
done

# Запускаем скрипт для замены плейсхолдеров
echo "Running placeholder replacement script..."
# node .github/scripts/replacePlaceholdersInJson.js
ls -al src/data
