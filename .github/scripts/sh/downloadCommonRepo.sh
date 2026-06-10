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
Usage: pnpm downloadCommonRepo [OPTIONS]

Options:
  -h, --help                 Show this help message
  -f, --file FILE            Specify file(s) to copy from data directory
                             Can be used multiple times or comma-separated
  -d, --skip-dealer-files    Skip copying dealer data files from src/$DOMAIN
  -c, --skip-cars            Skip copying cars.json
  -k, --keep-tmp             Keep cloned repo in tmp/
  -l, --local                Use local astro-json directory instead of cloning JSON_REPO
      --local-path PATH      Local astro-json directory (default: ../astro-json)
  -cd, --clean-data          Remove generated files from src/data/site and src/data/common

Env:
  JSON_REPO                  Git repository URL (without .git)
  DOMAIN                     Domain folder under src/
  FINE_GRAINED_PAT           Optional GitHub PAT for private repos
  ASTRO_JSON_LOCAL           Set to 1/true to use local astro-json directory
  ASTRO_JSON_LOCAL_PATH      Local astro-json directory (default: ../astro-json)
  (If .env exists, JSON_REPO and DOMAIN are read from it.)

Examples:
  pnpm downloadCommonRepo
  pnpm downloadCommonRepo -cd
  pnpm downloadCommonRepo -f settings.json
  pnpm downloadCommonRepo -f settings.json -f faq.json
  pnpm downloadCommonRepo -f settings.json,faq.json
  pnpm downloadCommonRepo --skip-dealer-files
  pnpm downloadCommonRepo --skip-cars
  pnpm downloadCommonRepo --local
  pnpm downloadCommonRepo --local --local-path ../astro-json
  JSON_REPO=https://github.com/org/repo DOMAIN=site.com pnpm downloadCommonRepo

Warning:
  --clean-data removes all files in src/data/site and src/data/common.
EOF
}

# Обработка параметров командной строки
SPECIFIC_FILES=()
SKIP_DEALER_FILES=false
SKIP_CARS=false
KEEP_TMP=false
CLEAN_DATA=false
LOCAL_SOURCE=false
LOCAL_SOURCE_PATH="${ASTRO_JSON_LOCAL_PATH:-../astro-json}"
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
        -c|--skip-cars)
            SKIP_CARS=true
            shift
            ;;
        -k|--keep-tmp)
            KEEP_TMP=true
            shift
            ;;
        -l|--local)
            LOCAL_SOURCE=true
            shift
            ;;
        --local-path)
            if [ -z "${2-}" ] || [[ "$2" == -* ]]; then
                echo "❌ Error: --local-path requires an argument"
                show_help
                exit 1
            fi
            LOCAL_SOURCE=true
            LOCAL_SOURCE_PATH="$2"
            shift 2
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

build_git_clone_url() {
  local repo_url="$1"
  repo_url="${repo_url%/}"

  if [[ "$repo_url" =~ \.git$ ]]; then
    echo "$repo_url"
  else
    echo "${repo_url}.git"
  fi
}

apply_pat_to_url() {
  local url="$1"

  if [ -z "${FINE_GRAINED_PAT:-}" ]; then
    echo "$url"
    return
  fi

  if [[ "$url" =~ ^https?:// ]]; then
    local proto="${url%%://*}"
    local rest="${url#*://}"
    if [[ "$rest" =~ ^[^@]+@ ]]; then
      echo "$url"
    else
      echo "${proto}://x-access-token:${FINE_GRAINED_PAT}@${rest}"
    fi
  else
    echo "$url"
  fi
}

extract_brands() {
  local settings_file="$1"

  if command -v jq >/dev/null 2>&1; then
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
    ' "$settings_file" \
      | awk 'NF && !seen[$0]++'
    return
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "❌ Error: node is required to parse settings.json when jq is unavailable"
    exit 1
  fi

  node - "$settings_file" <<'NODE'
const fs = require("fs");

const file = process.argv[2];
const text = fs.readFileSync(file, "utf8");
const data = JSON.parse(text);
const seen = new Set();
const out = [];

function walk(value) {
  if (Array.isArray(value)) {
    value.forEach(walk);
    return;
  }
  if (value && typeof value === "object") {
    const pushBrand = (brandValue) => {
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
    };

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

normalize_brand() {
  local raw_brand="$1"

  echo "$raw_brand" \
    | xargs \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9 ]//g; s/[[:space:]]+/-/g; s/^-+|-+$//g'
}

collect_brand_paths_from_settings() {
  local settings_file="$1"
  local brands_raw

  BRANDS=()
  BRAND_DOMAINS=()
  BRAND_SPARSE_PATHS=()

  brands_raw=$(extract_brands "$settings_file")
  if [ -z "$brands_raw" ]; then
    echo "▶ Brands are not set in settings.json"
    return 0
  fi

  while IFS= read -r line; do
    [ -z "$line" ] && continue

    local raw_brand
    local normalized_brand
    local brand_domain
    raw_brand=$(echo "$line" | xargs)
    normalized_brand=$(normalize_brand "$raw_brand")

    if [ -z "$normalized_brand" ]; then
      continue
    fi

    brand_domain="${normalized_brand}.alexsab.ru"
    BRANDS+=("$raw_brand")
    BRAND_DOMAINS+=("$brand_domain")
    BRAND_SPARSE_PATHS+=("/src/$brand_domain")
  done <<< "$brands_raw"
}

cleanup() {
  local code=$?
  if [ "${LOCAL_SOURCE:-false}" = true ]; then
    return $code
  fi

  if [ "${KEEP_TMP:-false}" = false ] && [ -n "${TMP_DIR:-}" ] && [ -d "${TMP_DIR:-}" ]; then
    rm -rf "$TMP_DIR"
  fi
  return $code
}

ensure_local_settings_for_models() {
  local local_settings="$SITE_DATA_DIR/settings.json"
  local remote_settings="$TMP_DIR/$REMOTE_DATA_PATH/settings.json"

  if [ -f "$local_settings" ]; then
    return 0
  fi

  if [ -f "$remote_settings" ]; then
    cp "$remote_settings" "$local_settings"
    echo "▶ settings.json copied from remote for models filtering"
    return 0
  fi

  return 1
}

clean_data_dir() {
  if [ -z "${SITE_DATA_DIR:-}" ] || [ -z "${COMMON_DATA_DIR:-}" ]; then
    echo "❌ Error: SITE_DATA_DIR or COMMON_DATA_DIR is not set"
    exit 1
  fi

  echo "⚠ WARNING: this will delete all files in $SITE_DATA_DIR and $COMMON_DATA_DIR."

  if [ "$SITE_DATA_DIR" = "/" ] || [ "$SITE_DATA_DIR" = "." ] || [ "$COMMON_DATA_DIR" = "/" ] || [ "$COMMON_DATA_DIR" = "." ]; then
    echo "❌ Error: refusing to clean unsafe data paths"
    exit 1
  fi

  mkdir -p "$SITE_DATA_DIR" "$COMMON_DATA_DIR"

  find "$SITE_DATA_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  find "$COMMON_DATA_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
}

sync_remote_content() {
  local copied_any_brand=false
  local common_content_dir="$TMP_DIR/$ASTRO_JSON_DATA_PATH/content"
  mkdir -p "$ASTRO_CONTENT_DIR"

  if [ -d "$common_content_dir" ]; then
    rsync -a "$common_content_dir/" "$ASTRO_CONTENT_DIR/"
    echo "  ✔ Common content: $ASTRO_JSON_DATA_PATH/content → $ASTRO_CONTENT_DIR"
  else
    echo "▶ Common content not found: $ASTRO_JSON_DATA_PATH/content"
  fi

  for brand_domain in "${BRAND_DOMAINS[@]}"; do
    local src_dir="$TMP_DIR/src/$brand_domain/content"

    if [ -d "$src_dir" ]; then
      rsync -a "$src_dir/" "$ASTRO_CONTENT_DIR/"
      echo "  ✔ Brand content: $brand_domain/content → $ASTRO_CONTENT_DIR"
      copied_any_brand=true
    else
      echo "  ⚠ Brand content not found: src/$brand_domain/content"
    fi
  done

  if [ "$copied_any_brand" = false ] && [ ${#BRAND_DOMAINS[@]} -gt 0 ]; then
    echo "▶ No brand content directories were found"
  fi

  local site_content_dir="$TMP_DIR/$REMOTE_DATA_PATH/content"
  if [ -d "$site_content_dir" ]; then
    rsync -a "$site_content_dir/" "$ASTRO_CONTENT_DIR/"
    echo "  ✔ Site content: $REMOTE_DATA_PATH/content → $ASTRO_CONTENT_DIR"
  else
    echo "▶ Site content not found: $REMOTE_DATA_PATH/content"
  fi
}

extract_page_template() {
  local settings_file="$1"

  if [ ! -f "$settings_file" ]; then
    return 0
  fi

  if command -v jq >/dev/null 2>&1; then
    jq -r '
      (.pageTemplate // .siteType // "") |
      if type == "string" then . else "" end
    ' "$settings_file"
    return
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "❌ Error: node is required to parse pageTemplate when jq is unavailable"
    exit 1
  fi

  node - "$settings_file" <<'NODE'
const fs = require("fs");

const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const template = data.pageTemplate ?? data.siteType ?? "";
process.stdout.write(typeof template === "string" ? template : "");
NODE
}

sync_remote_pages() {
  local copied_any_brand=false
  local common_pages_dir="$TMP_DIR/$ASTRO_JSON_DATA_PATH/pages"
  local settings_file="$TMP_DIR/$REMOTE_DATA_PATH/settings.json"
  local page_template

  page_template=$(extract_page_template "$settings_file" | xargs)

  mkdir -p "$ASTRO_PAGES_DIR"

  if [ -d "$common_pages_dir" ]; then
    rsync -a "$common_pages_dir/" "$ASTRO_PAGES_DIR/"
    echo "  ✔ Common pages: $ASTRO_JSON_DATA_PATH/pages → $ASTRO_PAGES_DIR"
  else
    echo "▶ Common pages not found: $ASTRO_JSON_DATA_PATH/pages"
  fi

  for brand_domain in "${BRAND_DOMAINS[@]}"; do
    local src_dir="$TMP_DIR/src/$brand_domain/pages"

    if [ -d "$src_dir" ]; then
      rsync -a "$src_dir/" "$ASTRO_PAGES_DIR/"
      echo "  ✔ Brand pages: $brand_domain/pages → $ASTRO_PAGES_DIR"
      copied_any_brand=true
    else
      echo "  ⚠ Brand pages not found: src/$brand_domain/pages"
    fi
  done

  if [ "$copied_any_brand" = false ] && [ ${#BRAND_DOMAINS[@]} -gt 0 ]; then
    echo "▶ No brand pages directories were found"
  fi

  if [ -n "$page_template" ]; then
    local template_pages_dir="$TMP_DIR/$ASTRO_JSON_DATA_PATH/pages-template/$page_template"

    if [ -d "$template_pages_dir" ]; then
      rsync -a "$template_pages_dir/" "$ASTRO_PAGES_DIR/"
      echo "  ✔ Template pages: $ASTRO_JSON_DATA_PATH/pages-template/$page_template → $ASTRO_PAGES_DIR"
    else
      echo "▶ Page template not found, skipped: $ASTRO_JSON_DATA_PATH/pages-template/$page_template"
    fi
  else
    echo "▶ pageTemplate is not set; template pages skipped"
  fi

  local site_pages_dir="$TMP_DIR/$REMOTE_DATA_PATH/pages"
  if [ -d "$site_pages_dir" ]; then
    rsync -a "$site_pages_dir/" "$ASTRO_PAGES_DIR/"
    echo "  ✔ Site pages: $REMOTE_DATA_PATH/pages → $ASTRO_PAGES_DIR"
  else
    echo "▶ Site pages not found: $REMOTE_DATA_PATH/pages"
  fi
}

sync_remote_components() {
  local copied_any_brand=false
  local common_components_dir="$TMP_DIR/$ASTRO_JSON_DATA_PATH/components"
  local settings_file="$TMP_DIR/$REMOTE_DATA_PATH/settings.json"
  local page_template

  page_template=$(extract_page_template "$settings_file" | xargs)

  mkdir -p "$ASTRO_COMPONENTS_DIR"

  if [ -d "$common_components_dir" ]; then
    rsync -a "$common_components_dir/" "$ASTRO_COMPONENTS_DIR/"
    echo "  ✔ Common components: $ASTRO_JSON_DATA_PATH/components → $ASTRO_COMPONENTS_DIR"
  else
    echo "▶ Common components not found: $ASTRO_JSON_DATA_PATH/components"
  fi

  for brand_domain in "${BRAND_DOMAINS[@]}"; do
    local src_dir="$TMP_DIR/src/$brand_domain/components"

    if [ -d "$src_dir" ]; then
      rsync -a "$src_dir/" "$ASTRO_COMPONENTS_DIR/"
      echo "  ✔ Brand components: $brand_domain/components → $ASTRO_COMPONENTS_DIR"
      copied_any_brand=true
    else
      echo "  ⚠ Brand components not found: src/$brand_domain/components"
    fi
  done

  if [ "$copied_any_brand" = false ] && [ ${#BRAND_DOMAINS[@]} -gt 0 ]; then
    echo "▶ No brand components directories were found"
  fi

  if [ -n "$page_template" ]; then
    local template_components_dir="$TMP_DIR/$ASTRO_JSON_DATA_PATH/components-template/$page_template"

    if [ -d "$template_components_dir" ]; then
      rsync -a "$template_components_dir/" "$ASTRO_COMPONENTS_DIR/"
      echo "  ✔ Template components: $ASTRO_JSON_DATA_PATH/components-template/$page_template → $ASTRO_COMPONENTS_DIR"
    else
      echo "▶ Component template not found, skipped: $ASTRO_JSON_DATA_PATH/components-template/$page_template"
    fi
  else
    echo "▶ pageTemplate is not set; template components skipped"
  fi

  local site_components_dir="$TMP_DIR/$REMOTE_DATA_PATH/components"
  if [ -d "$site_components_dir" ]; then
    rsync -a "$site_components_dir/" "$ASTRO_COMPONENTS_DIR/"
    echo "  ✔ Site components: $REMOTE_DATA_PATH/components → $ASTRO_COMPONENTS_DIR"
  else
    echo "▶ Site components not found: $REMOTE_DATA_PATH/components"
  fi
}

# ==================================================
# Подготовка env
# ==================================================
if [ -z "${JSON_REPO:-}" ] && [ -f .env ]; then
  export JSON_REPO=$(grep '^JSON_REPO=' .env | awk -F= '{print $2}' | sed 's/^"//; s/"$//')
fi

if [ -z "${DOMAIN:-}" ] && [ -f .env ]; then
  export DOMAIN=$(grep '^DOMAIN=' .env | awk -F= '{print $2}' | sed 's/^"//; s/"$//')
fi

if [[ "${ASTRO_JSON_LOCAL:-}" =~ ^(1|true|yes)$ ]]; then
  LOCAL_SOURCE=true
fi

if [ "$LOCAL_SOURCE" = false ] && [ -z "${JSON_REPO:-}" ]; then
  echo "❌ Error: JSON_REPO is not set"
  exit 1
fi

if [ -z "${DOMAIN:-}" ]; then
  echo "❌ Error: DOMAIN is not set"
  exit 1
fi

echo "▶ DOMAIN:    $DOMAIN"

# ==================================================
# Переменные
# ==================================================
REMOTE_DATA_PATH="src/$DOMAIN"
LOCAL_DATA_DIR="src/data"
SITE_DATA_DIR="$LOCAL_DATA_DIR/site"
COMMON_DATA_DIR="$LOCAL_DATA_DIR/common"
ASTRO_CONTENT_DIR="src/content"
ASTRO_PAGES_DIR="src/pages"
# Оверрайды компонентов в astro-json зеркалят корень src/ (ui/blocks/templates/site-shell/integrations)
ASTRO_COMPONENTS_DIR="src"
ASTRO_JSON_DATA_PATH="data"

trap cleanup EXIT INT TERM

# ==================================================
# Подготовка источника данных
# ==================================================
if [ "$LOCAL_SOURCE" = true ]; then
  TMP_DIR="$LOCAL_SOURCE_PATH"
  echo "▶ Local astro-json: $TMP_DIR"

  if [ ! -d "$TMP_DIR" ]; then
    echo "❌ Error: local astro-json directory not found: $TMP_DIR"
    exit 1
  fi

  if [ -f "$TMP_DIR/$REMOTE_DATA_PATH/settings.json" ]; then
    collect_brand_paths_from_settings "$TMP_DIR/$REMOTE_DATA_PATH/settings.json"
  else
    BRANDS=()
    BRAND_DOMAINS=()
    BRAND_SPARSE_PATHS=()
    echo "▶ settings.json not found in $REMOTE_DATA_PATH; brand content will be skipped"
  fi
else
  echo "▶ JSON_REPO: $JSON_REPO"

  GIT_REPO_URL=$(build_git_clone_url "$JSON_REPO")
  CLONE_URL=$(apply_pat_to_url "$GIT_REPO_URL")
  REPO_NAME=$(basename "$GIT_REPO_URL" .git)
  TMP_DIR="tmp/$REPO_NAME"

  echo "▶ Git repo: $GIT_REPO_URL"

  mkdir -p tmp
  rm -rf "$TMP_DIR"

  git clone \
    --filter=blob:none \
    --depth=1 \
    --single-branch \
    --no-checkout \
    "$CLONE_URL" \
    "$TMP_DIR"

  cd "$TMP_DIR"

  DEFAULT_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')
  if [ -z "$DEFAULT_BRANCH" ]; then
    DEFAULT_BRANCH="main"
  fi

  SETTINGS_FOR_BRANDS_FILE=".settings-for-brand-detection.json"
  if git show "origin/$DEFAULT_BRANCH:$REMOTE_DATA_PATH/settings.json" > "$SETTINGS_FOR_BRANDS_FILE" 2>/dev/null; then
    collect_brand_paths_from_settings "$SETTINGS_FOR_BRANDS_FILE"
  else
    BRANDS=()
    BRAND_DOMAINS=()
    BRAND_SPARSE_PATHS=()
    echo "▶ settings.json not found in $REMOTE_DATA_PATH before sparse checkout; brand content will be skipped"
  fi

  SPARSE_PATHS=(
    "/src/$DOMAIN" \
    "/src/cars.json" \
    "/src/avito-colors.json" \
    "/src/translations.json" \
    "/$ASTRO_JSON_DATA_PATH"
  )

  if [ ${#BRAND_SPARSE_PATHS[@]} -gt 0 ]; then
    SPARSE_PATHS+=("${BRAND_SPARSE_PATHS[@]}")
    echo "▶ Brand sparse paths: ${BRAND_SPARSE_PATHS[*]}"
  fi

  git sparse-checkout init --no-cone
  git sparse-checkout set "${SPARSE_PATHS[@]}"

  git checkout "$DEFAULT_BRANCH"

  cd ../..
fi

# ==================================================
# Копирование JSON
# ==================================================
echo "▶ Sync JSON data…"

if [ "$CLEAN_DATA" = true ]; then
  echo "▶ Cleaning local data directory..."
  clean_data_dir
fi

mkdir -p "$SITE_DATA_DIR" "$COMMON_DATA_DIR"

# Если указаны конкретные файлы, копируем только их
if [ ${#SPECIFIC_FILES[@]} -gt 0 ]; then
  for file in "${SPECIFIC_FILES[@]}"; do
    SRC_FILE="$TMP_DIR/$REMOTE_DATA_PATH/$file"
    DEST_FILE="$SITE_DATA_DIR/$file"
    
    if [ -f "$SRC_FILE" ]; then
      mkdir -p "$(dirname "$DEST_FILE")"
      cp "$SRC_FILE" "$DEST_FILE"
      echo "  ✔ Copied: $file"
    elif [ -f "$TMP_DIR/$ASTRO_JSON_DATA_PATH/json/$file" ]; then
      echo "  ▶ Layered file '$file' not found in $REMOTE_DATA_PATH; using common JSON layer"
    else
      FOUND_IN_BRAND=false
      for brand_domain in "${BRAND_DOMAINS[@]}"; do
        if [ -f "$TMP_DIR/src/$brand_domain/$file" ]; then
          FOUND_IN_BRAND=true
          break
        fi
      done

      if [ "$FOUND_IN_BRAND" = true ]; then
        echo "  ▶ Layered file '$file' not found in $REMOTE_DATA_PATH; using brand JSON layer"
      else
        echo "❌ Error: File '$file' not found in $REMOTE_DATA_PATH"
        exit 1
      fi
    fi
  done
else
  # Копируем все файлы из папки data
  if [ "$SKIP_DEALER_FILES" = false ]; then
    rsync -a \
        --exclude "content/" \
        --exclude "components/" \
        --exclude "pages/" \
        "$TMP_DIR/$REMOTE_DATA_PATH/" \
        "$SITE_DATA_DIR/"
  fi
fi

echo "▶ Merge layered JSON…"
TMP_DIR="$TMP_DIR" \
SITE_DATA_DIR="$SITE_DATA_DIR" \
REMOTE_DATA_PATH="$REMOTE_DATA_PATH" \
ASTRO_JSON_DATA_PATH="$ASTRO_JSON_DATA_PATH" \
BRAND_DOMAINS="$(printf '%s\n' "${BRAND_DOMAINS[@]}")" \
SPECIFIC_FILES="$(printf '%s\n' "${SPECIFIC_FILES[@]}")" \
node .github/scripts/mergeLayeredJson.js

echo "▶ Sync content…"
sync_remote_content

if [ ${#SPECIFIC_FILES[@]} -gt 0 ]; then
  echo "▶ Sync pages and components skipped for specific file download"
else
  echo "▶ Sync pages…"
  sync_remote_pages

  echo "▶ Sync components…"
  sync_remote_components
fi

# Копируем внутренности astro-json/data для дальнейшей обработки.
if [ -d "$TMP_DIR/$ASTRO_JSON_DATA_PATH" ]; then
  echo "▶ Sync astro-json/data → $COMMON_DATA_DIR…"
  rsync -a \
    --exclude "content/" \
    --exclude "components/" \
    --exclude "components-template/" \
    --exclude "json/" \
    --exclude "pages/" \
    --exclude "pages-template/" \
    "$TMP_DIR/$ASTRO_JSON_DATA_PATH/" \
    "$COMMON_DATA_DIR/"
else
  echo -e "${BGYELLOW}Пропускаем копирование astro-json/data: папка не найдена в JSON_REPO${Color_Off}"
fi

if ! ensure_local_settings_for_models; then
  printf "${BGYELLOW}settings.json не найден, пропускаем сборку site/models.json${Color_Off}\n"
else
  SITE_DATA_DIR="$SITE_DATA_DIR" COMMON_DATA_DIR="$COMMON_DATA_DIR" node .github/scripts/filterModelsByBrand.js
fi


# Копирование cars.json (если не пропущен)
if [ "$SKIP_CARS" = false ]; then
  echo -e "\n${BGGREEN}Копируем общий cars.json...${Color_Off}"
  rsync -a "$TMP_DIR/src/cars.json" "$COMMON_DATA_DIR/cars.json"

  # Проверяем, что файл скачался
  if [ ! -s "$COMMON_DATA_DIR/cars.json" ]; then
      printf "${BGRED}Внимание: общий файл cars.json не найден или получен некорректный файл!${Color_Off}\n"
  else
      printf "${BGGREEN}Общий файл cars.json успешно скопирован${Color_Off}\n"
  fi
else
  echo -e "\n${BGYELLOW}Пропускаем копирование cars.json (--skip-cars flag set)${Color_Off}"
fi

# Копирование avito-colors.json (всегда, если есть в общем репозитории)
echo -e "\n${BGGREEN}Копируем общий avito-colors.json...${Color_Off}"
if [ -f "$TMP_DIR/src/avito-colors.json" ]; then
  rsync -a "$TMP_DIR/src/avito-colors.json" "$COMMON_DATA_DIR/avito-colors.json"
  if [ ! -s "$COMMON_DATA_DIR/avito-colors.json" ]; then
      printf "${BGRED}Внимание: общий файл avito-colors.json не найден или получен некорректный файл!${Color_Off}\n"
  else
      printf "${BGGREEN}Общий файл avito-colors.json успешно скопирован${Color_Off}\n"
  fi
else
  echo -e "${BGYELLOW}Пропускаем копирование avito-colors.json: файла нет в JSON_REPO${Color_Off}"
fi

# Копирование translations.json (всегда, если есть в общем репозитории)
echo -e "\n${BGGREEN}Копируем общий translations.json...${Color_Off}"
if [ -f "$TMP_DIR/src/translations.json" ]; then
  rsync -a "$TMP_DIR/src/translations.json" "$COMMON_DATA_DIR/translations.json"
  if [ ! -s "$COMMON_DATA_DIR/translations.json" ]; then
      printf "${BGRED}Внимание: общий файл translations.json не найден или получен некорректный файл!${Color_Off}\n"
  else
      printf "${BGGREEN}Общий файл translations.json успешно скопирован${Color_Off}\n"
  fi
else
  echo -e "${BGYELLOW}Пропускаем копирование translations.json: файла нет в JSON_REPO${Color_Off}"
fi

# ==================================================
# Merge env.json → .env
# ==================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/envJsonToDotenv.sh" ]; then
  echo ""
  ENV_JSON_PATH="$SITE_DATA_DIR/env.json" bash "$SCRIPT_DIR/envJsonToDotenv.sh"
fi

if [ "$LOCAL_SOURCE" = true ]; then
  printf "\n${BGYELLOW}Локальный astro-json оставлен без изменений: $TMP_DIR${Color_Off}\n"
elif [ "$KEEP_TMP" = true ]; then
  printf "\n${BGYELLOW}Сохраняем временный репозиторий: $TMP_DIR${Color_Off}\n"
else
  printf "\n${BGYELLOW}Удаляем временный репозиторий...${Color_Off}\n"
fi

echo "✅ Done"
