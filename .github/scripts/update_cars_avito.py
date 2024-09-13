# python3 .github/scripts/update_cars.py
import os
import yaml
import shutil
import copy
from PIL import Image, ImageOps
from io import BytesIO
from config import dealer, model_mapping
from utils import *
import xml.etree.ElementTree as ET

def duplicate_car(car, n, status = "в пути", num=9):
    """Функция для дублирования элемента 'car' N раз с изменением vin."""
    duplicates = []
    for i in range(n):
        new_car = copy.deepcopy(car)  # Клонируем текущий элемент car
        vin = new_car.find('vin').text

        # Извлекаем последние 5 символов
        vin_suffix = vin[-5:]
        # Меняем пятую цифру с конца на 9
        vin_suffix = num + vin_suffix[1:]
        # Преобразуем последние 5 символов в число и уменьшаем на i
        new_suffix = str(int(vin_suffix) - i).zfill(5)  # zfill добавляет ведущие нули, если нужно
        # Собираем новый VIN
        new_vin = vin[:-5] + new_suffix
        
        # new_vin = f"VIN_{i+1:05d}"    # Генерация уникального значения VIN (заглушка)
        new_car.find('vin').text = new_vin  # Меняем текст VIN
        new_car.find('availability').text = status  # Меняем статус Наличие автомобиля
        duplicates.append(new_car)
    
    return duplicates
    


# Переменная для отслеживания наличия 404 ошибки
error_404_found = False

with open('output.txt', 'w') as file:
    file.write("")

# Предполагаем, что у вас есть элементы с именами
elements_to_localize = []
# Предполагаем, что cars_element уже определён
all_duplicates = []  # Список для хранения всех дубликатов

cars_element = root.find('cars')

for car in cars_element:
    unique_id = f"{build_unique_id(car, 'mark_id', 'folder_id', 'modification_id', 'complectation_name', 'color', 'year')}"
    unique_id = f"{process_unique_id(unique_id)}"
    print(f"Уникальный идентификатор: {unique_id}")
    create_child_element(car, 'url', f"https://{repo_name}/cars/{unique_id}/")
    # Создаем дубликаты, но не добавляем их сразу в cars_element
    duplicates = duplicate_car(car, 5)
    all_duplicates.extend(duplicates)  # Добавляем дубликаты в отдельный список

# После окончания основного цикла добавляем все дубликаты в cars_element
for new_car in all_duplicates:
    cars_element.append(new_car)


output_path = './public/avito.xml'
convert_to_string(root)
tree.write(output_path, encoding='utf-8', xml_declaration=True)

if error_404_found:
    print("error 404 found")

