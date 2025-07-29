#!/bin/bash

# Help function
show_help() {
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo
    echo "Commands:"
    echo "  getone ENV_VAR [OUTPUT_FILE]     - Get one XML file using specified environment variable"
    echo "  update TYPE [OPTIONS]            - Update cars with specific type"
    echo "  auto [OPTIONS]                   - Automatically process all XML files in ./tmp/feeds/new and ./tmp/feeds/used_cars"
    echo "  test TYPE [OPTIONS]              - Run getone and update commands in sequence"
    echo
    echo "Options (can be used with update, auto, test commands):"
    echo "  --skip_thumbs                    - Skip thumbnail generation"
    echo "  --count_thumbs N                 - Number of thumbnails to generate (default: 5)"
    echo "  --skip_check_thumb               - Skip thumbnail existence check"
    echo "  --dev                            - Start dev server after processing (for auto and test)"
    echo
    echo "Environment Variable Options for 'getone':"
    echo "  AVITO_XML_URL"
    echo "  AVITO_XML_URL_DATA_CARS_CAR"
    echo "  AVITO_FRIEND_XML_URL"
    echo "  AUTORU_XML_URL"
    echo "  AUTORU_FRIEND_XML_URL"
    echo "  XML_URL"
    echo "  XML_URL_DATA_CARS_CAR"
    echo "  XML_URL_CATALOG_VEHICLES_VEHICLE"
    echo "  XML_URL_VEHICLES_VEHICLE"
    echo "  XML_URL_ADS_AD"
    echo "  XML_URL_CARCOPY_OFFERS_OFFER"
    echo "  XML_URL_YML_CATALOG_SHOP_OFFERS_OFFER"
    echo "  USED_CARS_DATA_CARS_CAR"
    echo "  USED_CARS_CATALOG_VEHICLES_VEHICLE"
    echo "  USED_CARS_VEHICLES_VEHICLE"
    echo "  USED_CARS_ADS_AD"
    echo "  USED_CARS_CARCOPY_OFFERS_OFFER"
    echo "  USED_CARS_YML_CATALOG_SHOP_OFFERS_OFFER"
    echo
    echo "Auto Command:"
    echo "  auto [--dev]                     - Automatically scan and process all XML files"
    echo "                                     in ./tmp/feeds/new and ./tmp/feeds/used_cars directories"
    echo
    echo "Update Types for 'update':"
    echo "  avito                                   - Update from Avito source"
    echo "  avito_data_cars_car                     - Update from Avito with Data Cars Car source"
    echo "  avito_friend                            - Update from Avito with Friend source"
    echo "  autoru                                  - Update from AutoRu source"
    echo "  autoru_friend                           - Update from AutoRu with Friend source"
    echo "  xml_url                                 - Update from XML_URL source"
    echo "  data_cars_car                           - Update from Data Cars Car source"
    echo "  catalog_vehicles_vehicle                - Update from Catalog Vehicles Vehicle source"
    echo "  vehicles_vehicle                        - Update from Vehicles Vehicle source"
    echo "  ads_ad                                  - Update from Ads Ad source"
    echo "  carcopy_offers_offer                    - Update from Carcopy source"
    echo "  yml_catalog_shop_offers_offer           - Update from yml_catalog source"
    echo "  used_cars_data_cars_car                 - Update Used Cars from Data Cars Car source"
    echo "  used_cars_catalog_vehicles_vehicle      - Update Used Cars from Vehicles Vehicle source"
    echo "  used_cars_vehicles_vehicle              - Update Used Cars from Vehicles Vehicle source"
    echo "  used_cars_ads_ad                        - Update Used Cars from Ads Ad source"
    echo "  used_cars_carcopy_offers_offer          - Update Used Cars from Carcopy source"
    echo "  used_cars_yml_catalog_shop_offers_offer - Update Used Cars from yml_catalog source"
    echo
    echo "Test Types for 'test':"
    echo "  avito                                   - Test from Avito source"
    echo "  avito_data_cars_car                     - Test from Avito with Data Cars Car source"
    echo "  avito_friend                            - Test from Avito with Friend source"
    echo "  autoru                                  - Test from AutoRu source"
    echo "  autoru_friend                           - Test from AutoRu with Friend source"
    echo "  xml_url                                 - Test from XML_URL source"
    echo "  data_cars_car                           - Test from Data Cars Car source"
    echo "  catalog_vehicles_vehicle                - Test from Catalog Vehicles Vehicle source"
    echo "  vehicles_vehicle                        - Test from Vehicles Vehicle source"
    echo "  ads_ad                                  - Test from Ads Ad source"
    echo "  carcopy_offers_offer                    - Test from Carcopy source"
    echo "  yml_catalog_shop_offers_offer           - Test from yml_catalog source"
    echo "  used_cars_data_cars_car                 - Test Used Cars from Data Cars Car source"
    echo "  used_cars_catalog_vehicles_vehicle      - Test Used Cars from Catalog Vehicles Vehicle source"
    echo "  used_cars_vehicles_vehicle              - Test Used Cars from Vehicles Vehicle source"
    echo "  used_cars_ads_ad                        - Test Used Cars from Ads Ad source"
    echo "  used_cars_carcopy_offers_offer          - Test Used Cars from Carcopy source"
    echo "  used_cars_yml_catalog_shop_offers_offer - Test Used Cars from yml_catalog source"
    echo
    echo "Examples:"
    echo "  $0 getone AVITO_XML_URL"
    echo "  $0 getone AVITO_FRIEND_XML_URL cars_friend.xml"
    echo "  $0 update avito"
    echo "  $0 update vehicles_vehicle --skip_thumbs"
    echo "  $0 auto"
    echo "  $0 auto --skip_thumbs --dev"
    echo "  $0 test data_cars_car --count_thumbs 10 --dev"
    echo "  $0 update ads_ad --skip_thumbs --skip_check_thumb"
}

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

# Parse thumbnail and dev options from arguments
parse_options() {
    local thumb_args=""
    local dev_mode=""
    local remaining_args=()
    
    # Debug: показываем входящие аргументы
    # echo "🔧 parse_options получила аргументы: $*" >&2
    
    while [ $# -gt 0 ]; do
        # echo "🔧 Обрабатываем аргумент: '$1'" >&2
        case "$1" in
            --skip_thumbs)
                thumb_args="$thumb_args --skip_thumbs"
                # echo "🔧 Добавили --skip_thumbs, thumb_args='$thumb_args'" >&2
                shift
                ;;
            --count_thumbs)
                if [ -n "$2" ] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    thumb_args="$thumb_args --count_thumbs $2"
                    # echo "🔧 Добавили --count_thumbs $2, thumb_args='$thumb_args'" >&2
                    shift 2
                else
                    echo -e "${BGRED}Error: --count_thumbs requires a numeric value${Color_Off}"
                    exit 1
                fi
                ;;
            --skip_check_thumb)
                thumb_args="$thumb_args --skip_check_thumb"
                # echo "🔧 Добавили --skip_check_thumb, thumb_args='$thumb_args'" >&2
                shift
                ;;
            --dev)
                dev_mode="--dev"
                # echo "🔧 Добавили --dev, dev_mode='$dev_mode'" >&2
                shift
                ;;
            *)
                remaining_args+=("$1")
                # echo "🔧 Добавили в remaining_args: '$1'" >&2
                shift
                ;;
        esac
    done
    
    # echo "🔧 Итоговые thumb_args='$thumb_args'" >&2
    # echo "🔧 Итоговый dev_mode='$dev_mode'" >&2
    # echo "🔧 Итоговые remaining_args: ${remaining_args[*]}" >&2
    
    # Возвращаем результат в специальном формате: THUMB_ARGS|DEV_MODE|remaining_args...
    echo "THUMB_ARGS:$thumb_args"
    echo "DEV_MODE:$dev_mode"
    printf 'ARG:%s\n' "${remaining_args[@]}"
}

# Get variable from .env by name
get_var_from_env() {
    local var_name=$1
    local value="${!var_name}"
    if [ -n "$value" ]; then
        echo "$value"
        return 0
    fi
}


# Get domain from .env
get_domain() {

    # 1. Пробуем получить из окружения
    local value=$(get_var_from_env "DOMAIN")
    if [ -n "$value" ]; then
        echo "$value"
        return 0
    fi

    # 2. Если не найдено — ищем в .env с нужными преобразованиями
    if [ ! -f ".env" ]; then
        echo -e "${BGRED}Error: .env file not found${Color_Off}" >&2
        return 1
    fi

    DOMAIN=$(grep '^DOMAIN=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    if [ -z "$DOMAIN" ]; then
        echo -e "${BGRED}Error: DOMAIN not found in .env file${Color_Off}"
        return 1
    fi
    echo $DOMAIN
    return 0
}

# Get XML URL from .env by variable name
get_xml_url() {
    local var_name=$1

    # 1. Пробуем получить из окружения
    local value=$(get_var_from_env "$var_name")
    if [ -n "$value" ]; then
        echo "$value"
        return 0
    fi
    
    # 2. Если не найдено — ищем в .env с нужными преобразованиями
    if [ ! -f ".env" ]; then
        echo -e "${BGRED}Error: .env file not found${Color_Off}" >&2
        return 1
    fi
    
    # Получаем все строки с данной переменной
    local lines=$(grep "^${var_name}=" .env)
    
    if [ -z "$lines" ]; then
        echo -e "${BGRED}Error: ${var_name} not found in environment or .env file${Color_Off}" >&2
        return 1
    fi
    
    local all_values=""
    
    # Обрабатываем каждую строку
    while IFS= read -r line; do
        local value=$(echo "$line" | cut -d'=' -f2- | sed 's/^"//; s/"$//; s/^'\''//; s/'\''$//')
        
        if [ -n "$value" ]; then
            if [ -z "$all_values" ]; then
                all_values="$value"
            else
                all_values="$all_values $value"
            fi
        fi
    done <<< "$lines"
    
    if [ -z "$all_values" ]; then
        echo -e "${BGRED}Error: ${var_name} found in .env but all values are empty${Color_Off}" >&2
        return 1
    fi
    
    echo "$all_values"
    return 0
}

# Handle getone command
handle_getone() {
    local env_var=$1
    local output_file=$2
    
    # Получаем URL и проверяем успешность выполнения
    XML_URL=$(get_xml_url "$env_var")
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        # Если функция вернула ошибку, завершаем основной скрипт
        exit 0
    fi
    
    export XML_URL
    
    if [ -n "$output_file" ]; then
        python3 .github/scripts/getOneXML.py --output_path="$output_file"
    else
        python3 .github/scripts/getOneXML.py
    fi
}

# Handle auto command
handle_auto() {
    echo -e "${BGYELLOW}🔄 Запуск автоматической обработки всех XML файлов...${Color_Off}"
    
    DOMAIN=$(get_domain)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        # Если функция вернула ошибку, завершаем основной скрипт
        exit 0
    fi
    
    export DOMAIN
    
    # Проверяем наличие директорий
    if [ ! -d "./tmp/feeds/new" ] && [ ! -d "./tmp/feeds/used_cars" ]; then
        echo -e "${BGRED}❌ Директории ./tmp/feeds/new и ./tmp/feeds/used_cars не найдены${Color_Off}"
        echo -e "${BGYELLOW}💡 Убедитесь, что XML файлы размещены в правильных директориях:${Color_Off}"
        echo "   - Новые автомобили: ./tmp/feeds/new/{тип_фида}/cars.xml"
        echo "   - Б/у автомобили: ./tmp/feeds/used_cars/{тип_фида}/cars.xml"
        echo "   - Поддерживаемые типы: data_cars_car, catalog_vehicles_vehicle, vehicles_vehicle, ads_ad, carcopy_offers_offer, yml_catalog_shop_offers_offer"
        return 0
    fi
    
    # Запускаем автоматическую обработку
    echo -e "${BGYELLOW}🎯 Команда: python3 .github/scripts/update_cars.py --auto_scan $THUMB_ARGS --domain=\"$DOMAIN\"${Color_Off}"
    python3 .github/scripts/update_cars.py --auto_scan $THUMB_ARGS --domain="$DOMAIN"
    
    if [ $? -eq 0 ]; then
        echo -e "${BGGREEN}✅ Автоматическая обработка завершена успешно${Color_Off}"
    else
        echo -e "${BGRED}❌ Ошибка при автоматической обработке${Color_Off}"
        return 1
    fi
    
    if [ -n "$DEV_MODE" ]; then
        echo -e "${BGYELLOW}🚀 Запуск dev сервера...${Color_Off}"
        pnpm dev
    fi
}

# Handle test command
handle_test() {
    local type=$1
    
    case $type in
        "avito")
            handle_getone "AVITO_XML_URL"
            handle_update "avito"
            ;;
        "avito_data_cars_car")
            handle_getone "AVITO_XML_URL_DATA_CARS_CAR"
            handle_update "avito_data_cars_car"
            ;;
        "avito_friend")
            handle_getone "AVITO_XML_URL"
            handle_getone "AVITO_FRIEND_XML_URL" "cars_friend.xml"
            handle_update "avito_friend"
            ;;
        "autoru")
            handle_getone "AUTORU_XML_URL"
            handle_update "autoru"
            ;;
        "autoru_friend")
            handle_getone "AUTORU_XML_URL"
            handle_getone "AUTORU_FRIEND_XML_URL" "cars_friend.xml"
            handle_update "autoru_friend"
            ;;
        "xml_url")
            handle_getone "XML_URL"
            handle_update "xml_url"
            ;;
        "data_cars_car")
            handle_getone "XML_URL_DATA_CARS_CAR"
            handle_update "data_cars_car"
            ;;
        "catalog_vehicles_vehicle")
            handle_getone "XML_URL_CATALOG_VEHICLES_VEHICLE"
            handle_update "catalog_vehicles_vehicle"
            ;;
        "vehicles_vehicle")
            handle_getone "XML_URL_VEHICLES_VEHICLE"
            handle_update "vehicles_vehicle"
            ;;
        "ads_ad")
            handle_getone "XML_URL_ADS_AD"
            handle_update "ads_ad"
            ;;
        "carcopy_offers_offer")
            handle_getone "XML_URL_CARCOPY_OFFERS_OFFER"
            handle_update "carcopy_offers_offer"
            ;;
        "used_cars_data_cars_car")
            handle_getone "USED_CARS_DATA_CARS_CAR"
            handle_update "used_cars_data_cars_car"
            ;;
        "used_cars_catalog_vehicles_vehicle")
            handle_getone "USED_CARS_CATALOG_VEHICLES_VEHICLE"
            handle_update "used_cars_catalog_vehicles_vehicle"
            ;;
        "used_cars_vehicles_vehicle")
            handle_getone "USED_CARS_VEHICLES_VEHICLE"
            handle_update "used_cars_vehicles_vehicle"
            ;;
        "used_cars_ads_ad")
            handle_getone "USED_CARS_ADS_AD"
            handle_update "used_cars_ads_ad"
            ;;
        "used_cars_carcopy_offers_offer")
            handle_getone "USED_CARS_CARCOPY_OFFERS_OFFER"
            handle_update "used_cars_carcopy_offers_offer"
            ;;
        *)
            echo -e "${BGRED}Error: Unknown test type: $type${Color_Off}"
            show_help
            exit 1
            ;;
    esac
    
    if [ -n "$DEV_MODE" ]; then
        pnpm dev
    fi
}

# Handle update command
handle_update() {
    local type=$1
    
    DOMAIN=$(get_domain)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        # Если функция вернула ошибку, завершаем основной скрипт
        exit 0
    fi
    
    export DOMAIN
    
    case $type in
        "avito")
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito.xml" --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "avito_data_cars_car")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/avito.xml" --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "avito_friend")
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito_dc.xml" --domain=$DOMAIN $THUMB_ARGS
            python3 .github/scripts/update_cars_air_storage.py --config_path="./.github/scripts/config_air_storage-friend.json" --source_type avito --input_file cars_friend.xml --output_path="./public/avito_friend.xml" --domain=$DOMAIN $THUMB_ARGS
            export XML_URL="./public/avito_dc.xml ./public/avito_friend.xml" 
            python3 .github/scripts/getOneXML.py --output_path="./public/avito.xml"
            ;;
        "autoru")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/autoru.xml" --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "autoru_friend")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/autoru_dc.xml" --domain=$DOMAIN $THUMB_ARGS
            python3 .github/scripts/update_cars_air_storage.py --config_path="./.github/scripts/config_air_storage-friend.json" --source_type autoru --input_file cars_friend.xml --output_path="./public/autoru_friend.xml" --domain=$DOMAIN $THUMB_ARGS
            export XML_URL="./public/autoru_dc.xml ./public/autoru_friend.xml" 
            python3 .github/scripts/getOneXML.py --output_path="./public/autoru.xml"
            ;;
        "xml_url")
            python3 .github/scripts/update_cars.py --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "data_cars_car")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/new/data_cars_car/cars.xml" --source_type data_cars_car --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "catalog_vehicles_vehicle")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/new/catalog_vehicles_vehicle/cars.xml" --source_type catalog_vehicles_vehicle --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "vehicles_vehicle")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/new/vehicles_vehicle/cars.xml" --source_type vehicles_vehicle --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "ads_ad")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/new/ads_ad/cars.xml" --source_type ads_ad --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "carcopy_offers_offer")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/new/carcopy_offers_offer/cars.xml" --source_type carcopy_offers_offer --domain="$DOMAIN" $THUMB_ARGS
            ;;
        "used_cars_data_cars_car")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/used_cars/data_cars_car/cars.xml" --source_type data_cars_car --domain="$DOMAIN" --cars_dir="src/content/used_cars" --output_path="./public/used_cars.xml" --thumbs_dir="public/img/thumbs_used/" --path_car_page="/used_cars/" $THUMB_ARGS
            ;;
        "used_cars_catalog_vehicles_vehicle")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/used_cars/catalog_vehicles_vehicle/cars.xml" --source_type catalog_vehicles_vehicle --domain="$DOMAIN" --cars_dir="src/content/used_cars" --output_path="./public/used_cars.xml" --thumbs_dir="public/img/thumbs_used/" --path_car_page="/used_cars/" $THUMB_ARGS
            ;;
        "used_cars_vehicles_vehicle")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/used_cars/vehicles_vehicle/cars.xml" --source_type vehicles_vehicle --domain="$DOMAIN" --cars_dir="src/content/used_cars" --output_path="./public/used_cars.xml" --thumbs_dir="public/img/thumbs_used/" --path_car_page="/used_cars/" $THUMB_ARGS
            ;;
        "used_cars_ads_ad")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/used_cars/ads_ad/cars.xml" --source_type ads_ad --domain="$DOMAIN" --cars_dir="src/content/used_cars" --output_path="./public/used_cars.xml" --thumbs_dir="public/img/thumbs_used/" --path_car_page="/used_cars/" $THUMB_ARGS
            ;;
        "used_cars_carcopy_offers_offer")
            python3 .github/scripts/update_cars.py --input_file "./tmp/feeds/used_cars/carcopy_offers_offer/cars.xml" --source_type carcopy_offers_offer --domain="$DOMAIN" --cars_dir="src/content/used_cars" --output_path="./public/used_cars.xml" --thumbs_dir="public/img/thumbs_used/" --path_car_page="/used_cars/" $THUMB_ARGS
            ;;
        *)
            echo -e "${BGRED}Error: Unknown update type: $type${Color_Off}"
            show_help
            exit 1
            ;;
    esac
}

# Main script
if [ "$#" -lt 1 ]; then
    show_help
    exit 1
fi

# Parse arguments and extract options
parse_result=$(parse_options "$@")

# Initialize variables
THUMB_ARGS=""
DEV_MODE=""
remaining_args=()

# Parse the result from parse_options
while IFS= read -r line; do
    if [[ $line == THUMB_ARGS:* ]]; then
        THUMB_ARGS="${line#THUMB_ARGS:}"
    elif [[ $line == DEV_MODE:* ]]; then
        DEV_MODE="${line#DEV_MODE:}"
    elif [[ $line == ARG:* ]]; then
        remaining_args+=("${line#ARG:}")
    fi
done <<< "$parse_result"

if [ ${#remaining_args[@]} -lt 1 ]; then
    show_help
    exit 1
fi

command="${remaining_args[0]}"
command_args=("${remaining_args[@]:1}")  # All arguments except the first one

# Debug output (можно убрать после тестирования)
# echo -e "${BGYELLOW}🔧 Debug: THUMB_ARGS='$THUMB_ARGS'${Color_Off}"
# echo -e "${BGYELLOW}🔧 Debug: DEV_MODE='$DEV_MODE'${Color_Off}"
# echo -e "${BGYELLOW}🔧 Debug: command='$command'${Color_Off}"
# echo -e "${BGYELLOW}🔧 Debug: command_args=(${command_args[*]})${Color_Off}"

case $command in
    "getone")
        if [ ${#command_args[@]} -lt 1 ]; then
            echo -e "${BGRED}Error: getone requires an environment variable name${Color_Off}"
            show_help
            exit 1
        fi
        handle_getone "${command_args[@]}"
        ;;
    "update")
        if [ ${#command_args[@]} -lt 1 ]; then
            echo -e "${BGRED}Error: update requires a type${Color_Off}"
            show_help
            exit 1
        fi
        handle_update "${command_args[0]}"
        ;;
    "auto")
        handle_auto
        ;;
    "test")
        if [ ${#command_args[@]} -lt 1 ]; then
            echo -e "${BGRED}Error: test requires a type${Color_Off}"
            show_help
            exit 1
        fi
        handle_test "${command_args[0]}"
        ;;
    *)
        echo -e "${BGRED}Error: Unknown command: $command${Color_Off}"
        show_help
        exit 1
        ;;
esac