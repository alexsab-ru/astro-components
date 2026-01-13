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
    echo "Description:"
    echo "  Скачивает YML файлы для каждой модели из settings.json"
    echo "  Бренды читаются из ключа 'brand' в settings.json"
    echo "  Для каждого бренда скачиваются все .yml файлы из model-sections/{brand}/"
    echo
    echo "Examples:"
    echo "  $0             # Download all YML files for brands from settings.json"
}

# Обработка параметров командной строки
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

# Проверяем наличие settings.json
if [ ! -f "src/data/settings.json" ]; then
    printf "${BGRED}Error: src/data/settings.json not found${Color_Off}\n"
    exit 1
fi

# Читаем brand из settings.json
# Используем jq если доступен, иначе используем простой парсинг
if command -v jq &> /dev/null; then
    BRANDS_STRING=$(jq -r '.brand' src/data/settings.json)
else
    # Простой парсинг JSON без jq
    BRANDS_STRING=$(grep -o '"brand"[[:space:]]*:[[:space:]]*"[^"]*"' src/data/settings.json | sed 's/.*"brand"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
fi

# Проверяем, что brand найден
if [ -z "$BRANDS_STRING" ] || [ "$BRANDS_STRING" == "null" ]; then
    printf "${BGRED}Error: brand not found in settings.json${Color_Off}\n"
    exit 1
fi

echo "Found brands: $BRANDS_STRING"

# Функция для нормализации имени бренда
# Приводит к нижнему регистру и заменяет пробелы на дефис
normalize_brand() {
    local brand=$1
    # Приводим к нижнему регистру
    brand=$(echo "$brand" | tr '[:upper:]' '[:lower:]')
    # Заменяем пробелы на дефис
    brand=$(echo "$brand" | tr ' ' '-')
    # Удаляем лишние пробелы и дефисы в начале/конце
    brand=$(echo "$brand" | sed 's/^[[:space:]-]*//; s/[[:space:]-]*$//')
    echo "$brand"
}


# Функция для скачивания всех YML файлов из директории бренда
download_brand_yml_files() {
    local brand=$1
    local normalized_brand=$(normalize_brand "$brand")
    local remote_path="$JSON_PATH/model-sections/$normalized_brand"
    local local_dir="src/data/model-sections/$normalized_brand"
    
    printf "\n${BGYELLOW}Обрабатываем бренд: $brand (нормализован: $normalized_brand)${Color_Off}\n"
    
    # Создаем локальную директорию
    mkdir -p "$local_dir"
    
    # Проверяем существование удаленной директории
    # Пытаемся получить список файлов через curl
    # Если сервер поддерживает directory listing, получим HTML
    # Если нет, получим ошибку 404 или 403
    
    # Сначала проверяем, доступна ли директория
    # Пытаемся получить индекс директории или любой файл
    if ! curl --output /dev/null --silent --fail -r 0-0 "$remote_path/"; then
        printf "${BGRED}Директория $remote_path не найдена, пропускаем...${Color_Off}\n"
        return 0
    fi
    
    # Пытаемся получить список файлов
    # Вариант 1: если сервер возвращает directory listing
    # Вариант 2: пробуем скачать известные имена файлов
    # Вариант 3: используем API если доступно
    
    # Пробуем получить HTML листинг директории
    temp_listing=$(mktemp)
    curl -s "$remote_path/" -o "$temp_listing" 2>/dev/null
    
    # Проверяем, получили ли мы HTML с листингом или ошибку
    if grep -q '<!DOCTYPE html\|<html' "$temp_listing" 2>/dev/null; then
        # Парсим HTML листинг и извлекаем ссылки на .yml файлы
        # Ищем ссылки вида <a href="filename.yml">
        yml_files=$(grep -oE 'href="[^"]*\.yml"' "$temp_listing" | sed 's/href="\([^"]*\)"/\1/' | sort -u)
        
        if [ -z "$yml_files" ]; then
            printf "${BGRED}YML файлы не найдены в директории $remote_path${Color_Off}\n"
            rm -f "$temp_listing"
            return 0
        fi
        
        # Скачиваем каждый YML файл
        downloaded_count=0
        for yml_file in $yml_files; do
            # Убираем лишние символы из имени файла
            yml_file=$(echo "$yml_file" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
            
            if [ -n "$yml_file" ]; then
                local_file="$local_dir/$yml_file"
                remote_file="$remote_path/$yml_file"
                
                printf "  Скачиваем: $yml_file...\n"
                if curl -s --fail "$remote_file" -o "$local_file"; then
                    printf "  ${BGGREEN}✓ Успешно скачан: $yml_file${Color_Off}\n"
                    ((downloaded_count++))
                else
                    printf "  ${BGRED}✗ Ошибка при скачивании: $yml_file${Color_Off}\n"
                fi
            fi
        done
        
        printf "${BGGREEN}Скачано файлов для бренда $brand: $downloaded_count${Color_Off}\n"
    else
        # Если не получили HTML листинг, пробуем альтернативный метод
        # Можно попробовать скачать файлы с известными именами
        # Или использовать другой API endpoint
        printf "${BGYELLOW}Не удалось получить список файлов для $remote_path${Color_Off}\n"
        printf "${BGYELLOW}Попробуйте проверить доступность директории вручную${Color_Off}\n"
    fi
    
    rm -f "$temp_listing"
}

# Разделяем бренды по запятой и обрабатываем каждый
# Удаляем пробелы вокруг запятых и разделяем
IFS=',' read -ra BRAND_ARRAY <<< "$BRANDS_STRING"

# Обрабатываем каждый бренд
for brand in "${BRAND_ARRAY[@]}"; do
    # Удаляем пробелы в начале и конце
    brand=$(echo "$brand" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    
    if [ -n "$brand" ]; then
        download_brand_yml_files "$brand"
    fi
done

# Показываем результат
printf "\n${BGGREEN}Скачанные YML файлы:${Color_Off}\n"
if [ -d "src/data/model-sections" ]; then
    find src/data/model-sections -name "*.yml" -type f | while read -r file; do
        printf "  $file\n"
    done
else
    printf "  Директория model-sections не создана\n"
fi
