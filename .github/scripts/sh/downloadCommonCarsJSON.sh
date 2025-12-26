#!/bin/bash

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

# Функция для отображения справки
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo
    echo
    echo "Examples:"
    echo "  $0             # Download common cars.json"
}

# Обработка параметров командной строки
SPECIFIC_FILE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
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

echo "Using JSON_PATH: $JSON_PATH"

# Создаем директорию для данных
mkdir -p src/data

# Скачиваем общий cars.json
echo -e "\n${BGGREEN}Скачиваем общий cars.json...${Color_Off}"
curl -s "$JSON_PATH/cars.json" -o src/data/all-cars.json

# Проверяем, что файл скачался и это не HTML-страница (например, 404)
if [ ! -s src/data/all-cars.json ] || grep -q '<!DOCTYPE html' src/data/all-cars.json; then
    printf "${BGRED}Внимание: общий файл cars.json не найден или получен некорректный файл!${Color_Off}\n"
else
    printf "${BGGREEN}Общий файл cars.json успешно скачан${Color_Off}\n"
fi
