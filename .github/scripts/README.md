## Сливание складов

```bash
# скачиваем air_storage:
# node .github/scripts/getAirStorage.js
pnpm getAirStorage
# скачивем свой XML:
# python3 .github/scripts/getOneXML.py
pnpm getOneXML_Ads_Ad
# делаем воздушный склад:
# pnpm update_cars_avito
python3 .github/scripts/update_cars_air_storage.py --source_type avito --output_path="./public/avito_dc.xml"
# скачиваем и объединяем чужие XML
# python3 .github/scripts/getOneXML.py --output_path="cars_friend.xml"
pnpm getOneXML_Ads_Ad_friend
# удаляем из них все Тойоты
python3 .github/scripts/update_cars_air_storage.py --source_type avito --input_file cars_friend.xml --output_path="./public/avito_friend.xml" --config_path="./.github/scripts/config_air_storage-friend.json"
# увеличиваем ID и VIN на заранее заданное число (для каждого ДЦ своё)
# для этого нам нужна функция сдвига значения на заданное число, находится в конфиге.json
# объединяем все XML в один и сохраняем его как avito_full.xml
export XML_URL="./public/avito_dc.xml ./public/avito_friend.xml"
python3 .github/scripts/getOneXML.py --output_path="./public/avito.xml"
```

## Загрузка конфигурации

### Из GitHub репозитория:

```bash
python .github/scripts/update_cars_air_storage.py --source_type autoru \
    --config_type github \
    --github_repo "your_username/your_repo" \
    --github_path "config"
```

### Из GitHub Gist:

```bash
python .github/scripts/update_cars_air_storage.py --source_type autoru \
    --config_type github \
    --gist_id "your_gist_id"
```

### Из локального файла (по умолчанию):

```bash
python .github/scripts/update_cars_air_storage.py --source_type autoru
```

### Из переменных окружения

```bash
# Установка переменных окружения
export CARS_AVITO_MOVE_VIN_ID_UP=1
export CARS_AVITO_NEW_ADDRESS='"Новый адрес"'
export CARS_AVITO_NEW_PHONE='"0987654"'
export CARS_AVITO_REPLACEMENTS='{"официального дилера":"Новое название"}'
export CARS_AVITO_ELEMENTS_TO_LOCALIZE='["elem1", "elem2"]'
export CARS_AVITO_REMOVE_CARS_AFTER_DUPLICATE='["vin1", "vin2"]'
export CARS_AVITO_REMOVE_MARK_IDS='["mark1", "mark2"]'
export CARS_AVITO_REMOVE_FOLDER_IDS='["folder1", "folder2"]'
python .github/scripts/update_cars_air_storage.py --source_type avito --config_source env
```


## Обновление АВН на сайте

```bash
python .github/scripts/update_cars.py --source_type data_cars_car --image_tag="image"
python .github/scripts/update_cars.py --source_type maxposter --image_tag="photo"
python .github/scripts/update_cars.py --source_type carcopy --image_tag="photo" --description_tag="comment"
python .github/scripts/update_cars.py --source_type vehicles_vehicle --image_tag="photo"
```