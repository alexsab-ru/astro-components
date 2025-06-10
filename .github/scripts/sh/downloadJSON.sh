#!/bin/bash

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

# Функция для отображения справки
show_help() {
    echo "Usage: $0 [OPTIONS] [FILE]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -f, --file     Specify a single file to download"
    echo
    echo "Available files:"
    echo "  banners.json"
    echo "  cars.json"
    echo "  faq.json"
    echo "  federal-models_price.json"
    echo "  models-sections.yml"
    echo "  models.json"
    echo "  reviews.json"
    echo "  salons.json"
    echo "  scripts.json"
    echo "  seo.json"
    echo "  services.json"
    echo "  settings.json"
    echo "  socials.json"
    echo "  special-services.json"
    echo
    echo "Examples:"
    echo "  $0                   # Download all files"
    echo "  $0 -f cars.json      # Download only cars.json"
    echo "  $0 --file faq.json   # Download only faq.json"
}

# Список файлов для скачивания
FILES=(
    "banners.json"
    "cars.json"
    "faq.json"
    "federal-models_price.json"
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

# Обработка параметров командной строки
SPECIFIC_FILE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--file)
            SPECIFIC_FILE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Если JSON_PATH не установлен, пытаемся получить его из .env
if [ -z "$JSON_PATH" ] && [ -f .env ]; then
    export JSON_PATH=$(grep '^JSON_PATH=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что JSON_PATH установлен
if [ -z "$JSON_PATH" ]; then
    echo "Error: JSON_PATH is not found"
    exit 1
fi

# Если DOMAIN не установлен, пытаемся получить его из .env
if [ -z "$DOMAIN" ] && [ -f .env ]; then
    export DOMAIN=$(grep '^DOMAIN=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
fi

# Проверяем, что DOMAIN установлен
if [ -z "$DOMAIN" ]; then
    echo "Error: DOMAIN is not found"
    exit 1
fi

echo "Using JSON_PATH: $JSON_PATH"
echo "Using DOMAIN: $DOMAIN"

# Создаем директорию для данных
mkdir -p src/data

# Функция для скачивания файла
download_file() {
    local file=$1
    printf "\nChecking file: $file\n"
    if curl --output /dev/null --silent --fail -r 0-0 "$JSON_PATH/$DOMAIN/data/$file"; then
        printf "Downloading $file...\n"
        curl "$JSON_PATH/$DOMAIN/data/$file" -o "src/data/$file"
        printf "${BGGREEN}Successfully downloaded $file${Color_Off}\n"
    else
        printf "\n${BGRED}File $file not found, skipping...${Color_Off}\n"
    fi
}

# Скачиваем файлы
if [ -n "$SPECIFIC_FILE" ]; then
    # Проверяем, существует ли указанный файл в списке
    if [[ " ${FILES[@]} " =~ " ${SPECIFIC_FILE} " ]]; then
        download_file "$SPECIFIC_FILE"
    else
        printf "${BGRED}Error: File '$SPECIFIC_FILE' is not in the list of available files${Color_Off}\n"
        show_help
        exit 1
    fi
else
    # Скачиваем все файлы
    for file in "${FILES[@]}"; do
        download_file "$file"
    done
fi

# Показываем результат
printf "\n${BGGREEN}Downloaded files:${Color_Off}\n"
ls -al src/data

# Проверяем содержимое models.json перед скачиванием общего файла
if [ -f "src/data/models.json" ]; then
    echo -e "\n${BGYELLOW}Проверяем содержимое models.json...${Color_Off}"
    
    # Проверяем первый символ файла после удаления пробелов
    first_char=$(cat src/data/models.json | tr -d '[:space:]' | head -c 1)
    
    if [ "$first_char" = "{" ]; then
        printf "${BGGREEN}models.json содержит объект - пропускаем скачивание общего файла${Color_Off}\n"
        exit 0
    elif [ "$first_char" = "[" ]; then
        printf "${BGYELLOW}models.json содержит массив - продолжаем скачивание общего файла${Color_Off}\n"
    else
        printf "${BGRED}models.json имеет некорректный формат - продолжаем скачивание${Color_Off}\n"
    fi
else
    printf "${BGYELLOW}models.json не найден - продолжаем скачивание общего файла${Color_Off}\n"
fi

# 1. Скачиваем общий models.json
echo -e "\n${BGGREEN}Скачиваем общий models.json...${Color_Off}"
curl -s "$JSON_PATH/models.json" -o src/data/all-models.json

# Проверяем, что файл скачался и это не HTML-страница (например, 404)
if [ ! -s src/data/all-models.json ] || grep -q '<!DOCTYPE html' src/data/all-models.json; then
    printf "${BGRED}Внимание: models.json не найден или получен некорректный файл! Будет создан пустой models.json.${Color_Off}\n"
    echo '{ "models": [], "testDrive": [], "services": [] }' > src/data/models.json
else
    node .github/scripts/filterModelsByBrand.js
fi

# 3. Удаляем временный файл
# rm -f src/data/all-models.json
