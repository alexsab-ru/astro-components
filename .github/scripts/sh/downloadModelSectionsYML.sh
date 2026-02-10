#!/bin/bash

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'

# Функция для отображения справки
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo
    echo "Description:"
    echo "  Скачивает YML файлы для каждой модели из settings.json"
    echo "  Бренды читаются из ключа 'brand' в settings.json (строка или массив)"
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

extract_brands_from_settings() {
    local settings_file="$1"

    if command -v jq &> /dev/null; then
        jq -r '
            .. | .brand? | select(. != null) |
            if type == "string" then
                split(",")[]
            elif type == "array" then
                .[] | select(type == "string") | split(",")[]
            else
                empty
            end |
            gsub("^\\s+|\\s+$"; "") |
            select(length > 0)
        ' "$settings_file" | awk 'NF && !seen[$0]++'
        return 0
    fi

    if ! command -v node &> /dev/null; then
        printf "${BGRED}Error: jq or node is required to parse brands from settings.json${Color_Off}\n"
        return 1
    fi

    node - "$settings_file" <<'NODE'
const fs = require("fs");

const file = process.argv[2];
const text = fs.readFileSync(file, "utf8");
const data = JSON.parse(text);
const seen = new Set();
const out = [];

function pushBrand(brandValue) {
  if (typeof brandValue !== "string") return;

  brandValue
    .split(",")
    .map(v => v.trim())
    .filter(Boolean)
    .forEach((brand) => {
      const key = brand.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(brand);
      }
    });
}

function walk(value) {
  if (Array.isArray(value)) {
    value.forEach(walk);
    return;
  }

  if (value && typeof value === "object") {
    if (typeof value.brand === "string") {
      pushBrand(value.brand);
    } else if (Array.isArray(value.brand)) {
      value.brand.forEach(pushBrand);
    }
    Object.values(value).forEach(walk);
  }
}

walk(data);
process.stdout.write(out.join("\n"));
NODE
}

# Читаем brand из settings.json
BRANDS_RAW=$(extract_brands_from_settings src/data/settings.json)

SITE_BRAND_STYLE=""
if command -v jq &> /dev/null; then
    SITE_BRAND_STYLE=$(jq -r '.site_brand_style // empty' src/data/settings.json 2>/dev/null || true)
else
    SITE_BRAND_STYLE=$(grep -o '"site_brand_style"[[:space:]]*:[[:space:]]*"[^"]*"' src/data/settings.json | sed 's/.*"site_brand_style"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || true)
fi

# Проверяем, что brand найден
if [ -z "$BRANDS_RAW" ]; then
    printf "${BGYELLOW}No brands found in settings.json. Skipping model-sections download (service mode).${Color_Off}\n"
    if [ -n "$SITE_BRAND_STYLE" ]; then
        printf "${BGYELLOW}site_brand_style: $SITE_BRAND_STYLE${Color_Off}\n"
    fi
    exit 0
fi

echo "Found brands:"
while IFS= read -r brand; do
    [ -z "$brand" ] && continue
    echo "  - $brand"
done <<< "$BRANDS_RAW"

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


# Функция для извлечения репозитория из GitHub Pages URL
# Преобразует https://user.github.io/repo в user/repo
extract_github_repo() {
    local url=$1
    # Убираем протокол
    url=$(echo "$url" | sed 's|^https\?://||')
    # Извлекаем имя пользователя (часть до .github.io)
    local user=$(echo "$url" | sed 's|\.github\.io.*||')
    # Извлекаем имя репозитория (часть после .github.io/)
    local repo=$(echo "$url" | sed 's|.*\.github\.io/||' | sed 's|/.*||')
    
    if [ -n "$user" ] && [ -n "$repo" ]; then
        echo "${user}/${repo}"
    else
        echo ""
    fi
}

# Функция для скачивания всех YML файлов из директории бренда
# Использует уже клонированный репозиторий через git sparse-checkout
# temp_repo_dir и project_root должны быть переданы как параметры
download_brand_yml_files() {
    local brand=$1
    local temp_repo_dir=$2
    local project_root=$3
    local normalized_brand=$(normalize_brand "$brand")
    local local_dir="src/data/model-sections/$normalized_brand"
    
    printf "\n${BGYELLOW}Обрабатываем бренд: $brand (нормализован: $normalized_brand)${Color_Off}\n"
    
    # Вычисляем абсолютный путь к локальной директории
    local abs_local_dir="$(cd "$project_root" && mkdir -p "$local_dir" && cd "$local_dir" && pwd)"
    
    # Переходим в клонированный репозиторий
    cd "$temp_repo_dir"
    
    # Обновляем sparse-checkout для нужной директории
    printf "  Настраиваем sparse-checkout для директории model-sections/$normalized_brand...\n"
    git sparse-checkout set "src/model-sections/$normalized_brand" 2>/dev/null
    
    # Проверяем, существует ли директория с файлами
    local source_dir="src/model-sections/$normalized_brand"
    
    if [ ! -d "$source_dir" ]; then
        printf "${BGRED}Директория $source_dir не найдена в репозитории${Color_Off}\n"
        cd "$project_root"
        return 1
    fi
    
    # Проверяем, есть ли файлы в директории
    local yml_count=$(find "$source_dir" -name "*.yml" -type f 2>/dev/null | wc -l | tr -d ' ')
    printf "  Найдено YML файлов в исходной директории: $yml_count\n"
    
    if [ "$yml_count" -eq 0 ]; then
        printf "${BGYELLOW}⚠ В директории $source_dir нет YML файлов${Color_Off}\n"
        cd "$project_root"
        return 0
    fi
    
    # Показываем список файлов, которые будем копировать
    printf "  Файлы для копирования:\n"
    find "$source_dir" -name "*.yml" -type f -exec basename {} \; | while read -r file; do
        printf "    - $file\n"
    done
    
    # Копируем файлы через rsync (как в примере пользователя)
    # Используем абсолютные пути для надежности
    local abs_source_dir="$(cd "$source_dir" && pwd)"
    
    printf "  Копируем из: $abs_source_dir\n"
    printf "  Копируем в: $abs_local_dir\n"
    
    # Создаем целевую директорию, если её нет
    mkdir -p "$abs_local_dir"
    
    if rsync -av "$abs_source_dir/" "$abs_local_dir/" 2>&1 | grep -v "^sending\|^total size"; then
        # Подсчитываем количество скопированных файлов
        local file_count=$(find "$abs_local_dir" -name "*.yml" -type f 2>/dev/null | wc -l | tr -d ' ')
        printf "  ${BGGREEN}✓ Успешно скопировано файлов: $file_count${Color_Off}\n"
    else
        # rsync может вывести информацию, но это не ошибка
        local file_count=$(find "$abs_local_dir" -name "*.yml" -type f 2>/dev/null | wc -l | tr -d ' ')
        if [ "$file_count" -gt 0 ]; then
            printf "  ${BGGREEN}✓ Успешно скопировано файлов: $file_count${Color_Off}\n"
        else
            printf "${BGRED}Ошибка при копировании файлов${Color_Off}\n"
            printf "  Попробуем альтернативный метод через cp...\n"
            
            # Альтернативный метод: используем cp
            if cp -r "$abs_source_dir"/*.yml "$abs_local_dir/" 2>/dev/null; then
                local file_count=$(find "$abs_local_dir" -name "*.yml" -type f 2>/dev/null | wc -l | tr -d ' ')
                printf "  ${BGGREEN}✓ Успешно скопировано файлов через cp: $file_count${Color_Off}\n"
            else
                printf "${BGRED}Ошибка при копировании файлов через cp${Color_Off}\n"
                cd "$project_root"
                return 1
            fi
        fi
    fi
    
    cd "$project_root"
    printf "${BGGREEN}Готово для бренда $brand${Color_Off}\n"
}

# Извлекаем репозиторий из JSON_PATH (один раз для всех брендов)
github_repo=$(extract_github_repo "$JSON_PATH")

if [ -z "$github_repo" ]; then
    printf "${BGRED}Ошибка: не удалось извлечь репозиторий из JSON_PATH${Color_Off}\n"
    exit 1
fi

printf "Репозиторий: $github_repo\n"

# Сохраняем корневую директорию проекта (откуда запущен скрипт)
project_root="$(pwd)"

# Создаем временную директорию для клонирования
temp_repo_dir="tmp/astro-json-$$"
mkdir -p "$(dirname "$temp_repo_dir")"

# Убеждаемся, что временная директория будет удалена даже при ошибке
trap "rm -rf $temp_repo_dir" EXIT INT TERM

printf "\n${BGYELLOW}Клонируем репозиторий (это может занять некоторое время)...${Color_Off}\n"

# Клонируем репозиторий с минимальными данными (один раз для всех брендов)
if ! git clone --filter=blob:none --depth=1 --single-branch --no-checkout "https://github.com/${github_repo}.git" "$temp_repo_dir" 2>/dev/null; then
    printf "${BGRED}Ошибка: не удалось клонировать репозиторий${Color_Off}\n"
    exit 1
fi

cd "$temp_repo_dir"

# Инициализируем sparse-checkout
git sparse-checkout init --no-cone 2>/dev/null

# Пробуем разные ветки
branches=("main" "master" "gh-pages")
checkout_success=0

for branch in "${branches[@]}"; do
    printf "Пробуем ветку: $branch...\n"
    if git checkout "$branch" 2>/dev/null; then
        checkout_success=1
        printf "${BGGREEN}✓ Переключились на ветку: $branch${Color_Off}\n"
        break
    fi
done

if [ $checkout_success -eq 0 ]; then
    printf "${BGRED}Ошибка: не удалось переключиться ни на одну ветку${Color_Off}\n"
    cd "$project_root"
    rm -rf "$temp_repo_dir"
    exit 1
fi

cd "$project_root"

BRAND_ARRAY=()
while IFS= read -r brand; do
    brand=$(echo "$brand" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    [ -z "$brand" ] && continue
    BRAND_ARRAY+=("$brand")
done <<< "$BRANDS_RAW"

if [ ${#BRAND_ARRAY[@]} -eq 0 ]; then
    printf "${BGYELLOW}No valid brands found in settings.json. Skipping model-sections download (service mode).${Color_Off}\n"
    if [ -n "$SITE_BRAND_STYLE" ]; then
        printf "${BGYELLOW}site_brand_style: $SITE_BRAND_STYLE${Color_Off}\n"
    fi
    exit 0
fi

# Обрабатываем каждый бренд (используя уже клонированный репозиторий)
for brand in "${BRAND_ARRAY[@]}"; do
    download_brand_yml_files "$brand" "$temp_repo_dir" "$project_root"
done

# Удаляем временную директорию после обработки всех брендов
printf "\n${BGYELLOW}Удаляем временный репозиторий...${Color_Off}\n"
rm -rf "$temp_repo_dir"
trap - EXIT INT TERM

# Показываем результат
printf "\n${BGGREEN}Скачанные YML файлы:${Color_Off}\n"
if [ -d "src/data/model-sections" ]; then
    find src/data/model-sections -name "*.yml" -type f | while read -r file; do
        printf "  $file\n"
    done
else
    printf "  Директория model-sections не создана\n"
fi
