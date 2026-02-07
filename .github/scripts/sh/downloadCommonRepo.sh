#!/usr/bin/env bash
set -e
set -o pipefail

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

# Функция для отображения справки
show_help() {
    cat <<'EOF'
Usage: downloadCommonRepo.sh [OPTIONS]

Options:
  -h, --help                 Show this help message
  -f, --file FILE            Specify file(s) to copy from data directory
                             Can be used multiple times or comma-separated
  -d, --skip-dealer-files    Skip copying dealer data files from src/$DOMAIN/data
  -s, --skip-model-sections  Skip copying model-sections directory
  -m, --skip-models          Skip copying models.json
  -c, --skip-cars            Skip copying cars.json
  -k, --keep-tmp             Keep cloned repo in tmp/
  -cd, --clean-data          Remove all files from src/data and restore tracked files

Env:
  JSON_PATH                  Git repo URL or GitHub Pages URL
  DOMAIN                     Domain folder under src/
  (If .env exists, JSON_PATH and DOMAIN are read from it.)

Examples:
  ./downloadCommonRepo.sh
  ./downloadCommonRepo.sh -cd
  ./downloadCommonRepo.sh -f settings.json
  ./downloadCommonRepo.sh -f settings.json -f faq.json
  ./downloadCommonRepo.sh -f settings.json,faq.json
  ./downloadCommonRepo.sh --skip-dealer-files
  ./downloadCommonRepo.sh --skip-model-sections --skip-models --skip-cars
  JSON_PATH=https://github.com/org/repo.git DOMAIN=site.com ./downloadCommonRepo.sh
  JSON_PATH=https://org.github.io/repo DOMAIN=site.com ./downloadCommonRepo.sh

Warning:
  --clean-data removes all files in src/data and discards local changes there.
EOF
}

# Обработка параметров командной строки
SPECIFIC_FILES=()
SKIP_DEALER_FILES=false
SKIP_MODEL_SECTIONS=false
SKIP_MODELS=false
SKIP_CARS=false
KEEP_TMP=false
CLEAN_DATA=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--file)
            if [ -z "${2-}" ] || [[ "$2" == -* ]]; then
                echo "❌ Error: --file requires an argument"
                show_help
                exit 1
            fi
            # Поддерживаем несколько файлов через запятую
            IFS=',' read -ra FILES <<< "$2"
            for file in "${FILES[@]}"; do
                SPECIFIC_FILES+=("$(echo "$file" | xargs)")  # Убираем пробелы
            done
            shift 2
            ;;
        -d|--skip-dealer-files)
            SKIP_DEALER_FILES=true
            shift
            ;;
        -s|--skip-model-sections)
            SKIP_MODEL_SECTIONS=true
            shift
            ;;
        -m|--skip-models)
            SKIP_MODELS=true
            shift
            ;;
        -c|--skip-cars)
            SKIP_CARS=true
            shift
            ;;
        -k|--keep-tmp)
            KEEP_TMP=true
            shift
            ;;
        -cd|--clean-data|--clear-data)
            CLEAN_DATA=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

extract_git_url() {
  local url="$1"

  # https://user.github.io/repo[/] → https://github.com/user/repo.git
  if [[ "$url" =~ ^https://([^.]+)\.github\.io/([^/]+)/?$ ]]; then
    echo "https://github.com/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}.git"
    return
  fi

  # если уже git-репозиторий — вернуть как есть
  if [[ "$url" =~ \.git$ ]]; then
    echo "$url"
    return
  fi

  # fallback
  echo "$url"
}

cleanup() {
  local code=$?
  if [ "${KEEP_TMP:-false}" = false ] && [ -n "${TMP_DIR:-}" ] && [ -d "${TMP_DIR:-}" ]; then
    rm -rf "$TMP_DIR"
  fi
  return $code
}

# ==================================================
# Подготовка env
# ==================================================
if [ -z "${JSON_PATH:-}" ] && [ -f .env ]; then
  export JSON_PATH=$(grep '^JSON_PATH=' .env | awk -F= '{print $2}' | sed 's/^"//; s/"$//')
fi

if [ -z "${DOMAIN:-}" ] && [ -f .env ]; then
  export DOMAIN=$(grep '^DOMAIN=' .env | awk -F= '{print $2}' | sed 's/^"//; s/"$//')
fi

if [ -z "${JSON_PATH:-}" ]; then
  echo "❌ Error: JSON_PATH is not set"
  exit 1
fi

if [ -z "${DOMAIN:-}" ]; then
  echo "❌ Error: DOMAIN is not set"
  exit 1
fi

echo "▶ JSON_PATH: $JSON_PATH"
echo "▶ DOMAIN:    $DOMAIN"

# ==================================================
# Переменные
# ==================================================
GIT_REPO_URL=$(extract_git_url "$JSON_PATH")
REPO_NAME=$(basename "$GIT_REPO_URL" .git)
TMP_DIR="tmp/$REPO_NAME"

REMOTE_DATA_PATH="src/$DOMAIN/data"
LOCAL_DATA_DIR="src/data"

trap cleanup EXIT INT TERM

# ==================================================
# Клонирование (sparse checkout)
# ==================================================
echo "▶ Git repo: $GIT_REPO_URL"

mkdir -p tmp
rm -rf "$TMP_DIR"

git clone \
  --filter=blob:none \
  --depth=1 \
  --single-branch \
  --no-checkout \
  "$GIT_REPO_URL" \
  "$TMP_DIR"

cd "$TMP_DIR"

git sparse-checkout init --no-cone
git sparse-checkout set \
  "src/$DOMAIN/data" \
  "src/model-sections" \
  "src/models.json" \
  "src/cars.json"

DEFAULT_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH="main"
fi

git checkout "$DEFAULT_BRANCH"

cd ../..

# ==================================================
# Копирование JSON
# ==================================================
echo "▶ Sync JSON data…"

mkdir -p "$LOCAL_DATA_DIR"

# Если указаны конкретные файлы, копируем только их
if [ ${#SPECIFIC_FILES[@]} -gt 0 ]; then
  for file in "${SPECIFIC_FILES[@]}"; do
    SRC_FILE="$TMP_DIR/$REMOTE_DATA_PATH/$file"
    DEST_FILE="$LOCAL_DATA_DIR/$file"
    
    if [ -f "$SRC_FILE" ]; then
      cp "$SRC_FILE" "$DEST_FILE"
      echo "  ✔ Copied: $file"
    else
      echo "❌ Error: File '$file' not found in $REMOTE_DATA_PATH"
      exit 1
    fi
  done
else
  # Копируем все файлы из папки data
  if [ "$SKIP_DEALER_FILES" = false ]; then
    rsync -a \
        "$TMP_DIR/$REMOTE_DATA_PATH/" \
        "$LOCAL_DATA_DIR/"
  fi
fi

# ==================================================
# Парсинг брендов и копирование model-sections
# ==================================================
# Проверяем, нужно ли копировать model-sections
SHOULD_COPY_MODEL_SECTIONS=false

# Копируем model-sections если:
# 1. Не указан флаг --skip-model-sections
# 2. И (копировались все файлы ИЛИ settings.json в списке скопированных файлов)
if [ "$SKIP_MODEL_SECTIONS" = false ]; then
  if [ ${#SPECIFIC_FILES[@]} -eq 0 ]; then
    # Копировались все файлы
    SHOULD_COPY_MODEL_SECTIONS=true
  else
    # Проверяем, есть ли settings.json в списке
    for file in "${SPECIFIC_FILES[@]}"; do
      if [ "$file" = "settings.json" ]; then
        SHOULD_COPY_MODEL_SECTIONS=true
        break
      fi
    done
  fi
fi

if [ "$SHOULD_COPY_MODEL_SECTIONS" = true ]; then
  SETTINGS_FILE="$LOCAL_DATA_DIR/settings.json"

  if [ ! -f "$SETTINGS_FILE" ]; then
    echo "❌ Error: settings.json not found"
    rm -rf "$TMP_DIR"
    exit 1
  fi

  BRANDS_RAW=$(grep -o '"brand"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" \
    | sed 's/.*"brand"[[:space:]]*:[[:space:]]*"//; s/"$//')

  IFS=',' read -ra BRANDS <<< "$BRANDS_RAW"

  # ==================================================
  # Копирование model-sections по брендам
  # ==================================================
  echo "▶ Sync model-sections…"

  for BRAND in "${BRANDS[@]}"; do
    RAW_BRAND=$(echo "$BRAND" | xargs)

    NORMALIZED_BRAND=$(echo "$RAW_BRAND" \
      | tr '[:upper:]' '[:lower:]' \
      | sed 's/[^a-z0-9 ]//g; s/[[:space:]]\+/-/g')

    SRC_DIR="$TMP_DIR/src/model-sections/$NORMALIZED_BRAND"
    DEST_DIR="$LOCAL_DATA_DIR/model-sections/$NORMALIZED_BRAND"

    if [ -d "$SRC_DIR" ]; then
      mkdir -p "$DEST_DIR"
      rsync -a "$SRC_DIR/" "$DEST_DIR/"
      echo "  ✔ $RAW_BRAND → $NORMALIZED_BRAND"
    else
      echo "  ⚠ model-sections not found for brand: $RAW_BRAND ($NORMALIZED_BRAND)"
    fi
  done
else
  if [ "$SKIP_MODEL_SECTIONS" = true ]; then
    echo "▶ Skipping model-sections (--skip-model-sections flag set)"
  else
    echo "▶ Skipping model-sections (settings.json not in file list)"
  fi
fi

# Копирование models.json (если не пропущен)
if [ "$SKIP_MODELS" = false ]; then
  echo -e "\n${BGGREEN}Копируем общий models.json...${Color_Off}"
  rsync -a "$TMP_DIR/src/models.json" "$LOCAL_DATA_DIR/all-models.json"

  # Проверяем, что файл скачался
  if [ ! -s "$LOCAL_DATA_DIR/all-models.json" ]; then
      printf "${BGRED}Внимание: общий файл models.json не найден или получен некорректный файл!${Color_Off}\n"
  else
      node .github/scripts/filterModelsByBrand.js
  fi
else
  echo -e "\n${BGYELLOW}Пропускаем копирование models.json (--skip-models flag set)${Color_Off}"
fi

# Копирование cars.json (если не пропущен)
if [ "$SKIP_CARS" = false ]; then
  echo -e "\n${BGGREEN}Копируем общий cars.json...${Color_Off}"
  rsync -a "$TMP_DIR/src/cars.json" "$LOCAL_DATA_DIR/all-cars.json"

  # Проверяем, что файл скачался
  if [ ! -s "$LOCAL_DATA_DIR/all-cars.json" ]; then
      printf "${BGRED}Внимание: общий файл cars.json не найден или получен некорректный файл!${Color_Off}\n"
  else
      printf "${BGGREEN}Общий файл cars.json успешно скопирован${Color_Off}\n"
  fi
else
  echo -e "\n${BGYELLOW}Пропускаем копирование cars.json (--skip-cars flag set)${Color_Off}"
fi

if [ "$KEEP_TMP" = true ]; then
  printf "\n${BGYELLOW}Сохраняем временный репозиторий: $TMP_DIR${Color_Off}\n"
else
  printf "\n${BGYELLOW}Удаляем временный репозиторий...${Color_Off}\n"
fi

echo "✅ Done"
