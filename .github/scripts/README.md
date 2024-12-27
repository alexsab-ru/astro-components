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
# python3 .github/scripts/getOneXML.py --output="cars_friend.xml"
pnpm getOneXML_Ads_Ad_friend
# удаляем из них все Тойоты
python3 .github/scripts/update_cars_air_storage.py --source_type avito --input_file cars_friend.xml --output_path="./public/avito_friend.xml" --config_path="./.github/scripts/config_air_storage-friend.json"
# увеличиваем ID и VIN на заранее заданное число (для каждого ДЦ своё)
# для этого нам нужна функция сдвига значения на заданное число, находится в конфиге.json
# объединяем все XML в один и сохраняем его как avito_full.xml
export ENV_XML_URL="./public/avito_dc.xml ./public/avito_friend.xml"
python3 .github/scripts/getOneXML.py --output_path="./public/avito.xml"
```
