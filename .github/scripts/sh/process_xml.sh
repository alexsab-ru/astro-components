#!/bin/bash

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo
    echo "Commands:"
    echo "  getone ENV_VAR [OUTPUT_FILE]     - Get one XML file using specified environment variable"
    echo "  update TYPE                      - Update cars with specific type"
    echo "  test TYPE [--dev] [--thumbs]     - Run getone and update commands in sequence"
    echo
    echo "Options:"
    echo "  --thumbs                         - Enable thumbnail generation (default: disabled)"
    echo "  --dev                            - Run dev server after processing"
    echo
    echo "Environment Variable Options for 'getone':"
    echo "  AVITO_XML_URL"
    echo "  AVITO_XML_URL_DATA_CARS_CAR"
    echo "  AVITO_FRIEND_XML_URL"
    echo "  AUTORU_XML_URL"
    echo "  AUTORU_FRIEND_XML_URL"
    echo "  XML_URL_DATA_CARS_CAR"
    echo "  XML_URL_MAXPOSTER"
    echo "  XML_URL_CARCOPY"
    echo "  XML_URL_VEHICLES_VEHICLE"
    echo "  USED_CARS_DATA_CARS_CAR"
    echo
    echo "Update Types for 'update':"
    echo "  avito                - Update from Avito source"
    echo "  avito_data_cars_car  - Update from Avito with Data Cars Car source"
    echo "  avito_friend         - Update from Avito with Friend source"
    echo "  autoru               - Update from AutoRu source"
    echo "  autoru_friend        - Update from AutoRu with Friend source"
    echo "  data_cars_car        - Update from Data Cars Car source"
    echo "  maxposter            - Update from Maxposter source"
    echo "  carcopy              - Update from Carcopy source"
    echo "  vehicles_vehicle     - Update from Vehicles Vehicle source"
    echo "  used_cars_data_cars_car  - Update Used Cars from Data Cars Car source"
    echo
    echo "Test Types for 'test':"
    echo "  avito                - Test from Avito source"
    echo "  avito_data_cars_car  - Test from Avito with Data Cars Car source"
    echo "  avito_friend         - Test from Avito with Friend source"
    echo "  autoru               - Test from AutoRu source"
    echo "  autoru_friend        - Test from AutoRu with Friend source"
    echo "  data_cars_car        - Test from Data Cars Car source"
    echo "  maxposter            - Test from Maxposter source"
    echo "  carcopy              - Test from Carcopy source"
    echo "  vehicles_vehicle     - Test from Vehicles Vehicle source"
    echo "  used_cars_data_cars_car  - Test Used Cars from Data Cars Car source"
    echo
    echo "Examples:"
    echo "  $0 getone AVITO_XML_URL"
    echo "  $0 getone AVITO_FRIEND_XML_URL cars_friend.xml"
    echo "  $0 update avito"
    echo "  $0 update maxposter"
    echo "  $0 test maxposter --dev"
    echo "  $0 test data_cars_car --thumbs"
    echo "  $0 update data_cars_car --thumbs"
}

# Get domain from .env
get_domain() {
    DOMAIN=$(grep '^DOMAIN=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    if [ -z "$DOMAIN" ]; then
        echo "Error: DOMAIN not found in .env file"
        exit 1
    fi
    echo $DOMAIN
}

# Get FTP config from .env
get_ftp_config() {
    FTP_HOST=$(grep '^FTP_HOST=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    FTP_USER=$(grep '^FTP_USER=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    FTP_PASSWORD=$(grep '^FTP_PASSWORD=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    FTP_PATH=$(grep '^FTP_PATH=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    FTP_BASE_URL=$(grep '^FTP_BASE_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    
    if [ -n "$FTP_HOST" ] && [ -n "$FTP_USER" ] && [ -n "$FTP_PASSWORD" ] && [ -n "$FTP_PATH" ] && [ -n "$FTP_BASE_URL" ]; then
        echo "FTP_HOST=$FTP_HOST FTP_USER=$FTP_USER FTP_PASSWORD=$FTP_PASSWORD FTP_PATH=$FTP_PATH FTP_BASE_URL=$FTP_BASE_URL"
    else
        echo ""
    fi
}

# Get XML URL from .env by variable name
get_xml_url() {
    local var_name=$1
    XML_URL=$(grep "^${var_name}=" .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
    if [ -z "$XML_URL" ]; then
        echo "Error: ${var_name} not found in .env file"
        exit 1
    fi
    echo $XML_URL
}

# Handle getone command
handle_getone() {
    local env_var=$1
    local output_file=$2
    
    export XML_URL=$(get_xml_url "$env_var")
    
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
    local enable_thumbs=$3
    
    case $type in
        "avito")
            handle_getone "AVITO_XML_URL"
            handle_update "avito" "$enable_thumbs"
            ;;
        "avito_data_cars_car")
            handle_getone "AVITO_XML_URL_DATA_CARS_CAR"
            handle_update "avito_data_cars_car" "$enable_thumbs"
            ;;
        "avito_friend")
            handle_getone "AVITO_XML_URL"
            handle_getone "AVITO_FRIEND_XML_URL" "cars_friend.xml"
            handle_update "avito_friend" "$enable_thumbs"
            ;;
        "autoru")
            handle_getone "AUTORU_XML_URL"
            handle_update "autoru" "$enable_thumbs"
            ;;
        "autoru_friend")
            handle_getone "AUTORU_XML_URL"
            handle_getone "AUTORU_FRIEND_XML_URL" "cars_friend.xml"
            handle_update "autoru_friend" "$enable_thumbs"
            ;;
        "data_cars_car")
            handle_getone "XML_URL_DATA_CARS_CAR"
            handle_update "data_cars_car" "$enable_thumbs"
            ;;
        "used_cars_data_cars_car")
            handle_getone "USED_CARS_DATA_CARS_CAR"
            handle_update "used_cars_data_cars_car" "$enable_thumbs"
            ;;
        "maxposter")
            handle_getone "XML_URL_MAXPOSTER"
            handle_update "maxposter" "$enable_thumbs"
            ;;
        "carcopy")
            handle_getone "XML_URL_CARCOPY"
            handle_update "carcopy" "$enable_thumbs"
            ;;
        "vehicles_vehicle")
            handle_getone "XML_URL_VEHICLES_VEHICLE"
            handle_update "vehicles_vehicle" "$enable_thumbs"
            ;;
        *)
            echo "Error: Unknown test type: $type"
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
    local enable_thumbs=$2
    export DOMAIN=$(get_domain)
    export $(get_ftp_config)
    
    # Определяем параметр для пропуска генерации превьюшек
    local skip_thumbs_param="--skip_thumbs"
    if [ "$enable_thumbs" = "--thumbs" ]; then
        skip_thumbs_param=""
    fi
    
    case $type in
        "avito")
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito.xml" --domain="$DOMAIN" $skip_thumbs_param
            ;;
        "avito_data_cars_car")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/avito.xml" --domain="$DOMAIN" $skip_thumbs_param
            ;;
        "avito_friend")
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito_dc.xml" --domain=$DOMAIN $skip_thumbs_param
            python3 .github/scripts/update_cars_air_storage.py --config_path="./.github/scripts/config_air_storage-friend.json" --source_type avito --input_file cars_friend.xml --output_path="./public/avito_friend.xml" --domain=$DOMAIN $skip_thumbs_param
            export XML_URL="./public/avito_dc.xml ./public/avito_friend.xml" 
            python3 .github/scripts/getOneXML.py --output_path="./public/avito.xml"
            ;;
        "autoru")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/autoru.xml" --domain="$DOMAIN" $skip_thumbs_param
            ;;
        "autoru_friend")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/autoru_dc.xml" --domain=$DOMAIN $skip_thumbs_param
            python3 .github/scripts/update_cars_air_storage.py --config_path="./.github/scripts/config_air_storage-friend.json" --source_type autoru --input_file cars_friend.xml --output_path="./public/autoru_friend.xml" --domain=$DOMAIN $skip_thumbs_param
            export XML_URL="./public/autoru_dc.xml ./public/autoru_friend.xml" 
            python3 .github/scripts/getOneXML.py --output_path="./public/autoru.xml"
            ;;
        "data_cars_car")
            echo $skip_thumbs_param
            python3 .github/scripts/update_cars.py --source_type data_cars_car $skip_thumbs_param --domain="$DOMAIN"
            ;;
        "used_cars_data_cars_car")
            python3 .github/scripts/update_cars.py --source_type data_cars_car $skip_thumbs_param --domain="$DOMAIN" --cars_dir="src/content/used_cars" --output_path="./public/used_cars.xml" --thumbs_dir="public/img/thumbs_used/" --path_car_page="/used_cars/"
            ;;
        "maxposter")
            python3 .github/scripts/update_cars.py --source_type maxposter --image_tag="photo" $skip_thumbs_param --domain="$DOMAIN"
            ;;
        "carcopy")
            python3 .github/scripts/update_cars.py --source_type carcopy --image_tag="photo" --description_tag="comment" $skip_thumbs_param --domain="$DOMAIN"
            ;;
        "vehicles_vehicle")
            python3 .github/scripts/update_cars.py --source_type vehicles_vehicle --image_tag="photo" $skip_thumbs_param --domain="$DOMAIN"
            ;;
        *)
            echo "Error: Unknown update type: $type"
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

# Parse options first
enable_thumbs=""
run_dev=""
args=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --thumbs)
            enable_thumbs="--thumbs"
            shift
            ;;
        --dev)
            run_dev="--dev"
            shift
            ;;
        *)
            args+=("$1")
            shift
            ;;
    esac
done

# Now process the command and its arguments
command="${args[0]}"
type="${args[1]}"

echo "Command: $command"
echo "Type: $type"
echo "Enable thumbs: $enable_thumbs"
echo "Run dev: $run_dev"

case $command in
    "getone")
        if [ -z "$type" ]; then
            echo "Error: getone requires an environment variable name"
            show_help
            exit 1
        fi
        handle_getone "$type" "${args[2]}"
        ;;
    "update")
        if [ -z "$type" ]; then
            echo "Error: update requires a type"
            show_help
            exit 1
        fi
        handle_update "$type" "$enable_thumbs"
        ;;
    "test")
        if [ -z "$type" ]; then
            echo "Error: test requires a type"
            show_help
            exit 1
        fi
        handle_test "$type" "$run_dev" "$enable_thumbs"
        ;;
    *)
        echo "Error: Unknown command: $command"
        show_help
        exit 1
        ;;
esac