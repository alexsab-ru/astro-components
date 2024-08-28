# python3 .github/scripts/getOneXML.py --xpath "//data/cars/car" --output merged_cars.xml
import os
import requests
from lxml import etree

# Получаем значение переменной окружения
env_xml_url = os.getenv('ENV_XML_URL', '')

# Разделяем URL-ы
urls = env_xml_url.strip().split('\n')

# Функция для скачивания XML
def download_xml(url):
    response = requests.get(url)
    return response.content

# Скачиваем все XML файлы
xml_contents = [download_xml(url) for url in urls]

# Создаем корневой элемент для объединенного XML
merged_root = etree.Element("data")

# Объединяем все XML файлы
for content in xml_contents:
    root = etree.fromstring(content)
    for element in root:
        merged_root.append(element)

# Создаем новый XML документ
merged_tree = etree.ElementTree(merged_root)

# Сохраняем объединенный XML
merged_tree.write("merged_feeds.xml", encoding="UTF-8", xml_declaration=True, pretty_print=True)

print("XML файлы успешно скачаны и объединены в merged_feeds.xml")