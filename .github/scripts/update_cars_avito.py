# python3 .github/scripts/update_cars.py
import os
import yaml
import shutil
from PIL import Image, ImageOps
from io import BytesIO
from config import dealer, model_mapping
from utils import *
import xml.etree.ElementTree as ET


# Переменная для отслеживания наличия 404 ошибки
error_404_found = False

with open('output.txt', 'w') as file:
    file.write("")

# Предполагаем, что у вас есть элементы с именами
elements_to_localize = []

for car in root.find('cars'):
    unique_id = f"{build_unique_id(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')}"
    unique_id = f"{process_unique_id(unique_id)}"
    print(f"Уникальный идентификатор: {unique_id}")
    create_child_element(car, 'url', f"https://{repo_name}/cars/{unique_id}/")


output_path = './public/avito.xml'
convert_to_string(root)
tree.write(output_path, encoding='utf-8', xml_declaration=True)

if error_404_found:
    print("error 404 found")

