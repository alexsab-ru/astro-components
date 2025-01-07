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
    echo "  XML_URL_DATA_CARS_CAR"
    echo "  XML_URL_MAXPOSTER"
    echo "  XML_URL_CARCOPY"
    echo "  XML_URL_VEHICLES_VEHICLE"
    echo
    echo "Update Types for 'update':"
    echo "  avito                - Update from Avito source"
    echo "  avito_data_cars_car  - Update from Avito with Data Cars Car source"
    echo "  avito_friend         - Update from Avito with Friend source"
    echo "  autoru               - Update from AutoRu source"
    echo "  data_cars_car        - Update from Data Cars Car source"
    echo "  maxposter            - Update from Maxposter source"
    echo "  carcopy              - Update from Carcopy source"
    echo "  vehicles_vehicle     - Update from Vehicles Vehicle source"
    echo
    echo "Test Types for 'test':"
    echo "  avito                - Test from Avito source"
    echo "  avito_data_cars_car  - Test from Avito with Data Cars Car source"
    echo "  avito_friend         - Test from Avito with Friend source"
    echo "  autoru               - Test from AutoRu source"
    echo "  data_cars_car        - Test from Data Cars Car source"
    echo "  maxposter            - Test from Maxposter source"
    echo "  carcopy              - Test from Carcopy source"
    echo "  vehicles_vehicle     - Test from Vehicles Vehicle source"
    echo
    echo "Examples:"
    echo "  $0 getone AVITO_XML_URL"
    echo "  $0 getone AVITO_FRIEND_XML_URL cars_friend.xml"
    echo "  $0 update avito"
    echo "  $0 update maxposter"
    echo "  $0 test maxposter --dev"
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
    export DOMAIN=$(get_domain)
    
    case $type in
        "avito")
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito.xml" --repo_name="$DOMAIN"
            ;;
        "avito_data_cars_car")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/avito.xml" --repo_name="$DOMAIN"
            ;;
        "avito_friend")
            python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito_dc.xml" --repo_name=$DOMAIN
            python3 .github/scripts/update_cars_air_storage.py --config_path="./.github/scripts/config_air_storage-friend.json" --source_type avito --input_file cars_friend.xml --output_path="./public/avito_friend.xml" --repo_name=$DOMAIN
            export XML_URL="./public/avito_dc.xml ./public/avito_friend.xml" 
            python3 .github/scripts/getOneXML.py --output_path="./public/avito.xml"
            ;;
        "autoru")
            python3 .github/scripts/update_cars_air_storage.py --source_type autoru --output_path="./public/autoru.xml" --repo_name="$DOMAIN"
            ;;
        "data_cars_car")
            python3 .github/scripts/update_cars.py --source_type data_cars_car --skip_thumbs --repo_name="$DOMAIN"
            ;;
        "maxposter")
            python3 .github/scripts/update_cars.py --source_type maxposter --image_tag="photo" --skip_thumbs --repo_name="$DOMAIN"
            ;;
        "carcopy")
            python3 .github/scripts/update_cars.py --source_type carcopy --image_tag="photo" --description_tag="comment" --skip_thumbs --repo_name="$DOMAIN"
            ;;
        "vehicles_vehicle")
            python3 .github/scripts/update_cars.py --source_type vehicles_vehicle --image_tag="photo" --skip_thumbs --repo_name="$DOMAIN"
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

command=$1
shift

case $command in
    "getone")
        if [ "$#" -lt 1 ]; then
            echo "Error: getone requires an environment variable name"
            show_help
            exit 1
        fi
        handle_getone "$@"
        ;;
    "update")
        if [ "$#" -lt 1 ]; then
            echo "Error: update requires a type"
            show_help
            exit 1
        fi
        handle_update "$@"
        ;;
    "test")
        if [ "$#" -lt 1 ]; then
            echo "Error: test requires a type"
            show_help
            exit 1
        fi
        handle_test "$@"
        ;;
    *)
        echo "Error: Unknown command: $command"
        show_help
        exit 1
        ;;
esac