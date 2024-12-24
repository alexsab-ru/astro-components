# astro-components
main repo for components

```sh
export AIR_STORAGE_CSV_URL=$(grep '^AIR_STORAGE_CSV_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
export QUERY_STRING="SELECT A, B"
export KEY_COLUMN="VIN"
export OUTPUT_PATHS="air_storage.json"
node .github/scripts/getAirStorage.js
```

```sh
export ENV_XML_URL=$(grep '^XML_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
python3 .github/scripts/getOneXML.py

export REPO_NAME="test.com"
export XML_URL=$(grep '^XML_URL=' .env | awk -F'=' '{print substr($0, index($0,$2))}' | sed 's/^"//; s/"$//')
python3 .github/scripts/update_cars_avito_ads_ad.py

python3 .github/scripts/update_cars_avito.py
```
