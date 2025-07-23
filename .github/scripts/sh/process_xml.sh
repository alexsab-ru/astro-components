#!/bin/bash

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo
    echo "Commands:"
    echo "  getone ENV_VAR [OUTPUT_FILE]     - Get one XML file using specified environment variable"
    echo "  update TYPE                      - Update cars with specific type"
    echo "  test TYPE [--dev]                - Run getone and update commands in sequence"
    echo
    echo "Environment Variable Options for 'getone':"
    echo "  AVITO_XML_URL"
    echo "  AVITO_XML_URL_DATA_CARS_CAR"
    echo "  AVITO_FRIEND_XML_URL"
    echo "  AUTORU_XML_URL"
    echo "  AUTORU_FRIEND_XML_URL"
    echo "  XML_URL"
    echo "  XML_URL_DATA_CARS_CAR"
    echo "  XML_URL_MAXPOSTER"
    echo "  XML_URL_CARCOPY"
    echo "  XML_URL_VEHICLES_VEHICLE"
    echo "  XML_URL_ADS_AD"
    echo "  USED_CARS_DATA_CARS_CAR"
    echo "  USED_CARS_MAXPOSTER"
    echo "  USED_CARS_CARCOPY"
    echo "  USED_CARS_VEHICLES_VEHICLE"
    echo "  USED_CARS_ADS_AD"
    echo
    echo "Update Types for 'update':"
    echo "  avito                - Update from Avito source"
    echo "  avito_data_cars_car  - Update from Avito with Data Cars Car source"
    echo "  avito_friend         - Update from Avito with Friend source"
    echo "  autoru               - Update from AutoRu source"
    echo "  autoru_friend        - Update from AutoRu with Friend source"
    echo "  xml_url              - Update from XML_URL source"
    echo "  data_cars_car        - Update from Data Cars Car source"
    echo "  maxposter            - Update from Maxposter source"
    echo "  carcopy              - Update from Carcopy source"
    echo "  vehicles_vehicle     - Update from Vehicles Vehicle source"
    echo "  ads_ad               - Update from Ads Ad source"
    echo "  used_cars_data_cars_car  - Update Used Cars from Data Cars Car source"
    echo "  used_cars_maxposter     - Update Used Cars from Maxposter source"
    echo "  used_cars_carcopy       - Update Used Cars from Carcopy source"
    echo "  used_cars_vehicles_vehicle - Update Used Cars from Vehicles Vehicle source"
    echo "  used_cars_ads_ad        - Update Used Cars from Ads Ad source"
    echo
    echo "Test Types for 'test':"
    echo "  avito                - Test from Avito source"
    echo "  avito_data_cars_car  - Test from Avito with Data Cars Car source"
    echo "  avito_friend         - Test from Avito with Friend source"
    echo "  autoru               - Test from AutoRu source"
    echo "  autoru_friend        - Test from AutoRu with Friend source"
    echo "  xml_url              - Test from XML_URL source"
    echo "  data_cars_car        - Test from Data Cars Car source"
    echo "  maxposter            - Test from Maxposter source"
    echo "  carcopy              - Test from Carcopy source"
    echo "  vehicles_vehicle     - Test from Vehicles Vehicle source"
    echo "  ads_ad               - Test from Ads Ad source"
    echo "  used_cars_data_cars_car  - Test Used Cars from Data Cars Car source"
    echo "  used_cars_maxposter     - Test Used Cars from Maxposter source"
    echo "  used_cars_carcopy       - Test Used Cars from Carcopy source"
    echo "  used_cars_vehicles_vehicle - Test Used Cars from Vehicles Vehicle source"
    echo "  used_cars_ads_ad        - Test Used Cars from Ads Ad source"
    echo
    echo "Examples:"
    echo "  $0 getone AVITO_XML_URL"
    echo "  $0 getone AVITO_FRIEND_XML_URL cars_friend.xml"
    echo "  $0 update avito"
    echo "  $0 update maxposter"
    echo "  $0 test maxposter --dev"
}

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'


# Get domain from .env
get_domain() {
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
    
    if [ ! -f ".env" ]; then
        echo -e "${BGRED}Error: .env file not found${Color_Off}" >&2
        return 1
    fi
    
    local line=$(grep "^${var_name}=" .env | head -n1)
    
    if [ -z "$line" ]; then
        echo -e "${BGRED}Error: ${var_name} not found in .env file${Color_Off}" >&2
        return 1
    fi
    
    local xml_url=$(echo "$line" | cut -d'=' -f2- | sed 's/^"//; s/"$//; s/^'\''//; s/'\''$//')
    
    if [ -z "$xml_url" ]; then
        echo -e "${BGRED}Error: ${var_name} found in .env but has empty value${Color_Off}" >&2
        return 1
    fi
    
    echo "$xml_url"
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
        python3 .github/scripts/getOneXML.py --output="$output_file"
    else
        python3 .github/scripts/getOneXML.py
    fi
}

# Handle test command
handle_test() {
    local type=$1
    local run_dev=$2
    
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
        "maxposter")
            handle_getone "XML_URL_MAXPOSTER"
            handle_update "maxposter"
            ;;
        "carcopy")
            handle_getone "XML_URL_CARCOPY"
            handle_update "carcopy"
            ;;
        "vehicles")
            handle_getone "XML_URL_VEHICLES_VEHICLE"
            handle_update "vehicles_vehicle"
            ;;
        "ads_ad")
            handle_getone "XML_URL_ADS_AD"
            handle_update "ads_ad"
            ;;
        "used_cars_data_cars_car")
            handle_getone "USED_CARS_DATA_CARS_CAR"
            handle_update "used_cars_data_cars_car"
            ;;
        "used_cars_maxposter")
            handle_getone "USED_CARS_MAXPOSTER"
            handle_update "used_cars_maxposter"
            ;;
        "used_cars_carcopy")
            handle_getone "USED_CARS_CARCOPY"
            handle_update "used_cars_carcopy"
            ;;
        "used_cars_vehicles_vehicle")
            handle_getone "USED_CARS_VEHICLES_VEHICLE"
            handle_update "used_cars_vehicles_vehicle"
            ;;
        "used_cars_ads_ad")
            handle_getone "USED_CARS_ADS_AD"
            handle_update "used_cars_ads_ad"
            ;;
        *)
            echo -e "${BGRED}Error: Unknown test type: $type${Color_Off}"
            show_help
            exit 1
            ;;
    esac
    
    if [ "$run_dev" = "--dev" ]; then
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
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito.xml" --domain="$DOMAIN"
            ;;
        "avito_data_cars_car")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/avito.xml" --domain="$DOMAIN"
            ;;
        "avito_friend")
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito_dc.xml" --domain=$DOMAIN
            python3 .github/scripts/update_cars_air_storage.py --config_path="./.github/scripts/config_air_storage-friend.json" --source_type avito --input_file cars_friend.xml --output_path="./public/avito_friend.xml" --domain=$DOMAIN
            export XML_URL="./public/avito_dc.xml ./public/avito_friend.xml" 
            python3 .github/scripts/getOneXML.py --output_path="./public/avito.xml"
            ;;
        "autoru")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/autoru.xml" --domain="$DOMAIN"
            ;;
        "autoru_friend")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/autoru_dc.xml" --domain=$DOMAIN
            python3 .github/scripts/update_cars_air_storage.py --config_path="./.github/scripts/config_air_storage-friend.json" --source_type autoru --input_file cars_friend.xml --output_path="./public/autoru_friend.xml" --domain=$DOMAIN
            export XML_URL="./public/autoru_dc.xml ./public/autoru_friend.xml" 
            python3 .github/scripts/getOneXML.py --output_path="./public/autoru.xml"
            ;;
        "xml_url")
            python3 .github/scripts/create_cars.py --skip_thumbs --domain="$DOMAIN"
            ;;
        "data_cars_car")
            python3 .github/scripts/update_cars.py --input_file "./tmp/new/data-cars-car/cars.xml" --source_type data_cars_car --skip_thumbs --domain="$DOMAIN"
            ;;
        "maxposter")
            python3 .github/scripts/update_cars.py --input_file "./tmp/new/maxposter/cars.xml" --source_type maxposter --image_tag="photo" --skip_thumbs --domain="$DOMAIN"
            ;;
        "carcopy")
            python3 .github/scripts/update_cars.py --input_file "./tmp/new/carcopy/cars.xml" --source_type carcopy --image_tag="photo" --description_tag="comment" --skip_thumbs --domain="$DOMAIN"
            ;;
        "vehicles_vehicle")
            python3 .github/scripts/update_cars.py --input_file "./tmp/new/vehicles-vehicle/cars.xml" --source_type vehicles_vehicle --image_tag="photo" --skip_thumbs --domain="$DOMAIN"
            ;;
        "ads_ad")
            python3 .github/scripts/update_cars.py --input_file "./tmp/new/ads-ad/cars.xml" --source_type ads_ad --image_tag="photo" --skip_thumbs --domain="$DOMAIN"
            ;;
        "used_cars_data_cars_car")
            python3 .github/scripts/update_cars.py --input_file "./tmp/used_cars/data-cars-car/used_cars_cars.xml" --source_type data_cars_car --skip_thumbs --domain="$DOMAIN" --cars_dir="src/content/used_cars" --output_path="./public/used_cars.xml" --thumbs_dir="public/img/thumbs_used/" --path_car_page="/used_cars/"
            ;;
        "used_cars_maxposter")
            python3 .github/scripts/update_cars.py --input_file "./tmp/used_cars/maxposter/cars.xml" --source_type maxposter --image_tag="photo" --skip_thumbs --domain="$DOMAIN"
            ;;
        "used_cars_carcopy")
            python3 .github/scripts/update_cars.py --input_file "./tmp/used_cars/carcopy/cars.xml" --source_type carcopy --image_tag="photo" --description_tag="comment" --skip_thumbs --domain="$DOMAIN"
            ;;
        "used_cars_vehicles_vehicle")
            python3 .github/scripts/update_cars.py --input_file "./tmp/used_cars/vehicles-vehicle/cars.xml" --source_type vehicles_vehicle --image_tag="photo" --skip_thumbs --domain="$DOMAIN"
            ;;
        "used_cars_ads_ad")
            python3 .github/scripts/update_cars.py --input_file "./tmp/used_cars/ads-ad/cars.xml" --source_type ads_ad --image_tag="photo" --skip_thumbs --domain="$DOMAIN"
            ;;
        *)
            echo -e "${BGRED}Error: Unknown update type: $type${Color_Off}"
            show_help
            exit 1
            ;;
    esac
}

# Main script
if [ "$#" -lt 2 ]; then
    show_help
    exit 1
fi

command=$1
shift

case $command in
    "getone")
        if [ "$#" -lt 1 ]; then
            echo -e "${BGRED}Error: getone requires an environment variable name${Color_Off}"
            show_help
            exit 1
        fi
        handle_getone "$@"
        ;;
    "update")
        if [ "$#" -lt 1 ]; then
            echo -e "${BGRED}Error: update requires a type${Color_Off}"
            show_help
            exit 1
        fi
        handle_update "$@"
        ;;
    "test")
        if [ "$#" -lt 1 ]; then
            echo -e "${BGRED}Error: test requires a type${Color_Off}"
            show_help
            exit 1
        fi
        handle_test "$@"
        ;;
    *)
        echo -e "${BGRED}Error: Unknown command: $command${Color_Off}"
        show_help
        exit 1
        ;;
esac