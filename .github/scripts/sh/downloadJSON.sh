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
    echo "  $0                    # Download all files"
    echo "  $0 -f cars.json      # Download only cars.json"
    echo "  $0 --file faq.json   # Download only faq.json"
}

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

# Получаем пути из .env файла
JSON_PATH=$(cat .env | grep JSON_PATH= | cut -d '=' -f 2)
DOMAIN_NAME=$(cat .env | grep DOMAIN= | cut -d '=' -f 2)

echo "Using JSON_PATH: $JSON_PATH"
echo "Using DOMAIN_NAME: $DOMAIN_NAME"

# Создаем директорию для данных
mkdir -p src/data

# Функция для скачивания файла
download_file() {
    local file=$1
    echo "Checking file: $file"
    if curl --output /dev/null --silent --fail -r 0-0 "$JSON_PATH/$DOMAIN_NAME/data/$file"; then
        echo "Downloading $file..."
        curl "$JSON_PATH/$DOMAIN_NAME/data/$file" -o "src/data/$file"
        echo "${BGGREEN}Successfully downloaded $file${Color_Off}"
    else
        echo "\n${BGRED}File $file not found, skipping...${Color_Off}\n"
    fi
}

# Скачиваем файлы
if [ -n "$SPECIFIC_FILE" ]; then
    # Проверяем, существует ли указанный файл в списке
    if [[ " ${FILES[@]} " =~ " ${SPECIFIC_FILE} " ]]; then
        download_file "$SPECIFIC_FILE"
    else
        echo "${BGRED}Error: File '$SPECIFIC_FILE' is not in the list of available files${Color_Off}"
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
echo "\n${BGGREEN}Downloaded files:${Color_Off}"
ls -al src/data
